import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/onboarding"],
    },
    sitemap: "https://elmentve.hu/sitemap.xml",
  };
}
