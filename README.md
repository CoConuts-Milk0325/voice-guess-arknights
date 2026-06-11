# 语音猜干员

根据《明日方舟》干员语音猜干员的网页游戏。

## 功能
- 420+ 干员语音数据
- 中文/日文语音支持
- 输入模式（打字）和选择模式
- 挑战模式（20题、计分、总结）
- 星级筛选
- 语音文本显示
- 皮肤语音

## 使用方法

### 本地运行
1. 安装 Node.js (https://nodejs.org)
2. 双击 `start.bat` 或运行 `node server.js`
3. 打开 http://localhost:5173

### 预下载音频（可选）
```bash
node download-audio.js
```
这会下载所有语音文件到 `audio-cache/` 目录，之后播放不依赖 prts.wiki CDN。

### GitHub Pages 部署
1. 上传 `dist/` 文件夹内容到 GitHub
2. 启用 GitHub Pages
3. 注意：音频需要通过后端代理，GitHub Pages 只能展示静态内容

## 架构
- 前端：Vue 3 + Vite
- 后端：Node.js 代理服务器
- 音频来源：prts.wiki CDN（可通过 download-audio.js 预下载到本地）
- 数据来源：prts.wiki
