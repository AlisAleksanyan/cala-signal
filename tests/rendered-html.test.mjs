import assert from "node:assert/strict";
import test from "node:test";

const securityHeaders = [
  "content-security-policy",
  "referrer-policy",
  "x-content-type-options",
  "x-frame-options",
];

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function callApi(request) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("api-test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    request,
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the CALA SIGNAL product", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>CALA SIGNAL/);
  assert.match(html, /Find the companies/);
  assert.match(html, /Run live scout/);
  assert.match(html, /OpenAI/);
  assert.match(html, /Cala/);
  assert.doesNotMatch(html, /OPENAI_API_KEY|CALA_API_KEY|sk-[A-Za-z0-9]/);
});

test("ships browser security headers", async () => {
  const response = await render();
  for (const header of securityHeaders) assert.ok(response.headers.get(header), `missing ${header}`);
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
});

test("rejects malformed scout requests before provider calls", async () => {
  const wrongType = await callApi(new Request("http://localhost/api/scout", { method: "POST", body: "hello" }));
  assert.equal(wrongType.status, 415);

  const tooShort = await callApi(new Request("http://localhost/api/scout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ brief: "find AI" }),
  }));
  assert.equal(tooShort.status, 400);
  assert.equal(tooShort.headers.get("cache-control"), "no-store");
  assert.equal(tooShort.headers.get("x-content-type-options"), "nosniff");
});

test("rejects oversized request bodies", async () => {
  const oversized = await callApi(new Request("http://localhost/api/scout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ brief: "x".repeat(5_000) }),
  }));
  assert.equal(oversized.status, 413);
});
