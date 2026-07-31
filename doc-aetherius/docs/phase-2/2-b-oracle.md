# Jalon 2-B — Act III Oracle (ciblage vision + extraction sémantique)

**Statut : livré.** Doc définitive : [docs/acts/oracle.md](../acts/oracle.md). Premier Act cognitif :
`oracle` est runnable — un **flux scripté** (comme Continuum) où les cibles sont des **descriptions
en langage naturel** résolues par le Grounder (`OracleDriver` étend le driver Continuum : même
navigateur, même discrétion), plus l'**extraction sémantique** `read`. Seuil de confiance et point
off-center dans `oracle/locator.py` ; les cibles hors viewport sont trouvées par **recherche par
défilement** (`oracle/scan.py`, bornée) ; `wait_for` par vision sonde l'écran ; exemples zéro
config `examples/oracle/quotes-vision-demo.blueprint.json` et `books-scan-below-fold.blueprint.json`
vérifiés en réel (Claude + Chromium).

## Objectif

Quand les sélecteurs sont fragiles, absents ou piégés, Oracle **regarde l'écran** : un
`CognitionProvider` (Claude par défaut) localise la cible décrite en langage naturel et Aetherius
**clique par coordonnées à travers le stealth**. Le flux reste **déterministe et peu coûteux** (un
appel de grounding par step ciblé) — c'est la différence nette avec Phantom (agent complet).

Cas fondateur : l'upload TikTok ([`examples/oracle/tiktok-upload.blueprint.json`](../../examples/oracle/tiktok-upload.blueprint.json)),
dont les steps utilisent déjà `target: {vision: "upload dropzone"}`.

## Dépendances

Requiert le **Jalon 2-A** (substrat cognition : provider, perception, `Target`, `click_at`).

## Interfaces et fichiers

Déjà en place (stubs à implémenter) :

- [`acts/oracle/driver.py`](../../src/aetherius/acts/oracle/driver.py) — `OracleDriver(SharedActionsMixin)`,
  `act = "oracle"`. **Compose** la `BrowserSession` de Continuum (même navigateur, même stealth,
  même sessions persistantes) plutôt que de la ré-implémenter.
- [`acts/oracle/locator.py`](../../src/aetherius/acts/oracle/locator.py) — `locate(grounder,
  perception, target)` : `Target` (vision) → `Box`.
- [`acts/oracle/perception.py`](../../src/aetherius/acts/oracle/perception.py),
  [`model.py`](../../src/aetherius/acts/oracle/model.py) — seams réutilisant le substrat 2-A (pas de
  perception ni de modèle bespoke).

À créer / brancher :

- **Résolution des cibles vision** : `OracleDriver.run_step` route `click`/`type`/`upload`/`hover`/
  `wait_for` : si le step porte `target: {vision}`, `perception.capture(page)` →
  `locator.locate(...)` → `HumanInput.click_at(box.center)`. Si le step porte un `selector` classique,
  déléguer au chemin Continuum (réutilisation directe des `PAGE_ACTIONS`/`HUMAN_ACTIONS`).
- **Action `read`** (extraction sémantique) : `{action:"read", vision:"la liste des prix",
  schema:{...}}` → `Extractor.read(perception, description, schema)` → sorties structurées relues via
  `{{ steps.x.<champ> }}`. C'est la brique « donner une info directement humaine ».
- **Câblage action** (parcours complet) : ajouter les capabilities vision au
  [`Capability` enum + `ACT_CAPABILITIES`](../../src/aetherius/core/actions/base.py) (Oracle cesse
  d'aliaser `_CONTINUUM_CAPS` et déclare son propre set) ; specs déclaratives dans une nouvelle
  famille `core/actions/vision.py` (agrégée par `registry.builtin_action_specs`) ; hint dans
  [`validator.py`](../../src/aetherius/core/blueprint/validator.py) ; dispatch dans le driver. Garder
  verts [`tests/unit/acts/test_action_dispatch.py`](../../tests/unit/acts/) et `test_specs.py` (une
  capability déclarée doit être dispatchée, interprétée par le moteur, ou listée `PENDING_ACTIONS`).
- **Enregistrement du driver** : ajouter `oracle` à `IMPLEMENTED_ACTS` et une branche dans
  `_make_driver` ([`engine.py`](../../src/aetherius/core/runtime/engine.py)). Adapter les tests qui
  affirment aujourd'hui « oracle non runnable » (catalog, CLI, library scan).

## Contrat

`contracts/blueprint.schema.json` : documenter la cible `target: {vision}` et l'action `read` (le step
reste `additionalProperties: true`, **aucun** changement de structure). Aucun nouvel event.

## Modèle & entraînement

**Pas de dataset ni de pipeline livré en Phase 2.** Le chemin par défaut est le grounding Claude. Le
grounder **local** (ONNX/VLM) reste optionnel, derrière `Grounder` ; [`training/README.md`](../../training/README.md)
est requalifié en piste **avancée/optionnelle**.

## Points de conception

- **Un seul navigateur, une seule discrétion** : Oracle n'ouvre pas son propre Chromium ; il réutilise
  `BrowserSession`. C'est ce qui rend la composition multi-Act (2-D) possible sans multiplier les
  navigateurs.
- **Déterminisme du flux** : Oracle ne « décide » rien — il exécute les steps dans l'ordre ; seule la
  *résolution de cible* est déléguée au modèle. Auditable, reproductible, un appel modèle par cible.
- **Clic off-center + humanizer** : `click_at` passe par la couche stealth (bande 30–70 %, timing
  humain), cohérent avec l'esprit d'Oracle (« discrétion first-class »).

## Plan de test

- Mapping `run_step` : un step `click` avec `target:{vision}` appelle `capture` → `locate` →
  `click_at` (page factice + provider mocké, sans navigateur).
- `read` : provider mocké renvoyant des données ; vérifier la mise en forme des sorties + le `schema`.
- Dispatch/capabilities : les deux tests anti-drift restent verts avec le nouveau set Oracle.
- Intégration Chromium (marker `browser` + `cognition`) : un vrai run zéro config qui clique une cible
  décrite en langage naturel.

## Exemple exécutable à livrer

Un cas **zéro config** sur une page publique autorisée (ex. `quotes.toscrape.com` : cliquer un élément
désigné par description, ou `read` d'une donnée décrite en langage naturel). Le TikTok reste un
**gabarit non exécutable** (compte/secrets), marqué comme tel. Doc [`docs/acts/oracle.md`](../acts/oracle.md)
réécrite (VLM, plus ONNX obligatoire) avec sa section « Tester Act III ».

## Définition de terminé

Les 6 points de [CONTRIBUTING](../../CONTRIBUTING.md#définition-de--terminé-) ; `oracle` runnable
(`IMPLEMENTED_ACTS` + `_make_driver`) ; `make check` vert (skips propres sans `[cognition]`) ; flux
vérifié à la main sur un vrai navigateur (une cible cliquée par vision, une donnée lue
sémantiquement).

## Critères d'acceptation

`aetherius run` sur un Blueprint `oracle` zéro config clique une cible décrite en langage naturel et
extrait une donnée par `read` ; le run réutilise un unique navigateur ; le grounding par défaut passe
par Claude, le grounder local reste une option.
