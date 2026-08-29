"use client";

import { useMemo, useState } from "react";
import { entireProof, type EntireUseCase } from "@/lib/entire-proof";

export function EntireBuildPassport() {
  const [selected, setSelected] = useState<EntireUseCase["id"]>("review");
  const active = useMemo(
    () => entireProof.useCases.find((useCase) => useCase.id === selected) ?? entireProof.useCases[0],
    [selected],
  );

  return (
    <section className="entire-passport" id="build-passport" aria-labelledby="passport-title">
      <div className="passport-heading">
        <div>
          <p className="eyebrow">Entire Labs · real repository snapshot</p>
          <h2 id="passport-title">Every AI edit should ship with a receipt.</h2>
        </div>
        <div className="passport-intro">
          <p>
            This is not an Entire logo wall. It is a sanitized build-intelligence layer generated from
            CALA SIGNAL&apos;s real checkpoints: why a decision exists, who touched it, what review found,
            whether the fix closed the loop, and where agent context was wasted.
          </p>
          <a href={entireProof.publicTrailUrl} target="_blank" rel="noreferrer">Open public Entire session ↗</a>
        </div>
      </div>

      <div className="passport-summary" aria-label="Entire build proof summary">
        {entireProof.summary.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="closure-card">
        <div className="closure-title">
          <span className="step-number">04</span>
          <div>
            <p className="panel-label">Review → fix → verify</p>
            <p>The audit trail shows the uncomfortable middle, not only the green ending.</p>
          </div>
        </div>
        <div className="closure-flow">
          {entireProof.reviewLoop.map((step, index) => (
            <div className="closure-stage-wrap" key={step.label}>
              <a className="closure-stage" data-tone={step.tone} href={step.href} target="_blank" rel="noreferrer">
                <span>{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
                <code>{step.reference}</code>
              </a>
              {index < entireProof.reviewLoop.length - 1 && <i aria-hidden="true">→</i>}
            </div>
          ))}
        </div>
      </div>

      <div className="labs-workbench">
        <div className="labs-tabs" aria-label="Entire Labs use cases">
          <p className="panel-label">Five applied workflows</p>
          {entireProof.useCases.map((useCase) => (
            <button
              type="button"
              key={useCase.id}
              className={useCase.id === active.id ? "active" : ""}
              aria-pressed={useCase.id === active.id}
              onClick={() => setSelected(useCase.id)}
            >
              <span>{useCase.label}</span>
              <small>{useCase.title}</small>
            </button>
          ))}
        </div>

        <article className="labs-detail" aria-live="polite">
          <div className="labs-command"><span>LAB / {active.label.toUpperCase()}</span><code>{active.command}</code></div>
          <h3>{active.title}</h3>
          <p>{active.description}</p>
          <div className="labs-outcome">
            <span>Observed outcome</span>
            <strong>{active.outcome}</strong>
          </div>
          <ul>
            {active.evidence.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <a href={active.href} target="_blank" rel="noreferrer">Inspect the underlying evidence ↗</a>
        </article>
      </div>

      <div className="passport-boundary">
        <strong>Public-data boundary</strong>
        <p>
          The deployed site contains only allowlisted counts, verdicts, commit references, and public links.
          Entire credentials, full prompts, transcripts, emails, and local paths stay outside the bundle.
        </p>
        <code>{entireProof.repo} · {entireProof.snapshot}</code>
      </div>
    </section>
  );
}
