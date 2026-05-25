import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      // Règles d'archi du projet UKit.
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }],
      "max-depth": ["warn", 4],
      "complexity": ["warn", 15],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];