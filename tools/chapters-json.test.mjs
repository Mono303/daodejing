import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const chaptersPath = join(__dirname, "..", "data", "chapters.json");

test("chapters.json 集成测试：81 章结构完整", async () => {
  const raw = await readFile(chaptersPath, "utf8");
  const chapters = JSON.parse(raw);

  // 恰好 81 章
  assert.equal(chapters.length, 81, "should have exactly 81 chapters");

  // ids 连续 1..81，按序
  for (let i = 0; i < chapters.length; i++) {
    assert.equal(chapters[i].id, i + 1, `chapter at index ${i} should have id ${i + 1}`);
  }

  // 道经 1–37，德经 38–81
  for (const ch of chapters) {
    const expectedPart = ch.id <= 37 ? "道经" : "德经";
    assert.equal(ch.part, expectedPart, `ch${ch.id} part should be ${expectedPart}`);
  }

  // 每章 title / original / translation 均为非空字符串
  for (const ch of chapters) {
    assert.ok(typeof ch.title === "string" && ch.title.length > 0, `ch${ch.id} title should be non-empty`);
    assert.ok(typeof ch.original === "string" && ch.original.length > 0, `ch${ch.id} original should be non-empty`);
    assert.ok(typeof ch.translation === "string" && ch.translation.length > 0, `ch${ch.id} translation should be non-empty`);
  }

  // 每章 commentaryZh / commentaryEn 非空，但第 31 章例外
  // 第 31 章（偃武）：原始语料中缺失注释，故 commentaryZh 和 commentaryEn 均为空字符串——属预期行为
  for (const ch of chapters) {
    if (ch.id === 31) {
      assert.equal(ch.commentaryZh, "", "ch31 commentaryZh should be empty (absent from source corpus)");
      assert.equal(ch.commentaryEn, "", "ch31 commentaryEn should be empty (absent from source corpus)");
    } else {
      assert.ok(typeof ch.commentaryZh === "string" && ch.commentaryZh.length > 0, `ch${ch.id} commentaryZh should be non-empty`);
      assert.ok(typeof ch.commentaryEn === "string" && ch.commentaryEn.length > 0, `ch${ch.id} commentaryEn should be non-empty`);
    }
  }

  // 标题抽查
  assert.equal(chapters[0].title, "体道", "ch1 title should be 体道");
  assert.equal(chapters[80].title, "显质", "ch81 title should be 显质");
});
