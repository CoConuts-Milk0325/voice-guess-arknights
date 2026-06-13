// Cloudflare Workers 代理 + 缓存
// 首次访问从 prts.wiki 获取，之后从 Cloudflare 缓存读取
// 这样 prts.wiki 只被访问一次，后续都走缓存

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      // 预检请求：回显客户端要求的头和方法
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

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    if (!url.pathname.startsWith('/audio/')) {
      return new Response('Not Found', { status: 404 });
    }

    // 去除 query 参数，避免 ?t=... 破坏缓存
    const cleanUrl = new URL(url.toString());
    cleanUrl.search = '';

    const audioPath = url.pathname.replace('/audio/', '');
    const targetUrl = `https://torappu.prts.wiki/assets/audio/${audioPath}`;

    // 使用 Cloudflare Cache API（用无 query 的 URL 做缓存键）
    const cache = caches.default;
    const cacheKey = new Request(cleanUrl.toString(), request);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      // 命中缓存，加上 CORS 头后返回
      const headers = new Headers(cachedResponse.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers,
      });
    }

    try {
      // 从 prts.wiki 获取
      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (!response.ok) {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }

      // 流式传输，不缓冲完整文件（首次加载更快）
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
