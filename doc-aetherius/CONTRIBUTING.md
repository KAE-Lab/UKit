# Contribuer à Aetherius

Merci de contribuer. Ce document résume le workflow de développement et les conventions à suivre.
Le cadrage produit est dans le [README](README.md), l'architecture dans
[docs/architecture.md](docs/architecture.md).

## Mise en place

Prérequis : Python 3.11+ et, pour le SDK TypeScript, Node 20+.

```bash
make install-dev          # installe le paquet en editable + les outils de dev
```

## Workflow

Une seule commande fait foi, en local comme en CI :

```bash
make check                # format + lint (ruff) + types (mypy) + tests (pytest)
```

Cibles utiles :

```bash
make test                 # tests seuls, avec couverture
make lint                 # ruff
make typecheck            # mypy (strict)
make check-all            # tout le dépôt : Python + SDK TypeScript
make help                 # liste des cibles
```

Ouvre une branche par changement, garde `make check` vert, et découpe en commits lisibles.

## Définition de « terminé »

Une capacité utilisateur (un Act, une action, une option) n'est terminée que lorsque **tout** ceci
est vrai. On ne saute pas une étape en attendant qu'on la réclame :

1. **Tests miroir** écrits avec le code — voir [Tests](#tests).
2. **Exemple exécutable** ajouté dans `examples/<act>/`, lançable depuis `aetherius run` et la
   Console — voir [Exemples exécutables](#exemples-exécutables).
3. **Doc à jour** dans le même changement — voir [Documentation](#documentation).
4. **`make check` vert.**
5. **Flux vérifié à la main** au moins une fois : le vrai `run`, pas seulement les tests (chaque
   doc d'Act a une section « Tester … » pour ça). En plus du chemin nominal, jouer **une ou deux
   sondes réalistes « dures »** — un scénario réel plus exigeant que l'exemple zéro config, dont si
   possible un cas conçu pour faire échouer la capacité. Un échec **propre et explicable** est un
   résultat valide ; un comportement surprenant est un correctif ou une limite à documenter avant
   de clore. Voir [docs/testing.md](docs/testing.md#sondes-réalistes).
6. **Prise en main UI** pour une capacité **liée à l'UI et non triviale** (nouvel écran ou
   interaction non évidente de la Console) : un walkthrough orienté UI dans la doc **et** des captures
   SVG générées (`make screenshots`) — voir [Documentation](#documentation). Exception : une
   interaction rudimentaire (ex. sélectionner une ligne pour lancer un run) n'en a pas besoin.

## Principes de code

- Un fichier de logique reste sous ~300 lignes ; au-delà, on découpe en sous-modules.
- Typage strict (pydantic v2) ; les erreurs sont typées et jamais avalées.
- `import aetherius` reste léger : aucune dépendance lourde (Playwright, ONNX, OpenCV, Anthropic)
  importée au niveau module — elles sont chargées à la demande dans les Acts.
- Les contrats (`contracts/`) sont la source de vérité ; le code et les SDK s'y conforment.
- Le dictionnaire d'actions (`core/actions/registry.py`) est l'unique source ; le catalogue du
  builder en est une projection (pas de duplication).
- Commentaires sobres, orientés « pourquoi » ; pas d'emoji dans le code ni les logs. Le formatage et
  le lint sont gérés par ruff (`make format`).

## Tests

- Toute nouvelle logique arrive **avec son test miroir** dans `tests/`. Une contribution n'est prête
  que si `make check` est vert.
- La suite doit passer **sans les extras lourds** : un test qui exige `[browser]`, `[vision]` ou
  `[agent]` se skippe proprement via `pytest.importorskip(...)` et porte le marker correspondant.
- Les contrats sont gardés par `tests/contracts/` : les garder verts quand un contrat évolue.
- Structure, markers, fixtures et couverture sont détaillés dans [docs/testing.md](docs/testing.md).

## Exemples exécutables

Une capacité utilisateur arrive avec **au moins un Blueprint d'exemple réellement exécutable**,
rangé dans `examples/<act>/` et lançable tel quel depuis `aetherius run` comme depuis la Console. Un
exemple n'est pas un extrait décoratif : il doit tourner.

- Privilégier un endpoint **public et autorisé** pour un exemple **zéro configuration** (ex.
  `quotes.toscrape.com`, `books.toscrape.com`) : l'utilisateur ouvre la Console, clique Run, ça
  marche.
- Si des identifiants sont nécessaires, les passer par `.env` (`AETHERIUS_SECRET_*`, voir
  [docs/secrets.md](docs/secrets.md)) et le signaler ; ne jamais coder un secret en dur, ni dans un
  exemple, un test ou une fixture.
- Un gabarit non exécutable (URLs placeholder, service privé) est marqué comme tel dans sa
  `description` et ne compte pas comme l'exemple exécutable requis.
- Les exemples sont validés contre le schéma par la CI (`tests/contracts/`), à n'importe quelle
  profondeur sous `examples/`.

## Documentation

La doc évolue **avec** le code, dans le même changement — jamais « plus tard ». Un autre
contributeur doit pouvoir reprendre à partir de la seule doc, sans contexte oral. À chaque
contribution, mettre à jour :

- la **doc de la partie concernée** (ex. [`docs/acts/<act>.md`](docs/acts/)) : décrire le *comment*
  et les **limites connues**, pas seulement le *quoi* ; noter les décisions de conception
  non-évidentes, pour qu'on ne les « corrige » pas par erreur plus tard ;
- le **statut** dans le [README](README.md), section « État d'avancement » : la source de vérité du
  jalon atteint et du prochain ;
- tout **doc transverse** réellement touché (par ex. [docs/console.md](docs/console.md),
  [docs/secrets.md](docs/secrets.md), [docs/testing.md](docs/testing.md)) ; ne pas dupliquer, mais
  laisser un pointeur là où c'est utile.

Style : sobre, orienté « pourquoi », sans emoji — comme le code.

### Captures d'écran de la Console

Les images de la doc (`docs/screenshots/*.svg`) sont **générées**, jamais prises à la main. La source
unique est [`console/screenshots.py`](src/aetherius/console/screenshots.py), qui pilote l'app en
headless et exporte chaque écran en SVG déterministe (identifiant normalisé, chemin local neutralisé).
Règles :

- après **toute** évolution d'un écran ou d'un layout Console, exécuter `make screenshots` et commiter
  le résultat ;
- pour un **nouvel** écran/interaction, ajouter un scénario dans `screenshots.py` (une fonction de
  pilotage + une entrée dans `_SHOTS`), régénérer, puis l'intégrer dans la doc concernée ;
- `make screenshots-check` (garde-fou, rejouable en CI) échoue si les captures committées sont
  périmées, grâce au déterminisme.

## Intégration continue

La CI (`.github/workflows/ci.yml`) rejoue exactement les cibles `make` sur Python 3.11 et 3.12 et
compile le SDK TypeScript. Il n'y a pas de logique de test hors du `Makefile` : ce qui passe en local
passe en CI, et inversement.
