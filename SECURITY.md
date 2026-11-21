# Security and operations

Serve production traffic over HTTPS. Set `SITE_ORIGIN` to the canonical HTTPS origin, use an HTTPS reverse proxy, and keep the app port private. Route only necessary traffic and configure conservative request and login limits on the proxy. Disable or redact query-string logging at the proxy and any intermediary. Patient status references and appointment-dashboard free-text searches may contain sensitive information.

Use individual staff accounts and strong unique passwords. All staff accounts require an authenticator code at sign-in. Passwords are salted and hashed with scrypt. Use the production `STAFF_ENCRYPTION_KEY` to encrypt authenticator seeds at rest. Staff sessions use a server-stored token hash, an eight-hour maximum lifetime, a 30-minute idle timeout, and a strict HTTP-only cookie. Enroll each user through a trusted channel and keep account recovery under clinic ownership. Review access at staffing changes. The appointment dashboard handles patient information and should only be available to clinical staff who need it. Content editing and medical approval are separate permissions.

Protect and monitor the SQLite volume, backups, and any environment secrets. Keep them out of source control and restrict their access to the service identity and approved operators. Enable storage and backup encryption through the host. Application-level encryption of the database file is outside the current design.

Use a private channel to report potential security issues to the clinic owner. Include the affected version, where the issue occurs, and a description without submitting patient information or credentials. Follow [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md) for response and contact procedures.
