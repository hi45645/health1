# SEO migration

Use the existing clinic domain after the owner approves the cutover. Preserve indexed URLs with direct permanent redirects. No live redirect migration has been verified.

1. Export the current site's public URL list, sitemap, top landing pages and inbound links through authorized tools.
2. Map each URL to the closest new page. Use the English route where the legacy content was English. Return a normal 404 for pages with no appropriate replacement.
3. Configure the map at the proxy. Keep one-hop 301 or 308 redirects, and preserve only query parameters that have a public use. Do not redirect personal booking data or status tokens from the old site.
4. Set `SITE_ORIGIN` to the canonical HTTPS host. Validate self-canonical URLs, reciprocal English and Kannada hreflang, and sitemap inclusion of only currently public pages. Confirm status and login pages stay out of indexing.
5. Verify the redirects and new sitemap before routing traffic, then submit the sitemap in the owner's search console. Update the clinic's business profile and monitor coverage, 404s and conversions after launch.

| Legacy purpose | Planned landing page |
| --- | --- |
| Home | `/en/` |
| Clinic information | `/en/about` |
| Treatment listing | `/en/services` |
| Booking | `/en/book-appointment` |
| Phone, map, address | `/en/contact` |

Confirm exact legacy paths against the exported URL inventory. International alternatives should use content-equivalent Kannada pages where available.

The cloud network returned HTTP 403 during the HTTPS CONNECT request to the existing clinic domain. No historical paths could be confirmed. After obtaining the inventory, populate `redirects.json` with exact legacy path to localized path pairs and restart. The server validates destinations and sends a one-hop 308. Search Console domain verification normally uses an owner-controlled DNS TXT record. After verifying ownership, submit `/sitemap.xml` and inspect both locales.
