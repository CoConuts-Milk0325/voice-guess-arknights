// 音频配置
// 直接访问 prts.wiki CDN

const CONFIG = {
  cdnBase: 'https://torappu.prts.wiki/assets/audio',
};

// 获取音频 URL
export function getAudioUrl(relativePath) {
  return `${CONFIG.cdnBase}/${relativePath}`;
}

export default CONFIG;
