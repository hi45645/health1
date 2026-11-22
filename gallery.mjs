import { arrowOut } from './views.mjs';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { audit } from './auth.mjs';
import { escape as h } from './views.mjs';

const adminPath = '/admin/gallery';
const mediaPrefix = '/media/gallery/';
const idPattern = /^[a-f0-9]{32}$/;
const maxImageBytes = 5 * 1024 * 1024;
const maxGalleryImages = 40;
let activeEncodes = 0;

function initGallery(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS gallery_images (
    id TEXT PRIMARY KEY,
    alt_en TEXT NOT NULL,
    alt_kn TEXT NOT NULL,
    webp BLOB NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}

function galleryItems(db) {
  initGallery(db);
  return db.prepare('SELECT id, alt_en, alt_kn, width, height FROM gallery_images ORDER BY created_at DESC, rowid DESC').all();
}

const mediaUrl = id => mediaPrefix + id + '.webp';

export function getGalleryPhoto(db, id, locale) {
  if (!idPattern.test(id || '')) return null;
  initGallery(db);
  const photo = db.prepare('SELECT id, alt_en, alt_kn, width, height FROM gallery_images WHERE id = ?').get(id);
  return photo ? { ...photo, url: mediaUrl(photo.id), alt: locale === 'kn' ? photo.alt_kn : photo.alt_en } : null;
}

export function galleryPhotoOptions(db) {
  return galleryItems(db).map(photo => ({ id: photo.id, label: photo.alt_en }));
}

export function renderPublicGallery(db, locale, limit = Infinity, showEmptyNotice = true) {
  const images = galleryItems(db).slice(0, limit);
  if (!images.length) {
    return showEmptyNotice ? `<p class="notice">${locale === 'kn' ? 'ಚಿಕಿತ್ಸಾಲಯದ ಚಿತ್ರಗಳನ್ನು ಇಲ್ಲಿ ಪ್ರಕಟಿಸಲಾಗುತ್ತದೆ.' : 'Clinic photos will appear here when published.'}</p>` : '';
  }
  const viewLabel = locale === 'kn' ? 'ಪೂರ್ಣ ಗಾತ್ರದ ಚಿತ್ರ ನೋಡಿ' : 'View full-size photo';
  return `<div class="gallery-grid">${images.map(image => {
    const alt = locale === 'kn' ? image.alt_kn : image.alt_en;
    return `<figure><a href="${mediaUrl(image.id)}" data-gallery-view aria-label="${h(viewLabel + ' · ' + alt)}"><img src="${mediaUrl(image.id)}" alt="${h(alt)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async"><span class="gallery-enlarge" aria-hidden="true">${arrowOut}</span></a><figcaption>${h(alt)}</figcaption></figure>`;
  }).join('')}</div>`;
}

function renderGalleryEditor(db, notice = '', status = 200) {
  const items = galleryItems(db).map(item =>
    `<figure><img src="${mediaUrl(item.id)}" alt="${h(item.alt_en)}" width="${item.width}" height="${item.height}" loading="lazy">
      <figcaption>${h(item.alt_en)} <span lang="kn">${h(item.alt_kn)}</span></figcaption>
      <form method="post" action="${adminPath}" enctype="multipart/form-data">
        <input type="hidden" name="id" value="${h(item.id)}">
        <button type="submit" name="action" value="remove">Remove photo</button>
      </form></figure>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex"><title>Clinic gallery</title><link rel="stylesheet" href="/assets/site.css"></head>
    <body><main class="shell section"><p><a href="/admin">Dashboard</a></p><h1>Clinic gallery</h1>
      ${notice ? `<p class="notice" role="${status >= 400 ? 'alert' : 'status'}">${h(notice)}</p>` : ''}
      <form class="stack" method="post" action="${adminPath}" enctype="multipart/form-data">
        <label>Public photo<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required></label>
        <p>Upload one JPEG, PNG or WebP image up to 5 MB. Photos appear on the public gallery when uploaded.</p>
        <label>Image description in English<input name="alt_en" lang="en" required maxlength="180"></label>
        <label>Image description in Kannada<input name="alt_kn" lang="kn" required maxlength="180"></label>
        <label><input name="permission" value="yes" type="checkbox" required> I have verified permission to publish this photo publicly.</label>
        <button type="submit" name="action" value="upload">Publish photo</button>
      </form><h2>Published photos</h2>
      ${items ? `<div class="gallery-grid gallery-admin">${items}</div>` : '<p>The gallery has no published photos.</p>'}</main></body></html>`;
}

class GalleryError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readUpload(req) {
  const type = req.headers['content-type'];
  if (!type?.toLowerCase().startsWith('multipart/form-data;')) throw new GalleryError(415, 'Submit the photo using the gallery form.');
  const limit = maxImageBytes + 32 * 1024;
  if (Number(req.headers['content-length']) > limit) throw new GalleryError(413, 'The photo must be no larger than 5 MB.');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > limit) {
      req.resume();
      throw new GalleryError(413, 'The photo must be no larger than 5 MB.');
    }
    chunks.push(chunk);
  }
  try {
    const input = new Request('http://localhost/gallery', {
      method: 'POST',
      headers: { 'Content-Type': type },
      body: Buffer.concat(chunks)
    });
    return await input.formData();
  } catch {
    throw new GalleryError(400, 'The upload form could not be read.');
  }
}

function actualFormat(bytes) {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return '';
}

async function reencode(file) {
  if (!(file instanceof File) || !file.size || file.size > maxImageBytes) {
    throw new GalleryError(422, 'Choose an image no larger than 5 MB.');
  }
  if (activeEncodes >= 2) throw new GalleryError(429, 'Another photo is being processed. Try again shortly.');
  activeEncodes++;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const format = actualFormat(bytes);
    if (!format || file.type !== 'image/' + format) throw new GalleryError(422, 'Choose a genuine JPEG, PNG or WebP photo.');
    const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (metadata.format !== format || (metadata.pages || 1) !== 1) {
      throw new GalleryError(422, 'Choose a still JPEG, PNG or WebP photo.');
    }
    return await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  } catch (error) {
    if (error instanceof GalleryError) throw error;
    throw new GalleryError(422, 'This photo could not be processed. Try a still image up to 16 megapixels.');
  } finally {
    activeEncodes--;
  }
}

function galleryMutation(db, actor, action, mutate) {
  db.exec('BEGIN IMMEDIATE');
  try {
    mutate();
    audit(db, actor, action);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

async function saveGalleryImage(db, actor, form) {
  const altEn = form.get('alt_en');
  const altKn = form.get('alt_kn');
  if ([altEn, altKn].some(value => typeof value !== 'string' || !value.trim() || value.trim().length > 180 || /\p{Cc}/u.test(value))) {
    throw new GalleryError(422, 'Enter a single-line description of up to 180 characters in each language.');
  }
  if (form.get('permission') !== 'yes') throw new GalleryError(422, 'Confirm permission to publish this photo.');
  const { data, info } = await reencode(form.get('image'));
  const id = randomBytes(16).toString('hex');
  galleryMutation(db, actor, 'gallery.published.' + id, () => {
    if (db.prepare('SELECT COUNT(*) AS count FROM gallery_images').get().count >= maxGalleryImages) {
      throw new GalleryError(409, 'Remove a photo before publishing more than 40.');
    }
    db.prepare('INSERT INTO gallery_images (id, alt_en, alt_kn, webp, width, height) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, altEn.trim(), altKn.trim(), data, info.width, info.height);
  });
}

function deleteGalleryImage(db, actor, id) {
  if (typeof id !== 'string' || !idPattern.test(id)) throw new GalleryError(422, 'Choose a valid gallery photo.');
  galleryMutation(db, actor, 'gallery.removed.' + id, () => {
    if (!db.prepare('DELETE FROM gallery_images WHERE id = ?').run(id).changes) throw new GalleryError(404, 'This photo is no longer in the gallery.');
  });
}

export function serveGalleryMedia(req, res, url, { db, respond }) {
  const id = url.pathname.match(/^\/media\/gallery\/([a-f0-9]{32})\.webp$/)?.[1];
  if (!id) return respond(res, 404, 'Not found', 'text/plain');
  if (!['GET', 'HEAD'].includes(req.method)) return respond(res, 405, 'Method not allowed', 'text/plain', { Allow: 'GET, HEAD' });
  initGallery(db);
  const row = db.prepare('SELECT webp FROM gallery_images WHERE id = ?').get(id);
  if (!row) return respond(res, 404, 'Not found', 'text/plain');
  const headers = { 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff', ETag: '"' + id + '"' };
  if (req.headers['if-none-match'] === headers.ETag) return respond(res, 304, '', 'image/webp', headers);
  return respond(res, 200, req.method === 'HEAD' ? '' : row.webp, 'image/webp', { ...headers, 'Content-Length': row.webp.byteLength });
}

export async function handleGallery(req, res, url, { db, staff, origin, respond, redirect }) {
  if (staff?.role !== 'owner') return respond(res, 403, 'Owner access required.', 'text/plain');
  if (req.method === 'GET') {
    const notice = url.searchParams.has('published') ? 'Photo published.' : url.searchParams.has('removed') ? 'Photo removed.' : '';
    return respond(res, 200, renderGalleryEditor(db, notice));
  }
  if (req.method !== 'POST') return respond(res, 405, 'Method not allowed', 'text/plain', { Allow: 'GET, POST' });
  if (req.headers.origin !== origin) return respond(res, 403, 'Invalid origin.', 'text/plain');
  initGallery(db);
  try {
    const form = await readUpload(req);
    const action = form.get('action');
    if (action === 'upload') {
      await saveGalleryImage(db, staff.username, form);
      return redirect(res, adminPath + '?published=1');
    }
    if (action === 'remove') {
      deleteGalleryImage(db, staff.username, form.get('id'));
      return redirect(res, adminPath + '?removed=1');
    }
    throw new GalleryError(422, 'Choose a gallery action.');
  } catch (error) {
    if (!(error instanceof GalleryError)) throw error;
    return respond(res, error.status, renderGalleryEditor(db, error.message, error.status));
  }
}
