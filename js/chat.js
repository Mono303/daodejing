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
let history = [];
let pendingChapter = null;

function bubble(text, me) {
  const d = document.createElement("div");
  d.className = "bub" + (me ? " me" : "");
  d.textContent = text;
  body.appendChild(d);
  body.scrollTop = body.scrollHeight;
  return d;
}

window.openChat = (withChapter) => {
  panel.classList.add("open");
  pendingChapter = withChapter ? window.__chapter : null;
  if (withChapter && window.__chapter)
    bubble(`（就第${window.__chapter.id}章「${window.__chapter.title}」请教）`, true);
  panel.querySelector("#chatIn").focus();
};

panel.querySelector("#chatX").onclick = () => panel.classList.remove("open");

async function send() {
  const input = panel.querySelector("#chatIn");
  const sendBtn = panel.querySelector("#chatSend");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  bubble(text, true);
  const out = bubble("", false);
  sendBtn.disabled = true;
  try {
    const messages = buildMessages(history, text, pendingChapter);
    pendingChapter = null; // 章节上下文只随首问带入
    const full = await askLaozi(messages, {
      onToken: (t) => { out.textContent += t; body.scrollTop = body.scrollHeight; }
    });
    history.push({ role: "user", content: text }, { role: "assistant", content: full });
  } catch (e) {
    out.textContent = "（" + e.message + "）";
  } finally {
    sendBtn.disabled = false;
  }
}

panel.querySelector("#chatSend").onclick = send;
panel.querySelector("#chatIn").addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
