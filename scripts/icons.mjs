// Genera los íconos de la app (npm run icons):
//   public/icons/icon-192.png e icon-512.png  → pantalla de inicio (manifest)
//   app/icon.png (64 px) y app/apple-icon.png (180 px) → favicon y Safari
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff8a3d"/>
      <stop offset="0.55" stop-color="#ff5a1f"/>
      <stop offset="1" stop-color="#e03e0b"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.2" r="0.8">
      <stop offset="0" stop-color="#fff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="118" fill="url(#g)"/>
  <rect width="512" height="512" rx="118" fill="url(#glow)"/>
  <!-- mancuerna -->
  <g fill="#fff">
    <rect x="104" y="238" width="304" height="36" rx="18"/>
    <rect x="126" y="170" width="60" height="172" rx="22"/>
    <rect x="326" y="170" width="60" height="172" rx="22"/>
    <rect x="80" y="204" width="38" height="104" rx="16" opacity="0.92"/>
    <rect x="394" y="204" width="38" height="104" rx="16" opacity="0.92"/>
  </g>
  <!-- marca de "hecho" -->
  <circle cx="392" cy="396" r="72" fill="#fff"/>
  <path d="M356 398 l26 26 l50 -56" fill="none" stroke="#ff5a1f" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const render = (size, file) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(file).then(() => console.log(file));

await mkdir("public/icons", { recursive: true });
await render(192, "public/icons/icon-192.png");
await render(512, "public/icons/icon-512.png");
await render(64, "app/icon.png");
await render(180, "app/apple-icon.png");
