import { request, expect } from '@playwright/test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeSessions, createSessions, schedule } from './fixtures.mjs';

export default async function setup(config) {
  const directory = await mkdtemp(join(tmpdir(), 'sumukha-staff-sessions-'));
  const baseURL = config.projects[0].use.baseURL;
  try {
    const sessions = await createSessions({ request }, baseURL);
    try {
      const response = await sessions.owner.post('/admin/appointments', { form: schedule, maxRedirects: 0 });
      expect(response.status(), (await response.text()).slice(0, 150)).toBe(303);
      const states = Object.fromEntries(await Promise.all(
        Object.entries(sessions).map(async ([name, client]) => [name, await client.storageState()])
      ));
      process.env.PLAYWRIGHT_STAFF_STATES = join(directory, 'states.json');
      await writeFile(process.env.PLAYWRIGHT_STAFF_STATES, JSON.stringify(states), { mode: 0o600 });
    } finally {
      await closeSessions(sessions);
    }
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  return () => rm(directory, { recursive: true, force: true });
}
