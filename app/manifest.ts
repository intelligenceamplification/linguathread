import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LinguaThread",
    short_name: "LinguaThread",
    description: "How Language Is Built through language stacking.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f3",
    theme_color: "#f6f7f3",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
