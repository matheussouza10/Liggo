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
    // Browser and unit test scripts (plain scripts, not app code).
    "e2e/**",
    "unit/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Tooling folders (skills and design review artifacts), not app code.
    ".claude/**",
    ".agents/**",
    ".impeccable/**",
  ]),
]);

export default eslintConfig;
