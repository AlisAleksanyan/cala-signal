"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { CandidateQualification, RankedCompany, ScoutResponse } from "@/lib/types";

const PRESETS = [
  {
    label: "AI / Barcelona",
    brief: "Scout Barcelona artificial intelligence startups founded since 2020, below €15M in disclosed funding, with recent hiring or product momentum.",
  },
  {
    label: "Climate / Southern Europe",
    brief: "Find Southern European climate tech startups founded since 2019, below €25M in disclosed funding, with recent partnerships, grants, or product launches.",
  },
  {
    label: "Enterprise / Europe",
    brief: "Find European enterprise software startups founded since 2020, below €30M in disclosed funding, with credible recent partnerships or product momentum.",
  },
] as const;

const qualificationCopy: Record<CandidateQualification, { label: string; group: string }> = {
  verified_match: { label: "Verified match", group: "Verified matches" },
  needs_verification: { label: "Needs verification", group: "Needs verification" },
  outside_thesis: { label: "Outside thesis", group: "Excluded by known facts" },
};

function money(value: number | null): string {
  return value === null ? "Not confirmed" : `€${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
}

function scoreTone(score: number): string {
  if (score >= 75) return "signal-strong";
  if (score >= 50) return "signal-medium";
  return "signal-weak";
}

function sourceHost(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "supporting source";
  }
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="score-row">
      <span>{label}</span>
      <div className="score-track" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function CompanyCard({ company }: { company: RankedCompany }) {
  const criteria = [...company.failed_criteria, ...company.missing_criteria];

  return (
    <article className={`company-card status-${company.qualification}`}>
      <div className="company-heading">
        <div>
          <span className="status-pill">{qualificationCopy[company.qualification].label}</span>
          <p className="company-sector">{company.sector || "Sector not confirmed"}</p>
          <h4>{company.name}</h4>
        </div>
        <div className={`score-badge ${scoreTone(company.score)}`} aria-label={`Evidence readiness ${company.score} out of 100`}>
          <strong>{company.score}</strong>
          <span>Evidence readiness</span>
        </div>
      </div>

      <div className="company-facts">
        <div><span>Location</span><strong>{company.location || "Not confirmed"}</strong></div>
        <div><span>Founded</span><strong>{company.founded_year ?? "Not confirmed"}</strong></div>
        <div><span>Disclosed funding</span><strong>{money(company.funding_millions)}</strong></div>
        <div>
          <span>Latest signal</span>
          <strong>{company.momentum_signal || "No recent signal confirmed"}</strong>
          {company.latest_event_date && <small>{company.latest_event_date}</small>}
        </div>
      </div>

      <div className={`criteria-box ${criteria.length ? "has-gaps" : "is-complete"}`}>
        <strong>{criteria.length ? "Missing or failed criteria" : "Qualification check"}</strong>
        {criteria.length ? (
          <ul>{criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
        ) : (
          <p>Founding year, funding, geography, and sector are demonstrated against the thesis.</p>
        )}
      </div>

      {(company.evidence_claims.length > 0 || company.conflicting_facts.length > 0) && (
        <div className="claim-list">
          <p className="section-label">Cala evidence claims</p>
          {company.evidence_claims.map((claim) => (
            <div className="evidence-claim" key={`${claim.claim}-${claim.source_url ?? "unlinked"}`}>
              <p>{claim.claim}</p>
              {claim.source_url && claim.source_url !== company.source_url && (
                <a href={claim.source_url} target="_blank" rel="noreferrer">
                  {claim.source_label ? `${claim.source_label} · ` : ""}{sourceHost(claim.source_url)} <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          ))}
          {company.conflicting_facts.map((claim) => (
            <div className="evidence-claim conflict-claim" key={`${claim.claim}-${claim.source_url ?? "conflict"}`}>
              <strong>Conflicting evidence</strong>
              <p>{claim.claim}</p>
              {claim.source_url && claim.source_url !== company.source_url && <a href={claim.source_url} target="_blank" rel="noreferrer">Review on {sourceHost(claim.source_url)} <span aria-hidden="true">↗</span></a>}
            </div>
          ))}
        </div>
      )}

      <div className="card-actions">
        {company.source_url && <a href={company.source_url} target="_blank" rel="noreferrer">Open source · {sourceHost(company.source_url)} <span aria-hidden="true">↗</span></a>}
        <details className="score-details">
          <summary>Evidence readiness details</summary>
          <div className="score-grid">
            <ScoreBar label="Thesis evidence" value={company.score_breakdown.thesis_evidence} max={30} />
            <ScoreBar label="Capital evidence" value={company.score_breakdown.capital_evidence} max={20} />
            <ScoreBar label="Freshness" value={company.score_breakdown.evidence_freshness} max={20} />
            <ScoreBar label="Latest signal" value={company.score_breakdown.signal_evidence} max={15} />
            <ScoreBar label="Completeness" value={company.score_breakdown.completeness} max={15} />
          </div>
          {company.missing_fields.length > 0 && <p className="missing-note">Unavailable evidence: {company.missing_fields.join(", ")}.</p>}
          <p className="score-disclaimer">This score measures evidence readiness. It is not an investment recommendation and does not determine qualification.</p>
        </details>
      </div>
    </article>
  );
}

function buildShortlistMemo(result: ScoutResponse): string {
  const groups: CandidateQualification[] = ["verified_match", "needs_verification", "outside_thesis"];
  const lines = [
    "CALA SIGNAL shortlist",
    `Thesis: ${result.thesis.rationale}`,
    `${result.thesis.sector} · ${result.thesis.geography} · founded ${result.thesis.founded_after}+ · disclosed funding up to €${result.thesis.max_funding_millions}M`,
    "",
  ];

  for (const qualification of groups) {
    const companies = result.companies.filter((company) => company.qualification === qualification);
    lines.push(`${qualificationCopy[qualification].group} (${companies.length})`);
    if (!companies.length) lines.push("- None");
    for (const company of companies) {
      lines.push(`- ${company.name} — Evidence readiness ${company.score}/100; ${company.location || "location unconfirmed"}; founded ${company.founded_year ?? "unconfirmed"}; funding ${money(company.funding_millions)}; latest signal: ${company.momentum_signal || "unconfirmed"}`);
      const criteria = [...company.failed_criteria, ...company.missing_criteria];
      if (criteria.length) lines.push(`  Check: ${criteria.join("; ")}`);
      const sources = [...new Set([
        company.source_url,
        ...company.evidence_claims.map((claim) => claim.source_url),
        ...company.conflicting_facts.map((claim) => claim.source_url),
      ].filter((url): url is string => Boolean(url)))];
      if (sources.length) lines.push(`  Sources: ${sources.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("Evidence readiness is not an investment recommendation. Verify facts before making decisions.");
  return lines.join("\n");
}

function ResultGroup({ qualification, companies }: { qualification: CandidateQualification; companies: RankedCompany[] }) {
  const descriptions: Record<CandidateQualification, string> = {
    verified_match: "All hard criteria are known and demonstrably match the thesis.",
    needs_verification: "Potentially relevant companies with at least one hard criterion still unknown or unproven.",
    outside_thesis: "Known founding year or disclosed funding falls outside the thesis boundary.",
  };

  return (
    <section className="result-group" aria-labelledby={`group-${qualification}`}>
      <div className="group-heading">
        <div>
          <p className="section-label">{qualificationCopy[qualification].label}</p>
          <h3 id={`group-${qualification}`}>{qualificationCopy[qualification].group}</h3>
          <p>{descriptions[qualification]}</p>
        </div>
        <strong>{companies.length}</strong>
      </div>
      {companies.length > 0 ? (
        <div className="company-list">{companies.map((company) => <CompanyCard company={company} key={company.name} />)}</div>
      ) : (
        <p className="empty-group">No companies in this group.</p>
      )}
    </section>
  );
}

function Results({ result }: { result: ScoutResponse }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const grouped = useMemo(() => ({
    verified_match: result.companies.filter((company) => company.qualification === "verified_match"),
    needs_verification: result.companies.filter((company) => company.qualification === "needs_verification"),
    outside_thesis: result.companies.filter((company) => company.qualification === "outside_thesis"),
  }), [result.companies]);
  const evidenceReceiptCount = useMemo(() => new Set(result.companies.flatMap((company) => [
    company.source_url,
    ...company.evidence_claims.map((claim) => claim.source_url),
    ...company.conflicting_facts.map((claim) => claim.source_url),
  ].filter((url): url is string => Boolean(url)))).size, [result.companies]);

  async function copyShortlist() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(buildShortlistMemo(result));
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2_000);
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className="results" aria-live="polite">
      <div className="result-head">
        <div>
          <p className="eyebrow">Decision workspace</p>
          <h2>Your shortlist is ready.</h2>
        </div>
        <button className="copy-button" type="button" onClick={copyShortlist}>
          {copyState === "copied" ? "Shortlist copied" : copyState === "failed" ? "Copy unavailable" : "Copy shortlist"}
        </button>
      </div>

      <div className="thesis-panel">
        <div>
          <p className="section-label">Thesis summary</p>
          <p className="thesis-rationale">{result.thesis.rationale}</p>
        </div>
        <div className="thesis-chips" aria-label="Thesis criteria">
          <span>{result.thesis.sector}</span>
          <span>{result.thesis.geography}</span>
          <span>Founded {result.thesis.founded_after}+</span>
          <span>Funding ≤ €{result.thesis.max_funding_millions}M</span>
          {result.thesis.signals.map((signal) => <span key={signal}>{signal}</span>)}
        </div>
      </div>

      <div className="result-counts" aria-label="Shortlist outcome">
        <div><strong>{grouped.verified_match.length}</strong><span>Qualified leads</span></div>
        <div><strong>{grouped.needs_verification.length}</strong><span>Verification queue</span></div>
        <div><strong>{evidenceReceiptCount}</strong><span>Unique source receipts</span></div>
      </div>

      {grouped.verified_match.length === 0 && (
        <div className="no-verified" role="status">
          <strong>Zero verified matches.</strong>
          <p>No company currently demonstrates every hard criterion. Review the verification queue before changing the thesis.</p>
        </div>
      )}

      <ResultGroup qualification="verified_match" companies={grouped.verified_match} />
      <ResultGroup qualification="needs_verification" companies={grouped.needs_verification} />
      <ResultGroup qualification="outside_thesis" companies={grouped.outside_thesis} />

      {result.caveats.length > 0 && (
        <div className="research-notes">
          <strong>Research notes</strong>
          <ul>{result.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

export function SignalApp() {
  const [brief, setBrief] = useState<string>(PRESETS[0].brief);
  const [result, setResult] = useState<ScoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const characterCount = useMemo(() => brief.trim().length, [brief]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const payload = await response.json() as ScoutResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "The shortlist could not be built.");
      setResult(payload);
      window.setTimeout(() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.querySelector(".results")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      }, 50);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The shortlist could not be built.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <nav className="nav-shell" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Cala Signal home">
          <span className="brand-mark">CS</span>
          <span>CALA SIGNAL<small>Source-backed investor sourcing</small></span>
        </a>
        <p>For investors · accelerators · venture teams</p>
      </nav>

      <section className="hero" id="top">
        <div className="hero-kicker"><span>Customer-first company research</span><span>Built around Cala evidence</span></div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>One thesis.<br />A shortlist you can <em>defend.</em></h1>
            <p>For early-stage investors, accelerators, and corporate venture teams: turn a natural-language investment thesis into a source-backed startup shortlist in about a minute.</p>
          </div>
          <aside className="outcome-card" aria-label="Shortlist outcome preview">
            <p className="section-label">Your decision output</p>
            <div><span>Qualified leads</span><strong>Known facts match</strong></div>
            <div><span>Verification queue</span><strong>Unknowns stay visible</strong></div>
            <div><span>Evidence receipts</span><strong>Claims link to sources</strong></div>
          </aside>
        </div>

        <form className="signal-form" onSubmit={submit}>
          <label htmlFor="brief">Describe your investment thesis</label>
          <textarea
            id="brief"
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            maxLength={600}
            rows={4}
            disabled={loading}
            placeholder="Example: Find climate tech startups in Southern Europe founded since 2020, below €20M raised, with recent commercial momentum."
          />
          <div className="form-footer">
            <div className="preset-row" aria-label="Investment thesis presets">
              <span>Presets</span>
              {PRESETS.map((preset) => (
                <button type="button" onClick={() => setBrief(preset.brief)} key={preset.label} disabled={loading}>{preset.label}</button>
              ))}
            </div>
            <span className="char-count">{characterCount}/600</span>
            <button className="run-button" type="submit" disabled={loading || characterCount < 24}>
              {loading ? <><span className="spinner" />Building shortlist…</> : <>Build my shortlist <span aria-hidden="true">→</span></>}
            </button>
          </div>
          {loading && (
            <div className="loading-status" role="status" aria-live="polite">
              <strong>Cala is resolving companies, qualification facts, and source evidence.</strong>
              <span>Most shortlists are ready in about a minute.</span>
            </div>
          )}
          {error && <div className="error-message" role="alert"><strong>We could not build this shortlist.</strong> {error}</div>}
        </form>

        <div className="workflow-strip" aria-label="How Cala Signal works">
          <div><span>01</span><strong>Describe thesis</strong><small>Write the mandate in your own words.</small></div>
          <i aria-hidden="true" />
          <div><span>02</span><strong>Cala resolves evidence</strong><small>Company facts and supporting sources.</small></div>
          <i aria-hidden="true" />
          <div><span>03</span><strong>Decide what is ready</strong><small>Qualified leads separated from verification risks.</small></div>
        </div>
      </section>

      {result ? <Results result={result} /> : (
        <section className="promise-section">
          <p className="eyebrow">Designed for the first sourcing decision</p>
          <h2>Know what qualifies.<br />Know what still needs proof.</h2>
          <div className="promise-grid">
            <article><span>01</span><h3>Describe the thesis</h3><p>Set sector, geography, founding year, funding ceiling, and the signals that matter.</p></article>
            <article><span>02</span><h3>Cala resolves the facts</h3><p>Structured company fields meet source-linked evidence claims, with provider text kept safely as plain text.</p></article>
            <article><span>03</span><h3>Act on the right queue</h3><p>Known matches, unresolved candidates, and factual exclusions stay separate so uncertainty never masquerades as fit.</p></article>
          </div>
        </section>
      )}

      <footer>
        <p>CALA SIGNAL supports sourcing and verification; it does not provide investment advice. Confirm material facts before making decisions.</p>
        <strong>Powered by Cala</strong>
      </footer>
    </main>
  );
}
