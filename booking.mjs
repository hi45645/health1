import { randomBytes, createHash } from 'node:crypto';

export class BookingError extends Error {}
const fail = message => { throw new BookingError(message); };
const dayMs = 86400000;
export const localDate = (now = Date.now()) => new Date(now + 19800000).toISOString().slice(0,10);
const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().startsWith(d);
const validTime = t => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t);
const mins = t => Number(t.slice(0,2))*60 + Number(t.slice(3));
const clock = m => String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0');
function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const value=fn(); db.exec('COMMIT'); return value; }
  catch(e) { db.exec('ROLLBACK'); throw e; }
}
export function initBooking(db) {
  transaction(db, () => {
    if (!db.prepare("SELECT name FROM pragma_table_info('appointments') WHERE name='duration'").get()) {
      db.exec(`ALTER TABLE appointments RENAME TO legacy_appointments;
      CREATE TABLE appointments(reference TEXT PRIMARY KEY,name TEXT NOT NULL,phone TEXT NOT NULL,date TEXT NOT NULL,time TEXT NOT NULL,
        locale TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','confirmed','completed','cancelled','no-show','expired')),duration INTEGER NOT NULL DEFAULT 30,
        email TEXT NOT NULL DEFAULT '',service TEXT NOT NULL DEFAULT 'general',source TEXT NOT NULL DEFAULT 'website',
        request_key TEXT UNIQUE, fingerprint TEXT, expires_at INTEGER, consent_at TEXT);
      INSERT INTO appointments(reference,name,phone,date,time,locale,created_at,status)
      SELECT reference,name,phone,date,time,locale,created_at,status FROM legacy_appointments;
      DROP TABLE legacy_appointments;
      CREATE INDEX appointment_day ON appointments(date,status,time);`);
    }
    db.exec(`CREATE TABLE IF NOT EXISTS booking_schedule(id INTEGER PRIMARY KEY CHECK(id=1),settings TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS appointment_events(id INTEGER PRIMARY KEY,reference TEXT,action TEXT NOT NULL,actor TEXT NOT NULL,details TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS appointment_tokens(reference TEXT NOT NULL,token_hash TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS appointment_contact(reference TEXT PRIMARY KEY,opted_out INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS appointment_messages(event_id INTEGER PRIMARY KEY,reference TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('awaiting staff','staff contacted','suppressed')),attempts INTEGER NOT NULL DEFAULT 0);
    CREATE TRIGGER IF NOT EXISTS queue_clinic_contacts AFTER INSERT ON appointment_events
    WHEN NEW.action IN ('confirm','cancel','reschedule') BEGIN
      INSERT INTO appointment_messages(event_id,reference,kind,status) VALUES(NEW.id,NEW.reference,NEW.action,
        CASE WHEN coalesce((SELECT opted_out FROM appointment_contact WHERE reference=NEW.reference),0)=1 THEN 'suppressed' ELSE 'awaiting staff' END);
    END;
    CREATE INDEX IF NOT EXISTS appointment_event_ref ON appointment_events(reference,id);`);
    if (!db.prepare("SELECT name FROM pragma_table_info('appointment_tokens') WHERE name='expires_at'").get()) {
      db.exec('ALTER TABLE appointment_tokens ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0');
    }
    if (!db.prepare("SELECT name FROM pragma_table_info('appointment_contact') WHERE name='whatsapp_optin'").get()) {
      db.exec('ALTER TABLE appointment_contact ADD COLUMN whatsapp_optin INTEGER NOT NULL DEFAULT 0');
    }
    for(const event of ['INSERT','UPDATE']) {
      db.exec(`CREATE TRIGGER IF NOT EXISTS prevent_booking_overlap_${event} BEFORE ${event} ON appointments
        WHEN NEW.status IN ('pending','confirmed') AND EXISTS (
          SELECT 1 FROM appointments a WHERE a.date=NEW.date AND a.reference<>NEW.reference AND a.status IN ('pending','confirmed')
          AND time(a.time)<time(NEW.time,'+'||NEW.duration||' minutes')
          AND time(NEW.time)<time(a.time,'+'||a.duration||' minutes'))
        BEGIN SELECT RAISE(ABORT,'slot occupied'); END;`);
    }
  });
}
const defaultSchedule = {periods:[],blocks:[],duration:30,advance:30,expiry:48,cancellation:24};
export function schedule(db) {
  const row=db.prepare('SELECT settings FROM booking_schedule WHERE id=1').get();
  return row ? JSON.parse(row.settings) : defaultSchedule;
}
function event(db,ref,action,actor,details={}) {
  db.prepare('INSERT INTO appointment_events(reference,action,actor,details) VALUES(?,?,?,?)').run(ref,action,actor,JSON.stringify(details));
}
export function setSchedule(db,data,actor) {
  let periods,blocks;
  try { periods=JSON.parse(data.periods); blocks=JSON.parse(data.blocks); } catch { fail('Invalid schedule JSON'); }
  if(!Array.isArray(periods)||periods.length>56||!Array.isArray(blocks)||blocks.length>730) fail('Invalid schedule');
  for(const p of periods) if(!p || !Number.isInteger(p.day)||p.day<0||p.day>6||!validTime(p.start)||!validTime(p.end)||p.start>=p.end) fail('Invalid working period');
  for(const b of blocks) {
    if(typeof b==='string' && validDate(b)) continue;
    if(!b||typeof b!=='object'||!validDate(b.date)||!validTime(b.start)||!validTime(b.end)||b.start>=b.end) fail('Invalid block');
  }
  for(const p of periods) if(periods.some(q=>p!==q&&p.day===q.day&&p.start<q.end&&q.start<p.end)) fail('Working periods overlap');
  const rule={periods,blocks};
  for(const [k,min,max] of [['duration',5,240],['advance',1,365],['expiry',1,168],['cancellation',0,168]]) {
    const n=Number(data[k]); if(data[k]===''||!Number.isInteger(n)||n<min||n>max) fail('Invalid '+k);
    rule[k]=n;
  }
  transaction(db,()=>{
    db.prepare('INSERT INTO booking_schedule VALUES(1,?) ON CONFLICT(id) DO UPDATE SET settings=excluded.settings').run(JSON.stringify(rule));
    event(db,null,'schedule',actor,rule);
  });
}
export function expire(db,now=Date.now()) {
  db.prepare("UPDATE appointments SET status='expired' WHERE status='pending' AND expires_at<=?").run(now);
}
export function slots(db,date,exclude='',now=Date.now()) {
  const s=schedule(db);
  if(!validDate(date)||date<localDate(now)||date>localDate(now+s.advance*dayMs)||s.blocks.includes(date)) return [];
  const occupied=db.prepare("SELECT time,duration FROM appointments WHERE date=? AND reference<>? AND (status='confirmed' OR (status='pending' AND (expires_at IS NULL OR expires_at>?)))").all(date,exclude,now);
  const available=[];
  for(const p of s.periods.filter(p=>p.day===new Date(date).getUTCDay())) {
    for(let i=mins(p.start); i+s.duration<=mins(p.end); i+=s.duration) {
      const time=clock(i);
      if(s.blocks.some(b=>typeof b==='object' && b.date===date && i<mins(b.end) && i+s.duration>mins(b.start))) continue;
      if(Date.parse(date+'T'+time+':00+05:30')>now && !occupied.some(o=>i<mins(o.time)+o.duration && i+s.duration>mins(o.time))) available.push(time);
    }
  }
  return available.sort();
}
export function reserve(db,data,locale,allowed,source='website',actor='patient') {
  return transaction(db,()=>{
    const {name,phone,date,time,email='',service='general',key,consent}=data;
    if(typeof name!=='string'||!name.trim()||name.length>100||! /^(?:\+91)?[6-9]\d{9}$/.test((phone||'').replace(/[\s()-]/g,''))||
       !/^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.test(key)||consent!=='yes'||email.length>254||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) fail('invalid');
    const hash=createHash('sha256').update(JSON.stringify([name,phone,date,time,email,service,source,data.whatsapp==='yes'])).digest('hex');
    const prev=db.prepare('SELECT reference,fingerprint FROM appointments WHERE request_key=?').get(key);
    if(prev) { if(prev.fingerprint!==hash) fail('conflict'); return prev.reference; }
    expire(db);
    if(service!=='general'&&!allowed(service)) fail('service');
    if(!slots(db,date).includes(time)) fail('slot');
    const reference=randomBytes(16).toString('hex');
    const s=schedule(db);
    db.prepare(`INSERT INTO appointments(reference,name,phone,date,time,email,service,locale,source,request_key,fingerprint,duration,expires_at,consent_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).run(reference,name,phone,date,time,email,service,locale,source,key,hash,s.duration,Math.min(Date.now()+3600000*s.expiry,Date.parse(date+'T'+time+':00+05:30')));
    db.prepare('INSERT INTO appointment_contact(reference,whatsapp_optin) VALUES(?,?)').run(reference,data.whatsapp==='yes'?1:0);
    event(db,reference,'created',actor,{date,time,source});
    return reference;
  });
}
export function change(db,data,actor) {
  transaction(db,()=>{
    expire(db);
    const r=db.prepare('SELECT * FROM appointments WHERE reference=?').get(data.reference||'');
    if(!r||!['confirmed','pending'].includes(r.status)) fail('Request is no longer active');
    const action=data.action||'confirm';
    if(action==='reschedule') {
      if(!slots(db,data.date,r.reference).includes(data.time)) fail('Slot unavailable');
      const s=schedule(db);
      const deadline=Math.min(Date.now()+3600000*s.expiry,Date.parse(data.date+'T'+data.time+':00+05:30'));
      db.prepare('UPDATE appointments SET date=?,time=?,duration=?,expires_at=? WHERE reference=?').run(data.date,data.time,s.duration,deadline,r.reference);
      event(db,r.reference,action,actor,{before:[r.date,r.time],after:[data.date,data.time]});
    } else {
      const target={confirm:'confirmed',cancel:'cancelled',complete:'completed','no-show':'no-show'}[action];
      if(!target||target===r.status||(target==='completed'||target==='no-show')&&r.status!=='confirmed') fail('Invalid status change');
      db.prepare('UPDATE appointments SET status=? WHERE reference=?').run(target,r.reference);
      event(db,r.reference,action,actor,{from:r.status,to:target});
    }
  });
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}
export function managementToken(db,ref) {
  const token=randomBytes(32).toString('hex');
  db.prepare('INSERT INTO appointment_tokens(reference,token_hash,expires_at) VALUES(?,?,?)').run(ref,tokenHash(token),Date.now()+90*dayMs);
  return token;
}
export function hasToken(db,ref,token) {
  return /^[0-9a-f]{64}$/.test(token||'') && Boolean(db.prepare('SELECT 1 FROM appointment_tokens WHERE reference=? AND token_hash=? AND expires_at>?').get(ref,tokenHash(token),Date.now()));
}
export function patientAction(db,ref,token,action) {
  return transaction(db,()=>{
    if(!hasToken(db,ref,token)) fail('invalid');
    if(action==='optout') {
      db.prepare("UPDATE appointment_contact SET opted_out=1,whatsapp_optin=0 WHERE reference=?").run(ref);
      db.prepare("UPDATE appointment_messages SET status='suppressed' WHERE reference=? AND status='awaiting staff'").run(ref);
    } else if(action==='cancel') {
      const row=db.prepare('SELECT date,time,status FROM appointments WHERE reference=?').get(ref);
      if(!['pending','confirmed'].includes(row.status)|| Date.parse(row.date+'T'+row.time+':00+05:30')-Date.now()<schedule(db).cancellation*3600000) fail('deadline');
      db.prepare("UPDATE appointments SET status='cancelled' WHERE reference=?").run(ref);
    } else fail('invalid');
    event(db,ref,action,'patient');
  });
}
