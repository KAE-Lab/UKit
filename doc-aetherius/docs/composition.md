# Composition multi-Act & self-healing

Jalon 2-D. Fait tomber la contrainte « un Act par Blueprint » : un step peut surcharger l'act du
run (`act` par step), et un step navigateur qui échoue peut être **rejoué sur un Act supérieur**
(`describe` + `fallback`) au lieu d'avorter le run. Spécification d'origine :
[docs/phase-2/2-d-composition.md](phase-2/2-d-composition.md) ; champs du format :
[docs/blueprint-schema.md](blueprint-schema.md).

## `act` par step

L'act de l'enveloppe reste le **défaut** ; un step le surcharge avec son propre champ `act` :

```json
{
  "act": "continuum",
  "steps": [
    { "action": "navigate", "url": "https://quotes.toscrape.com/" },
    { "id": "dom",    "action": "extract", "outputs": { "q": { "selector": ".quote .text", "as": "text" } } },
    { "id": "screen", "act": "oracle", "action": "read", "vision": "the author of the first quote" }
  ]
}
```

Règles :

- les steps imbriqués d'une action de flux (`if`/`repeat`/`for_each`) **héritent** de l'act
  effectif du step englobant, et peuvent le surcharger à leur tour ;
- la validation vérifie chaque step contre son act **effectif** (une action Oracle-only comme
  `read` passe sur un step `act: "oracle"` même si l'enveloppe est `continuum`, et le message
  d'erreur suggère la surcharge quand elle manque) ;
- baisser l'act est permis (un step `act: "vector"` dans un run navigateur) — utile pour un appel
  API au milieu d'un flux navigateur.

### Un seul navigateur

L'invariant central : les Acts navigateur (II/III/IV) d'un même run partagent **une seule
`BrowserSession`** — même page, mêmes cookies, une seule couche de discrétion. L'implémentation
s'appuie sur la chaîne d'héritage des drivers (`PhantomDriver` ⊃ `OracleDriver` ⊃
`ContinuumDriver`, conçue pour ça aux jalons 2-B/2-C) : le moteur pré-scanne l'arbre de steps
(surcharges `act` et chaînes `fallback` comprises) et instancie **une seule** instance du plus
haut Act navigateur atteignable, qui sert les trois indifféremment — un step `continuum` traverse
un `OracleDriver` à l'identique, le chemin vision ne s'activant que sur `target: {vision}` ou
`read` (`core/runtime/drivers.py`). Les drivers démarrent **à la demande** (au premier step qui
les réclame ; celui de l'act de l'enveloppe démarre en tête de run, comme avant) et sont tous
fermés en fin de run.

Conséquences honnêtes, à connaître :

- un run qui *peut* atteindre Oracle/Phantom (un step `act`, une chaîne `fallback`) résout sa
  configuration de cognition dès le démarrage du navigateur — déclarer un fallback vision suppose
  l'extra `[cognition]` (et la clé moteur) même si l'escalade ne se déclenche jamais ;
- **Vector ↔ navigateur** : la frontière est un changement de moteur. Un step `act: "vector"`
  dans un run navigateur (ou l'inverse) démarre l'autre moteur, sans état partagé entre les deux
  (les cookies du navigateur ne « passent » pas dans le client HTTP) ;
- le mode `debug`, la `session`, le `stealth` et le `proxy` restent des options **de run** : le
  navigateur partagé est configuré une fois, pas par step.

## Self-healing (`describe` + `fallback`)

Quand un site change un sélecteur, le step échoue — hier, le run mourait. Avec une chaîne
d'escalade déclarée, le moteur rejoue **l'intention** du step sur l'Act supérieur, dans l'ordre,
et ne propage l'échec d'origine que si toute la chaîne échoue :

```json
{
  "act": "continuum",
  "options": { "fallback": ["oracle", "phantom"] },
  "steps": [
    {
      "action": "click",
      "selector": "#next-page-button-legacy",
      "describe": "the Next pagination link at the bottom of the quotes list"
    }
  ]
}
```

- **`options.fallback`** : chaîne par défaut du run, ordonnée, entrées ∈ {`oracle`, `phantom`}.
- **`fallback` par step** : surcharge la chaîne (`[]` la désactive pour ce step).
- **`describe`** : l'intention en langage naturel. **Sans `describe`** (ni cible vision), il n'y a
  pas d'escalade — deviner l'intention depuis un sélecteur cassé serait imprévisible ; le moteur
  émet un événement explicite et laisse l'échec se propager. Décision de conception assumée.

### Les deux formes d'escalade

| Act | Mécanique | Coût |
|-----|-----------|------|
| `oracle` | Rejoue le **même step** en ciblage vision : `selector` → `target: {vision: describe}`. `fill` devient un `type` vision (le fill par vision n'existe pas, volontairement). Paramètres pertinents transportés (`text`/`value`, `file`, `timeout_ms`/`on_timeout`, `min_confidence`, `scan`). | 1 appel de grounding (+ scan éventuel) |
| `phantom` | Donne l'intention comme **micro-objectif** à la boucle percevoir→raisonner→agir, budget serré (6 actions) : l'agent peut fermer une popup, défiler, puis cliquer — ce qu'un simple rejeu vision ne sait pas faire. | quelques appels planner, seulement après l'échec des entrées précédentes |

Actions couvertes : `click`, `hover`, `type`, `fill`, `upload`, `wait_for` (rejeu vision). Le
micro-objectif Phantom se limite aux intentions que le vocabulaire du planner sait exprimer —
`click`, `type`/`fill`, `wait_for` ; `hover`/`upload` s'arrêtent à Oracle. Les autres actions
(`extract`, `navigate`, `evaluate`, …) ne se guérissent pas : pour l'extraction, la voie prévue
est un step `act: "oracle"` + `read` explicite. Un step déjà ciblé par vision (act `oracle`)
n'escalade que vers `phantom`, sa description servant d'intention.

### Sémantique d'un step guéri

- L'escalade est **ponctuelle, jamais collante** : seul le step en échec est rejoué ; le step
  suivant repart sur son act déclaré (le chemin rapide et bon marché).
- Un step guéri est un **succès** : un seul `StepResult` (statut `success`), champ `healed_by`
  portant l'Act sauveur, durée couvrant toutes les tentatives. Ses sorties sont celles du rejeu.
- Le récit complet passe par des événements `progress` de niveau `warning` (échec → tentative →
  guérison ou épuisement) — **aucun nouveau type d'événement**. Ces warnings sont le signal
  qu'un Blueprint mérite d'être corrigé (le sélecteur est mort) ; le healing maintient le run en
  vie, il ne remplace pas la maintenance.
- Une escalade Phantom trace ses actions d'agent en `StepResult`s dédiés (`<step>.heal[N]`).
- Si toute la chaîne échoue, l'**erreur d'origine** se propage telle quelle : sans `fallback`, le
  comportement d'hier est inchangé au bit près.

### Limites connues

- Le rejeu vision exige que la cible soit **visible à l'écran** (ou atteignable par le scan) : un
  élément dans un shadow DOM fermé mais hors écran restera introuvable.
- L'escalade Phantom d'un `type`/`fill` inclut le **texte rendu** dans le micro-objectif envoyé au
  planner (l'agent en a besoin pour agir) : ne pas mettre un fallback `phantom` sur un step qui
  tape un secret — l'escalade `oracle`, elle, ne transmet jamais le texte au modèle (il est tapé
  localement).
- `wait_for` guéri par Phantom vérifie la **visibilité perçue** (« confirme que X est visible »),
  pas la présence DOM.
- La chaîne s'évalue au moment de l'échec : les entrées non strictement supérieures à l'act
  effectif du step sont ignorées.

## Exemples exécutables

Deux Blueprints zéro config dans [`examples/composition/`](../examples/composition/) (extras
`[cognition]`+`[browser]`, clé `ANTHROPIC_API_KEY` dans l'environnement ou `.env`) :

- [`quotes-mixed-read.blueprint.json`](../examples/composition/quotes-mixed-read.blueprint.json) —
  run Continuum (navigate + extract DOM) dont le dernier step passe `act: "oracle"` pour un `read`
  sémantique ; un seul navigateur pour les deux.
- [`quotes-selfheal-click.blueprint.json`](../examples/composition/quotes-selfheal-click.blueprint.json) —
  un `click` au sélecteur volontairement cassé, rattrapé par `options.fallback: ["oracle"]` grâce
  à son `describe`, puis la suite du run repart sur Continuum.

## Tester la composition

```bash
pip install -e ".[cognition,browser]" && playwright install chromium
# clé moteur dans l'environnement ou .env : ANTHROPIC_API_KEY=sk-ant-...

aetherius run examples/composition/quotes-mixed-read.blueprint.json
aetherius run examples/composition/quotes-selfheal-click.blueprint.json
```

Attendu : le premier run rend `first_quote`/`quote_count` (DOM) et `author`/`tags` (vision) ; le
second journalise l'échec du sélecteur (`progress` warning « self-healing: click failed … »), le
rejeu vision, puis atteint la page 2 (`page2_first_quote`). Les tests miroir
(`tests/unit/core/runtime/test_drivers.py`, `test_healing.py`, `test_steps.py`,
`tests/unit/core/blueprint/test_validator.py`) couvrent le routage, la subsomption navigateur, les
règles d'escalade et la non-régression sans extras.

### Résultats des sondes réalistes (2026-07-19, Chromium + Claude réels)

Voir [docs/testing.md](testing.md#sondes-réalistes) pour la règle. Trois sondes jouées à la
clôture du jalon, Blueprints jetables sur quotes.toscrape.com :

- **Nominal instrumenté** — sélecteur cassé + `fallback: ["oracle"]` : événements
  `warning` (« click failed on 'continuum', replaying on 'oracle' as … ») puis `info` (« step
  healed by 'oracle' ») ; `StepResult` du step en `success` avec `healed_by="oracle"` ; les deux
  runs d'exemple aboutissent (run mixte : 6,2 s ; self-healing : 22,2 s dont 8 s de timeout du
  sélecteur cassé et le scan vision).
- **Chaîne épuisée** (cible inexistante « the purple unicorn checkout button »,
  `fallback: ["oracle", "phantom"]`, `scan: false`) — échec **propre et explicable** à chaque
  étage : le Grounder refuse (« confidence 0.00 < 0.50 »), le micro-objectif Phantom **aborte en
  expliquant** (« There is no purple unicorn checkout button on this page … »), puis l'erreur
  d'origine (`Locator.click: Timeout 3000ms exceeded`) se propage exactement comme sans fallback.
- **`describe` absent** — un seul événement warning (« self-healing skipped: the step carries no
  'describe' … ») et l'échec d'origine inchangé. Aucune inférence tentée, comme spécifié.
