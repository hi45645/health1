# Backup and restore

Use Node.js 24. The backup command copies committed SQLite state using the Online Backup API, including committed data still in the WAL. It checks integrity and publishes a fresh destination file with owner-only permissions. Use a local filesystem that supports hard links for the staging destination.

```sh
node scripts/sqlite-copy.mjs backup /var/lib/clinic/clinic.sqlite "/secure/backups/clinic-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
```

Schedule this command daily and monitor exit status. Transfer each snapshot to owner-controlled encrypted off-host storage. Keep the separate encryption keys in the clinic's recovery process. Limit read access, monitor storage capacity, and prune by the clinic's approved retention policy. A snapshot contains patient and staff records. Do not email it or store it in source control.

Restore a verified snapshot to a fresh path. Keep the current database, WAL and SHM together while investigating an incident. Do not rename or overwrite members of a live database during a restore.

```sh
node scripts/sqlite-copy.mjs restore /secure/backups/clinic-20261121T000000Z.sqlite /var/lib/clinic/clinic-restored.sqlite
node --test tests-unit/backup.test.mjs
```

Run an isolated instance with the restored database and compatible revision. Verify locale publication, schedule, appointment status, and staff login, and then take the old instance out of service. Point `DB_PATH` to the verified restored copy and restart. Reconcile changes made after the snapshot before opening the restored instance to new bookings. Before putting the restore online, invalidate restored sessions in the isolated database and verify that current staff accounts and roles match the access register. The production authenticator encryption key must match the snapshot. The included test used a temporary SQLite database with committed WAL data. Production infrastructure and backup transfer must be tested after provisioning.

## Encrypted recovery archives

Use the versioned wrapper for operational backups on Linux with Node.js 24, GNU coreutils and GnuPG 2. Verify the recovery public key's full fingerprint with its custodian over a separate trusted channel. Import its public key into a dedicated backup service keyring. Keep the corresponding private key and passphrase under separate recovery custody. The backup host needs only the public key. Each archive can have multiple recovery recipients. Rotate keys before expiry and retain decryption keys for previous archives until those archives age out.

```sh
export GNUPGHOME=/etc/clinic/backup-public-keyring
export BACKUP_TMPDIR=/var/lib/clinic/encrypted-staging
scripts/encrypted-snapshot-v1.sh backup /var/lib/clinic/clinic.sqlite \
  "/secure/backups/clinic-$(date -u +%Y%m%dT%H%M%SZ).v1.sqlite.gpg" "$RECOVERY_FINGERPRINT"
```

Pre-create the private staging directory on encrypted local storage or tmpfs and provision space for the SQLite snapshot and its temporary copy. Normal exits and handled interruptions clean up staging files. After power loss, inspect private staging for abandoned snapshots. Upload the completed encrypted archive to authenticated, versioned, access-controlled off-host storage. Encryption provides confidentiality and corruption detection. Keep storage version history and authenticated upload records for archive provenance, since anyone who has the public key can encrypt a file to it.

On an isolated recovery host with a compatible private key unlocked in its GnuPG agent, choose a **new** database destination. Recover the separate staff authenticator encryption key through the clinic's secret recovery process.

```sh
GNUPGHOME=/secure/recovery/keyring BACKUP_TMPDIR=/secure/recovery/staging \
  scripts/encrypted-snapshot-v1.sh restore /secure/recovery/clinic.v1.sqlite.gpg /secure/recovery/restored.sqlite
node --test tests-unit/encrypted-backup.test.mjs
```

Monitor each scheduled job's exit status, newest **off-host** archive age, encrypted object size, remaining staging capacity, destination quota, and recovery key expiry. Alert the named operator if an expected archive misses the clinic's recovery-point objective. Confirm receipt at the destination before recording backup success. Record the elapsed time for a restore drill after every key rotation and during scheduled recovery tests.
