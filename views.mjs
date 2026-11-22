export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const h = escape;
export const route = (locale, path = '') => '/' + locale + '/' + path;
export const phone = '+919900250104';
export const button = (url, label, secondary = false) =>
  `<a class="button${secondary ? ' secondary' : ''}" href="${h(url)}">${h(label)}</a>`;

const navItems = [['home', ''], ['about', 'about'], ['services', 'services'], ['doctor', 'doctor'], ['gallery', 'gallery'], ['contact', 'contact']];
const footerExplore = [['about', 'about'], ['services', 'services'], ['doctor', 'doctor'], ['gallery', 'gallery'], ['faq', 'faq']];
const footerPatients = [['book', 'book-appointment'], ['status', 'appointment-status'], ['contact', 'contact']];
const footerPolicies = [['privacy', 'privacy'], ['terms', 'terms'], ['accessibility', 'accessibility']];
const shellLabels = {
  en: { primary: 'Main navigation', explore: 'Explore', patients: 'Patient resources', policies: 'Policies', directions: 'Get directions', message: 'WhatsApp' },
  kn: { primary: 'ಮುಖ್ಯ ಪುಟಗಳ ಪಟ್ಟಿ', explore: 'ಮತ್ತಷ್ಟು ತಿಳಿಯಿರಿ', patients: 'ರೋಗಿಗಳಿಗೆ ಮಾಹಿತಿ', policies: 'ನೀತಿಗಳು', directions: 'ದಾರಿ ನೋಡಿ', message: 'ವಾಟ್ಸಾಪ್' }
};
const icon = (path, size = 18) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
export const arrowRight = icon('<path d="M4 12h15m-6-6 6 6-6 6"/>', 16);
export const arrowOut = icon('<path d="M6 18 18 6M7 6h11v11"/>', 16);
const logo = icon('<path d="M12 6c-2-2.2-6.4-2.8-7.2.9-.4 2.4 1.2 4.6 1.8 8.2.4 2.4 1.9 3 2.8.6l.9-3a1.8 1.8 0 0 1 3.4 0l.9 3c.9 2.4 2.4 1.8 2.8-.6.4-2.2 1.2-4 1.5-5.6"/><path d="M18 3v5m-2.5-2.5h5" class="brand-spark"/>', 30);
const pinIcon = icon('<path d="M20 10c0 5-8 10-8 10s-8-5-8-10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>', 16);
const phoneIcon = icon('<path d="M7 3h3l1 5-2 1.5a13 13 0 0 0 5.5 5.5L16 13l5 1v3c0 2-1.6 4-4 4A16 16 0 0 1 3 7c0-2.4 2-4 4-4Z"/>', 16);
const menuIcon = icon('<path class="menu-lines" d="M4 6h16M4 12h16M4 18h16"/><path class="menu-close" d="m6 6 12 12M18 6 6 18"/>', 22);

export function layout({ locale, path, query = '', t, title, description = '', body, origin, noindex = false }) {
  const canonical = new URL(route(locale, path), origin);
  const structured = [
    { '@context': 'https://schema.org', '@type': 'Dentist', name: t.clinic, url: origin, telephone: t.phoneNumber || phone, address: t.address },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.home, item: new URL(route(locale), origin).href },
      ...(path ? [{ '@type': 'ListItem', position: 2, name: title, item: canonical.href }] : [])
    ] }
  ];
  const jsonLd = JSON.stringify(structured).replaceAll('<', '\\u003c');
  const aliases = ['en', 'kn'].map(l => `<link rel="alternate" hreflang="${l}" href="${h(new URL(route(l, path), origin))}">`).join('');
  const navigation = navItems.map(([key, slug]) => `<a href="${route(locale, slug)}"${path === slug ? ' aria-current="page"' : ''}>${h(t[key])}</a>`).join('');
  const languages = [['en', 'English'], ['kn', 'ಕನ್ನಡ']].map(([l, name]) =>
    `<a lang="${l}" hreflang="${l}" href="${h(route(l, path) + query)}"${l === locale ? ' aria-current="true"' : ''}>${name}</a>`).join('');
  const book = button(route(locale, 'book-appointment'), t.book);
  const labels = shellLabels[locale];
  const brand = `<a class="brand" href="${route(locale)}"><span class="brand-mark">${logo}</span><span class="brand-name">${h(t.clinic)}</span></a>`;
  const call = `<a href="tel:${h(t.phoneNumber || phone)}">${phoneIcon}<bdi>${h(t.phoneDisplay || '+91 99002 50104')}</bdi></a>`;
  const links = items => items.map(([key, slug]) => `<li><a href="${route(locale, slug)}">${h(t[key])}</a></li>`).join('');
  const footerGroup = (heading, items) => `<nav aria-label="${h(heading)}"><h2>${h(heading)}</h2><ul>${links(items)}</ul></nav>`;
  return `<!doctype html><html lang="${locale}"${process.env.ANALYTICS_ENABLED === 'true' ? ' data-analytics' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${h(title)} | ${h(t.clinic)}</title><meta name="description" content="${h(description)}">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${h(canonical)}">${aliases}<link rel="alternate" hreflang="x-default" href="${h(new URL(route('en', path), origin))}">`}
  ${noindex ? '' : `<meta property="og:type" content="website"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(description)}"><meta property="og:url" content="${h(canonical)}"><meta property="og:locale" content="${locale === 'en' ? 'en_IN' : 'kn_IN'}"><meta property="og:image" content="${h(origin)}/assets/dental-model.webp"><script type="application/ld+json">${jsonLd}</script>`}
  <link rel="stylesheet" href="/assets/site.css">${['book-appointment','appointment-status'].includes(path)?'<link rel="stylesheet" href="/assets/booking.css">':''}<link rel="stylesheet" href="/assets/pages.css"><link rel="stylesheet" href="/assets/patient-tools.css"><script src="/assets/patient-tools.js" defer></script><script src="/assets/site.js" defer></script></head><body>
  ${process.argv.includes('--demo') ? `<div class="demo-ribbon">${locale === 'en' ? 'Local demonstration · Sample treatments and times. Bookings here are for testing only.' : 'ಸ್ಥಳೀಯ ಪ್ರಾತ್ಯಕ್ಷಿಕೆ · ಮಾದರಿ ಚಿಕಿತ್ಸೆಗಳು ಮತ್ತು ಸಮಯಗಳು. ಇಲ್ಲಿ ಸಲ್ಲಿಸುವ ಕೋರಿಕೆಗಳು ಪರೀಕ್ಷೆಗೆ ಮಾತ್ರ.'}</div>` : ''}
  <a href="#main" class="skip-link">${h(t.skip)}</a>
  <header class="site-header">
    <div class="utility-bar"><div class="shell utility-inner">
      <a class="utility-location" href="${route(locale, 'contact')}">${pinIcon}<span>${h(t.location)}</span></a>
      <div class="utility-contact">${call}</div>
    </div></div>
    <div class="shell header-inner">
      ${brand}
      <nav class="desktop-nav" aria-label="${h(labels.primary)}">${navigation}</nav>
      <nav class="language" aria-label="${h(t.language)}">${languages}</nav>
      <span class="header-cta">${book}</span>
      <details class="mobile-nav"><summary aria-label="${h(t.menu)}">${menuIcon}</summary><nav aria-label="${h(labels.primary)}">${navigation}${book}</nav></details>
    </div>
  </header>
  <main id="main" tabindex="-1">${body}</main>
  <footer class="site-footer">
    <div class="shell footer-inner">
      <div class="footer-brand">${brand}<p>${h(t.location)}</p></div>
      ${footerGroup(labels.explore, footerExplore)}
      ${footerGroup(labels.patients, footerPatients)}
      <div class="footer-contact">
        <h2>${h(t.contactLabel)}</h2><address>${h(t.address)}</address>
        ${call}<p>${h(t.clinicHours || t.hours)}</p>
        ${t.clinicMaps ? `<a href="${h(t.clinicMaps)}">${h(labels.directions)}</a>` : ''}
        ${t.clinicWhatsapp ? `<a href="${h(t.clinicWhatsapp)}">${h(labels.message)}</a>` : ''}
      </div>
    </div>
    <div class="shell footer-bottom"><small>© ${new Date().getFullYear()} ${h(t.clinic)}</small><nav aria-label="${h(labels.policies)}"><ul>${links(footerPolicies)}</ul></nav></div>
  </footer>
  </body></html>`;
}

export const intro = (title, description) =>
  `<div class="page-intro"><h1>${h(title)}</h1>${description ? `<p>${h(description)}</p>` : ''}</div>`;
export const panel = (title, description, body = '') =>
  `<div class="shell section">${intro(title, description)}${body}</div>`;

const bookingLabels = {
  en: {
    steps:['Treatment','Date','Time','Your details','Review','Result'],
    titles:['What brings you in?','Choose a visit date','Choose a time','Your contact details','Review your request'],
    help:['Select the type of visit you would like to request.','Choose an available date on the clinic calendar.','Available appointment times are shown in India Standard Time.','We’ll use these details to contact you about your visit.','Check your details before sending your request to the clinic.'],
    general:'General consultation',generalDetail:'Discuss your concerns with the dentist.',next:'Continue',back:'Back', progress:'Booking progress',step:'Step',of:'of',previousMonth:'Previous month',nextMonth:'Next month',available:'Available',unavailable:'Unavailable',noDates:'No appointments are available this month.',noTimes:'This date has no available times. Please select another date.',retry:'Could not load availability. Try again.',reload:'Try again',loading:'Checking availability…',email:'Email (optional)',whatsapp:'Send me appointment updates on WhatsApp (optional).',contact:'Your clinic',directions:'Get directions',before:'Before your visit',policy:'A request reserves your preferred time while the clinic reviews it. Please wait for confirmation before visiting.',call:'Call the clinic',selectDate:'Choose an available date.',selectTime:'Choose an available time.',js:'Enable JavaScript to use the booking calendar, or call the clinic to request a visit.'
  },
  kn: {
    steps:['ಚಿಕಿತ್ಸೆ','ದಿನಾಂಕ','ಸಮಯ','ನಿಮ್ಮ ವಿವರಗಳು','ಪರಿಶೀಲನೆ','ಫಲಿತಾಂಶ'],
    titles:['ನಿಮಗೆ ಯಾವ ಸೇವೆ ಬೇಕು?','ಭೇಟಿಯ ದಿನಾಂಕ ಆಯ್ಕೆಮಾಡಿ','ಸಮಯ ಆಯ್ಕೆಮಾಡಿ','ನಿಮ್ಮ ಸಂಪರ್ಕ ವಿವರಗಳು','ನಿಮ್ಮ ಕೋರಿಕೆ ಪರಿಶೀಲಿಸಿ'],
    help:['ನೀವು ಬಯಸುವ ಭೇಟಿಯ ವಿಧವನ್ನು ಆಯ್ಕೆಮಾಡಿ.','ಕ್ಲಿನಿಕ್‌ನ ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ಲಭ್ಯವಿರುವ ದಿನಾಂಕವನ್ನು ಆಯ್ಕೆಮಾಡಿ.','ಲಭ್ಯವಿರುವ ಸಮಯಗಳನ್ನು ಭಾರತೀಯ ಪ್ರಮಾಣಿತ ಸಮಯದಲ್ಲಿ ತೋರಿಸಲಾಗಿದೆ.','ನಿಮ್ಮ ಭೇಟಿಯ ಕುರಿತು ನಿಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಲು ಈ ವಿವರಗಳನ್ನು ಬಳಸುತ್ತೇವೆ.','ಕ್ಲಿನಿಕ್‌ಗೆ ಕೋರಿಕೆ ಕಳುಹಿಸುವ ಮೊದಲು ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.'],
    general:'ಸಾಮಾನ್ಯ ಸಮಾಲೋಚನೆ',generalDetail:'ನಿಮ್ಮ ಸಮಸ್ಯೆಗಳ ಕುರಿತು ದಂತವೈದ್ಯರೊಂದಿಗೆ ಮಾತನಾಡಿ.',next:'ಮುಂದುವರಿಸಿ',back:'ಹಿಂದೆ',progress:'ಭೇಟಿಯ ಕೋರಿಕೆಯ ಹಂತಗಳು',step:'ಹಂತ',of:'/',previousMonth:'ಹಿಂದಿನ ತಿಂಗಳು',nextMonth:'ಮುಂದಿನ ತಿಂಗಳು',available:'ಲಭ್ಯವಿದೆ',unavailable:'ಲಭ್ಯವಿಲ್ಲ',noDates:'ಈ ತಿಂಗಳಲ್ಲಿ ಭೇಟಿಗೆ ಸಮಯ ಲಭ್ಯವಿಲ್ಲ.',noTimes:'ಈ ದಿನಾಂಕಕ್ಕೆ ಸಮಯ ಲಭ್ಯವಿಲ್ಲ. ಬೇರೆ ದಿನಾಂಕ ಆಯ್ಕೆಮಾಡಿ.',retry:'ಲಭ್ಯತೆಯನ್ನು ತಿಳಿಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',reload:'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',loading:'ಲಭ್ಯತೆಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…',email:'ಇಮೇಲ್ (ಐಚ್ಛಿಕ)',whatsapp:'ನನ್ನ ಭೇಟಿಯ ಕುರಿತು ವಾಟ್ಸಾಪ್ ಸಂದೇಶಗಳನ್ನು ಕಳುಹಿಸಿ (ಐಚ್ಛಿಕ).',contact:'ನಿಮ್ಮ ಕ್ಲಿನಿಕ್',directions:'ದಾರಿ ತಿಳಿಯಿರಿ',before:'ಭೇಟಿಗೆ ಮೊದಲು',policy:'ಕ್ಲಿನಿಕ್ ನಿಮ್ಮ ಕೋರಿಕೆಯನ್ನು ಪರಿಶೀಲಿಸುವವರೆಗೆ ಆಯ್ಕೆಮಾಡಿದ ಸಮಯವನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗುತ್ತದೆ. ಭೇಟಿ ನೀಡುವ ಮೊದಲು ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕಾಯಿರಿ.',call:'ಕ್ಲಿನಿಕ್‌ಗೆ ಕರೆ ಮಾಡಿ',selectDate:'ಲಭ್ಯವಿರುವ ದಿನಾಂಕವನ್ನು ಆಯ್ಕೆಮಾಡಿ.',selectTime:'ಲಭ್ಯವಿರುವ ಸಮಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ.',js:'ಭೇಟಿಯ ದಿನಾಂಕವನ್ನು ಆಯ್ಕೆ ಮಾಡಲು ಜಾವಾಸ್ಕ್ರಿಪ್ಟ್ ಸಕ್ರಿಯಗೊಳಿಸಿ ಅಥವಾ ಕ್ಲಿನಿಕ್‌ಗೆ ಕರೆ ಮಾಡಿ.'
  }
};
export function appointmentForm(locale, page, t, values, errors, today, services, key, clinic, lastDate, selected = '') {
  const l=bookingLabels[locale];
  const fieldError=name=>errors[name]?`<span class="field-error" id="${name}-error">${h(errors[name])}</span>`:'';
  const textField=(name,type,label,attributes='')=>`<label for="${name}">${h(label)}<input id="${name}" name="${name}" type="${type}" value="${h(values?.[name])}" ${attributes} ${errors[name]?`aria-invalid="true" aria-describedby="${name}-error"`:''}>${fieldError(name)}</label>`;
  const step=(number,contents)=>`<section class="bw-step" data-step="${number}" ${number!==1?'hidden':''}><p class="bw-count">${h(l.step)} ${number} ${h(l.of)} 6</p><h2 tabindex="-1">${h(l.titles[number-1])}</h2><p class="bw-help">${h(l.help[number-1])}</p>${contents}</section>`;
  const all=[{slug:'general',title:l.general,description:l.generalDetail},...services];
  const errorStep=errors.date?2:errors.time?3:Object.keys(errors).length?4:1;
  return `<div class="shell booking-page"><header class="bw-heading"><h1>${h(page.title)}</h1><p>${h(page.description)}</p></header><div class="bw-layout">
  <div class="bw-main"><ol class="bw-progress" aria-label="${h(l.progress)}">${l.steps.map((label,i)=>`<li ${i===0?'aria-current="step"':''}><span>${i+1}</span>${h(label)}</li>`).join('')}</ol>
  <noscript><p class="notice">${h(l.js)} <a href="${h(clinic.phoneHref)}">${h(clinic.phoneDisplay)}</a></p></noscript>
  <form class="bw-form" method="post" novalidate data-appointment data-preselect="${h(selected)}" data-start="${errorStep}" data-today="${today}" data-last="${lastDate}" data-text="${h(JSON.stringify({...l,required:t.required,invalidPhone:t.invalidPhone,needConsent:t.needConsent,invalidEmail:locale==='en'?'Enter a valid email address.':'ಮಾನ್ಯ ಇಮೇಲ್ ವಿಳಾಸ ನಮೂದಿಸಿ.'}))}" ${values?'data-server-values':''} action="${route(locale,'book-appointment')}">
  <input type="hidden" name="key" value="${h(key)}"><input type="hidden" id="service" name="service" value="${h(values?.service||selected||'general')}"><input type="hidden" id="date" name="date" value="${h(values?.date)}"><input type="hidden" id="time" name="time" value="${h(values?.time)}">
  ${Object.keys(errors).length?`<p class="notice" role="alert">${h(t.fieldError)}</p>`:''}
  ${step(1,`<div class="bw-services">${all.map(item=>`<button type="button" data-service="${h(item.slug)}" data-title="${h(item.title)}" aria-pressed="${item.slug===(values?.service||selected||'general')}"><span class="bw-service-title">${h(item.title)}</span><span class="bw-radio" aria-hidden="true"></span><span class="bw-description">${h(item.description)}</span></button>`).join('')}</div>`)}
  ${step(2,`<div class="bw-calendar"><div class="bw-month"><button type="button" data-month="-1" aria-label="${h(l.previousMonth)}">‹</button><strong data-month-title></strong><button type="button" data-month="1" aria-label="${h(l.nextMonth)}">›</button></div><div class="bw-grid" data-days></div></div><p class="bw-status" data-calendar-message role="status"></p><button class="bw-retry" type="button" data-retry-calendar hidden>${h(l.reload)}</button>${fieldError('date')}`)}
  ${step(3,`<p class="bw-chosen" data-chosen-date></p><div class="bw-times" data-times></div><p class="bw-status" data-slot-message role="status"></p><button class="bw-retry" type="button" data-retry-time hidden>${h(l.reload)}</button>${fieldError('time')}`)}
  ${step(4,`<div class="bw-fields">${textField('name','text',t.name,'autocomplete="name" maxlength="100" required')}${textField('phone','tel',t.phone,'autocomplete="tel" maxlength="24" required')}${textField('email','email',l.email,'autocomplete="email" maxlength="254"')}</div>
  <label class="bw-check"><input type="checkbox" name="consent" required value="yes" ${values?.consent==='yes'?'checked':''}>${h(t.consent)}</label>${fieldError('consent')}
  <label class="bw-check"><input type="checkbox" name="whatsapp" value="yes" ${values?.whatsapp==='yes'?'checked':''}>${h(l.whatsapp)}</label>`)}
  ${step(5,`<dl class="bw-review">${[['service',l.steps[0]],['date',t.date],['time',t.time],['name',t.name],['phone',t.phone],['email',l.email]].map(([id,label])=>`<div><dt>${h(label)}</dt><dd data-review="${id}"></dd></div>`).join('')}</dl>`)}
  <p role="alert" data-problem class="field-error"></p><div class="bw-controls"><button class="button secondary" type="button" data-back hidden>${h(l.back)}</button><button class="button" type="button" data-next>${h(l.next)} ${arrowRight}</button><button class="button" type="submit" hidden>${h(t.submit)}</button></div></form></div>
  <aside class="bw-aside"><div class="bw-side-card"><p class="bw-count">${h(l.contact)}</p><h2>${h(clinic.name)}</h2><p>${h(clinic.address)}</p>${clinic.doctor?`<p><strong>${h(clinic.doctor)}</strong><br>${h(clinic.credentials)}</p>`:''}<a href="${h(clinic.phoneHref)}">${h(clinic.phoneDisplay)}</a>${clinic.mapsHref?`<a href="${h(clinic.mapsHref)}">${h(l.directions)} ${arrowOut}</a>`:''}</div><div class="bw-policy"><h3>${h(l.before)}</h3><p>${h(l.policy)}</p></div></aside></div></div>`;
}
