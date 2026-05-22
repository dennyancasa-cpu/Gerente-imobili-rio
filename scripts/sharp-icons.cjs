const sharp = require('sharp');
const fs = require('fs');

const svgSource = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Emerald Background for visibility -->
  <rect width="512" height="512" fill="#10b981" />
  
  <g transform="translate(106, 66) scale(1.5)">
    <defs>
      <linearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#ecfdf5" />
      </linearGradient>
      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#facc15" />
        <stop offset="100%" stop-color="#b45309" />
      </linearGradient>
    </defs>
    
    <!-- Base Ring / Shadow -->
    <ellipse cx="100" cy="220" rx="60" ry="15" fill="#064e3b" opacity="0.3" />

    <!-- Map Pin Outer Shape - Replaced with white for contrast -->
    <path d="M 0 90 C 0 -10, 200 -10, 200 90 C 200 160, 100 210, 100 210 C 100 210, 0 160, 0 90 Z" fill="#064e3b" />
    
    <!-- Inner Area -->
    <path d="M 15 90 C 15 10, 185 10, 185 90 C 185 150, 100 195, 100 195 C 100 195, 15 150, 15 90 Z" fill="#ffffff" />
    
    <!-- Roof overlap -->
    <path d="M 100 10 L 190 70 L 160 80 L 100 35 L 40 80 L 10 70 Z" fill="#10b981" />
    <rect x="40" y="20" width="15" height="30" fill="#10b981" />

    <!-- Rising Gold Bars -->
    <path d="M 45 145 L 65 145 L 65 180 L 45 180 Z" fill="url(#barGrad)" />
    <path d="M 80 110 L 100 110 L 100 170 L 80 170 Z" fill="url(#barGrad)" />
    <path d="M 115 75 L 135 75 L 135 160 L 115 160 Z" fill="url(#barGrad)" />
    <path d="M 150 40 L 170 40 L 170 145 L 150 145 Z" fill="url(#barGrad)" />
    
    <rect x="90" y="60" width="8" height="8" fill="#10b981" />
    <rect x="102" y="60" width="8" height="8" fill="#10b981" />
    <rect x="90" y="72" width="8" height="8" fill="#10b981" />
    <rect x="102" y="72" width="8" height="8" fill="#10b981" />
  </g>
</svg>
`;

async function createIcon(size, filename) {
  const buffer = Buffer.from(svgSource);
  await sharp(buffer)
    .resize(size, size)
    .png()
    .toFile(filename);
  console.log('Created', filename);
}

async function run() {
  await createIcon(192, 'public/icon-192.png');
  await createIcon(512, 'public/icon-512.png');
}

run();
