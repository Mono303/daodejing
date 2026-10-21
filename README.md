# 道德经中英注释展示 + 老子对话智能体

古风清雅的《道德经》八十一章中英对照 + 注释沉浸式展示，附老子对话智能体。

## 本地运行

两种方式选其一：

**方式 A：静态服务器 + 浏览器直连（最简单）**
1. 复制 `config.example.js` 为 `config.js`，填入你的国内大模型 API Key（Qwen/DeepSeek/GLM，OpenAI 兼容端点）。
   > `config.js` 已在 `.gitignore`，不会提交。
2. 起静态服务器：`python -m http.server 8000`
3. 浏览器开 `http://localhost:8000/`

**方式 B：代理模式（与线上一致，Key 不进浏览器）**
1. 复制 `.env.example` 为 `.env`，填入 `DEEPSEEK_API_KEY`
2. 启动：`node server.js`
3. 浏览器开 `http://127.0.0.1:3000/`

> 语料 `data/chapters.json` 已提交；重新导入语料时执行 `node tools/build-corpus.mjs`。

## 部署（阿里云）
1. 克隆到 `/opt/daodejing`（不要包含 `config.js`），安装 Node.js 20+ 与 Nginx
2. `cp deploy/daodejing.service /etc/systemd/system/`，按 `.env.example` 创建 `/opt/daodejing/.env`，然后 `systemctl daemon-reload && systemctl enable --now daodejing`
3. `deploy/nginx.conf` 复制到 `/etc/nginx/conf.d/daodejing.conf` 并替换域名，`nginx -t && systemctl reload nginx`
4. 安全组放行 80/443。**大陆地域服务器绑定域名需完成 ICP 备案**；备案期间可用 `http://公网IP:端口` 访问
5. 备案完成后配置 DNS 与 HTTPS 证书（详见 `deploy/nginx.conf` 中的 HTTPS 示例）

## 测试
`node --test tools/*.test.mjs js/*.test.mjs`

## 结构
- `index.html` 目录首页；`chapter.html` 沉浸阅读页
- `data/chapters.json` 语料（脚本生成）
- `js/askLaozi.js` 大模型接口层：有 `config.js` 时直连，否则走 `/api/chat` 代理
- `js/prompt.js` 老子人设
- `server.js` 静态服务 + `/api/chat` 代理（线上模式，Key 只存服务器环境变量）
- `deploy/` Nginx 与 systemd 配置示例

## 已知事项
- 第 31 章的注释在源语料中缺失（显示为空），这是预期的数据状态。

## 后期扩展
见 `docs/superpowers/specs/2026-10-19-daodejing-bilingual-laozi-design.md`：具象化形象（静态立绘 / Live2D / 数字人）、RAG 检索、轻后端部署。
