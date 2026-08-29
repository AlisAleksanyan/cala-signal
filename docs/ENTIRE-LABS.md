# Entire evidence boundary

Entire is used as repository-development evidence, not as a customer product feature.

## Deliberate separation

The customer experience is dedicated to investor sourcing. It does not display Entire trails, checkpoints, sessions, commands, revisions, authorship, usage measurements, or review diagnostics. The previous public Build Passport snapshot, component, tests, and styles were removed as dead customer-facing code.

Reviewer evidence remains available in two appropriate places:

1. the project’s Entire profile, where the underlying development trail can be inspected in context;
2. repository documentation, where the evidence boundary and selected workflows can be explained without entering the shipped application.

No Entire credential, API call, command execution, or transcript is part of the runtime application.

## Repository workflows retained as evidence

The recorded development history includes uses of review, provenance lookup, attribution, expert routing, usage analysis, and checkpoint search. These workflows remain useful for understanding why security and correctness boundaries exist, but they are intentionally not represented as an investor-facing dashboard.

The relevant historical closure loop includes:

- a review that identified runtime and cancellation-coverage gaps;
- focused changes that addressed those findings;
- a follow-up review that found no remaining actionable issue in that scope.

The current repository also defines a `launch-readiness` Entire Review profile. It asks separate reviewers to audit customer activation, Cala evidence lineage, hard-constraint truthfulness, public/development separation, abuse resistance, accessibility, and regression coverage, then consolidates their findings into a trail.

For a second experimental workflow, [CALA-LINEAGE-INVESTIGATION.md](./CALA-LINEAGE-INVESTIGATION.md) is a reusable Entire Investigate seed. Multiple agents can test the product's qualification invariants and constraint-drift cases against one shared findings document instead of producing disconnected reviews.

## Public-product rule

Future customer UI work should preserve this boundary:

- show Cala-backed company facts, evidence claims, source origins, and explicit uncertainty;
- keep development provenance and reviewer diagnostics in the Entire profile and repository docs;
- never expose credentials, full prompts, transcripts, emails, local paths, private links, raw commands, or internal identifiers through the public application.

This separation makes the product legible to customers while preserving detailed development evidence for reviewers who deliberately seek it.

## Final launch audit (2026-08-29)

This audit is limited to customer-trust controls verifiable in the current repository; it does not establish live-provider or deployed-environment behavior.

- **Source-backed hard-criterion qualification:** Structured candidate rows begin in `needs_verification`. `linkEvidenceToCompanies` promotes a candidate to `verified_match` only when founding year, funding, geography, and sector all match and each is supported by company-relevant Cala context with a safe HTTPS origin. A source-supported failure produces `outside_thesis`; conflicting evidence stays in verification.
- **Direct-context receipt boundary:** Explainability can prioritize referenced Cala context, but it cannot supply a hard fact or become a receipt by itself. Customer evidence claims are deduplicated direct-context excerpts whose safe origin supports a hard criterion or reports a relevant conflict; unsupported, unrelated, malformed, non-HTTPS, and cross-company material is excluded.
- **Signed, IP-bound shortlist tokens:** The same-origin token route hashes the trusted client IP and issues a 60-second HMAC-SHA-256 token containing the client binding, expiry, and nonce. The shortlist route verifies the signature, lifetime, and client binding before provider work, rejects missing, malformed, expired, or differently bound tokens, and fails closed when required protection bindings are absent.
- **Atomic D1 quota enforcement:** `takeD1Quota` performs one `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` statement against the `(client_key, window_start)` primary key. The returned counter enforces two runs per ten-minute fixed window, and the local concurrency test admits the first two attempts and rejects the third.
- **Local quality gates:** `npm test` completed the production build and passed 38/38 tests; `npm run lint` and `npm run typecheck` exited successfully without diagnostics. `npm audit --audit-level=low` passed with 0 vulnerabilities. `git diff --check` exited successfully without output.
