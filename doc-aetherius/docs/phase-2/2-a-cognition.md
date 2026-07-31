# Jalon 2-A — Substrat de perception & cognition

**Statut : livré.** Doc définitive : [docs/cognition.md](../cognition.md). Grounding et extraction
sémantique Claude réels (tool use forcé, mockés en CI), perception en pixels CSS,
`Target.from_step`, `HumanInput.click_at`/`type_at` vérifiés sur Chromium réel, extras
`[cognition]`/`[vision]` refondus. Fondation de la Phase 2 : l'interface partagée que consomment
Oracle (2-B) et Phantom (2-C). N'apporte **aucune capacité utilisateur seule** (comme le store
1.5-A) ; c'est la brique sans laquelle les deux Acts cognitifs dupliqueraient tout.

## Objectif

Poser, testé et typé, le **substrat** que les Acts navigateur cognitifs réutilisent :

1. un **fournisseur de cognition** abstrait (Claude par défaut, local optionnel) ;
2. une **perception** de page (capture + géométrie + DOM/a11y optionnel) ;
3. un **modèle de cible unifié** (`Target`) : sélecteur **ou** description vision ;
4. le **clic par coordonnées à travers le stealth**.

## Dépendances

Requiert l'**Act II — Continuum** (navigateur + stealth), déjà livré. Aucun autre jalon Phase 2.

## Interfaces et fichiers

Déjà en place (stubs d'interface à implémenter) :

- [`acts/_cognition/provider.py`](../../src/aetherius/acts/_cognition/provider.py) — protocoles
  `Grounder` / `Extractor` / `Planner`, le protocole composite `CognitionProvider`, la dataclass
  `GroundResult` (`box` + `confidence`).
- [`acts/_cognition/claude.py`](../../src/aetherius/acts/_cognition/claude.py) — `ClaudeProvider`
  (les trois rôles ; `anthropic` importé **paresseusement** dans les méthodes).
- [`acts/_cognition/local.py`](../../src/aetherius/acts/_cognition/local.py) — `LocalGrounder`
  (grounder ONNX/VLM local, optionnel ; `onnxruntime`/`cv2` importés paresseusement).
- [`acts/_perception.py`](../../src/aetherius/acts/_perception.py) — dataclass `Perception` +
  `capture(page, *, include_dom=False)`.
- [`core/runtime/selector.py`](../../src/aetherius/core/runtime/selector.py) — `Box` (avec `center`)
  et `Target` (`selector`/`selector_type`/`vision`, `is_vision`, `from_step`).
- [`models/registry.py`](../../src/aetherius/models/registry.py) — `resolve_provider(vision)`
  (défaut Claude ; cache d'assets locaux sous `models/store/`).

À créer / brancher :

- **Clic par coordonnées** : ajouter `click_at(x, y)` et `type_at(x, y, text)` à la façade
  [`HumanInput`](../../src/aetherius/stealth/humanizer/input.py), qui réutilisent
  `HumanMouse.move_to(x, y)` + `mouse.down()/up()` (bande de clic off-center déjà présente). C'est le
  **point le plus porteur** : sans lui, un Act cognitif ne peut pas « cliquer avec discrétion » par
  coordonnées.
- **Extras** dans [`pyproject.toml`](../../pyproject.toml) : introduire `[cognition]`
  (`anthropic`, `pillow`) comme défaut partagé ; repositionner `[vision]` comme grounder local
  optionnel ; mettre à jour `[all]` et les markers pytest.

## Contrat

Aucun changement des contrats `contracts/` (le substrat est **interne**). Le champ `vision` du
Blueprint gagne un sous-champ documenté `provider` (`claude` | `local`) ; le schéma l'autorise déjà
(`vision.additionalProperties: true`).

## Points de conception

- **Import léger préservé** : ni `anthropic`, ni `onnxruntime`, ni `cv2`, ni `playwright` au niveau
  module. Les providers les importent dans leurs méthodes ; `_perception.capture` reçoit une `Page`
  déjà ouverte par l'Act navigateur (typée sous `TYPE_CHECKING`).
- **Interface ségrégée (façon Stripe)** : trois rôles distincts, pas une méthode fourre-tout. Un
  provider local peut n'implémenter que `Grounder`.
- **Provider ≠ modèle** : `resolve_provider` choisit le *backend* (`claude`/`local`) ; `vision.model`
  nomme le *modèle* (id Anthropic, ou nom d'asset local `nom@version`).
- **Coordonnées en pixels CSS du viewport** : `Box`/`GroundResult` s'expriment dans le repère du
  viewport, cohérent avec les captures et `mouse.move`.

## Plan de test

- `Target.from_step` : parse `{selector}`, `{selector_type: "xpath"}`, `{target:{vision:"..."}}` ;
  rejette les cas ambigus (selector **et** vision).
- `Box.center` : géométrie (bords, non entiers).
- `ClaudeProvider` : test **mocké** (aucun appel réseau réel en CI) — le prompt de grounding est
  construit, la réponse simulée renvoie une `Box` plausible. Marker `cognition`, skip propre sans
  l'extra.
- `HumanInput.click_at` : sur une page factice, vérifier le passage par `HumanMouse.move_to` + le
  clic off-center (marker `browser`, intégration Chromium).

## Exemple exécutable à livrer

Aucun (fondation). Les exemples arrivent avec 2-B (Oracle) et 2-C (Phantom).

## Définition de terminé

Les 6 points de [CONTRIBUTING](../../CONTRIBUTING.md#définition-de--terminé-) applicables (pas
d'exemple exécutable ni de prise en main UI pour une fondation) ; `make check` vert **sans** les
extras `[cognition]`/`[vision]` (skips propres) ; `import aetherius` reste léger (vérifié).

## Critères d'acceptation

Un `CognitionProvider` mocké résout une description en `Box` ; `Target` distingue selector et vision ;
`HumanInput.click_at` clique par coordonnées à travers le humanizer ; aucune dépendance IA n'est
tirée par `import aetherius`.
