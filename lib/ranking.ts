import type {
  CalaEntity,
  CandidateQualification,
  Geography,
  RankedCompany,
  ScoreBreakdown,
  Sector,
  ThesisPlan,
} from "./types";

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

const sectorTerms: Record<Sector, readonly string[]> = {
  "climate tech": ["climate tech", "climatetech", "cleantech", "clean tech", "renewable", "carbon", "energy transition", "sustainability", "solar", "hydrogen"],
  "artificial intelligence": ["artificial intelligence", "machine learning", "generative ai", "ai"],
  fintech: ["fintech", "financial technology", "payments", "banking software", "insurtech"],
  "health tech": ["health tech", "healthtech", "digital health", "medtech", "medical technology"],
  mobility: ["mobility", "transportation", "automotive", "logistics", "electric vehicle", "ev charging"],
  "deep tech": ["deep tech", "deeptech", "quantum", "robotics", "advanced materials", "semiconductor", "space tech"],
  biotech: ["biotech", "biotechnology", "life sciences", "therapeutics", "drug discovery"],
  "enterprise software": ["enterprise software", "b2b software", "business software", "workflow software", "saas"],
};

const geographyTerms: Record<Geography, readonly string[]> = {
  Barcelona: ["barcelona"],
  Catalonia: ["catalonia", "catalunya", "barcelona", "girona", "tarragona", "lleida"],
  Spain: ["spain", "espana", "spanish", "barcelona", "madrid", "valencia", "bilbao", "seville", "sevilla", "malaga", "zaragoza"],
  "Southern Europe": [
    "southern europe", "spain", "espana", "portugal", "italy", "italia", "greece", "malta", "cyprus", "slovenia", "croatia", "barcelona", "madrid", "lisbon", "lisboa", "porto", "milan", "milano", "rome", "roma", "athens",
  ],
  Europe: [
    "europe", "european", "spain", "portugal", "france", "germany", "italy", "greece", "netherlands", "belgium", "luxembourg", "ireland", "austria", "switzerland", "denmark", "sweden", "norway", "finland", "iceland", "poland", "czechia", "czech republic", "slovakia", "hungary", "romania", "bulgaria", "slovenia", "croatia", "estonia", "latvia", "lithuania", "malta", "cyprus", "united kingdom", "uk", "barcelona", "madrid", "lisbon", "paris", "berlin", "munich", "milan", "rome", "amsterdam", "brussels", "dublin", "vienna", "zurich", "stockholm", "oslo", "helsinki", "warsaw", "prague", "bucharest", "tallinn", "london",
  ],
};

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
    if (value < 0) return null;
    return value >= 10_000 ? Math.round((value / 1_000_000) * 10) / 10 : Math.round(value * 10) / 10;
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
  return amount >= 10_000 ? Math.round((amount / 1_000_000) * 10) / 10 : Math.round(amount * 10) / 10;
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
  if (!text || text.length > 2_048) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizedPhrase(value: string): string {
  return ` ${value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

function includesTerm(value: string, term: string): boolean {
  return normalizedPhrase(value).includes(normalizedPhrase(term));
}

function matchesSector(value: string | null, sector: Sector): boolean {
  return Boolean(value && sectorTerms[sector].some((term) => includesTerm(value, term)));
}

function matchesGeography(value: string | null, geography: Geography): boolean {
  return Boolean(value && geographyTerms[geography].some((term) => includesTerm(value, term)));
}

function freshnessPoints(date: string | null): number {
  if (!date) return 0;
  const days = (Date.now() - Date.parse(date)) / 86_400_000;
  if (!Number.isFinite(days) || days < -1) return 0;
  if (days <= 365) return 20;
  if (days <= 730) return 12;
  if (days <= 1_460) return 5;
  return 0;
}

function qualificationFor(
  plan: ThesisPlan,
  location: string | null,
  sector: string | null,
  foundedYear: number | null,
  funding: number | null,
): { qualification: CandidateQualification; missingCriteria: string[]; failedCriteria: string[]; geographyMatch: boolean; sectorMatch: boolean } {
  const missingCriteria: string[] = [];
  const failedCriteria: string[] = [];
  const geographyMatch = matchesGeography(location, plan.geography);
  const sectorMatch = matchesSector(sector, plan.sector);

  if (foundedYear === null) missingCriteria.push("Founding year is not confirmed");
  else if (foundedYear < plan.founded_after) failedCriteria.push(`Founded in ${foundedYear}, before the ${plan.founded_after} threshold`);

  if (funding === null) missingCriteria.push("Disclosed funding is not confirmed");
  else if (funding > plan.max_funding_millions) failedCriteria.push(`€${funding}M disclosed funding exceeds the €${plan.max_funding_millions}M ceiling`);

  if (!location) missingCriteria.push("Location is not confirmed");
  else if (!geographyMatch) failedCriteria.push(`Geography fit for ${plan.geography} is not demonstrated`);

  if (!sector) missingCriteria.push("Sector is not confirmed");
  else if (!sectorMatch) failedCriteria.push(`Sector fit for ${plan.sector} is not demonstrated`);

  const outsideThesis = failedCriteria.length > 0;
  const verified = foundedYear !== null
    && foundedYear >= plan.founded_after
    && funding !== null
    && funding <= plan.max_funding_millions
    && geographyMatch
    && sectorMatch;

  return {
    qualification: outsideThesis ? "outside_thesis" : verified ? "verified_match" : "needs_verification",
    missingCriteria,
    failedCriteria,
    geographyMatch,
    sectorMatch,
  };
}

export function rankCompanies(
  rows: Record<string, unknown>[],
  _entities: CalaEntity[],
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
    const qualification = qualificationFor(plan, location, sector, foundedYear, funding);
    const sourceBacked = Boolean(sourceUrl);

    const scoreBreakdown: ScoreBreakdown = {
      thesis_evidence: (qualification.geographyMatch ? 15 : 0) + (qualification.sectorMatch ? 15 : 0),
      capital_evidence: funding === null || !sourceBacked ? 0 : 20,
      evidence_freshness: freshnessPoints(latestDate),
      signal_evidence: momentum && sourceBacked ? 15 : 0,
      completeness: Math.round(([
        location,
        sector,
        foundedYear,
        funding,
        latestDate,
        momentum,
        sourceUrl,
      ].filter((value) => value !== null && value !== undefined).length / 7) * 15),
    };
    const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
    const missingFields = [
      ["location", location],
      ["sector", sector],
      ["founding year", foundedYear],
      ["funding", funding],
      ["latest event date", latestDate],
      ["latest signal", momentum],
      ["source", sourceUrl],
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
      score,
      score_breakdown: scoreBreakdown,
      missing_fields: missingFields,
      qualification: qualification.qualification,
      missing_criteria: qualification.missingCriteria,
      failed_criteria: qualification.failedCriteria,
      evidence_claims: [],
      conflicting_facts: [],
    });
  }

  const qualificationOrder: Record<CandidateQualification, number> = {
    verified_match: 0,
    needs_verification: 1,
    outside_thesis: 2,
  };

  return companies
    .sort((a, b) => qualificationOrder[a.qualification] - qualificationOrder[b.qualification] || b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, plan.result_count)
    .map((company, index) => ({ ...company, rank: index + 1 }));
}
