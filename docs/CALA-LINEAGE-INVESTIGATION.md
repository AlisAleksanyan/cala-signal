# Cala lineage and constraint-drift investigation

## Decision to investigate

Can CALA SIGNAL safely promote a company to `verified_match` when Cala returns dynamic structured rows and separate sourced explainability, without allowing missing facts, contradictory evidence, ambiguous funding units, unsafe origins, or taxonomy drift to appear as a qualified lead?

## Required invariants

1. Every `verified_match` has known, compliant founding year and disclosed funding, demonstrable geography and sector fit, at least one safe HTTPS source, and no relevant Cala conflict.
2. A known failure of any hard criterion is `outside_thesis`; only unknown or unresolved criteria are `needs_verification`.
3. Funding values such as `€500,000`, `€1,000,000`, `€2.5M`, `250k`, and numeric base-unit values cannot be inflated by unit ambiguity.
4. Future dates do not earn freshness credit.
5. A displayed evidence claim is company-relevant, concise, source-backed, and linked to an HTTPS origin whose hostname is visible.
6. Source-less context, provider dumps, raw narrative, identifiers, prompts, and diagnostics never enter the customer response.
7. Evidence-readiness points reward sourced evidence rather than mere field presence.

## Investigation tasks

- Trace each invariant from provider normalization through ranking, evidence linking, API minimization, and UI rendering.
- Construct adversarial examples for alias collisions, geography and sector mismatches, missing values, conflicts, funding formats, future dates, unsafe URLs, and multi-company source context.
- Identify any path that can create a false verified match, misattribute a source, overcount evidence receipts, or leak provider/development material.
- Distinguish confirmed defects from residual operational risks such as isolate-local rate limiting.
- Finish with a compact go/no-go verdict and file/line evidence for every actionable finding.
