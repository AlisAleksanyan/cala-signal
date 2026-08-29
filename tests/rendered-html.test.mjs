import assert from "node:assert/strict";
import test from "node:test";

const securityHeaders = [
  "content-security-policy",
  "referrer-policy",
  "strict-transport-security",
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
  assert.match(html, /One thesis/);
  assert.match(html, /A shortlist you can/);
  assert.match(html, /Build my shortlist/);
  assert.match(html, /Qualified leads/);
  assert.match(html, /Verification queue/);
  assert.match(html, /Evidence receipts/);
  assert.match(html, /Cala/);
  assert.match(html, /Powered by Cala/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /\/og\.png/);
  for (const forbidden of ["Entire", "GitHub", "Aikido", "checkpoint", "session", "commit", "token", "build passport", "build-passport"]) {
    assert.doesNotMatch(html, new RegExp(forbidden, "i"), `public HTML contains forbidden product-internal wording: ${forbidden}`);
  }
  assert.doesNotMatch(html, /OPENAI_API_KEY|CALA_API_KEY|sk-[A-Za-z0-9]/);
});

test("ships browser security headers", async () => {
  const response = await render();
  for (const header of securityHeaders) assert.ok(response.headers.get(header), `missing ${header}`);
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=31536000/);
});

test("rejects malformed scout requests before provider calls", async () => {
  const wrongType = await callApi(new Request("http://localhost/api/scout", { method: "POST", body: "hello" }));
  assert.equal(wrongType.status, 415);
  assert.equal("request_id" in await wrongType.json(), false);

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
