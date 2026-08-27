// public/icon.svg에서 PWA 매니페스트용 PNG 아이콘(192/512)을 생성한다.
// `npm run gen-icons`로 재실행 가능 — icon.svg를 바꾸면 다시 돌릴 것.
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const svg = readFileSync(new URL("../public/icon.svg", import.meta.url));

for (const size of [192, 512]) {
  const outPath = fileURLToPath(new URL(`../public/icon-${size}.png`, import.meta.url));
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(outPath);
  console.log(`wrote icon-${size}.png`);
}
