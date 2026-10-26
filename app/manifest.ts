import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FitMe",
    short_name: "FitMe",
    description: "Tu rutina de mancuernas, trotes y comidas con foto, en un solo lugar.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f4f0",
    theme_color: "#ea580c",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
