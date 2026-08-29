import assert from "node:assert/strict";
import test from "node:test";

import { extractExplicitFoundingYear } from "../lib/validation.ts";

test("extracts an explicit 2020 founding year", () => {
  assert.equal(
    extractExplicitFoundingYear("Find European startups founded since 2020 with recent partnerships."),
    2020,
  );
});

test("ignores years that are not explicit founding constraints", () => {
  assert.equal(
    extractExplicitFoundingYear("Find European startups with partnerships announced since 2020."),
    null,
  );
});

test("ignores explicit founding years outside the validated range", () => {
  assert.equal(extractExplicitFoundingYear("Find startups founded after 1999 with recent momentum."), null);
  assert.equal(extractExplicitFoundingYear("Find startups founded from 2027 with recent momentum."), null);
});
