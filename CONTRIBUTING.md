# Contribuer à UKit

Ce document dit comment proposer un changement. Le cadrage produit est dans le [README](README.md) ;
le pourquoi des choix non évidents dans [docs/decisions.md](docs/decisions.md), à chercher par mot-clé
avant de refaire un choix ; les défauts connus dans [docs/defauts-fonctionnels.md](docs/defauts-fonctionnels.md).

## Mise en place

Prérequis : Node.js 22 (`.nvmrc` ; 20.19.4 au minimum), npm, et un build de développement EAS :
Expo Go ne suffit pas (ni notifications distantes, ni tâche de fond, ni biométrie, et un seul SDK).

```bash
npm install           # installe aussi le hook commit-msg
cp .env.example .env  # puis renseigner SUPABASE_URL et SUPABASE_ANON_KEY (clé publiable)
npx expo start        # puis a (Android), i (iOS) ou le QR code ; ajouter -c après tout changement du .env
```

La console de pilotage se lance à part : [console/README.md](console/README.md). Les sondes sont en
Python 3.12 : `python -m unittest discover -s sondes`.

## Workflow

1. Partir de la bonne branche : la branche de la version en cours (`v6.3`) pour l'application ; `main`
   pour la console, le catalogue des campus et le bucket.
2. Ouvrir une branche par changement : `type/description-courte` (`feat/notifications-recurrentes`,
   `fix/cache-planning`).
3. Découper en commits lisibles, au format **Conventional Commits**, en français : `type: description`.
   Le hook `commit-msg` (commitlint, `@commitlint/config-conventional`) refuse un message hors
   convention, et rien ne le rattrape côté CI. `npm run commit` ouvre un assistant.
4. Garder les vérifications au vert (plus bas), puis ouvrir une Pull Request vers la branche de départ.

| Préfixe | Usage |
|---|---|
| `feat` | nouvelle capacité utilisateur |
| `fix` | correction d'un défaut |
| `perf` | performance, sans changement de comportement |
| `refactor` | changement de structure sans changement de comportement |
| `style` | formatage, sans effet sur le sens du code |
| `test` | tests seuls |
| `docs` | documentation seule |
| `build`, `ci`, `chore` | construction, intégration continue, dépendances, outillage |

## Définition de « terminé »

Une capacité utilisateur (un écran, une source de données, une option) n'est terminée que lorsque tout
ceci est vrai :

1. **Textes** : `Translator.get('CLE')`, clé présente dans les trois dictionnaires `fr`, `en`, `es` ;
   aucune chaîne visible en dur.
2. **Style** : tokens du thème pour toute valeur (la règle ESLint `ukit/no-style-literals` nomme le
   token), surfaces en carrés arrondis (`radius.pill` réservé aux points, compteurs et jauges), police
   du système. Un écran suit la recette : en-tête par `withHeaderAnimation` ou `withStaticHeader`,
   quatre états distincts (chargement, vide, erreur, couverture partielle), cibles tactiles de 44 pt.
3. **Portes** : typage, ESLint à zéro avertissement et tests verts (plus bas).
4. **Vérifié à la main** sur l'application réelle, sur iPhone et sur Android (parc de référence :
   iPhone 13 Pro et Galaxy A8 sous Android 9), chemin nominal et chemin dégradé (hors ligne, source
   injoignable, réponse vide) : ces chemins produisent des écrans différents. Jamais le mode avion, qui
   coupe aussi Metro : casser la source (par exemple une adresse `https://127.0.0.1:1/`). Pour ce qui
   dépend de l'heure, le menu de développement simule l'heure.
5. **Parité verte** (`npm run parity`) pour toute source servie par un Blueprint.
6. **Décision non évidente** consignée dans `docs/decisions.md`. Un défaut de comportement rencontré
   en chemin s'inscrit dans `docs/defauts-fonctionnels.md` et ne se corrige pas au passage.
7. **Capture** : un écran visiblement modifié reprend sa capture dans `docs/screenshots/`, sous le même
   nom (`<domaine>-<ecran>.png`, `-dark` pour le thème sombre) ; jamais de donnée personnelle réelle,
   le dépôt est public.
8. **Vie privée** : toute nouvelle collecte, écriture vers la base ou service tiers s'écrit dans
   [PRIVACY.md](PRIVACY.md) avant le code.

Le `CHANGELOG.md` ne s'écrit pas à la main : il se génère depuis les commits à la publication.

## Principes de code

- Un fichier de logique vise 300 lignes ; ESLint avertit à 400 (garde-fou transitoire), à 100 lignes
  par fonction, à une profondeur de 4 et une complexité de 15. Un dépassement justifié se signale par
  une désactivation locale commentée.
- Composants fonctionnels et hooks ; la logique vit dans un hook ou un service, pas dans un écran. Le
  réseau est confiné aux services : une source tierce se joue par un Blueprint, nos tables se lisent
  par le client unique de `src/shared/supabase/`.
- L'heure de la logique métier se lit par `maintenant()` ou `moment()`, jamais `new Date()`.
- Pas de `any` sans justification, aucun code mort, aucune dépendance cartographique propriétaire
  (MapLibre et OpenFreeMap).
- Commentaires en français, sobres, qui disent le pourquoi ; aucun emoji.

## Ajouter une source de données

Une source distante est la surface la plus fragile du projet : on n'écrit pas le code qui l'atteint,
on écrit un Blueprint, joué par le moteur embarqué.

1. Inventorier la source dans [docs/sources-externes.md](docs/sources-externes.md) : hôte, en-têtes
   indispensables, constantes et leur sens, forme de la réponse, fragilité connue.
2. Écrire le Blueprint dans `blueprints/` (un par appel réellement joué) et le jouer depuis un poste
   avant de toucher à l'application.
3. Écrire le service dans `src/features/<Domaine>/services/` : il joue le Blueprint et travaille la
   donnée reçue.
4. Gérer l'échec par famille, pas par valeur de repli : une source en panne et une réponse vide donnent
   deux écrans différents.
5. Ajouter le cas de parité dans `tools/parity/` et le rendre vert.
6. Décider la stratégie de cache (applicative, jamais dans un Blueprint) et créditer le fournisseur
   dans l'écran À propos si la source est publique.

## Un retour d'utilisateur

Les réponses au formulaire arrivent dans la table `retours`, importées toutes les 72 heures, et se
lisent dans la page Retours de la console. Un retour qui décrit un défaut devient une entrée de
`docs/defauts-fonctionnels.md`, écrite à la main avec sa date de réception ; la ligne passe en
`traité`, `en attente` ou `refusé` avec une note qui renvoie à cette entrée, au commit ou à la raison.
Une demande de campus rejoint [docs/adaptation-campus.md](docs/adaptation-campus.md). On ne retouche
jamais la feuille de réponses : la clé d'un retour est une empreinte, corriger une cellule recréerait
la ligne.

## Vérification

L'intégration continue ([`.github/workflows/verifier.yml`](.github/workflows/verifier.yml)) rejoue
sur chaque poussée et chaque Pull Request : typage, ESLint à zéro avertissement, tests, construction
de la console et tests des sondes. Les mêmes commandes se jouent en local avant de pousser, plus deux
portes qui n'existent qu'en local :

```bash
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm run parity                      # sources servies par un Blueprint, sur les vraies sources
npx expo export --platform ios      # puis --platform android, à chaque dépendance native qui bouge
```

## Publication

Réservée aux mainteneurs. Un tag `v*` lance [`.github/workflows/release.yml`](.github/workflows/release.yml),
qui construit l'APK de préversion et publie la Release GitHub ; la construction de production et la
soumission aux stores ne partent que par un lancement manuel du même workflow (`build_production`).
Avant le tag, aligner `package.json`, la `version` d'`app.config.ts` et `VERSION`.

## Checklist avant Pull Request

* [ ] `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test` verts.
* [ ] `npm run parity` vert, si une source servie par un Blueprint est touchée.
* [ ] Aucune chaîne ni valeur de style en dur ; aucun `any` ajouté sans justification.
* [ ] Parcours vérifié à la main, nominal et dégradé, sur iPhone et sur Android.
* [ ] Décision non évidente consignée dans `docs/decisions.md`, capture reprise si l'écran a changé.
* [ ] Commits conformes à la convention.
