import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/domains/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/app/*"], message: "Domain layer must not import app layer" },
          { group: ["@/lib/supabase/*"], message: "Domain layer must not depend on infrastructure; use infrastructure adapters" }
        ]
      }]
    }
  }
];

export default eslintConfig;

