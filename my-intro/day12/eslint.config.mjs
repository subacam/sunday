import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Design 핸드오프 번들 — 참고용 디자인 소스일 뿐 앱 코드가 아니다.
    "prd/**",
  ]),
]);

export default eslintConfig;
