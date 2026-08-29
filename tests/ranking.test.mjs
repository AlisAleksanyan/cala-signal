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

test("keeps structured matches in verification until Cala corroborates every hard criterion", () => {
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

  assert.equal(company.qualification, "needs_verification");
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

test("records structured failures without excluding until Cala source evidence corroborates them", () => {
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

  assert.equal(companies.find((company) => company.name === "Too Early AI")?.qualification, "needs_verification");
  assert.match(companies.find((company) => company.name === "Too Early AI")?.failed_criteria.join(" ") ?? "", /before the 2020 threshold/);
  assert.equal(companies.find((company) => company.name === "Too Funded AI")?.qualification, "needs_verification");
  assert.match(companies.find((company) => company.name === "Too Funded AI")?.failed_criteria.join(" ") ?? "", /exceeds the €15M ceiling/);
});

test("does not exclude geography or sector mismatches before source corroboration", () => {
  const companies = rankCompanies([
    { company: "Madrid AI", location: "Madrid, Spain", sector: "Artificial intelligence", founded_year: 2022, total_funding: "€8M", source_url: "https://example.com/madrid" },
    { company: "Barcelona Health", location: "Barcelona", sector: "Health tech", founded_year: 2022, total_funding: "€8M", source_url: "https://example.com/health" },
  ], [], plan);

  assert.ok(companies.every((company) => company.qualification === "needs_verification"));
});

test("parses base-unit currency strings without inflating them into millions", () => {
  const companies = rankCompanies([
    { company: "Half Million AI", location: "Barcelona", sector: "Artificial intelligence", founded_year: 2022, total_funding: "€500,000", source_url: "https://example.com/half" },
    { company: "One Million AI", location: "Barcelona", sector: "Artificial intelligence", founded_year: 2022, total_funding: "€1,000,000", source_url: "https://example.com/one" },
  ], [], plan);

  assert.equal(companies.find((company) => company.name === "Half Million AI")?.funding_millions, 0.5);
  assert.equal(companies.find((company) => company.name === "One Million AI")?.funding_millions, 1);
  assert.ok(companies.every((company) => company.qualification === "needs_verification"));
});

test("does not award freshness credit to a future-dated signal", () => {
  const [company] = rankCompanies([{
    company: "Future AI",
    location: "Barcelona",
    sector: "Artificial intelligence",
    founded_year: 2022,
    total_funding: "€5M",
    latest_event_date: "2099-01-01",
    momentum_signal: "Claimed future launch",
    source_url: "https://example.com/future",
  }], [], plan);

  assert.equal(company.score_breakdown.evidence_freshness, 0);
});
