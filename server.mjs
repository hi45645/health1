import { handleGallery, serveGalleryMedia, renderPublicGallery } from './gallery.mjs';
import { BookingError, initBooking, reserve, expire, slots, managementToken, hasToken, patientAction } from './booking.mjs';
import { staffBookings } from './booking-admin.mjs';
import { getClinic, readClinicProfile, saveClinicProfile, renderClinicEditor } from './clinic.mjs';
import { createAnalytics } from './analytics.mjs';
import { createCatalogue, renderServiceDetails } from './catalogue.mjs';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { authenticate, initAuth, audit } from './auth.mjs';
import { openStore } from './store.mjs';
import { route, escape as h, phone, button, layout, panel, appointmentForm } from './views.mjs';

const load = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const seed = load('content.json');
const copy = load('ui.json');
const extras = load('extra.json');
const legacy = new Map(Object.entries(load('redirects.json')));
for (const [source, target] of legacy) {
  if (!/^\/[A-Za-z0-9_.%/-]+$/.test(source) || /^\/(en|kn|admin|assets|media)(\/|$)/.test(source)
    || !/^\/(en|kn)\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(target)) throw new Error('Invalid legacy URL mapping');
}
const locales = ['en', 'kn'];
const slugs = ['consultation', 'cleaning', 'fillings', 'root-canal', 'crowns', 'extraction'];
const editablePages = { home: [], about: [], treatments: [], faq: seed.en.faq.items, contact: [], appointment: [] };
const paths = ['', 'about', 'doctor', 'services', 'gallery', 'faq', 'contact', 'privacy', 'terms', 'accessibility', 'book-appointment', 'appointment-status'];
const origin = new URL(process.env.SITE_ORIGIN || 'http://localhost:' + (process.env.PORT || 3000)).origin;
const secure = origin.startsWith('https:') ? '; Secure' : '';
process.umask(0o077);
const db = openStore(process.env.DB_PATH || 'data/clinic.sqlite');

initBooking(db);
const catalogue = createCatalogue(db, seed, slugs);
const analytics = createAnalytics(db, process.env.ANALYTICS_ENABLED === 'true');

initAuth(db);

function shape(value) {
  return Array.isArray(value) ? value.map(shape) : typeof value === 'object' && value !== null
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, shape(value[key])]))
    : typeof value;
}
for (const catalog of [seed, copy, extras]) {
  if (JSON.stringify(shape(catalog.en)) !== JSON.stringify(shape(catalog.kn))) throw new Error('Locale catalogs must have matching keys');
}
for (const locale of locales) {
  db.prepare('INSERT OR IGNORE INTO content (locale, draft) VALUES (?, ?)').run(locale, JSON.stringify(seed[locale]));
}

const assets = new Map([
  ['site.css', 'text/css; charset=utf-8'], ['site.js', 'text/javascript; charset=utf-8'],
  ['kannada.woff2', 'font/woff2'], ['clinic-small.webp', 'image/webp'], ['clinic.webp', 'image/webp'], ['OFL-Kannada.txt', 'text/plain; charset=utf-8']
]);
const medicalRows = () => db.prepare('SELECT locale, published FROM content').all();
const dateInClinic = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(new Date());
const receiptPattern = /^[a-f0-9]{32}$/;

function respond(res, status, content, type = 'text/html; charset=utf-8', headers = {}) {
  res.writeHead(status, { 'Content-Type': type, ...headers });
  res.end(content);
}
function redirect(res, location, status = 303) {
  res.writeHead(status, { Location: location });
  res.end();
}
async function readForm(req, limit = 4096) {
  if (!req.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) throw Object.assign(new Error(), { status: 415 });
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) {
      req.resume();
      throw Object.assign(new Error(), { status: 413 });
    }
    chunks.push(chunk);
  }
  return Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')));
}
function validate(values, t, x, now) {
  const errors = {};
  if (!values.name) errors.name = t.required;
  else if (values.name.length > 100) errors.name = x.invalidName;
  const normalized = (values.phone || '').replace(/[\s()-]/g, '');
  if (!values.phone) errors.phone = t.required;
  else if (!/^(?:\+91)?[6-9]\d{9}$/.test(normalized)) errors.phone = t.invalidPhone;
  const parsed = new Date(values.date + 'T00:00:00Z');
  if (!values.date) errors.date = t.required;
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) || Number.isNaN(+parsed) ||
    parsed.toISOString().slice(0, 10) !== values.date || values.date < now) errors.date = t.invalidDate;
  if (!values.time) errors.time = t.required;
  else if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(values.time)) errors.time = x.invalidTime;
  if (values.consent !== 'yes') errors.consent = t.needConsent;
  return errors;
}
function cards(locale, items, heading = "h2") {
  return '<div class="cards">' + items.map((item) =>
    `<article class="card"><${heading}><a href="${route(locale, 'services/' + item.slug)}">${h(item.title)}</a></${heading}><p>${h(item.description)}</p></article>`).join('') + '</div>';
}

async function publicPage(req, res, url, locale, path) {
  const clinic = getClinic(db, locale);
  const t = { ...copy[locale], clinic: clinic.name, address: clinic.address, location: clinic.location, phoneNumber: clinic.phone, phoneDisplay: clinic.phoneDisplay };
  const x = extras[locale];
  const services = catalogue.list(locale);
  const rows = medicalRows();
  const published = rows.every(row => row.published) ? JSON.parse(rows.find(row => row.locale === locale).published) : null;
  const approved = rows.find(row => row.locale === locale).published;
  const page = approved ? JSON.parse(approved) : seed[locale];
  const now = dateInClinic();
  const bookUrl = route(locale, 'book-appointment');
  const statusUrl = route(locale, 'appointment-status');
  const contact = `<div class="notice"><p>${h(t.address)}</p><p>${h(clinic.hours || t.hours)}</p>${button(clinic.phoneHref, t.call, true)} ${clinic.whatsappHref ? button(clinic.whatsappHref, locale === 'en' ? 'WhatsApp' : 'ವಾಟ್ಸಾಪ್', true) : ''} ${clinic.mapsHref ? button(clinic.mapsHref, locale === 'en' ? 'Get directions' : 'ದಾರಿ ನೋಡಿ', true) : ''}</div>`;
  const photo = `<img src="/assets/clinic.webp" srcset="/assets/clinic-small.webp 600w, /assets/clinic.webp 1200w" sizes="(max-width: 752px) 100vw, 50vw" fetchpriority="high" alt="${h(x.image)}" width="1200" height="900">`;
  let seoTitle, seoDescription;
  let title = t.notFound, description = '', body, status = 200, noindex = false, query = '';
  if (req.method === 'POST' && !['book-appointment','appointment-status'].includes(path)) return respond(res, 405, '');
  if (path === 'slots') return respond(res,200,JSON.stringify({slots:slots(db,url.searchParams.get('date')||'')}),'application/json; charset=utf-8');
  if (path === '') {
    ({ title, description } = page.home);
    body = `<section class="shell hero"><div class="hero-copy"><p class="eyebrow">${h(t.heroLabel)}</p><h1>${h(title)}</h1><p>${h(description)}</p><div class="actions">${button(bookUrl, t.book)}${button(route(locale, 'services'), t.explore, true)}</div></div><div class="hero-visual">${photo}</div></section>
    <section class="shell section"><p class="eyebrow">${h(t.servicesLabel)}</p><h2>${h(page.treatments.title)}</h2><p>${h(page.treatments.description)}</p>${services.length ? cards(locale, services, 'h3') : button(route(locale, 'services'), t.explore, true)}</section>
    <section class="shell section"><h2>${h(t.contactLabel)}</h2>${contact}</section>`;
  } else if (path === 'services') {
    ({ title, description } = page.treatments);
    body = panel(title, description, services.length ? cards(locale, services) : `<p class="notice">${h(x.contentPending)}</p>`);
  } else if (path.startsWith('services/') && catalogue.get(locale, path.slice(9))) {
    ({ title, description, seoTitle, seoDescription } = catalogue.get(locale, path.slice(9)));
    body = panel(title, description, renderServiceDetails(locale, catalogue.get(locale, path.slice(9))) + button(bookUrl, t.book));
  } else if (path === 'faq') {
    ({ title, description } = page.faq);
    body = panel(title, description, published ? published.faq.items.map(item =>
      `<details class="faq-item"><summary>${h(item.title)}</summary><p>${h(item.description)}</p></details>`).join('') : `<p class="notice">${h(x.contentPending)}</p>`);
  } else if (path === 'book-appointment') {
    ({ title, description } = page.appointment);
    let values, errors = {};
    if (req.method === 'POST') {
      const data = await readForm(req);
      values = Object.fromEntries(['name','phone','email','date','time','service','key','consent','whatsapp'].map(key => [key, (data[key] || '').trim()]));
      errors = validate(values, t, x, now);
      if(values.email && (values.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))) {
        errors.email=locale==='en'?'Enter a valid email address.':'ಮಾನ್ಯ ಇಮೇಲ್ ವಿಳಾಸ ನಮೂದಿಸಿ.';
      }
      status = 422;
      if (!Object.keys(errors).length) {
        try {
          const reference=reserve(db,values,locale,slug=>catalogue.get(locale,slug));
          res.setHeader('Set-Cookie',[res.getHeader('Set-Cookie'),`clinic_manage=${managementToken(db,reference)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=7776000${secure}`]);
          return redirect(res,statusUrl+'?received='+reference);
        } catch(error) {
          if (!(error instanceof BookingError)) throw error;
          if(error.message==='slot' || error.message==='conflict') status=409;
          errors.time=locale==='en'?'Please choose an available slot and check your details.':'ಲಭ್ಯವಿರುವ ಸಮಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ ಮತ್ತು ನಿಮ್ಮ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.';
        }
      }
    }
    body = appointmentForm(locale,page.appointment,t,values,errors,now,catalogue.list(locale),values?.key || randomBytes(16).toString('hex'),slots(db,values?.date || ''));
  } else if (path === 'appointment-status') {
    const token=req.headers.cookie?.match(/(?:^|;\s*)clinic_manage=([0-9a-f]{64})(?:;|$)/)?.[1];
    if(req.method==='POST') {
      if(req.headers.origin!==origin) return respond(res,403,'');
      const data=await readForm(req);
      try { patientAction(db,data.reference,token,data.action); }
      catch(e) {
        if(!(e instanceof BookingError)) throw e;
        const title=t.fieldError;
        const reason=e.message==='deadline' ? (locale==='en'?'Online cancellation is unavailable for this appointment. Please call the clinic.':'ಈ ಭೇಟಿಯನ್ನು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ರದ್ದುಪಡಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಕ್ಲಿನಿಕ್‌ಗೆ ಕರೆ ಮಾಡಿ.') : t.call;
        return respond(res,422,layout({locale,path,t,title,body:panel(title,reason),origin,noindex:true}));
      }
      return redirect(res,statusUrl+'?reference='+encodeURIComponent(data.reference));
    }
    title = t.status;
    description = t.receiptHint;
    const received = url.searchParams.get('received');
    const reference = received ?? url.searchParams.get('reference');
    const valid = reference && receiptPattern.test(reference);
    expire(db);
    const found = valid && db.prepare('SELECT status FROM appointments WHERE reference = ?').get(reference);
    if (valid) query = '?' + (received ? 'received=' : 'reference=') + reference;
    noindex = Boolean(reference);
    if (found && received) {
      title = t.confirmation;
      description = t.confirmationBody;
      body = panel(title, description, `<div class="notice" data-confirmation><p>${h(t.reference)}</p><bdi>${reference}</bdi></div>`);
    } else {
      const result = reference ? `<p class="notice" role="status">${h(found ? (found.status === 'confirmed' ? x.confirmed : found.status === 'pending' ? t.pending : ({en:{completed:'Completed',cancelled:'Cancelled','no-show':'Missed appointment',expired:'Expired'},kn:{completed:'ಪೂರ್ಣಗೊಂಡಿದೆ',cancelled:'ರದ್ದಾಗಿದೆ','no-show':'ಭೇಟಿಗೆ ಹಾಜರಾಗಿಲ್ಲ',expired:'ಅವಧಿ ಮುಗಿದಿದೆ'}}[locale][found.status])) : valid ? x.missingReference : x.invalidReference)}</p>` : '';
      body = panel(title, description, `<form class="stack" action="${statusUrl}"><label for="reference">${h(t.reference)}</label><input id="reference" name="reference" value="${h(valid ? reference : '')}" maxlength="32" required><button class="button">${h(t.find)}</button></form>${result}`);
    }
    if (valid && hasToken(db,reference,token)) body+=`<form class="shell actions" method="post" action="${statusUrl}"><input type="hidden" name="reference" value="${reference}"><button name="action" value="cancel">${locale==='en'?'Cancel appointment':'ಭೇಟಿ ರದ್ದುಪಡಿಸಿ'}</button><button name="action" value="optout">${locale==='en'?'Opt out of updates':'ಸಂದೇಶಗಳನ್ನು ನಿಲ್ಲಿಸಿ'}</button></form>`;
  } else if (path === 'about' || path === 'contact') {
    ({ title, description } = page[path]);
    body = panel(title, description, path === 'contact' ? contact : button(bookUrl, t.book));
  } else if (['doctor', 'gallery', 'privacy', 'terms', 'accessibility'].includes(path)) {
    title = t[path];
    description = path === 'doctor' && clinic.doctor ? [clinic.doctor, clinic.credentials, clinic.fee].filter(Boolean).join(' · ') : x[path];
    body = panel(title, description, path === 'gallery' ? renderPublicGallery(db, locale) : '');
  } else {
    status = 404;
    noindex = true;
    body = panel(title, '', button(route(locale), t.back));
  }
  if (req.method === 'GET' && status === 200 && !noindex) {
    analytics.count('page_view', locale);
    if (path === 'book-appointment') analytics.count('appointment_page', locale);
    if (path.startsWith('services/')) analytics.count('treatment_page', locale);
  }
  return respond(res, status, layout({ locale, path, query, t, title: seoTitle || title, description: path === '' && clinic.seoDescription ? clinic.seoDescription : seoDescription || description, body, origin, noindex }));
}

const digest = value => createHash('sha256').update(value).digest();
function editedContent(data, locale) {
  const draft = structuredClone(seed[locale]);
  for (const [page, items] of Object.entries(editablePages)) {
    for (const field of ['title', 'description']) draft[page][field] = data[page + '.' + field]?.trim();
    items.forEach((_, i) => {
      for (const field of ['title', 'description']) draft[page].items[i][field] = data[page + '.' + i + '.' + field]?.trim();
    });
  }
  return JSON.stringify(shape(draft)) === JSON.stringify(shape(seed[locale])) &&
    !Object.values(draft).some(p => [p, ...(p.items || [])].some(item =>
      !item.title || !item.description || item.title.length > 160 || item.description.length > 1500)) ? draft : null;
}

function staffPage(title,body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)}</title><link rel="stylesheet" href="/assets/site.css"></head><body><main class="shell section"><a href="/admin">Clinic administration</a><h1>${h(title)}</h1>${body}</main></body></html>`;
}

async function admin(req, res, url) {
  const staff = await authenticate({ db, req, res, url, origin, readForm, respond, redirect });
  if (!staff) return;
  const { role } = staff;
  if (role === 'receptionist' && !url.pathname.startsWith('/admin/appointments')) {
    if (req.method === 'GET' && url.pathname === '/admin') return redirect(res, '/admin/appointments');
    return respond(res,403,'Appointment access only.','text/plain');
  }
  if (url.pathname === '/admin/gallery') return await handleGallery(req,res,url,{db,staff,origin,respond,redirect});
  if (url.pathname === '/admin/services') {
    if (req.method === 'POST') {
      const result = catalogue.adminAction(url, role, await readForm(req, 512_000), event => audit(db,staff.username,'catalogue.' + event.event + '.' + event.slug));
      if (result.status === 303) {
        return redirect(res, result.location);
      }
      return respond(res, result.status, h(result.message), 'text/plain');
    }
    return respond(res, 200, catalogue.adminView(url,role));
  }
  if (url.pathname === '/admin/clinic') {
    if (role !== 'owner') return respond(res,403,'Owner access required.','text/plain');
    const result = req.method === 'POST' ? saveClinicProfile(db,await readForm(req,24000)) : { profile:readClinicProfile(db), status:200 };
    if(req.method === 'POST' && result.status === 200) {
      audit(db,staff.username,'clinic.published');
      return redirect(res,'/admin/clinic?saved=1');
    }
    return respond(res,result.status,staffPage('Clinic profile', (url.searchParams.has('saved') ? '<p role="status">Clinic profile published.</p>' : '') + renderClinicEditor(result.profile,{ errors:result.errors })));
  }
  if (url.pathname === '/admin/activity') {
    if (!['doctor','owner'].includes(role)) return respond(res,403,'Access denied.','text/plain');
    const rows = analytics.report();
    const table = rows.length ? '<table><thead><tr><th>Date</th><th>Language</th><th>Event</th><th>Total</th></tr></thead><tbody>' + rows.map(r => '<tr>' + [r.day,r.locale,r.event,r.total].map(v => '<td>'+h(v)+'</td>').join('') + '</tr>').join('') + '</tbody></table>' : '<p>No activity recorded.</p>';
    return respond(res,200,staffPage('Website activity',table));
  }
  if (url.pathname === '/admin/appointments') return await inbox(req, res, url, role);
  if (!['/admin','/admin/'].includes(url.pathname)) return respond(res,404,'Unknown staff page','text/plain');
  const locale = url.searchParams.get('locale') === 'kn' ? 'kn' : 'en';
  const location = '/admin?locale=' + locale;
  const row = db.prepare('SELECT * FROM content WHERE locale = ?').get(locale);
  let message = url.searchParams.has('saved') ? 'Draft saved.' : url.searchParams.has('approved') ? 'Doctor approval recorded.' : '';
  let status = 200;
  if (req.method === 'POST') {
    if (req.headers.origin !== origin) return respond(res, 403, 'Invalid origin', 'text/plain');
    const data = await readForm(req, 512_000);
    if (data.action === 'approve') {
      if (role !== 'doctor') return respond(res, 403, 'Doctor approval required.', 'text/plain');
      const updated = db.prepare('UPDATE content SET published = draft, approved_at = CURRENT_TIMESTAMP WHERE locale = ? AND draft = ?')
        .run(locale, data.reviewed === digest(row.draft).toString('hex') ? row.draft : '');
      if (!updated.changes) return respond(res, 409, 'The draft changed. Reload it before approving.', 'text/plain');
      audit(db, staff.username, 'content.approved.' + locale);
      return redirect(res, location + '&approved=1');
    }
    const draft = editedContent(data, locale);
    if (draft) {
      const updated = db.prepare('UPDATE content SET draft = ? WHERE locale = ? AND draft = ?')
        .run(JSON.stringify(draft), locale, data.reviewed === digest(row.draft).toString('hex') ? row.draft : '');
      if (!updated.changes) return respond(res, 409, 'The draft changed. Reload it before saving.', 'text/plain');
      return redirect(res, location + '&saved=1');
    }
    message = 'Complete all fields. Titles can be up to 160 characters and descriptions up to 1,500.';
    status = 422;
  }
  const draft = JSON.parse(row.draft);
  const fields = (item, prefix) => `<label>Title<input name="${prefix}.title" lang="${locale}" value="${h(item.title)}" required maxlength="160"></label><label>Description<textarea name="${prefix}.description" lang="${locale}" rows="4" required maxlength="1500">${h(item.description)}</textarea></label>`;
  const reviewToken = `<input type="hidden" name="reviewed" value="${digest(row.draft).toString('hex')}">`;
  const sections = Object.entries(draft).map(([key, item]) => `<fieldset><legend>${h(key)}</legend>${fields(item, key)}${(key === 'treatments' ? [] : item.items || []).map((entry, i) => fields(entry, key + '.' + i)).join('')}</fieldset>`).join('');
  return respond(res, status, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Clinic content</title><link rel="stylesheet" href="/assets/site.css"></head><body><main class="shell section"><h1>Clinic content</h1><a href="/admin/password">Change password</a><nav class="actions"><a href="/admin/services">Treatment catalogue</a><a href="/admin/activity">Website activity</a><a href="/admin/gallery">Photographs</a>${role === 'owner' ? '<a href="/admin/clinic">Clinic profile</a><a href="/admin/appointments">Appointment requests</a>' : ''}</nav><form method="post" action="/admin/logout"><button>Sign out</button></form>${role === 'owner' ? '<a href="/admin/staff">Staff accounts</a>' : ''}${role === 'doctor' ? '<p><a href="/admin/appointments">Appointment requests</a></p>' : ''}<nav class="language" aria-label="Content language"><a lang="en" href="/admin?locale=en" ${locale === 'en' ? 'aria-current="true"' : ''}>English</a><a lang="kn" href="/admin?locale=kn" ${locale === 'kn' ? 'aria-current="true"' : ''}>ಕನ್ನಡ</a></nav>
  ${message ? `<p class="notice" role="status">${h(message)}</p>` : ''}<p>${row.approved_at ? 'Last approved (UTC) ' + h(row.approved_at) : 'Awaiting doctor approval.'}</p>
  <form method="post" action="${location}" class="stack"><input type="hidden" name="action" value="save">${reviewToken}${sections}<button class="button">Save draft</button></form>
  ${role === 'doctor' ? `<form method="post" action="${location}" class="stack"><p>Review and save the draft above before approving this language for publication.</p>${reviewToken}<button class="button" name="action" value="approve">Approve saved draft</button></form>` : ''}</main></body></html>`);
}

async function inbox(req, res, url, role) {
  return staffBookings(req,res,url,role,{db,origin,readForm,respond,redirect,catalogue});
}

const submissions = new Map();
const windowMs = 60000;
const cleanLimits = setInterval(() => {
  for (const [key, bucket] of submissions) if (bucket.until <= Date.now()) submissions.delete(key);
}, windowMs);
cleanLimits.unref();

const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('Referrer-Policy', 'strict-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'");
  let locale = 'en', path = '';
  try {
    const url = new URL(req.url, origin);
    const cookie = req.headers.cookie?.match(/(?:^|;\s*)clinic_locale=(en|kn)(?:;|$)/)?.[1];
    locale = cookie || 'en';
    if (url.pathname.startsWith('/media/gallery/')) return serveGalleryMedia(req,res,url,{db,respond});
    if (!['GET', 'POST'].includes(req.method)) return respond(res, 405, '');
    if (req.method === 'GET' && legacy.has(url.pathname)) return redirect(res,legacy.get(url.pathname),308);
    if (url.pathname === '/' && req.method === 'GET') return redirect(res, route(locale), 302);
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return await admin(req, res, url);
    if (url.pathname === '/healthz') {
      db.prepare('SELECT count(*) FROM content').get();
      return respond(res, 200, 'ok', 'text/plain');
    }
    if (url.pathname === '/robots.txt') return respond(res, 200, 'User-agent: *\nDisallow: /admin\nDisallow: /*/appointment-status?\nSitemap: ' + origin + '/sitemap.xml\n', 'text/plain');
    if (url.pathname === '/activity' && req.method === 'POST') {
      if (req.headers.origin !== origin) return respond(res, 403, '');
      const { event, locale } = await readForm(req);
      if (['phone','whatsapp','directions'].includes(event)) analytics.count(event, locale);
      return respond(res, 204, '');
    }
    if (url.pathname === '/sitemap.xml' && req.method === 'GET') {
      const all = [...paths, ...catalogue.publicSlugs().map(slug => 'services/' + slug)];
      return respond(res, 200, '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        locales.flatMap(l => all.map(p => `<url><loc>${h(new URL(route(l, p), origin))}</loc></url>`)).join('') + '</urlset>', 'application/xml; charset=utf-8');
    }
    if (url.pathname.startsWith('/assets/')) {
      const name = url.pathname.slice(8);
      if (!assets.has(name) || req.method !== 'GET') return respond(res, 404, '');
      try {
        return respond(res, 200, readFileSync(new URL('public/' + name, import.meta.url)), assets.get(name), { 'Cache-Control': 'public, max-age=3600' });
      } catch (error) {
        if (error.code === 'ENOENT') return respond(res, 404, '');
        throw error;
      }
    }
    if (req.method === 'POST' && /^\/(en|kn)\/book-appointment\/?$/.test(url.pathname)) {
      if (req.headers.origin && req.headers.origin !== origin) return respond(res,403,'');
      const key = req.socket.remoteAddress;
      let bucket = submissions.get(key);
      if (!bucket || bucket.until <= Date.now()) {
        bucket = { count: 0, until: Date.now() + windowMs };
        submissions.set(key,bucket);
      }
      if (++bucket.count > 60) {
        res.setHeader('Retry-After','60');
        return respond(res,429,copy[url.pathname.split('/')[1]].serverError,'text/plain; charset=utf-8');
      }
    }
    const match = url.pathname.match(/^\/(en|kn)(?:\/(.*))?$/);
    if (match) {
      [, locale, path = ''] = match;
      path = path.replace(/\/+$/, '');
      res.setHeader('Set-Cookie', `clinic_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${secure}`);
      if (req.method === 'GET' && url.pathname !== route(locale, path)) return redirect(res, route(locale, path) + url.search, 308);
    } else path = 'not-found';
    return await publicPage(req, res, url, locale, path);
  } catch (error) {
    const t = copy[locale];
    if (!error.status) console.error('Request failed', error.code || error.name);
    const title = t.serverError;
    return respond(res, error.status || 500, layout({ locale, path, t, title, body: panel(title, ''), origin, noindex: true }));
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0');
