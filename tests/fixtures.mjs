import { expect } from '@playwright/test';
import { totp } from '../auth.mjs';

const owner = {
  username: 'playwright-owner',
  password: 'playwright-owner-password',
  secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
};

export const schedule = {
  action: 'schedule',
  periods: JSON.stringify(Array.from({ length: 7 }, (_, day) => ({ day, start: '09:00', end: '17:00' }))),
  blocks: '[]',
  duration: '30',
  advance: '90',
  expiry: '48',
  cancellation: '24'
};

export function clinicDate(daysAhead) {
  const date = new Date(Date.now() + daysAhead * 86400_000);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(date);
}

export async function createSessions(playwright, baseURL) {
  const sessions = {};
  const addSession = async (role, credentials) => {
    const client = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
    sessions[role] = client;
    const form = { username: credentials.username, password: credentials.password, code: totp(credentials.secret) };
    const login = await client.post('/admin/login', { form, maxRedirects: 0 });
    expect(login.status(), (await login.text()).slice(0, 150)).toBe(303);
  };
  try {
    await addSession('owner', owner);
    for (const [role, secret] of [
      ['doctor', 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXQ'],
      ['editor', 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXR'],
      ['receptionist', 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXS']
    ]) {
      const credentials = { username: 'playwright-' + role, password: 'playwright-password-' + role, secret };
      const result = await sessions.owner.post('/admin/staff', {
        form: { action: 'create', role, ...credentials }, maxRedirects: 0
      });
      expect(result.status()).toBe(303);
      await addSession(role, credentials);
    }
    return sessions;
  } catch (error) {
    await closeSessions(sessions);
    throw error;
  }
}

export async function closeSessions(sessions) {
  await Promise.all(Object.values(sessions).map(client => client.dispose()));
}
