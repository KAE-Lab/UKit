# Le format Blueprint

Spécification faisant foi : [`contracts/blueprint.schema.json`](../contracts/blueprint.schema.json).
Exemples exécutables : [`examples/`](../examples/).

## Enveloppe

| Champ | Type | Rôle |
|-------|------|------|
| `aetherius` | string | Version du format (ex. `"1.0"`). |
| `name` | string | Identifiant pointé, ex. `domaine.tache`. |
| `act` | enum | `vector` \| `continuum` \| `oracle` \| `phantom`. |
| `inputs` | object | Paramètres typés (réutilisabilité). |
| `secrets` | string[] | Noms des secrets injectés au runtime, jamais stockés. |
| `vars` | object | Constantes locales. |
| `options` | object | `debug`, `stealth`, `session`, `timeout_ms`, `retries`, `fallback`. |
| `steps` | array | Le dictionnaire d'actions (ordonné). |
| `vision` | object | Configuration de cognition pour Oracle/Phantom (voir ci-dessous). |
| `goal` / `constraints` | string / string[] | Alternative haut-niveau pour Phantom. |
| `outputs` | object | Forme des données retournées via `{{ }}`. |

### `vision`

Configure le fournisseur de cognition des Acts cognitifs (le schéma accepte ces sous-champs via
`additionalProperties: true` — aucun changement de contrat) :

- `provider` : le backend — `claude` (défaut, extra `[cognition]`) ou `local` (extra `[vision]`,
  détecteur sur la machine) ;
- `model` : le modèle — id Anthropic (défaut `claude-opus-4-8`) ou nom d'asset local `nom@version`.

Détails et résolution : [docs/cognition.md](cognition.md).

## Ciblage : `selector` ou `target: {vision}`

Les actions interactives (`click`, `type`, `upload`, `hover`, `wait_for`) visent soit un
**sélecteur DOM** (`selector` + `selector_type` optionnel : `css`/`xpath`/`text` — résolu par
Continuum), soit une **description en langage naturel** résolue par grounding VLM (Act III+) :

```json
{ "action": "click", "selector": "#submit" }
{ "action": "click", "target": { "vision": "the Post button" } }
```

La forme imbriquée `target: {selector, selector_type}` est aussi acceptée. Un step qui porte à la
fois un sélecteur **et** une description vision est rejeté (cible ambiguë). Les steps ciblés par
vision acceptent `min_confidence` (défaut 0.5) et `scan` (défaut `true` : une cible hors du
viewport est cherchée en défilant la page, viewport par viewport et à coût borné ; `false` épingle
le step au viewport courant). Sémantique complète, seuil et coût :
[docs/acts/oracle.md](acts/oracle.md).

### `read` (extraction sémantique, Act III+)

`{"action": "read", "vision": "<description>", "schema": {...}}` lit l'écran et rend des données
structurées : avec `schema` (objet JSON Schema), les champs deviennent les sorties du step
(`{{ steps.x.<champ> }}`) ; sans, la valeur libre arrive sous `{{ steps.x.data }}`.

### `wait`

`{"action": "wait", "ms": 1000}` pour une pause fixe, ou `{"min_ms": 2000, "max_ms": 4500}` (sans
`ms`) pour une durée **aléatoire uniforme** dans l'intervalle — la pause non déterministe des
Blueprints furtifs, disponible sur tous les Acts.

## `act` par step (composition multi-Act)

L'`act` de l'enveloppe est le **défaut** du run ; tout step peut le surcharger avec son propre
champ `act` — mélanger du Continuum scripté, du ciblage vision Oracle et un step Phantom dans un
même run. Les steps imbriqués d'une action de flux **héritent** de l'act effectif du step
englobant (surchargeable au même titre). Les Acts navigateur (II/III/IV) partagent **un seul
navigateur** (même page, mêmes cookies, une seule discrétion) ; franchir la frontière
Vector↔navigateur est permis mais démarre l'autre moteur (aucun état partagé). La validation
vérifie chaque step contre son act **effectif**. Sémantique complète :
[docs/composition.md](composition.md).

```json
{ "id": "dom",    "action": "extract", "outputs": { "quote": { "selector": ".quote", "as": "text" } } },
{ "id": "screen", "act": "oracle", "action": "read", "vision": "the author of the first quote" }
```

## Self-healing : `describe` + `fallback`

Un step navigateur qui échoue (sélecteur cassé, cible introuvable) peut être **rejoué sur un Act
supérieur** au lieu d'avorter le run. Déclaratif et opt-in :

- `options.fallback` : la chaîne d'escalade par défaut, ordonnée (`["oracle"]` ou
  `["oracle", "phantom"]`) ;
- `fallback` par step : surcharge la chaîne (`[]` la désactive pour ce step) ;
- `describe` par step : l'**intention** en langage naturel, consommée par l'Act supérieur quand le
  sélecteur lâche. Sans `describe` (ni cible vision), pas d'escalade — l'intention n'est jamais
  devinée depuis un sélecteur cassé.

```json
"options": { "fallback": ["oracle"] },
"steps": [
  { "action": "click", "selector": "#next-btn", "describe": "the Next pagination link" }
]
```

L'escalade est **ponctuelle** : seul le step en échec est rejoué ; le suivant repart sur son act
déclaré (le chemin rapide). Un step guéri est un succès (`healed_by` dans son `StepResult`),
raconté par des événements `progress` de niveau `warning`. Actions couvertes, coût et limites :
[docs/composition.md](composition.md).

## Interpolation

La syntaxe `{{ ... }}` résout, au runtime, `inputs.*`, `secrets.*`, `vars.*`, `env.*` et les sorties
des steps précédents (`steps.<id>.<champ>`). Des filtres sûrs sont disponibles (ex. `add_days`).

Les `secrets` ne portent qu'un **nom** dans le Blueprint ; leur valeur est résolue au runtime depuis
l'environnement ou un `.env` local (jamais stockée dans le fichier). Voir [docs/secrets.md](secrets.md).

## Garde `when`

Tout step accepte un champ optionnel `when: "<expression>"`. Le moteur rend l'expression **avant**
de dispatcher le step et le **saute** si le résultat est faux — même règle de véracité que
`assert` : vrai si le rendu vaut `true`, `1` ou `yes` (insensible à la casse). Un step sauté
produit un `StepResult` de statut `skipped`, un événement `step_skipped`, et **n'écrit pas** de
sortie : y référer ensuite via `steps.<id>` est une erreur de template.

```json
{ "id": "alert", "action": "emit", "when": "{{ steps.check.in_stock | first }}", "message": "RESTOCK" }
```

## Actions de flux

Trois actions exécutent des **steps imbriqués** ; elles sont interprétées par le moteur (pas par
les drivers), donc disponibles à l'identique sur tous les Acts qui les déclarent :

| Action | Paramètres | Sémantique | Sorties |
|--------|------------|------------|---------|
| `if` | `condition`, `then` (steps), `else` (steps, optionnel) | Rend `condition` et exécute la branche correspondante. | `{"branch": "then"\|"else"\|null}` |
| `repeat` | `times` (entier, interpolable), `steps` | Exécute `steps` n fois (`0` = no-op). | `{"iterations": n}` |
| `for_each` | `items` (expression → liste), `as` (défaut `item`), `steps` | Exécute `steps` une fois par élément, la variable de boucle étant exposée au template le temps de l'itération. | `{"iterations": n}` |

Les sorties des steps vivent dans un espace **plat** (`steps.<id>`) : dans une boucle, chaque
itération écrase la précédente — dans le corps de l'itération, `steps.<id>` vaut la valeur
courante ; après la boucle, celle de la dernière itération. Les identifiants affichés (événements,
résultats) portent le chemin complet (`walk.each_user[2].announce`). Une erreur dans une branche
avorte le run, comme pour un step de premier niveau. La garde `when` s'applique aussi aux actions
de flux (un `when` faux saute le bloc entier).

## Validation

Deux niveaux : (1) schéma JSON (structure), (2) validation sémantique (`core/blueprint/validator.py`)
qui vérifie **récursivement** (branches `then`/`else`/`steps` comprises) que chaque `action` est
supportée par l'act **effectif** du step (`step.act`, hérité dans les branches, sinon l'act de
l'enveloppe — modèle de capabilities) et propose un Act supérieur si besoin. Les chaînes
`fallback` n'acceptent que les Acts d'escalade (`oracle`, `phantom`).
