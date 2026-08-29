import assert from "node:assert/strict";
import test from "node:test";

import { entireProof } from "../lib/entire-proof.ts";

test("Entire proof is a real closed-loop snapshot without sensitive material", () => {
  assert.equal(entireProof.reviewLoop[0].title, "Request changes");
  assert.equal(entireProof.reviewLoop.at(-1).title, "Approved");
  assert.deepEqual(entireProof.useCases.map((useCase) => useCase.id), ["review", "why", "blame", "experts", "tokens"]);

  const publicSnapshot = JSON.stringify(entireProof);
  assert.doesNotMatch(publicSnapshot, /OPENAI_API_KEY|CALA_API_KEY|promo_code|sk-[A-Za-z0-9]/i);
  assert.doesNotMatch(publicSnapshot, /[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  assert.doesNotMatch(publicSnapshot, /\/Users\/|\.env\.local|raw-transcript/i);
});

test("Entire proof links are restricted to the public repository and Entire", () => {
  const links = [
    entireProof.publicTrailUrl,
    ...entireProof.reviewLoop.map((step) => step.href),
    ...entireProof.useCases.map((useCase) => useCase.href),
  ];

  for (const link of links) {
    const url = new URL(link);
    assert.equal(url.protocol, "https:");
    assert.ok(["entire.io", "github.com"].includes(url.hostname), `unexpected public proof host: ${url.hostname}`);
  }
});
