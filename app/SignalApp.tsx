"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { RankedCompany, ScoutResponse } from "@/lib/types";

const EXAMPLES = [
  "Find European enterprise software startups founded since 2020 with credible recent partnerships, grants, or product launches that signal operational momentum.",
  "Scout Barcelona AI startups founded after 2020, below €15M raised, showing hiring or product momentum.",
  "Find Southern European mobility startups since 2018, under €30M funding, with recent commercial partnerships.",
];

function money(value: number | null): string {
  return value === null ? "Unknown" : `€${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
}

function scoreTone(score: number): string {
  if (score >= 75) return "signal-strong";
  if (score >= 50) return "signal-medium";
  return "signal-weak";
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
  return (
    <article className="company-card">
      <div className="company-rank">#{String(company.rank).padStart(2, "0")}</div>
      <div className="company-main">
        <div className="company-heading">
          <div>
            <p className="company-meta">{company.location || "Location missing"} · {company.founded_year || "Year missing"}</p>
            <h3>{company.name}</h3>
          </div>
          <div className={`score-badge ${scoreTone(company.score)}`}>
            <strong>{company.score}</strong>
            <span>/100</span>
          </div>
        </div>

        <div className="company-facts">
          <div><span>Sector</span><strong>{company.sector || "Unknown"}</strong></div>
          <div><span>Disclosed funding</span><strong>{money(company.funding_millions)}</strong></div>
          <div><span>Latest round</span><strong>{company.latest_round || "Unknown"}</strong></div>
          <div><span>Evidence date</span><strong>{company.latest_event_date || "Unknown"}</strong></div>
        </div>

        <div className="momentum-note">
          <span>Momentum signal</span>
          <p>{company.momentum_signal || "Cala did not return a recent momentum signal."}</p>
        </div>

        <details className="score-details">
          <summary>Why this score</summary>
          <div className="score-grid">
            <ScoreBar label="Thesis fit" value={company.score_breakdown.thesis_fit} max={30} />
            <ScoreBar label="Funding gap" value={company.score_breakdown.funding_gap} max={20} />
            <ScoreBar label="Freshness" value={company.score_breakdown.evidence_freshness} max={20} />
            <ScoreBar label="Momentum" value={company.score_breakdown.momentum} max={15} />
            <ScoreBar label="Completeness" value={company.score_breakdown.completeness} max={15} />
          </div>
          {company.missing_fields.length > 0 && (
            <p className="missing-note">Missing: {company.missing_fields.join(", ")}. Missing evidence always scores zero.</p>
          )}
          <div className="evidence-links">
            {company.source_url && <a href={company.source_url} target="_blank" rel="noreferrer">Open source ↗</a>}
            {company.entity_id && <code>Cala entity {company.entity_id.slice(0, 8)}…</code>}
          </div>
        </details>
      </div>
    </article>
  );
}

function Results({ result }: { result: ScoutResponse }) {
  const maxScore = Math.max(1, ...result.companies.map((company) => company.score));
  return (
    <section className="results" aria-live="polite">
      <div className="result-head">
        <div>
          <p className="eyebrow">Signal report · {result.companies.length} {result.companies.length === 1 ? "candidate" : "candidates"}</p>
          <h2>The opportunity skyline</h2>
        </div>
        <div className="timing-chip">{(result.timings_ms.total / 1000).toFixed(1)}s end to end</div>
      </div>

      <div className="thesis-panel">
        <div className="thesis-copy">
          <span className="step-number">01</span>
          <div>
            <p className="panel-label">AI-structured thesis</p>
            <p>{result.thesis.rationale}</p>
          </div>
        </div>
        <div className="thesis-chips">
          <span>{result.thesis.sector}</span>
          <span>{result.thesis.geography}</span>
          <span>Founded ≥ {result.thesis.founded_after}</span>
          <span>Funding &lt; €{result.thesis.max_funding_millions}M</span>
          {result.thesis.signals.map((signal) => <span key={signal}>{signal}</span>)}
        </div>
        <details className="compiled-query">
          <summary>Inspect the safe Cala query</summary>
          <code>{result.cala_query}</code>
        </details>
      </div>

      {result.companies.length > 0 ? (
        <>
          <div className="skyline" aria-label="Ranked opportunity scores">
            <div className="skyline-label">
              <span className="step-number">02</span>
              <div><p className="panel-label">Deterministic ranking</p><p>Every point is inspectable.</p></div>
            </div>
            <div className="skyline-bars">
              {result.companies.map((company) => (
                <div className="skyline-item" key={company.name}>
                  <strong>{company.score}</strong>
                  <div className="skyline-bar-wrap">
                    <span className={scoreTone(company.score)} style={{ height: `${Math.max(16, (company.score / maxScore) * 100)}%` }} />
                  </div>
                  <small>{company.name}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="company-list">
            {result.companies.map((company) => <CompanyCard company={company} key={company.name} />)}
          </div>
        </>
      ) : (
        <div className="empty-result">No structured companies matched. Broaden the brief and run it again.</div>
      )}

      <div className="evidence-panel">
        <div className="evidence-heading">
          <span className="step-number">03</span>
          <div><p className="panel-label">Cala evidence ledger</p><p>What the graph knows—and what it does not.</p></div>
        </div>
        {result.narrative && <div className="cala-narrative">{result.narrative}</div>}
        <div className="evidence-grid">
          {result.evidence.slice(0, 6).map((item) => (
            <article key={item.id}>
              <code>KNOWBIT {item.id.slice(0, 8)}</code>
              <p>{item.content}</p>
            </article>
          ))}
        </div>
        {result.caveats.length > 0 && (
          <div className="caveat-box">
            <strong>Due-diligence queue</strong>
            {result.caveats.map((caveat) => <p key={caveat}>→ {caveat}</p>)}
          </div>
        )}
      </div>
      <p className="request-id">Audit reference {result.request_id}</p>
    </section>
  );
}

export function SignalApp() {
  const [brief, setBrief] = useState(EXAMPLES[0]);
  const [result, setResult] = useState<ScoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const characterCount = useMemo(() => brief.trim().length, [brief]);

  useEffect(() => {
    if (!loading) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000)), 1_000);
    return () => window.clearInterval(timer);
  }, [loading]);

  const liveStage = elapsedSeconds < 5
    ? "Constrain · validating the thesis"
    : elapsedSeconds < 60
      ? "Verify · Cala is expanding the knowledge graph"
      : "Trace · Cala is assembling sources and explainability";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setElapsedSeconds(0);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const payload = await response.json() as ScoutResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "The signal pipeline failed.");
      setResult(payload);
      window.setTimeout(() => document.querySelector(".results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The signal pipeline failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <nav className="nav-shell">
        <a className="brand" href="#top" aria-label="Cala Signal home">
          <span className="brand-mark">CS</span>
          <span>CALA SIGNAL<small>Evidence-first scouting</small></span>
        </a>
        <div className="nav-proof">
          <span><i /> LIVE PIPELINE</span>
          <span>OPENAI × CALA</span>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-kicker"><span>Investment intelligence</span><span>Barcelona · 2026</span></div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>Find the companies<br />your thesis is <em>missing.</em></h1>
            <p>Describe an opportunity. CALA SIGNAL converts it into a constrained search, pulls traceable company evidence from Cala, and ranks the gaps—without hiding the math.</p>
          </div>
          <aside className="method-card">
            <p className="panel-label">Scoring model / 100</p>
            <div><span>Thesis fit</span><strong>30</strong></div>
            <div><span>Funding gap</span><strong>20</strong></div>
            <div><span>Evidence freshness</span><strong>20</strong></div>
            <div><span>Momentum</span><strong>15</strong></div>
            <div><span>Completeness</span><strong>15</strong></div>
          </aside>
        </div>

        <form className="signal-form" onSubmit={submit}>
          <label htmlFor="brief">What opportunity are you hunting?</label>
          <textarea
            id="brief"
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            maxLength={600}
            rows={4}
            disabled={loading}
            placeholder="Example: Find underfunded climate startups in Spain with recent momentum…"
          />
          <div className="form-footer">
            <div className="example-row">
              <span>Try:</span>
              {EXAMPLES.map((example, index) => (
                <button type="button" onClick={() => setBrief(example)} key={example} disabled={loading}>0{index + 1}</button>
              ))}
            </div>
            <span className="char-count">{characterCount}/600</span>
            <button className="run-button" type="submit" disabled={loading || characterCount < 24}>
              {loading ? <><span className="spinner" />Tracing signals…</> : <>Run live scout <span>↗</span></>}
            </button>
          </div>
          {loading && (
            <div className="loading-status" role="status" aria-live="polite">
              <span>{liveStage}</span>
              <strong>{elapsedSeconds}s</strong>
              <small>Live evidence runs usually take 60–90 seconds.</small>
            </div>
          )}
          {error && <div className="error-message" role="alert"><strong>Pipeline stopped.</strong> {error}</div>}
        </form>

        <div className="pipeline-strip">
          <div><span>01</span><strong>Constrain</strong><small>OpenAI structured output</small></div>
          <i />
          <div><span>02</span><strong>Verify</strong><small>Cala knowledge graph</small></div>
          <i />
          <div><span>03</span><strong>Rank</strong><small>Deterministic score</small></div>
          <i />
          <div><span>04</span><strong>Inspect</strong><small>Evidence + missing fields</small></div>
        </div>
      </section>

      {result ? <Results result={result} /> : (
        <section className="promise-section">
          <p className="eyebrow">Why this is different</p>
          <h2>Not another chat answer.<br />A decision you can audit.</h2>
          <div className="promise-grid">
            <article><span>01</span><h3>Bounded agent</h3><p>The model cannot invent a database command. Its output must pass a strict schema and a second server validation.</p></article>
            <article><span>02</span><h3>Traceable evidence</h3><p>Cala returns typed entities, KnowBits, and explainability—not a pile of unverified search links.</p></article>
            <article><span>03</span><h3>Honest ranking</h3><p>Missing facts reduce the score. Every point and every gap stays visible to the investor.</p></article>
          </div>
        </section>
      )}

      <footer>
        <div className="brand"><span className="brand-mark">CS</span><span>CALA SIGNAL<small>Built at The Summer Lock-In</small></span></div>
        <p>Live knowledge by Cala · Structured planning by OpenAI · Security checked with Aikido · Build provenance by Entire</p>
      </footer>
    </main>
  );
}
