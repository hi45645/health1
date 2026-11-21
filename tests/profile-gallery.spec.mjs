import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';

let owner;
let doctor;

test.beforeAll(async ({ playwright, baseURL }) => {
  const states = JSON.parse(await readFile(process.env.PLAYWRIGHT_STAFF_STATES, 'utf8'));
  const openSession = storageState => playwright.request.newContext({
    baseURL, storageState, extraHTTPHeaders: { Origin: baseURL }
  });
  [owner, doctor] = await Promise.all([openSession(states.owner), openSession(states.doctor)]);
});

test.afterAll(async () => {
  await Promise.all([owner?.dispose(), doctor?.dispose()]);
});

test('clinic details require verification in both languages and reject stale edits', async ({ page, request }) => {
  expect((await doctor.get('/admin/clinic')).status()).toBe(403);
  const response = await owner.get('/admin/clinic');
  expect(response.status()).toBe(200);
  const form = await page.evaluate(html => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Object.fromEntries(new FormData(doc.querySelector('.clinic-editor')));
  }, await response.text());
  const submit = options => owner.post('/admin/clinic', { maxRedirects: 0, form: options });
  const hours = { en: 'Test hours in English', kn: 'ಪರೀಕ್ಷಾ ತೆರೆಯುವ ಸಮಯ' };
  const proposed = { ...form, 'en.hours': hours.en };
  expect((await submit(proposed)).status()).toBe(422);
  expect((await submit({ ...proposed, verified: 'yes' })).status()).toBe(422);
  const published = { ...proposed, 'kn.hours': hours.kn, verified: 'yes', whatsapp: '+919900250104', maps: 'https://www.google.com/maps/place/clinic' };
  expect((await submit({ ...published, maps: 'https://www.google.com.example/maps/place/clinic' })).status()).toBe(422);
  expect((await submit(published)).status()).toBe(303);
  try {
    expect((await submit(published)).status()).toBe(409);
    for (const locale of ['en', 'kn']) {
      const body = await (await request.get('/' + locale + '/contact')).text();
      expect(body).toContain(hours[locale]);
      expect(body).toContain('href="https://wa.me/919900250104"');
      expect(body).toContain('href="https://www.google.com/maps/place/clinic"');
    }
  } finally {
    expect((await submit({ ...form, verified: 'yes', revision: String(Number(form.revision) + 1) })).status()).toBe(303);
  }
});

test('owner upload serves a re-encoded bilingual gallery photo and supports removal', async ({ request }) => {
  const action = '/admin/gallery';
  expect((await doctor.get(action)).status()).toBe(403);
  const input = await sharp({ create: { width: 1900, height: 100, channels: 3, background: 'white' } })
    .withMetadata({ orientation: 1 }).jpeg().toBuffer();
  const upload = {
    action: 'upload',
    permission: 'yes',
    alt_en: 'Test photo in English',
    alt_kn: 'ಪರೀಕ್ಷಾ ಚಿತ್ರ',
    image: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: input }
  };
  expect((await owner.post(action, { multipart: upload, headers: { Origin: 'https://outside.invalid' } })).status()).toBe(403);
  const invalid = { ...upload, image: { ...upload.image, buffer: Buffer.from('<svg/>') } };
  expect((await owner.post(action, { multipart: invalid })).status()).toBe(422);
  expect((await owner.post(action, { multipart: upload, maxRedirects: 0 })).status()).toBe(303);
  const page = await (await request.get('/kn/gallery')).text();
  const match = page.match(/src="(\/media\/gallery\/([a-f0-9]{32})\.webp)" alt="ಪರೀಕ್ಷಾ ಚಿತ್ರ"/);
  expect(match).not.toBeNull();
  const [, path, id] = match;
  try {
    const bytes = await request.get(path);
    expect(bytes.status()).toBe(200);
    expect(bytes.headers()['content-type']).toBe('image/webp');
    const metadata = await sharp(await bytes.body()).metadata();
    expect(metadata.width).toBe(1600);
    expect(metadata.exif).toBeUndefined();
    expect((await request.head(path)).status()).toBe(200);
    expect((await request.get(path, { headers: { 'If-None-Match': bytes.headers().etag } })).status()).toBe(304);
    expect(await (await request.get('/en/gallery')).text()).toContain(upload.alt_en);
    expect((await doctor.post(action, { multipart: { action: 'remove', id } })).status()).toBe(403);
  } finally {
    expect((await owner.post(action, { multipart: { action: 'remove', id }, maxRedirects: 0 })).status()).toBe(303);
  }
  expect((await request.get(path)).status()).toBe(404);
});
