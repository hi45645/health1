# Known limitations

- Clinic details, including practitioner credentials, hours, and patient terms, require owner verification. Medical drafts require doctor approval in both languages before release. There is no evidence of formal clinical sign-off in this checkout.
- The current deployment design uses one persistent local SQLite database. A managed PostgreSQL deployment, multi-region replication, and high availability are outside the implementation.
- Production infrastructure, secrets, off-host backup storage, external monitoring, and DNS cutover require clinic-owned accounts. The provided restore check used local synthetic data.
- Patients who no longer have their booking browser's management cookie should call the clinic for changes. A reference can show minimal status but grants no authority to change a booking.
- The optional WhatsApp worker requires approved templates, consent and provider credentials. Its tests use a mock provider. Live acceptance and delivery remain unverified.
- The included local checks do not establish real-device assistive technology performance, field Core Web Vitals, or production security assurance.
