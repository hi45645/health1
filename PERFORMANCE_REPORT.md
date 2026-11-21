# Performance report

Public pages are server-rendered and need no hydration or translation API. Assets are served from the app origin. The checked-in hero image is about 99 KiB in WebP. The Kannada font is about 89 KiB in WOFF2. A local HTTP smoke test using a fresh database returned 200 for both languages and assets. The response sizes below are uncompressed HTML bytes. No production performance measurements have been taken.

| Page | English | Kannada |
| --- | ---: | ---: |
| Home | 5,136 | 7,937 |
| Treatment listing | 4,149 | 6,036 |
| Appointment form | 5,614 | 8,208 |

Before launch, measure the home, services, and booking pages under mobile conditions in both languages. Capture Lighthouse results and field Core Web Vitals where available. Proposed targets are LCP within 2.5 seconds, INP within 200 ms, and CLS at most 0.1 at the 75th percentile. Record the device, throttling and hosting settings with the measurements. Retry after approving content because additional layout and images can change loading behavior.

A local English homepage run using Lighthouse 13.6.0, Chromium headless, and the default simulated mobile profile scored 99 for performance, 100 for accessibility, 96 for best practices and 100 for SEO. Largest Contentful Paint was 2.0 seconds and Cumulative Layout Shift was 0. This run used a fresh local database and the illustrative homepage image. Production networking, approved gallery media, and actual patient devices can change these results.
