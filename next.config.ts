import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // pdfkit 執行時要讀自己的字型資料檔，不能被打包。
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/notes/export": ["./assets/fonts/*.ttf"],
    "/api/tracks/[id]/export": ["./assets/fonts/*.ttf"],
    "/api/decks/[id]/export": ["./assets/fonts/*.ttf"],
  },
  cacheComponents: true,
  partialPrefetching: true,
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
