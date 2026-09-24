import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-plugin-react's "detect" calls context.getFilename(), which
    // ESLint 10 removed, so name the version instead.
    settings: { react: { version: "19.3" } },
  },
  globalIgnores([".next/**", "next-env.d.ts", "drizzle/**/*.json"]),
]);
