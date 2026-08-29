import type {
  CalaContext,
  CalaEntity,
  CalaExplanation,
  CriterionEvidence,
  EvidenceClaim,
  Geography,
  RankedCompany,
  Sector,
} from "./types";
import { geographyEvidenceTerms, sectorEvidenceTerms } from "./taxonomy.ts";

const CONFLICT_PATTERN = /\b(conflict(?:ing|s|ed)?|contradict(?:ory|s|ed|ion)?|inconsistent|sources? disagree|figures? (?:differ|vary))\b/i;
const FUNDING_PATTERN = /\b(fund(?:ing|ed)?|rais(?:e|ed|ing)|financ(?:e|ed|ing)|capital|investment|total raised)\b/i;
const GEOGRAPHY_PATTERN = /\b(headquarter(?:s|ed)?|based|located|location|office|city|country|from)\b/i;
const SECTOR_PATTERN = /\b(sector|industry|company|startup|platform|software|technology|tech)\b/i;

function normalizedText(value: string): string {
  return ` ${value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

function matchingEntity(companyName: string, entities: CalaEntity[]): CalaEntity | undefined {
  const company = normalizedText(companyName);
  return entities.find((entity) => [entity.name, ...(entity.mentions || [])]
    .some((name) => {
      const candidate = normalizedText(name);
      return candidate === company || candidate.includes(company) || company.includes(candidate);
    }));
}

function companyTerms(companyName: string, entities: CalaEntity[]): string[] {
  const entity = matchingEntity(companyName, entities);
  return [...new Set([companyName, ...(entity?.mentions || [])])]
    .map(normalizedText)
    .filter((term) => term.trim().length >= 3);
}

function isRelevant(text: string, terms: string[]): boolean {
  const normalized = normalizedText(text);
  return terms.some((term) => normalized.includes(term));
}

function safeOrigin(context: CalaContext): { url: string; label: string | null } | null {
  for (const origin of context.origins) {
    try {
      const url = new URL(origin.url);
      if (url.protocol === "https:") return { url: url.toString(), label: origin.label };
    } catch {
      // Ignore malformed provider origins.
    }
  }
  return null;
}

function claimFrom(content: string, contexts: CalaContext[]): EvidenceClaim {
  const origin = contexts.map(safeOrigin).find(Boolean) ?? null;
  return {
    claim: content.replace(/\s+/g, " ").trim().slice(0, 360),
    source_url: origin?.url ?? null,
    source_label: origin?.label ?? null,
  };
}

function uniqueClaims(claims: EvidenceClaim[]): EvidenceClaim[] {
  const seen = new Set<string>();
  return claims.filter((claim) => {
    const key = `${claim.claim.toLowerCase()}|${claim.source_url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function containsAnyTerm(text: string, expectedTerms: readonly string[]): boolean {
  const normalized = normalizedText(text);
  return expectedTerms.some((term) => normalized.includes(normalizedText(term)));
}

function withoutCompanyAliases(text: string, terms: readonly string[]): string {
  let normalized = normalizedText(text);
  for (const term of [...terms].sort((left, right) => right.length - left.length)) {
    normalized = normalized.replaceAll(term, " ");
  }
  return normalized.replace(/\s+/g, " ");
}

function normalizedNumericAmount(value: string, hasUnit: boolean): number | null {
  if (/^\d{1,3}(?:([.,])\d{3})(?:\1\d{3})+$/.test(value)) {
    return Number(value.replace(/[.,]/g, ""));
  }
  if (!hasUnit && /^\d{1,3}[.,]\d{3}$/.test(value)) {
    return Number(value.replace(/[.,]/g, ""));
  }
  if (value.includes(",") && value.includes(".")) {
    const decimalSeparator = value.lastIndexOf(",") > value.lastIndexOf(".") ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    return Number(value.replaceAll(thousandsSeparator, "").replace(decimalSeparator, "."));
  }
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) ? amount : null;
}

function fundingAmountsMillions(text: string): number[] {
  const amounts: number[] = [];
  const pattern = /(?:€|eur\s*)?(\d+(?:(?:[.,])\d+)*)\s*(b|bn|billion|m|million|k|thousand)?\b/gi;
  for (const match of text.matchAll(pattern)) {
    const rawAmount = match[1];
    const unit = (match[2] || "").toLowerCase();
    const amount = normalizedNumericAmount(rawAmount, Boolean(unit));
    if (amount === null) continue;
    if (["b", "bn", "billion"].includes(unit)) amounts.push(amount * 1_000);
    else if (["k", "thousand"].includes(unit)) amounts.push(amount / 1_000);
    else if (["m", "million"].includes(unit)) amounts.push(amount);
    else if (/€|eur/i.test(match[0])) amounts.push(amount >= 10_000 ? amount / 1_000_000 : amount);
  }
  return amounts;
}

function supportsCriterion(
  criterion: CriterionEvidence,
  company: RankedCompany,
  text: string,
  companyAliases: readonly string[],
): boolean {
  switch (criterion.criterion) {
    case "founding_year":
      return company.founded_year !== null
        && new RegExp(`\\b(founded|established|incorporated|launched)\\D{0,24}${company.founded_year}\\b|\\b${company.founded_year}\\D{0,24}(founded|established|incorporated)\\b`, "i").test(text);
    case "funding":
      return company.funding_millions !== null
        && FUNDING_PATTERN.test(text)
        && fundingAmountsMillions(text).some((amount) => Math.abs(amount - company.funding_millions!) < 0.001);
    case "geography":
      return typeof criterion.expected_value === "string"
        && GEOGRAPHY_PATTERN.test(text)
        && containsAnyTerm(text, geographyEvidenceTerms(criterion.expected_value as Geography));
    case "sector": {
      // A company name such as "Acme AI" is an identifier, not a sourced
      // assertion that the company operates in artificial intelligence.
      const directAssertion = withoutCompanyAliases(text, companyAliases);
      return typeof criterion.expected_value === "string"
        && SECTOR_PATTERN.test(directAssertion)
        && containsAnyTerm(directAssertion, sectorEvidenceTerms(criterion.expected_value as Sector));
    }
  }
}

function unsupportedReason(criterion: CriterionEvidence): string {
  return `Cala source evidence for ${criterion.label.toLowerCase()} is not confirmed`;
}

export function linkEvidenceToCompanies(
  companies: RankedCompany[],
  contexts: CalaContext[],
  explanations: CalaExplanation[],
  entities: CalaEntity[] = [],
): RankedCompany[] {
  return companies.map((company) => {
    const terms = companyTerms(company.name, entities);
    const relevantLinks = contexts
      .filter((context) => isRelevant(context.content, terms))
      .map((context) => ({
        context,
        origin: safeOrigin(context),
        explained: explanations.some((explanation) => explanation.references.includes(context.id) && isRelevant(explanation.content, terms)),
      }))
      .filter((link): link is { context: CalaContext; origin: { url: string; label: string | null }; explained: boolean } => Boolean(link.origin))
      .sort((left, right) => Number(right.explained) - Number(left.explained));

    const criterionEvidence = company.criterion_evidence.map((criterion): CriterionEvidence => {
      const conflict = relevantLinks.find((link) => {
        const text = link.context.content;
        return CONFLICT_PATTERN.test(text) && supportsCriterion(criterion, company, text, terms);
      });
      if (conflict) {
        return {
          ...criterion,
          status: "conflicting",
          claim: conflict.context.content.replace(/\s+/g, " ").trim().slice(0, 240),
          source_url: conflict.origin.url,
          source_label: conflict.origin.label,
        };
      }

      const support = relevantLinks.find((link) => {
        const text = link.context.content;
        return !CONFLICT_PATTERN.test(text) && supportsCriterion(criterion, company, text, terms);
      });
      if (!support) return criterion;
      return {
        ...criterion,
        status: "supported",
        claim: support.context.content.replace(/\s+/g, " ").trim().slice(0, 240),
        source_url: support.origin.url,
        source_label: support.origin.label,
      };
    });

    const qualifyingSourceUrls = new Set(criterionEvidence
      .filter((criterion) => criterion.status !== "unsupported" && criterion.source_url)
      .map((criterion) => criterion.source_url));
    // Explanations help prioritize Cala contexts, but only direct context that
    // supports a hard criterion (or reports a conflict) becomes a receipt.
    const claims = uniqueClaims(relevantLinks
      .filter((link) => qualifyingSourceUrls.has(link.origin.url) || CONFLICT_PATTERN.test(link.context.content))
      .map((link) => claimFrom(link.context.content, [link.context])))
      .slice(0, 3);
    const conflictingFacts = claims.filter((claim) => CONFLICT_PATTERN.test(claim.claim));
    const evidenceClaims = claims.filter((claim) => !CONFLICT_PATTERN.test(claim.claim));

    const hasConflict = conflictingFacts.length > 0 || criterionEvidence.some((criterion) => criterion.status === "conflicting");
    const allSupportedMatches = criterionEvidence.every((criterion) => criterion.outcome === "matches" && criterion.status === "supported");
    const hasSupportedFailure = criterionEvidence.some((criterion) => criterion.outcome === "fails" && criterion.status === "supported");
    const qualification = hasConflict
      ? "needs_verification"
      : hasSupportedFailure
        ? "outside_thesis"
        : allSupportedMatches
          ? "verified_match"
          : "needs_verification";
    const missingCriteria = [...company.missing_criteria];
    for (const criterion of criterionEvidence) {
      if (criterion.status === "unsupported" && !missingCriteria.includes(unsupportedReason(criterion))) {
        missingCriteria.push(unsupportedReason(criterion));
      }
    }
    if (hasConflict) missingCriteria.push("Conflicting Cala evidence requires review");

    return {
      ...company,
      qualification,
      missing_criteria: [...new Set(missingCriteria)],
      criterion_evidence: criterionEvidence,
      evidence_claims: evidenceClaims,
      conflicting_facts: conflictingFacts,
    };
  });
}
