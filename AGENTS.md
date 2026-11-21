# Clinic development

Use the existing checkout and Node 24. Keep fixture credentials and fictional appointments in isolated test databases. Run the browser suite with `npm test` and the SQLite restore test with `node --test tests-unit/*.test.mjs`. Review both locale routes whenever making a public content or layout change. Preserve existing databases through additive or transactionally checked migrations. Never seed production with verified doctor credentials, services, availability, fees, or patient records.
