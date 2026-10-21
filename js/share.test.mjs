import test from "node:test";
import assert from "node:assert/strict";
import { latestExchange } from "./share.js";

test("latestExchange: 空历史返回 null", () => {
  assert.equal(latestExchange([]), null);
});

test("latestExchange: 只有提问没有回答时返回 null", () => {
  assert.equal(latestExchange([{ role: "user", content: "何谓道？" }]), null);
});

test("latestExchange: 取最近一轮完整问答", () => {
  const history = [
    { role: "user", content: "一问" },
    { role: "assistant", content: "一答" },
    { role: "user", content: "二问" },
    { role: "assistant", content: "二答" }
  ];
  assert.deepEqual(latestExchange(history), { question: "二问", answer: "二答" });
});

test("latestExchange: 末尾缺少回答时跳过该轮", () => {
  const history = [
    { role: "user", content: "一问" },
    { role: "assistant", content: "一答" },
    { role: "user", content: "二问" }
  ];
  assert.deepEqual(latestExchange(history), { question: "一问", answer: "一答" });
});
