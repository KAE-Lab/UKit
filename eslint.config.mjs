import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

import ukitPlugin from "./tools/eslint/no-style-literals.mjs";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "ukit": ukitPlugin,
    },
    rules: {
      // Règles d'archi du projet UKit.
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }],
      "max-depth": ["warn", 4],
      "complexity": ["warn", 15],
      "@typescript-eslint/no-explicit-any": "warn",

      // Le code mort est la dette la plus coûteuse pour qui reprend le dépôt sans contexte : un
      // import inutilisé fait croire à une dépendance, un composant jamais monté fait croire à une
      // capacité. Le dépôt en portait 65 occurrences au 2026-08-16 ; il n'en porte plus.
      // `args: "none"` : une signature de callback garde ses paramètres même inutilisés, c'est sa
      // documentation. `caughtErrors: "all"` : un `catch (e)` qui n'utilise pas `e` s'écrit `catch {`.
      "@typescript-eslint/no-unused-vars": ["warn", {
        args: "none",
        caughtErrors: "all",
        varsIgnorePattern: "^React$",
      }],

      // La seule règle de style, et elle n'y est pas par gout : la consigne « aucune valeur de style
      // en dur » existait dans le README et n'était appliquée par rien. En `warn` comme les autres —
      // passer en `error` bloquerait sur du code que la refonte visuelle n'a pas encore repris
      // (docs/phase-6/6-k-socle-visuel.md).
      "ukit/no-style-literals": "warn",
    },
  },
  {
    // Trois exemptions, et chacune a sa raison :
    //  - `tokens.ts` et `Theme.ts` **sont** la source des valeurs : leurs littéraux sont leur
    //    raison d'être ;
    //  - `app.config.ts` est de la configuration de build (écran de démarrage, barre de statut
    //    Android) lue par Expo avant que l'application existe : le thème n'y est pas atteignable,
    //    et la limite est écrite dans docs/theme.md ;
    //  - les tests portent des valeurs de fixture, pas du style.
    files: [
      "src/shared/theme/Theme.ts",
      "src/shared/theme/tokens.ts",
      "app.config.ts",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    rules: {
      "ukit/no-style-literals": "off",
    },
  },
];
