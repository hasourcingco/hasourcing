import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
export default defineConfig([
  ...next,
  ...ts,
  globalIgnores([
    ".next/**",
    ".artifacts/**",
    "node_modules/**",
    "next-env.d.ts",
    "scripts/local-db.cjs",
    "playwright-report/**",
    "test-results/**",
    ".local-db/**",
    ".pnpm-store/**",
    "storage/**",
    "public/**",
  ]),
]);
