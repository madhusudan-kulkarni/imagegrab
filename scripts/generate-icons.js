import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f1f5f9" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Background Card -->
  <rect x="6" y="6" width="116" height="116" rx="26" fill="url(#bgGrad)" filter="url(#shadow)" />

  <!-- Inner Image Frame -->
  <rect x="22" y="22" width="84" height="60" rx="10" fill="url(#cardGrad)" stroke="#ffffff" stroke-width="2" />

  <!-- Sun / Badge in image -->
  <circle cx="42" cy="40" r="7" fill="#f59e0b" />

  <!-- Mountain Landscape -->
  <path d="M26 76 L48 50 L64 66 L78 52 L102 76 Z" fill="#93c5fd" opacity="0.9" />
  <path d="M42 76 L62 56 L76 70 L86 60 L102 76 Z" fill="#3b82f6" />

  <!-- Download Arrow Container Badge -->
  <circle cx="64" cy="94" r="22" fill="#0f172a" stroke="#ffffff" stroke-width="3.5" filter="url(#shadow)" />
  
  <!-- Download Arrow Glyph -->
  <path d="M64 83 V101 M56 94 L64 102 L72 94" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

const outputDir = path.resolve('src/public');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the SVG
fs.writeFileSync(path.join(outputDir, 'icon.svg'), svgContent);

const sizes = [16, 32, 48, 128];

async function generatePngs() {
  const svgBuffer = Buffer.from(svgContent);
  for (const size of sizes) {
    const outPath = path.join(outputDir, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`Generated ${outPath} (${size}x${size})`);
  }
}

generatePngs().catch(console.error);
