# Entire Labs implementation

CALA SIGNAL uses Entire as a product capability, not only as a development log. The live dashboard includes a sanitized **Build Passport** made from the repository's real checkpoint data.

## Official setup used

- Entire CLI is enabled for the repository and captures Codex checkpoints.
- The official [`entireio/skills`](https://github.com/entireio/skills) package is installed in Codex's cross-client discovery directory.
- The package was updated from `main` before this implementation.
- The shared `hackathon-security` review profile remains in `.entire/settings.json` and posts review evidence to the trail.

## Labs workflows applied

| Entire workflow | Dashboard use case |
| --- | --- |
| `entire review --findings` | Shows an honest review → fix → clean re-review closure loop. |
| `entire why app/api/scout/route.ts:5 --json` | Connects a product rule to its requirement, checkpoint, commit, and exact line. |
| `entire blame app/api/scout/route.ts:5 --json` | Proves agent/model authorship at line level. |
| `entire experts app --json` | Routes ownership using observed code provenance rather than a static team label. |
| `entire tokens profile --json` | Turns context replay into an operating recommendation. |
| `entire search "validation security cancellation review" --json --compact --limit 5` | Finds the prior fixes before new investigation, applying the token profiler's recommendation. |

## Real closure loop represented in the UI

1. Review session `01a04d88-017d-7822-89d9-aac99888e27e` requested changes for two medium test-coverage/runtime findings.
2. Commits `84c1965` and `3358453` closed those findings.
3. Follow-up review session `01a04d8d-8537-7d80-9050-ab1b3df3b631` returned `approve — no actionable findings`.

## Security boundary

The deployed dashboard is a build-time, allowlisted snapshot. It contains only public repository references, short checkpoint/session IDs, counts, commands, and verdict summaries.

It intentionally does **not**:

- call the Entire CLI or API at runtime;
- bundle an Entire token or other credential;
- expose full prompts, transcripts, emails, local paths, environment files, or private URLs;
- accept a user-controlled file path or command.

The snapshot tests fail if credential markers, email addresses, local paths, or non-allowlisted link hosts enter the public data.

## Product extension

The same Build Passport can protect AI-generated internal dashboards: trace which prompt changed a metric, identify the responsible agent/model, retain the review findings that forced a correction, route follow-up questions to the agent with real provenance, and surface repeated context cost before the next build.
