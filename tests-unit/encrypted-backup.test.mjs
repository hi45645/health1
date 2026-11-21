import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('encrypted SQLite snapshot restores with the recovery key and rejects corrupted archives and overwrites', () => {
  const dir = mkdtempSync(join(tmpdir(),'clinic-gpg-'));
  const home = join(dir,'keyring');
  mkdirSync(home,{mode:0o700});
  const env = {...process.env, GNUPGHOME:home, BACKUP_TMPDIR:dir};
  const run = (command,args) => execFileSync(command,args,{env,stdio:['ignore','pipe','pipe']});
  const script = fileURLToPath(new URL('../scripts/encrypted-snapshot-v1.sh',import.meta.url));
  try {
    run('gpg',['--batch','--pinentry-mode','loopback','--passphrase','','--quick-generate-key','Recovery test <test@localhost.invalid>','rsa2048','encr','1d']);
    const key = run('gpg',['--batch','--with-colons','--list-keys']).toString().split('\n').find(s=>s.startsWith('fpr:')).split(':')[9];
    const path = join(dir,'source.sqlite'), archive = join(dir,'snapshot.gpg'), dest = join(dir,'restore.sqlite');
    const db = new DatabaseSync(path);
    db.exec("CREATE TABLE fixture(n INTEGER); INSERT INTO fixture VALUES (42)");
    db.close();
    run(script,['backup',path,archive,key]);
    assert.throws(()=>run(script,['backup',path,archive,key]));
    run(script,['restore',archive,dest]);
    const restored = new DatabaseSync(dest,{readOnly:true});
    assert.equal(restored.prepare('SELECT n FROM fixture').get().n,42);
    restored.close();
    const damaged = readFileSync(archive);
    damaged[damaged.length-1] ^= 255;
    writeFileSync(join(dir,'bad.gpg'),damaged);
    assert.throws(()=>run(script,['restore',join(dir,'bad.gpg'),join(dir,'bad.sqlite')]));
    assert.ok(!existsSync(join(dir,'bad.sqlite')));
    assert.throws(()=>run(script,['restore',archive,dest]));
  } finally {
    try { run('gpgconf',['--kill','all']); } finally { rmSync(dir,{recursive:true,force:true}); }
  }
});
