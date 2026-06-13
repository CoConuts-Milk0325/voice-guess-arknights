// Cloudflare Workers 代理 + 缓存
// 缓存命中 → Worker 直接返回（无延迟）
// 缓存未命中 → 302 跳转到 prts.wiki 直链（无中转延迟），同时在后台缓存

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

async function cacheAudio(ctx, cacheKey, targetUrl) {
  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) return;

    const headers = new Headers(CORS_HEADERS);
    headers.set('Content-Type', response.headers.get('Content-Type') || 'audio/wav');
    headers.set('Cache-Control', 'public, max-age=604800');

    const cached = new Response(response.body, { status: 200, headers });
    ctx.waitUntil(cache.put(cacheKey, cached.clone()));
  } catch (e) {
    // 静默失败，下次请求重试
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // OPTIONS 预检
    if (request.method === 'OPTIONS') {
      const reqHeaders = request.headers.get('Access-Control-Request-Headers') || '';
      const reqMethod = request.headers.get('Access-Control-Request-Method') || 'GET';
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': reqMethod,
          'Access-Control-Allow-Headers': reqHeaders || '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (!url.pathname.startsWith('/audio/')) {
      return new Response('Not Found', { status: 404 });
    }

    // 去除 query 参数
    const cleanUrl = new URL(url.toString());
    cleanUrl.search = '';

    const audioPath = url.pathname.replace('/audio/', '');
    const targetUrl = `https://torappu.prts.wiki/assets/audio/${audioPath}`;

    const cache = caches.default;
    const cacheKey = new Request(cleanUrl.toString(), request);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      // 命中缓存 → 加 CORS 后直接返回
      const headers = new Headers(cachedResponse.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers,
      });
    }

    // 未命中 → 跳转到 prts.wiki 直链（浏览器直连，无中转延迟）
    // 同时在后台拉取并缓存，下次就走缓存了
    const prtsUrl = targetUrl;
    cacheAudio(ctx, cacheKey, prtsUrl);

    return Response.redirect(prtsUrl, 302);
  },
};
