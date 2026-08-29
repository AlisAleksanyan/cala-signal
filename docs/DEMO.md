# Two-minute demo script

Target: **1:45–1:55**, leaving time for one judge question.

## 0:00–0:15 — Problem

> “Startup scouting gives investors either a confident AI paragraph or a database dump. Neither tells you why a company belongs on the shortlist—or what evidence is missing.”

Open CALA SIGNAL. Point to **Evidence-first startup scouting** and the visible 100-point model.

## 0:15–0:38 — Live thesis

Use the prepared brief:

> “Find climate-tech startups in Spain founded since 2019, under €25M funding, with recent partnerships or grants.”

Click **Run live scout**.

While it runs:

> “OpenAI does not answer the investment question. It converts my brief into a strict, allowlisted schema. Our server validates it again and compiles the Cala request.”

## 0:38–1:03 — Cala is the knowledge engine

Open **Inspect the safe Cala query**.

> “The raw prompt never becomes a Cala command. Cala then runs two jobs in parallel: structured company rows for computation, and sourced search for KnowBits and explainability.”

Point to the thesis chips and the Cala query. Do not read them all.

## 1:03–1:28 — Inspectable ranking

Point to the skyline; open the top company's **Why this score**.

> “The model does not rank companies. Deterministic code scores thesis fit, funding gap, freshness, momentum, and completeness. Missing evidence scores zero, visibly.”

Point to one missing-field note or due-diligence caveat.

## 1:28–1:45 — Evidence and trust

Scroll to the Cala evidence ledger and point to a KnowBit or entity reference.

> “Every recommendation ends in evidence and an explicit due-diligence queue—not fake certainty.”

Switch to the prepared Aikido and Entire tabs.

## 1:45–1:55 — Side-prize close

> “Aikido proves the submitted revision is clean. Entire preserves the engineering decisions and reviews the exact security boundary. Aikido proves what is safe; Entire proves why it became safe.”

End on the product, not the repository.

## Backup path

- Keep one completed result open in a separate browser tab before recording.
- If Cala is rate-limited, show the completed result and the request ID; do not pretend it is a new run.
- If the network fails, use a screen recording of one verified live run, then show the current Aikido revision and Entire trail live.
- Never display `.env.local`, terminal environment variables, API-key screens, browser password managers, or private event tabs.

## Likely judge questions

**“Why not just ask ChatGPT?”**

ChatGPT creates the bounded plan; Cala supplies the typed, traceable knowledge. The final rank is deterministic and inspectable.

**“Why is Cala essential?”**

The same input drives both structured rows and source-backed evidence. Replacing Cala would require entity resolution, source tracing, normalization, and a second evidence pipeline.

**“Is the score investment advice?”**

No. It is a transparent triage score. Missing evidence loses points and the output explicitly starts a due-diligence queue.

**“How do you stop prompt injection?”**

The user cannot author Cala syntax. OpenAI must emit an enum/range-constrained schema, the server validates it independently, and only the server compiler creates the Cala request.

**“What did Aikido change?”**

We replaced the starter's vulnerable dependency versions and removed unused packages before feature work, taking the npm dependency audit from 20 findings (15 high) to zero; the final Aikido result is the source of truth for the submission revision.

**“What does Entire add?”**

It makes the security decisions reviewable as a development trail. We use checkpoints plus an Entire Labs review, and demonstrate blame/why on the defensive query boundary.
