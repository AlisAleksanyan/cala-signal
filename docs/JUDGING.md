# Judge map

## Main-track thesis

**One sentence:** CALA SIGNAL turns an investor's natural-language opportunity thesis into a traceable Cala search and an inspectable ranked startup shortlist.

**Who pays:** early-stage investors, corporate venture teams, accelerators, and ecosystem operators who repeatedly source companies against a narrow mandate.

**What they buy:** faster first-pass sourcing with an evidence trail and a visible due-diligence queue.

**Why it matters:** the time saved is not creating a list; it is eliminating false confidence and making the first shortlist reviewable by the rest of the team.

## Creativity

- The skyline is not a vanity chart: its shape comes from a disclosed evidence-quality model.
- Missing data is a first-class output, not hidden behind prose.
- One thesis produces both a computed shortlist and a source ledger.

## Technical complexity

- strict OpenAI Structured Output and independent runtime validation
- bounded server-side Cala query compiler
- concurrent use of Cala structured and sourced endpoints
- tolerant normalization of dynamic Cala row schemas
- entity matching and deterministic multi-factor ranking
- rate limit, input/body constraints, timeouts, safe URL parsing, generic failures, no-store responses, and browser security headers
- 13 passing build/render/API-negative-path tests, including timeout, pre-abort, mid-flight abort, and listener-cleanup coverage for OpenAI and Cala, plus Cala sibling cancellation

## Cala depth

| Cala capability | Product use |
| --- | --- |
| `knowledge/query` | typed rows for the score and company cards |
| `knowledge/search` | narrative, KnowBits, entities, and explainability |
| entity IDs | traceable company identity |
| context IDs | evidence ledger and audit reference |
| natural-language input | compiled bounded search without brittle custom query syntax |

## Aikido evidence target

- 0 critical, high, medium, and low findings on the exact public default-branch revision
- no ignored findings used to manufacture the score
- dependency/SCA, SAST, secrets, IaC, licenses, and malware scanners completed
- committed lockfile and public scan screenshot showing repository + revision + timestamp
- local `npm audit --audit-level=low` and test output as supporting, not substitute, evidence

## Entire evidence target

- checkpoints named for decisions, not generic “progress”
- one Labs review focused on the untrusted-input → OpenAI → compiler → Cala boundary
- review findings addressed, then a clean follow-up trail
- `entire blame` on the plan-validation/compile line
- `entire why` explaining why raw user input cannot become a Cala query
- no credentials, PII, private URLs, screenshots, or unrelated conversation in public checkpoints

## Submission one-liner

> CALA SIGNAL finds overlooked startups from a plain-English investment thesis, then shows every Cala-backed fact, missing field, and scoring decision behind the shortlist.

## Short description

> Investors should not have to choose between an opaque AI answer and a raw database export. CALA SIGNAL uses OpenAI Structured Outputs to convert a sourcing thesis into a constrained plan, compiles a safe Cala request, retrieves both structured company rows and traceable evidence, and ranks candidates with deterministic math. Every score is inspectable, every missing fact loses points, and every result ends in a due-diligence queue.
