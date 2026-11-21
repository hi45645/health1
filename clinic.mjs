import { escape as h } from './views.mjs';

const locales = ['en', 'kn'];
const localizedFields = [
  ['name', 'Clinic name', 100, true],
  ['address', 'Clinic address', 220, true],
  ['location', 'City and state', 100, true],
  ['doctor', 'Doctor’s public name', 100],
  ['credentials', 'Public qualifications and registration', 300],
  ['hours', 'Published opening hours', 250],
  ['fee', 'Published consultation fee', 100],
  ['seoDescription', 'Site description for search engines', 170]
];

const initial = {
  en: {
    name: 'Sumukha Dental Clinic',
    address: 'Behind Municipal Park, NR Extension, Chintamani, Karnataka',
    location: 'Chintamani, Karnataka'
  },
  kn: {
    name: 'ಸುಮುಖ ದಂತ ಚಿಕಿತ್ಸಾಲಯ',
    address: 'ಪುರಸಭೆ ಉದ್ಯಾನವನದ ಹಿಂದೆ, ಎನ್.ಆರ್. ಬಡಾವಣೆ, ಚಿಂತಾಮಣಿ, ಕರ್ನಾಟಕ',
    location: 'ಚಿಂತಾಮಣಿ, ಕರ್ನಾಟಕ'
  },
  phone: '+919900250104',
  whatsapp: '',
  maps: ''
};

function profileRow(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS clinic_profile (
    singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
    profile TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 0
  )`);
  const row = db.prepare('SELECT profile, revision FROM clinic_profile WHERE singleton = 1').get();
  if (row) return row;
  db.prepare('INSERT OR IGNORE INTO clinic_profile (singleton, profile) VALUES (1, ?)').run(JSON.stringify(initial));
  return db.prepare('SELECT profile, revision FROM clinic_profile WHERE singleton = 1').get();
}

export function readClinicProfile(db) {
  const { profile, revision } = profileRow(db);
  return { ...JSON.parse(profile), revision };
}

export function getClinic(db, locale) {
  const profile = readClinicProfile(db);
  const localized = profile[locale];
  const phoneDisplay = /^\+91\d{10}$/.test(profile.phone)
    ? profile.phone.slice(0, 3) + ' ' + profile.phone.slice(3, 8) + ' ' + profile.phone.slice(8)
    : profile.phone;
  return {
    ...localized,
    phone: profile.phone,
    phoneDisplay,
    phoneHref: 'tel:' + profile.phone,
    whatsappHref: profile.whatsapp ? 'https://wa.me/' + profile.whatsapp.slice(1) : '',
    mapsHref: profile.maps || ''
  };
}

function safeMapsLink(value) {
  try {
    const url = new URL(value);
    const googleMaps = ['www.google.com', 'maps.google.com'].includes(url.hostname) &&
      (url.pathname === '/maps' || url.pathname.startsWith('/maps/'));
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port && googleMaps) return url.href;
  } catch {
    // The caller presents a field error.
  }
  return '';
}

const inputValue = (form, key) => {
  const value = typeof form.get === 'function' ? form.get(key) : form[key];
  return typeof value === 'string' ? value.trim() : '';
};

export function saveClinicProfile(db, form) {
  const profile = { en: {}, kn: {} };
  const errors = {};
  for (const [key, label, max, required] of localizedFields) {
    for (const lang of locales) {
      const field = lang + '.' + key;
      const value = inputValue(form, field);
      profile[lang][key] = value;
      if ((required && !value) || value.length > max || /[\p{Cc}]/u.test(value)) {
        errors[field] = `${label} ${required ? 'is required and' : ''} must be no longer than ${max} characters. Use a single line.`;
      }
    }
    if (Boolean(profile.en[key]) !== Boolean(profile.kn[key])) {
      const missing = profile.en[key] ? 'kn' : 'en';
      errors[missing + '.' + key] = 'Supply this field in both languages to publish it.';
    }
  }
  for (const [key, label] of [['phone', 'Clinic phone'], ['whatsapp', 'WhatsApp number']]) {
    const value = inputValue(form, key).replace(/[ ()-]/g, '');
    profile[key] = value;
    if ((value || key === 'phone') && !/^\+[1-9]\d{7,14}$/.test(value)) {
      errors[key] = label + ' must include + and the international country code.';
    }
  }
  const maps = inputValue(form, 'maps');
  profile.maps = maps;
  if (maps) {
    const link = maps.length <= 1200 && safeMapsLink(maps);
    if (link) profile.maps = link;
    else errors.maps = 'Use the full secure Google Maps URL, with a /maps path.';
  }
  const revision = inputValue(form, 'revision');
  const validRevision = /^\d+$/.test(revision) && Number.isSafeInteger(Number(revision));
  profile.revision = validRevision ? Number(revision) : -1;
  if (inputValue(form, 'verified') !== 'yes') {
    errors.verified = 'Confirm that you verified all public details before saving.';
  }
  if (Object.keys(errors).length) return { profile, errors, status: 422 };
  profileRow(db);
  const { revision: expected, ...stored } = profile;
  const result = db.prepare('UPDATE clinic_profile SET profile = ?, revision = revision + 1 WHERE singleton = 1 AND revision = ?')
    .run(JSON.stringify(stored), expected);
  if (!result.changes) {
    return { profile: readClinicProfile(db), errors: { revision: 'The clinic profile changed. Review the current values before saving.' }, status: 409 };
  }
  return { profile: { ...stored, revision: expected + 1 }, errors, status: 200 };
}

export function renderClinicEditor(profile, { errors = {}, action = '/admin/clinic', csrfInput = '' } = {}) {
  const field = (name, label, value, max, required = false, lang = 'en', type = 'text') => {
    const error = errors[name];
    return `<label>${h(label)}<input id="${h(name)}" name="${h(name)}" lang="${lang}" type="${type}" value="${h(value)}" maxlength="${max}"${required ? ' required' : ''}${error ? ' aria-invalid="true" aria-describedby="' + h(name) + '-error"' : ''}></label>
      ${error ? `<p class="field-error" id="${h(name)}-error">${h(error)}</p>` : ''}`;
  };
  const languageFields = locales.map(lang => `<fieldset class="stack"><legend>${lang === 'en' ? 'English' : '<span lang="kn">ಕನ್ನಡ</span>'}</legend>${
    localizedFields.map(([key, label, max, required]) => field(lang + '.' + key, label, profile[lang][key], max, required, lang)).join('')
  }</fieldset>`).join('');
  return `<form class="stack clinic-editor" method="post" action="${h(action)}">${csrfInput}
    <input type="hidden" name="revision" value="${h(profile.revision)}">
    ${Object.keys(errors).length ? `<p class="notice" role="alert">${h(errors.revision || 'Review the highlighted fields.')}</p>` : ''}
    ${languageFields}
    <fieldset class="stack"><legend>Contact channels</legend>
    ${field('phone', 'Clinic phone number', profile.phone, 30, true, 'en', 'tel')}
    ${field('whatsapp', 'Verified clinic WhatsApp number', profile.whatsapp, 30, false, 'en', 'tel')}
    ${field('maps', 'Verified Google Maps URL', profile.maps, 1200, false, 'en', 'url')}
    </fieldset>
    <label><input name="verified" type="checkbox" value="yes" required${errors.verified ? ' aria-invalid="true" aria-describedby="verified-error"' : ''}> I verified these clinic details and both language versions. Publish them on the website.</label>
    ${errors.verified ? `<p class="field-error" id="verified-error">${h(errors.verified)}</p>` : ''}
    <button type="submit">Publish clinic profile</button>
  </form>`;
}
