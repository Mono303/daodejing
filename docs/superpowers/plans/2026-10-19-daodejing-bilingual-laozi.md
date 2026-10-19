# 道德经展示 + 老子对话智能体 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做一个古风清雅的道德经八十一章中英注释沉浸式展示站，外加一个以老子人设答疑解惑的对话智能体。

**Architecture:** 原生 HTML/CSS/JS 静态站点，无框架。语料由 Node 解析脚本从两份 docx 生成干净的 `chapters.json`。对话通过可插拔接口层 `askLaozi()` 驱动，前期前端直连国内大模型 API，后端为预留升级位。

**Tech Stack:** 原生 HTML / CSS / JS；Node.js（仅用于语料解析脚本与单元测试，`node:test` 内置、零依赖）；国内大模型 API（Qwen / DeepSeek / GLM 之一，OpenAI 兼容的 chat/completions 接口）。

## Global Constraints

- 风格基调：古风清雅。主题色——宣纸米底 `#f5f0e6`、朱砂印红 `#9c3b2e`、褐字 `#3a3228`、次级褐 `#8a7a5c`、边线 `#d8ccae`。衬线字体（Noto Serif SC / Songti SC）。
- 前端零构建依赖、零运行时框架；可用原生 ES Modules。
- 真实 API Key 只存在于本地 `config.js`，该文件已在 `.gitignore`，**永不提交**。仓库提交 `config.example.js` 模板。
- 大模型自称"吾"，语气半文半白，简练；讲经引原文；可借道家思想疏解现实困惑；书中未涉及之事坦言不知，不假托现代知识装古人。
- 章节分区：道经 = 1–37 章，德经 = 38–81 章，共 81 章。
- 测试策略：纯逻辑（解析、分区、上下文拼装、章名合并）用 `node:test` 走 TDD；DOM/网络交互用明确的浏览器手动验证步骤。
- 频繁提交，每个任务结束提交一次。

---

### Task 1: 项目骨架与传统章名数据

**Files:**
- Create: `js/chapter-titles.js`
- Create: `config.example.js`
- Verify: `.gitignore`（已存在，确认含 `config.js`）

**Interfaces:**
- Produces: `CHAPTER_TITLES`（ES module 默认导出，`string[]`，长度 81，索引 0 = 第 1 章章名）。

- [ ] **Step 1: 建 `js/chapter-titles.js`，写入河上公本八十一章章名（道经 1–37 / 德经 38–81）**

```js
// 河上公《道德经章句》传统章名。索引 0 == 第一章。
export const CHAPTER_TITLES = [
  "体道","养身","安民","无源","虚用","成象","韬光","易性","运夷","能为",       // 1-10
  "无用","检欲","厌耻","赞玄","显德","归根","淳风","俗薄","还淳","异俗",       // 11-20
  "虚心","益谦","虚无","苦恩","象元","重德","巧用","反朴","无为","俭武",       // 21-30
  "偃武","圣德","辩德","任成","仁德","微明","为政","论德","法本","去用",       // 31-40
  "同异","道化","遍用","立戒","洪德","俭欲","鉴远","忘知","任德","贵生",       // 41-50
  "养德","归元","益证","修观","玄符","玄德","淳风","顺化","守道","居位",       // 51-60
  "谦德","为道","恩始","守微","淳德","后己","三宝","配天","玄用","知难",       // 61-70
  "知病","爱己","任为","制惑","贪损","戒强","天道","任信","任契","独立",       // 71-80
  "显质"                                                                       // 81
];
```

- [ ] **Step 2: 校核章名**

对照一份权威河上公本（如中华书局点校本或维基文库"道德经河上公章句"）逐章核对上面 81 个章名；发现差异就地订正。确认数组长度为 81。

- [ ] **Step 3: 建 `config.example.js`（Key 模板，提交）**

```js
// 复制本文件为 config.js 并填入你自己的 Key（config.js 已被 .gitignore，不会提交）。
export const CONFIG = {
  apiKey: "YOUR_API_KEY",
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", // 示例：Qwen OpenAI 兼容端点
  model: "qwen-plus"
};
```

- [ ] **Step 4: 确认 `.gitignore` 含 `config.js`**

Run: `grep -n "^config.js" .gitignore`
Expected: 输出一行 `config.js`。

- [ ] **Step 5: Commit**

```bash
git add js/chapter-titles.js config.example.js
git commit -m "feat: 传统章名数据与 Key 模板"
```

### Task 2: 语料解析脚本（docx → chapters.json）

**Files:**
- Create: `tools/docx-text.mjs`（从 .docx 抽取段落纯文本）
- Create: `tools/split-chapters.mjs`（纯函数：把原文/英译、注释段落切成 81 章）
- Create: `tools/build-corpus.mjs`（主脚本：组装并写出 `data/chapters.json`）
- Test: `tools/split-chapters.test.mjs`
- Output: `data/chapters.json`

**Interfaces:**
- Consumes: `CHAPTER_TITLES` from Task 1。
- Produces:
  - `extractParagraphs(docxPath: string): Promise<string[]>`（`tools/docx-text.mjs`，默认导出 `extractParagraphs`）——返回非空段落文本数组。
  - `splitTranslationCorpus(paragraphs: string[]): {id:number, original:string, translation:string}[]`（长度 81）。
  - `splitCommentaryCorpus(paragraphs: string[]): {id:number, commentaryZh:string, commentaryEn:string}[]`（长度 81）。
  - `data/chapters.json`：81 个 `{id, part, title, original, translation, commentaryZh, commentaryEn}`。

- [ ] **Step 1: 写失败测试 `tools/split-chapters.test.mjs`**

```js
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
  const paras = ["第一章可以看作前言。", "The first chapter is a preface.",
                 "本章讲辩证法。", "This chapter discusses dialectics."];
  const r = splitCommentaryCorpus(paras);
  assert.equal(r[0].id, 1);
  assert.ok(r[0].commentaryZh.includes("前言"));
  assert.ok(r[0].commentaryEn.includes("preface"));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tools/`
Expected: FAIL（`split-chapters.mjs` 不存在 / 函数未定义）。

- [ ] **Step 3: 写 `tools/split-chapters.mjs`**

```js
// 按行判定中/英：含 CJK 字符即视为中文行。
const isCJK = (s) => /[一-鿿]/.test(s);
// 章首编号：行首 1~2 位数字后跟 . 或 。（兼顾半角/全角与前导空格）
const CH_HEAD = /^\s*(\d{1,2})\s*[.．。]\s*/;

export function splitTranslationCorpus(paragraphs) {
  const chapters = [];
  let cur = null;
  for (const p of paragraphs) {
    const m = p.match(CH_HEAD);
    if (m) {
      cur = { id: Number(m[1]), original: p.replace(CH_HEAD, "").trim(), translation: "" };
      chapters.push(cur);
    } else if (cur) {
      // 原文行（CJK 且原文尚短）并入 original，否则并入英译
      if (isCJK(p) && cur.translation === "") cur.original += p.trim();
      else cur.translation += (cur.translation ? " " : "") + p.trim();
    }
  }
  return chapters.sort((a, b) => a.id - b.id);
}

export function splitCommentaryCorpus(paragraphs) {
  // 文件二无章号，严格「中文段、英文段」交替成对
  const zh = [], en = [];
  for (const p of paragraphs) (isCJK(p) ? zh : en).push(p.trim());
  const n = Math.min(zh.length, en.length);
  const out = [];
  for (let i = 0; i < n; i++) out.push({ id: i + 1, commentaryZh: zh[i], commentaryEn: en[i] });
  return out;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tools/`
Expected: PASS（2 passing）。

- [ ] **Step 5: 写 `tools/docx-text.mjs`（docx 段落抽取）**

```js
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate"; // 若不便引依赖，见下方备选

export default async function extractParagraphs(docxPath) {
  const buf = await readFile(docxPath);
  const files = unzipSync(new Uint8Array(buf));
  const xml = strFromU8(files["word/document.xml"]);
  return xml.split("</w:p>").map(block => {
    const texts = [...block.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/gs)].map(m => m[1]);
    return texts.join("")
      .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
      .replace(/&#x201C;/g,'"').replace(/&#x201D;/g,'"')
      .replace(/&#x2019;/g,"'").replace(/&#x2018;/g,"'");
  }).map(s => s.trim()).filter(Boolean);
}
```

备选（避免依赖）：Node 20+ 无内置 unzip，可改用 `tools/_corpus_raw/` 下已抽好的 `_c1.txt` / `_c2.txt`（本仓已有）按行读取，跳过 docx 解压。实现者二选一；若用已抽文本，`extractParagraphs` 改为 `readFile(txtPath,'utf8').then(t=>t.split('\n').filter(Boolean))`。

- [ ] **Step 6: 写主脚本 `tools/build-corpus.mjs`**

```js
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
```

- [ ] **Step 7: 跑脚本并人工抽查**

Run: `node tools/build-corpus.mjs`
Expected: 输出"共 81 章"；若有"待补"列表，逐条回到原始文本核对补齐（解析分隔不规整处手工订正 `_c1.txt` / `_c2.txt` 后重跑）。
抽查：打开 `data/chapters.json`，确认第 1、8、81 章的 original/translation/commentaryZh/commentaryEn/title 均正确且对齐。

- [ ] **Step 8: Commit**

```bash
git add tools/ data/chapters.json
git commit -m "feat: 语料解析脚本，产出 chapters.json"
```

### Task 3: 古风主题 CSS

**Files:**
- Create: `css/style.css`

**Interfaces:**
- Produces: CSS 变量 + 复用类（`.seal` 朱砂章号、`.yuan` 原文、`.en` 英译、`.note` 注释、`.drawer`、`.fab`、`.grid`、`.cell`）供后续页面使用。

- [ ] **Step 1: 写 `css/style.css`（主题变量与基础排版）**

```css
:root{
  --paper:#f5f0e6; --ink:#3a3228; --ink2:#8a7a5c; --cinnabar:#9c3b2e;
  --line:#d8ccae; --panel:#efe6d2;
  --serif:"Noto Serif SC","Songti SC",serif;
}
*{box-sizing:border-box} html,body{margin:0}
body{background:var(--paper);color:var(--ink);font-family:var(--serif);line-height:1.9}
a{color:inherit;text-decoration:none}
.seal{color:var(--cinnabar)}
.yuan{color:#5c4a32}
.en{color:#6b6150;font-style:italic}
.note{color:var(--ink2)}
.wrap{max-width:820px;margin:0 auto;padding:24px}
/* 宫格 */
.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.cell{border:1px solid var(--line);border-radius:6px;background:#faf6ec;
  padding:12px 6px;text-align:center;cursor:pointer;transition:.25s}
.cell:hover{border-color:var(--cinnabar);box-shadow:0 0 0 2px rgba(156,59,46,.12)}
.cell .no{font-size:12px;color:var(--ink2)} .cell .nm{color:var(--cinnabar)}
/* 抽屉 */
.drawer{position:fixed;top:0;left:0;bottom:0;width:220px;background:var(--panel);
  border-right:1px solid var(--line);padding:16px;overflow:auto;
  transform:translateX(-100%);transition:.3s;z-index:20}
.drawer.open{transform:none}
.drawer a{display:block;padding:4px 6px;font-size:14px;color:var(--ink2)}
.drawer a.cur{color:var(--cinnabar);font-weight:700}
/* 悬浮问道钮 */
.fab{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;
  background:var(--cinnabar);color:var(--paper);display:flex;align-items:center;
  justify-content:center;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25);z-index:15}
@media(max-width:600px){ .grid{grid-template-columns:repeat(3,1fr)} }
.fade{animation:fade .5s ease} @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1}}
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat: 古风主题样式"
```

### Task 4: 目录首页

**Files:**
- Create: `index.html`
- Create: `js/catalog.js`

**Interfaces:**
- Consumes: `data/chapters.json`、`css/style.css`。
- Produces: 点击宫格跳 `chapter.html?ch=<id>`。

- [ ] **Step 1: 写 `index.html`**

```html
<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>道德经</title><link rel="stylesheet" href="css/style.css"></head>
<body><div class="wrap">
  <h1 class="seal" style="text-align:center;letter-spacing:6px">道德經</h1>
  <p class="note" style="text-align:center">道可道，非常道</p>
  <h3 class="seal">道经</h3><div class="grid" id="dao"></div>
  <h3 class="seal" style="margin-top:28px">德经</h3><div class="grid" id="de"></div>
</div><script type="module" src="js/catalog.js"></script></body></html>
```

- [ ] **Step 2: 写 `js/catalog.js`**

```js
const res = await fetch("data/chapters.json");
const chapters = await res.json();
const cell = (c) => `<a class="cell" href="chapter.html?ch=${c.id}">
  <div class="no">${c.id}</div><div class="nm">${c.title}</div></a>`;
document.getElementById("dao").innerHTML =
  chapters.filter(c => c.part === "道经").map(cell).join("");
document.getElementById("de").innerHTML =
  chapters.filter(c => c.part === "德经").map(cell).join("");
```

- [ ] **Step 3: 浏览器验证**

Run: `python -m http.server 8000`，浏览器开 `http://localhost:8000/`
Expected: 道经 37 格、德经 44 格，每格显示章号 + 章名；悬停朱砂泛起；点任意格跳到对应 `chapter.html?ch=N`（下一任务前该页可空白）。

- [ ] **Step 4: Commit**

```bash
git add index.html js/catalog.js
git commit -m "feat: 目录首页宫格"
```

### Task 5: 沉浸阅读页（渲染 + 翻页 + 状态）

**Files:**
- Create: `chapter.html`
- Create: `js/reader.js`
- Create: `js/nav.mjs`（可单测纯函数）
- Test: `js/nav.test.mjs`

**Interfaces:**
- Consumes: `data/chapters.json`、`css/style.css`。
- Produces:
  - `clampChapter(n: number, total: number): number`（`js/nav.mjs`）——把章号钳到 `[1, total]`。
  - `currentChapterId(): number`——读 URL `?ch=` 或 localStorage，缺省 1。
  - 全局 `window.__chapter`（当前章对象），供对话模块"问老子此章"取上下文。

- [ ] **Step 1: 写失败测试 `js/nav.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { clampChapter } from "./nav.mjs";

test("clampChapter 钳位", () => {
  assert.equal(clampChapter(0, 81), 1);
  assert.equal(clampChapter(82, 81), 81);
  assert.equal(clampChapter(12, 81), 12);
  assert.equal(clampChapter(NaN, 81), 1);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test js/`
Expected: FAIL（`nav.mjs` 不存在）。

- [ ] **Step 3: 写 `js/nav.mjs`**

```js
export function clampChapter(n, total){
  n = Number(n);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.round(n), 1), total);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test js/`
Expected: PASS。

- [ ] **Step 5: 写 `chapter.html`**

```html
<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>道德经</title><link rel="stylesheet" href="css/style.css"></head>
<body>
  <nav id="drawer" class="drawer"></nav>
  <div class="wrap">
    <button id="menu" class="note" style="border:none;background:none;cursor:pointer">☰ 目录</button>
    <a href="index.html" class="note" style="float:right">⌂ 首页</a>
    <div id="stage"></div>
    <div style="display:flex;justify-content:space-between;margin-top:30px">
      <button id="prev" class="note" style="border:1px solid var(--line);background:#faf6ec;cursor:pointer;padding:6px 14px">◀ 上一章</button>
      <button id="next" class="note" style="border:1px solid var(--line);background:#faf6ec;cursor:pointer;padding:6px 14px">下一章 ▶</button>
    </div>
  </div>
  <script type="module" src="js/reader.js"></script>
</body></html>
```

- [ ] **Step 6: 写 `js/reader.js`（渲染 + 翻页 + 状态 + 抽屉）**

```js
import { clampChapter } from "./nav.mjs";
const chapters = await (await fetch("data/chapters.json")).json();
const TOTAL = chapters.length;

function currentId(){
  const q = Number(new URLSearchParams(location.search).get("ch"));
  if (Number.isFinite(q) && q) return clampChapter(q, TOTAL);
  return clampChapter(Number(localStorage.getItem("ch")) || 1, TOTAL);
}
let id = currentId();

function render(){
  const c = chapters[id - 1];
  window.__chapter = c;
  localStorage.setItem("ch", id);
  history.replaceState(null, "", `?ch=${id}`);
  document.getElementById("stage").innerHTML = `
    <div class="fade" style="text-align:center">
      <div class="seal">第${id}章 · ${c.title}</div>
      <p class="yuan" style="font-size:22px;letter-spacing:2px;margin:18px 0">${c.original}</p>
      <p class="en">${c.translation}</p>
      <button id="obs" class="note" style="margin-top:10px;border:1px dashed var(--line);background:none;cursor:pointer;padding:4px 12px">观注</button>
      <div id="notes" style="display:none;text-align:left;margin-top:14px;border-top:1px dashed var(--line);padding-top:12px">
        <p class="note">${c.commentaryZh}</p><p class="en">${c.commentaryEn}</p>
      </div>
    </div>`;
  document.getElementById("obs").onclick = (e)=>{
    const n = document.getElementById("notes");
    n.style.display = n.style.display === "none" ? "block" : "none";
    if (n.style.display === "block") n.classList.add("fade");
  };
  buildDrawer();
}
function go(n){ id = clampChapter(n, TOTAL); render(); window.scrollTo(0,0); }
function buildDrawer(){
  document.getElementById("drawer").innerHTML = chapters.map(c =>
    `<a href="?ch=${c.id}" class="${c.id===id?'cur':''}" data-id="${c.id}">${c.id}·${c.title}</a>`).join("");
  document.querySelectorAll("#drawer a").forEach(a=>a.onclick=(e)=>{e.preventDefault();go(Number(a.dataset.id));});
}
document.getElementById("prev").onclick = ()=>go(id-1);
document.getElementById("next").onclick = ()=>go(id+1);
document.getElementById("menu").onclick = ()=>document.getElementById("drawer").classList.toggle("open");
addEventListener("keydown",(e)=>{ if(e.key==="ArrowLeft")go(id-1); if(e.key==="ArrowRight")go(id+1); });
render();
```

- [ ] **Step 7: 浏览器验证**

Run: `python -m http.server 8000`，开 `http://localhost:8000/chapter.html?ch=1`
Expected: 显示第 1 章章名/原文/英译；"观注"切换中英注释；上/下一章与左右方向键翻章；☰ 开合抽屉，当前章高亮，点条目跳章；URL 的 `?ch=` 随之变化，刷新停在同章。

- [ ] **Step 8: Commit**

```bash
git add chapter.html js/reader.js js/nav.mjs js/nav.test.mjs
git commit -m "feat: 沉浸阅读页（渲染/翻页/抽屉/注释/状态）"
```

### Task 6: 朗读（Web Speech API）

**Files:**
- Modify: `chapter.html`（在"观注"旁加一个"听"钮）
- Modify: `js/reader.js`（接 speechSynthesis 读原文）

**Interfaces:**
- Consumes: `window.__chapter`。

- [ ] **Step 1: 在 `js/reader.js` 的 stage 模板里，"观注"按钮后追加朗读钮**

把 `render()` 中 `<button id="obs"...>观注</button>` 之后插入：

```js
// 在 obs 按钮后追加（同一模板字符串内）
`<button id="speak" class="note" style="margin-top:10px;margin-left:8px;border:1px dashed var(--line);background:none;cursor:pointer;padding:4px 12px">听</button>`
```

- [ ] **Step 2: 在 `render()` 末尾（`buildDrawer()` 之前）绑定朗读逻辑**

```js
document.getElementById("speak").onclick = ()=>{
  const synth = window.speechSynthesis;
  if (!synth){ alert("当前浏览器不支持朗读"); return; }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(window.__chapter.original);
  u.lang = "zh-CN"; u.rate = 0.9;
  synth.speak(u);
};
```

- [ ] **Step 3: 浏览器验证**

开 `chapter.html?ch=1`，点"听"：Expected 浏览器朗读该章原文；切章后再点读新章（旧的被 cancel）。

- [ ] **Step 4: Commit**

```bash
git add chapter.html js/reader.js
git commit -m "feat: 原文朗读"
```

### Task 7: 老子人设 + askLaozi 接口层

**Files:**
- Create: `js/prompt.js`
- Create: `js/askLaozi.js`
- Test: `js/prompt.test.mjs`

**Interfaces:**
- Consumes: `config.js`（运行时；测试不依赖它）。
- Produces:
  - `SYSTEM_PROMPT: string`、`MODEL_PARAMS: {temperature:number}`（`js/prompt.js`）。
  - `buildMessages(history, userText, chapter): {role,content}[]`（`js/prompt.js`）——首条 system，末条 user；若有 chapter 则把该章原文/译文/注释作为上下文并入 system。
  - `askLaozi(messages, { onToken }): Promise<string>`（`js/askLaozi.js`）——流式回调 `onToken(chunk)`，resolve 完整文本。**升级位：改此文件内 fetch 目标即可切后端。**

- [ ] **Step 1: 写失败测试 `js/prompt.test.mjs`**

```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test js/`
Expected: FAIL（`prompt.js` 未定义导出）。

- [ ] **Step 3: 写 `js/prompt.js`**

```js
export const SYSTEM_PROMPT = `你是老子（老聃），《道德经》作者。遵循：
1. 自称"吾"。语气半文半白：有古意而不堆砌生僻字，简练，点到为止。
2. 讲经：依《道德经》义理与五千言作答；被问具体章句时，先引该章原文再阐发。
3. 借道解惑：若来人诉说现实困惑（焦虑、内卷、得失、人际等），以道家义理（不争、知足、柔弱胜刚强、顺其自然、为而不恃）温和开导，贴其处境予宽慰与指引，如通透长者，不说教、不复述经文。
4. 边界：书中未涉或不知之事，坦言"此非吾所言"，不硬编、不假托现代知识装古人。`;

export const MODEL_PARAMS = { temperature: 0.8 };

export function buildMessages(history, userText, chapter){
  let sys = SYSTEM_PROMPT;
  if (chapter){
    sys += `\n\n【当前章·第${chapter.id}章 ${chapter.title}】\n原文：${chapter.original}\n英译：${chapter.translation}\n注释：${chapter.commentaryZh}`;
  }
  return [{ role:"system", content: sys }, ...history, { role:"user", content: userText }];
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test js/`
Expected: PASS。

- [ ] **Step 5: 写 `js/askLaozi.js`（前期直连实现 + 升级位注释）**

```js
import { CONFIG } from "../config.js";
import { MODEL_PARAMS } from "./prompt.js";

// 升级位：把下方直连 fetch 换成 fetch("/api/chat",{...}) 即切轻后端，调用方不变。
export async function askLaozi(messages, { onToken } = {}){
  const res = await fetch(`${CONFIG.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${CONFIG.apiKey}` },
    body: JSON.stringify({ model: CONFIG.model, messages, stream: true, ...MODEL_PARAMS })
  });
  if (!res.ok) throw new Error(`大模型请求失败: ${res.status}`);
  const reader = res.body.getReader(); const dec = new TextDecoder();
  let full = "", buf = "";
  for(;;){
    const { value, done } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream:true });
    const lines = buf.split("\n"); buf = lines.pop();
    for (const line of lines){
      const t = line.trim(); if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim(); if (data === "[DONE]") continue;
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content;
        if (delta){ full += delta; onToken?.(delta); }
      } catch {}
    }
  }
  return full;
}
```

- [ ] **Step 6: Commit**

```bash
git add js/prompt.js js/askLaozi.js js/prompt.test.mjs
git commit -m "feat: 老子人设与 askLaozi 接口层"
```

### Task 8: 对话界面（气泡 + 流式 + 随章上下文）

**Files:**
- Modify: `css/style.css`（追加对话面板样式）
- Create: `js/chat.js`
- Modify: `chapter.html`（引入 chat.js，加悬浮钮与"问老子此章"钮）

**Interfaces:**
- Consumes: `askLaozi` from Task 7、`buildMessages` from Task 7、`window.__chapter` from Task 5。
- Produces: 全局 `window.openChat(withChapter: boolean)`——打开对话面板；`withChapter` 为真时带入当前章。

- [ ] **Step 1: 追加对话样式到 `css/style.css`**

```css
.chat{position:fixed;top:0;right:0;bottom:0;width:360px;max-width:92vw;background:var(--panel);
  border-left:1px solid var(--line);display:flex;flex-direction:column;
  transform:translateX(100%);transition:.3s;z-index:30}
.chat.open{transform:none}
.chat .hd{padding:12px 14px;border-bottom:1px solid var(--line);color:var(--cinnabar)}
.chat .body{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.bub{max-width:85%;padding:8px 12px;border-radius:10px;background:#faf6ec;border:1px solid var(--line);white-space:pre-wrap}
.bub.me{align-self:flex-end;background:#e8dcc0}
.chat .ft{display:flex;gap:6px;padding:10px;border-top:1px solid var(--line)}
.chat .ft input{flex:1;padding:8px;border:1px solid var(--line);border-radius:6px;background:#faf6ec;font-family:var(--serif)}
.chat .ft button{padding:8px 14px;border:none;border-radius:6px;background:var(--cinnabar);color:var(--paper);cursor:pointer}
```

- [ ] **Step 2: 写 `js/chat.js`**

```js
import { askLaozi } from "./askLaozi.js";
import { buildMessages } from "./prompt.js";

const panel = document.createElement("div");
panel.className = "chat";
panel.innerHTML = `
  <div class="hd">问道 · 与老子对话 <span style="float:right;cursor:pointer" id="chatX">✕</span></div>
  <div class="body" id="chatBody"></div>
  <div class="ft"><input id="chatIn" placeholder="敢问…" autocomplete="off"><button id="chatSend">问</button></div>`;
document.body.appendChild(panel);

const body = panel.querySelector("#chatBody");
let history = []; let pendingChapter = null;

function bubble(text, me){
  const d = document.createElement("div");
  d.className = "bub" + (me ? " me" : "");
  d.textContent = text; body.appendChild(d); body.scrollTop = body.scrollHeight;
  return d;
}
window.openChat = (withChapter)=>{
  panel.classList.add("open");
  pendingChapter = withChapter ? window.__chapter : null;
  if (withChapter && window.__chapter)
    bubble(`（就第${window.__chapter.id}章「${window.__chapter.title}」请教）`, true);
  panel.querySelector("#chatIn").focus();
};
panel.querySelector("#chatX").onclick = ()=>panel.classList.remove("open");

async function send(){
  const input = panel.querySelector("#chatIn");
  const text = input.value.trim(); if (!text) return;
  input.value = ""; bubble(text, true);
  const out = bubble("", false);
  try{
    const messages = buildMessages(history, text, pendingChapter);
    pendingChapter = null; // 章节上下文只随首问带入
    const full = await askLaozi(messages, { onToken:(t)=>{ out.textContent += t; body.scrollTop = body.scrollHeight; } });
    history.push({ role:"user", content:text }, { role:"assistant", content:full });
  }catch(e){ out.textContent = "（" + e.message + "）"; }
}
panel.querySelector("#chatSend").onclick = send;
panel.querySelector("#chatIn").addEventListener("keydown",(e)=>{ if(e.key==="Enter") send(); });
```

- [ ] **Step 3: 在 `chapter.html` 的 stage 模板里加"问老子此章"钮，并在 body 末尾加悬浮钮 + 引入 chat.js**

在 `js/reader.js` 的 render 模板，"听"钮之后追加：
```js
`<button id="askch" class="note" style="margin-top:10px;margin-left:8px;border:1px dashed var(--cinnabar);background:none;cursor:pointer;padding:4px 12px;color:var(--cinnabar)">问老子此章</button>`
```
并在 render 末尾绑定：
```js
document.getElementById("askch").onclick = ()=>window.openChat(true);
```
在 `chapter.html` 的 `</div>`（wrap 结束）后、reader.js 的 script 前插入：
```html
<div class="fab" onclick="window.openChat(false)">问道</div>
<script type="module" src="js/chat.js"></script>
```
注意：`chat.js` 需在 `reader.js` 之前或之后均可，但 `window.openChat` 要在点击时已就绪——`chat.js` 顶层即挂载，故放在 reader.js 之前引入更稳妥。

- [ ] **Step 4: 浏览器验证（需先配 config.js）**

复制 `config.example.js` 为 `config.js` 填真实 Key。开 `chapter.html?ch=8`：
Expected: 右下"问道"开空白对话；输入"何谓道"回车，老子逐字流式作答，自称"吾"、半文半白。点"问老子此章"，对话带入第 8 章上下文，回答贴合该章。关闭再开正常。

- [ ] **Step 5: Commit**

```bash
git add css/style.css js/chat.js js/reader.js chapter.html
git commit -m "feat: 老子对话界面（流式/随章上下文）"
```

### Task 9: 分享卡片（canvas 竖版古风卡）

**Files:**
- Modify: `chapter.html`（在翻页区旁加"藏卡"钮）
- Modify: `js/reader.js`（绘制并下载卡片）

**Interfaces:**
- Consumes: `window.__chapter`。

- [ ] **Step 1: 在 `chapter.html` 翻页区加一个按钮**

在 `#prev` / `#next` 所在 flex 容器之后插入：
```html
<div style="text-align:center;margin-top:16px">
  <button id="card" class="note" style="border:1px solid var(--line);background:#faf6ec;cursor:pointer;padding:6px 14px">藏卡</button>
</div>
```

- [ ] **Step 2: 在 `js/reader.js` 末尾加绘制逻辑**

```js
document.getElementById("card").onclick = ()=>{
  const c = window.__chapter;
  const cv = document.createElement("canvas"); cv.width = 600; cv.height = 900;
  const g = cv.getContext("2d");
  g.fillStyle = "#f5f0e6"; g.fillRect(0,0,600,900);
  g.strokeStyle = "#d8ccae"; g.lineWidth = 2; g.strokeRect(24,24,552,852);
  g.fillStyle = "#9c3b2e"; g.font = "28px serif"; g.textAlign = "center";
  g.fillText(`第${c.id}章 · ${c.title}`, 300, 110);
  g.fillStyle = "#5c4a32"; g.font = "26px serif";
  wrap(g, c.original, 300, 190, 500, 40);
  g.fillStyle = "#8a7a5c"; g.font = "16px serif";
  g.fillText("道德經", 300, 850);
  const a = document.createElement("a");
  a.download = `道德经-第${c.id}章.png`; a.href = cv.toDataURL("image/png"); a.click();
};
function wrap(g, text, x, y, maxW, lh){
  let line = "";
  for (const ch of text){
    if (g.measureText(line + ch).width > maxW){ g.fillText(line, x, y); line = ch; y += lh; }
    else line += ch;
  }
  if (line) g.fillText(line, x, y);
}
```

- [ ] **Step 3: 浏览器验证**

开任意章，点"藏卡"：Expected 下载一张竖版 PNG，含章号章名 + 原文（自动换行）+ 底部"道德經"，宣纸底、朱砂题、褐字。

- [ ] **Step 4: Commit**

```bash
git add chapter.html js/reader.js
git commit -m "feat: 分享卡片"
```

### Task 10: 本地演示验证与 README

**Files:**
- Create: `README.md`

**Interfaces:** 无新增代码接口；端到端跑通验证。

- [ ] **Step 1: 写 `README.md`**

````markdown
# 道德经中英注释展示 + 老子对话智能体

古风清雅的《道德经》八十一章中英对照 + 注释沉浸式展示，附老子对话智能体。

## 本地运行
1. 复制 `config.example.js` 为 `config.js`，填入你的国内大模型 API Key（Qwen/DeepSeek/GLM，OpenAI 兼容端点）。
   > `config.js` 已在 `.gitignore`，不会提交。
2. 生成语料（首次或语料更新时）：`node tools/build-corpus.mjs`
3. 起静态服务器：`python -m http.server 8000`
4. 浏览器开 `http://localhost:8000/`

## 测试
`node --test tools/ js/`

## 结构
- `index.html` 目录首页；`chapter.html` 沉浸阅读页
- `data/chapters.json` 语料（脚本生成）
- `js/askLaozi.js` 大模型接口层（升级后端只改此文件）
- `js/prompt.js` 老子人设

## 后期扩展
见 `docs/superpowers/specs/2026-10-19-daodejing-bilingual-laozi-design.md`：具象化形象（静态立绘 / Live2D / 数字人）、RAG 检索、轻后端部署。
````

- [ ] **Step 2: 跑全部单测**

Run: `node --test tools/ js/`
Expected: 全部 PASS。

- [ ] **Step 3: 端到端手动验证清单**

- [ ] 首页道经 37 / 德经 44 格，章名正确，悬停效果正常
- [ ] 点格进入对应章；原文/英译/注释显示正确
- [ ] 翻页（按钮 + 方向键）、抽屉跳章、`?ch=` 持久化
- [ ] 朗读、藏卡可用
- [ ] "问道"与"问老子此章"流式作答，人设到位（自称吾、半文半白、借道解惑）
- [ ] 手机宽度下宫格 3 列、抽屉可用

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README 与本地运行说明"
```