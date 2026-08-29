import {
  GEOGRAPHIES,
  SECTORS,
  SIGNALS,
  type Geography,
  type Sector,
  type Signal,
  type ThesisPlan,
} from "./types.ts";

const MIN_BRIEF_LENGTH = 24;
const MAX_BRIEF_LENGTH = 600;
const MIN_FOUNDING_YEAR = 2000;
const MAX_FOUNDING_YEAR = 2026;

export function validateBrief(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Brief must be text.");
  }

  const brief = value.replace(/\s+/g, " ").trim();
  if (brief.length < MIN_BRIEF_LENGTH) {
    throw new Error(`Add a little more detail (${MIN_BRIEF_LENGTH} characters minimum).`);
  }
  if (brief.length > MAX_BRIEF_LENGTH) {
    throw new Error(`Keep the brief under ${MAX_BRIEF_LENGTH} characters.`);
  }
  return brief;
}

export function extractExplicitFoundingYear(brief: string): number | null {
  const match = /\bfounded\s+(?:since|after|from)\s+(\d{4})\b/i.exec(brief);
  if (!match) return null;

  const year = Number(match[1]);
  return year >= MIN_FOUNDING_YEAR && year <= MAX_FOUNDING_YEAR ? year : null;
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export function validateThesisPlan(value: unknown): ThesisPlan {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The planner returned an invalid thesis.");
  }

  const plan = value as Record<string, unknown>;
  if (!isOneOf(plan.sector, SECTORS)) throw new Error("Unsupported sector.");
  if (!isOneOf(plan.geography, GEOGRAPHIES)) throw new Error("Unsupported geography.");
  if (!Number.isInteger(plan.founded_after) || Number(plan.founded_after) < MIN_FOUNDING_YEAR || Number(plan.founded_after) > MAX_FOUNDING_YEAR) {
    throw new Error("Invalid founding-year filter.");
  }
  if (typeof plan.max_funding_millions !== "number" || !Number.isFinite(plan.max_funding_millions) || plan.max_funding_millions < 0.5 || plan.max_funding_millions > 250) {
    throw new Error("Invalid funding ceiling.");
  }
  if (!Array.isArray(plan.signals) || plan.signals.length < 1 || plan.signals.length > 3 || !plan.signals.every((signal) => isOneOf(signal, SIGNALS))) {
    throw new Error("Invalid momentum signals.");
  }
  if (!Number.isInteger(plan.result_count) || Number(plan.result_count) < 3 || Number(plan.result_count) > 8) {
    throw new Error("Invalid result count.");
  }
  if (typeof plan.rationale !== "string" || plan.rationale.length < 8 || plan.rationale.length > 240) {
    throw new Error("Invalid rationale.");
  }

  return {
    sector: plan.sector as Sector,
    geography: plan.geography as Geography,
    founded_after: Number(plan.founded_after),
    max_funding_millions: Math.round(Number(plan.max_funding_millions) * 10) / 10,
    signals: [...new Set(plan.signals as Signal[])],
    result_count: Number(plan.result_count),
    rationale: plan.rationale.trim(),
  };
}

export function compileCalaQuery(plan: ThesisPlan): string {
  const signals = plan.signals.join(", ");
  return [
    `Find up to ${plan.result_count} ${plan.sector} startups headquartered in ${plan.geography}.`,
    `They must have been founded in or after ${plan.founded_after} and have total disclosed funding below EUR ${plan.max_funding_millions} million.`,
    `Prioritize companies with recent ${signals}.`,
    "Return one row per company with exactly these fields when known: company, location, sector, founded_year, total_funding, latest_round, latest_event_date, momentum_signal, source_url.",
    "Use null for unknown values. Do not infer facts that are not supported by Cala's knowledge base.",
  ].join(" ");
}
