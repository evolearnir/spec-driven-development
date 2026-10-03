import js from "@eslint/js";
import globals from "globals";
export default [
  { ignores: ["node_modules/**", "data/**", "backups/**"] },
  js.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
];
