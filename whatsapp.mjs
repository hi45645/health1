const supportedKinds = ['confirm', 'cancel', 'reschedule'];
const locales = ['en', 'kn'];
const maxAttempts = 3;
const leaseMs = 30_000;
const maxAgeMs = 24 * 60 * 60_000;
const rateLimitCodes = new Set([4, 17, 80007, 130429, 131056]);

function providerRetryDelay(header) {
  if (!header) return 0;
  if (/^\d+$/.test(header)) return 1000 * Number(header);
  const stamped = Date.parse(header);
  return Number.isFinite(stamped) ? Math.max(0, stamped - Date.now()) : 0;
}

function transaction(db, work) {
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

export function initWhatsApp(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS whatsapp_delivery (
    event_id INTEGER PRIMARY KEY,
    status TEXT NOT NULL CHECK(status IN ('sending','accepted','retry','failed','uncertain','suppressed')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
    next_attempt_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    provider_message_id TEXT,
    reason TEXT
  );`);
}

export function whatsappSettings(env = process.env) {
  const id = env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;
  const version = env.WHATSAPP_GRAPH_VERSION;
  const templates = Object.fromEntries(locales.map(locale => [locale, Object.fromEntries(
    supportedKinds.map(kind => [kind, env['WHATSAPP_TEMPLATE_' + kind.toUpperCase() + '_' + locale.toUpperCase()]])
  )]));
  const names = Object.values(templates).flatMap(Object.values).filter(Boolean);
  if (!id && !accessToken && !version && !names.length) return null;
  if (!/^\d{5,30}$/.test(id || '') || !accessToken || /\s/.test(accessToken) ||
    !/^v[1-9]\d?\.0$/.test(version || '') || !names.length || names.some(name => !/^[a-z0-9_]{1,512}$/.test(name))) {
    throw new Error('Incomplete or invalid WhatsApp configuration.');
  }
  const englishLanguage = env.WHATSAPP_LANGUAGE_EN || 'en';
  if (!['en', 'en_US', 'en_GB', 'en_IN'].includes(englishLanguage)) throw new Error('Invalid English WhatsApp template language.');
  return { id, accessToken, version, templates, languages: { en: englishLanguage, kn: 'kn' } };
}

export function createWhatsAppProvider(settings, sendRequest = globalThis.fetch) {
  return {
    supports(kind, locale) {
      return Boolean(settings.templates[locale]?.[kind]);
    },
    async send(job) {
      const phone = job.phone.replace(/[\s()+-]/g, '');
      if (!/^(?:91)?[6-9]\d{9}$/.test(phone)) return { status: 'failed', reason: 'invalid-number' };
      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone.length === 10 ? '91' + phone : phone,
        type: 'template',
        template: {
          name: settings.templates[job.locale][job.kind],
          language: { code: settings.languages[job.locale] },
          components: [{
            type: 'body',
            parameters: [job.date, job.time].map(text => ({ type: 'text', text }))
          }]
        }
      };
      let response, payload;
      try {
        response = await sendRequest('https://graph.facebook.com/' + settings.version + '/' + settings.id + '/messages', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + settings.accessToken, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          redirect: 'error',
          signal: AbortSignal.timeout(10_000)
        });
        payload = await response.json();
      } catch {
        return { status: 'uncertain', reason: 'missing-provider-acknowledgement' };
      }
      const id = payload?.messages?.[0]?.id;
      if (response.ok && typeof id === 'string' && /^wamid\.[A-Za-z0-9._~+=/-]{1,500}$/.test(id)) {
        return { status: 'accepted', id };
      }
      if (payload?.error && (response.status === 429 || rateLimitCodes.has(payload.error.code))) {
        return { status: 'retry', reason: 'rate-limit', retryDelay: providerRetryDelay(response.headers.get('retry-after')) };
      }
      if (response.status >= 400 && response.status < 500 && payload?.error) {
        return { status: 'failed', reason: 'provider-rejected' };
      }
      return { status: 'uncertain', reason: 'missing-provider-acknowledgement' };
    }
  };
}

function claim(db, provider, now) {
  return transaction(db, () => {
    db.prepare(`UPDATE whatsapp_delivery SET status = 'uncertain', reason = 'interrupted-dispatch', updated_at = ?
      WHERE status = 'sending' AND next_attempt_at <= ?`).run(now, now);
    const eligible = `
      FROM appointment_messages m
      JOIN appointments a ON a.reference = m.reference
      JOIN appointment_events e ON e.id = m.event_id
      JOIN appointment_contact c ON c.reference = a.reference
      WHERE m.status = 'awaiting staff' AND c.opted_out = 0 AND c.whatsapp_optin = 1
        AND unixepoch(e.created_at) * 1000 >= ?
        AND NOT EXISTS (SELECT 1 FROM appointment_messages newer WHERE newer.reference = m.reference AND newer.event_id > m.event_id)
        AND ((m.kind = 'cancel' AND a.status = 'cancelled') OR
             (m.kind = 'confirm' AND a.status = 'confirmed' AND unixepoch(a.date || 'T' || a.time || ':00+05:30') * 1000 > ?) OR
             (m.kind = 'reschedule' AND a.status IN ('pending', 'confirmed') AND unixepoch(a.date || 'T' || a.time || ':00+05:30') * 1000 > ?))
    `;
    const age = now - maxAgeMs;
    db.prepare(`UPDATE whatsapp_delivery SET status = 'suppressed', reason = 'no-longer-eligible', updated_at = ?
      WHERE status = 'retry' AND event_id NOT IN (SELECT m.event_id ${eligible})`).run(now, age, now, now);
    const candidates = db.prepare(`SELECT m.event_id, m.kind, a.phone, a.locale, a.date, a.time ${eligible}
      AND NOT EXISTS (
        SELECT 1 FROM whatsapp_delivery d WHERE d.event_id = m.event_id AND (d.status <> 'retry' OR d.next_attempt_at > ?)
      ) ORDER BY m.event_id`).iterate(age, now, now, now);
    const job = candidates.find(candidate => provider.supports(candidate.kind, candidate.locale));
    if (!job) return null;
    const { attempts } = db.prepare(`INSERT INTO whatsapp_delivery(event_id, status, attempts, next_attempt_at, updated_at)
      VALUES (?, 'sending', 1, ?, ?)
      ON CONFLICT(event_id) DO UPDATE SET status = 'sending', attempts = attempts + 1,
        next_attempt_at = excluded.next_attempt_at, updated_at = excluded.updated_at, reason = NULL
      RETURNING attempts`).get(job.event_id, now + leaseMs, now);
    return { ...job, attempts };
  });
}

export async function runWhatsAppQueue(db, provider, { limit = 25, now = Date.now } = {}) {
  initWhatsApp(db);
  const reports = { accepted: 0, retry: 0, failed: 0, uncertain: 0 };
  for (let i = 0; i < Math.min(100, limit); i++) {
    const job = claim(db, provider, now());
    if (!job) break;
    let result;
    try {
      result = await provider.send(job);
    } catch {
      result = { status: 'uncertain', reason: 'interrupted-dispatch' };
    }
    if (!Object.hasOwn(reports, result?.status)) result = { status: 'uncertain', reason: 'missing-provider-acknowledgement' };
    let { status, reason = null, id = null } = result;
    if (status === 'retry' && job.attempts >= maxAttempts) {
      status = 'failed';
      reason = 'retry-limit';
    }
    const finishedAt = now();
    const retryDelay = Math.min(maxAgeMs, Math.max(60_000 * 2 ** (job.attempts - 1), result.retryDelay || 0));
    const update = db.prepare(`UPDATE whatsapp_delivery SET
      status = ?, next_attempt_at = ?, updated_at = ?, provider_message_id = ?, reason = ?
      WHERE event_id = ? AND status = 'sending' AND attempts = ?`).run(
        status, status === 'retry' ? finishedAt + retryDelay : finishedAt,
        finishedAt, id, reason, job.event_id, job.attempts
      );
    reports[update.changes ? status : 'uncertain'] += 1;
  }
  return reports;
}
