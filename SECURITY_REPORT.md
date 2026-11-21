# Security report

The source includes role checks for staff operations, server-side booking validation, SQLite conflict controls, opaque status references, localized content approval controls, and private database snapshots. These controls require normal deployment configuration to work as intended.

The authentication unit test used synthetic credentials and passed locally. The SQLite backup test exercised uncheckpointed WAL data, verified that a subsequent write was excluded from the original snapshot, and checked restore and overwrite refusal. This is a local test with synthetic data. See the test report for other executed checks.

A production security review remains outstanding. Verify TLS and proxy limits, staff enrollment and recovery, origin and CSRF behavior, logs without patient data, volume encryption, backup access, and retention. Review dependency alerts and scanner results for the exact deployed revision. Do not extrapolate local automated checks to independent penetration test or production assurance.

The final npm production dependency audit reported zero known vulnerabilities. Rendered staff login and logout were exercised after switching the referrer policy to strict-origin. Package verification in the container build used a trusted CA supplied as a BuildKit secret.
