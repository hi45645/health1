import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../store.mjs';
import { change, initBooking, localDate, managementToken, patientAction, reserve, setSchedule } from '../booking.mjs';
import { createWhatsAppProvider, runWhatsAppQueue, whatsappSettings } from '../whatsapp.mjs';

const start = Date.parse('2030-05-01T10:00:00Z');
const future = '2030-05-04';
const settings = () => whatsappSettings({
  WHATSAPP_GRAPH_VERSION: 'v24.0',
  WHATSAPP_PHONE_NUMBER_ID: '1234567',
  WHATSAPP_ACCESS_TOKEN: 'test-only',
  WHATSAPP_TEMPLATE_CONFIRM_EN: 'confirmation_en',
  WHATSAPP_TEMPLATE_RESCHEDULE_KN: 'appointment_change_kn'
});

function fixture(t) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec(`
    CREATE TABLE appointments(reference TEXT PRIMARY KEY, phone TEXT, locale TEXT, date TEXT, time TEXT, status TEXT);
    CREATE TABLE appointment_events(id INTEGER PRIMARY KEY, created_at TEXT);
    CREATE TABLE appointment_contact(reference TEXT PRIMARY KEY, opted_out INTEGER, whatsapp_optin INTEGER);
    CREATE TABLE appointment_messages(event_id INTEGER PRIMARY KEY, reference TEXT, kind TEXT, status TEXT);
  `);
  const add = (id, { kind = 'confirm', optin = 1, optedOut = 0, locale = 'en', status = 'confirmed', reference = 'appointment-' + id } = {}) => {
    db.prepare('INSERT OR IGNORE INTO appointments VALUES(?, ?, ?, ?, ?, ?)').run(reference, '+91 90000 00001', locale, future, '15:00', status);
    db.prepare('INSERT OR IGNORE INTO appointment_contact VALUES(?, ?, ?)').run(reference, optedOut, optin);
    db.prepare('INSERT INTO appointment_events VALUES(?, ?)').run(id, new Date(start).toISOString());
    db.prepare("INSERT INTO appointment_messages VALUES(?, ?, ?, 'awaiting staff')").run(id, reference, kind);
  };
  return { db, add };
}

test('WhatsApp is disabled unless provider and at least one approved template name are configured', () => {
  assert.equal(whatsappSettings({}), null);
  assert.throws(() => whatsappSettings({ WHATSAPP_ACCESS_TOKEN: 'test-only' }), /Invalid|invalid/);
});

test('WhatsApp job observes opt-in, supported locale and latest event, and records API acceptance just once', async t => {
  const { db, add } = fixture(t);
  add(1, { optin: 0 });
  add(2, { optedOut: 1 });
  add(3, { locale: 'kn' });
  add(4, { reference: 'rescheduled', locale: 'kn' });
  add(5, { reference: 'rescheduled', kind: 'reschedule', locale: 'kn' });
  const outbound = [];
  const provider = createWhatsAppProvider(settings(), async (url, request) => {
    outbound.push({ url, method: request.method, body: JSON.parse(request.body) });
    return Response.json({ messages: [{ id: 'wamid.test-message' }] });
  });
  const dispatch = () => runWhatsAppQueue(db, provider, { now: () => start });
  assert.equal((await dispatch()).accepted, 1);
  assert.equal((await dispatch()).accepted, 0);
  assert.equal(outbound.length, 1);
  assert.equal(outbound[0].url, 'https://graph.facebook.com/v24.0/1234567/messages');
  assert.equal(outbound[0].method, 'POST');
  assert.deepEqual(outbound[0].body, {
    messaging_product: 'whatsapp', recipient_type: 'individual', to: '919000000001',
    type: 'template',
    template: {
      name: 'appointment_change_kn', language: { code: 'kn' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: future }, { type: 'text', text: '15:00' }] }]
    }
  });
  assert.deepEqual({ ...db.prepare('SELECT event_id, status, attempts, provider_message_id FROM whatsapp_delivery').get() },
    { event_id: 5, status: 'accepted', attempts: 1, provider_message_id: 'wamid.test-message' });
});

test('explicit rate limits retry with backoff and stop after three attempts', async t => {
  const { db, add } = fixture(t);
  add(1);
  const provider = createWhatsAppProvider(settings(), async () =>
    Response.json({ error: { code: 4 } }, { status: 429, headers: { 'retry-after': '60' } }));
  let now = start;
  const dispatch = () => runWhatsAppQueue(db, provider, { now: () => now });
  assert.equal((await dispatch()).retry, 1);
  assert.equal((await dispatch()).retry, 0);
  now += 60_000;
  assert.equal((await dispatch()).retry, 1);
  now += 119_000;
  assert.equal((await dispatch()).retry, 0);
  now += 1_000;
  assert.equal((await dispatch()).failed, 1);
  now += 180_000;
  assert.equal((await dispatch()).failed, 0);
  const row = db.prepare('SELECT status, attempts, reason FROM whatsapp_delivery').get();
  assert.deepEqual({ ...row }, { status: 'failed', attempts: 3, reason: 'retry-limit' });
});

test('a retry is suppressed when consent is revoked, and network ambiguity is not retried', async t => {
  const { db, add } = fixture(t);
  add(1);
  let now = start;
  const throttled = createWhatsAppProvider(settings(), async () => Response.json({ error: true }, { status: 429 }));
  assert.equal((await runWhatsAppQueue(db, throttled, { now: () => now })).retry, 1);
  db.exec('UPDATE appointment_contact SET opted_out = 1 WHERE reference = \'appointment-1\'');
  add(2);
  now += 120_000;
  let calls = 0;
  const unreachable = createWhatsAppProvider(settings(), async () => {
    calls++;
    throw Error('Network outcome unknown');
  });
  assert.equal((await runWhatsAppQueue(db, unreachable, { now: () => now })).uncertain, 1);
  assert.equal((await runWhatsAppQueue(db, unreachable, { now: () => now })).uncertain, 0);
  assert.equal(calls, 1);
  assert.deepEqual(db.prepare('SELECT status FROM whatsapp_delivery ORDER BY event_id').all().map(row => row.status),
    ['suppressed', 'uncertain']);
});

test('overlapping workers submit a queue event at most once and expired claims remain uncertain', async t => {
  const { db, add } = fixture(t);
  add(1);
  let resolveRequest;
  let calls = 0;
  const provider = createWhatsAppProvider(settings(), () => {
    calls++;
    return new Promise(resolve => { resolveRequest = resolve; });
  });
  const started = runWhatsAppQueue(db, provider, { now: () => start });
  assert.equal((await runWhatsAppQueue(db, provider, { now: () => start })).accepted, 0);
  assert.equal(calls, 1);
  assert.equal((await runWhatsAppQueue(db, provider, { now: () => start + 31_000 })).accepted, 0);
  assert.equal(db.prepare('SELECT status FROM whatsapp_delivery').get().status, 'uncertain');
  resolveRequest(Response.json({ messages: [{ id: 'wamid.expired-lease' }] }));
  assert.equal((await started).uncertain, 1);
  assert.equal(calls, 1);
});

test('the booking trigger sends only opted-in appointments and opt-out stops later events', async t => {
  const db = openStore(':memory:');
  t.after(() => db.close());
  initBooking(db);
  const date = localDate(Date.now() + 2 * 86_400_000);
  const day = new Date(date).getUTCDay();
  setSchedule(db, { periods: JSON.stringify([{ day, start: '09:00', end: '12:00' }]), blocks: '[]',
    duration: 30, advance: 7, expiry: 24, cancellation: 1 }, 'test');
  const data = { name: 'Fictional patient', phone: '9900000011', date, time: '09:00', key: 'a'.repeat(32), consent: 'yes' };
  const withoutOptIn = reserve(db, data, 'en', () => false);
  const withOptIn = reserve(db, { ...data, time: '10:00', key: 'b'.repeat(32), whatsapp: 'yes' }, 'en', () => false);
  change(db, { reference: withoutOptIn, action: 'confirm' }, 'test');
  change(db, { reference: withOptIn, action: 'confirm' }, 'test');
  let attempts = 0;
  const provider = createWhatsAppProvider(settings(), async () => {
    attempts++;
    return Response.json({ messages: [{ id: 'wamid.booking-integration' }] });
  });
  assert.equal((await runWhatsAppQueue(db, provider)).accepted, 1);
  const token = managementToken(db, withOptIn);
  patientAction(db, withOptIn, token, 'optout');
  change(db, { reference: withOptIn, action: 'cancel' }, 'test');
  const cancelled = db.prepare("SELECT status FROM appointment_messages WHERE reference=? AND kind='cancel'").get(withOptIn);
  assert.equal(cancelled.status, 'suppressed');
  assert.equal((await runWhatsAppQueue(db, provider)).accepted, 0);
  assert.equal(attempts, 1);
});
