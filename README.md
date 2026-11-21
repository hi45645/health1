# Sumukha Dental Clinic

A bilingual clinic website, appointment scheduler and staff dashboard for Chintamani, Karnataka. Public pages render on the server. The application uses Node.js 24 and SQLite on a persistent local volume.

## Run

```sh
npm ci
npm start
```

Open http://localhost:3000. The application creates its database at `data/clinic.sqlite`. Override `DB_PATH` for other locations. Both languages share the same appointment inventory. No clinic hours, holidays or clinical services are presumed verified.

## Set up staff

Use the variables in [.env.example](.env.example). Generate a unique password of at least 14 characters, a 32-character base32 TOTP secret from 20 random bytes, and a 64-character hexadecimal encryption key from 32 random bytes. Register the TOTP secret with the owner's authenticator. Supply the secrets using a deployment secret store, or a private local environment file and `node --env-file=.env server.mjs`. Set the public HTTPS `SITE_ORIGIN` for deployment.

On first startup with an empty staff table the server creates the owner account. Sign in at `/admin/login`. Create individually named staff accounts, register their authenticators, then remove the bootstrap variables. Keep the encryption key available across restarts and store its recovery copy separately. The owner verifies clinic details and configures availability. The doctor reviews each medical translation before publication.

## Source

- `server.mjs`, `views.mjs`, `public/` — routing, accessible server-rendered pages, CSS, JavaScript, local font and images.
- `auth.mjs`, `booking.mjs`, `catalogue.mjs`, `clinic.mjs` — staff access, scheduling, treatment reviews and verified clinic details.
- `store.mjs` and feature initialization — SQLite schema and migrations.
- `ui.json`, `content.json`, `extra.json` — English and Kannada dictionaries and initial drafts.
- `tests/`, `scripts/`, `.github/` — validation, maintenance and CI.

## Validate

```sh
npx playwright install chromium
npm test
node --test tests-unit/*.test.mjs
docker build -t sumukha-clinic .
```

For hosting, use a single application instance behind HTTPS with a persistent encrypted volume and independent encrypted backups. Deployment, disaster recovery and clinic verification are covered in the project documentation. Optional aggregate activity collection is enabled only when `ANALYTICS_ENABLED=true`.

For a separate development database with fictional data, run `node scripts/seed-development.mjs` and set `DB_PATH=data/fictional-development.sqlite`. The seed command refuses existing paths.
