import type { MetadataRoute } from "next";

/** Elmentve PWA manifest (mobilon telepíthető, önálló megjelenés). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elmentve – hétköznapi biztonsági háló",
    short_name: "Elmentve",
    description:
      "Fotózd le. Ellenőrizd. Mi megőrizzük, és időben szólunk.",
    lang: "hu",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f5ff",
    theme_color: "#f7f5ff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
