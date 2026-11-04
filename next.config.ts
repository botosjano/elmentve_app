import type { NextConfig } from "next";

// Cloudflare Pages build (`npm run build:pages`): a static export -- the site
// has no API routes or middleware, so `out/` can be served as plain files.
// next/image has no image server there: a custom loader points at webp variants
// that cf/pages-images.mjs writes at build time. The Vercel build is unchanged.
const pagesExport = process.env.PAGES_EXPORT === "1";

const nextConfig: NextConfig = pagesExport
  ? { output: "export", images: { loader: "custom", loaderFile: "./cf/image-loader.ts" } }
  : {};

export default nextConfig;
