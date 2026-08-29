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
  origins: CalaOrigin[];
}

export interface CalaOrigin {
  url: string;
  label: string | null;
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
  thesis_evidence: number;
  capital_evidence: number;
  evidence_freshness: number;
  signal_evidence: number;
  completeness: number;
}

export type CandidateQualification = "verified_match" | "needs_verification" | "outside_thesis";

export type HardCriterion = "founding_year" | "funding" | "geography" | "sector";
export type CriterionOutcome = "matches" | "fails" | "unknown";
export type CriterionEvidenceStatus = "supported" | "unsupported" | "conflicting";

export interface EvidenceClaim {
  claim: string;
  source_url: string | null;
  source_label: string | null;
}

export interface CriterionEvidence {
  criterion: HardCriterion;
  label: string;
  expected_value: string | number | null;
  outcome: CriterionOutcome;
  status: CriterionEvidenceStatus;
  claim: string | null;
  source_url: string | null;
  source_label: string | null;
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
  score: number;
  score_breakdown: ScoreBreakdown;
  missing_fields: string[];
  qualification: CandidateQualification;
  missing_criteria: string[];
  failed_criteria: string[];
  criterion_evidence: CriterionEvidence[];
  evidence_claims: EvidenceClaim[];
  conflicting_facts: EvidenceClaim[];
}

export interface ScoutResponse {
  thesis: ThesisPlan;
  companies: RankedCompany[];
  caveats: string[];
}
