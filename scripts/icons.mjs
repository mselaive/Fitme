// Genera public/icons/icon-192.png e icon-512.png a partir de un SVG (npm run icons).
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f97316"/>
      <stop offset="1" stop-color="#c2410c"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <!-- mancuerna -->
  <g fill="#fff">
    <rect x="96" y="236" width="320" height="40" rx="20"/>
    <rect x="120" y="176" width="56" height="160" rx="18"/>
    <rect x="336" y="176" width="56" height="160" rx="18"/>
    <rect x="72" y="206" width="36" height="100" rx="14" opacity="0.9"/>
    <rect x="404" y="206" width="36" height="100" rx="14" opacity="0.9"/>
  </g>
  <!-- marca de "hecho" -->
  <circle cx="392" cy="392" r="68" fill="#fff"/>
  <path d="M358 394 l24 24 l48 -52" fill="none" stroke="#ea580c" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

await mkdir("public/icons", { recursive: true });
for (const size of [192, 512]) {
  await sharp(Buffer.from(svg(size))).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
  console.log(`public/icons/icon-${size}.png`);
}
