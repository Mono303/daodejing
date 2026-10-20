import { readFile } from "node:fs/promises";

/**
 * Extract paragraphs from a UTF-8 text file.
 * If the file contains Word XML markup (<w:t> tags), extracts text from those tags.
 * Otherwise splits on newlines and filters empty lines.
 *
 * @param {string} txtPath - Path to the text file
 * @returns {Promise<string[]>} Array of non-empty paragraph strings
 */
export default async function extractParagraphs(txtPath) {
  const content = await readFile(txtPath, "utf8");

  // Detect Word XML by presence of <w:t tags
  if (content.includes("<w:t")) {
    // Each line is one XML paragraph block.
    // The <w:t> tags in this corpus are unclosed (text runs to end-of-line),
    // so we match <w:t[^>]*> and capture everything after it to end of line.
    const unescape = s => s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#x201C;/g, "“")
      .replace(/&#x201D;/g, "”")
      .replace(/&#x2019;/g, "’")
      .replace(/&#x2018;/g, "‘")
      .replace(/&quot;/g, '"');

    return content
      .split(/\r?\n/)
      .map(line => {
        // Match only <w:t> or <w:t ...> (not <w:textAlignment etc.)
        // (?=[\s>]) ensures no more tag-name chars follow 't'
        const closed = [...line.matchAll(/<w:t(?=[\s>])[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]);
        if (closed.length) return unescape(closed.join("")).trim();
        // Unclosed form: text runs to end-of-line with no closing tag
        const m = line.match(/<w:t(?=[\s>])[^>]*>(.*)$/);
        if (m) return unescape(m[1]).trim();
        return "";
      })
      .filter(Boolean);
  }

  // Plain text: split on newlines, filter empty
  return content.split("\n").map(s => s.trim()).filter(Boolean);
}
