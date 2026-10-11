import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nuevo Flow",
    short_name: "Nuevo Flow",
    description: "The Language Stacking App",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/brand/v3/icon-light-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/v3/icon-light-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
