---
paths:
  - "**/*.test.ts"
  - "vitest.config.ts"
  - "eslint.config.mjs"
  - "tsconfig.json"
  - "tools/eslint/**"
  - "tools/parity/**"
  - "src/shared/services/Temps.ts"
  - "src/shared/services/TimeMockService.ts"
  - ".github/workflows/verifier.yml"
---
# Tests et portes de qualité

## Portes
- Portes : section Commandes de CLAUDE.md ; si une dépendance de plateforme bouge, ajouter `npx expo-doctor@latest` à l'export des deux plateformes.
- `strict: false` est écrit dans `tsconfig.json` parce que TypeScript 6 le passerait à vrai (200+ erreurs de props non typées, chantier dédié) ; dans une classe, `this.context` se lit par un accesseur privé. La console et les modules `src/shared` qu'elle importe compilent en `strict`.
- Pousser sur `main` n'est accepté que si le commit a déjà passé `verifier.yml` ailleurs (protection sans PR obligatoire, posée dans les réglages GitHub).

## Ce qui se teste
- Test unitaire (vitest, `*.test.ts` colocalisé) de la logique UKit indépendante de la plateforme ; aucun test d'écran ni de composant, la vérification manuelle reste la porte principale. Séparer la logique pure de tout import React Native, AsyncStorage, expo-constants ; le seul alias de `vitest.config.ts` ouvre le registre de livraison d'`@aetherius/react-native` (`dist/delivery`), n'en ajouter aucun autre : un test qui ne se lance plus signale que la frontière testable a été franchie.
- Ne pas retirer `env: { TZ: 'Europe/Paris' }` de `vitest.config.ts` : l'heure d'été d'un `DTSTART` UTC ne se verrouille que dans un fuseau donné, sinon le test passe à Bordeaux et échoue ailleurs.
- Chaque copie d'une règle a son test de non-dérive : barèmes `no-style-literals` ↔ `tokens.ts`, copie Deno `notifier/regles.ts` ↔ `shared/ciblage`, `socle.ts` ↔ `etablissements.sql`, `EVENEMENTS` ↔ migration ↔ `schema.sql`, pdfjs ↔ paquet. Un côté oublié perd des données en silence.
- Un test de correctif doit ÉCHOUER sur l'ancienne implémentation ; un test qui fournit à la main ce que le chemin réel calcule décrit la fonction, pas l'écran.
- Parité (`npm run parity`, prime sur les réponses enregistrées de la règle globale `tests`, décision `parite-source-reelle`) : rejoue chaque Blueprint sous Node sur la VRAIE source et compare la donnée transformée par l'application, projection couvrant tous les champs lus par les écrans, champ exclu par un commentaire qui dit pourquoi ; ne jamais importer le service vérifié ; rien qui dépende de l'instant ; jamais d'identifiants réels. Un cas rouge peut être une panne de la source (ADE coupé du 25 au 28 août) : ne pas « réparer » en déplaçant les dates.

## Heure, réseau, simulation
- Les fonctions pures reçoivent l'heure en paramètre. La simulation temporelle du menu flottant ne déplace que `moment.now` ; horloge réelle pour notifications, horodatages de cache et traces.
- Dégrader une source en cassant le Blueprint (hôte `.invalid`, `expect` impossible). L'interrupteur HORS LIGNE du menu de développement ne coupe ni le client Supabase (`SUPABASE_URL=https://127.0.0.1:1` puis `npx expo start -c`) ni les portails (`https://127.0.0.1:1/`, car `.invalid` donne `engine`).
- Simuler l'étudiant neuf par la « Réinitialisation complète » du menu de développement (pas celle des Réglages) ; fermer le menu remet heure et réseau réels. Le panneau Blueprints ne joue jamais un Blueprint à secrets.
- Vérification manuelle : chaque lot sur les deux appareils du parc avant le suivant ; une source distante se joue aussi injoignable APRÈS le lancement, pas seulement au démarrage.
- Mesurer avant d'affirmer : effacer la session avant chaque essai, un outil de diagnostic consigne chaque étape et non le seul verdict, une explication plausible n'est pas une cause.
