import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';

async function availablePort() {
  const server = createServer();
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function fixture(t,demo=false) {
  const dir = await mkdtemp(join(tmpdir(),'clinic-release-check-'));
  const port = await availablePort();
  const origin = 'http://127.0.0.1:' + port;
  const path = join(dir,'fixture.sqlite');
  const child = spawn(process.execPath,['server.mjs', ...(demo ? ['--demo'] : [])], {
    env: { ...process.env, PORT:String(port), HOST:'127.0.0.1', SITE_ORIGIN:origin, DB_PATH:path,
      NODE_ENV:'test', OWNER_PASSWORD:'', OWNER_TOTP_SECRET:'', OWNER_USERNAME:'' },
    stdio:'ignore'
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const stopped = once(child,'exit');
      child.kill();
      await stopped;
    }
    await rm(dir,{recursive:true,force:true});
  });
  for(let attempt=0;attempt<100;attempt++) {
    if (child.exitCode !== null) throw new Error('Fixture failed to start');
    try { if ((await fetch(origin + '/healthz')).ok) return {path,origin}; } catch {}
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw new Error('Fixture readiness timed out');
}

test('patients see a localized error without database diagnostics during a storage failure',async t=>{
  const {path,origin} = await fixture(t);
  // Rename a table only inside this disposable fixture to exercise read failures.
  const db = new DatabaseSync(path);
  db.exec('ALTER TABLE content RENAME TO fixture_offline_content');
  db.close();
  const response = await fetch(origin + '/kn/services');
  assert.equal(response.status,500);
  const html = await response.text();
  assert.match(html, /<html lang="kn"/);
  assert.doesNotMatch(html,/no such table|fixture_offline_content|SQLITE_ERROR/);
  assert.match(response.headers.get('cache-control'),/no-store/);
});

test('the local demo has sample treatments and leaves its configured filesystem database untouched',async t=>{
  const {path,origin} = await fixture(t,true);
  const response = await fetch(origin + '/en/services');
  assert.equal(response.status,200);
  assert.match(response.headers.get('x-robots-tag'),/noindex/);
  const html = await response.text();
  assert.match(html,/Local demonstration/);
  assert.match(html,/href="\/en\/services\/cleaning"/);
  const { existsSync } = await import('node:fs');
  assert.equal(existsSync(path),false);
});
