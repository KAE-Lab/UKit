# Act II — Continuum (navigateur scripté)

**Statut : implémenté et opérationnel.** Le moteur suit le Blueprint à la lettre contre un vrai
navigateur Playwright : navigation, remplissage, clics, attentes, extraction DOM, JS injecté. Pour
les scénarios exigeant un navigateur (login, session, contenu rendu par JS). Discrétion optionnelle,
désormais **branchée** (voir [Discrétion](#discrétion)).

Cas fondateur : la WebView cachée de UKit (`WebBrowserScreen.tsx`, `CredentialsContext.tsx`) qui
scrape la scolarité après login CAS. Les sélecteurs, autrefois codés en dur dans du JS injecté,
deviennent des données du Blueprint ; les événements (`LOGIN_SUCCESS`, `PROGRESS`, …) sont émis par
le bus.

Modules : [`src/aetherius/acts/continuum/`](../../src/aetherius/acts/continuum/) —
`driver.py` (dispatch + screenshot), `browser.py` (cycle de vie Playwright), `actions.py` (mapping
action → opération page), `bridge.py` (extraction DOM, `wait_for`, `evaluate`).

Exemples : [`examples/continuum/`](../../examples/continuum/) — dont
[`quotes-scrape`](../../examples/continuum/quotes-scrape.blueprint.json) (le plus simple),
[`quotes-login`](../../examples/continuum/quotes-login.blueprint.json) (login + session),
[`quotes-js-render`](../../examples/continuum/quotes-js-render.blueprint.json) (contenu JS),
[`books-catalog`](../../examples/continuum/books-catalog.blueprint.json) (extraction + screenshot),
et le cas fondateur [`ukit-scolarite-login`](../../examples/continuum/ukit-scolarite-login.blueprint.json).

## Installation

L'Act II est un extra ; le cœur reste léger.

```bash
pip install "aetherius[browser]"     # installe Playwright
playwright install chromium          # télécharge le navigateur
```

Un Blueprint `continuum` lancé sans l'extra échoue avec une `DependencyError` claire (message +
commande d'installation), jamais avec un `ImportError` brut.

## Architecture

Le driver est **synchrone**, comme le moteur (`RunEngine.run()`) et comme Vector : on utilise l'API
**synchrone** de Playwright (`sync_playwright`), sans event-loop à gérer. Depuis la Console, le
moteur tourne dans un worker `@work(thread=True)` (pas la boucle asyncio Textual), donc l'API sync
fonctionne. `playwright` est importé **paresseusement** dans `BrowserSession.start()` : `import
aetherius` reste léger et sans dépendance navigateur.

Les actions Act-agnostiques (`emit`, `wait`, `set`, `assert`, `notify`) sont fournies par
[`acts/_shared.py`](../../src/aetherius/acts/_shared.py) (`SharedActionsMixin`), partagé avec
Vector — aucune duplication.

## Actions supportées

| Action | Description | Champs |
|--------|-------------|--------|
| `navigate` | Charge une URL. | `url`, `wait_until` (défaut `load`) |
| `back` / `forward` / `reload` | Historique de navigation. | — |
| `click` | Clique une cible. | `selector`, `selector_type` |
| `fill` | Remplit un champ (efface puis écrit). | `selector`, `value` |
| `type` | Frappe caractère par caractère. | `selector`, `text`, `delay_ms` |
| `press` | Touche clavier (cible ou global). | `key`, `selector` (optionnel) |
| `select` | Sélectionne une/des option(s). | `selector`, `value`/`values` |
| `hover` | Survole une cible. | `selector` |
| `scroll` | Scroll vers une cible, ou par delta. | `selector`, ou `dx`/`dy` |
| `upload` | Renseigne un input file. | `selector`, `file` |
| `drag` | Glisser-déposer. | `source`/`from`, `target`/`to` |
| `screenshot` | Capture (page ou élément) écrite dans le run dir + événement `artifact`. | `name`, `selector`, `full_page` |
| `evaluate` | Exécute du JS injecté ; renvoie `{ result }`. | `script`/`expression`, `arg` |
| `wait_for` | Attend un sélecteur. | `selector`, `state` (défaut `visible`), `timeout_ms`, `on_timeout` |
| `extract` | Lit le DOM vivant vers des outputs typés. | `outputs` (voir plus bas) |
| `emit`, `wait`, `set`, `assert` | Hérités du core (mixin partagé). | cf. [Act I](vector.md) |
| `notify` | Alerte multi-canaux (mixin partagé), voir [docs/notifications.md](../notifications.md). | `channel`, `message`, `title`, `level`, `target`, `url`, `config` |
| `if` / `repeat` / `for_each` | Flux conditionnel et itération (steps imbriqués), interprétés par le moteur. | `condition`/`then`/`else`, `times`/`steps`, `items`/`as`/`steps` |

Tout step accepte aussi la garde **`when`** (sauté si l'expression rend faux). Sémantique :
[docs/blueprint-schema.md](../blueprint-schema.md#garde-when).

### Cibles et sélecteurs

`selector` est **CSS** par défaut ; `selector_type` bascule en `xpath` ou `text` (via
`page.get_by_text`). Le préfixe `xpath=` est ajouté automatiquement si besoin.

### `wait_for` et l'échec nommé

`wait_for` attend qu'un sélecteur atteigne un état. En cas de dépassement, si `on_timeout` vaut
`"fail:CODE"`, le step lève une `StepTimeoutError` portant `code=CODE` (ex. `LOGIN_FAILED`) ; le
moteur émet alors un événement `error` et clôt le run en échec avec ce code.

### Extraction DOM

Le step `extract` mappe des noms vers des lectures typées du DOM :

```json
{
  "id": "dossier",
  "action": "extract",
  "outputs": {
    "firstName": { "selector": ".identity .firstname", "as": "text" },
    "unread":    { "selector": ".unread-count", "as": "number" },
    "avatar":    { "selector": "img.avatar", "as": "attr", "attr": "src" },
    "rows":      { "selector": "table tr", "as": "count" }
  }
}
```

`as` : `text` (nettoyé), `number` (premier nombre trouvé, int ou float), `html` (inner HTML),
`attr` (requiert `attr`), `count` (nombre de correspondances). Les valeurs se relisent ensuite via
`{{ steps.dossier.firstName }}` dans `outputs`.

**Listes et tableaux.** Deux formes lisent *plusieurs* éléments (utilisées par le
[recorder](../recorder.md#le-menu-flottant--sélectionner-les-données-à-scraper)) :

```json
{
  "action": "extract",
  "outputs": {
    "tags":   { "selector": ".tag", "as": "list", "item": "text" },
    "quotes": {
      "each": ".quote",
      "fields": {
        "text":   { "selector": ".text",   "as": "text" },
        "author": { "selector": ".author", "as": "text" }
      }
    }
  }
}
```

- `as: "list"` → la liste des valeurs de **tous** les matches du `selector` ; `item` fixe le type de
  chaque élément (`text` par défaut, ou `number`/`attr`).
- **records** (`each` + `fields`) → une **liste d'objets** : pour chaque conteneur répétitif matché
  par `each`, chaque champ est lu par un sélecteur **relatif au conteneur**. La forme d'un tableau.

## Debug

`options.debug: true` transforme le run en démonstration observable :

- **fenêtre visible** (Chromium non-headless) ;
- **ralenti** : un délai (`slow_mo`, 500 ms) avant chaque action, pour suivre le fil ;
- **curseur + point rouge** : un overlay injecté
  ([`debug_overlay.py`](../../src/aetherius/acts/continuum/debug_overlay.py)) affiche un curseur qui
  suit la souris et une **onde rouge à chaque clic**, réinstallé à chaque navigation ;
- **fenêtre maintenue** quelques secondes en fin de run (et sur échec), pour lire l'état final au
  lieu de la voir se refermer aussitôt.

Hors debug, le run est headless et silencieux. L'overlay est un pur outil de debug, sans rapport avec
la couche de discrétion (qui, elle, cherche l'inverse : masquer l'automatisation).

## Sessions

- `options.session.persist: true` → contexte **persistant** Playwright sur un profil résolu par
  [`stealth/session/store.py`](../../src/aetherius/stealth/session/store.py)
  (`data_dir/profiles/<profile>`), réutilisant cookies, cache et historique entre runs. Sinon
  contexte éphémère.
- `data_dir` est configurable via `AETHERIUS_DATA_DIR`
  ([`config/settings.py`](../../src/aetherius/config/settings.py)).

## Secrets (logins)

Un login lit ses identifiants via `{{ secrets.x }}`, résolus au runtime depuis l'environnement ou un
fichier `.env` local — jamais écrits dans le Blueprint. Mécanisme complet : [docs/secrets.md](../secrets.md).
Exemple réel et exécutable : [`bordeaux-cas-login`](../../examples/continuum/bordeaux-cas-login.blueprint.json)
(login CAS de l'Université de Bordeaux, identifiants dans `.env`).

## Discrétion

`options.stealth` active la couche de discrétion transverse, orthogonale à l'Act. `BrowserSession`
reçoit la `StealthPolicy` assemblée : elle applique un profil de fingerprint (options de contexte +
patches injectés) et, si des entrées sont humanisées, expose un `HumanInput`. Le driver route alors
`click`/`hover`/`fill`/`type`/`scroll` vers cette couche quand la policy le demande ; sinon les
actions Playwright brutes restent utilisées (aucune régression quand `stealth` est `"off"`, le
défaut). Détails, composants et limites : [docs/stealth.md](../stealth.md). Exemple exécutable :
[`quotes-stealth`](../../examples/continuum/quotes-stealth.blueprint.json).

## Limites connues

- **Réutilisation de session : possible mais non éprouvée.** L'action `if` étant livrée (jalon
  1.5-B), un Blueprint peut désormais **détecter** l'état de session et ne dérouler le login que si
  nécessaire : `extract`/`evaluate` sur un marqueur de la page (avatar, formulaire absent), puis
  `if` avec les steps `fill`/`click` dans `then`. Le pattern reste à éprouver sur un vrai profil
  persistant authentifié ; à défaut, le **login à froid** (contexte éphémère) reste l'approche
  fiable à chaque run.

## Notes de conception

- **`wait_for` attend le premier match (`.first`).** Attendre concerne la *présence* : un sélecteur
  qui matche plusieurs éléments est normal et ne doit pas déclencher le strict-mode de Playwright. À
  l'inverse, les actions (`click`, `fill`, …) **gardent** le strict-mode : agir sur une cible
  ambiguë est une erreur à signaler, pas à masquer silencieusement.
- **Actions utilitaires partagées.** `emit`/`wait`/`set`/`assert` viennent du `SharedActionsMixin`
  commun à Vector et Continuum — une seule implémentation, pas de duplication.
- **Suivi des nouveaux onglets.** Un clic ouvrant un onglet (`target="_blank"`, `window.open`) fait
  de la nouvelle page la page active : les steps suivants s'y appliquent au lieu de rester bloqués sur
  l'onglet d'origine. Si l'onglet actif se referme (popup transitoire), la session retombe sur la
  dernière page encore ouverte. Le humanizer est repointé sur la nouvelle page au passage.

## Tester Act II

Exemples réels, exécutables depuis le terminal (fenêtre visible car `debug: true`) :

```bash
aetherius run examples/continuum/quotes-scrape.blueprint.json        # scrape simple, zéro config
aetherius run examples/continuum/bordeaux-cas-login.blueprint.json   # login réel, secrets via .env
```

… ou depuis la Console (`aetherius` → Library → Run). Suite automatisée :

```bash
pip install -e ".[browser,dev]" && playwright install chromium
make test-browser
```

Les tests unitaires du mapping (`tests/unit/acts/continuum/`) tournent **sans** navigateur (page
factice via `unittest.mock`) et restent dans la CI de base ; l'intégration
(`tests/integration/test_continuum_run.py`, marker `browser`) exécute un vrai Chromium et n'est
active que lorsque l'extra `[browser]` est présent (skip propre sinon).
