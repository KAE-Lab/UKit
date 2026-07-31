# Tests

Les tests co-évoluent avec le code : on les écrit au fil de l'implémentation, pas après coup. Une
fonctionnalité n'est **terminée qu'avec son test**. Ce document fixe la structure et les
conventions ; le lanceur unique est le [`Makefile`](../Makefile), rejoué à l'identique par la CI.

## Lancer les tests

```bash
make install-dev     # installe le paquet + outils de dev (editable)
make test            # toute la suite Python, avec couverture
make test-fast       # exclut les extras lourds et les tests lents
make check           # gate complet Python : format + lint + types + tests
make check-all       # + build/typecheck du SDK TypeScript
```

Sélections utiles pendant le développement :

```bash
pytest tests/unit/test_version.py          # un fichier
pytest -k version                          # par nom
pytest -m contracts                        # par marker
pytest -m "not browser"                    # exclut un marker
```

## Structure

Les tests **reflètent** l'arborescence de `src/aetherius/` : un module de logique a son test miroir.

```
tests/
├── conftest.py      # fixtures partagées (chemins repo / examples / contracts)
├── unit/            # tests unitaires isolés ; miroir de src/aetherius/
│   ├── conftest.py  # fixture `plugin_action` : action plugin de test, nettoyée en teardown
│   └── core/blueprint/test_models.py   <->  src/aetherius/core/blueprint/models.py
├── integration/     # traversées multi-modules, runtime, daemon
├── contracts/       # garde les contrats (schémas JSON, OpenAPI, events)
└── fixtures/        # données de test statiques (voir fixtures/README.md)
```

Nommage : fichiers `test_<module>.py`, fonctions `test_<comportement>`. Les tests importent
`aetherius` normalement — `pythonpath = ["src"]` (dans `pyproject.toml`) rend la suite exécutable
sur un checkout nu, sans installation préalable.

## Markers

Déclarés dans `pyproject.toml` et imposés par `--strict-markers` (un marker inconnu échoue).

| Marker        | Usage                                                              |
| ------------- | ----------------------------------------------------------------- |
| `unit`        | test isolé, sans I/O réseau ni navigateur                         |
| `integration` | traverse plusieurs modules ou le daemon                           |
| `contracts`   | valide les contrats (`contracts/*.json`, `openapi.yaml`)          |
| `browser`     | nécessite l'extra `[browser]` (Playwright)                        |
| `cognition`   | nécessite l'extra `[cognition]` (anthropic, pillow)               |
| `vision`      | nécessite l'extra `[vision]` (grounder local optionnel : onnxruntime, opencv) |
| `slow`        | test lent, exclu des exécutions rapides                           |

Appliquer un marker au niveau module : `pytestmark = pytest.mark.unit`.

## Dépendances optionnelles

Le cœur reste léger ; Playwright, ONNX et le SDK Anthropic sont des extras. Un test qui exige un
extra **se skippe proprement** quand il est absent, via `importorskip`, **en plus** de porter le
marker correspondant :

```python
import pytest

pytestmark = pytest.mark.browser
playwright = pytest.importorskip("playwright")  # skip si l'extra [browser] n'est pas installé
```

Résultat : la suite reste verte sans dépendances lourdes. La CI n'installe que `.[dev]` ; les tests
`browser` / `cognition` / `vision` sont donc skippés. Un job dédié (installant l'extra + `playwright
install`) pourra les activer plus tard sans rien changer d'autre.

## Sondes réalistes

En complément de la suite automatisée et de l'exemple zéro config, chaque capacité livrée est
éprouvée à la main sur **une ou deux sondes réalistes plus dures** que le chemin nominal : un cas
dense ou ambigu (ex. désambiguïser une cible parmi vingt semblables), et si possible un cas
**conçu pour échouer** (cible absente, hors viewport, données piégées). L'objectif est d'éprouver
le comportement réel de fond en comble, pas seulement le contrat.

Règles :

- les sondes s'écrivent comme des Blueprints jetables (répertoire temporaire), sur des endpoints
  publics autorisés ; elles ne rejoignent `examples/` que si elles restent zéro config et stables ;
- un échec **propre** (erreur typée, message actionnable) est un résultat attendu, à consigner
  comme tel ; un comportement surprenant devient un correctif ou une « limite connue » documentée
  avant de clore le jalon ;
- le résultat des sondes (succès **et** échecs) se consigne dans la section « Tester … » de la doc
  de la capacité.

## Couverture

La couverture est **rapportée, pas bloquante** : tant que le cœur est au stade squelette, un seuil
serait du bruit. On relèvera la barre (ajout de `fail_under` dans `[tool.coverage.report]`) au fur
et à mesure que les Acts et le runtime sont implémentés.

## Contrats

Les contrats (`contracts/`) sont la source de vérité. `tests/contracts/` vérifie que le schéma de
Blueprint est un JSON Schema valide, que **chaque** exemple de `examples/` s'y conforme, que le
contrat OpenAPI du daemon est bien formé (et déclare les routes implémentées), et que les événements
d'un run **sérialisés** se conforment à `events.schema.json`. Toute évolution d'un contrat doit garder
ces tests verts.
