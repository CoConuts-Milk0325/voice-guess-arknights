// Cloudflare Workers 代理 + 缓存
// 首次访问从 prts.wiki 获取，之后从 Cloudflare 缓存读取
// 这样 prts.wiki 只被访问一次，后续都走缓存

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (!url.pathname.startsWith('/audio/')) {
      return new Response('Not Found', { status: 404 });
    }

    const audioPath = url.pathname.replace('/audio/', '');
    const targetUrl = `https://torappu.prts.wiki/assets/audio/${audioPath}`;

    // 使用 Cloudflare Cache API
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      // 命中缓存，直接返回
      return cachedResponse;
    }

    try {
      // 从 prts.wiki 获取
      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (!response.ok) {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }

      // 构建响应
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', response.headers.get('Content-Type') || 'audio/wav');
      headers.set('Cache-Control', 'public, max-age=604800'); // 7天

      const responseToCache = new Response(response.body, {
        status: 200,
        headers,
      });

      // 存入缓存（Cloudflare 边缘节点）
      ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));

      return responseToCache;
    } catch (error) {
      return new Response('Error', { status: 500, headers: corsHeaders });
    }
  },
};
