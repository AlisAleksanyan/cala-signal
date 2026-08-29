# Review map

## Customer outcome

**One sentence:** CALA SIGNAL turns an investor’s natural-language thesis into a source-backed decision workspace that separates qualified leads from companies requiring verification and companies excluded by known facts.

**Audience:** early-stage investors, accelerators, corporate venture and innovation teams, and ecosystem operators.

**Value:** faster first-pass sourcing without hiding uncertainty or turning internal implementation evidence into customer-facing clutter.

## Customer experience

- The first viewport names the audience, problem, and result: a source-backed startup shortlist in about a minute.
- One textarea and descriptive thesis presets keep the workflow focused.
- The outcome preview emphasizes Qualified leads, Verification queue, and Evidence receipts.
- Results lead with a thesis summary and three explicit decision groups.
- Zero verified matches is stated plainly.
- Company cards contain status, Evidence readiness, location, founding year, funding, latest signal, missing/failed criteria, and useful sources.
- The deterministic breakdown remains available behind a disclosure.
- Copy shortlist creates a client-side plain-text memo from the visible result.
- Customer-facing pages contain no development provenance, source-control, security-vendor, revision, session, usage, or provider-diagnostic material.

## Qualification correctness

| State | Deterministic boundary |
| --- | --- |
| Verified match | Known compliant founding year and funding, plus demonstrable geography and sector fit |
| Needs verification | Any hard criterion is unknown or not demonstrably matched |
| Outside thesis | Known founding year is too early or known funding exceeds the ceiling |

Qualification never depends on the Evidence readiness score. Tests cover the verified path, missing founding year/funding, and both known exclusion boundaries.

## Cala depth

| Cala capability | Customer use |
| --- | --- |
| `knowledge/query` | Structured fields for company facts and deterministic qualification |
| `knowledge/search` | Supporting context, explainability, and matching company mentions |
| Context references | Reconcile an explanation claim with the context that supports it |
| Safe origins | Link a claim only when a bounded HTTPS origin is returned |
| Missing/conflicting evidence | Keep unresolved criteria and provider-stated conflicts visible |

Both knowledge requests run in parallel. Context, origins, explainability, references, entities, and provider text are bounded before use. Provider Markdown and HTML are rendered only as escaped text.

## Production safeguards

- strict structured planning plus independent runtime validation
- bounded server-side Cala query compiler
- JSON-only 4 KB request cap and 24–600-character thesis limit
- per-client request bucket
- provider timeout, client abort, sibling cancellation, and listener cleanup
- HTTPS-only URL normalization
- generic `no-store` API errors with no provider payload leakage
- restrictive browser security headers
- focused build/render/API/qualification/evidence/cancellation tests

## Development evidence separation

Entire evidence is deliberately kept out of the customer product. Review trails, historical implementation rationale, and experimental workflow notes live in the Entire profile and [ENTIRE-LABS.md](./ENTIRE-LABS.md). The removed public snapshot and its component, tests, and styles are not part of the shipped customer experience.

Security-scanner evidence and repository review material likewise belong in reviewer-facing systems and documentation, not in the customer UI.
