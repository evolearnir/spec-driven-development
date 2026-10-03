# ADR 003 — Authentication policies

Accepted by the requesting product owner 2026-10-03.

Development amendment approved by the owner on 2026-10-03: verification/resend
skip SMTP when NODE_ENV=development and print the token/code and confirmation
URL in the terminal. Confirmation is still required. This is a development-only
exception to redacted logging; production/test verification and all recovery
continue using SMTP without logging tokens. Persistent storage still holds hashes.

- Argon2id passwords, 12–128 characters; public registration is active/unverified/user.
- Sessions have a fixed 7-day expiry, regenerated on login; HttpOnly, SameSite=Lax,
  Secure in HTTPS environments. Current role/status is reloaded on every request.
- Random 32-byte verification/reset tokens are hashed with SHA-256 at rest.
  Verification expires after 24 hours; reset after 1 hour. Single-use consumption
  and password replacement happen in immediate transactions.
- Resend replaces outstanding verification tokens. Password reset invalidates
  outstanding resets and revokes every session. Delivery failure never rolls back
  registration and offers authenticated resend.
- The maintained csrf-sync package implements the synchronizer pattern (the npm
  package named synchronizer is unrelated). Session-backed CSRF protects all POST routes. Token GETs only show
  confirmation forms. No remote assets or token-bearing request logging.
- Auth mutations: 10 requests/15 minutes/IP; recovery/resend: 3/hour/IP.
  In-memory rate limits reset on process restart; one process only.
- Bootstrap uses protected environment credentials and explicit operator attestation
  of email ownership (BOOTSTRAP_EMAIL_VERIFIED=true). Repeat runs do not change
  passwords. No public bootstrap route.
