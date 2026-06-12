// 音频配置
// 通过 Cloudflare Worker 代理（缓存后不再访问 prts.wiki）

const CONFIG = {
  // Cloudflare Worker 代理地址
  proxyBase: 'https://voice-guess-arknights.guyangguan.workers.dev/audio',
};

// 获取音频 URL
export function getAudioUrl(relativePath) {
  return `${CONFIG.proxyBase}/${relativePath}`;
}

export default CONFIG;
