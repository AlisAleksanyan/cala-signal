export const SECTORS = [
  "climate tech",
  "artificial intelligence",
  "fintech",
  "health tech",
  "mobility",
  "deep tech",
  "biotech",
  "enterprise software",
] as const;

export const GEOGRAPHIES = [
  "Barcelona",
  "Catalonia",
  "Spain",
  "Southern Europe",
  "Europe",
] as const;

export const SIGNALS = [
  "funding",
  "partnerships",
  "hiring",
  "product launches",
  "grants",
] as const;

export type Sector = (typeof SECTORS)[number];
export type Geography = (typeof GEOGRAPHIES)[number];
export type Signal = (typeof SIGNALS)[number];

export interface ThesisPlan {
  sector: Sector;
  geography: Geography;
  founded_after: number;
  max_funding_millions: number;
  signals: Signal[];
  result_count: number;
  rationale: string;
}

export interface CalaEntity {
  id: string;
  name: string;
  entity_type: string;
  mentions?: string[];
}

export interface CalaContext {
  id: string;
  content: string;
}

export interface CalaExplanation {
  content: string;
  references: string[];
}

export interface CalaQueryResponse {
  results: Record<string, unknown>[];
  entities: CalaEntity[];
}

export interface CalaSearchResponse {
  content: string;
  context: CalaContext[];
  entities: CalaEntity[] | null;
  explainability: CalaExplanation[];
}

export interface ScoreBreakdown {
  thesis_fit: number;
  funding_gap: number;
  evidence_freshness: number;
  momentum: number;
  completeness: number;
}

export interface RankedCompany {
  rank: number;
  name: string;
  location: string | null;
  sector: string | null;
  founded_year: number | null;
  funding_millions: number | null;
  latest_round: string | null;
  latest_event_date: string | null;
  momentum_signal: string | null;
  source_url: string | null;
  entity_id: string | null;
  score: number;
  score_breakdown: ScoreBreakdown;
  missing_fields: string[];
}

export interface ScoutResponse {
  request_id: string;
  thesis: ThesisPlan;
  cala_query: string;
  companies: RankedCompany[];
  evidence: CalaContext[];
  explanations: CalaExplanation[];
  narrative: string;
  caveats: string[];
  timings_ms: {
    planning: number;
    cala: number;
    total: number;
  };
}
