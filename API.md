# HTTP interfaces

The patient interface uses same-origin HTML forms. Both locale prefixes support the same routes and actions. Treat authenticated staff routes as browser interfaces tied to the app release.

| Interface | Behavior |
| --- | --- |
| `GET /` | Redirects to a remembered language or English |
| `GET /{en,kn}/…` | Renders localized patient pages |
| `GET /{en,kn}/book-appointment` | Renders the appointment form and clinic availability controls |
| `POST /{en,kn}/book-appointment` | Accepts a URL-encoded form, validates consent and fields, and attempts to reserve a slot |
| `GET /{en,kn}/slots?date=YYYY-MM-DD` | Returns a JSON array of available local times in the `slots` field |
| `GET /{en,kn}/appointment-status` | Looks up minimal status information using an opaque reference |
| `POST /{en,kn}/appointment-status` | Allows cancellation or opt-out through the original booking browser's management cookie |
| `/admin/…` | Staff login and authorized actions |
| `GET /sitemap.xml` | Returns public indexable routes |
| `GET /healthz` | Provides a health check for hosting and monitoring |

Booking success redirects the patient to a localized status page. A retry with the same request identity and equivalent booking data retrieves the original reference. Tampered or stale slot selections are checked against the active schedule during reservation. The supplied reference must remain private. Public status does not include patient contact details, and appointment actions require the separate management cookie.
