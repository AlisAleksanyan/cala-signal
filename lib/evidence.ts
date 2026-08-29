import type {
  CalaContext,
  CalaEntity,
  CalaExplanation,
  EvidenceClaim,
  RankedCompany,
} from "./types";

const CONFLICT_PATTERN = /\b(conflict(?:ing|s|ed)?|contradict(?:ory|s|ed|ion)?|inconsistent|sources? disagree|figures? (?:differ|vary))\b/i;

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

function claimFrom(content: string, contexts: CalaContext[], fallbackUrl: string | null): EvidenceClaim {
  const origin = contexts.flatMap((context) => context.origins)[0] ?? null;
  return {
    claim: content.replace(/\s+/g, " ").trim().slice(0, 360),
    source_url: origin?.url ?? fallbackUrl,
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

export function linkEvidenceToCompanies(
  companies: RankedCompany[],
  contexts: CalaContext[],
  explanations: CalaExplanation[],
  entities: CalaEntity[] = [],
): RankedCompany[] {
  const contextById = new Map(contexts.map((context) => [context.id, context]));

  return companies.map((company) => {
    const terms = companyTerms(company.name, entities);
    const explanationClaims = explanations.flatMap((explanation) => {
      const referencedContexts = explanation.references
        .map((reference) => contextById.get(reference))
        .filter((context): context is CalaContext => Boolean(context));
      if (!isRelevant(explanation.content, terms)) return [];
      const companyContexts = referencedContexts.filter((context) => isRelevant(context.content, terms));
      return [claimFrom(explanation.content, companyContexts, company.source_url)];
    });
    const claims = uniqueClaims(explanationClaims)
      .filter((claim) => Boolean(claim.source_url))
      .slice(0, 3);
    const conflictingFacts = claims.filter((claim) => CONFLICT_PATTERN.test(claim.claim));
    const evidenceClaims = claims.filter((claim) => !CONFLICT_PATTERN.test(claim.claim));
    const hasSourceEvidence = Boolean(company.source_url || evidenceClaims.some((claim) => claim.source_url));
    const missingCriteria = [...company.missing_criteria];
    let qualification = company.qualification;

    if (qualification === "verified_match" && !hasSourceEvidence) {
      qualification = "needs_verification";
      missingCriteria.push("Source evidence for the hard criteria is not confirmed");
    }
    if (conflictingFacts.length > 0) {
      qualification = "needs_verification";
      missingCriteria.push("Conflicting Cala evidence requires review");
    }

    return {
      ...company,
      qualification,
      missing_criteria: [...new Set(missingCriteria)],
      evidence_claims: evidenceClaims,
      conflicting_facts: conflictingFacts,
    };
  });
}
