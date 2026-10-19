import { writeFile, mkdir } from "node:fs/promises";
import extractParagraphs from "./docx-text.mjs";
import { splitTranslationCorpus, splitCommentaryCorpus } from "./split-chapters.mjs";
import { CHAPTER_TITLES } from "../js/chapter-titles.js";

const C1 = process.env.C1 || "_corpus_raw/_c1.txt"; // 翻译语料
const C2 = process.env.C2 || "_corpus_raw/_c2.txt"; // 注释英译

const trans = splitTranslationCorpus(await extractParagraphs(C1));
const comm  = splitCommentaryCorpus(await extractParagraphs(C2));
const commById = new Map(comm.map(c => [c.id, c]));

const chapters = trans.map(t => ({
  id: t.id,
  part: t.id <= 37 ? "道经" : "德经",
  title: CHAPTER_TITLES[t.id - 1] || "",
  original: t.original,
  translation: t.translation,
  commentaryZh: commById.get(t.id)?.commentaryZh || "",
  commentaryEn: commById.get(t.id)?.commentaryEn || ""
}));

if (chapters.length !== 81) throw new Error(`章数不对: ${chapters.length}`);
const missing = chapters.filter(c => !c.original || !c.translation || !c.title);
if (missing.length) console.warn("待补:", missing.map(c => c.id));

await mkdir("data", { recursive: true });
await writeFile("data/chapters.json", JSON.stringify(chapters, null, 2));
console.log("写出 data/chapters.json，共", chapters.length, "章");
