// 升级位：把下方直连 fetch 换成 fetch("/api/chat", {...}) 即切轻后端，调用方不变。
// config.js 由用户本地提供（已 gitignore），格式：
//   export const CONFIG = { apiKey: "sk-...", baseUrl: "https://...", model: "..." };
// config.js 在此惰性加载（dynamic import），确保 config.js 缺失时聊天界面仍能正常渲染，
// 仅在用户实际发送消息时才报告配置错误。
import { MODEL_PARAMS } from "./prompt.js";

export async function askLaozi(messages, { onToken } = {}) {
  let CONFIG;
  try {
    ({ CONFIG } = await import("../config.js"));
  } catch {
    throw new Error("未找到 config.js，请复制 config.example.js 为 config.js 并填入 API Key。");
  }
  if (!CONFIG?.apiKey || CONFIG.apiKey === "YOUR_API_KEY") {
    throw new Error("请在 config.js 中填入有效的 API Key。");
  }

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
