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

`tsc` et `npm test` sont verts. `eslint` n'a aucune erreur, mais porte des avertissements — l'état
actuel du dépôt, à connaître pour distinguer une régression d'un héritage :

| Commande | État | Détail |
|---|---|---|
| `npx tsc --noEmit` | **verte** | zéro erreur depuis le 2026-08-16 — voir ci-dessous pour les trois `TS2612` historiques |
| `npx eslint .` | **0 erreur, 0 warning** | zéro depuis la passe de code [6.1-C](phase-6/6-1-c-passe-de-code.md), le 2026-09-03 — 35 avertissements traités un par un |

La règle de contribution est donc : **zéro, et on y reste**. Un avertissement nouveau se corrige, ou se
désactive localement avec sa justification écrite — les deux formes existent dans le dépôt, et la
seconde n'est pas un contournement quand la règle est fausse à cet endroit.

**Comment les 35 derniers sont partis** (6.1-C), parce que la méthode vaut pour le prochain. Les onze
`no-explicit-any` : deux sont morts avec `WelcomeButton`, trois tenaient à `Animated.FlatList` qui perd
le générique de la liste (typée comme une `FlatList` ordinaire, puisque seul le défilement est animé),
trois au typage de `CourseManager` sur `Record<string, unknown>` (un type structurel `CoursAvecUE` les
a rendus inutiles), un à `Animated.SectionList` (le cast était superflu), et deux restent **désactivés
avec leur raison** : les styles composés de `Theme.ts` ne sont pas typés (G8, session à part en 6.2).
Les vingt-quatre `ukit/no-style-literals` : les couleurs sont passées au thème ou aux tokens
(`theme.danger`, `style.colors.white`, `tokens.shadow.*.shadowColor` pour cinq ombres écrites à la
main), quatre dégagements de l'accueil sont devenus une constante dérivée du pied flottant, une puce a
pris `radius.pill`, l'horloge du menu de développement `fontSize.title` ; les **neuf espacements hors
échelle des écrans de référence** (5, 6, 10, 1, 3, une taille de libellé d'onglet à 10) sont désactivés
localement, chacun avec la même phrase : écart mesuré à l'inventaire visuel, hors échelle assumé, la
passe ne déplace pas un pixel. C'est [6.1-E](phase-6/6-1-e-finitions-interface.md) qui arbitrera ces
pixels, pas une règle de lint.

`no-unused-vars` n'en signale **aucun** : le dépôt en portait 65 au 2026-08-16, tous supprimés le jour
même, et la règle est là pour que ça le reste.

#### `no-unused-vars`, et ce qu'elle a fait remonter

Activée le 2026-08-16 après un nettoyage complet : 65 variables et imports morts dans 31 fichiers,
dont 17 dans le seul `WebBrowserScreen`. Le nettoyage a aussi sorti cinq **valeurs exportées que rien
n'atteignait** — `Split` (un séparateur dont le trait était un `<View />` vide), `RequestError`,
`OpenMapButton` (un fichier entier), `MyGroupButton`, et `oublierCalendrierAbonnement` — plus les
palettes `colors50` et `colors200`, deux jeux Material complets que `theme.md` gardait « par
prudence ».

Deux réglages valent d'être connus : `args: "none"`, parce qu'une signature de callback documente son
contrat même quand elle n'utilise pas tous ses paramètres ; et `caughtErrors: "all"`, qui impose
d'écrire `catch {` plutôt que `catch (e)` quand l'erreur n'est pas lue — la forme sans liaison est
transpilée par Babel et le dépôt l'utilisait déjà.

> **Un export mort n'est pas neutre.** Il fait croire à une capacité. `oublierCalendrierAbonnement`
> portait même un commentaire décrivant une protection — « appelé quand le lien change » — que
> personne n'appelait ; il a fallu vérifier que `jouerAbonnement` comparait déjà la clé de lien pour
> savoir que ce n'était pas un bug mais du code redondant. C'est le coût réel du code mort : il faut
> l'enquêter avant de pouvoir le supprimer.

#### Les trois `TS2612`, et pourquoi le correctif évident ne marche pas ici

Trois composants à classe du Planning déclaraient `context!: React.ContextType<typeof AppContext>`
pour typer le contexte fourni par `static contextType`. TypeScript signalait, à raison, que ce champ
**écrase** la propriété `context` héritée de `React.Component` au lieu de l'annoter.

Le correctif que TypeScript recommande — et que la documentation de React reprend — est le modificateur
`declare`. **Il ne compile pas dans ce projet** : la couche Flow du preset Babel de React Native le
rejette avant la couche TypeScript, et le bundle échoue. Mesuré, pas supposé — `tsc` était vert et
Metro refusait les trois fichiers. L'activer demanderait `allowDeclareFields` dans
[`babel.config.js`](../babel.config.js), c'est-à-dire modifier la chaîne de build pour trois
annotations de type.

Le champ est donc **supprimé**, et le contexte se lit par un accesseur privé `this.app` qui caste
`this.context`. Même confort de typage, zéro effet à l'exécution, aucune touche à la chaîne de build.

> **La leçon générale :** `npx tsc --noEmit` et Metro **ne partagent pas** leur couche TypeScript.
> Une syntaxe que `tsc` accepte peut faire échouer le bundle, et l'inverse. Un changement de syntaxe
> inhabituelle se vérifie donc aussi côté Babel, pas seulement au typage.

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
| [`features/Campus/services/CrousMapping.ts`](../src/features/Campus/services/CrousMapping.ts) | la date du fournisseur, les horaires servis en chaîne JSON, le regroupement midi/soir, et la **reconnaissance de la structure des horaires** — un format que la source ne déclare pas, donc le repli est la moitié qui compte |
| [`features/Campus/services/LibraryMapping.ts`](../src/features/Campus/services/LibraryMapping.ts) | l'arité d'une extraction, le choix du visuel, un site fermé sans taux |
| [`shared/locations/referentiel.ts`](../src/shared/locations/referentiel.ts) | la fusion champ par champ du socle et de la surcouche |
| [`shared/etablissements/catalogue.ts`](../src/shared/etablissements/catalogue.ts) | une ligne qui **remplace** au lieu de fusionner, le socle qui ne disparaît jamais, l'ordre stable, le repli d'un code inconnu, et les trois faits du jalon 6-J — abonnement, région CROUS, reconnaissance de salle désactivée |
| [`shared/etablissements/edt.ts`](../src/shared/etablissements/edt.ts) | le choix de la source d'emploi du temps — dont « un lien est attendu » **distinct de** « il n'y en a pas » — et la résolution **partielle** des groupes favoris |
| [`shared/etablissements/lienEdt.ts`](../src/shared/etablissements/lienEdt.ts) | le cloisonnement des liens d'abonnement par établissement, et la lecture défensive du trousseau — une erreur ici ferait perdre un lien **sans rien dire** |
| [`shared/services/reglagesParEtablissement.ts`](../src/shared/services/reglagesParEtablissement.ts) | les trois formes historiques des réglages cloisonnés — une migration fausse perd les favoris de quelqu'un sans rien dire |
| [`features/Planning/services/PlanningApiMapping.ts`](../src/features/Planning/services/PlanningApiMapping.ts) | l'arité de `modules`, le séparateur qui change avec la vue, une fin d'événement nulle, le tri double |
| [`features/Planning/services/IcsMapping.ts`](../src/features/Planning/services/IcsMapping.ts) | le pliage de lignes RFC 5545, l'horodatage d'export qui change à chaque requête, l'ancre du code de module, **l'heure d'été d'un `DTSTART` en UTC**, et le **filtrage par date** d'un calendrier que la source n'a pas borné |
| [`shared/locations/salles.ts`](../src/shared/locations/salles.ts) | les séparateurs qui n'ont pas le même rôle, `A5bis` qui ne doit pas devenir `A5`, un motif publié illisible, et la reconnaissance **désactivée** — une carte fausse est pire qu'une carte vide |
| [`features/Planning/components/CourseAnnotations.ts`](../src/features/Planning/components/CourseAnnotations.ts) | l'icône déduite du contenu et non du rang, sur les deux formes de description — le défaut trouvé sur appareil au jalon 6-I |
| [`features/Planning/services/PlanningAssembly.ts`](../src/features/Planning/services/PlanningAssembly.ts) | un code d'UE contient une lettre : une année de titre ADE n'en est pas un |
| [`features/Campus/services/CampusApiMapping.ts`](../src/features/Campus/services/CampusApiMapping.ts) | la correspondance textuelle salle vers bâtiment, la détection des vacances, le refiltrage sur la date |
| [`features/Scolarite/services/ScolariteMapping.ts`](../src/features/Scolarite/services/ScolariteMapping.ts) | la casse de l'identité criée par la source, le compteur `null` contre `0`, la table des échecs nommés **et la règle des codes en `_INDISPONIBLE`** — un code inconnu ne doit plus dire « connexion interrompue » —, et — depuis le 2026-08-25 — **l'arité asymétrique des deux portails** (une lecture obligatoire rend une chaîne, une lecture bonus rend une liste) plus le **glyphe d'icône** que la source colle au libellé de la formation |
| [`features/Scolarite/widgets/presentation.ts`](../src/features/Scolarite/widgets/presentation.ts) | les six états d'une rangée, et — depuis 6.1-A — les deux mots d'une **tuile en échec** et le geste de sa feuille : ressaisie, relance, ou rien pour `engine` |
| [`shared/etablissements/socle.ts`](../src/shared/etablissements/socle.ts) · [`tools/catalogue/etablissementsSql.ts`](../tools/catalogue/etablissementsSql.ts) | le socle embarqué est **exactement** ce que la projection rend des lignes de `supabase/etablissements.sql` — lues par un petit lecteur de littéraux SQL, lui-même testé —, et tout Blueprint que le socle nomme est embarqué. Une divergence dans un sens comme dans l'autre a été vue le premier jour de la rentrée 2026 |
| [`shared/etablissements/premierRafraichissement.ts`](../src/shared/etablissements/premierRafraichissement.ts) | une réponse, un plafond, jamais les deux — le cas qui compte est une base injoignable qui répond vite |
| [`features/Scolarite/services/LecteurPdfPage.ts`](../src/features/Scolarite/services/LecteurPdfPage.ts) · [`tools/pdfjs/vendor.test.ts`](../tools/pdfjs/vendor.test.ts) | l'assemblage de la page du lecteur pdf.js — ce qui doit survivre au passage en littéral, ce qui doit lever plutôt que rendre une page blanche — et la conformité des copies vendorisées au paquet installé |
| [`tools/eslint/no-style-literals.mjs`](../tools/eslint/no-style-literals.mjs) | que la table d'échelles de la règle ESLint **n'a pas dérivé** de [`shared/theme/tokens.ts`](../src/shared/theme/tokens.ts) |
| [`features/Planning/services/groupListCache.ts`](../src/features/Planning/services/groupListCache.ts) | la politique du cache de la liste des groupes — expiration à sept jours, lecture défensive, repli daté — **figée avant** la fusion des deux caches (6.1-C) |
| [`shared/services/retourAuPremierPlan.ts`](../src/shared/services/retourAuPremierPlan.ts) | ce qu'est un retour au premier plan : `active` après `background`, jamais après un simple `inactive` — la fin d'une invite système ou d'un centre de contrôle tiré n'en est pas un |
| [`features/Campus/services/distance.ts`](../src/features/Campus/services/distance.ts) | la distance à vol d'oiseau, sur deux points bordelais connus |

`BdeMapping` a été le premier module **de feature** couvert, et il l'est pour une raison précise :
c'est là qu'une erreur ne se voit pas. Un champ omis rend une fiche incomplète sans rien casser, et
une date mal traitée fait disparaître du contenu publié — c'est arrivé, et le test existe parce que
le correctif existe.

Les trois modules ajoutés au jalon [6-D](phase-6/6-d-campus.md) sont là pour la même raison, et
chacun verrouille un défaut **mesuré** plutôt qu'imaginé : une date absente qui vidait un menu entier,
des horaires devenus invisibles parce que la source a changé de forme, une extraction qui rend `20` et
non `[20]`, et une colonne nulle qui pourrait effacer une coordonnée embarquée. Aucun des quatre ne
se voit à la relecture.

Les deux du jalon [6-I](phase-6/6-i-planning-universel.md) ont une particularité : **le fuseau des
tests est fixé** à `Europe/Paris` dans [`vitest.config.ts`](../vitest.config.ts). Ce n'est pas une
commodité de poste. L'export iCalendar d'ADE sert ses dates en UTC honnête — le même créneau
hebdomadaire est `07:30Z` en septembre et `08:30Z` en novembre, soit 09:30 à Paris les deux fois — et
c'est **la** propriété à verrouiller, puisqu'un affichage naïf décalerait tous les cours d'une heure la
moitié de l'année. Elle ne s'exprime que dans un fuseau donné : sans cette ligne, le test passerait à
Bordeaux et échouerait ailleurs, ce qui est la pire forme de test.

Les deux du jalon [6-E](phase-6/6-e-planning.md) suivent la même règle, sur la source la plus critique
de l'application. Deux d'entre eux valent d'être connus avant de « simplifier » quoi que ce soit :
`moment(null)` est une date **invalide** là où `moment(undefined)` vaut *maintenant* — une salle
occupée à l'heure où l'écran s'ouvre — et la vue semaine rend une description **vide**, ce qui est le
comportement d'origine et non un défaut de la migration
([features/planning.md](features/planning.md#limites-connues)).

Celui du jalon [6-K](phase-6/6-k-socle-visuel.md) est le premier à ne couvrir **aucun code applicatif** :
il vérifie que deux fichiers disent la même chose. La règle ESLint porte une copie des échelles de
tokens — elle est chargée par ESLint, qui ne lit pas de TypeScript applicatif — et une copie dérive.
Sans ce test, ajouter un token laisserait la règle conseiller un remplacement qui n'existe pas, ou
signaler une valeur devenue légitime ; personne ne s'en apercevrait avant d'avoir désactivé la règle
par lassitude. C'est aussi ce qui a justifié de sortir les tokens de `Theme.ts` : ce dernier importe
`react-native` et n'est donc pas jouable sous Node.

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

> **`npm run pdfjs:vendor`** recopie pdf.js dans `assets/pdfjs/` ; il ne se joue qu'en bumpant la
> devDependency `pdfjs-dist`, et le test de conformité le rappelle si on l'oublie
> ([plateforme.md](plateforme.md#ressources)).

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

[`eslint.config.mjs`](../eslint.config.mjs) configure volontairement sept règles : cinq
**garde-fous d'architecture**, une contre le code mort, et la seule règle de style du dépôt.

| Règle | Seuil | Ce qu'elle protège |
|---|---|---|
| `max-lines` | 400 | un fichier trop long est un module qui n'a pas été découpé |
| `max-lines-per-function` | 100 | une fonction trop longue mélange plusieurs responsabilités |
| `max-depth` | 4 | l'imbrication profonde signale une logique à extraire |
| `complexity` | 15 | la complexité cyclomatique signale un branchement à simplifier |
| `@typescript-eslint/no-explicit-any` | warn | le typage se perd un `any` à la fois |
| `@typescript-eslint/no-unused-vars` | warn | le code mort fait croire à des dépendances et à des capacités qui n'existent pas |
| `ukit/no-style-literals` | warn | le vocabulaire visuel se perd une valeur en dur à la fois |

Toutes sont en `warn` : elles ne bloquent pas, elles alertent. Un dépassement justifié se documente
par une désactivation locale et commentée — comme [`Theme.ts`](../src/shared/theme/Theme.ts)
(`eslint-disable max-lines`, fichier de données de style, et les trois dictionnaires de `shared/i18n/`
pour la même raison depuis 6.1-C),
[`CampusListLayout.tsx`](../src/features/Campus/components/CampusListLayout.tsx)
(`eslint-disable-next-line complexity`, composant générique à nombreuses options) ou
[`App.tsx`](../App.tsx) (l'écran de démarrage est peint avant que le thème existe).

#### `ukit/no-style-literals`, et pourquoi elle est écrite à la main

Ajoutée au jalon [6-K](phase-6/6-k-socle-visuel.md), dans
[`tools/eslint/no-style-literals.mjs`](../tools/eslint/no-style-literals.mjs) — **aucune dépendance
ajoutée**, elle est branchée en plugin inline. Elle refuse :

- toute **couleur hexadécimale** littérale ;
- toute valeur numérique de **marge**, de **rayon** ou de **taille de texte** hors des échelles de
  [`tokens.ts`](../src/shared/theme/tokens.ts). `0` est toléré : il neutralise une mise en page, ce
  n'est pas un pas d'échelle.

Un `no-restricted-syntax` aurait suffi à interdire. Celle-ci **nomme le token de remplacement** —
« `marginLeft: 4` : utiliser `tokens.space.xs` » — et c'est ce qui fait qu'on la corrige au lieu de la
désactiver. Quand aucun token ne tombe juste, elle propose les deux pas les plus proches.

Elle **ne couvre pas** `width`, `height` ni les tailles d'icône : le dépôt n'a aucune échelle pour
eux, et en inventer une aurait dépassé le mandat du jalon (extraire ce qui est là, pas dessiner ce
qui manque). Trois fichiers en sont exemptés, chacun pour une raison écrite dans la configuration :
`tokens.ts` et `Theme.ts` sont la source des valeurs, `app.config.ts` est lu par Expo avant que
l'application existe.

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
par **sept tapes sur le numéro de version** de l'écran À propos, et porte cinq onglets : *Temps* ;
*Blueprints*, le diagnostic de la livraison, décrit dans
[blueprints.md](blueprints.md#quand-une-correction--narrive-pas-) ; *Biometrie* et *Dossier*, deux
**sondes** ; et *Testeur* (6.1-B), qui montre l'**identifiant d'installation** de l'appareil — à
recopier dans la console pour le faire entrer dans l'audience `testeurs` — et porte les deux gestes
qui rendent les messages de service vérifiables sans relancer : relire, et oublier les vus
([pilotage.md](pilotage.md)).

Les deux sondes répondent à la même difficulté, et c'est celle qui justifie leur existence : **un
écran qui ne montre rien n'est pas un symptôme**. Face ID qui ne se déclenche pas a cinq causes qui ne
se distinguent pas à l'œil ; une proposition de dossier qui n'apparaît pas en a quatre. Une sonde
garde donc la trace de **chaque** étape, pas seulement du verdict final — la première campagne
biométrique a coûté un aller-retour pour avoir jeté l'erreur du premier temps dès que le second
réussissait.

L'onglet *Temps* porte deux simulations indépendantes : l'heure, et le **réseau** — et, en bas, la
**réinitialisation complète** (6.1-A) : le trousseau, le répertoire privé des documents et tout
AsyncStorage — réglages, `firstload`, caches et surcouches publiées — puis un rechargement du
JavaScript ([`ReinitialisationComplete.ts`](../src/shared/services/ReinitialisationComplete.ts)).
Elle **garde les deux simulations du menu** le temps de la relance
([`simulations.ts`](../src/shared/services/simulations.ts), 6.1-C) : la relance les perdait, et c'est
précisément en HORS LIGNE qu'on veut voir ce qu'un nouvel étudiant sans réseau voit — sans ça, la
liste des bâtiments se mettait en cache pendant la relance et la sonde ne sondait rien. Le menu
lui-même rouvre avec elles : une simulation active derrière un menu fermé serait un réglage qu'on
ne voit pas.
« Réinitialiser l'application » des Réglages garde le cache du catalogue et l'état en mémoire — le
premier rafraîchissement a déjà répondu —, donc il ne montre pas ce qu'un **tout nouvel étudiant**
voit : l'attente de la liste des établissements, le socle hors ligne. Seule une remise à zéro suivie
d'un rechargement le montre.

Ses libellés sont volontairement **hors des dictionnaires** : ce n'est pas une capacité utilisateur,
et lui ouvrir les trois traductions ferait porter à l'internationalisation un écran que personne
n'ouvre par hasard.

Fonctionnement de la simulation temporelle :

- `setFakeTime(date)` calcule un décalage entre la date voulue et l'heure réelle, puis **remplace
  `moment.now`** par une fonction qui applique ce décalage. Rien d'autre n'est déplacé : `Date.now()`
  et `new Date()` continuent de rendre l'heure vraie.
- **Le code applicatif lit donc l'heure par
  [`maintenant()`](../src/shared/services/Temps.ts), jamais par `new Date()`.** Ce module n'existe que
  pour ça : il rend `new Date(moment.now())`, et il donne un **nom** à une règle qui était jusqu'ici
  seulement écrite. Elle avait déjà été enfreinte deux fois — les salles libres au jalon
  [6-E](phase-6/6-e-planning.md), où simuler un jour de cours ne rouvrait pas un bâtiment ; puis
  l'onglet Scolarité le 2026-08-29, où la **date** sous la salutation suivait la simulation (elle
  passe par `moment`) pendant que la **salutation elle-même** restait sur l'heure réelle. Deux lignes
  voisines, deux jours différents.
- **Ce qui garde volontairement l'horloge réelle** : la programmation d'une notification (elle doit
  sonner à l'heure vraie — voir le dernier point), les horodatages de cache (les simuler ferait
  expirer ou ressusciter des entrées sans rapport), et les traces de diagnostic.
- Les fonctions **pures** ne lisent pas l'heure du tout : elles la reçoivent en paramètre
  (`valeurFraiche`, `choisirSalutation`), et c'est leur appelant qui vient la chercher. C'est ce qui
  les garde jouables sous vitest.
- Les caches d'emploi du temps (`@Week…` et `@YYYY/MM/DD`) sont purgés à chaque changement, pour que
  les vues rechargent la bonne date.
- L'événement `timeMockChanged` est diffusé via `DeviceEventEmitter`. **`rootContainer` s'y abonne et
  repeint toute l'application** — sans ça, `DayView` était le *seul* écran à réagir, ce qui donnait
  l'impression que la simulation ne marchait que par endroits (signalé le 2026-08-29 : elle
  fonctionnait sur une source d'emploi du temps et pas sur l'autre). L'abonnement local de `DayView`
  reste : il fait plus que rendre à nouveau, il régénère ses listes de jours et de semaines. `ModMenu`
  s'y abonne pour rafraîchir son horloge.
- Les notifications planifiées sont **retraduites en temps réel** : `computeRealTriggerTime` retire le
  décalage pour que l'OS déclenche l'alerte au bon moment réel, avec un plancher de 2 s si le calcul
  tombe dans le passé. Un message de retour indique dans combien de secondes réelles la première
  notification arrivera.

> **Capture attendue** — `modmenu.png` : le menu de simulation déployé, horloge simulée, interrupteur
> hors ligne et sélecteurs de date visibles.

## Lire le démarrage plutôt que le supposer

[`Chrono.ts`](../src/shared/services/Chrono.ts) pose des repères de temps sous `__DEV__` : chaque
`marquer(nom)` écrit `[chrono] <nom> +<ms>` dans la console de Metro, compté depuis le chargement du
module — le premier instant du JavaScript. Les repères posés : la préparation (`App.tsx`), les
managers et ressources prêts, le premier rendu (splash natif retiré), le conteneur racine monté, puis
ce que la scolarité décide au lancement — aucun identifiant, dossier en cache donc aucune session, ou
parcours froid lancé — et le premier rafraîchissement des widgets. Il existe parce que la
documentation affirmait que la session « rallongeait le splash » sans qu'aucune mesure ne l'appuie
([features/scolarite.md](features/scolarite.md#limites-connues), 6.1-C) : un repère se lit, une
impression se discute. En production, la fonction ne fait rien.

Le premier relevé, sur iPhone le 2026-09-03 sans identifiants : préparation à +146 ms, managers et
ressources prêts à +189 ms, premier rendu à +385 ms, conteneur racine monté à +420 ms, décision de
la scolarité à +447 ms — vingt-sept millisecondes après le conteneur, soixante après le premier
rendu. Et une seconde lecture du trousseau à +40 s, que rien n'avait demandée : l'effet de
chargement initial dépendait de deux rappels dont l'identité change avec l'état du provider. Il ne
joue plus qu'au montage. C'est le genre de chose qu'un repère voit et qu'une relecture ne voit pas.

Le second relevé, dossier en cache — le cas courant : premier rendu à +230 ms, conteneur à +363 ms,
décision « dossier en cache, aucune session » à +400 ms, premier rafraîchissement des widgets à
+445 ms, l'onglet Scolarité étant celui du lancement. Dans les deux états mesurés, la scolarité
décide entre trente et soixante millisecondes **après** le premier rendu, et ne lance rien. Le
parcours froid au lancement — identifiants sans dossier, le seul état qui lance une session — n'a
pas été relevé ; le code garantit qu'il part au même instant, et il tourne alors sous le fondu
d'une seconde du splash animé. Verdict S13 : rien à différer, la limite reste écrite avec ses
chiffres ([features/scolarite.md](features/scolarite.md#limites-connues)).

## Sonder la biométrie plutôt que la deviner

Le menu de développement porte un onglet **Biométrie**. Il existe parce que le symptôme — « l'iPhone
demande le code sans tenter Face ID » — a plusieurs causes qui **ne se distinguent pas à l'écran** et
qui n'ont pas le même remède : Face ID refusé à l'application, aucun visage enrôlé, verrouillage après
trop d'échecs, ou simplement iOS qui court-circuite parce que la politique le lui permet.

Il montre les **capacités** de l'appareil — matériel, enrôlement, modalités, niveau — qui ne demandent
rien à personne et répondent déjà à la moitié des questions, puis le `{success, error, warning}`
**brut** d'une demande, jouable par les **deux politiques côte à côte** : celle d'avant le correctif
et celle en deux temps. C'est cette comparaison qui tranche, et la faire en une session vaut mieux que
mesurer, corriger, puis remesurer. Le champ `error` désigne la cause à lui seul
([features/scolarite.md](features/scolarite.md#la-biométrie-se-demande-en-deux-temps)).

> **Expo Go porte son propre `Info.plist`**, et la clé `NSFaceIDUsageDescription` d'`app.config.ts`
> ne s'y applique pas. Un verdict `not_available` sous Expo Go ne prouve donc **rien** sur
> l'application réelle : il faut un `eas build --profile development` pour conclure. Le panneau sert
> exactement à savoir si ce build est nécessaire.

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

Ce qu'il **ne couvre pas**, et qu'il faut savoir avant de conclure, ce sont les deux chemins réseau
qui ne passent pas par le `fetch` du moteur :

- **la WebView de l'Act II**, qui navigue par elle-même. La scolarité est dans ce cas depuis le jalon
  [6-F](phase-6/6-f-scolarite.md) ;
- **le client Supabase**, qui utilise le `fetch` global. Les trois surcouches publiées — Blueprints,
  bâtiments, catalogue, visuels — continuent donc de se rafraîchir alors que l'interrupteur est
  actif. C'est contre-intuitif et ça invalide silencieusement toute vérification de cache : on croit
  observer un repli local alors qu'on observe une lecture qui a abouti.

Les deux se vérifient par la seconde méthode ci-dessous — pointer un hôte sur une adresse
injoignable, puis recharger. Pour la base, c'est `SUPABASE_URL=https://127.0.0.1:1` dans `.env` : la
configuration reste **présente**, donc le client se construit et sa requête échoue, ce qui est le
chemin réel d'une base injoignable. Une clé vidée testerait autre chose — l'application non
configurée.

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

Trois workflows, et aucun ne vérifie le code de l'application :
[`.github/workflows/release.yml`](../.github/workflows/release.yml), déclenché par un tag `v*` ou
manuellement, **construit et publie** l'application ;
[`.github/workflows/console.yml`](../.github/workflows/console.yml) construit et déploie la console
de pilotage sur GitHub Pages (le typage de la console fait partie de sa construction) ;
[`.github/workflows/sondes.yml`](../.github/workflows/sondes.yml) joue chaque matin les sondes des
sources tierces, dont les tests unitaires (`python -m unittest discover -s sondes`). Voir
[plateforme.md](plateforme.md).

Conséquence directe : `npx tsc --noEmit` et `npx eslint .` doivent être joués **en local**, aucune
barrière ne les rejouera.

## Limites connues

- **La couverture de test est étroite** : elle s'arrête au socle Aetherius. Ni composant, ni écran,
  ni bout en bout — la vérification manuelle sur l'application réelle reste la porte principale.
- **Aucune vérification en intégration continue.** Un code qui ne compile pas peut être fusionné.
- **Le menu de simulation est présent en production.** `ModMenu` n'est pas gardé par `__DEV__` ; il
  est simplement invisible tant qu'il n'est pas activé.
