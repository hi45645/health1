import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.PLAYWRIGHT_PORT || 3188);
const baseURL = 'http://127.0.0.1:' + port;
const browserName = process.env.PLAYWRIGHT_BROWSER || 'chromium';
const chromium = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/setup.mjs',
  use: { baseURL, browserName, launchOptions: { executablePath: browserName === 'chromium' ? chromium : undefined } },
  webServer: {
    command: 'node server.mjs',
    url: baseURL,
    env: {
      PORT: String(port),
      SITE_ORIGIN: baseURL,
      DB_PATH: join(tmpdir(), 'sumukha-playwright-' + randomUUID(), 'clinic.sqlite'),
      OWNER_USERNAME: 'playwright-owner',
      OWNER_PASSWORD: 'playwright-owner-password',
      OWNER_TOTP_SECRET: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
      STAFF_ENCRYPTION_KEY: randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '')
    }
  }
});
