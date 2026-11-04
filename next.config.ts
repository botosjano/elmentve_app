import type { NextConfig } from "next";

// Cloudflare Pages build (`npm run build:pages`): a static export -- the site
// has no API routes or middleware, so `out/` can be served as plain files.
// next/image optimization needs a server, hence unoptimized there. The Vercel
// build is unchanged.
const pagesExport = process.env.PAGES_EXPORT === "1";

const nextConfig: NextConfig = pagesExport
  ? { output: "export", images: { unoptimized: true } }
  : {};

export default nextConfig;
