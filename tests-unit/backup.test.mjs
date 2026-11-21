import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';

test('backs up committed WAL data, restores to a fresh file, and refuses overwrite', () => {
  const directory = mkdtempSync(join(tmpdir(), 'clinic-backup-test-'));
  const source = join(directory, 'live.sqlite');
  const snapshot = join(directory, 'backup.sqlite');
  const restored = join(directory, 'restored.sqlite');
  const db = new DatabaseSync(source);
  const runCopy = (command, input, output) =>
    spawnSync(process.execPath, ['scripts/sqlite-copy.mjs', command, input, output], { encoding: 'utf8' });

  try {
    db.exec("PRAGMA journal_mode = WAL; CREATE TABLE smoke (value TEXT); INSERT INTO smoke VALUES ('committed')");
    assert(existsSync(source + '-wal'));

    const backup = runCopy('backup', source, snapshot);
    assert.equal(backup.status, 0, backup.stderr);
    db.exec("INSERT INTO smoke VALUES ('after backup')");
    const restore = runCopy('restore', snapshot, restored);
    assert.equal(restore.status, 0, restore.stderr);
    assert.equal(statSync(restored).mode & 0o777, 0o600);
    const result = new DatabaseSync(restored, { readOnly: true });
    try {
      assert.deepEqual(result.prepare('SELECT value FROM smoke').all().map(row => row.value), ['committed']);
    } finally {
      result.close();
    }
    assert.equal(runCopy('restore', snapshot, restored).status, 1);
    assert.equal(runCopy('backup', join(directory, 'missing.sqlite'), join(directory, 'unused.sqlite')).status, 1);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
