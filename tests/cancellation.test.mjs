import assert from "node:assert/strict";
import test from "node:test";

import { queryCala } from "../lib/cala.ts";

const originalFetch = globalThis.fetch;
const originalCalaKey = process.env.CALA_API_KEY;

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

test.beforeEach(() => {
  process.env.CALA_API_KEY = "test-key";
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalCalaKey === undefined) delete process.env.CALA_API_KEY;
  else process.env.CALA_API_KEY = originalCalaKey;
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
