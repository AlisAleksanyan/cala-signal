import assert from "node:assert/strict";
import test from "node:test";

import { queryCala } from "../lib/cala.ts";
import { planThesis } from "../lib/openai-planner.ts";

const originalFetch = globalThis.fetch;
const originalCalaKey = process.env.CALA_API_KEY;
const originalOpenAiKey = process.env.OPENAI_API_KEY;

function abortablePending(signal, onAbort = () => {}) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      onAbort();
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    signal.addEventListener("abort", () => {
      onAbort();
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

function successfulCalaResponse(url) {
  const isSearch = String(url).endsWith("/knowledge/search");
  return new Response(JSON.stringify(isSearch
    ? { content: "", context: [], entities: null, explainability: [] }
    : { results: [], entities: [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function successfulOpenAiResponse() {
  return new Response(JSON.stringify({
    output_text: JSON.stringify({
      sector: "enterprise software",
      geography: "Europe",
      founded_after: 2020,
      max_funding_millions: 25,
      signals: ["partnerships"],
      result_count: 5,
      rationale: "Recent partnerships indicate credible operational momentum.",
    }),
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

test.beforeEach(() => {
  process.env.CALA_API_KEY = "test-key";
  process.env.OPENAI_API_KEY = "test-key";
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalCalaKey === undefined) delete process.env.CALA_API_KEY;
  else process.env.CALA_API_KEY = originalCalaKey;
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAiKey;
});

test("Cala timeout aborts both provider requests", async () => {
  let aborted = 0;
  globalThis.fetch = async (_url, { signal }) => abortablePending(signal, () => { aborted += 1; });

  await assert.rejects(queryCala("test query", undefined, 10), { name: "TimeoutError" });
  assert.equal(aborted, 2);
});

test("a signal aborted before Cala starts reaches both fetches", async () => {
  const request = new AbortController();
  request.abort(new DOMException("Client disconnected", "AbortError"));
  let preAborted = 0;
  globalThis.fetch = async (_url, { signal }) => {
    if (signal.aborted) preAborted += 1;
    return abortablePending(signal);
  };

  await assert.rejects(queryCala("test query", request.signal, 1_000), { name: "AbortError" });
  assert.equal(preAborted, 2);
});

test("mid-flight client cancellation aborts both Cala requests", async () => {
  const request = new AbortController();
  let aborted = 0;
  globalThis.fetch = async (_url, { signal }) => abortablePending(signal, () => { aborted += 1; });

  const pending = queryCala("test query", request.signal, 1_000);
  request.abort(new DOMException("Client disconnected", "AbortError"));
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(aborted, 2);
});

test("one Cala failure cancels its still-running sibling", async () => {
  let siblingAborted = false;
  globalThis.fetch = async (url, { signal }) => {
    if (String(url).endsWith("/knowledge/query")) throw new Error("query failed");
    return abortablePending(signal, () => { siblingAborted = true; });
  };

  await assert.rejects(queryCala("test query", undefined, 1_000), /query failed/);
  assert.equal(siblingAborted, true);
});

test("Cala removes the parent abort listener after success", async () => {
  const request = new AbortController();
  const originalAdd = request.signal.addEventListener.bind(request.signal);
  const originalRemove = request.signal.removeEventListener.bind(request.signal);
  let added = 0;
  let removed = 0;
  request.signal.addEventListener = (...args) => {
    if (args[0] === "abort") added += 1;
    return originalAdd(...args);
  };
  request.signal.removeEventListener = (...args) => {
    if (args[0] === "abort") removed += 1;
    return originalRemove(...args);
  };
  globalThis.fetch = async (url) => successfulCalaResponse(url);

  await queryCala("test query", request.signal, 1_000);
  assert.equal(added, 1);
  assert.equal(removed, 1);
});

test("OpenAI timeout aborts the planning request", async () => {
  let aborted = false;
  globalThis.fetch = async (_url, { signal }) => abortablePending(signal, () => { aborted = true; });

  await assert.rejects(planThesis("A sufficiently detailed investment brief", undefined, 10), { name: "TimeoutError" });
  assert.equal(aborted, true);
});

test("a signal aborted before planning reaches OpenAI", async () => {
  const request = new AbortController();
  request.abort(new DOMException("Client disconnected", "AbortError"));
  let preAborted = false;
  globalThis.fetch = async (_url, { signal }) => {
    preAborted = signal.aborted;
    return abortablePending(signal);
  };

  await assert.rejects(planThesis("A sufficiently detailed investment brief", request.signal, 1_000), { name: "AbortError" });
  assert.equal(preAborted, true);
});

test("mid-flight client cancellation aborts OpenAI planning", async () => {
  const request = new AbortController();
  let aborted = false;
  globalThis.fetch = async (_url, { signal }) => abortablePending(signal, () => { aborted = true; });

  const pending = planThesis("A sufficiently detailed investment brief", request.signal, 1_000);
  request.abort(new DOMException("Client disconnected", "AbortError"));
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(aborted, true);
});

test("OpenAI planning removes the parent abort listener after success", async () => {
  const request = new AbortController();
  const originalAdd = request.signal.addEventListener.bind(request.signal);
  const originalRemove = request.signal.removeEventListener.bind(request.signal);
  let added = 0;
  let removed = 0;
  request.signal.addEventListener = (...args) => {
    if (args[0] === "abort") added += 1;
    return originalAdd(...args);
  };
  request.signal.removeEventListener = (...args) => {
    if (args[0] === "abort") removed += 1;
    return originalRemove(...args);
  };
  globalThis.fetch = async () => successfulOpenAiResponse();

  await planThesis("A sufficiently detailed investment brief", request.signal, 1_000);
  assert.equal(added, 1);
  assert.equal(removed, 1);
});
