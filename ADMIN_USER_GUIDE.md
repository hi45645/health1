# Admin user guide

Sign in at `/admin` using a named account issued by the clinic owner. Keep the authenticator private and sign out before leaving a shared computer.

## Access and recovery

| Role | Typical work |
| --- | --- |
| Owner | Manage staff accounts, clinic profile, and operating configuration |
| Doctor | Review and approve both languages, configure availability, and manage appointments |
| Receptionist | Review patient requests and create phone or walk-in bookings |
| Editor | Maintain drafts for doctor review |

The owner manages accounts at `/admin/staff`. Use an authenticator enrolled for the account. Use `/admin/password` to change your password. The account menu can revoke or reset another staff member's access.

## Bilingual content

1. Choose English or Kannada from the content tabs.
2. Edit and save the draft for that locale. Compare treatment and FAQ wording against the other language and check clinical meaning.
3. Have a doctor review and approve the saved draft. Publish both languages for the first release. Editing a draft keeps the last approved public version active.
4. Open the localized public pages and verify the wording after approval.

## Schedule and appointments

Open the appointment dashboard at `/admin/appointments`. The owner or doctor can configure recurring working periods, closure dates, appointment length, booking horizon, pending expiry, and the patient cancellation deadline. Enter working periods as a JSON array of objects, such as `[{"day":1,"start":"09:00","end":"12:00"}]` for a Monday morning. Sunday is day 0, and Saturday is day 6. Use a JSON date array such as `["2027-01-01"]` for full-day closures. Treat times as India Standard Time. Where multiple periods exist on a day, leave gaps for breaks. Verify one open day and one blocked date in both languages after changes.

Review new requests in the appointment dashboard. Contact the patient to agree on a slot, then confirm the appointment. Record staff-entered meetings using the same schedule rules. Use the reschedule action to keep the previous slot in the change history. The queue lists patient updates for staff follow-up by phone. Record contact after reaching the patient. Owners and doctors can export aggregate-safe schedule reports through the filtered appointments view. Share the reference directly with the patient and close requests using the appropriate status. Do not share patient information or internal notes through public channels.
