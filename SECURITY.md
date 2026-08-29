# Security and trust model

## Assets

- OpenAI and Cala API credentials
- event-provided API credit
- integrity of the ranked shortlist
- availability of the public demo
- public repository and Entire checkpoint history

## Trust boundaries

| Boundary | Untrusted input | Control |
| --- | --- | --- |
| Browser → `/api/scout` | content type, body size, JSON shape, brief text | JSON-only, 4 KB cap, normalization, length validation, per-client rate bucket |
| App → OpenAI | investor brief | fixed developer instructions, strict JSON Schema, no storage, timeout |
| OpenAI → app | structured thesis | independent enum, type, range, count, and length validation |
| App → Cala | compiled query | generated exclusively from validated allowlisted fields; fixed return-field request |
| Cala → app | dynamic JSON rows, text, URLs | runtime shape filtering, bounded arrays/strings, HTTP(S)-only URL parser, React text escaping |
| App → browser | shortlist and evidence | same-origin CSP, no-store JSON, generic errors, no upstream payload leakage |
| Git / Entire | source and checkpoint transcript | `.env*` ignored; never place keys, personal data, or private links in prompts or commits |

## Abuse cases explicitly handled

- Oversized, non-JSON, malformed, or too-short requests
- Prompt text attempting to create arbitrary Cala syntax
- Out-of-range model values or unsupported enums
- Cala rows with alternate field names, missing fields, duplicate companies, unsafe URLs, or extreme values
- provider timeout, provider rate limiting, missing keys, and empty structured results
- browser framing, unintended capabilities, MIME confusion, and referrer leakage
- accidental secret inclusion in rendered HTML

## Known residual risk

- The demo rate limiter is local to a Worker isolate and is not a substitute for a distributed quota service.
- Cala source data can be incomplete or stale; the UI exposes dates, source references, missing fields, and caveats rather than asserting certainty.
- CSP permits inline scripts/styles because the framework requires them for the current build. All executable assets remain same-origin.
- Third-party provider behavior and availability are outside this repository's control.

## Pre-submission verification

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm audit --audit-level=low` → 0 findings
- [ ] Aikido full repository scan → 0 critical/high/medium/low if achievable, no hidden/ignored findings
- [ ] secret scan includes current files and Git history
- [ ] production response headers verified
- [ ] `.env.local` remains untracked
- [ ] public GitHub repository contains no secrets, PII, private event links, or generated build output
- [ ] Entire trail contains only public-safe prompts and intentional checkpoints
- [ ] Cala and OpenAI error paths tested without returning upstream bodies
