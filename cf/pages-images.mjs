// Cloudflare Pages build step (after `next build` with PAGES_EXPORT=1): writes a
// webp variant of every raster image in out/ for every width next/image can ask
// for, to out/_img/<path without extension>-<width>.webp (see cf/image-loader.ts).
// Never upscales: a width above the original gets the original size.
import { createRequire } from "node:module";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const { imageConfigDefault } = require("next/dist/shared/lib/image-config");
const widths = [...imageConfigDefault.imageSizes, ...imageConfigDefault.deviceSizes];
const quality = imageConfigDefault.qualities?.[0] ?? 75;

const out = path.resolve("out");
const skip = new Set(["_next", "_img"]);

async function* rasterFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!(dir === out && skip.has(e.name))) yield* rasterFiles(path.join(dir, e.name));
    } else if (/\.(png|jpe?g|webp)$/i.test(e.name)) {
      yield path.join(dir, e.name);
    }
  }
}

let files = 0;
for await (const file of rasterFiles(out)) {
  const rel = path.relative(out, file).replace(/\.[^.]+$/, "");
  const { width: original } = await sharp(file).metadata();
  const encoded = new Map();
  for (const w of widths) {
    const target = Math.min(w, original);
    if (!encoded.has(target)) {
      encoded.set(target, await sharp(file).resize({ width: target }).webp({ quality }).toBuffer());
    }
    const dest = path.join(out, "_img", `${rel}-${w}.webp`);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, encoded.get(target));
    files++;
  }
}
console.log(`pages-images: ${files} webp variants in out/_img`);
