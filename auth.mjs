import { createHash, createHmac, randomBytes, scrypt, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';
import { escape as h } from './views.mjs';
const derive = promisify(scrypt);
const hash = value => createHash('sha256').update(value).digest('hex');
const roles = ['owner','doctor','editor','receptionist'];
const usernameOK = value => /^[a-z0-9._-]{3,64}$/.test(value || '');
const passwordOK = value => typeof value === 'string' && value.length >= 14 && value.length <= 256;
const secretOK = value => /^[A-Z2-7]{32}$/.test(value || '');
const options = {N:32768,r:8,p:3,maxmem:64*1024*1024};
function key() {
  if (!process.env.STAFF_ENCRYPTION_KEY && process.env.NODE_ENV !== 'production') return null;
  if (!/^[a-f0-9]{64}$/i.test(process.env.STAFF_ENCRYPTION_KEY || '')) throw Error('Configure a 32-byte STAFF_ENCRYPTION_KEY in hexadecimal');
  return Buffer.from(process.env.STAFF_ENCRYPTION_KEY,'hex');
}
function seal(value) {
  const k = key(); if (!k) return 'local.' + value;
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm',k,iv);
  const bytes = Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return [iv,cipher.getAuthTag(),bytes].map(b=>b.toString('hex')).join('.');
}
function unseal(value) {
  if (value.startsWith('local.') && !key()) return value.slice(6);
  const [iv,tag,data] = value.split('.').map(v=>Buffer.from(v,'hex'));
  const cipher = createDecipheriv('aes-256-gcm',key(),iv);
  cipher.setAuthTag(tag); return Buffer.concat([cipher.update(data),cipher.final()]).toString();
}
export function totp(secret, step = Math.floor(Date.now()/30000)) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...secret].map(char => alphabet.indexOf(char).toString(2).padStart(5,'0')).join('');
  const bytes = Buffer.from(bits.match(/.{8}/g).map(b=>parseInt(b,2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1',bytes).update(counter).digest();
  return String((digest.readUInt32BE(digest[19]&15)&0x7fffffff)%1000000).padStart(6,'0');
}
export function audit(db,actor,action) {
  db.prepare('INSERT INTO staff_audit(actor,action) VALUES (?,?)').run(actor,action);
}
export function initAuth(db) {
  key();
  db.exec(`CREATE TABLE IF NOT EXISTS staff(username TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('owner','doctor','editor','receptionist')),salt TEXT NOT NULL,password_hash TEXT NOT NULL,secret TEXT NOT NULL,enabled INTEGER DEFAULT 1,last_step INTEGER DEFAULT -1);
  CREATE TABLE IF NOT EXISTS staff_sessions(token_hash TEXT PRIMARY KEY,username TEXT NOT NULL,expires INTEGER NOT NULL, touched INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS staff_failures(bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, until INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS staff_audit(id INTEGER PRIMARY KEY,at TEXT DEFAULT CURRENT_TIMESTAMP,actor TEXT NOT NULL,action TEXT NOT NULL);
  CREATE TRIGGER IF NOT EXISTS audit_no_edit BEFORE UPDATE ON staff_audit BEGIN SELECT RAISE(ABORT,'append only'); END;
  CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON staff_audit BEGIN SELECT RAISE(ABORT,'append only'); END;`);
  if (db.prepare('SELECT 1 FROM staff LIMIT 1').get()) return;
  const {OWNER_USERNAME:user, OWNER_PASSWORD:pass, OWNER_TOTP_SECRET:secret} = process.env;
  if (!user && !pass && !secret) return;
  if (!usernameOK(user) || !passwordOK(pass) || !secretOK(secret)) throw Error('Invalid owner bootstrap configuration');
  const salt = randomBytes(16).toString('hex');
  db.prepare("INSERT INTO staff(username,role,salt,password_hash,secret) VALUES (?,'owner',?,?,?)").run(user,salt,scryptSync(pass,salt,32,options).toString('hex'),seal(secret));
  audit(db,user,'owner.bootstrap');
}
function screen(title,body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><link rel="stylesheet" href="/assets/site.css"></head><body><main class="shell section"><h1>${title}</h1>${body}</main></body></html>`;
}
const login = '<form method="post" action="/admin/login" class="stack"><label>Username<input name="username" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><label>Authenticator code<input name="code" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required></label><button class="button">Sign in</button></form>';
const choices = roles.map(r=>'<option>'+r+'</option>').join('');
export async function authenticate({db,req,res,url,origin,readForm,respond,redirect}) {
  const now = Math.floor(Date.now()/1000);
  const cookie = req.headers.cookie?.match(/(?:^|;\s*)staff_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  const flags = '; Path=/admin; HttpOnly; SameSite=Strict' + (origin.startsWith('https:') ? '; Secure' : '');
  const fail = (status,message) => {respond(res,status,screen('Staff access','<p>'+h(message)+'</p>')); return null;};
  if (req.method === 'POST' && req.headers.origin !== origin) return fail(403,'Invalid origin.');
  if (url.pathname === '/admin/login') {
    if (req.method === 'GET') {respond(res,200,screen('Staff sign in',login)); return null;}
    const values = await readForm(req);
    const name = (values.username || '').toLowerCase();
    const buckets = ['ip:'+hash(req.socket.remoteAddress || ''),'user:'+hash(name)];
    db.prepare('DELETE FROM staff_failures WHERE until <= ?').run(now);
    if (buckets.some(b=>(db.prepare('SELECT attempts FROM staff_failures WHERE bucket=?').get(b)?.attempts || 0)>=10)) return fail(429,'Try again in 15 minutes.');
    // Reserve an attempt before async password work, including concurrent requests.
    for (const b of buckets) db.prepare('INSERT INTO staff_failures VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1').run(b,now+900);
    const user = db.prepare('SELECT * FROM staff WHERE username=? AND enabled=1').get(name);
    const password = (values.password || '').slice(0,256);
    const derived = await derive(password,user?.salt || 'absent-account',32,options);
    const step = Math.floor(now/30);
    const validPassword = timingSafeEqual(derived,Buffer.from(user?.password_hash || '00'.repeat(32),'hex'));
    const matched = user && validPassword && [step-1,step,step+1].find(n => n > user.last_step && totp(unseal(user.secret),n) === values.code);
    if (!matched || !db.prepare('UPDATE staff SET last_step=? WHERE username=? AND enabled=1 AND last_step<? AND password_hash=?').run(matched,name,matched,user.password_hash).changes) {
      audit(db,user?.username || 'unknown','login.failed');return fail(401,'Sign-in details could not be verified.');
    }
    for (const b of buckets) db.prepare('DELETE FROM staff_failures WHERE bucket=?').run(b);
    db.prepare('DELETE FROM staff_sessions WHERE expires<=? OR touched<=?').run(now,now-1800);
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO staff_sessions VALUES (?,?,?,?)').run(hash(token),name,now+28800,now);
    audit(db,name,'login.success');res.setHeader('Set-Cookie','staff_session='+token+flags);redirect(res,'/admin');return null;
  }
  const user = cookie && db.prepare('SELECT u.username,u.role FROM staff_sessions s JOIN staff u USING(username) WHERE s.token_hash=? AND s.expires>? AND s.touched>? AND u.enabled=1').get(hash(cookie),now,now-1800);
  if (!user) {respond(res,401,screen('Staff sign in',login));return null;}
  db.prepare('UPDATE staff_sessions SET touched=? WHERE token_hash=?').run(now,hash(cookie));
  if (url.pathname === '/admin/logout') {
    if (req.method !== 'POST') return fail(405,'Submit the sign-out form.');
    db.prepare('DELETE FROM staff_sessions WHERE token_hash=?').run(hash(cookie));audit(db,user.username,'logout');
    res.setHeader('Set-Cookie','staff_session=; Max-Age=0'+flags);redirect(res,'/admin/login');return null;
  }
  if (url.pathname === '/admin/password') {
    if (req.method === 'GET') {
      respond(res,200,screen('Change password','<form method="post" class="stack"><label>Current password<input type="password" name="current" autocomplete="current-password" required></label><label>New password<input type="password" name="password" minlength="14" maxlength="256" autocomplete="new-password" required></label><button>Change password and sign out</button></form>'));
      return null;
    }
    const v = await readForm(req);
    if (!passwordOK(v.password) || !passwordOK(v.current)) return fail(422,'Enter a password of 14–256 characters.');
    const row = db.prepare('SELECT salt,password_hash FROM staff WHERE username=?').get(user.username);
    if (!timingSafeEqual(await derive(v.current,row.salt,32,options),Buffer.from(row.password_hash,'hex'))) return fail(403,'Current password incorrect.');
    const salt = randomBytes(16).toString('hex');
    const digest = await derive(v.password,salt,32,options);
    const changed = db.prepare('UPDATE staff SET password_hash=?,salt=? WHERE username=? AND password_hash=? AND enabled=1').run(digest.toString('hex'),salt,user.username,row.password_hash);
    if (!changed.changes) return fail(409,'Sign in again.');
    db.prepare('DELETE FROM staff_sessions WHERE username=?').run(user.username);
    audit(db,user.username,'password.changed');res.setHeader('Set-Cookie','staff_session=; Max-Age=0'+flags);redirect(res,'/admin/login');return null;
  }
  if (url.pathname === '/admin/staff') {
    if (user.role !== 'owner') return fail(403,'Owner access required.');
    if (req.method === 'POST') {
      const v = await readForm(req);
      if (!usernameOK(v.username) || !roles.includes(v.role) || v.username===user.username) return fail(422,'Choose a different, valid staff account and role.');
      if (v.action === 'create' || v.action === 'reset') {
        if (!passwordOK(v.password) || !secretOK(v.secret)) return fail(422,'Use a 14–256 character password and a 32-character uppercase Base32 authenticator secret.');
        const salt = randomBytes(16).toString('hex');
        const digest = await derive(v.password,salt,32,options);
        if (v.action === 'reset') {
          if (!db.prepare('UPDATE staff SET salt=?, password_hash=?,secret=?,last_step=-1 WHERE username=?').run(salt,digest.toString('hex'),seal(v.secret),v.username).changes) return fail(404,'Staff account not found.');
          db.prepare('DELETE FROM staff_sessions WHERE username=?').run(v.username);
        } else if (!db.prepare('INSERT OR IGNORE INTO staff(username,role,salt,password_hash,secret) VALUES (?,?,?,?,?)').run(v.username,v.role,salt,digest.toString('hex'),seal(v.secret)).changes) return fail(409,'Account already exists.');
      } else if (v.action === 'update') {
        db.prepare('UPDATE staff SET role=?, enabled=? WHERE username=?').run(v.role,v.enabled==='yes'?1:0,v.username);
        db.prepare('DELETE FROM staff_sessions WHERE username=?').run(v.username);
      } else return fail(422,'Unknown action.');
      audit(db,user.username,'staff.'+v.action+'.'+v.username+'.'+v.role);redirect(res,'/admin/staff');return null;
    }
    const rows=db.prepare('SELECT username,role,enabled FROM staff ORDER BY username').all();
    const items=rows.filter(r=>r.username!==user.username).map(r=>`<form method="post" class="stack"><strong>${h(r.username)}</strong><input type="hidden" name="username" value="${h(r.username)}"><label>Role<select name="role">${choices.replace('<option>'+r.role,'<option selected>'+r.role)}</select></label><label><input type="checkbox" name="enabled" value="yes" ${r.enabled?'checked':''}>Enabled</label><button name="action" value="update">Update account</button></form>`).join('');
    respond(res,200,screen('Staff accounts','<a href="/admin">Dashboard</a><form method="post" class="stack"><label>Username<input name="username" required></label><label>Role<select name="role">'+choices+'</select></label><label>Password<input type="password" autocomplete="new-password" name="password" required></label><label>Authenticator secret<input type="password" name="secret" required></label><button name="action" value="create">Create account</button><button name="action" value="reset">Reset named account credentials and revoke sessions</button></form>'+items));return null;
  }
  req.staff=user;return user;
}
