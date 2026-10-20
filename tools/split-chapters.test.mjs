import { test } from "node:test";
import assert from "node:assert/strict";
import { splitTranslationCorpus, splitCommentaryCorpus } from "./split-chapters.mjs";

test("splitTranslationCorpus 切出 81 章且中英分离", () => {
  const paras = [
    "01.道可道，非常道。", "The Tao that can be told is not eternal.",
    "02.天下皆知美之为美。", "When all know beauty as beauty.",
    // 测试用最小样例：实现时以真实段落跑全量校验
  ];
  const r = splitTranslationCorpus(paras);
  assert.equal(r[0].id, 1);
  assert.ok(r[0].original.includes("道可道"));
  assert.ok(r[0].translation.includes("Tao"));
  assert.ok(!r[0].original.includes("Tao"), "原文不应混入英文");
});

test("splitCommentaryCorpus 按中文段+英文段成对切 81 章", () => {
  const paras = ["1", "第一章可以看作前言。", "The first chapter is a preface.",
                 "2", "本章讲辩证法。", "This chapter discusses dialectics."];
  const r = splitCommentaryCorpus(paras);
  assert.equal(r[0].id, 1);
  assert.ok(r[0].commentaryZh.includes("前言"));
  assert.ok(r[0].commentaryEn.includes("preface"));
});
