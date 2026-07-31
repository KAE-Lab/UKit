# Jalon 2-C — Act IV Phantom (agent autonome)

**Statut : livré.** Doc définitive et « Tester Act IV » : [docs/acts/phantom.md](../acts/phantom.md).
Le plus lourd. Un agent décisionnel orienté **objectif** : plutôt qu'une séquence de steps, le
Blueprint décrit un `goal` et des `constraints`, et Phantom boucle **percevoir → raisonner → agir**
jusqu'à l'atteindre. Pour les objectifs non scriptés et la résilience maximale.

## Ce qui a été livré (résumé)

- `PhantomDriver(OracleDriver)` (`acts/phantom/`) : un seul navigateur/discrétion/provider hérités ;
  ajoute la boucle (`loop.py`), la mémoire (`memory.py`), l'adaptateur planner (`planner.py`).
- Seam moteur goal-only : `RunEngine.run` invoque `driver.run_goal(...)` quand `steps` est vide ;
  `phantom` dans `IMPLEMENTED_ACTS` + `_make_driver`.
- Planner Claude : `acts/_cognition/planning.py` (vocabulaire d'outils restreint, tool use forcé,
  `finish`/`abort`), branché via `ClaudeProvider.plan`.
- Contrat : `options.agent.max_steps` (modèle + schéma), garde validator « goal-only ⇒ phantom ».
  Observabilité par réutilisation de `progress`/`step_started`/`step_finished` (`step_id` `agent[N]`),
  **aucun nouvel `EventType`**.
- Exemple zéro config : `examples/phantom/quotes-find-author.blueprint.json`. Tests miroir (unités
  + intégration Chromium avec provider fake).

Le reste du document décrit la conception d'origine du jalon (conservée pour référence).

## Objectif

Exécuter un Blueprint `phantom` sans `steps` : le moteur invoque la boucle de l'agent, qui perçoit la
page (substrat 2-A), demande au **planner** (Claude par défaut) la prochaine action, la joue via le
ciblage vision de 2-B et la couche stealth, mémorise, et recommence — borné par un **budget de pas**
et les `constraints`.

## Dépendances

Requiert le **Jalon 2-A** (substrat : provider, perception). Réutilise fortement le **Jalon 2-B**
(ciblage vision + `read`) : le planner agit avec le même vocabulaire d'actions et la même résolution
de cible.

## Interfaces et fichiers

Déjà en place (stubs à implémenter) :

- [`acts/phantom/driver.py`](../../src/aetherius/acts/phantom/driver.py) —
  `PhantomDriver(SharedActionsMixin)`, `act = "phantom"`. `run_goal(ctx, bus)` : le seam invoqué par
  le moteur pour un Blueprint goal-only ; `run_step(...)` conservé pour le cas scripté-avec-fallback
  (2-D).
- [`acts/phantom/loop.py`](../../src/aetherius/acts/phantom/loop.py) — `run_loop(provider, ctx, bus,
  *, max_steps=40)` : la boucle bornée.
- [`acts/phantom/planner.py`](../../src/aetherius/acts/phantom/planner.py) — `next_action(planner,
  goal, constraints, perception, memory)` : adapte `CognitionProvider.plan` (tool-use Claude) en une
  action concrète (dict de step) ou `None` quand l'objectif est atteint.
- [`acts/phantom/memory.py`](../../src/aetherius/acts/phantom/memory.py) — `AgentMemory` (goal,
  history, facts) threadée dans la boucle.
- [`acts/phantom/perception.py`](../../src/aetherius/acts/phantom/perception.py) — seam de fusion
  DOM+a11y+vision au-dessus du substrat 2-A.

À créer / brancher :

- **Seam moteur pour goal-only** : le `RunEngine` invoque `driver.run_goal(...)` quand
  `blueprint.goal` est présent et `steps` est vide (aujourd'hui `run_steps([])` ne fait rien). Choix
  à figer ici : détection dans `engine.run` après `setup`, avant/à la place du pipeline de steps.
- **Enregistrement du driver** : `phantom` dans `IMPLEMENTED_ACTS` + `_make_driver`.
- **Événement de progression** (optionnel) : si un `agent_step` est nécessaire pour l'observabilité,
  l'ajouter à **la fois** dans [`contracts/events.schema.json`](../../contracts/events.schema.json)
  (enum fermé, `additionalProperties: false`) **et**
  [`core/events/models.py`](../../src/aetherius/core/events/models.py) `EventType`. Sinon réutiliser
  `PROGRESS`.

## Contrat

`goal`, `constraints`, `vision` sont **déjà** dans le schéma et les modèles
([`_require_steps_or_goal`](../../src/aetherius/core/blueprint/models.py) autorise un Blueprint
goal-only) — ce jalon est le **premier à les consommer**. Documenter le contrat d'un Blueprint
Phantom (objectif, garde-fous, `outputs`).

## Points de conception

- **Garde-fous non négociables** : budget de pas (`max_steps`), respect des `constraints`, et arrêt
  net sur objectif atteint. Un agent qui boucle sans fin est un bug, pas un mode.
- **Le planner reste pluggable** : `Planner` par défaut = Claude, mais un VLM local reste branchable
  derrière la même interface (comme le grounder d'Oracle).
- **Réutilisation, pas duplication** : la perception, le ciblage vision, l'action `read` et la couche
  stealth viennent de 2-A/2-B. Phantom n'ajoute que la *boucle de décision* et la *mémoire*.
- **Coût assumé** : Phantom fait plusieurs appels modèle par run (un par pas). C'est le prix de
  l'autonomie — d'où l'intérêt de garder Oracle (un appel par cible) pour les flux connus.

## Plan de test

- `run_loop` : avec un planner mocké renvoyant une séquence d'actions puis `None`, la boucle joue les
  actions, mémorise, et s'arrête ; un planner qui ne finit jamais est coupé par `max_steps`.
- `next_action` : mapping objectif+perception+mémoire → action (mock).
- `AgentMemory.record` : historique et facts accumulés correctement.
- Intégration Chromium (markers `browser` + `cognition`) : un objectif simple zéro config atteint.

## Exemple exécutable à livrer

Un objectif **zéro config** sur une page publique (ex. « sur `quotes.toscrape.com`, trouve la première
citation de l'auteur X et renvoie-la »). Doc [`docs/acts/phantom.md`](../acts/phantom.md) finalisée
avec sa section « Tester Act IV » et ses **limites connues** (coût, non-déterminisme, garde-fous).

## Définition de terminé

Les 6 points de [CONTRIBUTING](../../CONTRIBUTING.md#définition-de--terminé-) ; `phantom` runnable
(`IMPLEMENTED_ACTS` + `_make_driver` + seam goal-only) ; garde-fous testés (budget, arrêt sur
contrainte) ; `make check` vert (skips propres) ; un vrai run vérifié à la main.

## Critères d'acceptation

`aetherius run` sur un Blueprint `phantom` goal-only atteint l'objectif en un nombre borné de pas,
respecte les `constraints`, renvoie ses `outputs`, et s'arrête proprement ; le planner par défaut est
Claude, remplaçable par un VLM local.
