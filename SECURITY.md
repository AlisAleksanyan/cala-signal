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
| Browser → `/api/scout-token` | origin and client identity | no-store response, trusted `cf-connecting-ip`, short-lived HMAC-signed token bound to a hashed client key |
| Browser → `/api/scout` | token, origin, content type, body size, JSON shape, brief text | valid IP-bound token, same-origin POST, JSON-only, 4 KB cap, normalization, length validation, atomic D1 quota |
| App → OpenAI | investor brief | fixed developer instructions, strict JSON Schema, no storage, timeout |
| OpenAI → app | structured thesis | independent enum, type, range, count, and length validation |
| App → Cala | compiled query | generated exclusively from validated allowlisted fields; fixed return-field request |
| Cala → app | dynamic JSON rows, text, URLs | runtime shape filtering, bounded arrays/strings, HTTPS-only URL parser, React text escaping |
| App → browser | shortlist and evidence | same-origin CSP, no-store JSON, generic errors, no upstream payload leakage |
| Git / Entire | source and checkpoint transcript | `.env*` ignored; never place keys, personal data, or private links in prompts or commits |

## Abuse cases explicitly handled

- Oversized, non-JSON, malformed, or too-short requests
- missing, invalid, expired, or differently IP-bound scout tokens
- concurrent provider-credit requests beyond two runs per hashed client per fixed ten-minute window
- Prompt text attempting to create arbitrary Cala syntax
- Out-of-range model values or unsupported enums
- Cala rows with alternate field names, missing fields, duplicate companies, unsafe URLs, or extreme values
- provider timeout, provider rate limiting, missing keys, and empty structured results
- browser framing, unintended capabilities, MIME confusion, and referrer leakage
- accidental secret inclusion in rendered HTML
- accidental publication of development provenance or reviewer diagnostics in the customer UI

## Known residual risk

- Provider access fails closed if D1, `SCOUT_TOKEN_SECRET`, or the trusted Cloudflare client-IP header is unavailable. D1 enforces the quota globally for the deployment with an atomic upsert. Origin checks remain defense in depth and are not treated as authentication.
- The fixed ten-minute D1 windows can allow two requests near the end of one window and two more at the start of the next. A rolling window or Turnstile is an optional stricter control after the event.
- Quota rows are not yet pruned automatically; add a scheduled retention cleanup if the public demo remains online long term.
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
- [ ] public HTML contains no development provenance or reviewer-diagnostic wording
- [ ] Cala and OpenAI error paths tested without returning upstream bodies
