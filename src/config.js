// 音频配置
// 直接访问 prts.wiki 的音频资源（不再经 Cloudflare Worker 代理）

import { CDN_BASE } from './utils/constants.js';

// 获取音频 URL
export function getAudioUrl(relativePath) {
  return `${CDN_BASE}${relativePath}`;
}
