import { FlatCompat } from "@eslint/eslintrc";
import pluginJs from "@eslint/js";
import pluginImport from "eslint-plugin-import";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    ignores: [
      ".github/",
      ".husky/",
      "node_modules/",
      ".next/",
      "src/components/ui",
      "*.config.ts",
      "*.mjs",
    ],
    languageOptions: {
      globals: globals.browser,
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      import: pluginImport,
      prettier,
      react: pluginReact,
    },
    rules: {
      // ✅ Prettier
      "prettier/prettier": "warn",

      // ✅ Import tartibi
      // "import/order": [
      //   "error",
      //   {
      //     groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
      //     pathGroups: [
      //       { pattern: "react", group: "external", position: "before" },
      //       { pattern: "{next,next/**}", group: "external", position: "before" },
      //     ],
      //     "newlines-between": "always",
      //     alphabetize: { order: "asc", caseInsensitive: true },
      //   },
      // ],
      // "import/newline-after-import": "error",
      "no-duplicate-imports": ["error", { includeExports: true }],

      // ✅ React
      "react/jsx-no-useless-fragment": ["warn", { allowExpressions: true }],
      "react/no-array-index-key": "warn",
      "react/no-unstable-nested-components": ["warn", { allowAsProps: true }],

      // ✅ TypeScript
      // "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn"],
      // "@typescript-eslint/prefer-nullish-coalescing": "warn",

      // ✅ Qo‘shimcha (oddiy stil)
      "no-trailing-spaces": "error",
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 1 }],
      // "object-curly-spacing": ["error", "always"],
      // "array-bracket-spacing": ["error", "never"],
      // "space-in-parens": ["error", "never"],
    },
  },

  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  ...tseslint.configs.recommended,
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
