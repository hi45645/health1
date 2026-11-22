# Test report

Validated in the cloud workspace on November 21, 2026, with Node.js 24 and Chromium 156. Playwright used a temporary SQLite database, fictional patient information, and local test staff accounts.

| Command | Result |
| --- | --- |
| `PLAYWRIGHT_PORT=3255 npm test` | 15 passed |
| `node --test tests-unit/*.test.mjs` | 12 passed |
| `npm audit --json` | 0 known vulnerabilities reported |

Playwright verified both language-switch directions, the English default, cookie persistence after a refresh and reopening, and language changes on the same localized page. It also verified draft restoration for name, mobile number, email, date, time, contact consent and optional WhatsApp consent. The English and Kannada general and published treatment routes returned their expected HTML language, canonical URL, and alternate links. Localized errors and appointment receipts were exercised.

Chromium checks covered 320, 390, 768 and 1440 pixel widths, keyboard activation, the selected language and accessible link names, and the locally loaded Kannada font. The Kannada appointment page returned zero axe WCAG 2.1 A/AA violations in the tested state. A manual screen-reader session and physical mobile devices were outside this run.

Booking tests exercised a verified schedule, blocked dates, India date boundaries, concurrent requests for the same slot, idempotent retry, receptionist confirmation and rescheduling, cancellation, released slots, and authorization for patient actions. Storage checks covered legacy migration, overlapping slot constraints, token scope and expiry, staff account sessions and TOTP, append-only audit records, and verified SQLite backup and encrypted restore. Content checks exercised independent locale drafts, doctor approval for both treatment locales, verified bilingual clinic details, and validated gallery uploads.

The environment blocked Firefox and WebKit downloads with HTTP 403 from both Playwright download hosts. The GitHub Actions configuration includes Chromium, Firefox and WebKit jobs. Those jobs need to run on GitHub before cross-browser compatibility is verified. Live messaging delivery, production data recovery, and production deployment remain outside the scope of this local test run.

## Release criteria

| Criterion | Result | Evidence or outstanding check |
| --- | --- | --- |
| Mobile and desktop website | PASS | Chromium at 320–1440 px |
| English and Kannada public pages | PASS | Locale route, form and receipt tests |
| Dynamic verified treatment pages | PASS | Independent draft and doctor approval tests |
| Appointment saved and visible to staff | PASS | Persistent SQLite booking and staff browser flows |
| Confirm, cancel and reschedule | PASS | Staff workflow and slot release tests |
| Configurable hours and blocked holidays | PASS | Verified schedule and blocked-date tests |
| Concurrent booking protection | PASS | Four independent SQLite connections attempted the same slot |
| Anonymous admin and privileged API access rejected | PASS | Staff session and authorization tests |
| Database row-level security | FAIL | Current database is SQLite. PostgreSQL policies and managed PostgreSQL storage are unimplemented. |
| Staff permissions | PASS | Tested application roles with authenticated sessions |
| Production secrets and default passwords | PASS | First owner requires injected credentials. Browser fixtures use isolated accounts. No live provider credentials supplied. |
| Critical/high security findings | BLOCKED | Dependency audit passed. Production infrastructure and independent security review outstanding. |
| Mandatory automated checks | BLOCKED | Local Chromium and Node checks pass. Firefox and WebKit await execution. |
| Production container build | PASS | Local image built with TLS verification. Container health, English, Kannada and staff login returned HTTP 200. |
| Error handling | PASS | Tested localized validation, conflicts, forbidden operations, missing resources and provider failures |
| Backup and restore | PASS | Local WAL snapshot and GPG-encrypted restore tests. Off-site production recovery pending. |
| Canonical and alternate SEO metadata | PASS | Reciprocal locale and canonical tests |
| Sitemap | PASS | Local XML response with localized routes |
| Clinic and treatment content editable | PASS | Owner profile, gallery and medical publication tests |
| Medical claims | PASS | Unapproved treatment and FAQ drafts withheld. Real clinical review outstanding. |
| Development fixtures | PASS | Synthetic data in temporary databases |
| Deployment and rollback instructions | PASS | Deployment, encrypted backup and recovery runbooks in repository. Live cutover pending. |

The final run included a real browser staff login and logout. A prior run found an empty Origin on a same-site browser form POST under the previous referrer policy. Switching to strict-origin restored the same-origin check while keeping URL paths out of referrers. Six worker tests exercised optional WhatsApp delivery with a mock provider. No external messages were sent.

## Visual redesign verification

The redesigned build passed 15 Chromium Playwright tests and 14 Node tests. The tests exercised the multi-step English/Kannada booking flow, server validation, competing requests, localized search, service preselection, gallery viewing, mobile navigation, staff permissions and a database failure. ESLint passed across JavaScript sources. TypeScript's strict JavaScript check passed for the catalogue search and gallery viewer in `public/patient-tools.js`. The server remains JavaScript.

The Docker image built with production dependencies. A fresh container returned HTTP 200 for health, home, Kannada treatments, the English booking form, staff login, page CSS and the homepage illustration. The dependency audit reported zero known vulnerabilities. These checks used local fixtures and do not establish an independent security assessment of a live deployment.

See the [visual audit](design-review/README.md) and the [before-and-after screenshot index](design-review/SCREENSHOTS.md). The source website returned HTTP 403 from this environment, so comparison used the captured local baseline and the clinic information already available in the repository. Actual clinic imagery, qualifications, offered treatments and appointment hours still need clinic verification.

## Visual redesign regression run

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `PLAYWRIGHT_PORT=3220 npm test` | 15 passed |
| `node --test tests-unit/*.test.mjs` | 14 passed |

The Chromium run covered the complete booking wizard, switching languages mid-booking, catalogue search, selecting a treatment from its detail page, and receptionist confirmation through the responsive staff table. It checked layout widths of 320, 390, 768, 1024, 1137 and 1440 pixels and ran axe on the Kannada booking entry page. The Node tests also verified the localized database error screen and that demo data stays out of the configured clinic database. The [visual review](design-review/README.md) describes the baseline and changes. The [screenshot index](design-review/SCREENSHOTS.md) includes both locales and the staff interface.
