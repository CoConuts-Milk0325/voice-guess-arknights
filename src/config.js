// 音频配置
// 直接访问 prts.wiki CDN

const CONFIG = {
  cdnBase: 'https://torappu.prts.wiki/assets/audio',
};

export function getAudioUrl(relativePath) {
  return `${CONFIG.cdnBase}/${relativePath}`;
}

export default CONFIG;
