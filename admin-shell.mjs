import { escape as h } from './views.mjs';
import { readClinicProfile } from './clinic.mjs';
import { expire, localDate, schedule } from './booking.mjs';

const bookingRoles = ['owner','doctor','receptionist'];
const publishingRoles = ['owner','doctor','editor'];
const links = [
  ['/admin','Overview', ['owner','doctor']],
  ['/admin/appointments','Appointments',bookingRoles],
  ['/admin?locale=en','Website content',publishingRoles],
  ['/admin/services','Treatments',publishingRoles],
  ['/admin/gallery','Photographs',['owner']],
  ['/admin/clinic','Clinic profile',['owner']],
  ['/admin/activity','Website activity',['owner','doctor']],
  ['/admin/staff','Staff accounts',['owner']],
  ['/admin/password','Change password',[...publishingRoles,'receptionist']]
];

export function staffDocument(document, staff, url) {
  const css='<link rel="stylesheet" href="/assets/admin.css">';
  const head = document.replace('</head>',css+'</head>');
  if (!staff) return head.replace('<body>','<body class="admin-login"><header class="login-brand"><b>Sumukha</b> Dental Clinic</header>');
  const current = url.pathname==='/admin' && (url.searchParams.has('locale') || staff.role==='editor') ? '/admin?locale=en' : url.pathname;
  const nav = links.filter(([, ,roles])=>roles.includes(staff.role)).map(([href,label])=>
    `<a href="${href}" ${href===current?'aria-current="page"':''}>${label}</a>`).join('');
  const signout='<form method="post" action="/admin/logout"><button>Sign out</button></form>';
  const start = `<body class="admin"><a class="skip-link" href="#staff-content">Skip to content</a>
  <aside class="staff-side"><a class="staff-brand" href="/admin"><span>Sumukha</span>Dental Clinic</a><nav aria-label="Staff navigation">${nav}</nav></aside>
  <div class="staff-workarea"><header class="staff-bar"><details class="staff-menu"><summary>Menu</summary><nav aria-label="Staff menu">${nav}</nav></details><span>Clinic administration</span><div><strong>${h(staff.username)}</strong><small>${h(staff.role)}</small></div>${signout}</header>`;
  return head.replace('<body>',start).replace('<main ', '<main id="staff-content" tabindex="-1" ').replace('</body>','</div></body>');
}

export function overview(db, staff, catalogue) {
  expire(db);
  const today=localDate();
  const totals=db.prepare("SELECT count(*) FILTER (WHERE date=?) today,count(*) FILTER (WHERE status='pending') pending,count(*) FILTER (WHERE date=? AND status='confirmed') confirmed,count(*) FILTER (WHERE date=? AND status='completed') completed FROM appointments").get(today,today,today);
  const stats = [['Today’s appointments',totals.today,'?date='+today],['Pending requests',totals.pending,'?status=pending'],['Confirmed today',totals.confirmed,'?date='+today+'&amp;status=confirmed'],['Completed today',totals.completed,'?date='+today+'&amp;status=completed']].map(([name,count,filter])=>`<a class="stat" href="/admin/appointments${filter}"><span>${name}</span><b>${count}</b></a>`).join('');
  const rows=db.prepare("SELECT time,name,status FROM appointments WHERE date=? ORDER BY time,reference LIMIT 12").all(today);
  const list=rows.length?`<table><thead><tr><th>Time</th><th>Patient</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${h(r.time)}</td><td>${h(r.name)}</td><td><span class="state">${h(r.status)}</span></td></tr>`).join('')}</tbody></table>`:'<p class="staff-empty">No appointments scheduled for today.</p>';
  const content=db.prepare('SELECT locale,published,draft FROM content ORDER BY locale').all();
  const review=content.map(r=>`<li><a href="/admin?locale=${r.locale}">${r.locale==='kn'?'Kannada':'English'} content</a><span>${!r.published?'Awaiting approval':r.published===r.draft?'Published':'Draft changes'}</span></li>`).join('');
  const tasks = [];
  if (staff.role==='owner' && readClinicProfile(db).revision===0) tasks.push(['Verify clinic profile','Review the clinic address, contact details and doctor profile before publishing.','/admin/clinic']);
  if (!schedule(db).periods.length) tasks.push(['Set working hours','Add working intervals to open appointment slots.','/admin/appointments#staff-hours']);
  if (!catalogue.list('en').length) tasks.push(['Review treatment drafts','Each language needs doctor approval before a treatment appears on the website.','/admin/services']);
  const setup = tasks.length ? `<section class="staff-panel"><h2>Clinic setup</h2><ul class="setup-tasks">${tasks.map(([title,text,link])=>`<li><a href="${link}">${title}</a><p>${text}</p></li>`).join('')}</ul></section>` : '';
  return `<p class="staff-date">${h(new Intl.DateTimeFormat('en-IN',{dateStyle:'full',timeZone:'Asia/Kolkata'}).format(new Date()))}</p><div class="stats">${stats}</div>
  <div class="staff-panels"><section class="staff-panel"><header><h2>Today’s schedule</h2><a href="/admin/appointments?date=${today}">View all</a></header>${list}</section><section class="staff-panel"><h2>Website publishing</h2><ul class="publish-list">${review}<li><a href="/admin/services">Treatment catalogue</a><span>${catalogue.list('en').length} published</span></li></ul></section></div>${setup}`;
}
