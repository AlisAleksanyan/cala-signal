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

## Public-product rule

Future customer UI work should preserve this boundary:

- show Cala-backed company facts, evidence claims, source origins, and explicit uncertainty;
- keep development provenance and reviewer diagnostics in the Entire profile and repository docs;
- never expose credentials, full prompts, transcripts, emails, local paths, private links, raw commands, or internal identifiers through the public application.

This separation makes the product legible to customers while preserving detailed development evidence for reviewers who deliberately seek it.
