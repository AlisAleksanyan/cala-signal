export type EntireProofTone = "signal" | "warning" | "resolved";

export interface EntireReviewStep {
  label: string;
  title: string;
  detail: string;
  reference: string;
  tone: EntireProofTone;
  href: string;
}

export interface EntireUseCase {
  id: "review" | "why" | "blame" | "experts" | "tokens";
  command: string;
  label: string;
  title: string;
  description: string;
  outcome: string;
  evidence: string[];
  href: string;
}

const repoUrl = "https://github.com/AlisAleksanyan/cala-signal";
const entireRepoUrl = "https://entire.io/gh/AlisAleksanyan/cala-signal";

export const entireProof = {
  snapshot: "29 Aug 2026 · main branch",
  repo: "AlisAleksanyan/cala-signal",
  publicTrailUrl: `${entireRepoUrl}/session/01a04d9e-0d58-7e53-b86f-b6272f3bade9`,
  summary: [
    { value: "2 → 0", label: "medium review findings closed" },
    { value: "2 / 2", label: "checkpoints with token data" },
    { value: "1 line", label: "prompt-to-code receipt" },
    { value: "5 labs", label: "workflows applied" },
  ],
  reviewLoop: [
    {
      label: "Review 01",
      title: "Request changes",
      detail: "Entire found two medium gaps: the minimum Node runtime could not execute the tests, and OpenAI cancellation paths lacked coverage.",
      reference: "session 01a04d88",
      tone: "warning",
      href: `${entireRepoUrl}/session/01a04d88-017d-7822-89d9-aac99888e27e`,
    },
    {
      label: "Fix 02",
      title: "Close the loop",
      detail: "Two focused commits made the tests executable on the declared runtime and added timeout, abort, and listener-cleanup coverage.",
      reference: "84c1965 + 3358453",
      tone: "signal",
      href: `${repoUrl}/compare/6fd75f0...3358453`,
    },
    {
      label: "Verify 03",
      title: "Approved",
      detail: "A checkpoint-aware follow-up review verified both fixes and returned no actionable findings.",
      reference: "session 01a04d8d",
      tone: "resolved",
      href: `${entireRepoUrl}/session/01a04d8d-8537-7d80-9050-ab1b3df3b631`,
    },
  ] satisfies EntireReviewStep[],
  useCases: [
    {
      id: "review",
      command: "entire review --findings",
      label: "Review",
      title: "Findings become a provable closure loop.",
      description: "A review is useful only if the fix and the clean re-review remain connected. Entire preserves all three states instead of leaving a detached approval comment.",
      outcome: "2 medium findings → 2 fix commits → 0 actionable findings",
      evidence: ["checkpoint-aware diff scope", "review session retained", "clean follow-up verdict"],
      href: `${entireRepoUrl}/session/01a04d8d-8537-7d80-9050-ab1b3df3b631`,
    },
    {
      id: "why",
      command: "entire why app/api/scout/route.ts:5 --json",
      label: "Why",
      title: "A product decision has an exact origin.",
      description: "The validation boundary can be traced from one source line back to the requirement that an investor's explicit founding year must override a model default.",
      outcome: "requirement → checkpoint → commit a19e4b68 → exact source line",
      evidence: ["Codex · gpt-5.6-sol", "checkpoint 01M16T4A", "three focused validation tests"],
      href: `${entireRepoUrl}/session/01a04d9e-0d58-7e53-b86f-b6272f3bade9`,
    },
    {
      id: "blame",
      command: "entire blame app/api/scout/route.ts:5 --json",
      label: "Blame",
      title: "AI authorship is line-level, not a guess.",
      description: "Instead of labeling an entire repository as AI-made, Entire attributes the selected line to its agent, model, checkpoint, session, and commit.",
      outcome: "1 selected line · 100% checkpoint-attributed",
      evidence: ["agent and model identified", "prompt receipt available", "commit-linked attribution"],
      href: `${repoUrl}/blob/a19e4b680008710567bf20f9491b21fb7464c9b7/app/api/scout/route.ts#L5`,
    },
    {
      id: "experts",
      command: "entire experts app --json",
      label: "Experts",
      title: "Route a question to the agent with provenance.",
      description: "Entire ranks expertise from actual checkpoint contact with a code scope. For the app boundary, it identifies the model, session, and matched file instead of relying on a stale ownership list.",
      outcome: "Codex · gpt-5.6-sol · 40 attributed lines",
      evidence: ["one indexed app session", "one checkpoint", "matched app/api/scout/route.ts"],
      href: `${entireRepoUrl}/session/01a04d9e-0d58-7e53-b86f-b6272f3bade9`,
    },
    {
      id: "tokens",
      command: "entire tokens profile --json",
      label: "Tokens",
      title: "Context waste becomes an operating signal.",
      description: "The Labs profiler found repeated context replay across both committed checkpoints. Its recommendation—search recorded decisions before investigating again—changed this build workflow immediately.",
      outcome: "2 of 2 checkpoints measured · history search used before implementation",
      evidence: ["100% token-data coverage", "context-replay hotspot surfaced", "search-before-reinvestigation applied"],
      href: `${repoUrl}/blob/main/docs/ENTIRE-LABS.md`,
    },
  ] satisfies EntireUseCase[],
} as const;
