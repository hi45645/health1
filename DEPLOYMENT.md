# Deployment

Use Node.js 24 on a maintained Linux host, either directly or through the repository Dockerfile. Choose a host that supports a persistent SQLite volume and HTTPS reverse proxy. Complete the [owner setup checklist](OWNER_SETUP_CHECKLIST.md) before routing live traffic.

1. Run `npm ci`, install the test browser, and run the repository checks. Build the image with `docker build -t sumukha-clinic .` when using containers.
2. Create a persistent volume owned by the app service identity. Set `DB_PATH` to the file on that volume. Set `SITE_ORIGIN` to the public HTTPS origin and apply credentials securely through the host. See `.env.example` for variables. Production requires `STAFF_ENCRYPTION_KEY`, a random 32-byte secret encoded as 64 hex characters. Keep a recoverable offline copy separate from backups. On the first startup with an empty staff table, set the owner username, password, and 32-character uppercase Base32 TOTP secret. Enroll the secret in the owner's authenticator through a private channel. After initial sign-in succeeds, remove the bootstrap variables from hosting settings. Start production with a new database or a snapshot created with the same encryption key.
3. Bind the app behind the reverse proxy. Test `/healthz` and both locale entry pages. Route HTTP to HTTPS and configure log redaction, timeouts, and request limits.
4. Set up independent uptime monitoring and encrypted off-host backups. Restore a snapshot to a separate volume and verify it with an isolated copy.
5. Configure clinic hours and blocked dates, enroll staff, approve medical drafts, and place a synthetic appointment. Confirm its cancellation and status. Verify SEO redirects with the old URL inventory.
6. Take a backup before redeploying. To roll back a schema change, run a compatible app version against a verified backup at a new database path. Reconcile post-backup requests through staff before reopening bookings.

DNS, SSL certificates, host accounts, monitoring, and the backup destination require owner-controlled infrastructure. The repository image alone does not provision those services.

Run the optional worker only after clinic approval of the provider account, message templates and consent wording. See [WhatsApp setup](WHATSAPP.md). Behind a TLS-inspecting development proxy, supply its trusted public CA bundle to the Docker build as a BuildKit secret using `--secret id=npm_ca,src=/path/to/ca-bundle.pem`. Package installation retains certificate and lockfile integrity verification.
