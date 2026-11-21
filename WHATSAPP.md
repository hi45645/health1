# WhatsApp appointment updates

The clinic can publish a verified click-to-chat number through the clinic profile. Automated appointment updates use a separate worker and run independently of the website and booking system.

## Authorize the templates and sender

1. Set up the clinic's WhatsApp Business Account and approved sending phone number on the WhatsApp Business Platform.
2. Create and obtain Meta approval for appointment confirmation, cancellation and rescheduling templates in English and Kannada. Each template must use exactly two positional body variables, the date as `YYYY-MM-DD` and the time as `HH:MM` in India time. Keep the template text neutral. Include only the clinic name, appointment status, time zone and guidance for opting out through the appointment management page.
3. Set `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_GRAPH_VERSION` in the worker's secret configuration. Use a supported Graph API version from the clinic's Meta integration. A template name goes in each relevant `WHATSAPP_TEMPLATE_CONFIRM_EN`, `WHATSAPP_TEMPLATE_CANCEL_EN` or `WHATSAPP_TEMPLATE_RESCHEDULE_EN` setting. Use the corresponding `_KN` keys for Kannada. If the English template uses a specific regional language code, set `WHATSAPP_LANGUAGE_EN`. Leave unapproved template settings empty.

[Meta documentation for sending messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages)

## Run the worker

Set `DB_PATH` to the same database used by the site. Start the website once to initialize booking and then run from the checkout or an equivalent container with that database mounted.

```bash
node --env-file-if-exists=.env scripts/send-whatsapp.mjs
```

Run this command periodically through the deployment scheduler, for example once per minute. Its default batch size is 25 messages. Configure HTTPS egress to `graph.facebook.com` for the worker and restrict access to its credentials and database. With all provider settings empty, the worker exits successfully without touching the queue. Avoid real recipients outside approved production use. The test suite injects an HTTP mock.

Patients opt in separately when requesting an appointment and can opt out through the appointment management link. The worker checks this preference immediately before claiming the latest eligible change. Events older than 24 hours remain outside the automated queue. The worker sends only the destination number, template name, appointment date and time. It includes no patient name, treatment, symptoms or reference in template parameters.

## Review dispatch status

The appointment inbox remains available for manual follow-up. The worker records WhatsApp API acceptance separately from the staff-contacted record. API acceptance indicates submission. Recipient delivery and read receipts require an independently configured webhook.

- `accepted` records the API message ID for reconciliation.
- `retry` waits for backoff after an explicit provider rate-limit rejection, with at most three total attempts.
- `failed` or `suppressed` records a definitive failure, withdrawal of consent or another change in eligibility. Review the booking before any manual outreach.
- `uncertain` records a missing acknowledgment or lost worker lease. Verify the provider outcome before any manual follow-up. The worker excludes these from automatic resubmission.

Keep the worker paused during database recovery. Reconcile dispatch records for events after the restored snapshot before allowing it to send again. Monitor the clinic's channel for direct opt-out requests and apply the patient's preference in the booking records before further contact.
