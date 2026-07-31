# Act IV — Phantom (agent autonome)

**Statut : livré (Phase 2, [Jalon 2-C](../phase-2/2-c-phantom.md)).** Le plus lourd. Un agent
décisionnel orienté **objectif** : plutôt qu'une séquence de `steps`, le Blueprint décrit un `goal`
et des `constraints`, et Phantom boucle **percevoir → raisonner → agir** jusqu'à l'atteindre. Pour
les objectifs non scriptés et la résilience maximale. Depuis le Jalon 2-D, la même boucle sert
aussi le **self-healing** en micro-objectif borné (`run_micro_goal`), et un step scripté peut
passer `act: "phantom"` (il se comporte alors comme Oracle) — voir
[docs/composition.md](../composition.md).

## Le contrat d'un Blueprint Phantom

Un Blueprint `phantom` déclare un **objectif**, pas des steps :

```json
{
  "aetherius": "1.0",
  "name": "quotes.phantom.find-author",
  "act": "phantom",
  "inputs": { "author": { "type": "string", "required": true, "default": "Albert Einstein" } },
  "goal": "On https://quotes.toscrape.com, find the first quote attributed to {{ inputs.author }}. Read the quote text and the author, then finish with {\"quote\": ..., \"author\": ...}.",
  "constraints": [
    "Stay on the quotes.toscrape.com domain.",
    "Do not log in or submit any form."
  ],
  "options": { "agent": { "max_steps": 12 } }
}
```

- **`goal`** (obligatoire pour Phantom) : l'objectif en langage naturel. Interpolé (`{{ inputs.x }}`,
  `{{ vars.x }}`, `{{ secrets.x }}`) avant d'être passé au planner. Un Blueprint **sans `steps`**
  exige `act: "phantom"` (le validator rejette clairement un goal-only sur un autre Act).
- **`constraints`** : des garde-fous en langage naturel, rappelés au planner à chaque tour. Le
  modèle est instruit d'`abort` si une contrainte interdit de continuer.
- **`options.agent.max_steps`** : le **budget de pas** (défaut 40, minimum 1). La boucle échoue
  proprement si l'objectif n'est pas atteint dans ce budget — un agent qui boucle sans fin est un
  bug, pas un mode.
- **`vision`** : le fournisseur de cognition, comme pour Oracle (`provider`/`model`, défaut Claude).
  Le même provider assure le grounding des cibles vision **et** le planning.
- **`outputs`** (optionnel) : la forme retournée, via `{{ steps.agent.* }}`. **Sans `outputs`
  déclarés**, le run renvoie directement le résultat de l'agent
  (`{"result": <payload de finish>, "steps_taken": N}`) — utile sans boilerplate.

Un Blueprint `phantom` **avec** `steps` reste valide et se comporte comme Oracle (chemin scripté,
socle de la composition multi-Act du [Jalon 2-D](../phase-2/2-d-composition.md)).

## La boucle percevoir → raisonner → agir

À chaque tour, borné par `max_steps` :

1. **Percevoir** — `capture()` du substrat fige la page ouverte (screenshot en pixels CSS + URL).
   La fusion DOM/arbre d'accessibilité est un seam en place (`phantom/perception.py`) mais **différée**
   (limite connue) : le screenshot est le canal principal d'un planner VLM.
2. **Raisonner** — le **planner** (Claude par défaut) reçoit l'objectif, les contraintes, un
   transcript compact de la mémoire et le screenshot courant, et **choisit un seul outil**
   (tool use forcé, `tool_choice: any`) : la prochaine action, ou un des deux outils terminaux.
3. **Agir** — l'action est jouée via le **ciblage vision d'Oracle** (un appel de grounding par
   cible) à travers la couche de discrétion, exactement comme un step Oracle.
4. **Mémoriser** — l'(action, observation) est enregistrée ; le planner en tient compte au tour
   suivant.

### Le vocabulaire du planner

La surface offerte au planner est **volontairement plus étroite** que le dictionnaire d'actions du
Blueprint : le ciblage se fait **uniquement par description vision** (jamais un sélecteur CSS que le
modèle inventerait), et il n'y a ni `evaluate`, ni `http.request`, ni flow, ni `notify`.

| Outil | Effet | Step produit |
|-------|-------|--------------|
| `navigate{url}` | Charge une URL | `navigate` |
| `back` | Page précédente | `back` |
| `click{target}` | Clique l'élément décrit | `click` (cible `{vision}`) |
| `type{target,text}` | Focus l'élément décrit puis saisit | `type` (cible `{vision}`) |
| `press{key}` | Appuie une touche | `press` |
| `scroll{dy}` | Défile verticalement | `scroll` |
| `wait{ms}` | Pause | `wait` |
| `read{description}` | Lit des données à l'écran | `read` (extraction sémantique) |
| `finish{result}` | **Objectif atteint** : `result` devient la sortie | — (arrêt succès) |
| `abort{reason}` | **Objectif impossible / contrainte violée** | — (arrêt échec propre) |

### Résilience : un échec d'action est une observation

Une action qui échoue (grounder pas assez confiant, `wait_for` en timeout, réponse du modèle
malformée) **n'arrête pas le run** : l'erreur est enregistrée comme une observation que le planner
voit au tour suivant, et il adapte sa stratégie. C'est la raison d'être de l'Act IV. Un tel échec
consomme quand même un pas du budget, donc un planner coincé sur la même action reste borné.

Seuls trois cas arrêtent la boucle : `finish` (succès), `abort` ou une réponse de planner
inutilisable (échec propre, `AgentError`), et le **budget épuisé** (échec propre : objectif non
atteint en `max_steps` pas).

## Planner

Par défaut **Claude** (`claude-fable-5` / `claude-opus-4-8`), via l'extra `[cognition]`
(`anthropic`) et le rôle `Planner` du substrat de cognition — **remplaçable par un VLM local**
derrière la même interface, comme le grounder d'Oracle (le provider `local` ne porte pas encore le
planning : `CognitionError` typée). Aucun appel modèle au niveau module : `anthropic` est importé
paresseusement. La clé moteur `ANTHROPIC_API_KEY` (env ou `.env`) est la même que pour Oracle — ce
n'est **pas** un secret de Blueprint.

## Observabilité

Chaque action jouée émet `step_started`/`step_finished` avec un `step_id` synthétique `agent[N]` et
produit un `StepResult` (y compris les échecs récupérés, en `failed`), plus un événement `progress`
qui résume la décision du planner. La Console et l'historique du daemon affichent donc le
déroulé de l'agent sans nouveau type d'événement.

## Coût

Phantom fait **plusieurs appels modèle par run** : un appel de planning par tour, plus un appel de
grounding par action ciblée par vision (≈ 2 appels modèle par action interactive). C'est le prix de
l'autonomie — d'où l'intérêt de garder **Oracle** (un appel par cible, flux scripté) pour les flux
connus.

## Modules

[`src/aetherius/acts/phantom/`](../../src/aetherius/acts/phantom/) — `driver.py`
(`PhantomDriver(OracleDriver)`, seam `run_goal`), `loop.py` (la boucle bornée), `planner.py`
(interprète `finish`/`abort`), `memory.py` (`AgentMemory` + transcript), `perception.py` (seam de
fusion). Le vocabulaire d'outils du planner et le mapping vers les steps vivent dans
[`acts/_cognition/planning.py`](../../src/aetherius/acts/_cognition/planning.py). Substrat partagé :
[`acts/_cognition/`](../../src/aetherius/acts/_cognition/).

Décision de conception : `PhantomDriver` **étend** `OracleDriver` (qui étend `ContinuumDriver`) —
un seul navigateur, une seule discrétion, une seule résolution de provider, le dispatch
vision/sélecteur hérité tel quel. Phantom n'ajoute que la *boucle de décision* et la *mémoire*.

## Installation

```bash
pip install "aetherius[cognition]"   # planner par défaut (Claude) + grounding
# + l'extra navigateur pour piloter une vraie page :
pip install "aetherius[browser]" && playwright install chromium
```

## Garde-fous (limites de conception)

- **Budget de pas** (`options.agent.max_steps`) : la seule limite dure. Objectif non atteint dans le
  budget = run `failed` avec un message explicite.
- **Respect des `constraints`** et arrêt net sur objectif atteint (`finish`).
- **Coût assumé** : plusieurs appels modèle par run (voir « Coût »).
- **Non-déterminisme** : deux runs peuvent différer ; à réserver aux objectifs réellement non
  scriptés. Pour un flux connu et reproductible, préférer Oracle.
- **Conflit objectif/contrainte** : une `constraint` prime toujours sur le `goal` — le planner ne la
  viole pas. En revanche, la *résolution* du conflit reste son jugement : selon les cas il `abort`
  (« objectif impossible sous cette contrainte ») ou termine avec un **résultat au mieux** qui
  respecte la contrainte. Vérifié en réel : objectif « aller page 5 » + contrainte « ne pas quitter
  la première page » → l'agent reste sur la première page (contrainte respectée) et termine avec la
  donnée disponible, sans jamais naviguer. Formuler des contraintes non ambiguës si l'on veut un
  `abort` franc.
- **Perception écran seule** : fusion DOM/a11y différée (seam en place). Le planner raisonne sur le
  screenshot + l'URL.
- **Planner local** : interface branchable, inférence non implémentée (comme le grounder local).

## Exemple

[`examples/phantom/quotes-find-author.blueprint.json`](../../examples/phantom/quotes-find-author.blueprint.json)
— objectif zéro config sur `quotes.toscrape.com` : « trouve la première citation de l'auteur X ».
Sans `outputs` déclarés (le résultat de l'agent est renvoyé tel quel). `--input author=...` pour
changer d'auteur.

## Tester Act IV

Cœur (sans extras, appels mockés) :

```bash
pytest tests/unit/acts/phantom tests/unit/core/runtime/test_engine_goal.py  # loop, mémoire, seam
pip install -e ".[cognition]" && pytest tests/unit/acts/cognition/test_claude.py  # planner Claude mocké
pip install -e ".[browser]"   && pytest tests/integration/test_phantom_run.py     # Chromium réel, provider fake
```

Le dernier prouve, sur un vrai Chromium, que le seam goal-only invoque `run_goal`, que la boucle
enchaîne des actions décidées par le planner sur la page réelle (le clic ciblé par vision navigue
vraiment), et que `finish` renvoie les `outputs`.

Run réel de bout en bout (clé `ANTHROPIC_API_KEY` en env ou `.env`, extras `[cognition]+[browser]`) :

```bash
aetherius run examples/phantom/quotes-find-author.blueprint.json
aetherius run examples/phantom/quotes-find-author.blueprint.json --input author="J.K. Rowling"
```

## Recorder *(à venir)*

Plutôt qu'un script, une **démonstration → `goal`** (on montre l'objectif, pas chaque step), branchée
comme un backend recorder (cf. [docs/recorder.md](../recorder.md#recorder--les-acts)).
