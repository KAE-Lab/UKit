# Qualité et vérification

Ce document décrit ce qui garde le code sain aujourd'hui, comment vérifier un changement, et ce qui
manque. La discipline de contribution qui s'appuie dessus est dans
[CONTRIBUTING.md](../CONTRIBUTING.md).

## Les portes automatiques

À jouer avant toute demande de fusion :

```bash
npx tsc --noEmit      # typage
npx eslint .          # règles d'architecture et de style
npm test              # tests unitaires du socle Aetherius
npm run parity        # sources migrées vers un Blueprint
```

### Base de référence

Les deux premières commandes ne sont pas encore vertes. L'état actuel du dépôt, à connaître pour
distinguer une régression d'un héritage :

| Commande | État | Détail |
|---|---|---|
| `npx tsc --noEmit` | **3 erreurs** | `TS2612` sur la propriété `context` de trois composants à classe : [`CourseScreen.tsx`](../src/features/Planning/screens/CourseScreen.tsx), [`GroupSelectionScreen.tsx`](../src/features/Planning/screens/GroupSelectionScreen.tsx), [`DayView.tsx`](../src/features/Planning/views/DayView.tsx) |
| `npx eslint .` | **0 erreur, 11 warnings** | tous `no-explicit-any`, dans `CampusListLayout.tsx` (3), `ScheduleList.tsx` (3), `Button.tsx` (4), `GroupSelectionScreen.tsx` (1) |

La règle de contribution est donc : **ne pas augmenter ces compteurs**, et les réduire quand on
travaille dans un fichier concerné.

### Les tests unitaires

Introduits par le jalon [6-A](phase-6/6-a-socle.md) : `npm test` joue [vitest](https://vitest.dev)
sur les fichiers `*.test.ts` colocalisés au module qu'ils couvrent. Ils doivent être verts.

Le critère n'est pas un dossier, c'est une propriété : **est testé ce qui porte de la logique UKit et
ne dépend d'aucune plateforme.** Le jalon 6-A avait borné le harnais à
[`src/shared/aetherius/`](../src/shared/aetherius/) ; le jalon [6-B](phase-6/6-b-supabase.md) l'a
étendu, parce que la règle vaut mieux que le dossier.

| Module | Ce qui est couvert |
|---|---|
| [`shared/aetherius/secrets.ts`](../src/shared/aetherius/secrets.ts) | la projection du trousseau vers les noms de secrets |
| [`shared/aetherius/delivery.ts`](../src/shared/aetherius/delivery.ts) | la résolution socle/surcouche, « ne touche jamais au réseau », les neuf gardes, les trois interrupteurs d'arrêt et — depuis [6-G](phase-6/6-g-etablissements.md) — **la porte d'ajout** : préfixe réservé, périmètre de secrets, purge quand on retire la capacité |
| [`shared/aetherius/failures.ts`](../src/shared/aetherius/failures.ts) | la table du modèle d'erreur du moteur |
| [`shared/supabase/failures.ts`](../src/shared/supabase/failures.ts) | la table d'erreurs de la base — dont « une clé fausse n'est pas `config` » |
| [`features/Campus/services/BdeMapping.ts`](../src/features/Campus/services/BdeMapping.ts) | la projection des annonces et leur péremption |
| [`features/Campus/services/CrousMapping.ts`](../src/features/Campus/services/CrousMapping.ts) | la date du fournisseur, les horaires servis en chaîne JSON, le regroupement midi/soir |
| [`features/Campus/services/LibraryMapping.ts`](../src/features/Campus/services/LibraryMapping.ts) | l'arité d'une extraction, le choix du visuel, un site fermé sans taux |
| [`shared/locations/referentiel.ts`](../src/shared/locations/referentiel.ts) | la fusion champ par champ du socle et de la surcouche |
| [`shared/etablissements/catalogue.ts`](../src/shared/etablissements/catalogue.ts) | une ligne qui **remplace** au lieu de fusionner, le socle qui ne disparaît jamais, l'ordre stable, le repli d'un code inconnu |
| [`features/Planning/services/PlanningApiMapping.ts`](../src/features/Planning/services/PlanningApiMapping.ts) | l'arité de `modules`, le séparateur qui change avec la vue, une fin d'événement nulle, le tri double |
| [`features/Campus/services/CampusApiMapping.ts`](../src/features/Campus/services/CampusApiMapping.ts) | la correspondance textuelle salle vers bâtiment, la détection des vacances, le refiltrage sur la date |
| [`features/Scolarite/services/ScolariteMapping.ts`](../src/features/Scolarite/services/ScolariteMapping.ts) | la casse de l'identité criée par la source, le compteur `null` contre `0`, la table des échecs nommés |

`BdeMapping` a été le premier module **de feature** couvert, et il l'est pour une raison précise :
c'est là qu'une erreur ne se voit pas. Un champ omis rend une fiche incomplète sans rien casser, et
une date mal traitée fait disparaître du contenu publié — c'est arrivé, et le test existe parce que
le correctif existe.

Les trois modules ajoutés au jalon [6-D](phase-6/6-d-campus.md) sont là pour la même raison, et
chacun verrouille un défaut **mesuré** plutôt qu'imaginé : une date absente qui vidait un menu entier,
des horaires devenus invisibles parce que la source a changé de forme, une extraction qui rend `20` et
non `[20]`, et une colonne nulle qui pourrait effacer une coordonnée embarquée. Aucun des quatre ne
se voit à la relecture.

Les deux du jalon [6-E](phase-6/6-e-planning.md) suivent la même règle, sur la source la plus critique
de l'application. Deux d'entre eux valent d'être connus avant de « simplifier » quoi que ce soit :
`moment(null)` est une date **invalide** là où `moment(undefined)` vaut *maintenant* — une salle
occupée à l'heure où l'écran s'ouvre — et la vue semaine rend une description **vide**, ce qui est le
comportement d'origine et non un défaut de la migration
([features/planning.md](features/planning.md#limites-connues)).

Ce qui n'y est **pas** : les façades et les clients (`aetherius/client.ts`,
`aetherius/registry.ts`, `supabase/client.ts`, `runBlueprint`), qui importent React Native,
`AsyncStorage` ou `expo-constants` et ne sont pas jouables hors appareil. C'est aussi ce qui explique
la forme de ces modules — le code testable est systématiquement séparé du code de plateforme, et un
fichier de test qui cesse de se lancer est le signal que la frontière a été franchie.

Aucun écran, aucun composant : le dépôt n'a pas de harnais de rendu, et la vérification manuelle sur
appareil reste la porte principale.

> **Pourquoi vitest et non le lanceur de Node.** `package.json` n'a pas `"type": "module"` — et ne
> peut pas l'avoir, `babel.config.js` et `commitlint.config.js` étant en CommonJS. Tout `.ts` est
> donc chargé en CommonJS par les transpileurs à la volée, et un module CommonJS ne peut pas
> `require()` `@aetherius/engine`, publié en ESM pur. `vitest` résout la condition `import` quel que
> soit le format du projet.

### Le seul réglage de vitest, et pourquoi il existe

[`vitest.config.ts`](../vitest.config.ts) ne porte qu'un alias, introduit par le jalon
[6-C](phase-6/6-c-livraison.md). `BlueprintRegistry` — tout le mécanisme de livraison — est publié
dans `@aetherius/react-native`, dont la **racine** monte une WebView : sous Node, l'import échoue
avant la première ligne de test. Le sous-module qui porte le registre, lui, n'importe que le moteur
et `globalThis.setTimeout` ; il ne dépend d'aucune plateforme, le paquet ne l'expose simplement pas
en sous-chemin. L'alias le résout directement, **sous test uniquement**.

Sans lui, les neuf gardes du registre ne seraient vérifiables qu'en publiant neuf manifestes cassés
en production. Ce qu'il ne couvre pas, et qu'il ne faut pas essayer de lui faire couvrir : un module
qui importe autre chose du paquet reste injouable hors appareil, et c'est toujours le bon signal.

### La parité

[`tools/parity/`](../tools/parity/README.md), introduit par la [Phase 6](phase-6/README.md), rejoue
chaque [Blueprint](blueprints.md) sous Node et compare sa sortie à celle du service historique, sur
la **vraie** source. C'est la seule porte de ce dépôt qui vérifie un comportement plutôt qu'une
forme, et c'est ce qui autorise à retirer un repli.

Ce qu'elle ne couvre pas, et qui reste de la vérification manuelle : la WebView, le cache, la
concurrence et l'affichage. Un cas de parité vert et un écran cassé sont parfaitement compatibles.

Un cas peut aussi échouer parce que la source est en panne. C'est une information, pas un faux
positif — c'est même la seule façon d'apprendre qu'une source a changé avant que les utilisateurs ne
le fassent.

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

C'est **le filet de sécurité principal** : les tests automatiques ne couvrent que le socle Aetherius
et la parité des sources migrées. Une contribution n'est pas terminée tant que le parcours n'a pas
été joué sur l'application réelle.

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
[`TimeMockService.ts`](../src/shared/services/TimeMockService.ts) qui porte la logique. Il s'ouvre
par **sept tapes sur le numéro de version** de l'écran À propos, et porte deux onglets : *Temps*, et
*Blueprints* — le diagnostic de la livraison, décrit dans
[blueprints.md](blueprints.md#quand-une-correction--narrive-pas-).

L'onglet *Temps* porte deux simulations indépendantes : l'heure, et le **réseau**.

Ses libellés sont volontairement **hors des dictionnaires** : ce n'est pas une capacité utilisateur,
et lui ouvrir les trois traductions ferait porter à l'internationalisation un écran que personne
n'ouvre par hasard.

Fonctionnement de la simulation temporelle :

- `setFakeTime(date)` calcule un décalage entre la date voulue et l'heure réelle, puis **remplace
  `moment.now`** par une fonction qui applique ce décalage. Tout le code qui date via `moment()` voit
  donc l'heure simulée — et c'est la raison pour laquelle **le code applicatif date par `moment()` et
  jamais par `new Date()`**. Un `new Date()` échappe au décalage, ce qui donnait une simulation à
  moitié appliquée : jusqu'au jalon [6-E](phase-6/6-e-planning.md), simuler un jour de cours ne
  rouvrait pas un bâtiment, parce que les salles libres lisaient l'heure par l'autre chemin. Les
  seuls `new Date()` légitimes sont ceux du menu lui-même et les dates passées au calendrier système.
- Les caches d'emploi du temps (`@Week…` et `@YYYY/MM/DD`) sont purgés à chaque changement, pour que
  les vues rechargent la bonne date.
- L'événement `timeMockChanged` est diffusé via `DeviceEventEmitter` ; `DayView` s'y abonne pour
  régénérer ses listes de jours et de semaines, et `ModMenu` pour rafraîchir son horloge.
- Les notifications planifiées sont **retraduites en temps réel** : `computeRealTriggerTime` retire le
  décalage pour que l'OS déclenche l'alerte au bon moment réel, avec un plancher de 2 s si le calcul
  tombe dans le passé. Un message de retour indique dans combien de secondes réelles la première
  notification arrivera.

> **Capture attendue** — `modmenu.png` : le menu de simulation déployé, horloge simulée, interrupteur
> hors ligne et sélecteurs de date visibles.

## Couper le réseau sans couper l'appareil

Le mode avion est la façon évidente de vérifier un chemin hors ligne, et c'est une mauvaise façon :
il coupe **aussi Metro**, donc la session de développement, donc la possibilité de recharger pour
essayer autre chose. En pratique, on finit par ne pas tester le chemin dégradé — celui qui décide de
l'expérience réelle.

L'interrupteur **HORS LIGNE** de l'onglet *Temps*
([`NetworkMockService.ts`](../src/shared/services/NetworkMockService.ts)) coupe le réseau de
l'**application** seulement. Il fait deux choses, et il faut les deux :

| Ce qu'il coupe | Ce que ça déclenche |
|---|---|
| `isConnected()` rend `false` | la branche « pas de connexion » des écrans qui la consultent : le planning, la recherche de groupes |
| le `fetch` du moteur échoue | tout run part en famille `unavailable` — sans ce volet, les écrans Campus ne verraient rien, ils ne consultent pas `NetInfo` |

Ce qu'il **ne couvre pas**, et qu'il faut savoir avant de conclure : la WebView de l'Act II, qui
navigue par elle-même et ne passe pas par ce `fetch`. La scolarité est dans ce cas depuis le jalon
[6-F](phase-6/6-f-scolarite.md), et son chemin dégradé se vérifie donc par la seconde méthode
ci-dessous — pointer une `vars` d'hôte sur une adresse injoignable, puis recharger.

> **Une source injoignable ne produit pas `unavailable` sur un appareil**, contrairement à ce que
> laisse attendre le modèle d'erreur. Mesuré sur iPhone au jalon 6-F, et il y a **deux** cas :
> une adresse qui **refuse la connexion** (`https://127.0.0.1:1/`) fait rendre à iOS sa propre page
> d'erreur, dans laquelle l'agent s'injecte et s'annonce — la navigation « réussit » donc, et c'est
> l'attente suivante qui échoue, avec le nom que le Blueprint lui a donné (`blocked`) ; un nom qui
> **ne résout pas** (`.invalid`) ne produit aucun document, et le run retombe en `engine`,
> c'est-à-dire « un problème de notre côté » affiché à quelqu'un dont la source est simplement
> morte. Préférer `https://127.0.0.1:1/` pour sonder : l'échec y est **nommé**, donc lisible.
> La limite est celle du moteur ; côté application, la scolarité la corrige en rendant ses codes de
> service absent explicitement réessayables
> ([features/scolarite.md](features/scolarite.md#limites-connues)).

Fermer le menu remet le réseau **et** l'heure à leur état réel : une simulation qu'on oublie active
est un faux bug qu'on cherchera longtemps. La pastille de l'icône réduite reste allumée tant que l'une
des deux tourne, pour la même raison.

Deux autres façons de dégrader une source, complémentaires plutôt que redondantes :

- **casser le Blueprint embarqué** — `vars.domaine` sur un hôte injoignable, `expect.status` sur une
  valeur impossible, une constante de protocole absurde — puis recharger Metro. C'est ce qui distingue
  les familles `unavailable`, `rejected` et `data` les unes des autres ; l'interrupteur, lui, ne
  produit que la première ;
- **`SUPABASE_URL` sur un hôte `.invalid`**, pour la base de publication, qui a son propre modèle
  d'erreur ([backend.md](backend.md)).

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

- **La couverture de test est étroite** : elle s'arrête au socle Aetherius. Ni composant, ni écran,
  ni bout en bout — la vérification manuelle sur l'application réelle reste la porte principale.
- **Aucune vérification en intégration continue.** Un code qui ne compile pas peut être fusionné.
- **La base de référence n'est pas verte** (3 erreurs de typage), ce qui rend la lecture d'un
  résultat de `tsc` moins immédiate : il faut comparer aux trois erreurs connues.
- **Le menu de simulation est présent en production.** `ModMenu` n'est pas gardé par `__DEV__` ; il
  est simplement invisible tant qu'il n'est pas activé.
