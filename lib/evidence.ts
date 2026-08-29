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

function claimFrom(content: string, contexts: CalaContext[]): EvidenceClaim {
  const origin = contexts.flatMap((context) => context.origins)[0] ?? null;
  return {
    claim: content.slice(0, 700),
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
      const referenceText = referencedContexts.map((context) => context.content).join(" ");
      if (!isRelevant(`${explanation.content} ${referenceText}`, terms)) return [];
      return [claimFrom(explanation.content, referencedContexts)];
    });

    const coveredSourceUrls = new Set(explanationClaims.map((claim) => claim.source_url).filter(Boolean));
    const contextClaims = contexts
      .filter((context) => isRelevant(context.content, terms))
      .filter((context) => !context.origins.some((origin) => coveredSourceUrls.has(origin.url)))
      .map((context) => claimFrom(context.content, [context]));
    const claims = uniqueClaims([...explanationClaims, ...contextClaims]).slice(0, 3);

    return {
      ...company,
      evidence_claims: claims.filter((claim) => !CONFLICT_PATTERN.test(claim.claim)),
      conflicting_facts: claims.filter((claim) => CONFLICT_PATTERN.test(claim.claim)),
    };
  });
}
