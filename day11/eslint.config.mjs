import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Design 핸드오프 번들 — 참고용 디자인 소스일 뿐 앱 코드가 아니다.
    "prd/**",
    // 브라우저가 아니라 Node에서 손으로 돌리는 아이콘 생성기 — CommonJS라 앱 규칙(ESM)을 적용하지 않는다.
    "scripts/**",
  ]),
]);

export default eslintConfig;
