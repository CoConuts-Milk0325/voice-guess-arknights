// Cloudflare Workers 代理脚本
// 部署到 Cloudflare Workers 后，前端可以通过这个代理访问 prts.wiki 音频
// 解决 CORS 和 GitHub Pages 流量问题

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only handle /audio/ paths
    if (!url.pathname.startsWith('/audio/')) {
      return new Response('Not Found', { status: 404 });
    }

    // Extract the path after /audio/
    const audioPath = url.pathname.replace('/audio/', '');

    // Build prts.wiki URL
    const targetUrl = `https://torappu.prts.wiki/assets/audio/${audioPath}`;

    try {
      // Fetch from prts.wiki
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (!response.ok) {
        return new Response('Not Found', {
          status: 404,
          headers: corsHeaders,
        });
      }

      // Stream the response with caching headers
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', response.headers.get('Content-Type') || 'audio/wav');
      headers.set('Cache-Control', 'public, max-age=604800'); // 7 days

      return new Response(response.body, {
        status: 200,
        headers,
      });
    } catch (error) {
      return new Response('Error fetching audio', {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
