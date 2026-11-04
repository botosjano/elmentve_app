// next/image loader for the Cloudflare Pages build (static export, no image
// server): points at the webp variants cf/pages-images.mjs writes into out/_img
// after the build. Keep the URL scheme in sync with that script.
export default function pagesImageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (!src.startsWith("/") || src.startsWith("//") || src.endsWith(".svg")) return src;
  return `/_img${src.replace(/\.[^./]+$/, "")}-${width}.webp`;
}
