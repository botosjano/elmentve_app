import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the site has no API routes or middleware, so `out/` can be
  // served as plain files (Cloudflare Pages). next/image optimization needs a
  // server, hence unoptimized.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
