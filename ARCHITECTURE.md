# Architecture

A Node.js 24 HTTP server renders localized HTML and accepts form submissions. The public website works without a frontend build or runtime translation service. Browser JavaScript handles transient form state and optional interface enhancements. The application and SQLite database run together on one host with persistent storage.

- `server.mjs` routes requests, validates input, and applies access policies.
- `views.mjs` renders public pages and forms using escaped values.
- `ui.json` and `extra.json` hold interface copy. `content.json` seeds independently editable content for each language.
- `store.mjs` initializes local storage. `booking.mjs` manages schedule rules, transactions, and appointment events.
- `auth.mjs` manages named staff MFA accounts, sessions, and access audit entries.
- `catalogue.mjs`, `clinic.mjs`, and `gallery.mjs` manage public treatments, profile data, and gallery media.
- `analytics.mjs` optionally tracks aggregate daily public activity.
- `public/` serves local styling, scripts, photos, and the Kannada font.
- `tests/` contains browser and database checks.

English is the default entry locale. Equivalent English and Kannada routes share a route identifier and keep the selected locale in a persistent cookie. The application renders HTML language metadata on the server. Kannada text uses a locally hosted Noto Sans Kannada font. The localized booking form keeps its draft in tab-scoped browser storage and clears it when a request succeeds.

English and Kannada content each have a saved draft and a published snapshot. Clinics should have a doctor review both languages. Treatment details and FAQ entries remain gated until both have a published version.
