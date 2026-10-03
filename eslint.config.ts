import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
export default [
  { ignores: ["node_modules/**", "data/**", "backups/**", "dist/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
];
