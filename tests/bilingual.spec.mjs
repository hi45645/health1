import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { clinicDate, closeSessions, schedule } from './fixtures.mjs';

const ui = JSON.parse(readFileSync(new URL('../ui.json', import.meta.url), 'utf8'));
const extras = JSON.parse(readFileSync(new URL('../extra.json', import.meta.url), 'utf8'));
const pagePaths = ['', 'about', 'doctor', 'services', 'gallery', 'faq', 'contact', 'privacy', 'terms', 'accessibility', 'book-appointment', 'appointment-status'];
const treatmentPaths = ['consultation', 'cleaning', 'fillings', 'root-canal', 'crowns', 'extraction'].map(slug => 'services/' + slug);
const segment = (page, locale) => page.locator('.language a[lang="' + locale + '"]');

let sessions;
test.beforeAll(async ({ playwright, baseURL }) => {
  const states = JSON.parse(readFileSync(process.env.PLAYWRIGHT_STAFF_STATES, 'utf8'));
  sessions = Object.fromEntries(await Promise.all(Object.entries(states).map(async ([role, storageState]) => [
    role, await playwright.request.newContext({ baseURL, storageState, extraHTTPHeaders: { Origin: baseURL } })
  ])));
});
test.afterAll(async () => {
  if (sessions) await closeSessions(sessions);
});

test('English defaults, switching stays on the current page, and preference survives reopening', async ({ browser }) => {
  const first = await browser.newContext();
  const page = await first.newPage();
  await page.goto('/');
  await expect(page).toHaveURL(/\/en\/$/);
  await page.goto('/en/contact');
  await segment(page, 'kn').click();
  await expect(page).toHaveURL(/\/kn\/contact$/);
  await expect(segment(page, 'kn')).toHaveAttribute('aria-current', 'true');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'kn');

  const state = await first.storageState();
  expect(state.cookies.find(cookie => cookie.name === 'clinic_locale').expires).toBeGreaterThan(Date.now() / 1000);
  await first.close();
  const reopened = await browser.newContext({ storageState: state });
  const reopenedPage = await reopened.newPage();
  await reopenedPage.goto('/');
  await expect(reopenedPage).toHaveURL(/\/kn\/$/);
  await reopenedPage.goto('/kn/contact');
  await segment(reopenedPage, 'en').click();
  await expect(reopenedPage).toHaveURL(/\/en\/contact$/);
  await expect(segment(reopenedPage, 'en')).toHaveAttribute('aria-current', 'true');
  await reopened.close();
});

test('appointment fields, localized errors, and bilingual receipt', async ({ page }) => {
  await page.goto('/en/book-appointment');
  await page.getByRole('button', { name: ui.en.submit }).click();
  await expect(page.getByRole('alert')).toHaveText(ui.en.fieldError);
  const values = { name: 'Test Patient', phone: '1234', email: 'patient@example.invalid', date: clinicDate(3) };
  for (const [name, value] of Object.entries(values)) await page.locator('#' + name).fill(value);
  await expect(page.locator('#time option[value="10:30"]')).toHaveCount(1);
  await page.locator('#time').selectOption('10:30');
  await page.locator('[name=consent]').check();
  await page.locator('[name=whatsapp]').check();
  await segment(page, 'kn').click();
  await expect(page).toHaveURL(/\/kn\/book-appointment$/);
  for (const [name, value] of Object.entries(values)) await expect(page.locator('#' + name)).toHaveValue(value);
  await expect(page.locator('#time')).toHaveValue('10:30');
  await expect(page.locator('[name=consent]')).toBeChecked();
  await expect(page.locator('[name=whatsapp]')).toBeChecked();
  await page.getByRole('button', { name: ui.kn.submit }).click();
  await expect(page.locator('#phone-error')).toHaveText(ui.kn.invalidPhone);
  await page.locator('#phone').fill('9900000000');
  await page.getByRole('button', { name: ui.kn.submit }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(ui.kn.confirmation);
  const receipt = new URL(page.url()).searchParams.get('received');
  expect(receipt).toMatch(/^[a-f0-9]{32}$/);
  await segment(page, 'en').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(ui.en.confirmation);
  expect(new URL(page.url()).searchParams.get('received')).toBe(receipt);
  await page.goto('/en/book-appointment');
  await expect(page.locator('#name')).toHaveValue('');

  await page.goto('/kn/appointment-status?reference=' + receipt);
  await expect(page.getByRole('status')).toHaveText(ui.kn.pending);
  expect((await sessions.editor.get('/admin/appointments')).status()).toBe(403);
  const inbox = await sessions.receptionist.get('/admin/appointments');
  expect(await inbox.text()).toContain(receipt);
  const confirmation = await sessions.receptionist.post('/admin/appointments', {
    form: { reference: receipt, action: 'confirm' }, maxRedirects: 0
  });
  expect(confirmation.status()).toBe(303);
  await page.reload();
  await expect(page.getByRole('status')).toHaveText(extras.kn.confirmed);
  await segment(page, 'en').click();
  await expect(page.getByRole('status')).toHaveText(extras.en.confirmed);
});

async function checkPage(page, baseURL, locale, path) {
  const url = '/' + locale + '/' + path;
  const response = await page.goto(url);
  expect(response.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', baseURL + url);
  for (const other of ['en', 'kn']) {
    await expect(page.locator('link[hreflang=' + other + ']')).toHaveAttribute('href', baseURL + '/' + other + '/' + path);
    await expect(segment(page, other)).toHaveAttribute('href', '/' + other + '/' + path);
  }
  await expect(page.locator('link[hreflang=x-default]')).toHaveAttribute('href', baseURL + '/en/' + path);
  if (locale === 'kn') await expect(page.getByRole('heading', { level: 1 })).toContainText(/[\u0c80-\u0cff]/);
}

test('every general route has reciprocal locale and canonical metadata', async ({ page, baseURL }) => {
  for (const path of pagePaths) for (const locale of ['en', 'kn']) await checkPage(page, baseURL, locale, path);
  for (const locale of ['en', 'kn']) {
    const missing = await page.goto('/' + locale + '/does-not-exist');
    expect(missing.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(ui[locale].notFound);
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex');
  }
});

test('mobile layout, keyboard focus, accessible names, and locally loaded Kannada glyphs', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of ['en', 'kn']) {
      await page.goto('/' + locale + '/');
      for (const other of ['en', 'kn']) await expect(segment(page, other)).toBeInViewport();
      const dimensions = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(dimensions[0]).toBeLessThanOrEqual(dimensions[1]);
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/en/book-appointment');
  const kannada = page.getByRole('navigation', { name: ui.en.language }).getByRole('link', { name: 'ಕನ್ನಡ' });
  for (let step = 0; step < 10 && !(await kannada.evaluate(el => el === document.activeElement)); step++) {
    await page.keyboard.press('Tab');
  }
  await expect(kannada).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/kn\/book-appointment$/);
  await expect(segment(page, 'kn')).toHaveAttribute('aria-current', 'true');
  const font = await page.evaluate(async () => {
    const faces = await document.fonts.load('600 24px "Noto Sans Kannada"', 'ಕನ್ನಡ');
    return { count: faces.length, loaded: faces.every(face => face.status === 'loaded') };
  });
  expect(font.count).toBeGreaterThan(0);
  expect(font.loaded).toBe(true);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(axe.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(n => n.target) }))).toEqual([]);
  expect(errors).toEqual([]);
});

test('editors cannot publish and both medical locale drafts require approval', async ({ page, request, baseURL }) => {
  expect((await request.get('/admin', { maxRedirects: 0 })).status()).toBe(401);
  expect((await request.get('/admin/appointments', { maxRedirects: 0 })).status()).toBe(401);
  expect((await sessions.editor.post('/admin?locale=en', { form: { action: 'approve' } })).status()).toBe(403);
  expect((await request.get('/en/services/consultation')).status()).toBe(404);
  const draftResponse = await sessions.editor.get('/admin?locale=en');
  const draftHtml = await draftResponse.text();
  const draftValues = await page.evaluate(html => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    return Object.fromEntries(new FormData(document.querySelector('input[name=reviewed]').form));
  }, draftHtml);
  const revisedTitle = 'A revised English clinic introduction';
  const saved = await sessions.editor.post('/admin?locale=en', {
    form: { ...draftValues, 'home.title': revisedTitle },
    maxRedirects: 0
  });
  expect(saved.status()).toBe(303);
  expect(await (await sessions.editor.get('/admin?locale=kn')).text()).not.toContain(revisedTitle);
  expect(await (await request.get('/en/')).text()).not.toContain(revisedTitle);
  for (const locale of ['en', 'kn']) {
    const draft = await sessions.doctor.get('/admin?locale=' + locale);
    expect(draft.status()).toBe(200);
    const reviewed = (await draft.text()).match(/name="reviewed" value="([a-f0-9]+)"/)[1];
    const approved = await sessions.doctor.post('/admin?locale=' + locale, { form: { action: 'approve', reviewed }, maxRedirects: 0 });
    expect(approved.status()).toBe(303);
  }
  expect(await (await request.get('/en/')).text()).toContain(revisedTitle);
  for (const path of treatmentPaths) {
    const slug = path.split('/')[1];
    for (const locale of ['en', 'kn']) {
      const adminPath = '/admin/services?slug=' + slug + '&locale=' + locale;
      const draft = await sessions.doctor.get(adminPath);
      expect(draft.status()).toBe(200);
      const revision = (await draft.text()).match(/name="revision" value="([^"]+)"/)[1];
      const approved = await sessions.doctor.post(adminPath, { form: { action: 'approve', revision }, maxRedirects: 0 });
      expect(approved.status()).toBe(303);
      if (locale === 'en') expect((await request.get('/en/' + path)).status()).toBe(404);
    }
    for (const locale of ['en', 'kn']) await checkPage(page, baseURL, locale, path);
  }
});

test('only one request claims a slot and retrying the winning request returns the same receipt', async ({ request, baseURL }) => {
  const date = clinicDate(4);
  const submitted = [
    { name: 'Test Patient One', phone: '9900000001' },
    { name: 'Test Patient Two', phone: '9900000002' }
  ].map(patient => ({ ...patient, date, time: '11:00', consent: 'yes', service: 'general', key: randomBytes(16).toString('hex') }));
  const headers = { Origin: baseURL };
  const available = async () => (await (await request.get('/en/slots?date=' + date)).json()).slots;
  const submit = form => request.post('/en/book-appointment', { headers, form, maxRedirects: 0 });
  expect(await available()).toContain('11:00');
  const results = await Promise.all(submitted.map(submit));
  expect(results.filter(response => response.status() === 303)).toHaveLength(1);
  expect(results.filter(response => response.status() === 409)).toHaveLength(1);
  const winner = results.findIndex(response => response.status() === 303);
  expect(await available()).not.toContain('11:00');
  const replay = await submit(submitted[winner]);
  expect(replay.status()).toBe(303);
  expect(replay.headers().location).toBe(results[winner].headers().location);
});


test('the receptionist reschedules and cancels while only verified staff can change hours', async ({ request, baseURL }) => {
  const date = clinicDate(5);
  const endpoint = '/admin/appointments';
  const available = async () => (await (await request.get('/kn/slots?date=' + date)).json()).slots;
  const scheduleChange = { ...schedule, blocks: JSON.stringify([date]) };
  const denied = await sessions.receptionist.post(endpoint, { form: scheduleChange, maxRedirects: 0 });
  expect(denied.status()).toBe(403);
  expect(await available()).toContain('09:00');
  const updated = await sessions.owner.post(endpoint, { form: scheduleChange, maxRedirects: 0 });
  expect(updated.status()).toBe(303);
  expect(await available()).toEqual([]);
  const form = {
    name: 'Test Patient Three', phone: '9900000003', date, time: '09:00',
    consent: 'yes', service: 'general', key: randomBytes(16).toString('hex')
  };
  const submit = () => request.post('/kn/book-appointment', { headers: { Origin: baseURL }, form, maxRedirects: 0 });
  expect((await submit()).status()).toBe(409);
  expect((await sessions.owner.post(endpoint, { form: schedule, maxRedirects: 0 })).status()).toBe(303);
  const created = await submit();
  expect(created.status()).toBe(303);
  const reference = new URL(created.headers().location, baseURL).searchParams.get('received');
  expect(reference).toMatch(/^[a-f0-9]{32}$/);
  const patientStatus = await request.get('/kn/appointment-status?reference=' + reference);
  expect(await patientStatus.text()).not.toContain(form.name);
  expect(await patientStatus.text()).not.toContain(form.phone);
  const transition = (action, fields = {}) => sessions.receptionist.post(endpoint, {
    form: { reference, action, ...fields }, maxRedirects: 0
  });
  expect((await transition('reschedule', { date, time: '09:30' })).status()).toBe(303);
  expect(await available()).toContain('09:00');
  expect(await available()).not.toContain('09:30');
  expect((await transition('cancel')).status()).toBe(303);
  expect(await available()).toContain('09:30');
});


test('only the booking holder can cancel from the patient status page', async ({ playwright, request, baseURL }) => {
  const date = clinicDate(7);
  const client = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  try {
    const booking = await client.post('/en/book-appointment', { maxRedirects: 0, form: {
      name: 'Test Patient Four', phone: '9900000004', date, time: '11:30',
      consent: 'yes', service: 'general', key: randomBytes(16).toString('hex')
    } });
    expect(booking.status()).toBe(303);
    const reference = new URL(booking.headers().location, baseURL).searchParams.get('received');
    const statusPage = '/en/appointment-status?reference=' + reference;
    expect(await (await request.get(statusPage)).text()).not.toContain('Cancel appointment');
    expect(await (await client.get(statusPage)).text()).toContain('Cancel appointment');
    const form = { reference, action: 'cancel' };
    const anonymousAction = await request.post('/en/appointment-status', { headers: { Origin: baseURL }, form, maxRedirects: 0 });
    expect(anonymousAction.status()).toBe(422);
    expect(await (await client.get(statusPage)).text()).toContain(ui.en.pending);
    const authorizedAction = await client.post('/kn/appointment-status', { form, maxRedirects: 0 });
    expect(authorizedAction.status()).toBe(303);
    expect(await (await client.get(authorizedAction.headers().location)).text()).toContain('ರದ್ದಾಗಿದೆ');
    const availability = await (await request.get('/en/slots?date=' + date)).json();
    expect(availability.slots).toContain('11:30');
  } finally {
    await client.dispose();
  }
});

test('staff sign in and sign out through the rendered forms', async ({ page }) => {
  const { totp } = await import('../auth.mjs');
  const credentials = { username: 'form-test-editor', role: 'editor', password: 'test-only-form-password', secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXT' };
  expect((await sessions.owner.post('/admin/staff', { form: { action: 'create', ...credentials }, maxRedirects: 0 })).status()).toBe(303);
  await page.goto('/admin/login');
  await page.getByLabel('Username').fill(credentials.username);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByLabel('Authenticator code').fill(totp(credentials.secret));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Clinic content');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Clinic content');
});
