# 部署指南

## 方案一：GitHub Pages + Cloudflare Workers（推荐）

### 1. 部署 Cloudflare Workers

1. 注册 [Cloudflare](https://cloudflare.com) 账号
2. 创建 Workers：
   - 复制 `cf-worker.js` 内容
   - 在 Cloudflare Dashboard → Workers → Create Worker
   - 粘贴代码并部署
3. 记录 Worker URL（如 `https://voice-proxy.your-name.workers.dev`）

### 2. 配置前端

编辑 `src/config.js`：
```js
proxyMode: 'cf-worker',
cfWorkerUrl: 'https://voice-proxy.your-name.workers.dev',
```

### 3. 构建并部署

```bash
npm run build
# 上传 dist/ 文件夹到 GitHub Pages
```

## 方案二：本地服务器

直接运行 `node server.js`，适合本地使用。

## 方案三：自建服务器

将 `dist/` 和 `server.js` 部署到自己的服务器（VPS、云函数等）。

## 语音数据

语音数据来自 prts.wiki，通过代理访问可避免 CORS 问题。
