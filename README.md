# CALA SIGNAL

**Source-backed startup sourcing for early-stage investors, accelerators, and corporate venture teams.** Describe one investment thesis in plain English; CALA SIGNAL returns qualified leads, a verification queue, and known exclusions with the evidence needed to review each decision.

## Customer problem

Startup discovery often ends as either a confident AI list with weak proof or a database export that still needs manual triage. A sourcing team needs to know which companies demonstrably match the mandate, which might match but have unresolved hard facts, and which are ruled out by known facts.

CALA SIGNAL makes that distinction explicit. Unknown founding year or funding never passes as qualified, and a company with a known out-of-range year or funding total is never presented as a match.

## Product workflow

1. **Describe the thesis** — one natural-language brief sets sector, geography, founding-year threshold, funding ceiling, and useful momentum signals.
2. **Cala resolves companies and evidence** — structured company rows and sourced search run in parallel.
3. **Review the decision workspace** — candidates are separated into Verified matches, Needs verification, and Excluded by known facts.
4. **Share the shortlist** — a client-side action copies a concise plain-text memo containing only the visible decision facts and source links.

```text
Investment thesis
      ↓
Validated sourcing plan
      ↓
Cala structured rows ─── Cala sourced evidence
      ↓                         ↓
Hard-criteria check ───── Linked evidence claims
      ↓
Verified matches · Verification queue · Known exclusions
```

## Qualification model

Qualification is deterministic and separate from scoring.

| State | Rule |
| --- | --- |
| `verified_match` | Founding year and disclosed funding are known and compliant, geography and sector fit are demonstrable, a safe source is present, and Cala reports no relevant conflict. |
| `needs_verification` | A hard criterion is unknown or geography/sector fit is not demonstrably matched. |
| `outside_thesis` | Any known hard criterion fails: founding year, disclosed funding, geography, or sector. |

Uncertain companies remain available for verification rather than being silently discarded.

## Evidence readiness

The 100-point **Evidence readiness** score helps teams prioritize review; it does not determine qualification and is not an investment recommendation.

| Component | Points | Rule |
| --- | ---: | --- |
| Thesis evidence | 30 | Demonstrated geography and sector coverage |
| Capital evidence | 20 | A disclosed funding value is available with a safe company source |
| Evidence freshness | 20 | 20 points within 12 months, 12 within 24 months, 5 within 48 months |
| Latest signal | 15 | Cala returns a concrete recent signal with a safe company source |
| Completeness | 15 | Seven decision fields are present, including a safe structured source |

The full deterministic breakdown stays behind a disclosure on each company card.

## Cala integration

- `POST /v1/knowledge/query` returns dynamic structured rows for company facts.
- `POST /v1/knowledge/search` returns supporting context, explainability, and matching entities.
- Both requests run in parallel under one linked abort controller and one 110-second provider timeout.
- Dynamic rows are normalized through bounded aliases rather than trusted as a fixed schema.
- Search context retains bounded source origins when Cala returns them. Only HTTPS URLs reach the client.
- Explainability references are reconciled with context references and company mentions so relevant claims can link to their supporting origins.
- Provider Markdown or HTML is never rendered; evidence is displayed as escaped plain text.

[Cala query reference](https://docs.cala.ai/api-reference/query) · [Cala search reference](https://docs.cala.ai/api-reference/search)

## Security design

- Provider keys remain server-side and `.env*` is ignored.
- Requests require JSON, are capped at 4 KB, and briefs are normalized and limited to 24–600 characters.
- The planning response must satisfy a strict JSON schema and independent server validation.
- Sector, geography, signals, result count, year, and funding limits are allowlisted or range checked.
- Provider calls preserve client cancellation, timeout cancellation, sibling cancellation, and listener cleanup.
- API responses are `no-store`; upstream payloads, compiled provider input, provider narratives, internal identifiers, and timing data are not returned to the customer workspace.
- Browser responses keep the same-origin Content Security Policy, frame protection, restrictive Permissions Policy, HSTS, and `nosniff`.
- Cross-origin browser requests are rejected, a short-lived signed token is bound to the trusted client IP, and an atomic D1 quota limits a client to two requests per ten minutes across the deployment.
- External links accept only HTTPS, with bounded URLs, labels, claims, references, and arrays.

See [SECURITY.md](./SECURITY.md) for the complete trust model.

## Local setup

Requirements: Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set the server-only variables in `.env.local`:

```dotenv
OPENAI_API_KEY=
CALA_API_KEY=
OPENAI_MODEL=gpt-5.6-terra
```

Never commit `.env.local` or place credentials in prompts, issues, logs, screenshots, or repository history.

## Verification

```bash
npm test
npm run lint
npm run typecheck
npm audit --audit-level=low
git diff --check
```

The suite builds the Cloudflare/vinext application and covers server rendering, public-copy restrictions, security headers, API negative paths, provider cancellation, qualification boundaries, safe origin normalization, and evidence/reference linking.

## API

`POST /api/scout`

```json
{
  "brief": "Find European enterprise software startups founded since 2020, below €30M in disclosed funding, with credible recent partnerships."
}
```

The customer response contains the validated thesis, qualified company cards, source-linked evidence claims, explicit missing/failed criteria, conflicting facts when Cala states them, and customer-safe research notes. Internal provider input, narratives, entity identifiers, timing measurements, and diagnostic identifiers remain server-side.

## Architecture

- **Cala** for structured company knowledge and sourced explainability
- **OpenAI Responses API** for a strict-schema sourcing plan with `store: false`
- **React / vinext** for the application and API routes
- **Cloudflare Workers** for the runtime and security headers

The existing Cloudflare/vinext architecture, server-only credentials, request controls, and abort behavior are intentionally preserved.

## Development evidence boundary

Repository-development evidence is deliberately separated from the customer experience. The public UI contains no development profiles, source-control links, security-vendor status, checkpoint data, agent sessions, revision details, usage metrics, or build diagnostics. Those materials remain in the repository documentation and the project’s Entire profile for reviewers who explicitly need them; see [docs/ENTIRE-LABS.md](./docs/ENTIRE-LABS.md).

## Limitations

- Qualification is bounded by the structured fields and sources Cala returns for a given thesis.
- Geography and sector matching use conservative, deterministic term sets and may place a valid company in verification when wording is unusual.
- Currency conversion is not attempted; the query requests EUR and the parser treats normalized returned amounts as EUR millions.
- The quota depends on Cloudflare D1 and the trusted client-IP header; provider access fails closed when either protection is unavailable.
- A shortlist is a starting point for human due diligence, not a recommendation to invest.
