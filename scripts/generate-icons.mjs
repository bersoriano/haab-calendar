// Renders the site icons from app/icon.svg, so the brand mark has one source.
//
//   node scripts/generate-icons.mjs
//
// Writes app/favicon.ico (16, 32 and 48 px), app/apple-icon.png and the web
// manifest's PNGs in public/. Run it again after editing app/icon.svg and
// commit the results; nothing renders them at build time.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const tile = await readFile(`${root}app/icon.svg`, "utf8");

// Full-bleed for the platforms that crop the icon themselves: iOS rounds the
// corners, Android masks to its own shape and keeps only the central 80%.
const fullBleed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#1a6be0"/>
  <path fill="#fff" d="M22.5 22h6.5v8.5h6V22h6.5v22H35v-8.5h-6V44h-6.5z"/>
  <circle cx="45.5" cy="18.5" r="4" fill="#1fd1b2"/>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(svg, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">
      <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"
           width="${size}" height="${size}" style="display:block">
    </body></html>`,
  );
  return page.screenshot({ omitBackground: true, type: "png" });
}

/** An .ico holding PNG images, which every browser since IE 11 reads. */
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });

  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

const favicon = [];
for (const size of [16, 32, 48]) {
  favicon.push({ size, png: await render(tile, size) });
}

await writeFile(`${root}app/favicon.ico`, ico(favicon));
await writeFile(`${root}app/apple-icon.png`, await render(fullBleed, 180));
await writeFile(`${root}public/icon-192.png`, await render(tile, 192));
await writeFile(`${root}public/icon-512.png`, await render(tile, 512));
await writeFile(`${root}public/icon-maskable-512.png`, await render(fullBleed, 512));

await browser.close();
console.log("Icons written.");
