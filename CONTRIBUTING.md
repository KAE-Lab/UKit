# Contribuer à UKit

Merci de contribuer. Ce document résume le workflow de développement et les conventions à suivre. Le
cadrage produit est dans le [README](README.md), l'architecture dans
[docs/architecture.md](docs/architecture.md).

## Mise en place

Prérequis : Node.js 18+, npm, et l'application Expo Go ou un émulateur.

```bash
npm install
npx expo start        # puis a (Android), i (iOS), ou scan du QR code
```

## Workflow

1. Ouvrir une branche par changement : `type/description-courte`
   (`feat/notifications-recurrentes`, `fix/cache-planning`).
2. Découper en commits lisibles, au format **Conventional Commits**.
3. Garder les portes de qualité au vert (voir ci-dessous).
4. Ouvrir une Pull Request.

### Convention de commit

Vérifiée à l'écriture par un hook `commit-msg` (commitlint) : un message hors convention est refusé
localement, et rien ne le rattrapera côté CI.

| Préfixe | Usage |
|---|---|
| `feat` | nouvelle capacité utilisateur |
| `fix` | correction d'un défaut |
| `refactor` | changement de structure sans changement de comportement |
| `style` | formatage, sans effet sur le sens du code |
| `docs` | documentation seule |
| `chore` | dépendances, configuration, outillage |

`npm run commit` ouvre un assistant si l'on préfère être guidé.

## Définition de « terminé »

Une capacité utilisateur — un écran, une source de données, une option — n'est terminée que lorsque
**tout** ceci est vrai. On ne saute pas une étape en attendant qu'on la réclame.

1. **Documentation à jour dans le même changement.** Jamais « plus tard ». Voir
   [Documentation](#documentation).
2. **Chaînes localisées** dans les trois dictionnaires `fr`, `en`, `es`. Aucune chaîne visible en
   dur. Voir [docs/i18n.md](docs/i18n.md).
3. **Tokens de thème** pour tout style. Aucune couleur, aucun espacement, aucun rayon littéral. Voir
   [docs/theme.md](docs/theme.md). Cette règle est **applicable** depuis le jalon
   [6-K](docs/phase-6/6-k-socle-visuel.md) : `ukit/no-style-literals` la signale et nomme le token de
   remplacement. Pour un écran, dérouler aussi la
   **[recette d'écran](docs/theme.md#la-recette-décran)** — en-tête animé, marges, les quatre états,
   cibles tactiles.

   > **Un token bien utilisé ne suffit pas : la forme aussi est une règle.** Les surfaces de UKit sont
   > des **carrés arrondis** — `radius.md` par défaut, `radius.lg` pour un conteneur, `radius.xl` pour
   > une carte. `radius.pill` est réservé aux points d'état, aux compteurs et aux jauges. Un bouton
   > rond, un champ en pilule ou une icône dans un disque **dénotent**, et la règle ESLint ne les voit
   > pas — elle refuse une valeur en dur, pas une mauvaise forme. C'est la première chose à vérifier
   > sur un rendu ([docs/theme.md](docs/theme.md#les-décisions-durables)).
4. **`npx tsc --noEmit` et `npx eslint .` sans régression** — zéro nouvelle erreur, zéro nouveau
   warning. La base de référence actuelle (`tsc` **verte**, 53 warnings ESLint dont 42 de style) est
   décrite dans [docs/qualite.md](docs/qualite.md) : ne pas l'augmenter, la réduire quand on passe à
   proximité. **`npm test` vert**, sans exception : lui l'est déjà.
5. **Flux vérifié à la main au moins une fois** sur l'application réelle, pas seulement relu. Chaque
   documentation de partie porte une section « Vérifier » décrivant le parcours attendu. Pour toute
   capacité touchant une source distante, jouer **aussi le chemin dégradé** — hors ligne, source
   injoignable, réponse vide. Un échec propre et explicable est un résultat valide ; un comportement
   surprenant est un correctif à faire, ou une limite à écrire dans la doc avant de clore.
   Ces chemins doivent produire des écrans **différents** : s'ils affichent tous « aucun résultat »,
   la vérification n'a rien vérifié.
6. **Parité verte** pour toute source migrée vers un Blueprint : `npm run parity`. C'est la seule
   preuve rejouable que la bascule ne change rien pour l'utilisateur, et c'est ce qui autorise à
   retirer un repli ([tools/parity/README.md](tools/parity/README.md)).
7. **Prise en main visuelle** pour une capacité liée à l'interface et non triviale : une capture
   ajoutée dans [`docs/screenshots/`](docs/screenshots/README.md) et intégrée à la documentation
   concernée. **Uniquement si l'outillage disponible le permet** — un appareil, un émulateur Android
   ou un simulateur iOS accessible. À défaut, le signaler dans la Pull Request plutôt que de
   l'inventer : la capacité reste livrable, la capture se rattrape. Une interaction rudimentaire
   (ajouter une ligne à une liste existante) n'en a pas besoin.
8. **Commits conformes** à la convention.

## Principes de code

- **Un fichier de logique reste sous 400 lignes**, une fonction sous 100, la profondeur sous 4, la
  complexité sous 15. Ce sont des garde-fous d'architecture, pas du confort : au-delà, on découpe en
  sous-modules. Un dépassement justifié se signale par une désactivation locale **et commentée**.
- **Composants fonctionnels et hooks.** Les composants à classe existants sont conservés tels quels —
  ils fonctionnent, on ne les réécrit pas sans raison — mais tout nouveau composant est une fonction.
- **La logique vit dans un hook ou un service**, pas dans un écran. Un écran compose, branche la
  navigation, lit le thème.
- **Le réseau est confiné aux services** de `features/*/services/` ou `shared/services/`. Un
  composant n'appelle jamais `axios` ni `fetch` — et, depuis la
  [Phase 6](docs/phase-6/README.md), un service n'en appelle plus non plus : il joue un
  [Blueprint](docs/blueprints.md). La base de publication se lit avec la même règle.
- **Pas de `any`** sans justification écrite.
- **Aucun code mort.** Import inutilisé, variable jamais lue, composant jamais monté, export que rien
  n'atteint : `@typescript-eslint/no-unused-vars` signale les premiers, la relecture doit attraper les
  derniers. Un export mort fait croire à une capacité, et il faut l'enquêter avant d'oser le supprimer
  — c'est son vrai coût. Une erreur qu'on n'utilise pas s'écrit `catch {`, pas `catch (e)`.
- **Pas de dépendance cartographique propriétaire.** Les cartes passent par Leaflet et OpenStreetMap
  dans une WebView ([docs/cartographie.md](docs/cartographie.md)).
- **Commentaires sobres, orientés « pourquoi ».** Un commentaire qui paraphrase la ligne suivante est
  du bruit. **Aucun emoji** dans le code, les commentaires ou les logs.

Détail des conventions, du nommage et de l'anatomie d'un module :
[docs/conventions.md](docs/conventions.md).

## Ajouter une source de données

Une source distante est la surface la plus fragile du projet. Depuis la
[Phase 6](docs/phase-6/README.md), on n'écrit plus le code qui l'atteint : on écrit un
**[Blueprint](docs/blueprints.md)**, joué par le moteur embarqué. Le chemin attendu :

1. **Inventorier la source d'abord**, dans [docs/sources-externes.md](docs/sources-externes.md) :
   endpoint, méthode, en-têtes indispensables, charge utile, constantes **et leur signification**,
   forme de la réponse, transformation appliquée, **fragilité connue**. L'écrire révèle déjà la
   moitié du travail.
2. **Écrire le Blueprint** dans [`blueprints/`](blueprints/) — un par appel réellement joué, pas un
   par source — et le jouer depuis un poste avant de toucher à l'application.
3. **Écrire le service** dans `features/<Domaine>/services/`, avec ses interfaces de contrat. Il
   orchestre le Blueprint et travaille la donnée reçue ; il n'émet pas de requête.
4. **Gérer l'échec par famille**, pas par valeur de repli : une source en panne et une réponse
   légitimement vide doivent produire deux écrans différents
   ([docs/blueprints.md](docs/blueprints.md#les-erreurs-cessent-dêtre-avalées)).
5. **Ajouter le cas de parité** dans [`tools/parity/`](tools/parity/README.md) et le rendre vert.
6. Décider de la stratégie de cache et la documenter dans
   [docs/donnees-et-persistance.md](docs/donnees-et-persistance.md). Le cache reste applicatif : il
   ne descend jamais dans un Blueprint.
7. Créditer le fournisseur dans l'écran À propos si la source est publique.

Ce qui descend dans un Blueprint et ce qui n'y descend jamais — le calcul, l'heure courante, la
position, l'internationalisation — est écrit dans [docs/blueprints.md](docs/blueprints.md).

**Une exception, et une seule : notre propre base.** Ce qui vient de la
[base de publication](docs/backend.md) se lit avec son client, pas avec un Blueprint. Un Blueprint
sert à parler à une source **tierce** dont on ne contrôle ni le format ni la disponibilité ; pour nos
propres tables, l'indirection n'achèterait rien — le schéma et l'application changent dans le même
commit — et coûterait un aller-retour de plus à chaque correction. La règle de couche ne change pas
pour autant : la base se lit **depuis un service**, jamais depuis un composant, et par le client
unique de `shared/supabase/`.

## Documentation

La documentation évolue **avec** le code, dans le même changement — jamais « plus tard ». Un autre
contributeur doit pouvoir reprendre à partir de la seule documentation, sans contexte oral.

À chaque contribution, mettre à jour :

- **la documentation de la partie concernée** (`docs/features/<domaine>.md` ou le document transverse
  correspondant) : décrire le *comment* et les **limites connues**, pas seulement le *quoi* ; noter
  les décisions de conception non évidentes, pour qu'on ne les « corrige » pas par erreur plus tard ;
- **la section « État des lieux » du [README](README.md)** : c'est la source de vérité du périmètre
  livré ;
- **la carte des fichiers** du document concerné si un fichier est ajouté, déplacé ou supprimé —
  chaque fichier de `src/` doit y apparaître exactement une fois ;
- **[CHANGELOG.md](CHANGELOG.md)**, sous « Non publié » ;
- tout **document transverse réellement touché** (navigation, thème, i18n, sources externes,
  persistance, plateforme). Ne pas dupliquer : laisser un pointeur là où c'est utile.

Style : sobre, en français, orienté « pourquoi », sans emoji — comme le code. Toute affirmation
technique renvoie au fichier source par un lien relatif, pour rester vérifiable.

### Un travail visuel n'est pas documenté au même endroit

Une décision qui vaut au-delà de l'écran où elle a été prise — un rayon, une ombre, la forme d'un état
vide — va dans **« Les décisions durables »** de [docs/theme.md](docs/theme.md), pas dans le document
de la fonctionnalité. C'est ce qui évite que la session suivante la défasse.

Et une distinction à ne pas aplatir : un **défaut fonctionnel** rencontré en refaisant un écran — une
impasse, un état manquant — n'est pas du goût. Il se corrige, se teste et se coche comme n'importe quel
correctif ; le confondre avec de l'esthétique rend le travail invérifiable. Il s'inscrit dans
[docs/defauts-fonctionnels.md](docs/defauts-fonctionnels.md) et **ne se corrige pas au passage**, sauf
s'il tombe exactement dans le périmètre de la session.

### Captures d'écran

Les captures sont prises à la main : le projet ne dispose d'aucun outillage de capture automatique.
Les emplacements attendus sont marqués **dans les documents eux-mêmes**, au point où l'illustration
sert le propos, par une ligne `> **Capture attendue** — <nom>.png : …`. Déposer le fichier dans
[`docs/screenshots/`](docs/screenshots/README.md) et remplacer la ligne par l'image.

Convention de nommage, inventaire de suivi et procédure de prise de vue :
[`docs/screenshots/README.md`](docs/screenshots/README.md). Ne jamais publier de capture montrant des
données personnelles réelles.

Un nouvel écran arrive avec **son emplacement marqué**, même si la capture est différée : c'est ce qui
évite de l'oublier.

## Vérification

L'intégration continue ne joue que la publication : les commandes de qualité se lancent en local.

```bash
npx tsc --noEmit
npx eslint .
npm test              # tests unitaires du socle Aetherius (voir docs/qualite.md)
npm run parity        # sources migrees vers un Blueprint (voir tools/parity/README.md)
```

Les tests automatiques couvrent ce qui porte de la logique UKit **et ne dépend d'aucune plateforme** :
le socle Aetherius, la lecture de la base, et les projections de contrat. Il n'y a **aucun test
d'écran ni de composant**, et la vérification manuelle sur l'application réelle reste la porte
principale. Périmètre exact : [docs/qualite.md](docs/qualite.md#les-tests-unitaires).

`npm run parity` **réussit sans aucun cas** : le harnais est légitimement vide entre deux jalons de
migration.

Pour les comportements dépendant de l'heure — notifications, salles libres, menus du jour, horaires —
utiliser le menu flottant de simulation temporelle décrit dans [docs/qualite.md](docs/qualite.md)
plutôt que d'attendre le bon moment.

## Publication

Les versions sont construites et publiées par
[`.github/workflows/release.yml`](.github/workflows/release.yml), déclenché par un tag `v*` ou
manuellement. Avant de poser un tag, vérifier la cohérence de `package.json`, `app.config.ts` et
`VERSION` — le workflow ne met pas tout à jour automatiquement. Détail et pièges :
[docs/plateforme.md](docs/plateforme.md).

## Checklist avant Pull Request

* [ ] `npx tsc --noEmit` sans nouvelle erreur.
* [ ] `npx eslint .` sans nouveau warning.
* [ ] `npm test` vert.
* [ ] `npm run parity` vert, si une source migrée est touchée.
* [ ] Aucune chaîne en dur ; les trois dictionnaires sont à jour.
* [ ] Aucune valeur de style en dur ; tokens utilisés.
* [ ] Aucun `any` ajouté sans justification.
* [ ] Parcours vérifié à la main, chemin nominal **et** chemin dégradé.
* [ ] Documentation de la partie, « État des lieux » du README et CHANGELOG mis à jour.
* [ ] Pour un jalon de phase : sa **spécification** porte la bannière « Jalon livré » et ses écarts
  constatés. Le vérifier par `git diff --stat docs/phase-6/` **avant** de commiter, jamais de
  mémoire : une spécification restée intacte est indiscernable d'une spécification dont l'amendement
  a été écrasé, et le cas s'est présenté (voir l'en-tête de
  [6-c-livraison.md](docs/phase-6/6-c-livraison.md)).
* [ ] Capture ajoutée si la capacité est visuelle **et** que l'outillage le permettait.
* [ ] Commits conformes à la convention.
