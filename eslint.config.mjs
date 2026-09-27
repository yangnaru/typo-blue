import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The button components, and a Tailwind text size class.
const BUTTONS =
  "/^(PlainButton|PillItem|TextButton|AlertDialogAction|AlertDialogCancel)$/";
const TEXT_SIZE = "/(^|\\s)text-(xs|sm|base|lg|[0-9]?xl)(\\s|$)/";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-plugin-react's "detect" calls context.getFilename(), which
    // ESLint 10 removed, so name the version instead.
    settings: { react: { version: "19.3" } },
  },
  {
    // Every button is PlainButton, PillItem or TextButton, all text-sm; see
    // /design. Callers may not set a text size on them or draw their own.
    files: ["**/*.tsx"],
    ignores: [
      "components/ui/**",
      "components/plain-button.tsx",
      "components/pill.tsx",
      "components/text-button.tsx",
      // Icon-only editor tools and image controls, with no text to size.
      "components/Tiptap.tsx",
      "components/ImageThumbnail.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='button']",
          message:
            "Use PlainButton, PillItem or TextButton instead of <button>; see /design.",
        },
        {
          selector:
            "JSXOpeningElement[name.name='input']:has(JSXAttribute[name.name='type'][value.value=/^(submit|button|reset)$/])",
          message:
            'Use <PlainButton type="submit"> instead of an input button; see /design.',
        },
        {
          selector: `JSXOpeningElement[name.name=${BUTTONS}] JSXAttribute[name.name='className'] Literal[value=${TEXT_SIZE}]`,
          message:
            "Buttons are all text-sm and take no text size of their own; see /design.",
        },
        {
          selector: `JSXOpeningElement[name.name=${BUTTONS}] JSXAttribute[name.name='className'] TemplateElement[value.raw=${TEXT_SIZE}]`,
          message:
            "Buttons are all text-sm and take no text size of their own; see /design.",
        },
      ],
    },
  },
  globalIgnores([".next/**", "next-env.d.ts", "drizzle/**/*.json"]),
]);
