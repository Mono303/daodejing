import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMessages, SYSTEM_PROMPT } from "./prompt.js";

test("buildMessages 结构正确", () => {
  const m = buildMessages([], "何谓道？", null);
  assert.equal(m[0].role, "system");
  assert.ok(m[0].content.includes("吾"));
  assert.equal(m.at(-1).role, "user");
  assert.equal(m.at(-1).content, "何谓道？");
});

test("buildMessages 带章节上下文", () => {
  const ch = { id:8, title:"若水", original:"上善若水。", translation:"Highest good is like water.", commentaryZh:"讲水之德。", commentaryEn:"On the virtue of water." };
  const m = buildMessages([], "请讲此章", ch);
  assert.ok(m[0].content.includes("上善若水"), "system 应含该章原文");
  assert.ok(m[0].content.includes("第8章"));
});

test("SYSTEM_PROMPT 含人设要点", () => {
  for (const kw of ["吾","半文半白","不知"]) assert.ok(SYSTEM_PROMPT.includes(kw), kw);
});
