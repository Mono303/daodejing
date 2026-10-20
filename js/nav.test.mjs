import { test } from "node:test";
import assert from "node:assert/strict";
import { clampChapter } from "./nav.mjs";

test("clampChapter 钳位", () => {
  assert.equal(clampChapter(0, 81), 1);
  assert.equal(clampChapter(82, 81), 81);
  assert.equal(clampChapter(12, 81), 12);
  assert.equal(clampChapter(NaN, 81), 1);
});
