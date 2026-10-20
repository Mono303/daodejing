# 道德经中英注释展示 + 老子对话智能体

古风清雅的《道德经》八十一章中英对照 + 注释沉浸式展示，附老子对话智能体。

## 本地运行
1. 复制 `config.example.js` 为 `config.js`，填入你的国内大模型 API Key（Qwen/DeepSeek/GLM，OpenAI 兼容端点）。
   > `config.js` 已在 `.gitignore`，不会提交。
2. 生成语料（首次或语料更新时）：`node tools/build-corpus.mjs`
   > `data/chapters.json` 已提交，仅在重新导入语料时需要重新生成。
3. 起静态服务器：`python -m http.server 8000`
4. 浏览器开 `http://localhost:8000/`

## 测试
`node --test tools/*.test.mjs js/*.test.mjs`

## 结构
- `index.html` 目录首页；`chapter.html` 沉浸阅读页
- `data/chapters.json` 语料（脚本生成）
- `js/askLaozi.js` 大模型接口层（升级后端只改此文件）
- `js/prompt.js` 老子人设

## 已知事项
- 第 31 章的注释在源语料中缺失（显示为空），这是预期的数据状态。

## 后期扩展
见 `docs/superpowers/specs/2026-10-19-daodejing-bilingual-laozi-design.md`：具象化形象（静态立绘 / Live2D / 数字人）、RAG 检索、轻后端部署。
