# CALA SIGNAL

**Evidence-first startup scouting for investors.** Describe an opportunity in plain English; CALA SIGNAL turns it into a constrained search plan, retrieves structured and sourced evidence from Cala, and ranks candidates with inspectable math.

Built for the **Tech Europe × Cala — The Summer Lock-In** hackathon in Barcelona.

## The problem

Startup discovery tools often produce one of two bad outputs: a confident chat answer with hidden reasoning, or a database dump that still needs hours of manual triage. Investors need a shortlist they can challenge: what matched, which evidence is recent, what is missing, and why one company ranked above another.

## The live workflow

1. **Constrain** — OpenAI Structured Outputs converts the investor brief into an allowlisted `ThesisPlan`.
2. **Compile** — the server validates that plan again and creates a bounded natural-language Cala query. Raw user input never becomes a Cala command.
3. **Verify** — Cala's structured query and sourced-search endpoints run in parallel.
4. **Rank** — deterministic TypeScript scores each company out of 100.
5. **Inspect** — the UI exposes every scoring component, Cala entity/KnowBit references, source links, and missing fields.

Both Cala jobs perform graph expansion and provenance assembly. A live run currently takes about 60–90 seconds, so the UI exposes the active stage and elapsed time instead of pretending the result is instantaneous.

```text
Investor brief
    ↓
OpenAI strict JSON schema
    ↓ server validation + bounded compiler
Cala structured rows ─── Cala sourced evidence
    ↓                         ↓
Deterministic score ───── Evidence ledger
    ↓
Ranked, auditable shortlist
```

## Scoring model

| Component | Points | Rule |
| --- | ---: | --- |
| Thesis fit | 30 | Cala location and sector match the structured thesis |
| Funding gap | 20 | Company is below the disclosed-funding ceiling; less capital receives more gap points |
| Evidence freshness | 20 | 20 points within 12 months, 12 within 24 months, 5 within 48 months |
| Momentum | 15 | Cala returns a concrete recent signal |
| Completeness | 15 | Seven decision fields are present, including a Cala entity or source |

Missing evidence receives **zero points**. The model never fills a missing Cala fact. This is an opportunity-prioritization score, not financial advice.

## Security design

- Provider keys remain server-side and `.env*` is gitignored.
- Requests require JSON, are capped at 4 KB, and briefs are normalized and limited to 24–600 characters.
- The OpenAI response must satisfy a strict JSON schema and then pass independent server validation.
- Sector, geography, momentum signals, result count, year, and funding limits are all allowlisted or range checked.
- The browser receives a same-origin-only Content Security Policy, clickjacking protection, a restrictive Permissions Policy, and `nosniff`.
- API responses are `no-store`; errors are generic and never return upstream payloads or credentials.
- A lightweight rate limit protects sponsor credits during the public demo.
- External evidence links are parsed server-side and accept only HTTP(S).
- The committed lockfile is scanned; `npm audit --audit-level=low` currently reports zero findings.

See [SECURITY.md](./SECURITY.md) for the threat model and verification checklist.

## Local setup

Requirements: Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill the server-only variables in `.env.local`:

```dotenv
OPENAI_API_KEY=
CALA_API_KEY=
OPENAI_MODEL=gpt-5.6-terra
```

Never commit `.env.local` or paste credentials into prompts, issues, logs, screenshots, or Entire checkpoints.

## Verification

```bash
npm run lint
npm test
npm audit --audit-level=low
```

`npm test` builds the full Cloudflare/vinext app, verifies server rendering, checks the principal browser-security headers, and asserts that the HTML contains no credential-like material.

## API

`POST /api/scout`

```json
{
  "brief": "Find European enterprise software startups founded since 2020 with credible recent partnerships, grants, or product launches that signal operational momentum."
}
```

The response contains the validated thesis, compiled Cala query, ranked companies, score breakdowns, evidence ledger, caveats, timings, and an audit request ID.

## Technical choices

- **Cala**: `/v1/knowledge/query` provides typed rows; `/v1/knowledge/search` adds KnowBits and explainability. [Official Cala API docs](https://docs.cala.ai/api-reference/query)
- **OpenAI**: the Responses API uses strict JSON Schema output, with `store: false`. [Official Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs)
- **Aikido**: dependency, static-code, secret, IaC, license, and malware scanning for the public repository.
- **Entire**: checkpoint provenance plus review/investigation trails showing why the security boundaries exist.
- **Sites / vinext**: React Server Components and API routes compiled for Cloudflare Workers.

## Honest limitations

- Ranking quality is bounded by the fields and freshness Cala returns for a specific thesis.
- Currency conversion is not attempted; the demo treats Cala's normalized/parsed funding value as EUR millions when the query requests EUR.
- The in-memory rate limit is per Worker isolate, suitable for a hackathon demo but not a global production quota.
- A shortlist is a starting point for human due diligence, not a recommendation to invest.

## Demo path (under two minutes)

1. Run the prepared European enterprise-software brief.
2. Show the strict plan and expand the compiled Cala query.
3. Read the top skyline score; open its five-part breakdown.
4. Show a Cala entity/KnowBit and a deliberately missing field scoring zero.
5. End on Aikido's clean scan and Entire's trail for the exact security line.
