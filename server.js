// 零依赖小型服务：静态文件 + /api/chat 代理。
// Key 只从服务器环境变量读取，浏览器永远拿不到。
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve as resolvePath, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

// 不通过静态服务暴露的文件/目录
const DENY_NAMES = new Set(["config.js", ".env", "server.js", ".git", "node_modules", "_corpus_raw", "deploy"]);

const CHAT_TIMEOUT_MS = 120_000;
const MAX_BODY = 64 * 1024;

function sendJson(res, status, obj) {
  if (res.headersSent) { res.end(); return; }
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}

function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let done = false;
    const chunks = [];
    req.on("data", (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > limit) {
        done = true;
        reject(Object.assign(new Error("请求体过大"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!done) { done = true; resolve(Buffer.concat(chunks).toString("utf8")); }
    });
    req.on("error", (e) => {
      if (!done) { done = true; reject(e); }
    });
  });
}

function validMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) return false;
  let total = 0;
  for (const m of messages) {
    if (!m || typeof m !== "object") return false;
    if (!["system", "user", "assistant"].includes(m.role)) return false;
    if (typeof m.content !== "string" || m.content.length === 0 || m.content.length > 8000) return false;
    total += m.content.length;
  }
  return total <= 60_000;
}

// 简单滑动窗口限流（进程内存，重启归零）
function makeLimiter({ windowMs = 10 * 60 * 1000, max = 30 } = {}) {
  const hits = new Map();
  return function allow(ip) {
    const now = Date.now();
    const rec = hits.get(ip);
    if (!rec || now >= rec.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
      }
      return true;
    }
    if (rec.count >= max) return false;
    rec.count++;
    return true;
  };
}

async function handleChat(req, res, { apiKey, apiBase, model, allow }) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method not allowed" });
  if (!apiKey) return sendJson(res, 503, { error: "对话服务未配置：缺少 DEEPSEEK_API_KEY" });

  // 服务只监听 127.0.0.1，由 Nginx 传入真实客户端地址
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "";
  if (!allow(ip)) return sendJson(res, 429, { error: "请求过于频繁，请稍后再试" });

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (e) {
    return sendJson(res, e.status || 400, { error: e.status ? e.message : "无效的 JSON" });
  }
  if (!payload || !validMessages(payload.messages)) return sendJson(res, 400, { error: "无效的 messages" });

  const t = payload.temperature;
  const temperature = typeof t === "number" && t >= 0 && t <= 2 ? t : 0.8;
  // 模型由服务器决定，忽略客户端传值
  const body = JSON.stringify({ model, messages: payload.messages, stream: true, temperature });

  let upstream;
  try {
    upstream = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body,
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS)
    });
  } catch {
    return sendJson(res, 502, { error: "上游服务不可达" });
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return sendJson(res, 502, { error: `上游服务错误: ${upstream.status}`, detail: text.slice(0, 300) });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "X-Content-Type-Options": "nosniff"
  });

  const reader = upstream.body.getReader();
  let clientClosed = false;
  res.on("close", () => { clientClosed = true; reader.cancel().catch(() => {}); });
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (clientClosed) break;
      if (!res.write(Buffer.from(value))) {
        await new Promise((r) => { res.once("drain", r); res.once("close", r); });
      }
    }
  } catch {
    // 客户端或上游中断——直接收尾
  }
  res.end();
}

async function serveStatic(req, res, root, pathname) {
  let relPath;
  try {
    relPath = decodeURIComponent(pathname);
  } catch {
    return sendJson(res, 400, { error: "bad path" });
  }
  if (relPath.includes("\0")) return sendJson(res, 400, { error: "bad path" });

  const segments = relPath.split("/").filter(Boolean);
  if (segments.some((s) => s.startsWith(".") || DENY_NAMES.has(s))) {
    return sendJson(res, 404, { error: "not found" });
  }

  const base = resolvePath(root);
  let filePath = resolvePath(base, "." + relPath);
  if (filePath !== base && !filePath.startsWith(base + sep)) {
    return sendJson(res, 404, { error: "not found" });
  }

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = resolvePath(filePath, "index.html");
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch (e) {
    if (e.code === "ENOENT" || e.code === "EISDIR" || e.code === "ENOTDIR") {
      return sendJson(res, 404, { error: "not found" });
    }
    throw e;
  }
}

export function createApp({
  root = ROOT,
  apiKey,
  apiBase = "https://api.deepseek.com/v1",
  model = "deepseek-chat",
  limit
} = {}) {
  const allow = makeLimiter(limit);
  return createServer((req, res) => {
    let pathname;
    try {
      pathname = new URL(req.url || "/", "http://localhost").pathname;
    } catch {
      return sendJson(res, 400, { error: "bad request" });
    }
    if (pathname === "/api/chat") {
      handleChat(req, res, { apiKey, apiBase, model, allow }).catch(() => sendJson(res, 500, { error: "服务器内部错误" }));
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { error: "method not allowed" });
    }
    serveStatic(req, res, root, pathname).catch(() => sendJson(res, 500, { error: "服务器内部错误" }));
  });
}

const isMain = process.argv[1] && pathToFileURL(resolvePath(process.argv[1])).href === import.meta.url;
if (isMain) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || "127.0.0.1";
  const app = createApp({
    apiKey: process.env.DEEPSEEK_API_KEY,
    apiBase: process.env.DEEPSEEK_BASE_URL || undefined,
    model: process.env.DEEPSEEK_MODEL || undefined
  });
  app.listen(port, host, () => {
    console.log(`daodejing server on http://${host}:${port}`);
    if (!process.env.DEEPSEEK_API_KEY) {
      console.warn("警告：未设置 DEEPSEEK_API_KEY，/api/chat 将返回 503");
    }
  });
  const stop = () => app.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
