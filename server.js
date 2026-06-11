const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const DIST = path.join(__dirname, 'dist');
const CACHE_DIR = path.join(__dirname, '.audio-cache');
const LOCAL_AUDIO_DIR = path.join(__dirname, 'audio-cache');

// Create cache directory
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// MIME types
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

// Cache for audio files (memory + disk)
const audioCache = new Map();

// Proxy audio requests with local cache fallback
function proxyAudio(req, res) {
  const urlPath = req.url;

  // Check memory cache first
  if (audioCache.has(urlPath)) {
    const cached = audioCache.get(urlPath);
    res.writeHead(200, {
      'Content-Type': cached.contentType,
      'Cache-Control': 'public, max-age=604800',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(cached.data);
    return;
  }

  // Check local downloaded audio
  const localFile = path.join(LOCAL_AUDIO_DIR, urlPath.replace(/\//g, '_'));
  if (fs.existsSync(localFile)) {
    const data = fs.readFileSync(localFile);
    const contentType = MIME[path.extname(urlPath)] || 'audio/wav';
    audioCache.set(urlPath, { data, contentType });
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=604800',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
    return;
  }

  // Check disk cache
  const cacheFile = path.join(CACHE_DIR, Buffer.from(urlPath).toString('base64').replace(/\//g, '_'));
  if (fs.existsSync(cacheFile)) {
    const data = fs.readFileSync(cacheFile);
    const contentType = MIME[path.extname(urlPath)] || 'audio/wav';
    audioCache.set(urlPath, { data, contentType });
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=604800',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
    return;
  }

  // Fetch from prts.wiki CDN (fallback)
  const cdnUrl = `https://torappu.prts.wiki/assets/audio${urlPath}`;

  https.get(cdnUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }, (proxyRes) => {
    if (proxyRes.statusCode !== 200) {
      res.writeHead(proxyRes.statusCode);
      res.end();
      return;
    }

    const chunks = [];
    proxyRes.on('data', chunk => chunks.push(chunk));
    proxyRes.on('end', () => {
      const data = Buffer.concat(chunks);
      const contentType = proxyRes.headers['content-type'] || 'audio/wav';

      // Cache in memory and disk
      audioCache.set(urlPath, { data, contentType });
      fs.writeFileSync(cacheFile, data);

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
  }).on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end('Bad Gateway');
  });
}

// Main server
function startServer(port) {
  const server = http.createServer((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    // Proxy audio requests
    if (req.url.startsWith('/audio/')) {
      proxyAudio(req, res);
      return;
    }

    // Serve static files
    let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);

    if (!fs.existsSync(filePath)) {
      filePath = path.join(DIST, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=604800'
        });
        res.end(data);
      }
    });
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(e);
    }
  });

  server.listen(port, () => {
    console.log(`Server: http://localhost:${port}`);
    console.log('Press Ctrl+C to stop');
  });
}

startServer(PORT);
