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
    claim: "Acme Cloud disclosed €12M in funding.",
    source_url: "https://news.example/acme-round",
    source_label: "News source",
  }]);
});
