// day11 PWA 아이콘 생성기 — `cd day11 && node scripts/build-icons.js`.
// sharp는 next의 전이 의존성이라 node_modules에 이미 있다(package.json 직접 의존은 아님).
// 발바닥 도형은 src/components/PawIcon.tsx와 같은 좌표를 공유한다 — 한쪽을 고치면 다른 쪽도 고칠 것.
const fs = require("fs");
const sharp = require("sharp");

// Cat Paw Icon 디자인의 PWA 절: 배경 #e8927c + 흰 발자국.
// "any"는 미리보기의 112/180 ≈ 62%, maskable은 그 72%(원형 크롭 안에 들어오게).
const PAW = `
    <ellipse cx="18" cy="42" rx="10" ry="12.5" transform="rotate(-22 18 42)"/>
    <ellipse cx="38.5" cy="27" rx="10.5" ry="13" transform="rotate(-8 38.5 27)"/>
    <ellipse cx="61.5" cy="27" rx="10.5" ry="13" transform="rotate(8 61.5 27)"/>
    <ellipse cx="82" cy="42" rx="10" ry="12.5" transform="rotate(22 82 42)"/>
    <path d="M50 46C62 46 78 60 82 72C85 82 76 89 66 88C58 87.2 42 87.2 34 88C24 89 15 82 18 72C22 60 38 46 50 46Z"/>`;

function tile({ scale, radius }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${radius}" fill="#E8927C"/>
  <g transform="translate(50,50) scale(${scale}) translate(-50,-50)" fill="#fff">${PAW}
  </g>
</svg>
`;
}

const any = tile({ scale: 0.62, radius: 22 });
// maskable은 런처가 원형/스쿼클로 잘라내므로 모서리를 둥글리지 않고 꽉 채운다.
const maskable = tile({ scale: 0.45, radius: 0 });

fs.writeFileSync("public/icon.svg", any);

const jobs = [
  ["public/icon-192.png", any, 192],
  ["public/icon-512.png", any, 512],
  ["public/icon-maskable-512.png", maskable, 512],
];

Promise.all(
  jobs.map(([out, svg, size]) =>
    sharp(Buffer.from(svg)).resize(size, size).png().toFile(out).then((i) => console.log(out, size, i.size + "B"))
  )
).catch((e) => {
  console.error(e);
  process.exit(1);
});
