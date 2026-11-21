import { backup, DatabaseSync } from 'node:sqlite';
import { chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const [operation, sourceArgument, destinationArgument, ...extra] = process.argv.slice(2);

if (!['backup', 'restore'].includes(operation) || !sourceArgument || !destinationArgument || extra.length) {
  console.error('Usage: node scripts/sqlite-copy.mjs <backup|restore> <source.sqlite> <new-destination.sqlite>');
  process.exitCode = 2;
} else {
  try {
    await copyDatabase(resolve(sourceArgument), resolve(destinationArgument));
    console.log('SQLite snapshot verified and written to the new destination.');
  } catch (error) {
    console.error('SQLite copy failed:', error.message);
    process.exitCode = 1;
  }
}

function checkDatabase(database) {
  const checks = database.prepare('PRAGMA quick_check').all();
  if (checks.length !== 1 || checks[0].quick_check !== 'ok') {
    throw new Error('SQLite integrity check failed.');
  }
}

async function copyDatabase(source, destination) {
  if ([destination, destination + '-wal', destination + '-shm', destination + '-journal'].some(existsSync)) {
    throw new Error('Choose a destination without an existing database or SQLite sidecar.');
  }

  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
  const staging = mkdtempSync(join(dirname(destination), '.sqlite-copy-'));
  const stagedDatabase = join(staging, 'snapshot.sqlite');

  try {
    const input = new DatabaseSync(source, { readOnly: true });
    try {
      input.exec('PRAGMA busy_timeout = 5000');
      await backup(input, stagedDatabase);
    } finally {
      input.close();
    }
    chmodSync(stagedDatabase, 0o600);
    const output = new DatabaseSync(stagedDatabase);
    try {
      checkDatabase(output);
      output.exec('PRAGMA journal_mode = DELETE');
    } finally {
      output.close();
    }
    linkSync(stagedDatabase, destination);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
