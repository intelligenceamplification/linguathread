import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LinguaThread",
    short_name: "LinguaThread",
    description: "How Language Is Built through language stacking.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/brand/v2/icon-light-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/v2/icon-light-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
