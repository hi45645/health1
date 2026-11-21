export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const h = escape;
export const route = (locale, path = '') => '/' + locale + '/' + path;
export const phone = '+919900250104';
export const button = (url, label, secondary = false) =>
  `<a class="button${secondary ? ' secondary' : ''}" href="${h(url)}">${h(label)}</a>`;

const navItems = [['home', ''], ['about', 'about'], ['services', 'services'], ['faq', 'faq'], ['contact', 'contact']];
const footerItems = [['doctor', 'doctor'], ['gallery', 'gallery'], ['status', 'appointment-status'], ['privacy', 'privacy'], ['terms', 'terms'], ['accessibility', 'accessibility']];
const logo = '<svg viewBox="0 0 32 32" aria-hidden="true" width="32" height="32" fill="none"><path d="M16 8c-3-3-9-4-10 2-1 4 2 8 3 13 1 3 3 3 4-1l1-5c.5-2 3.5-2 4 0l1 5c1 4 3 4 4 1 1-5 4-9 3-13-1-6-7-5-10-2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';

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
  return `<!doctype html><html lang="${locale}"${process.env.ANALYTICS_ENABLED === 'true' ? ' data-analytics' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${h(title)} | ${h(t.clinic)}</title><meta name="description" content="${h(description)}">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${h(canonical)}">${aliases}<link rel="alternate" hreflang="x-default" href="${h(new URL(route('en', path), origin))}">`}
  ${noindex ? '' : `<meta property="og:type" content="website"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(description)}"><meta property="og:url" content="${h(canonical)}"><meta property="og:locale" content="${locale === 'en' ? 'en_IN' : 'kn_IN'}"><meta property="og:image" content="${h(origin)}/assets/clinic.webp"><script type="application/ld+json">${jsonLd}</script>`}
  <link rel="stylesheet" href="/assets/site.css"><script src="/assets/site.js" defer></script></head><body>
  <a href="#main" class="skip-link">${h(t.skip)}</a>
  <header class="site-header"><div class="shell header-inner">
  <a class="brand" href="${route(locale)}"><span class="brand-mark">${logo}</span><span class="brand-name">${h(t.clinic)}</span></a>
  <nav class="desktop-nav" aria-label="${h(t.menu)}">${navigation}</nav>
  <nav class="language" aria-label="${h(t.language)}">${languages}</nav>
  <span class="header-cta">${book}</span>
  <details class="mobile-nav"><summary aria-label="${h(t.menu)}"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></summary><nav aria-label="${h(t.menu)}">${navigation}${book}</nav></details>
  </div></header>
  <main id="main" tabindex="-1">${body}</main>
  <footer class="site-footer"><div class="shell footer-inner"><div><strong>${h(t.clinic)}</strong><p>${h(t.address)}</p><a href="tel:${h(t.phoneNumber || phone)}">${h(t.phoneDisplay || '+91 99002 50104')}</a></div><nav aria-label="${h(t.footerNote)}">${footerItems.map(([key, slug]) => `<a href="${route(locale, slug)}">${h(t[key])}</a>`).join(' ')}</nav></div></footer>
  </body></html>`;
}

export const intro = (title, description) =>
  `<div class="page-intro"><h1>${h(title)}</h1>${description ? `<p>${h(description)}</p>` : ''}</div>`;
export const panel = (title, description, body = '') =>
  `<div class="shell section">${intro(title, description)}${body}</div>`;

export function appointmentForm(locale, page, t, values, errors, today, services, key, times) {
  const field = (key, type, attributes = '') => `<div><label for="${key}">${h(t[key])}</label>
    <input id="${key}" name="${key}" type="${type}" value="${h(values?.[key])}" ${attributes} required${errors[key] ? ` aria-invalid="true" aria-describedby="${key}-error"` : ''}>
    ${errors[key] ? `<p class="field-error" id="${key}-error">${h(errors[key])}</p>` : ''}</div>`;
  return panel(page.title, page.description, `<form class="stack" method="post" novalidate data-appointment${values ? ' data-server-values' : ''} action="${route(locale, 'book-appointment')}">
  ${Object.keys(errors).length ? `<p class="notice" role="alert" tabindex="-1">${h(t.fieldError)}</p>` : ''}
  <input type="hidden" name="key" value="${h(key)}">
  <label for="service">${h(t.services)}</label><select id="service" name="service"><option value="general">${locale==='en'?'General consultation':'ಸಾಮಾನ್ಯ ಸಮಾಲೋಚನೆ'}</option>${services.map(i=>`<option value="${h(i.slug)}" ${values?.service===i.slug?'selected':''}>${h(i.title)}</option>`).join('')}</select>
  ${field('name', 'text', 'maxlength="100" autocomplete="name"')}
  ${field('phone', 'tel', 'maxlength="24" autocomplete="tel"')}
  ${field('date', 'date', `min="${today}"`)}
  <label for="time">${h(t.time)}</label><select id="time" name="time" required ${errors.time?'aria-invalid="true" aria-describedby="time-error"':''} data-current="${h(values?.time)}" data-empty="${locale==='en'?'Choose an available time':'ಲಭ್ಯವಿರುವ ಸಮಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ'}" data-none="${locale==='en'?'No slots available. Choose another date or call the clinic.':'ಸಮಯ ಲಭ್ಯವಿಲ್ಲ. ಮತ್ತೊಂದು ದಿನವನ್ನು ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಕ್ಲಿನಿಕ್‌ಗೆ ಕರೆ ಮಾಡಿ.'}"><option value="">${locale==='en'?'Select a date to see available times':'ಲಭ್ಯವಿರುವ ಸಮಯಕ್ಕಾಗಿ ದಿನಾಂಕವನ್ನು ಆಯ್ಕೆಮಾಡಿ'}</option>${times.map(time=>`<option ${time===values?.time?'selected':''}>${time}</option>`).join('')}</select>
  ${errors.time?`<p class="field-error" id="time-error">${h(errors.time)}</p>`:''}
  <label for="email">${locale==='en'?'Email (optional)':'ಇಮೇಲ್ (ಐಚ್ಛಿಕ)'}</label><input id="email" type="email" name="email" value="${h(values?.email)}" autocomplete="email" maxlength="254" ${errors.email?'aria-invalid="true" aria-describedby="email-error"':''}>
  ${errors.email?`<p class="field-error" id="email-error">${h(errors.email)}</p>`:''}
  <label class="checkbox"><input type="checkbox" name="consent" value="yes" required${values?.consent === 'yes' ? ' checked' : ''}${errors.consent ? ' aria-invalid="true" aria-describedby="consent-error"' : ''}> ${h(t.consent)}</label>
  ${errors.consent ? `<p class="field-error" id="consent-error">${h(errors.consent)}</p>` : ''}
  <label class="checkbox"><input type="checkbox" name="whatsapp" value="yes" ${values?.whatsapp==='yes'?'checked':''}> ${locale==='en'?'Send me appointment updates on WhatsApp (optional).':'ನನ್ನ ಭೇಟಿಯ ಕುರಿತು ವಾಟ್ಸಾಪ್ ಸಂದೇಶಗಳನ್ನು ಕಳುಹಿಸಿ (ಐಚ್ಛಿಕ).'}</label>
  <button class="button" type="submit">${h(t.submit)}</button></form>`);
}
