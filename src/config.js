// 音频代理配置
// Cloudflare Workers 代理模式

const CONFIG = {
  // Cloudflare Workers 代理地址
  cfWorkerUrl: 'https://voice-guess-arknights.guyangguan.workers.dev',

  // prts.wiki CDN 基础地址（备用）
  cdnBase: 'https://torappu.prts.wiki/assets/audio',
};

// 获取音频 URL
export function getAudioUrl(relativePath) {
  return `${CONFIG.cfWorkerUrl}/audio/${relativePath}`;
}

export default CONFIG;
