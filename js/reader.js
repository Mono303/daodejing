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

  const hasCommentary = c.commentaryZh || c.commentaryEn;
  const obsBtn = hasCommentary
    ? `<button id="obs" class="note" style="margin-top:10px;border:1px dashed var(--line);background:none;cursor:pointer;padding:4px 12px">观注</button>`
    : `<span class="note" style="margin-top:10px;display:inline-block;font-size:13px;opacity:.55">（此章暂无注释）</span>`;
  const notesBlock = hasCommentary
    ? `<div id="notes" style="display:none;text-align:left;margin-top:14px;border-top:1px dashed var(--line);padding-top:12px">
        <p class="note">${c.commentaryZh}</p><p class="en">${c.commentaryEn}</p>
       </div>`
    : "";

  document.getElementById("stage").innerHTML = `
    <div class="fade" style="text-align:center">
      <div class="seal">第${id}章 · ${c.title}</div>
      <p class="yuan" style="font-size:22px;letter-spacing:2px;margin:18px 0">${c.original}</p>
      <p class="en">${c.translation}</p>
      ${obsBtn}
      <button id="speak" class="note" style="margin-top:10px;margin-left:8px;border:1px dashed var(--line);background:none;cursor:pointer;padding:4px 12px">听</button>
      <button id="askch" class="note" style="margin-top:10px;margin-left:8px;border:1px dashed var(--cinnabar);background:none;cursor:pointer;padding:4px 12px;color:var(--cinnabar)">问老子此章</button>
      ${notesBlock}
    </div>`;

  if (hasCommentary) {
    document.getElementById("obs").onclick = () => {
      const n = document.getElementById("notes");
      n.style.display = n.style.display === "none" ? "block" : "none";
      if (n.style.display === "block") n.classList.add("fade");
    };
  }
  document.getElementById("speak").onclick = () => {
    const synth = window.speechSynthesis;
    if (!synth){ alert("当前浏览器不支持朗读"); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(window.__chapter.original);
    u.lang = "zh-CN"; u.rate = 0.9;
    synth.speak(u);
  };
  document.getElementById("askch").onclick = () => window.openChat(true);
  buildDrawer();
}

function go(n){ id = clampChapter(n, TOTAL); render(); window.scrollTo(0, 0); }

function buildDrawer(){
  document.getElementById("drawer").innerHTML = chapters.map(c =>
    `<a href="?ch=${c.id}" class="${c.id === id ? "cur" : ""}" data-id="${c.id}">${c.id}·${c.title}</a>`
  ).join("");
  document.querySelectorAll("#drawer a").forEach(a =>
    a.onclick = (e) => { e.preventDefault(); go(Number(a.dataset.id)); }
  );
}

document.getElementById("prev").onclick = () => go(id - 1);
document.getElementById("next").onclick = () => go(id + 1);
document.getElementById("menu").onclick = () => document.getElementById("drawer").classList.toggle("open");
addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") go(id - 1);
  if (e.key === "ArrowRight") go(id + 1);
});
document.getElementById("card").onclick = () => {
  const c = window.__chapter;
  const cv = document.createElement("canvas"); cv.width = 600; cv.height = 900;
  const g = cv.getContext("2d");
  g.fillStyle = "#f5f0e6"; g.fillRect(0, 0, 600, 900);
  g.strokeStyle = "#d8ccae"; g.lineWidth = 2; g.strokeRect(24, 24, 552, 852);
  g.fillStyle = "#9c3b2e"; g.font = "28px serif"; g.textAlign = "center";
  g.fillText(`第${c.id}章 · ${c.title}`, 300, 110);
  g.fillStyle = "#5c4a32"; g.font = "26px serif";
  wrap(g, c.original, 300, 190, 500, 40);
  g.fillStyle = "#8a7a5c"; g.font = "16px serif";
  g.fillText("道德經", 300, 850);
  const a = document.createElement("a");
  a.download = `道德经-第${c.id}章.png`; a.href = cv.toDataURL("image/png"); a.click();
};
function wrap(g, text, x, y, maxW, lh) {
  let line = "";
  for (const ch of text) {
    if (g.measureText(line + ch).width > maxW) { g.fillText(line, x, y); line = ch; y += lh; }
    else line += ch;
  }
  if (line) g.fillText(line, x, y);
}
render();
