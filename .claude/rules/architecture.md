---
paths:
  - "src/**/services/**"
  - "src/shared/services/**"
  - "src/shared/navigation/rootContainer.tsx"
  - "App.tsx"
  - "tsconfig.json"
---
# Architecture du code

- Découpage par domaine de navigation ; seul le partagé va dans `shared/`. On partage un composant quand le dupliquer créerait DEUX chemins vers le même état persistant (le trousseau) ; toute autre dépendance entre features passe par `shared/` ou la navigation.
- Un service ne connaît ni React ni la navigation, renvoie des structures applicatives (jamais la réponse brute), les déclare lui-même (contrats de données) et garde cache, conversions, calcul et traduction de l'échec en écran. Un composant qui charge ses données est un mauvais découpage, sauf les sections du tableau de bord Campus ; une classe existante se réécrit avec la refonte de son écran, pas avant.
- Démarrage : `loadSettings()` AVANT les `loadData()` des managers (`App.tsx`), cache servi, rafraîchissement non attendu (un splash est resté figé 40 s quand le relais Celcat répondait 522). Rendre depuis le cache est un chantier à part.
- Contexte React pour le rendu, managers singletons pour la persistance et le hors-React. `SettingsManager.notify` persiste sauf pendant `loadSettings` (sinon il écrasait les favoris) ; `PlanningDataManager` écrit la liste de groupes dans `setGroupList`, pas dans `notify`.
- Caches : planning réseau d'abord avec repli sans expiration et bandeau daté ; temps réel (CROUS, affluence, BU) sans cache (une donnée périmée envoie devant une porte fermée) ; calendriers du téléphone jamais en cache. Relire avant de « corriger ».
- Migration de clé de stockage : écrire la nouvelle AVANT de supprimer l'ancienne.
- Une règle écrite en deux endroits finit en bug : factoriser ; un repli qui ne se déclenche jamais masque le défaut qu'il prétend couvrir : le retirer.
- Seuils ESLint dans `eslint.config.mjs` (le 400 lignes est transitoire, voir CLAUDE.md) ; une désactivation locale porte sa justification écrite. Commentaires en français ; séparateurs `// ── X ──` conservés dans les fichiers qui en usent. Journalisation : `console.warn` pour une anomalie rattrapée, `console.error` pour un échec qui laisse l'utilisateur sans donnée, debug sous `__DEV__`.
- Nommage : composant PascalCase `.tsx`, service PascalCase suffixé `Service`, hook camelCase préfixé `use`, écran suffixé `Screen`, clé de traduction SCREAMING_SNAKE_CASE.
