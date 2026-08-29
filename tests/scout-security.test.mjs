import assert from "node:assert/strict";
import test from "node:test";

import {
  hashClientKey,
  issueScoutToken,
  RATE_LIMIT,
  RATE_WINDOW_MS,
  takeD1Quota,
  verifyScoutToken,
} from "../lib/scout-security.ts";

test("rejects missing, invalid, expired, and differently IP-bound scout tokens", async () => {
  const now = 1_800_000_000_000;
  const secret = "test-secret-with-enough-entropy";
  const client = await hashClientKey("203.0.113.7");
  const otherClient = await hashClientKey("203.0.113.8");
  const token = await issueScoutToken(client, secret, now, "deterministic-nonce");

  assert.equal(await verifyScoutToken(null, client, secret, now), false);
  assert.equal(await verifyScoutToken("invalid", client, secret, now), false);
  assert.equal(await verifyScoutToken(token, otherClient, secret, now), false);
  assert.equal(await verifyScoutToken(token, client, secret, now + 60_001), false);
  assert.equal(await verifyScoutToken(token, client, secret, now), true);
});

test("D1 quota uses one atomic upsert and allows only two concurrent runs per window", async () => {
  const counters = new Map();
  const statements = [];
  const db = {
    prepare(query) {
      statements.push(query);
      return {
        bind(clientKey, windowStart) {
          return {
            async first() {
              const key = `${clientKey}:${windowStart}`;
              const count = (counters.get(key) || 0) + 1;
              counters.set(key, count);
              return { request_count: count };
            },
          };
        },
      };
    },
  };
  const now = 1_800_000_001_000;
  const results = await Promise.all([
    takeD1Quota(db, "hashed-client", now),
    takeD1Quota(db, "hashed-client", now),
    takeD1Quota(db, "hashed-client", now),
  ]);

  assert.deepEqual(results.map((result) => result.allowed), [true, true, false]);
  assert.deepEqual(results.map((result) => result.remaining), [RATE_LIMIT - 1, 0, 0]);
  assert.ok(statements.every((statement) => statement.includes("ON CONFLICT") && statement.includes("RETURNING request_count")));

  const nextWindow = await takeD1Quota(db, "hashed-client", now + RATE_WINDOW_MS);
  assert.equal(nextWindow.allowed, true);
  assert.equal(nextWindow.remaining, RATE_LIMIT - 1);
});
