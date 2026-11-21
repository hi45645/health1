# Database

The application uses SQLite on a persistent local volume. Enable backups before accepting patient information. Use one app deployment per database. SQLite locking coordinates writers on a local filesystem.

- `content` stores the locale, draft and published JSON, and approval timestamp. The checked-in catalog provides seed drafts.
- `appointments` stores the booking reference, contact and consent information, local date and time, status, duration, source, service, expiry, and request identity. The request key has a uniqueness constraint.
- `booking_schedule` stores the single active schedule with weekly working periods, blocked dates, and booking rules.
- `appointment_events` records scheduling and staff changes, including old and new times on reschedule.
- `appointment_messages` stores the staff follow-up queue. `appointment_tokens` and `appointment_contact` store browser management token digests and contact preferences.
- `staff`, `staff_sessions`, `staff_failures`, and `staff_audit` store account, session, throttling, and audit state.
- `clinic_services` and `clinic_service_translations` store the treatment catalogue, its translations, and publication state.
- `clinic_profile`, `gallery_images`, and `daily_activity` store clinic configuration, processed gallery media, and aggregate counts.

Dates and slot times use the clinic calendar in Asia/Kolkata. Expiry is stored as epoch milliseconds and SQLite current timestamps use UTC. Treat a slot as a half-open interval, meaning the end of one appointment may be the start of the next. Pending and confirmed bookings occupy their intervals. Availability and reservation checks run server-side, and SQLite triggers reject overlapping inserts and updates. The application acquires a write transaction before reading availability and writing the reservation.

Application startup applies checked-in schema initialization and upgrades. Before upgrading, take a verified snapshot and run the upgrade with a restored copy. Inspect legacy data for existing overlaps and contacts that need follow-up. See [BACKUP_RESTORE.md](BACKUP_RESTORE.md).
