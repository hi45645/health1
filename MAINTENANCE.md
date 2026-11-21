# Maintenance schedule

| Cadence | Clinic operator task |
| --- | --- |
| Daily | Check new requests, expired holds, health alerts, and backup completion |
| Weekly | Confirm opening periods and upcoming closures, inspect error trends, and review dependency alerts |
| Monthly | Restore a recent backup in isolation, verify both languages and a synthetic request, and review data retention |
| Quarterly | Review staff and infrastructure access, confirm recovery contacts, and refresh content approved by the doctor |
| Before release | Pass CI, test migrations against a restored snapshot, and verify mobile English and Kannada routes |
| Before renewal | Confirm the hosting plan, domain registration, certificate renewal, backup quota, and owner billing access |

Assign an owner and backup contact for each task. Escalate production errors or missed backups to those contacts. Apply dependency updates in reviewed pull requests after checks pass.
