import { randomBytes } from 'node:crypto';
import { escape as h } from './views.mjs';
import { BookingError, change, expire, localDate, reserve, schedule, setSchedule } from './booking.mjs';

const input=(label,name,type='text',value='')=>`<label>${label}<input type="${type}" name="${name}" value="${h(value)}" required></label>`;
const option=(value,label=value)=>`<option value="${h(value)}">${h(label)}</option>`;
const statuses=['pending','confirmed','cancelled','completed','no-show','expired'];
export async function staffBookings(req,res,url,role,{db,origin,readForm,respond,redirect,catalogue}) {
  if(!['doctor','owner','receptionist'].includes(role)) return respond(res,403,'Forbidden','text/plain');
  const actor=req.staff?.username||role;
  const canConfigure=['owner','doctor'].includes(role);
  const location='/admin/appointments';
  expire(db);
  if(req.method==='POST') {
    if(req.headers.origin!==origin) return respond(res,403,'Invalid origin','text/plain');
    const data=await readForm(req,32768);
    try {
      if(data.action==='schedule') {
        if(!canConfigure) return respond(res,403,'Forbidden','text/plain');
        setSchedule(db,data,actor);
      } else if(data.action==='manual') {
        reserve(db,data,'en',slug=>catalogue.get('en',slug),data.source==='walk-in'?'walk-in':'phone',actor);
      } else if(data.action==='contacted') {
        db.prepare("UPDATE appointment_messages SET status='staff contacted',attempts=attempts+1 WHERE event_id=? AND status='awaiting staff'").run(data.event_id||'');
      } else change(db,data,actor);
    } catch(e) { if(e instanceof BookingError) return respond(res,422,e.message,'text/plain'); throw e; }
    return redirect(res,location);
  }
  const date=url.searchParams.get('date')||'', state=url.searchParams.get('status')||'', search=(url.searchParams.get('q')||'').slice(0,100);
  const page=Math.max(0,Number.parseInt(url.searchParams.get('page'),10)||0);
  const where=" WHERE (?='' OR date=?) AND (?='' OR status=?) AND (?='' OR instr(lower(name),lower(?)) OR instr(phone,?) OR reference=?)";
  const args=[date,date,state,state,search,search,search,search];
  if(url.searchParams.get('export')==='csv') {
    if(!canConfigure) return respond(res,403,'Forbidden','text/plain');
    const rows=db.prepare('SELECT date,time,status,source FROM appointments'+where+' ORDER BY date,time').all(...args);
    db.prepare("INSERT INTO appointment_events(action,actor,details) VALUES('export',?,?)").run(actor,JSON.stringify({count:rows.length}));
    const cell=v=>'"'+(/^[=+@\-\t\r]/.test(v)?"'":'')+v.replaceAll('"','""')+'"';
    return respond(res,200,'Date,Time,Status,Source\r\n'+rows.map(r=>Object.values(r).map(cell).join(',')).join('\r\n'),'text/csv; charset=utf-8',{'Content-Disposition':'attachment; filename="appointments.csv"'});
  }
  const rows=db.prepare('SELECT * FROM appointments'+where+' ORDER BY date,time,reference LIMIT 21 OFFSET ?').all(...args,Math.min(page,100000)*20);
  const columns = ['Date and time', 'Patient', 'Status', 'Service and source', 'Manage'];
  const cell = (column, contents) => `<td role="cell"><span class="staff-field-label" aria-hidden="true">${columns[column]}</span><div>${contents}</div></td>`;
  const records = rows.slice(0, 20).map(record => {
    const bookingDetails = `<details><summary>Booking details</summary><p>${h(record.email)} ${h(record.reference)}</p>
      ${['pending', 'confirmed'].includes(record.status) ? `<form method="post"><input type="hidden" name="reference" value="${h(record.reference)}">
      ${record.status === 'pending' ? '<button name="action" value="confirm">Mark as confirmed</button>' : '<button name="action" value="complete">Mark completed</button><button name="action" value="no-show">Mark no-show</button>'}
      <button name="action" value="cancel">Cancel appointment</button></form>
      <details><summary>Reschedule</summary><form method="post"><input type="hidden" name="reference" value="${h(record.reference)}">${input('New date','date','date')}${input('New time','time','time')}<button name="action" value="reschedule">Reschedule</button></form></details>` : ''}
      </details>`;
    return `<tr role="row">
      ${cell(0, `${h(record.date)}<br>${h(record.time)}`)}
      ${cell(1, `<strong>${h(record.name)}</strong><br>${h(record.phone)}`)}
      ${cell(2, `<span class="state">${h(record.status)}</span>`)}
      ${cell(3, `${h(record.service)}<br>${h(record.source)}`)}
      ${cell(4, bookingDetails)}</tr>`;
  }).join('');
  const s=schedule(db);
  const reports=db.prepare(`SELECT status,count(*) AS total,sum(date=?) AS today,sum(date BETWEEN date(?,'-6 days') AND ?) AS week,sum(date BETWEEN date(?,'-29 days') AND ?) AS month FROM appointments GROUP BY status`).all(...Array(5).fill(localDate()));
  const href=(k,v)=>{const u=new URL(url);u.searchParams.set(k,v);return h(u.pathname+u.search);};
  const providerTables=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='whatsapp_delivery'").get();
  const pendingFilter=providerTables?" AND NOT EXISTS (SELECT 1 FROM whatsapp_delivery w WHERE w.event_id=m.event_id AND w.status IN ('sending','accepted','retry','uncertain'))":'';
  const messages=db.prepare("SELECT m.event_id,m.kind,a.name,a.phone FROM appointment_messages m JOIN appointments a ON m.reference=a.reference WHERE m.status='awaiting staff'"+pendingFilter+" ORDER BY m.event_id LIMIT 20").all();
  const queue=messages.map(m=>`<li>${h(m.name)} · ${h(m.phone)} · ${h(m.kind)}<form method="post"><input type="hidden" name="event_id" value="${m.event_id}"><button name="action" value="contacted">Record staff contact</button></form></li>`).join('');
  const selectedMonth=url.searchParams.get('month') || date.slice(0,7) || localDate().slice(0,7);
  const month=/^20\d{2}-(0[1-9]|1[0-2])$/.test(selectedMonth) ? selectedMonth : localDate().slice(0,7);
  const first=new Date(month+'-01T00:00:00Z');
  const monthAt=delta=>new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+delta,1)).toISOString().slice(0,7);
  const end=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  const counts=new Map(db.prepare("SELECT date,count(*) n FROM appointments WHERE date>=? AND date<? GROUP BY date").all(month+'-01',monthAt(1)+'-01').map(r=>[r.date,r.n]));
  const cells=Array(first.getUTCDay()).fill('<td></td>');
  for(let day=1;day<=end;day++) {
    const dayKey=month+'-'+String(day).padStart(2,'0');
    const count=counts.get(dayKey)||0;
    cells.push(`<td><a aria-label="${dayKey}, ${count} appointments" href="?month=${month}&amp;date=${dayKey}">${day}</a>${count?` (${count})`:''}</td>`);
  }
  const weeks=[];
  for(let i=0;i<cells.length;i+=7) weeks.push('<tr>'+cells.slice(i,i+7).join('')+'</tr>');
  const calendar=`<details id="staff-calendar"><summary>Appointment calendar</summary><p><a href="?month=${monthAt(-1)}">Previous month</a> · <a href="?month=${monthAt(1)}">Next month</a></p><table><caption>${month}</caption><thead><tr>${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<th scope="col">${d}</th>`).join('')}</tr></thead><tbody>${weeks.join('')}</tbody></table></details>`;
  const sources=db.prepare('SELECT source,count(*) total FROM appointments GROUP BY source ORDER BY total DESC').all();
  const trends=db.prepare("SELECT substr(date,1,7) month,count(*) total FROM appointments GROUP BY month ORDER BY month DESC LIMIT 12").all();
  const markup=`<h1>Appointment requests</h1><p class="staff-date">Schedule and manage clinic visits in India time.</p>
  <nav class="staff-shortcuts" aria-label="Appointment tools"><a href="#staff-calendar">Calendar</a><a href="#staff-manual">Manual booking</a><a href="#staff-contacts">Patient updates</a></nav>
  <form method="get" class="stack booking-filters"><label>Calendar date<input type="date" name="date" value="${h(date)}"></label><label>Status<select name="status">${option('','All statuses')}${statuses.map(v=>`<option ${v===state?'selected':''}>${v}</option>`).join('')}</select></label><label>Patient name, phone or reference<input name="q" value="${h(search)}"></label><button>Filter</button></form>
  ${canConfigure?`<a href="${href('export','csv')}">Export filtered report</a>`:''}<div class="staff-scroll" tabindex="0" role="region" aria-label="Filtered appointments"><table class="patient-table" role="table"><caption>Filtered appointments</caption><thead role="rowgroup"><tr role="row">${columns.map(label => `<th scope="col" role="columnheader">${label}</th>`).join('')}</tr></thead><tbody role="rowgroup">${records || '<tr role="row"><td role="cell" colspan="5">No appointments found.</td></tr>'}</tbody></table></div>${page?`<a href="${href('page',page-1)}">Previous</a>`:''} ${rows.length>20?`<a href="${href('page',page+1)}">Next</a>`:''}
  <details id="staff-contacts"><summary>Patient updates awaiting staff contact</summary><ul>${queue||'<li>No pending updates.</li>'}</ul></details>
  ${calendar}<details><summary>Appointment sources and trends</summary><ul>${sources.map(r=>`<li>${h(r.source)} · ${r.total}</li>`).join('')}</ul><table><caption>Monthly appointments</caption><tr><th>Month</th><th>Count</th></tr>${trends.map(r=>`<tr><th>${h(r.month)}</th><td>${r.total}</td></tr>`).join('')}</table></details>
  <table><caption>Appointments by date</caption><tr><th>Status</th><th>Today</th><th>7 days</th><th>30 days</th><th>Total</th></tr>${reports.map(r=>`<tr><th>${h(r.status)}</th><td>${r.today}</td><td>${r.week}</td><td>${r.month}</td><td>${r.total}</td></tr>`).join('')}</table>
  <details id="staff-manual"><summary>Manual or walk-in booking</summary><form method="post" class="stack"><input type="hidden" name="key" value="${randomBytes(16).toString('hex')}">${input('Patient name','name')}${input('Mobile number','phone','tel')}${input('Date','date','date')}${input('Time (India)','time','time')}<label>Treatment<select name="service">${option('general','General consultation')}${catalogue.list('en').map(i=>option(i.slug,i.title)).join('')}</select></label><label>Source<select name="source">${option('phone')}${option('walk-in')}</select></label><label><input type="checkbox" required name="consent" value="yes">Patient consent obtained</label><button name="action" value="manual">Create booking</button></form></details>
  ${canConfigure?`<details id="staff-hours"><summary>Configure working hours and holidays</summary><form method="post" class="stack"><p>Use India time. Enter one period per working interval, splitting periods around breaks. Sunday is 0 and Saturday is 6.</p><label>Working periods (JSON)<textarea name="periods" placeholder='[{"day":1,"start":"09:00","end":"12:00"}]'>${h(JSON.stringify(s.periods,null,2))}</textarea></label><label>Blocked dates or partial-day blocks (JSON). For partial days use date, start and end fields.<textarea name="blocks" placeholder='["2027-01-01"]'>${h(JSON.stringify(s.blocks))}</textarea></label>${input('Slot duration (minutes)','duration','number',s.duration)}${input('Advance booking (days)','advance','number',s.advance)}${input('Pending expiry (hours)','expiry','number',s.expiry)}${input('Patient cancellation deadline (hours)','cancellation','number',s.cancellation)}<button name="action" value="schedule">Save schedule</button></form></details>`:''}`;
  return respond(res,200,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Appointments</title><link rel="stylesheet" href="/assets/site.css"></head><body><main class="shell section">${markup}</main></body></html>`);
}
