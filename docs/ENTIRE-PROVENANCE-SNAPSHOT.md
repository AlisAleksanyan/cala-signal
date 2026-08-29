# Entire Provenance Snapshot

This snapshot shows how Entire Labs provenance helps answer practical repository-maintenance questions about `docs/ENTIRE-LABS.md`. These are repository-development observations, not customer-facing product data, and no development telemetry is exposed through the customer application.

| Maintenance question | Command | Decision supported |
| --- | --- | --- |
| Which agent and model contributed to the scoped change? | `entire experts` | Treat Codex with `gpt-5.6-sol` as the relevant expert: one session and one checkpoint covered the change, with 9 agent-attributed lines out of 10 committed lines. |
| How much of the file is human or mixed authorship? | `entire blame` | Preserve the file as substantially human-authored: its 48 lines were classified as 38 human lines and 10 mixed lines, or 79% human and 21% mixed. |
| Why does the Final launch audit heading exist? | `entire why` | Use the same scoped provenance when maintaining that section: the heading resolved to the same checkpoint, session, agent, and model. |

## Why this matters

These checks let maintainers identify relevant expertise, understand authorship boundaries, and recover the provenance of a specific section before editing it. That supports safer, more focused maintenance while keeping development evidence in repository tooling and documentation rather than in the customer experience.
