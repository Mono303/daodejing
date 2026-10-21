// 升级位：把下方直连 fetch 换成 fetch("/api/chat", {...}) 即切轻后端，调用方不变。
// config.js 由用户本地提供（已 gitignore），格式：
//   export const CONFIG = { apiKey: "sk-...", baseUrl: "https://...", model: "..." };
// config.js 在此惰性加载（dynamic import），确保 config.js 缺失时聊天界面仍能正常渲染，
// 仅在用户实际发送消息时才报告配置错误。
import { MODEL_PARAMS } from "./prompt.js";

export async function askLaozi(messages, { onToken } = {}) {
  let CONFIG = null;
  try {
    ({ CONFIG } = await import("../config.js"));
  } catch {
    // 线上模式：config.js 不部署，对话走服务器代理 /api/chat
  }

  const direct = Boolean(CONFIG?.apiKey && CONFIG.apiKey !== "YOUR_API_KEY" && CONFIG.baseUrl);
  if (CONFIG && !direct) throw new Error("请在 config.js 中填入有效的 API Key。");

  const url = direct ? `${CONFIG.baseUrl}/chat/completions` : "/api/chat";
  const headers = { "Content-Type": "application/json" };
  if (direct) headers.Authorization = `Bearer ${CONFIG.apiKey}`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(direct
        ? { model: CONFIG.model, messages, stream: true, ...MODEL_PARAMS }
        : { messages, stream: true, ...MODEL_PARAMS })
    });
  } catch {
    throw new Error(direct
      ? "网络错误，无法连接大模型服务。"
      : "对话服务不可用，请确认服务器已启动（见 README 部署说明）。");
  }

  if (!res.ok) {
    if (!direct && (res.status === 404 || res.status === 405)) {
      throw new Error("对话服务未启用：本地请用 node server.js 启动；或复制 config.example.js 为 config.js 直连。");
    }
    throw new Error(`大模型请求失败: ${res.status}`);
  }

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
