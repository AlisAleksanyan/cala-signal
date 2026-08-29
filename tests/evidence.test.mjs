import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSafeOrigin } from "../lib/cala.ts";
import { linkEvidenceToCompanies } from "../lib/evidence.ts";
import { rankCompanies } from "../lib/ranking.ts";

test("normalizes only bounded HTTPS source origins", () => {
  assert.deepEqual(
    normalizeSafeOrigin({ url: "https://source.example/report", name: "Source report" }),
    { url: "https://source.example/report", label: "Source report" },
  );
  assert.equal(normalizeSafeOrigin("http://source.example/fact"), null);
  assert.equal(normalizeSafeOrigin({ url: "javascript:alert(1)", name: "Unsafe" }), null);
  assert.equal(normalizeSafeOrigin({ url: "data:text/html,unsafe" }), null);

  const bounded = normalizeSafeOrigin({ url: "https://source.example/long", name: "x".repeat(300) });
  assert.equal(bounded?.label?.length, 120);
});

test("demotes an otherwise verified company when relevant Cala evidence conflicts", () => {
  const plan = {
    sector: "enterprise software",
    geography: "Europe",
    founded_after: 2020,
    max_funding_millions: 25,
    signals: ["partnerships"],
    result_count: 5,
    rationale: "European enterprise software with recent partnership momentum.",
  };
  const companies = rankCompanies([{
    company: "Acme Cloud",
    location: "Berlin, Germany",
    sector: "Enterprise software",
    founded_year: 2022,
    total_funding: "€12M",
    source_url: "https://news.example/acme",
  }], [], plan);
  const [linked] = linkEvidenceToCompanies(
    companies,
    [{ id: "conflict", content: "Acme Cloud funding sources disagree.", origins: [{ url: "https://news.example/conflict", label: "Report" }] }],
    [{ content: "Acme Cloud funding figures conflict across sources.", references: ["conflict"] }],
  );

  assert.equal(linked.qualification, "needs_verification");
  assert.ok(linked.missing_criteria.includes("Conflicting Cala evidence requires review"));
  assert.equal(linked.conflicting_facts.length, 1);
});

test("does not attach another company's explanation through shared context", () => {
  const plan = {
    sector: "enterprise software",
    geography: "Europe",
    founded_after: 2020,
    max_funding_millions: 25,
    signals: ["partnerships"],
    result_count: 5,
    rationale: "European enterprise software with recent partnership momentum.",
  };
  const companies = rankCompanies([{
    company: "Acme Cloud",
    location: "Berlin, Germany",
    sector: "Enterprise software",
    founded_year: 2022,
    total_funding: "€12M",
    source_url: "https://news.example/acme",
  }], [], plan);
  const [linked] = linkEvidenceToCompanies(
    companies,
    [{ id: "shared", content: "Acme Cloud and Beta Systems appeared in the same market report.", origins: [{ url: "https://news.example/shared", label: "Report" }] }],
    [{ content: "Beta Systems raised €9M for expansion.", references: ["shared"] }],
  );

  assert.deepEqual(linked.evidence_claims, []);
});

test("moves an excluded company to verification when Cala reports a relevant conflict", () => {
  const plan = {
    sector: "enterprise software",
    geography: "Europe",
    founded_after: 2020,
    max_funding_millions: 25,
    signals: ["partnerships"],
    result_count: 5,
    rationale: "European enterprise software with recent partnership momentum.",
  };
  const companies = rankCompanies([{
    company: "Acme Cloud",
    location: "Berlin, Germany",
    sector: "Enterprise software",
    founded_year: 2018,
    total_funding: "€12M",
    source_url: "https://news.example/acme",
  }], [], plan);
  const [linked] = linkEvidenceToCompanies(
    companies,
    [{ id: "year-conflict", content: "Acme Cloud founding sources disagree.", origins: [{ url: "https://news.example/conflict", label: "Report" }] }],
    [{ content: "Acme Cloud founding year conflicts across sources.", references: ["year-conflict"] }],
  );

  assert.equal(linked.qualification, "needs_verification");
  assert.ok(linked.missing_criteria.includes("Conflicting Cala evidence requires review"));
});

test("links company-relevant explainability claims to referenced context origins", () => {
  const plan = {
    sector: "enterprise software",
    geography: "Europe",
    founded_after: 2020,
    max_funding_millions: 25,
    signals: ["partnerships"],
    result_count: 5,
    rationale: "European enterprise software with recent partnership momentum.",
  };
  const companies = rankCompanies([{
    company: "Acme Cloud",
    location: "Berlin, Germany",
    sector: "Enterprise software",
    founded_year: 2022,
    total_funding: "€12M",
  }], [], plan);
  const linked = linkEvidenceToCompanies(
    companies,
    [{
      id: "acme-funding",
      content: "Acme Cloud disclosed a €12M financing round.",
      origins: [{ url: "https://news.example/acme-round", label: "News source" }],
    }],
    [{
      content: "Acme Cloud disclosed €12M in funding.",
      references: ["acme-funding"],
    }],
  );

  assert.deepEqual(linked[0].evidence_claims, [{
    claim: "Acme Cloud disclosed a €12M financing round.",
    source_url: "https://news.example/acme-round",
    source_label: "News source",
  }]);
});

test("an unrelated homepage URL cannot verify a structured company match", () => {
  const plan = {
    sector: "enterprise software",
    geography: "Europe",
    founded_after: 2020,
    max_funding_millions: 25,
    signals: ["partnerships"],
    result_count: 5,
    rationale: "European enterprise software with recent partnership momentum.",
  };
  const companies = rankCompanies([{
    company: "Acme Cloud",
    location: "Berlin, Germany",
    sector: "Enterprise software",
    founded_year: 2022,
    total_funding: "€12M",
    source_url: "https://acme.example/",
  }], [], plan);
  const [linked] = linkEvidenceToCompanies(
    companies,
    [{ id: "unrelated", content: "Welcome to an unrelated corporate homepage.", origins: [{ url: "https://unrelated.example/", label: "Homepage" }] }],
    [{ content: "Acme Cloud appears in the result set.", references: ["unrelated"] }],
  );

  assert.equal(linked.qualification, "needs_verification");
  assert.ok(linked.criterion_evidence.every((criterion) => criterion.status === "unsupported"));
});

test("verifies a match only when Cala context supports all four hard criteria", () => {
  const plan = {
    sector: "enterprise software",
    geography: "Europe",
    founded_after: 2020,
    max_funding_millions: 25,
    signals: ["partnerships"],
    result_count: 5,
    rationale: "European enterprise software with recent partnership momentum.",
  };
  const companies = rankCompanies([{
    company: "Acme Cloud",
    location: "Berlin, Germany",
    sector: "Enterprise software",
    founded_year: 2022,
    total_funding: "€12M",
  }], [], plan);
  const [linked] = linkEvidenceToCompanies(
    companies,
    [{
      id: "acme-profile",
      content: "Acme Cloud was founded in 2022 and is headquartered in Berlin, Germany. The enterprise software company has raised €12M in total funding.",
      origins: [{ url: "https://research.example/acme-profile", label: "Company profile" }],
    }],
    [],
  );

  assert.equal(linked.qualification, "verified_match");
  assert.ok(linked.criterion_evidence.every((criterion) => criterion.status === "supported"));
  assert.ok(linked.criterion_evidence.every((criterion) => criterion.source_url === "https://research.example/acme-profile"));
});

test("matches base-unit funding evidence without inflating it", () => {
  const plan = {
    sector: "artificial intelligence",
    geography: "Barcelona",
    founded_after: 2020,
    max_funding_millions: 15,
    signals: ["product launches"],
    result_count: 5,
    rationale: "Barcelona AI companies with early funding.",
  };
  const companies = rankCompanies([{
    company: "Feeder",
    location: "Barcelona, Spain",
    sector: "AI / Content Analytics",
    founded_year: 2021,
    total_funding: "€600,000",
  }], [], plan);
  const [linked] = linkEvidenceToCompanies(
    companies,
    [{
      id: "feeder-profile",
      content: "Feeder is a Barcelona-based AI platform founded in 2021 that raised €600,000 in funding.",
      origins: [{ url: "https://research.example/feeder", label: "Company profile" }],
    }],
    [],
  );

  assert.equal(linked.funding_millions, 0.6);
  assert.equal(linked.qualification, "verified_match");
  assert.ok(linked.criterion_evidence.every((criterion) => criterion.status === "supported"));
});

for (const fundingText of ["€1,000,000", "€1.000.000"]) {
  test(`matches repeated-separator base-unit funding evidence: ${fundingText}`, () => {
    const plan = {
      sector: "artificial intelligence",
      geography: "Barcelona",
      founded_after: 2020,
      max_funding_millions: 15,
      signals: ["product launches"],
      result_count: 5,
      rationale: "Barcelona AI companies with early funding.",
    };
    const companies = rankCompanies([{
      company: "One AI",
      location: "Barcelona, Spain",
      sector: "Artificial intelligence",
      founded_year: 2022,
      total_funding: "€1M",
    }], [], plan);
    const [linked] = linkEvidenceToCompanies(
      companies,
      [{
        id: "one-profile",
        content: `One AI is a Barcelona-based artificial intelligence company founded in 2022 that raised ${fundingText} in funding.`,
        origins: [{ url: "https://research.example/one-ai", label: "Company profile" }],
      }],
      [],
    );

    assert.equal(linked.qualification, "verified_match");
    assert.equal(linked.criterion_evidence.find((criterion) => criterion.criterion === "funding")?.status, "supported");
  });
}

test("does not borrow hard facts from explanation text or accept country-only evidence for a city thesis", () => {
  const plan = {
    sector: "artificial intelligence",
    geography: "Barcelona",
    founded_after: 2020,
    max_funding_millions: 15,
    signals: ["product launches"],
    result_count: 5,
    rationale: "Barcelona AI companies with early funding.",
  };
  const companies = rankCompanies([{
    company: "Acme AI",
    location: "Barcelona, Spain",
    sector: "Artificial intelligence",
    founded_year: 2022,
    total_funding: "€1M",
  }], [], plan);
  const [linked] = linkEvidenceToCompanies(
    companies,
    [{
      id: "homepage",
      content: "Acme AI is a company based in Spain. Official homepage.",
      origins: [{ url: "https://acme.example/", label: "Homepage" }],
    }],
    [{
      content: "Acme AI is a Barcelona artificial intelligence startup founded in 2022 with €1M in funding.",
      references: ["homepage"],
    }],
  );

  assert.equal(linked.qualification, "needs_verification");
  assert.equal(linked.criterion_evidence.find((criterion) => criterion.criterion === "geography")?.status, "unsupported");
  assert.equal(linked.criterion_evidence.find((criterion) => criterion.criterion === "founding_year")?.status, "unsupported");
  assert.equal(linked.criterion_evidence.find((criterion) => criterion.criterion === "funding")?.status, "unsupported");
  assert.deepEqual(linked.evidence_claims, []);
  assert.ok(!linked.evidence_claims.some((claim) => claim.claim.includes("founded in 2022")));
});

test("does not treat a sector term inside the company name as a sector assertion", () => {
  const plan = {
    sector: "artificial intelligence",
    geography: "Barcelona",
    founded_after: 2020,
    max_funding_millions: 15,
    signals: ["product launches"],
    result_count: 5,
    rationale: "Barcelona AI companies with early funding.",
  };
  const companies = rankCompanies([{
    company: "Acme AI",
    location: "Barcelona, Spain",
    sector: "Artificial intelligence",
    founded_year: 2022,
    total_funding: "€1M",
  }], [], plan);
  const [linked] = linkEvidenceToCompanies(
    companies,
    [
      {
        id: "generic-homepage",
        content: "Acme AI company official homepage.",
        origins: [{ url: "https://acme.example/", label: "Homepage" }],
      },
      {
        id: "factual-profile",
        content: "Acme AI was founded in 2022, is headquartered in Barcelona, and raised €1M in funding.",
        origins: [{ url: "https://research.example/acme", label: "Company profile" }],
      },
    ],
    [],
  );

  assert.equal(linked.qualification, "needs_verification");
  assert.equal(linked.criterion_evidence.find((criterion) => criterion.criterion === "sector")?.status, "unsupported");
});

test("uses outside thesis only when a failed hard criterion is source-supported", () => {
  const plan = {
    sector: "enterprise software",
    geography: "Europe",
    founded_after: 2020,
    max_funding_millions: 25,
    signals: ["partnerships"],
    result_count: 5,
    rationale: "European enterprise software with recent partnership momentum.",
  };
  const companies = rankCompanies([{
    company: "Acme Cloud",
    location: "Berlin, Germany",
    sector: "Enterprise software",
    founded_year: 2018,
    total_funding: "€12M",
  }], [], plan);
  assert.equal(companies[0].qualification, "needs_verification");

  const [linked] = linkEvidenceToCompanies(
    companies,
    [{ id: "year", content: "Acme Cloud was founded in 2018.", origins: [{ url: "https://research.example/acme-year", label: "Registry" }] }],
    [{ content: "Acme Cloud founding information is documented.", references: ["year"] }],
  );
  assert.equal(linked.qualification, "outside_thesis");
});
