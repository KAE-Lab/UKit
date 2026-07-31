# Jalon B — Réactivité et flux conditionnel

**Statut : livré.** La garde `when` et les actions `if`/`repeat`/`for_each` sont exécutées par
l'exécuteur récursif [`core/runtime/steps.py`](../../src/aetherius/core/runtime/steps.py),
**en amont des drivers** : le flux est interprété par le moteur pour tous les Acts (ensemble
déclaratif `FLOW_ACTIONS` dans [`core/actions/base.py`](../../src/aetherius/core/actions/base.py),
sorti de `PENDING_ACTIONS`), la validation descend récursivement dans les branches, et un step
sauté produit le statut `skipped` + l'événement `step_skipped` (contrats et SDK TypeScript à jour).
Choix retenus par rapport à la piste initiale : dispatch moteur plutôt que par-driver (aucun
changement dans Vector/Continuum, Oracle/Phantom hériteront du flux), et `repeat` étendu aux
capacités Vector (l'enum le déclare « Flow (all Acts) »). Référence d'usage :
[`docs/blueprint-schema.md`](../blueprint-schema.md) ; exemples exécutables :
[`jsonplaceholder-todo-alert`](../../examples/vector/jsonplaceholder-todo-alert.blueprint.json) et
[`jsonplaceholder-flow`](../../examples/vector/jsonplaceholder-flow.blueprint.json). Ce document
conserve la spécification d'origine du jalon.

## Objectif

Rendre un Blueprint capable de **réagir aux données extraites** (« si en stock → alerter ») et
d'**itérer**. Sans cela, l'alerte conditionnelle du cas fondateur est impossible.

## Deux niveaux, du plus léger au plus lourd

### 1. Garde d'étape `when` (léger, à livrer en premier)

Tout step accepte un champ optionnel `when: "<expression>"`. Le moteur l'évalue via le `renderer`
**avant** de dispatcher le step et **saute** le step si l'expression rend une valeur fausse (même
règle de véracité que `_assert` : `true`/`1`/`yes`). Un step sauté produit un `StepResult`
`SKIPPED` et un événement dédié.

Ceci seul suffit à l'alerte conditionnelle : `{"action": "notify", "when": "{{ steps.check.in_stock }}", ...}`.

### 2. Actions de flux `if` / `repeat` / `for_each` (lourd)

Exécution de **steps imbriqués** :
- `if` : `condition`, `then` (liste de steps), `else` (optionnel).
- `repeat` : `times`, `steps`.
- `for_each` : `items` (expression), `as` (nom de variable), `steps`.

## Fichiers à toucher

- [`core/runtime/engine.py`](../../src/aetherius/core/runtime/engine.py) — extraire de `RunEngine.run`
  la boucle de steps (aujourd'hui `for i, step in enumerate(blueprint.steps)`, lignes ~94-149) vers
  un exécuteur **récursif** `run_steps(steps, ctx, bus, driver, ...)` dans un nouveau
  `core/runtime/steps.py` (garder chaque fichier < 300 lignes). Les handlers de flux rappellent
  `run_steps` pour leurs branches. Le `when` se branche dans cet exécuteur, avant le dispatch.
- [`core/blueprint/models.py`](../../src/aetherius/core/blueprint/models.py) — déclarer `when: str | None`
  sur `StepModel` (le `model_config = extra="allow"` reste pour les params par action).
- [`contracts/blueprint.schema.json`](../../contracts/blueprint.schema.json) — ajouter `when` (string)
  au `$defs/step` ; formaliser `then`/`else`/`steps` comme tableaux de steps (le step est déjà
  `additionalProperties: true`, donc ajout rétrocompatible). Garder les exemples verts
  (`tests/contracts/`).
- [`core/runtime/result.py`](../../src/aetherius/core/runtime/result.py) — ajouter `RunStatus.SKIPPED`.
- [`core/actions/base.py`](../../src/aetherius/core/actions/base.py) — **retirer** `if`/`for_each`
  (vector) et `if`/`for_each`/`repeat` (continuum) de `PENDING_ACTIONS` une fois dispatchés.
- Dispatch : un handler de flux partagé (piste : étendre `SharedActionsMixin` dans
  [`acts/_shared.py`](../../src/aetherius/acts/_shared.py) ou un module `acts/_flow.py`) que Vector et
  Continuum appellent depuis leur `run_step`.
- **Tests anti-drift** : `tests/unit/acts/test_action_dispatch.py` et
  `tests/unit/core/actions/test_specs.py` doivent rester verts après avoir bougé les entrées de
  `PENDING_ACTIONS`.

## Bénéfice de bord (à signaler)

Débloque la limite connue de Continuum : « réutiliser une session déjà authentifiée attend l'action
`if` » (voir [docs/acts/continuum.md](../acts/continuum.md), section « Limites connues »). Une fois
`if` livré, mettre cette limite à jour.

## Points de conception

- **Le `when` est universel**, pas propre à `notify` : toute étape en profite. Ne pas ajouter de
  champ `when` par action.
- **Interpolation mid-run déjà disponible** : `ctx.step_outputs` et `render_value` exposent les
  sorties des steps précédents ; `for_each` doit exposer sa variable de boucle (`as`) dans le
  contexte de template le temps de l'itération.
- **Erreur dans une branche** : conserver la sémantique actuelle (une `AetheriusError` non gérée
  avorte le run), sauf décision explicite documentée.

## Plan de test

- Unitaires moteur : `when` vrai/faux (step exécuté / sauté), `if/then/else`, `repeat` (n fois),
  `for_each` sur une liste (variable de boucle correcte), imbrication, erreur dans une branche.
- Contrats : les exemples existants restent valides ; ajouter des exemples couvrant `when` et `if`.

## Exemple exécutable à livrer

Dans `examples/vector/` (zéro config, endpoint public) : un Blueprint qui extrait une valeur puis
`notify`/`emit` **conditionnellement** via `when`, plus un exemple `if`/`for_each`. Lançable depuis
`aetherius run` et la Console.

## Définition de terminé

Les 6 points de [CONTRIBUTING](../../CONTRIBUTING.md#définition-de--terminé-). En particulier : specs
`flow.py` mises à jour (retirer « not runnable yet »), docs `docs/acts/vector.md` et
`docs/acts/continuum.md` complétées, `make check` vert, flux vérifié à la main.

## Critères d'acceptation

Un step avec `when` faux est sauté (statut `skipped`) ; `if`/`repeat`/`for_each` exécutent leurs
steps imbriqués ; `PENDING_ACTIONS` ne liste plus ces actions ; aucune régression sur les Blueprints
linéaires existants.
