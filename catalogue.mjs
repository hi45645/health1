import { escape as h } from './views.mjs';

const supportedLocales = ['en', 'kn'];
const defaultSlugs = ['consultation', 'cleaning', 'fillings', 'root-canal', 'crowns', 'extraction'];
const unverifiedServices = [
  ['braces', 'Dental braces', 'ಹಲ್ಲು ಸರಿಪಡಿಸುವ ಕಟ್ಟುಗಳು'],
  ['bridges', 'Dental bridges', 'ಹಲ್ಲಿನ ಸೇತುವೆ'],
  ['implants', 'Dental implants', 'ದಂತ ಇಂಪ್ಲಾಂಟ್‌ಗಳು'],
  ['childrens-dentistry', "Children's dentistry", 'ಮಕ್ಕಳ ದಂತ ಚಿಕಿತ್ಸೆ'],
  ['laser-dentistry', 'Laser dentistry', 'ಲೇಸರ್ ದಂತ ಚಿಕಿತ್ಸೆ'],
  ['dental-xrays', 'Dental X-rays', 'ಹಲ್ಲಿನ ಎಕ್ಸ್‌ರೇ'],
  ['gum-treatment', 'Gum treatment', 'ಒಸಡುಗಳ ಚಿಕಿತ್ಸೆ']
];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const galleryPath = id => '/media/gallery/' + id + '.webp';
const adminPath = '/admin/services';
const textFields = [
  ['title', 'Title', 160],
  ['description', 'Description', 1500],
  ['symptoms', 'Symptoms and indications', 3000],
  ['procedure', 'Procedure overview', 3000],
  ['benefits', 'Benefits and limitations', 3000],
  ['risks', 'Risks', 3000],
  ['aftercare', 'Recovery and aftercare', 3000],
  ['fee', 'Verified fee', 160],
  ['imageAlt', 'Image alt text', 160],
  ['seoTitle', 'SEO title', 160],
  ['seoDescription', 'SEO description', 320],
  ['faqQuestion', 'Common question', 160],
  ['faqAnswer', 'Common answer', 1500],
  ['secondFaqQuestion', 'Second common question', 160],
  ['secondFaqAnswer', 'Second common answer', 1500],
  ['thirdFaqQuestion', 'Third common question', 160],
  ['thirdFaqAnswer', 'Third common answer', 1500]
];
const faqFields = [
  ['faqQuestion', 'faqAnswer'],
  ['secondFaqQuestion', 'secondFaqAnswer'],
  ['thirdFaqQuestion', 'thirdFaqAnswer']
];

const detailsLabels = {
  en: {
    symptoms: 'Symptoms and indications', procedure: 'Procedure overview',
    benefits: 'Benefits and limitations', risks: 'Risks', aftercare: 'Recovery and aftercare',
    fee: 'Fee', faq: 'Common questions'
  },
  kn: {
    symptoms: 'ಲಕ್ಷಣಗಳು ಮತ್ತು ಚಿಕಿತ್ಸೆಯ ಅಗತ್ಯ', procedure: 'ಚಿಕಿತ್ಸೆಯ ವಿಧಾನ',
    benefits: 'ಪ್ರಯೋಜನಗಳು ಮತ್ತು ಮಿತಿಗಳು', risks: 'ಅಪಾಯಗಳು', aftercare: 'ಚೇತರಿಕೆ ಮತ್ತು ನಂತರದ ಆರೈಕೆ',
    fee: 'ಶುಲ್ಕ', faq: 'ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು'
  }
};

const blankTranslation = () => Object.fromEntries(textFields.map(([key]) => [key, '']));
const locationFor = (slug, locale) => adminPath + '?slug=' + encodeURIComponent(slug) + '&locale=' + locale;
const done = location => ({ status: 303, location });
const invalid = (message, status = 422) => ({ status, message });

function readTranslation(data, locale) {
  const draft = Object.fromEntries(textFields.map(([key]) => [key, String(data[key] ?? '').trim()]));
  if (!draft.title || !draft.description || textFields.some(([key, , max]) => draft[key].length > max)) return null;
  if (faqFields.some(([question, answer]) => Boolean(draft[question]) !== Boolean(draft[answer]))) return null;
  if (locale === 'kn' && ![draft.title, draft.description].every(value => /\p{Script=Kannada}/u.test(value))) return null;
  return draft;
}

function makePublic(row, photo) {
  return { ...JSON.parse(row.published), slug: row.slug, image: photo ? row.image : '', imageWidth: photo?.width, imageHeight: photo?.height };
}

export function createCatalogue(db, seed, slugs = defaultSlugs) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clinic_services (
      id INTEGER PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      display_order INTEGER NOT NULL DEFAULT 0 CHECK(display_order BETWEEN 0 AND 10000),
      image TEXT NOT NULL DEFAULT '',
      archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0, 1)),
      revision INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS clinic_service_translations (
      service_id INTEGER NOT NULL REFERENCES clinic_services(id),
      locale TEXT NOT NULL CHECK(locale IN ('en', 'kn')),
      draft TEXT NOT NULL,
      published TEXT,
      approved_at TEXT,
      revision INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (service_id, locale)
    );
  `);

  function transaction(work) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  const create = db.prepare('INSERT OR IGNORE INTO clinic_services (slug, display_order) VALUES (?, ?)');
  const createTranslation = db.prepare('INSERT INTO clinic_service_translations (service_id, locale, draft) VALUES (?, ?, ?)');
  transaction(() => {
    const pending = slugs.map((slug, index) => [slug, seed?.en?.treatments?.items?.[index], seed?.kn?.treatments?.items?.[index]]);
    for (const [slug, titleEn, titleKn] of unverifiedServices) {
      pending.push([slug, { title: titleEn }, { title: titleKn }]);
    }
    pending.forEach(([slug, en, kn], index) => {
      const { changes, lastInsertRowid } = create.run(slug, (index + 1) * 10);
      if (!changes) return;
      for (const [locale, entry] of [['en', en], ['kn', kn]]) {
        createTranslation.run(lastInsertRowid, locale, JSON.stringify({ ...blankTranslation(), ...entry }));
      }
    });
  });

  const editableService = db.prepare('SELECT * FROM clinic_services WHERE slug = ?');
  const translation = db.prepare('SELECT * FROM clinic_service_translations WHERE service_id = ? AND locale = ?');
  const visibleBilingually = `
    s.archived = 0 AND EXISTS (
      SELECT 1 FROM clinic_service_translations AS other
      WHERE other.service_id = s.id AND other.locale <> t.locale AND other.published IS NOT NULL
    ) AND t.published IS NOT NULL
  `;
  const listServices = db.prepare(`
    SELECT s.slug, s.image, t.published FROM clinic_services AS s
    JOIN clinic_service_translations AS t ON t.service_id = s.id AND t.locale = ?
    WHERE ${visibleBilingually}
    ORDER BY s.display_order, s.slug
  `);
  const publicService = db.prepare(`
    SELECT s.slug, s.image, t.published FROM clinic_services AS s
    JOIN clinic_service_translations AS t ON t.service_id = s.id AND t.locale = ?
    WHERE ${visibleBilingually} AND s.slug = ?
  `);
  const adminServices = db.prepare(`
    SELECT s.slug, s.display_order, s.archived, en.published, kn.published AS kannada_published
    FROM clinic_services s
    JOIN clinic_service_translations en ON en.service_id = s.id AND en.locale = 'en'
    JOIN clinic_service_translations kn ON kn.service_id = s.id AND kn.locale = 'kn'
    ORDER BY s.archived, s.display_order, s.slug
  `);
  const galleryExists = db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'gallery_images'");
  const galleryPhotos = () => galleryExists.get()
    ? db.prepare('SELECT id, alt_en AS label, width, height FROM gallery_images ORDER BY created_at DESC, id').all()
    : [];

  function mutate(url, role, data) {
    if (!['doctor', 'editor', 'owner', 'content_editor'].includes(role)) return invalid('Content access required.', 403);
    const doctor = role === 'doctor';
    const locale = url.searchParams.get('locale') === 'kn' ? 'kn' : 'en';
    const slug = url.searchParams.get('slug') || '';
    if (data.action === 'create') {
      const requested = String(data.slug ?? '').trim();
      if (requested.length > 80 || !slugPattern.test(requested)) return invalid('Use a lowercase slug with letters, digits and dashes.');
      const { changes, lastInsertRowid } = create.run(requested, 1000);
      if (!changes) return invalid('That service slug already exists.', 409);
      for (const language of supportedLocales) createTranslation.run(lastInsertRowid, language, JSON.stringify(blankTranslation()));
      return { ...done(locationFor(requested, locale)), event: 'service.create', slug: requested };
    }

    const service = editableService.get(slug);
    if (!service) return invalid('Service not found.', 404);
    const target = locationFor(slug, locale);
    if (['approve', 'unpublish', 'archive', 'restore', 'settings'].includes(data.action) && !doctor) {
      return invalid('Doctor access required for this change.', 403);
    }
    if (service.archived && data.action !== 'restore') return invalid('Restore the service before editing it.', 409);
    if (data.action === 'archive' || data.action === 'restore') {
      const archiving = data.action === 'archive';
      const changed = db.prepare(`
        UPDATE clinic_services SET archived = ?, revision = revision + 1
        WHERE id = ? AND revision = ? AND archived = ?
      `).run(Number(archiving), service.id, String(data.revision ?? ''), Number(!archiving));
      if (!changed.changes) return invalid('The service changed. Reload before continuing.', 409);
      if (archiving) {
        db.prepare(`
          UPDATE clinic_service_translations SET published = NULL, approved_at = NULL, revision = revision + 1
          WHERE service_id = ?
        `).run(service.id);
      }
      return { ...done(target), event: 'service.' + data.action, slug };
    }
    if (data.action === 'settings') {
      const order = String(data.order ?? '');
      const image = String(data.image ?? '').trim();
      if (!/^\d{1,5}$/.test(order) || Number(order) > 10000 || (image && !galleryPhotos().some(photo => galleryPath(photo.id) === image))) {
        return invalid('Enter a display order from 0 to 10000 and choose a published gallery photo.');
      }
      if (image && supportedLocales.some(language => {
        const row = translation.get(service.id, language);
        return row.published && !JSON.parse(row.published).imageAlt;
      })) return invalid('Both approved translations need alt text before an image can be added.');
      const changed = db.prepare(`
        UPDATE clinic_services SET display_order = ?, image = ?, revision = revision + 1
        WHERE id = ? AND revision = ? AND archived = 0
      `).run(Number(order), image, service.id, String(data.revision ?? ''));
      if (!changed.changes) return invalid('The service changed. Reload before continuing.', 409);
      return { ...done(target), event: 'service.settings', slug };
    }

    const current = translation.get(service.id, locale);
    const revision = String(data.revision ?? '');
    let changed;
    if (data.action === 'save') {
      const draft = readTranslation(data, locale);
      if (!draft) return invalid('Complete the title and description in the selected language and keep fields within their limits. Provide both parts of the FAQ if used.');
      changed = db.prepare(`
        UPDATE clinic_service_translations SET draft = ?, revision = revision + 1
        WHERE service_id = ? AND locale = ? AND revision = ?
      `).run(JSON.stringify(draft), service.id, locale, revision);
    } else if (data.action === 'approve') {
      const reviewed = readTranslation(JSON.parse(current.draft), locale);
      if (!reviewed || (service.image && !reviewed.imageAlt)) {
        return invalid('Complete and save the translation before approval. An attached image requires alt text in both languages.');
      }
      changed = db.prepare(`
        UPDATE clinic_service_translations SET published = draft, approved_at = CURRENT_TIMESTAMP, revision = revision + 1
        WHERE service_id = ? AND locale = ? AND revision = ?
      `).run(service.id, locale, revision);
    } else if (data.action === 'unpublish') {
      changed = db.prepare(`
        UPDATE clinic_service_translations SET published = NULL, approved_at = NULL, revision = revision + 1
        WHERE service_id = ? AND locale = ? AND revision = ?
      `).run(service.id, locale, revision);
    } else return invalid('Unknown action.', 400);
    if (!changed.changes) return invalid('The translation changed. Reload before continuing.', 409);
    return { ...done(target), event: 'service.' + data.action, slug, locale };
  }

  function adminView(url, role, options = {}) {
    const { message = '', csrf = '' } = options;
    const doctor = role === 'doctor';
    const locale = url.searchParams.get('locale') === 'kn' ? 'kn' : 'en';
    const slug = url.searchParams.get('slug') || '';
    const service = editableService.get(slug);
    const token = csrf ? `<input type="hidden" name="csrf" value="${h(csrf)}">` : '';
    let section = '';
    if (service) {
      const row = translation.get(service.id, locale);
      const draft = JSON.parse(row.draft);
      const target = h(locationFor(slug, locale));
      const fields = textFields.map(([name, label, max]) => `<label>${h(label)}${max <= 160
        ? `<input name="${name}" lang="${locale}" value="${h(draft[name])}" maxlength="${max}"${name === 'title' ? ' required' : ''}>`
        : `<textarea name="${name}" lang="${locale}" maxlength="${max}" rows="3"${name === 'description' ? ' required' : ''}>${h(draft[name])}</textarea>`}</label>`).join('');
      const serviceRevision = `<input type="hidden" name="revision" value="${service.revision}">`;
      const translationRevision = `<input type="hidden" name="revision" value="${row.revision}">`;
      const languages = supportedLocales.map(language => `<a href="${h(locationFor(slug, language))}" lang="${language}"${locale === language ? ' aria-current="true"' : ''}>${language === 'en' ? 'English' : 'ಕನ್ನಡ'}</a>`).join('');
      let settings = '';
      const photos = doctor ? galleryPhotos() : [];
      if (doctor && !service.archived) settings = `
        <form class="stack" action="${target}" method="post">${token}${serviceRevision}<fieldset><legend>Public listing</legend>
        <label>Display order<input type="number" min="0" max="10000" name="order" value="${service.display_order}" required></label>
        <label>Treatment photo<select name="image"><option value="">No photo</option>${photos.map(photo =>
          `<option value="${galleryPath(photo.id)}"${service.image === galleryPath(photo.id) ? ' selected' : ''}>${h(photo.label)}</option>`).join('')}</select></label>
        <p>Choose a published gallery photo. Save and approve descriptive alt text in both languages before adding a photo to a published service.</p>
        <button class="button" name="action" value="settings">Save listing settings</button></fieldset></form>
        <form class="stack" action="${target}" method="post">${token}${serviceRevision}<button class="button secondary" name="action" value="archive">Archive service</button></form>`;
      const status = row.approved_at ? (row.published === row.draft ? 'Approved' : 'Approved version with unpublished changes') : 'Awaiting doctor approval';
      section = `<section><h2>${h(slug)}</h2>
        ${service.archived ? `<p>This service is archived.</p>${doctor ? `<form action="${target}" method="post">${token}${serviceRevision}<button class="button" name="action" value="restore">Restore to draft</button></form>` : ''}` : `
        <nav aria-label="Content language" class="language">${languages}</nav>
        <p>${status}</p>
        <form class="stack" action="${target}" method="post">${token}${translationRevision}<fieldset><legend>Translation draft</legend>${fields}
        <button class="button" name="action" value="save">Save translation</button></fieldset></form>
        ${doctor ? `<form class="stack" action="${target}" method="post">${token}${translationRevision}
        <p>Save any changes before approving. The public website will show this service after both languages are approved.</p>
        <button class="button" name="action" value="approve">Approve saved translation</button>
        ${row.published ? '<button class="button secondary" name="action" value="unpublish">Unpublish translation</button>' : ''}</form>` : ''}
        ${settings}`}</section>`;
    }
    const items = adminServices.all().map(item => `<li><a href="${h(locationFor(item.slug, locale))}">${h(item.slug)}</a> · ${item.archived ? 'Archived' : item.published && item.kannada_published ? 'Published' : 'Draft'}</li>`).join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><link rel="stylesheet" href="/assets/site.css"><title>Service catalogue</title></head>
      <body><main class="shell section"><p><a href="/admin">Clinic administration</a></p><h1>Service catalogue</h1>
      ${message ? `<p class="notice" role="alert">${h(message)}</p>` : ''}<ul>${items}</ul>
      <form class="stack" action="${adminPath}" method="post">${token}<fieldset><legend>Add a service</legend>
      <label>Public URL slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required maxlength="80"></label>
      <button class="button" name="action" value="create">Create service draft</button></fieldset></form>${section}</main></body></html>`;
  }

  return {
    list: locale => {
      const rows = listServices.all(locale);
      const photos = rows.some(row => row.image) ? galleryPhotos() : [];
      return rows.map(row => makePublic(row, photos.find(photo => galleryPath(photo.id) === row.image)));
    },
    get: (locale, slug) => {
      const service = publicService.get(locale, slug);
      return service && makePublic(service, service.image && galleryPhotos().find(photo => galleryPath(photo.id) === service.image));
    },
    publicSlugs: () => listServices.all('en').map(service => service.slug),
    adminAction: (url, role, data, audit) => transaction(() => {
      const result = mutate(url, role, data);
      if (result.event) audit?.(result);
      return result;
    }),
    adminView
  };
}

export function renderServiceDetails(locale, service) {
  const labels = detailsLabels[locale];
  const sections = ['symptoms', 'procedure', 'benefits', 'risks', 'aftercare', 'fee'].map(key =>
    service[key] ? `<section><h2>${h(labels[key])}</h2><p>${h(service[key])}</p></section>` : '').join('');
  const image = service.image ? `<div class="hero-visual"><img src="${h(service.image)}" alt="${h(service.imageAlt)}" width="${h(service.imageWidth)}" height="${h(service.imageHeight)}" loading="lazy" decoding="async"></div>` : '';
  const questions = faqFields.filter(([question, answer]) => service[question] && service[answer]).map(([question, answer]) =>
    `<details class="faq-item"><summary>${h(service[question])}</summary><p>${h(service[answer])}</p></details>`).join('');
  const faq = questions ? `<section><h2>${h(labels.faq)}</h2>${questions}</section>` : '';
  return image + sections + faq;
}
