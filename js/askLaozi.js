// 升级位：把下方直连 fetch 换成 fetch("/api/chat", {...}) 即切轻后端，调用方不变。
// config.js 由用户本地提供（已 gitignore），格式：
//   export const CONFIG = { apiKey: "sk-...", baseUrl: "https://...", model: "..." };
import { CONFIG } from "../config.js";
import { MODEL_PARAMS } from "./prompt.js";

export async function askLaozi(messages, { onToken } = {}) {
  const res = await fetch(`${CONFIG.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CONFIG.apiKey}`
    },
    body: JSON.stringify({ model: CONFIG.model, messages, stream: true, ...MODEL_PARAMS })
  });

  if (!res.ok) throw new Error(`大模型请求失败: ${res.status}`);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  let buf = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop(); // retain incomplete last line

    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onToken?.(delta);
        }
      } catch {
        // malformed SSE chunk — skip silently
      }
    }
  }

  // 收尾：冲刷缓冲区里残留的最后一行（容忍末行无换行的服务端）
  const tail = buf.trim();
  if (tail.startsWith("data:")) {
    const data = tail.slice(5).trim();
    if (data && data !== "[DONE]") {
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content;
        if (delta) { full += delta; onToken?.(delta); }
      } catch {}
    }
  }

  return full;
}
