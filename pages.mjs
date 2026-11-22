import { arrowOut } from './views.mjs';
import { serviceArt } from './service-art.mjs';
import { escape as h, button, route } from './views.mjs';
import { renderServiceDetails } from './catalogue.mjs';

const words = {
  en: {
    address: 'Clinic address', phone: 'Phone', hours: 'Opening hours', directions: 'Get directions',
    whatsapp: 'WhatsApp', learnMore: 'Learn more', search: 'Search treatments',
    searchEmpty: 'No treatments match your search.',
    heroAlt: 'An ivory molar teaching model beside a dental mirror',
    heroCaption: 'Illustration using a dental teaching model',
    welcome: 'About the clinic', aboutLink: 'Get to know the clinic', doctorLink: 'Meet your dentist',
    generalDoctor: 'Speak with our dental team',
    doctorContact: 'Call the clinic to ask which dentist is available for your visit.',
    qualifications: 'Qualifications', registration: 'Registration', fee: 'Consultation fee',
    profileServices: 'Treatments and appointments', serviceList: 'Browse all treatments',
    visitTitle: 'Planning your visit', clinicFacilities: 'Clinic facilities',
    beforeVisit: 'Call us to confirm opening hours and ask about facilities or access before your visit.',
    benefitsTitle: 'Your visit, made simpler',
    benefits: [
      ['pin', 'Find us in Chintamani', 'The clinic is behind Municipal Park in NR Extension.'],
      ['calendar', 'Request a time online', 'Check available visit times and keep your reference number to follow up.'],
      ['language', 'Use your preferred language', 'Read the website and request a visit in English or Kannada.']
    ],
    noTreatmentsTitle: 'Find the right next step',
    noTreatments: 'Call us to check whether the clinic offers the treatment you’re looking for, or request a consultation to discuss your options.',
    visitOptions: [
      ['tooth', 'Ask about a treatment', 'Tell the clinic what you need help with and ask about the available options.', 'call'],
      ['calendar', 'Request a consultation', 'Choose an available time and send an appointment request.', 'book'],
      ['pin', 'Plan your visit', 'Find the clinic address and check opening hours before setting out.', 'contact']
    ],
    process: 'What happens when you book',
    steps: [
      ['Choose an available time', 'Select a date and time shown in the appointment calendar.'],
      ['Send your request', 'Share your contact details and save the reference number.'],
      ['Wait for confirmation', 'The clinic will confirm the appointment. You can check the status online.']
    ],
    bookTitle: 'Ready to plan your visit?',
    bookBody: 'Request a time online or speak with the clinic to ask about availability.',
    galleryIntro: 'See published photographs of the clinic and care team.',
    galleryEmpty: 'Call the clinic if you’d like to ask about the space, getting there or accessibility.',
    galleryLink: 'View the gallery', contactLink: 'Contact and directions',
    contactIntro: 'Check opening hours, find the clinic and choose how to get in touch.',
    doctorIntro: 'Find details about your dentist and plan your appointment.',
    consultQuestions: 'Questions about your visit',
    faqLink: 'See all frequently asked questions',
    questions: [
      ['How do I arrange an appointment?', 'Choose an available time online or call the clinic. Your appointment is confirmed when the clinic confirms it.'],
      ['How can I ask about a specific treatment?', 'Call the clinic to ask whether a treatment is available and whether you should book a consultation.']
    ],
    backTreatments: 'All treatments',
    serviceAction: 'Request this treatment', nextVisit: 'Book a dental visit',
    nextVisitBody: 'Choose a time to talk with the clinic about this treatment.'
  },
  kn: {
    address: 'ಚಿಕಿತ್ಸಾಲಯದ ವಿಳಾಸ', phone: 'ದೂರವಾಣಿ', hours: 'ತೆರೆದಿರುವ ಸಮಯ', directions: 'ದಾರಿ ನೋಡಿ',
    whatsapp: 'ವಾಟ್ಸಾಪ್', learnMore: 'ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ', search: 'ಚಿಕಿತ್ಸೆಗಳನ್ನು ಹುಡುಕಿ',
    searchEmpty: 'ನೀವು ಹುಡುಕಿದ ಚಿಕಿತ್ಸೆ ಸಿಗಲಿಲ್ಲ.',
    heroAlt: 'ದಂತ ಕನ್ನಡಿಯ ಪಕ್ಕದಲ್ಲಿರುವ ಬಿಳಿ ದವಡೆಹಲ್ಲಿನ ಮಾದರಿ',
    heroCaption: 'ದಂತ ಶಿಕ್ಷಣ ಮಾದರಿಯನ್ನು ಬಳಸಿದ ಚಿತ್ರ',
    welcome: 'ಚಿಕಿತ್ಸಾಲಯದ ಬಗ್ಗೆ', aboutLink: 'ಚಿಕಿತ್ಸಾಲಯದ ಬಗ್ಗೆ ತಿಳಿಯಿರಿ', doctorLink: 'ನಮ್ಮ ದಂತವೈದ್ಯರ ಬಗ್ಗೆ ತಿಳಿಯಿರಿ',
    generalDoctor: 'ನಮ್ಮ ದಂತ ಚಿಕಿತ್ಸಾ ತಂಡದೊಂದಿಗೆ ಮಾತನಾಡಿ',
    doctorContact: 'ನಿಮ್ಮ ಭೇಟಿಗೆ ಯಾವ ವೈದ್ಯರು ಲಭ್ಯರಿದ್ದಾರೆ ಎಂದು ತಿಳಿಯಲು ಚಿಕಿತ್ಸಾಲಯಕ್ಕೆ ಕರೆ ಮಾಡಿ.',
    qualifications: 'ವಿದ್ಯಾರ್ಹತೆ', registration: 'ನೋಂದಣಿ ವಿವರಗಳು', fee: 'ಸಮಾಲೋಚನೆಯ ಶುಲ್ಕ',
    profileServices: 'ಚಿಕಿತ್ಸೆಗಳು ಮತ್ತು ಭೇಟಿ', serviceList: 'ಎಲ್ಲ ಚಿಕಿತ್ಸೆಗಳನ್ನೂ ನೋಡಿ',
    visitTitle: 'ನಿಮ್ಮ ಭೇಟಿಗೆ ಸಿದ್ಧತೆ', clinicFacilities: 'ಚಿಕಿತ್ಸಾಲಯದ ಸೌಲಭ್ಯಗಳು',
    beforeVisit: 'ಭೇಟಿಗೆ ಬರುವ ಮುನ್ನ ಕೆಲಸದ ಸಮಯವನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಲು ಅಥವಾ ಸೌಲಭ್ಯಗಳ ಬಗ್ಗೆ ವಿಚಾರಿಸಲು ಕರೆ ಮಾಡಿ.',
    benefitsTitle: 'ನಿಮ್ಮ ಭೇಟಿಗೆ ನೆರವು',
    benefits: [
      ['pin', 'ಚಿಂತಾಮಣಿಯಲ್ಲಿ ನಮ್ಮನ್ನು ಹುಡುಕಿ', 'ಚಿಕಿತ್ಸಾಲಯವು ಎನ್‌ಆರ್ ಬಡಾವಣೆಯ ಪುರಸಭೆ ಉದ್ಯಾನವನದ ಹಿಂದಿದೆ.'],
      ['calendar', 'ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಸಮಯ ಕೋರಿ', 'ಭೇಟಿಗೆ ಲಭ್ಯವಿರುವ ಸಮಯವನ್ನು ನೋಡಿ. ನಂತರ ಸ್ಥಿತಿ ತಿಳಿಯಲು ಉಲ್ಲೇಖ ಸಂಖ್ಯೆಯನ್ನು ಉಳಿಸಿಕೊಳ್ಳಿ.'],
      ['language', 'ನಿಮಗೆ ಅನುಕೂಲವಾದ ಭಾಷೆ ಬಳಸಿ', 'ವೆಬ್‌ಸೈಟ್ ಓದಲು ಮತ್ತು ಭೇಟಿಗಾಗಿ ಸಮಯ ಕೋರಲು ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್ ಆಯ್ಕೆಮಾಡಿ.']
    ],
    noTreatmentsTitle: 'ಮುಂದಿನ ಹೆಜ್ಜೆ ಆಯ್ಕೆಮಾಡಿ',
    noTreatments: 'ನೀವು ಹುಡುಕುತ್ತಿರುವ ಚಿಕಿತ್ಸೆ ಲಭ್ಯವಿದೆಯೇ ಎಂದು ತಿಳಿಯಲು ಕರೆ ಮಾಡಿ ಅಥವಾ ಆಯ್ಕೆಗಳನ್ನು ಚರ್ಚಿಸಲು ಸಮಾಲೋಚನೆಗಾಗಿ ಸಮಯ ಕೋರಿ.',
    visitOptions: [
      ['tooth', 'ಚಿಕಿತ್ಸೆಯ ಬಗ್ಗೆ ವಿಚಾರಿಸಿ', 'ನಿಮಗೆ ಬೇಕಿರುವ ಸಹಾಯವನ್ನು ತಿಳಿಸಿ ಮತ್ತು ಲಭ್ಯವಿರುವ ಆಯ್ಕೆಗಳ ಬಗ್ಗೆ ವಿಚಾರಿಸಿ.', 'call'],
      ['calendar', 'ಸಮಾಲೋಚನೆಗಾಗಿ ಸಮಯ ಕೋರಿ', 'ಲಭ್ಯವಿರುವ ಸಮಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ, ನಂತರ ಕೋರಿಕೆ ಕಳುಹಿಸಿ.', 'book'],
      ['pin', 'ನಿಮ್ಮ ಭೇಟಿಗೆ ಸಿದ್ಧತೆ ಮಾಡಿಕೊಳ್ಳಿ', 'ಚಿಕಿತ್ಸಾಲಯದ ವಿಳಾಸವನ್ನು ನೋಡಿ. ಹೊರಡುವ ಮುನ್ನ ತೆರೆದಿರುವ ಸಮಯವನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.', 'contact']
    ],
    process: 'ಭೇಟಿಗಾಗಿ ಸಮಯ ಕೋರಿದ ನಂತರ',
    steps: [
      ['ಲಭ್ಯವಿರುವ ಸಮಯ ಆಯ್ಕೆಮಾಡಿ', 'ಭೇಟಿಯ ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ತೋರಿಸಿರುವ ದಿನಾಂಕ ಮತ್ತು ಸಮಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ.'],
      ['ನಿಮ್ಮ ಕೋರಿಕೆ ಕಳುಹಿಸಿ', 'ಸಂಪರ್ಕದ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ ಮತ್ತು ಉಲ್ಲೇಖ ಸಂಖ್ಯೆಯನ್ನು ಉಳಿಸಿಕೊಳ್ಳಿ.'],
      ['ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕಾಯಿರಿ', 'ಚಿಕಿತ್ಸಾಲಯವು ಭೇಟಿಯನ್ನು ದೃಢೀಕರಿಸುತ್ತದೆ. ಕೋರಿಕೆಯ ಸ್ಥಿತಿಯನ್ನು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಬಹುದು.']
    ],
    bookTitle: 'ಭೇಟಿಗಾಗಿ ಸಮಯ ಬೇಕೇ?',
    bookBody: 'ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಸಮಯ ಕೋರಿ ಅಥವಾ ಸಮಯ ಲಭ್ಯವಿದೆಯೇ ಎಂದು ಚಿಕಿತ್ಸಾಲಯದಲ್ಲಿ ವಿಚಾರಿಸಿ.',
    galleryIntro: 'ಚಿಕಿತ್ಸಾಲಯ ಮತ್ತು ದಂತ ಚಿಕಿತ್ಸಾ ತಂಡದ ಪ್ರಕಟಿತ ಚಿತ್ರಗಳನ್ನು ನೋಡಿ.',
    galleryEmpty: 'ಚಿಕಿತ್ಸಾಲಯ, ಅಲ್ಲಿಗೆ ಬರುವ ದಾರಿ ಅಥವಾ ಪ್ರವೇಶ ಸೌಲಭ್ಯಗಳ ಬಗ್ಗೆ ತಿಳಿಯಲು ನಮಗೆ ಕರೆ ಮಾಡಿ.',
    galleryLink: 'ಚಿತ್ರಸಂಗ್ರಹವನ್ನು ನೋಡಿ', contactLink: 'ಸಂಪರ್ಕ ಮತ್ತು ದಾರಿ',
    doctorIntro: 'ನಿಮ್ಮ ದಂತವೈದ್ಯರ ವಿವರಗಳನ್ನು ತಿಳಿದು ಭೇಟಿಗೆ ಸಿದ್ಧತೆ ಮಾಡಿಕೊಳ್ಳಿ.',
    consultQuestions: 'ಭೇಟಿಯ ಬಗ್ಗೆ ಪ್ರಶ್ನೆಗಳು',
    faqLink: 'ಎಲ್ಲ ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳನ್ನು ನೋಡಿ',
    questions: [
      ['ಭೇಟಿಗಾಗಿ ಸಮಯವನ್ನು ಹೇಗೆ ಕೋರಬಹುದು?', 'ಲಭ್ಯವಿರುವ ಸಮಯವನ್ನು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಚಿಕಿತ್ಸಾಲಯಕ್ಕೆ ಕರೆ ಮಾಡಿ. ಚಿಕಿತ್ಸಾಲಯವು ಖಚಿತಪಡಿಸಿದ ನಂತರವಷ್ಟೇ ನಿಮ್ಮ ಭೇಟಿಯ ಸಮಯ ನಿಗದಿಯಾಗುತ್ತದೆ.'],
      ['ನಿರ್ದಿಷ್ಟ ಚಿಕಿತ್ಸೆಯ ಬಗ್ಗೆ ಹೇಗೆ ವಿಚಾರಿಸಬಹುದು?', 'ಚಿಕಿತ್ಸೆ ಲಭ್ಯವಿದೆಯೇ ಮತ್ತು ಸಮಾಲೋಚನೆಗಾಗಿ ಸಮಯ ಬೇಕೇ ಎಂದು ವಿಚಾರಿಸಲು ಚಿಕಿತ್ಸಾಲಯಕ್ಕೆ ಕರೆ ಮಾಡಿ.']
    ],
    backTreatments: 'ಎಲ್ಲ ಚಿಕಿತ್ಸೆಗಳು',
    serviceAction: 'ಈ ಚಿಕಿತ್ಸೆಗಾಗಿ ಸಮಯ ಕೋರಿ', nextVisit: 'ದಂತವೈದ್ಯರ ಭೇಟಿಗಾಗಿ ಸಮಯ ಕೋರಿ',
    nextVisitBody: 'ಈ ಚಿಕಿತ್ಸೆಯ ಬಗ್ಗೆ ಚಿಕಿತ್ಸಾಲಯದೊಂದಿಗೆ ಮಾತನಾಡಲು ಸಮಯ ಆಯ್ಕೆಮಾಡಿ.'
  }
};

const glyphs = {
  tooth: '<path d="M12 5c-2-2-6-3-8-.4-2 2.3-.2 6.7.8 8.8.8 1.7 1.2 5.9 3 6.1 1.2.1 1.7-2.3 2.3-4.4.6-2.3 3.2-2.3 3.8 0 .6 2.1 1.1 4.5 2.3 4.4 1.8-.2 2.2-4.4 3-6.1 1-2.1 2.8-6.5.8-8.8-2-2.6-6-1.6-8 .4Z"/><path d="M12 5c1 .8 2.2 1.4 3.5 1.5"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.4"/>',
  phone: '<path d="M6 3h3l1.5 4-2 2a14 14 0 0 0 6.5 6.5l2-2L21 15v3c0 1.7-1.3 3-3 3C10 21 3 14 3 6c0-1.7 1.3-3 3-3Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18m-12 6 2 2 4-4"/>',
  language: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  profile: '<circle cx="12" cy="8" r="3.5"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/>',
  photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m3 17 5-4 3 2 4-5 6 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>'
};
const icon = (name, size = 24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name]}</svg>`;
const marker = name => `<span class="clinic-marker">${icon(name)}</span>`;
const link = (href, text, label) => `<a class="clinic-link" href="${h(href)}"${label ? ` aria-label="${h(label)}"` : ''}>${h(text)} <span aria-hidden="true">${arrowOut}</span></a>`;
const heading = (title, description) => `<h2>${h(title)}</h2>${description ? `<p class="clinic-intro">${h(description)}</p>` : ''}`;

function photoMarkup(photo, loading = 'lazy') {
  return `<img src="${h(photo.url)}" alt="${h(photo.alt)}" width="${photo.width}" height="${photo.height}" loading="${loading}" decoding="async"${loading === 'eager' ? ' fetchpriority="high"' : ''}>`;
}

function standardHero(title, description, symbol) {
  return `<section class="clinic-page-hero"><div class="shell clinic-page-heading">
    <div><h1>${h(title)}</h1><p>${h(description)}</p></div>
    <div class="clinic-page-emblem" aria-hidden="true">${icon(symbol, 94)}</div>
  </div></section>`;
}

function contactItems({ clinic, t, w }) {
  return `<dl class="clinic-contact-list">
    <div><dt>${marker('pin')}${h(w.address)}</dt><dd>${h(clinic.address)}</dd></div>
    <div><dt>${marker('phone')}${h(w.phone)}</dt><dd><a href="${h(clinic.phoneHref)}"><bdi>${h(clinic.phoneDisplay)}</bdi></a></dd></div>
    <div><dt>${marker('clock')}${h(w.hours)}</dt><dd>${h(clinic.hours || t.hours)}</dd></div>
  </dl>`;
}

function contactActions({ clinic, t, w }) {
  return `<div class="actions">
    ${button(clinic.phoneHref, t.call)}
    ${clinic.mapsHref ? button(clinic.mapsHref, w.directions, true) : ''}
    ${clinic.whatsappHref ? button(clinic.whatsappHref, w.whatsapp, true) : ''}
  </div>`;
}

function bookingBand({ book, t, w }, treatment) {
  return `<section class="shell clinic-section"><div class="clinic-book-band">
    <div>${heading(treatment ? w.nextVisit : w.bookTitle, treatment ? w.nextVisitBody : w.bookBody)}</div>
    ${button(treatment ? book + '?service=' + encodeURIComponent(treatment.slug) : book, treatment ? w.serviceAction : t.book)}
  </div></section>`;
}

function catalogueCards({ locale, book, w }, services, tag = 'h3') {
  return `<div class="clinic-cards" data-treatment-grid>${services.map(service => {
    const detail = route(locale, 'services/' + service.slug);
    const illustration = service.image
      ? photoMarkup({ url: service.image, alt: service.imageAlt, width: service.imageWidth, height: service.imageHeight })
      : `<div class="treatment-motif" aria-hidden="true">${serviceArt(service.slug)}<span></span></div>`;
    return `<article class="treatment-card" data-treatment-card>
      <div class="treatment-card-art">${illustration}</div>
      <div class="treatment-card-copy"><${tag}><a href="${detail}">${h(service.title)}</a></${tag}><p>${h(service.description)}</p>
      <div class="treatment-card-actions">${link(detail, w.learnMore, w.learnMore + ' · ' + service.title)}
      ${button(book + '?service=' + encodeURIComponent(service.slug), w.serviceAction, true)}</div></div>
    </article>`;
  }).join('')}</div>`;
}

function informationCards(rows, links = {}) {
  return `<div class="clinic-cards">${rows.map(([symbol, title, description, action]) =>
    `<article class="clinic-information-card">${marker(symbol)}<h3>${h(title)}</h3><p>${h(description)}</p>
    ${links[action] ? link(...links[action]) : ''}</article>`).join('')}</div>`;
}

function clinicBenefits({ w, clinic }) {
  const [location, ...other] = w.benefits;
  return informationCards([[location[0], location[1], clinic.address], ...other]);
}

function treatmentFallback(context) {
  const { w, t, clinic, book, locale } = context;
  return `<div class="clinic-fallback">${heading(w.noTreatmentsTitle, w.noTreatments)}
    ${informationCards(w.visitOptions, {
      call: [clinic.phoneHref, t.call], book: [book, t.book], contact: [route(locale, 'contact'), w.contactLink]
    })}</div>`;
}

function visitQuestions({ w, locale }, items = []) {
  const questions = items.length ? items.map(item => [item.title, item.description]) : w.questions;
  return `<div class="clinic-qa"><div>${heading(w.consultQuestions)}${link(route(locale, 'faq'), w.faqLink)}</div>
    <div>${questions.map(([question, answer]) => `<details class="faq-item"><summary>${h(question)}</summary><p>${h(answer)}</p></details>`).join('')}</div></div>`;
}

function doctorContent({ w, t, clinic, locale }, full = false) {
  const portrait = clinic.doctorPhoto ? photoMarkup(clinic.doctorPhoto, full ? 'eager' : 'lazy') : `<span class="clinic-profile-icon">${icon('profile', 88)}</span>`;
  const details = [['credentials', w.qualifications], ['registration', w.registration], ['fee', w.fee]]
    .filter(([key]) => clinic.doctor && clinic[key])
    .map(([key, label]) => `<div><dt>${h(label)}</dt><dd>${h(clinic[key])}</dd></div>`).join('');
  const name = clinic.doctor || w.generalDoctor;
  const doctorDescription = clinic.doctor && clinic.biography ? clinic.biography : w.doctorContact;
  return `<div class="clinic-profile-card">
    <div class="clinic-profile-photo">${portrait}</div>
    <div class="clinic-profile-copy">${full ? `<h2>${h(name)}</h2>` : `<h2>${h(t.doctor)}</h2>${clinic.doctor ? `<h3>${h(name)}</h3>` : ''}`}
    <p class="clinic-multiline">${h(doctorDescription)}</p>
    ${details ? `<dl>${details}</dl>` : ''}
    ${full ? button(clinic.phoneHref, t.call, true) : link(route(locale, 'doctor'), w.doctorLink)}</div>
  </div>`;
}

function galleryContent(context, gallery) {
  const { w, clinic, t } = context;
  return gallery || `<div class="clinic-gallery-empty">${marker('photo')}<div><p>${h(w.galleryEmpty)}</p>${link(clinic.phoneHref, t.call)}</div></div>`;
}

function home(context, { page, services, gallery, faq }) {
  const { locale, clinic, t, w, book } = context;
  const heroImage = clinic.heroPhoto ? photoMarkup(clinic.heroPhoto, 'eager')
    : `<img src="/assets/dental-model.webp" srcset="/assets/dental-model-small.webp 600w, /assets/dental-model.webp 1200w" sizes="(max-width: 760px) 100vw, (max-width: 1300px) 50vw, 640px" fetchpriority="high" alt="${h(w.heroAlt)}" width="1200" height="900">`;
  return `<section class="shell clinic-home-hero">
    <div class="clinic-home-heading">
      <header><p class="clinic-location">${icon('pin', 18)} ${h(clinic.location)}</p><h1>${h(page.home.title)}</h1><p class="clinic-hero-lead">${h(page.home.description)}</p></header>
      <div class="actions">${button(book, t.book)}${button(clinic.phoneHref, t.call, true)}${clinic.whatsappHref ? button(clinic.whatsappHref, w.whatsapp, true) : ''}</div>
    </div>
    <figure class="clinic-home-image">${heroImage}${clinic.heroPhoto ? '' : `<figcaption>${h(w.heroCaption)}</figcaption>`}</figure>
  </section>
  <div class="shell clinic-home-info">${contactItems(context)}</div>
  <section class="shell clinic-section clinic-about-intro">
    <div>${heading(w.welcome, page.about.description)}${link(route(locale, 'about'), w.aboutLink)}</div>
    <div class="clinic-facility-card">${marker('pin')}<h3>${h(clinic.facilities ? w.clinicFacilities : w.visitTitle)}</h3>
      <p class="clinic-multiline">${h(clinic.facilities || w.beforeVisit)}</p>${link(route(locale, 'contact'), w.contactLink)}</div>
  </section>
  <section class="clinic-band"><div class="shell clinic-section">
    ${services.length ? `<div class="clinic-section-heading"><div>${heading(page.treatments.title, page.treatments.description)}</div>${link(route(locale, 'services'), w.serviceList)}</div>${catalogueCards(context, services.slice(0, 3))}` : treatmentFallback(context)}
  </div></section>
  <section class="shell clinic-section">${doctorContent(context)}</section>
  <section class="clinic-band"><div class="shell clinic-section">${heading(w.benefitsTitle)}${clinicBenefits(context)}</div></section>
  <section class="shell clinic-section">
    <div class="clinic-section-heading"><div>${heading(t.gallery)}</div>${link(route(locale, 'gallery'), w.galleryLink)}</div>
    ${galleryContent(context, gallery)}
  </section>
  <section class="clinic-band"><div class="shell clinic-section">${heading(w.process)}
    <ol class="clinic-steps">${w.steps.map(([title, description]) => `<li><div><h3>${h(title)}</h3><p>${h(description)}</p></div></li>`).join('')}</ol>
  </div></section>
  <section class="shell clinic-section">${visitQuestions(context, faq.slice(0, 3))}</section>
  ${bookingBand(context)}
  <section class="clinic-band"><div class="shell clinic-section clinic-contact-section">
    <div>${heading(t.contactLabel, w.contactIntro)}${contactActions(context)}</div>${contactItems(context)}
  </div></section>`;
}

function treatments(context, page, services, faq) {
  const { w } = context;
  return `${standardHero(page.title, page.description, 'tooth')}
    <section class="shell clinic-section">
    ${services.length ? `<div class="clinic-search" hidden data-treatment-search-shell><label for="treatment-search">${h(w.search)}</label><div>${icon('search', 20)}<input id="treatment-search" type="search" placeholder="${h(w.search)}" data-treatment-search></div></div>
      ${catalogueCards(context, services, 'h2')}<p class="notice" role="status" hidden data-search-empty>${h(w.searchEmpty)}</p>` : treatmentFallback(context)}
    </section>
    <section class="clinic-band"><div class="shell clinic-section">${visitQuestions(context, faq.slice(0, 3))}</div></section>
    ${bookingBand(context)}`;
}

function serviceDetail(context, treatment) {
  const { locale, clinic, t, w, book } = context;
  return `<section class="clinic-page-hero"><div class="shell clinic-detail-heading">
    ${link(route(locale, 'services'), w.backTreatments)}<h1>${h(treatment.title)}</h1>
    <p>${h(treatment.description)}</p><div class="actions">
    ${button(book + '?service=' + encodeURIComponent(treatment.slug), w.serviceAction)}${button(clinic.phoneHref, t.call, true)}</div>
  </div></section>
  <section class="shell clinic-section"><div class="clinic-detail-content">${renderServiceDetails(locale, treatment) || visitQuestions(context)}</div></section>
  ${bookingBand(context, treatment)}`;
}

export function renderClinicPage({ locale, path, page, services, clinic, t, gallery = '', treatment, faq = [] }) {
  const w = words[locale];
  const context = { w, locale, clinic, t, book: route(locale, 'book-appointment') };
  if (path === '') return { ...page.home, body: home(context, { page, services, gallery, faq }) };
  if (path === 'services') return { ...page.treatments, body: treatments(context, page.treatments, services, faq) };
  if (treatment) return { ...treatment, body: serviceDetail(context, treatment) };
  if (path === 'about') return { ...page.about, body: `${standardHero(page.about.title, page.about.description, 'pin')}
    <section class="shell clinic-section clinic-about-intro"><div>${heading(w.visitTitle, w.beforeVisit)}${contactActions(context)}</div>
    <div class="clinic-facility-card">${marker('pin')}<h3>${h(clinic.facilities ? w.clinicFacilities : w.address)}</h3><p class="clinic-multiline">${h(clinic.facilities || clinic.address)}</p>
    ${link(route(locale, 'contact'), w.contactLink)}</div></section>
    <section class="clinic-band"><div class="shell clinic-section">${heading(w.benefitsTitle)}${clinicBenefits(context)}</div></section>
    <section class="shell clinic-section"><div class="clinic-section-heading">${heading(t.gallery)}${link(route(locale, 'gallery'), w.galleryLink)}</div>${galleryContent(context, gallery)}</section>
    ${bookingBand(context)}` };
  if (path === 'doctor') return { title: t.doctor, description: clinic.doctor && clinic.credentials ? clinic.doctor + ' · ' + clinic.credentials : w.doctorIntro, body: `
    ${standardHero(t.doctor, w.doctorIntro, 'profile')}
    <section class="shell clinic-section">${doctorContent(context, true)}</section>
    <section class="clinic-band"><div class="shell clinic-section">
    ${services.length ? `${heading(w.profileServices)}${catalogueCards(context, services.slice(0, 3))}${link(route(locale, 'services'), w.serviceList)}` : treatmentFallback(context)}
    </div></section>${bookingBand(context)}` };
  if (path === 'gallery') return { title: t.gallery, description: gallery ? w.galleryIntro : w.galleryEmpty, body: `
    ${standardHero(t.gallery, gallery ? w.galleryIntro : w.galleryEmpty, 'photo')}
    <section class="shell clinic-section">${gallery ? gallery : contactItems(context)}</section>${bookingBand(context)}` };
  if (path === 'contact') return { ...page.contact, body: `${standardHero(page.contact.title, w.contactIntro, 'pin')}
    <section class="shell clinic-section clinic-contact-section">
      <div class="clinic-contact-main">${heading(t.contactLabel)}${contactItems(context)}${contactActions(context)}</div>
      <aside class="clinic-location-card">${marker('pin')}<h2>${h(clinic.location)}</h2><p>${h(clinic.address)}</p>
      ${clinic.mapsHref ? button(clinic.mapsHref, w.directions, true) : link(clinic.phoneHref, t.call)}</aside>
    </section><section class="clinic-band"><div class="shell clinic-section">${visitQuestions(context)}</div></section>${bookingBand(context)}` };
  return null;
}
