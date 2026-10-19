// 按行判定中/英：含 CJK 字符即视为中文行。
const isCJK = (s) => /[一-鿿]/.test(s);

// 章首编号：行首 1~2 位数字后跟 . 或 。（兼顾半角/全角与前导空格）
const CH_HEAD = /^\s*(\d{1,2})\s*[.．。]\s*/;

// 注释文件章号：行首仅含 1~2 位数字（裸章号行）
const COMM_CH_NUM = /^\s*(\d{1,2})\s*$/;

export function splitTranslationCorpus(paragraphs) {
  const chapters = [];
  let cur = null;
  for (const p of paragraphs) {
    // Skip "英译" label lines
    if (p.trim() === "英译") continue;
    const m = p.match(CH_HEAD);
    if (m) {
      cur = { id: Number(m[1]), original: p.replace(CH_HEAD, "").trim(), translation: "" };
      chapters.push(cur);
    } else if (cur) {
      // CJK continuation lines (multi-line original) go into original if translation not yet started
      if (isCJK(p) && cur.translation === "") {
        cur.original += p.trim();
      } else {
        cur.translation += (cur.translation ? " " : "") + p.trim();
      }
    }
  }
  return chapters.sort((a, b) => a.id - b.id);
}

export function splitCommentaryCorpus(paragraphs) {
  // _c2.txt structure: bare chapter-number line, then Chinese paragraph(s), then English paragraph(s), repeat.
  const chapters = [];
  let cur = null;
  for (const p of paragraphs) {
    const m = p.match(COMM_CH_NUM);
    if (m) {
      cur = { id: Number(m[1]), commentaryZh: "", commentaryEn: "" };
      chapters.push(cur);
    } else if (cur) {
      if (isCJK(p)) {
        cur.commentaryZh += (cur.commentaryZh ? "\n" : "") + p.trim();
      } else {
        cur.commentaryEn += (cur.commentaryEn ? " " : "") + p.trim();
      }
    }
  }
  return chapters.sort((a, b) => a.id - b.id);
}
