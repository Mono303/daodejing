import test from "node:test";
import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createApp } from "../server.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function collectSse(text) {
  let out = "";
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("data:")) continue;
    const data = t.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      out += JSON.parse(data).choices?.[0]?.delta?.content || "";
    } catch {}
  }
  return out;
}

// 起一套「应用 + 模拟上游」，返回访问地址与上游收到的请求
async function startStack({ apiKey = "test-key", model = "deepseek-chat", limit } = {}) {
  const hits = [];
  const upstream = createHttpServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      hits.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(body) });
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write('data: {"choices":[{"delta":{"content":"道"}}]}\n\n');
      res.write('data: {"choices":[{"delta":{"content":"可道"}}]}\n\n');
      res.end("data: [DONE]\n\n");
    });
  });
  const upPort = await listen(upstream);
  const app = createApp({
    root: ROOT,
    apiKey,
    apiBase: `http://127.0.0.1:${upPort}/v1`,
    model,
    limit
  });
  const appPort = await listen(app);
  return {
    base: `http://127.0.0.1:${appPort}`,
    hits,
    close: async () => { await close(app); await close(upstream); }
  };
}

test("静态资源：首页与语料可访问", async () => {
  const stack = await startStack();
  try {
    const home = await fetch(stack.base + "/");
    assert.equal(home.status, 200);
    assert.match(await home.text(), /道德經/);

    const corpus = await fetch(stack.base + "/data/chapters.json");
    assert.equal(corpus.status, 200);
    assert.equal((await corpus.json()).length, 81);
  } finally {
    await stack.close();
  }
});

test("静态资源：敏感文件与路径穿越被拒绝", async () => {
  const stack = await startStack();
  try {
    assert.equal((await fetch(stack.base + "/config.js")).status, 404);
    assert.equal((await fetch(stack.base + "/.env")).status, 404);
    assert.equal((await fetch(stack.base + "/%2e%2e/%2e%2e/Windows/win.ini")).status, 404);
  } finally {
    await stack.close();
  }
});

test("/api/chat：转发消息并在服务器侧固定模型与 Key", async () => {
  const stack = await startStack();
  try {
    const res = await fetch(stack.base + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "evil-model",
        messages: [{ role: "user", content: "何谓道？" }]
      })
    });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.equal(collectSse(text), "道可道");

    assert.equal(stack.hits.length, 1);
    assert.equal(stack.hits[0].auth, "Bearer test-key");
    assert.equal(stack.hits[0].body.model, "deepseek-chat");
    assert.equal(stack.hits[0].body.stream, true);
    assert.equal(stack.hits[0].url, "/v1/chat/completions");
  } finally {
    await stack.close();
  }
});

test("/api/chat：非法请求返回 400，缺少 Key 返回 503", async () => {
  const stack = await startStack();
  try {
    const bad = await fetch(stack.base + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] })
    });
    assert.equal(bad.status, 400);
  } finally {
    await stack.close();
  }

  const noKey = await startStack({ apiKey: null });
  try {
    const res = await fetch(noKey.base + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "在吗" }] })
    });
    assert.equal(res.status, 503);
  } finally {
    await noKey.close();
  }
});

test("/api/chat：超过限流返回 429", async () => {
  const stack = await startStack({ limit: { windowMs: 60_000, max: 1 } });
  try {
    const send = () => fetch(stack.base + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "你好" }] })
    });
    const first = await send();
    assert.equal(first.status, 200);
    await first.text();
    const second = await send();
    assert.equal(second.status, 429);
  } finally {
    await stack.close();
  }
});
