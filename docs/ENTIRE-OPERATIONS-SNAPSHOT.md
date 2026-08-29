# Entire Operations Snapshot

This public-safe snapshot summarizes the repository's observed Entire Labs usage. It is documentation only; no development telemetry is exposed through the customer application.

## Observed checkpoint profile

| Measure | Verified value |
| --- | ---: |
| Committed checkpoints available / analyzed | 1 / 1 |
| Model provenance for `docs/ENTIRE-LABS.md` | Codex, `gpt-5.6-sol` |
| Total tokens | 932,904 |
| Input tokens | 82,518 |
| Cache-read tokens | 841,984 |
| Output tokens | 8,402 |
| API calls | 20 |
| Agent attribution in the checkpoint | 9 of 10 committed lines |

Checkpoint-observed totals may overlap and are not guaranteed to represent unique spend. They should be read as operational signals from the analyzed checkpoint, not as a billing ledger.

## Observed signals

- **Context-replay hotspot:** cache-read volume dominates the observed token profile, indicating repeated reuse of substantial context.
- **API-call amplification:** 20 API calls were observed for the checkpoint, making repeated diagnostic passes a meaningful efficiency target.

## Workflow decisions

1. **Search before reinvestigation.** Check existing repository history and documentation before reopening a question that may already have a recorded answer.
2. **Batch diagnostics.** Group related checks into a single diagnostic pass when practical, reducing repeated context loading and API-call amplification.
3. **Preserve, then compact.** Retain the authoritative checkpoint and supporting documentation first, then summarize reusable conclusions into concise repository guidance.
