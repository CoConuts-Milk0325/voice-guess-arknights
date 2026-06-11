// 音频代理配置
// 根据部署环境选择不同的代理方式

const CONFIG = {
  // 代理模式：'local' | 'cf-worker' | 'direct'
  // local: 使用本地 server.js 代理（适合本地开发）
  // cf-worker: 使用 Cloudflare Workers 代理（适合 GitHub Pages 部署）
  // direct: 直接访问 prts.wiki CDN（可能有 CORS 问题）
  proxyMode: 'local',

  // Cloudflare Workers 代理地址（部署后填入）
  cfWorkerUrl: 'https://your-worker-name.your-subdomain.workers.dev',

  // prts.wiki CDN 基础地址（direct 模式使用）
  cdnBase: 'https://torappu.prts.wiki/assets/audio',
};

// 根据代理模式获取音频 URL
export function getAudioUrl(relativePath) {
  switch (CONFIG.proxyMode) {
    case 'local':
      // 本地代理：/audio/voice_cn/...
      return `/audio/${relativePath}`;

    case 'cf-worker':
      // Cloudflare Workers 代理
      return `${CONFIG.cfWorkerUrl}/audio/${relativePath}`;

    case 'direct':
      // 直接访问 CDN
      return `${CONFIG.cdnBase}/${relativePath}`;

    default:
      return `/audio/${relativePath}`;
  }
}

export default CONFIG;
