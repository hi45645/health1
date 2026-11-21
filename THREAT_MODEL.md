# Threat model

Assets include patient contact details, appointment records and references, staff accounts, doctor-approved medical content, the clinic domain, and backups. Trust boundaries include patient browsers, staff browsers, the HTTPS proxy, the application, and host storage.

| Threat | Design control | Operating control |
| --- | --- | --- |
| Patient record disclosure | Minimal public status and random appointment references | Restrict clinic dashboard access, remove query strings from request logs, and encrypt volumes and backups |
| Duplicate or overlapping requests | Transactional reservation, unique request keys, and interval triggers | Monitor booking failures and confirm schedule changes before opening bookings |
| Staff takeover | Staff authentication and role checks | Authenticator enrollment, rate limits, protected recovery, and rapid revocation |
| Unreviewed medical copy | Separate localized drafts and doctor-controlled publication | Review clinical copy in both languages and record clinic sign-off |
| Incorrect or stale availability | Server recheck for every reservation and reschedule | Keep hours and blocked dates up to date |
| Storage loss | Consistent online snapshot and verified fresh-file restore | Schedule encrypted off-host copies and practice recovery |
| Browser or session data exposure | Tab-scoped draft storage, encoded rendering, and limited public status | Close shared-browser tabs and configure HTTPS |
| Service interruption | Health check and single app deployment | Monitor uptime, resource limits, domain expiration, and backup alerts |

Review this model whenever appointment fields, staff permissions, notifications, analytics, or hosting change.
