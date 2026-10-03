# ADR 004 — Hosting deferred

On 2026-10-03 the owner instructed: “do not consider hosting for now”.
Provider selection, budget, provisioning, deployment, and staging verification
are deferred by this explicit scope amendment. No provider or budget is invented.
Local implementation can proceed; Phase 1 is not staging-verified or released.
Future deployment requires HTTPS, explicit proxy trust, separate SMTP/data,
one long-running Node.js process, and persistent local disk outside releases.
