import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JargonBridge",
    short_name: "JargonBridge",
    description: "Communication & Alignment Copilot：讓工程、產品、業務與管理者講同一種語言",
    start_url: "/coach",
    display: "standalone",
    background_color: "#efe8dc",
    theme_color: "#2b2723",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
