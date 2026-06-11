const https = require('https');
const fs = require('fs');
const path = require('path');

const AUDIO_DIR = path.join(__dirname, 'audio-cache');
const CDN_BASE = 'https://torappu.prts.wiki/assets/audio';

// Create audio directory
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Load voice mapping
const voiceMapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'dist/data/voice-mapping.json'), 'utf-8'));

// Collect all unique voice URLs
const urls = new Set();
for (const name in voiceMapping) {
  const data = voiceMapping[name];
  for (const lang of ['中文', '日文']) {
    if (data[lang]) {
      for (const vtype in data[lang]) {
        for (const entry of data[lang][vtype]) {
          urls.add(entry.url);
        }
      }
    }
  }
}

console.log(`Found ${urls.size} unique voice files to download`);

// Download with rate limiting
let downloaded = 0;
let skipped = 0;
let failed = 0;

function downloadFile(url) {
  return new Promise((resolve) => {
    const filePath = path.join(AUDIO_DIR, url.replace(/\//g, '_'));

    // Skip if already exists
    if (fs.existsSync(filePath)) {
      skipped++;
      resolve();
      return;
    }

    const fullUrl = `${CDN_BASE}/${url}`;

    https.get(fullUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      if (res.statusCode !== 200) {
        failed++;
        resolve();
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks);
        fs.writeFileSync(filePath, data);
        downloaded++;
        if (downloaded % 100 === 0) {
          console.log(`Progress: ${downloaded + skipped + failed}/${urls.size} (downloaded: ${downloaded}, skipped: ${skipped}, failed: ${failed})`);
        }
        resolve();
      });
    }).on('error', () => {
      failed++;
      resolve();
    });
  });
}

// Process in batches
async function processBatch(batch) {
  await Promise.all(batch.map(url => downloadFile(url)));
}

async function main() {
  const urlArray = [...urls];
  const batchSize = 10;

  console.log(`Starting download of ${urlArray.length} files...`);

  for (let i = 0; i < urlArray.length; i += batchSize) {
    const batch = urlArray.slice(i, i + batchSize);
    await processBatch(batch);

    // Small delay to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\nDownload complete!`);
  console.log(`  Downloaded: ${downloaded}`);
  console.log(`  Skipped (already exists): ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`\nAudio files saved to: ${AUDIO_DIR}`);
}

main().catch(console.error);
