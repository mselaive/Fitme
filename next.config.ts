import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Para probar desde el celular en la misma red Wi-Fi (npm run dev:lan).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
