import assert from "node:assert/strict";
import test from "node:test";

import { rankCompanies } from "../lib/ranking.ts";

const plan = {
  sector: "artificial intelligence",
  geography: "Barcelona",
  founded_after: 2020,
  max_funding_millions: 15,
  signals: ["product launches"],
  result_count: 8,
  rationale: "Barcelona AI companies with known early-stage funding and recent product momentum.",
};

test("qualifies a company only when every hard thesis criterion is demonstrably met", () => {
  const [company] = rankCompanies([{
    company: "Veridian AI",
    location: "Barcelona, Spain",
    sector: "Artificial intelligence software",
    founded_year: 2021,
    total_funding: "€10M",
    latest_event_date: "2026-06-01",
    momentum_signal: "Launched a new enterprise product",
    source_url: "https://example.com/veridian",
  }], [], plan);

  assert.equal(company.qualification, "verified_match");
  assert.deepEqual(company.missing_criteria, []);
  assert.deepEqual(company.failed_criteria, []);
});

test("keeps missing founding year or funding in the verification queue", () => {
  const [company] = rankCompanies([{
    company: "Unresolved AI",
    location: "Barcelona",
    sector: "AI platform",
    latest_event_date: "2026-05-10",
    momentum_signal: "New product launch",
  }], [], plan);

  assert.equal(company.qualification, "needs_verification");
  assert.ok(company.missing_criteria.includes("Founding year is not confirmed"));
  assert.ok(company.missing_criteria.includes("Disclosed funding is not confirmed"));
});

test("excludes companies with a known out-of-thesis year or funding amount", () => {
  const companies = rankCompanies([
    {
      company: "Too Early AI",
      location: "Barcelona",
      sector: "Artificial intelligence",
      founded_year: 2018,
      total_funding: "€8M",
    },
    {
      company: "Too Funded AI",
      location: "Barcelona",
      sector: "Artificial intelligence",
      founded_year: 2022,
      total_funding: "€22M",
    },
  ], [], plan);

  assert.equal(companies.find((company) => company.name === "Too Early AI")?.qualification, "outside_thesis");
  assert.match(companies.find((company) => company.name === "Too Early AI")?.failed_criteria.join(" ") ?? "", /before the 2020 threshold/);
  assert.equal(companies.find((company) => company.name === "Too Funded AI")?.qualification, "outside_thesis");
  assert.match(companies.find((company) => company.name === "Too Funded AI")?.failed_criteria.join(" ") ?? "", /exceeds the €15M ceiling/);
});
