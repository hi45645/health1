# Disaster recovery

Target a recovery point of 24 hours with successful daily backups and a recovery time of 4 hours after access and a compatible app image are available. These are planning targets to measure in a drill. The clinic owner controls the domain, host, backup destination, authenticator recovery, and emergency contacts.

1. Pause writes by taking the affected app out of service. Direct patients to the clinic phone using an approved fallback.
2. Record incident times and symptoms without exporting patient data into tickets. Preserve logs, deployment identifiers, the database, and its sidecars with access restrictions.
3. Identify the last trustworthy snapshot. Follow [BACKUP_RESTORE.md](BACKUP_RESTORE.md) on isolated storage.
4. Verify health, both languages, staff authentication, the schedule, and sample status lookups using synthetic data where possible. Reconcile post-snapshot requests with staff.
5. Restore service, monitor error rates, and document the timeline and the next preventive action.

| Scenario | First response |
| --- | --- |
| Accidental deletion or corruption | Stop writes and recover a known-good snapshot |
| Failed deployment | Roll back to a compatible earlier release and verify the database before resuming |
| Hosting outage | Follow the provider incident updates and prepare a new app on owner-controlled persistent storage |
| Lost staff access | Use the clinic's verified recovery process and invalidate the prior user's sessions |
| Compromised credentials | Disable affected accounts, rotate credentials and secrets, and audit staff actions |
| Domain expiration | Renew through the owner account, verify DNS and certificates, and confirm access alerts |
| Notification outage | Switch clinic follow-up to phone and reconcile requests against the staff inbox |
| Suspected patient data exposure | Restrict access, preserve evidence, and assess applicable notification duties with the clinic's legal adviser |
