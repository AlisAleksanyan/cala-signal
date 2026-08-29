import type { CalaEntity, RankedCompany, ScoreBreakdown, ThesisPlan } from "./types";

const fieldAliases = {
  name: ["company", "name", "company_name", "startup"],
  location: ["location", "headquarters", "hq", "city", "country"],
  sector: ["sector", "industry", "category"],
  founded: ["founded_year", "founded", "year_founded", "founded_date"],
  funding: ["total_funding", "funding", "funding_amount", "total_raised", "amount_raised"],
  round: ["latest_round", "round_type", "funding_round", "last_round"],
  date: ["latest_event_date", "latest_funding_date", "date", "year"],
  momentum: ["momentum_signal", "recent_signal", "signal", "recent_development", "latest_event"],
  source: ["source_url", "source", "url", "evidence_url"],
} as const;

function normalizedEntries(row: Record<string, unknown>): Map<string, unknown> {
  return new Map(Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[\s-]+/g, "_"), value]));
}

function pick(entries: Map<string, unknown>, aliases: readonly string[]): unknown {
  for (const alias of aliases) {
    if (entries.has(alias)) return entries.get(alias);
  }
  return null;
}

function asText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && trimmed.toLowerCase() !== "null" ? trimmed.slice(0, 500) : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asYear(value: unknown): number | null {
  const text = asText(value);
  if (!text) return null;
  const match = text.match(/\b(19|20)\d{2}\b/);
  const year = match ? Number(match[0]) : Number(text);
  return Number.isInteger(year) && year >= 1900 && year <= 2026 ? year : null;
}

function asFundingMillions(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000 ? Math.round((value / 1_000_000) * 10) / 10 : Math.round(value * 10) / 10;
  }
  const text = asText(value);
  if (!text) return null;
  const cleaned = text.replace(/,/g, "");
  const match = cleaned.match(/(-?\d+(?:\.\d+)?)\s*(b|bn|billion|m|million|k|thousand)?/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] || "").toLowerCase();
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (["b", "bn", "billion"].includes(unit)) return Math.round(amount * 10_000) / 10;
  if (["k", "thousand"].includes(unit)) return Math.round((amount / 1_000) * 10) / 10;
  if (["m", "million"].includes(unit)) return Math.round(amount * 10) / 10;
  return amount > 1_000_000 ? Math.round((amount / 1_000_000) * 10) / 10 : Math.round(amount * 10) / 10;
}

function asDate(value: unknown): string | null {
  const text = asText(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  const year = asYear(value);
  return year ? `${year}-01-01` : null;
}

function asSafeUrl(value: unknown): string | null {
  const text = asText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function freshnessPoints(date: string | null): number {
  if (!date) return 0;
  const days = (Date.now() - Date.parse(date)) / 86_400_000;
  if (days <= 365) return 20;
  if (days <= 730) return 12;
  if (days <= 1_460) return 5;
  return 0;
}

function matchingEntity(name: string, entities: CalaEntity[]): CalaEntity | undefined {
  const needle = name.toLowerCase();
  return entities.find((entity) => {
    const names = [entity.name, ...(entity.mentions || [])].map((item) => item.toLowerCase());
    return names.some((candidate) => candidate === needle || candidate.includes(needle) || needle.includes(candidate));
  });
}

export function rankCompanies(
  rows: Record<string, unknown>[],
  entities: CalaEntity[],
  plan: ThesisPlan,
): RankedCompany[] {
  const seen = new Set<string>();
  const companies: Omit<RankedCompany, "rank">[] = [];

  for (const row of rows.slice(0, 20)) {
    const entries = normalizedEntries(row);
    const name = asText(pick(entries, fieldAliases.name));
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    const location = asText(pick(entries, fieldAliases.location));
    const sector = asText(pick(entries, fieldAliases.sector));
    const foundedYear = asYear(pick(entries, fieldAliases.founded));
    const funding = asFundingMillions(pick(entries, fieldAliases.funding));
    const latestRound = asText(pick(entries, fieldAliases.round));
    const latestDate = asDate(pick(entries, fieldAliases.date));
    const momentum = asText(pick(entries, fieldAliases.momentum));
    const sourceUrl = asSafeUrl(pick(entries, fieldAliases.source));
    const entity = matchingEntity(name, entities);

    const geoMatch = location?.toLowerCase().includes(plan.geography.toLowerCase()) ?? false;
    const sectorTokens = plan.sector.toLowerCase().split(" ");
    const sectorMatch = sectorTokens.some((token) => sector?.toLowerCase().includes(token));
    const thesisFit = (geoMatch ? 15 : location ? 7 : 0) + (sectorMatch ? 15 : sector ? 6 : 0);
    const fundingGap = funding === null
      ? 0
      : funding <= plan.max_funding_millions
        ? Math.round(20 * (1 - 0.6 * (funding / plan.max_funding_millions)))
        : 0;
    const freshness = freshnessPoints(latestDate);
    const momentumPoints = momentum ? 15 : 0;
    const completenessFields = [location, sector, foundedYear, funding, latestDate, momentum, sourceUrl || entity?.id].filter((value) => value !== null && value !== undefined).length;
    const completeness = Math.round((completenessFields / 7) * 15);

    const scoreBreakdown: ScoreBreakdown = {
      thesis_fit: Math.min(thesisFit, 30),
      funding_gap: Math.min(fundingGap, 20),
      evidence_freshness: freshness,
      momentum: momentumPoints,
      completeness,
    };
    const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
    const missingFields = [
      ["location", location],
      ["sector", sector],
      ["founded year", foundedYear],
      ["funding", funding],
      ["latest event date", latestDate],
      ["momentum signal", momentum],
      ["source", sourceUrl || entity?.id],
    ].filter(([, value]) => value === null || value === undefined).map(([label]) => String(label));

    companies.push({
      name,
      location,
      sector,
      founded_year: foundedYear,
      funding_millions: funding,
      latest_round: latestRound,
      latest_event_date: latestDate,
      momentum_signal: momentum,
      source_url: sourceUrl,
      entity_id: entity?.id || null,
      score,
      score_breakdown: scoreBreakdown,
      missing_fields: missingFields,
    });
  }

  return companies
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, plan.result_count)
    .map((company, index) => ({ ...company, rank: index + 1 }));
}
