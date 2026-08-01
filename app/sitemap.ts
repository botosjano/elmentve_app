import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://elmentve.hu/",
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: "https://elmentve.hu/adatvedelem",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
