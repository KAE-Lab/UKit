# Qualité et vérification

Ce document décrit ce qui garde le code sain aujourd'hui, comment vérifier un changement, et ce qui
manque. La discipline de contribution qui s'appuie dessus est dans
[CONTRIBUTING.md](../CONTRIBUTING.md).

## Les portes automatiques

Deux commandes, à jouer avant toute demande de fusion :

```bash
npx tsc --noEmit      # typage
npx eslint .          # règles d'architecture et de style
```

### Base de référence

Ces deux commandes ne sont pas encore vertes. L'état actuel du dépôt, à connaître pour distinguer une
régression d'un héritage :

| Commande | État | Détail |
|---|---|---|
| `npx tsc --noEmit` | **3 erreurs** | `TS2612` sur la propriété `context` de trois composants à classe : [`CourseScreen.tsx`](../src/features/Planning/screens/CourseScreen.tsx), [`GroupSelectionScreen.tsx`](../src/features/Planning/screens/GroupSelectionScreen.tsx), [`DayView.tsx`](../src/features/Planning/views/DayView.tsx) |
| `npx eslint .` | **0 erreur, 11 warnings** | tous `no-explicit-any`, dans `CampusListLayout.tsx` (3), `ScheduleList.tsx` (3), `Button.tsx` (4), `GroupSelectionScreen.tsx` (1) |

La règle de contribution est donc : **ne pas augmenter ces compteurs**, et les réduire quand on
travaille dans un fichier concerné.

### Ce que vérifient les règles ESLint

[`eslint.config.mjs`](../eslint.config.mjs) ne configure volontairement que cinq règles. Ce ne sont pas
des règles de style — le style est laissé libre — mais des **garde-fous d'architecture** :

| Règle | Seuil | Ce qu'elle protège |
|---|---|---|
| `max-lines` | 400 | un fichier trop long est un module qui n'a pas été découpé |
| `max-lines-per-function` | 100 | une fonction trop longue mélange plusieurs responsabilités |
| `max-depth` | 4 | l'imbrication profonde signale une logique à extraire |
| `complexity` | 15 | la complexité cyclomatique signale un branchement à simplifier |
| `@typescript-eslint/no-explicit-any` | warn | le typage se perd un `any` à la fois |

Les quatre premières sont en `warn` : elles ne bloquent pas, elles alertent. Un dépassement justifié
se documente par une désactivation locale et commentée — comme
[`Theme.ts`](../src/shared/theme/Theme.ts) (`eslint-disable max-lines`, fichier de données de style)
ou [`CampusListLayout.tsx`](../src/features/Campus/components/CampusListLayout.tsx)
(`eslint-disable-next-line complexity`, composant générique à nombreuses options).

### Typage

[`tsconfig.json`](../tsconfig.json) étend `expo/tsconfig.base` **sans activer `strict`**. Le
compilateur ne réclame donc ni annotations de retour, ni gestion de `null`. La rigueur de typage du
projet tient à la discipline et à la revue, pas au compilateur : c'est une raison de plus de ne pas
laisser passer un `any`.

## Commits

Les messages sont vérifiés à l'écriture par un hook `commit-msg`
([`.husky/commit-msg`](../.husky/commit-msg)) qui appelle `commitlint` avec la configuration
`@commitlint/config-conventional` ([`commitlint.config.js`](../commitlint.config.js)). Un message hors
convention est refusé localement — il n'y a pas de rattrapage côté CI.

`npm run commit` ouvre l'assistant Commitizen si l'on préfère être guidé.

## Vérification manuelle

C'est aujourd'hui **le seul filet de sécurité fonctionnel** : il n'y a pas de test automatisé. Une
contribution n'est pas terminée tant que le parcours n'a pas été joué sur l'application réelle.

```bash
npm install
npx expo start        # puis a pour Android, i pour iOS, ou scan du QR avec Expo Go
```

Chaque documentation de feature porte une section **« Vérifier »** décrivant le parcours attendu. Au
minimum, pour tout changement touchant une source distante, jouer aussi le chemin dégradé :

- **hors ligne** — mode avion : le planning doit servir le cache daté, les écrans Campus un état vide
  explicite ;
- **source injoignable** — couper le réseau après le lancement puis naviguer : aucun plantage ;
- **réponse vide** — un groupe sans cours, un restaurant sans menu du jour, une BU fermée.

Un échec propre et explicable est un résultat valide. Un comportement surprenant est un correctif à
faire, ou une limite à écrire dans la doc concernée avant de clore.

## Outillage de simulation temporelle

Beaucoup de comportements dépendent de l'heure : notifications de cours, salles libres, menu du jour,
horaires de BU, jour sélectionné dans le planning. Les attendre en temps réel n'est pas praticable.

Le projet embarque donc un **menu de développement flottant** :
[`ModMenu.tsx`](../src/shared/ui/ModMenu.tsx), monté en permanence par
[`rootContainer.tsx`](../src/shared/navigation/rootContainer.tsx), et
[`TimeMockService.ts`](../src/shared/services/TimeMockService.ts) qui porte la logique.

Fonctionnement :

- `setFakeTime(date)` calcule un décalage entre la date voulue et l'heure réelle, puis **remplace
  `moment.now`** par une fonction qui applique ce décalage. Tout le code qui date via `moment()` voit
  donc l'heure simulée.
- Les caches d'emploi du temps (`@Week…` et `@YYYY/MM/DD`) sont purgés à chaque changement, pour que
  les vues rechargent la bonne date.
- L'événement `timeMockChanged` est diffusé via `DeviceEventEmitter` ; `DayView` s'y abonne pour
  régénérer ses listes de jours et de semaines, et `ModMenu` pour rafraîchir son horloge.
- Les notifications planifiées sont **retraduites en temps réel** : `computeRealTriggerTime` retire le
  décalage pour que l'OS déclenche l'alerte au bon moment réel, avec un plancher de 2 s si le calcul
  tombe dans le passé. Un message de retour indique dans combien de secondes réelles la première
  notification arrivera.

> **Capture attendue** — `modmenu.png` : le menu de simulation déployé, horloge simulée et sélecteurs
> de date visibles.

Important : `Date.now()` n'est **pas** modifié, seul `moment.now` l'est. Un code qui date via
`new Date()` continue de voir l'heure réelle. C'est le cas de
[`useFreeRoomsData.ts`](../src/features/Campus/FreeRoom/hooks/useFreeRoomsData.ts), qui utilise
`new Date().getDay()` et `new Date().getHours()` : les salles libres ne suivent que partiellement la
simulation.

## Intégration continue

Un seul workflow, [`.github/workflows/release.yml`](../.github/workflows/release.yml), déclenché par
un tag `v*` ou manuellement. Il **construit et publie** ; il ne vérifie rien. Voir
[plateforme.md](plateforme.md).

Conséquence directe : `npx tsc --noEmit` et `npx eslint .` doivent être joués **en local**, aucune
barrière ne les rejouera.

## Limites connues

- **Aucun test automatisé** dans le dépôt : ni unitaire, ni composant, ni bout en bout. Aucun
  harnais n'est configuré.
- **Aucune vérification en intégration continue.** Un code qui ne compile pas peut être fusionné.
- **La base de référence n'est pas verte** (3 erreurs de typage), ce qui rend la lecture d'un
  résultat de `tsc` moins immédiate : il faut comparer aux trois erreurs connues.
- **Le menu de simulation est présent en production.** `ModMenu` n'est pas gardé par `__DEV__` ; il
  est simplement invisible tant qu'il n'est pas activé.
