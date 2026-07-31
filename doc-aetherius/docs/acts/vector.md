# Act I — Vector (HTTP/API)

**Statut : implémenté et opérationnel** (`make check` vert, 69 tests).

Le plus léger. Client HTTP robuste (`httpx` + `tenacity`) : requêtes GET/POST, encodage form/JSON,
en-têtes, retries/backoff, pagination, auth (cookie, bearer, basic, form-login type CAS), extraction
déclarative JSON (JSONPath) et HTML (CSS/XPath).

Cas fondateur : les services `axios` de UKit (`PlanningApiService.ts`). Les constantes magiques
(`resType`, `colourScheme`) deviennent des `inputs`/`vars` explicites.

Modules : [`src/aetherius/acts/vector/`](../../src/aetherius/acts/vector/) —
`driver.py`, `client.py`, `auth.py`.

Exemple : [`examples/vector/ukit-planning-week.blueprint.json`](../../examples/vector/ukit-planning-week.blueprint.json).

**Recorder** : on peut générer un Blueprint Vector **par démonstration** — le recorder observe les
appels réseau du navigateur et pique les champs JSON à extraire. Voir
[docs/recorder.md](../recorder.md#vector-recorder-act-i--réseau).

## Actions supportées

| Action | Description |
|--------|-------------|
| `http.request` | Requête HTTP (GET/POST/…). Champs : `method`, `url`, `headers`, `form`, `json`, `params`, `expect.status`, `extract`. |
| `set` | Stocke une valeur dans le contexte du run. |
| `assert` | Vérifie une condition rendue ; lève `StatusAssertionError` si fausse. |
| `emit` | Émet un événement nommé sur le bus. |
| `wait` | Pause en millisecondes (rate limiting déclaratif). |
| `if` | Exécute la branche `then` ou `else` selon `condition` (steps imbriqués). |
| `repeat` | Exécute `steps` un nombre fixe de fois (`times`, interpolable). |
| `for_each` | Exécute `steps` une fois par élément de `items`, variable de boucle via `as`. |
| `notify` | Envoie une alerte (webhook, Discord, Telegram, ntfy). Champs : `channel`, `message`, `title`, `level`, `target`, `url`, `config` — voir [docs/notifications.md](../notifications.md). |
| `extract` | Déclaré mais en attente en step autonome (l'extraction vit dans `http.request`). |

Tout step accepte en plus la garde **`when`** (sauté si l'expression rend faux, statut `skipped`).
Sémantique détaillée et exemples : [docs/blueprint-schema.md](../blueprint-schema.md#garde-when).

## Flux conditionnel et itération

Le cas fondateur — n'alerter que si une condition extraite est vraie — s'écrit avec `when` :

```json
{ "id": "alert_done", "action": "emit", "when": "{{ steps.fetch.completed | first }}", "message": "TODO_DONE" }
```

`if`/`repeat`/`for_each` sont interprétés par le moteur (jamais par le driver) et peuvent
s'imbriquer librement ; la validation descend dans les branches. Exemples exécutables zéro
config : [`jsonplaceholder-todo-alert`](../../examples/vector/jsonplaceholder-todo-alert.blueprint.json)
(garde `when`) et [`jsonplaceholder-flow`](../../examples/vector/jsonplaceholder-flow.blueprint.json)
(`if` + `for_each`).

## Extraction

Le champ `extract` d'un step `http.request` accepte un dict de specs :

```json
"extract": {
  "events": {
    "from": "json",
    "path": "$[*]",
    "where": "item.eventCategory != 'Vacances'",
    "fields": {
      "id": "$.id",
      "start": "$.start",
      "category": "$.eventCategory"
    }
  }
}
```

- `from: "json"` → JSONPath via `jsonpath-ng`
- `from: "html"` → CSS/XPath via `parsel`
- `where` : expression de comparaison évaluée par AST-walk (seules les comparaisons, la logique booléenne et l'accès aux attributs de `item` sont autorisés ; appels, indexation et **attributs magiques** (`__class__`, `__globals__`, … tout nom en `__`) sont rejetés, fermant l'évasion de sandbox)
- `fields` : mapping nom → JSONPath relatif à chaque item matché

## Authentification

Configurée programmatiquement via `acts/vector/auth.py` :

| Stratégie | Description |
|-----------|-------------|
| `NoAuth` | Défaut, pas d'auth |
| `BearerAuth(token)` | Header `Authorization: Bearer ...` |
| `BasicAuth(user, pwd)` | HTTP Basic via `httpx.BasicAuth` |
| `CookieAuth(cookies)` | Injection de cookies dans le client |
| `CasFormLogin(url, user, pwd)` | GET login page → extrait champs cachés (parsel) → POST credentials → cookies capturés |

## Template engine

`{{ }}` Jinja2 `SandboxedEnvironment` + `StrictUndefined`. Filtres custom :

- `add_days(n)` — ajoute n jours à une date ISO 8601
- `sub_days(n)` — soustrait n jours
- `format_date(fmt)` — reformate avec `strftime`

Les expressions bare `{{ steps.week.events }}` retournent l'objet Python brut (pas sa
représentation string), ce qui préserve les listes et dicts dans le pipeline `outputs`.

## Tester Act I manuellement

```bash
# 1. Installer en mode éditable
make install-dev

# 2. Lancer la suite de tests
make test

# 3. Essai Python in-process (requiert une vraie API ADE ou un mock)
python3 - <<'EOF'
from aetherius import Aetherius
result = Aetherius().run(
    "examples/vector/ukit-planning-week.blueprint.json",
    inputs={"group": "MON_GROUPE", "monday": "2026-09-07"},
)
print(result.status)
print(result.outputs)
EOF
```

Voir aussi `tests/integration/test_vector_run.py` pour un exemple complet avec `httpx.MockTransport`.
