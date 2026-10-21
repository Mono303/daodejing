// 分享卡：把本章原文与最近一轮问答绘制成 PNG。
// latestExchange 为纯逻辑（可单测）；绘制部分依赖浏览器 Canvas。
const PAPER = "#f5f0e6";
const INK = "#3a3228";
const INK2 = "#8a7a5c";
const CINNABAR = "#9c3b2e";
const LINE = "#d8ccae";
const SERIF = `"Noto Serif SC","Songti SC",serif`;

export function latestExchange(history) {
  for (let i = history.length - 1; i > 0; i--) {
    const answer = history[i], question = history[i - 1];
    if (answer?.role === "assistant" && question?.role === "user") {
      return { question: question.content, answer: answer.content };
    }
  }
  return null;
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const paragraph of String(text).split("\n")) {
    let line = "";
    for (const ch of paragraph) {
      if (line && ctx.measureText(line + ch).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    lines.push(line);
  }
  return lines;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function buildShareCanvas({ chapter, question, answer }, { width = 720, scale = 2 } = {}) {
  const pad = 48;
  const innerW = width - pad * 2;
  const boxPad = 18;
  const qLh = 31, aLh = 34, origLh = 38;

  const probe = document.createElement("canvas").getContext("2d");
  probe.font = `22px ${SERIF}`;
  const origLines = wrapText(probe, chapter.original, innerW);
  probe.font = `18px ${SERIF}`;
  const qLines = wrapText(probe, question, innerW - boxPad * 2);
  probe.font = `20px ${SERIF}`;
  const aLines = wrapText(probe, answer, innerW - boxPad * 2);

  // 纵向布局（逻辑像素，textBaseline 统一为 top）
  const titleTop = 88;
  const origTop = titleTop + 46;
  const dividerY = origTop + origLines.length * origLh + 26;
  const qTagTop = dividerY + 30;
  const qBoxTop = qTagTop + 26;
  const qBoxH = boxPad * 2 + qLines.length * qLh;
  const aTagTop = qBoxTop + qBoxH + 30;
  const aBoxTop = aTagTop + 26;
  const aBoxH = boxPad * 2 + aLines.length * aLh;
  const footTop = aBoxTop + aBoxH + 42;
  const height = footTop + 14 + 44;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const g = canvas.getContext("2d");
  g.scale(scale, scale);
  g.textBaseline = "top";

  // 纸底与边框
  g.fillStyle = PAPER;
  g.fillRect(0, 0, width, height);
  g.strokeStyle = LINE;
  g.lineWidth = 2;
  g.strokeRect(24, 24, width - 48, height - 48);

  // 标题
  g.fillStyle = CINNABAR;
  g.font = `26px ${SERIF}`;
  g.textAlign = "center";
  g.fillText(`道德經 · 第${chapter.id}章 · ${chapter.title}`, width / 2, titleTop);

  // 原文
  g.fillStyle = "#5c4a32";
  g.font = `22px ${SERIF}`;
  origLines.forEach((line, i) => g.fillText(line, width / 2, origTop + i * origLh));

  // 分隔线
  g.strokeStyle = LINE;
  g.lineWidth = 1;
  g.setLineDash([6, 8]);
  g.beginPath();
  g.moveTo(pad, dividerY);
  g.lineTo(width - pad, dividerY);
  g.stroke();
  g.setLineDash([]);

  // 问
  g.textAlign = "left";
  g.fillStyle = CINNABAR;
  g.font = `15px ${SERIF}`;
  g.fillText("问", pad, qTagTop);
  g.fillStyle = "#e8dcc0";
  roundRect(g, pad, qBoxTop, innerW, qBoxH, 10);
  g.fill();
  g.fillStyle = INK;
  g.font = `18px ${SERIF}`;
  qLines.forEach((line, i) => g.fillText(line, pad + boxPad, qBoxTop + boxPad + i * qLh));

  // 答
  g.fillStyle = CINNABAR;
  g.font = `15px ${SERIF}`;
  g.fillText("老子", pad, aTagTop);
  g.fillStyle = "#faf6ec";
  roundRect(g, pad, aBoxTop, innerW, aBoxH, 10);
  g.fill();
  g.strokeStyle = LINE;
  roundRect(g, pad, aBoxTop, innerW, aBoxH, 10);
  g.stroke();
  g.fillStyle = INK;
  g.font = `20px ${SERIF}`;
  aLines.forEach((line, i) => g.fillText(line, pad + boxPad, aBoxTop + boxPad + i * aLh));

  // 落款
  g.fillStyle = INK2;
  g.font = `14px ${SERIF}`;
  g.textAlign = "center";
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  g.fillText(`问道 · 道德經 · ${date}`, width / 2, footTop);

  return canvas;
}

export function downloadShareImage(data) {
  const canvas = buildShareCanvas(data);
  const a = document.createElement("a");
  a.download = `道德经-问道-第${data.chapter.id}章.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}
