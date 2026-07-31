# Le daemon local + les SDK

Le cœur d'Aetherius est en Python. Pour le piloter **depuis n'importe quel langage**, un **daemon
local** (FastAPI) l'expose en HTTP + WebSocket, et un **SDK TypeScript** mince le consomme. Le
contrat langage-agnostique est la source de vérité : [`contracts/openapi.yaml`](../contracts/openapi.yaml)
(l'API) et [`contracts/events.schema.json`](../contracts/events.schema.json) (le flux d'événements) ;
l'implémentation (`src/aetherius/server/`) et les types des SDK s'y conforment.

```
┌─────────────┐   Blueprint + inputs + secrets    ┌──────────────────────────┐
│  App        │ ────────────────────────────────► │  Aetherius Daemon        │
│ (TS/Python) │        HTTP  +  WebSocket          │  (FastAPI)               │
│  SDK mince  │ ◄──────────────────────────────── │  RunEngine → Act I..IV   │
└─────────────┘   résultat + flux d'événements     └──────────────────────────┘
```

## Lancer le daemon

```bash
aetherius serve                       # 127.0.0.1:8787 par défaut
aetherius serve --host 127.0.0.1 --port 9000 --token s3cr3t
```

Les options priment sur l'environnement (`AETHERIUS_DAEMON_HOST` / `AETHERIUS_DAEMON_PORT` /
`AETHERIUS_DAEMON_TOKEN`). Le daemon **bind sur la loopback** : il sert les process locaux, jamais le
réseau. Le token est **optionnel** ; s'il est défini, chaque requête `/v1/*` doit le présenter en
`Authorization: Bearer <token>` (et le WebSocket via ce même en-tête ou un paramètre `?token=`).
`/health` n'exige jamais d'authentification (sonde de démarrage).

Depuis la **Console**, l'écran **Settings** démarre et arrête ce daemon sans quitter le terminal
(voir [console.md](console.md)). Le daemon lancé par la Console est **lié à la session** : il survit
à la navigation, mais s'arrête à la fermeture de la Console. Pour un daemon persistant, utiliser
`aetherius serve` dans son propre terminal.

Pour l'héberger **en continu (24/7)** sur un hôte toujours allumé — VPS, Raspberry Pi, NAS, afin que
les schedules tirent machine personnelle éteinte — suivre la recette de déploiement (Docker ou
systemd) : [deployment.md](deployment.md).

## L'API

| Route | Rôle |
|-------|------|
| `GET /health` | Sonde de disponibilité (non authentifiée) : `{status, version}`. |
| `POST /v1/runs` | Soumet un Blueprint (inline ou chemin) + `inputs`/`secrets`. Répond **202** avec `{run_id}`. |
| `GET /v1/runs/{id}` | Statut + résultat du run : `{run_id, status, outputs, error}`. |
| `WS /v1/runs/{id}/events` | Flux d'événements du run (voir ci-dessous). |
| `POST /v1/runs/{id}/decisions` | Livre une décision humaine à un run garé sur `confirm` (Jalon 2-E). Corps `{token, approved, value?}` ; **200** si livrée, **404** run inconnu, **409** rien en attente ou token invalide. Le run reste `running`. Voir [human-in-the-loop.md](human-in-the-loop.md). |
| `POST /v1/blueprints/validate` | Rapport de validation **non-levant** : `{valid, errors:[{path, message}]}`. |
| `GET /v1/schema` | Le JSON Schema du Blueprint. |
| `POST /v1/schedules`, `GET /v1/schedules[/{id}]`, `PATCH`/`DELETE /v1/schedules/{id}`, `POST /v1/schedules/{id}/run` | CRUD des schedules persistants + tir immédiat (Jalon 1.5-D) ; voir [scheduler.md](scheduler.md). |
| `POST /v1/recorder/sessions` | **501** : l'enregistrement est un flux host-local interactif, délibérément non exposé (voir plus bas). |

Le champ `blueprint` d'un run accepte un **objet** (validé en mémoire) ou une **chaîne** (chemin que
le daemon résout sur disque). Une erreur **structurelle** échoue tout de suite en `422` ; une erreur
**sémantique** (Act non supporté, input requis manquant) apparaît au run comme un run `failed`,
exactement comme en in-process.

### Vocabulaire de statut

Le daemon parle son propre cycle de vie — `queued` → `running` → `succeeded` / `failed` — distinct du
`RunStatus` du moteur (`success` / `failed` / `partial`) : le premier décrit un **job** sur le daemon,
le second l'**issue** d'un Blueprint. Le pont se fait à la frontière (`server/schemas.py::to_daemon_status`).

## Le flux d'événements (WebSocket)

Chaque run émet des événements (`progress`, `step_started`, `step_finished`, `debug`, `artifact`,
`error`, `done`) conformes à [`events.schema.json`](../contracts/events.schema.json). À la connexion,
le daemon **rejoue l'historique** bufferisé du run puis diffuse les événements **live** jusqu'à `done`,
avant de fermer. Le flux est donc fiable quel que soit le moment où le client se connecte — tôt, en
cours, ou après la fin (simple rejeu). C'est la façon la plus simple d'**attendre la fin** d'un run :
le SDK consomme le flux jusqu'à sa fermeture, puis lit `GET /v1/runs/{id}` comme source de vérité du
résultat.

### Sous le capot

`RunEngine.run()` est **synchrone et bloquant** ; chaque run s'exécute donc sur un **thread** de
worker pendant que le daemon reste réactif. Les événements franchissent la frontière thread → boucle
asyncio via `loop.call_soon_threadsafe` — le **même pattern Sink** que la Console (voir
[console.md](console.md) § pattern Sink), ici vers un historique en mémoire + les abonnés WebSocket
plutôt que vers un widget. Toute la mutation d'état d'un job se fait sur le thread de la boucle, sans
verrou (`server/jobs.py::RunManager`).

Le **flux d'événements live** reste en mémoire (il ne concerne qu'un run en cours), mais le
**résultat final** de chaque run est désormais persisté dans le [store](store.md) (Jalon 1.5-A) : il
survit à un redémarrage et devient lisible via `RunRepository`. L'écriture se fait hors de la boucle
(`asyncio.to_thread`) et en mode « best-effort » — une défaillance du store n'interrompt jamais le run
ni son flux. Un run tiré par le scheduler porte en plus son lien `schedule_id` (Jalon 1.5-D).

Au démarrage, le lifespan FastAPI **charge d'abord les plugins** (Jalon 1.5-E,
`aetherius.plugins.load_plugins()`, entry-points loggés) pour que les actions et canaux tiers
soient visibles des runs comme de la validation des schedules — voir [plugins.md](plugins.md).

Le daemon héberge aussi le **scheduler** (Jalon 1.5-D) : le lifespan FastAPI démarre un
`SchedulerService` (`app.state.scheduler`) qui, toutes les `scheduler_tick_seconds` (30 s par
défaut, env `AETHERIUS_DAEMON_SCHEDULER_TICK_SECONDS`), relit les schedules dus dans le store et
les soumet via le même `RunManager.submit` — un run planifié est indiscernable d'un run manuel. À
l'arrêt, la boucle de tick est annulée mais les suivis de fin (alertes) sont attendus. Détails :
[scheduler.md](scheduler.md).

## Le SDK TypeScript — `@aetherius/client`

Client mince pour Node 20+. Il **spawn** un daemon local automatiquement (ou cible un daemon déjà
lancé via `baseUrl`), exécute un Blueprint et streame ses événements. Détails et options :
[`sdks/typescript/README.md`](../sdks/typescript/README.md).

```ts
import { Aetherius } from "@aetherius/client";

const client = new Aetherius();
try {
  const result = await client.run("blueprints/ukit-planning-week.blueprint.json", {
    inputs: { group: "TP-A1", monday: "2026-09-07" },
    onEvent: (event) => console.log(event.type, event.message ?? ""),
  });
  console.log(result.status, result.outputs);
} finally {
  await client.close(); // arrête le daemon spawné
}
```

Les types publics (`types.ts`, `events.ts`) sont écrits à la main : la surface est petite et cela
garde des types ergonomiques (camelCase, callback de streaming) découplés des formes de fil. Ils
restent alignés sur `contracts/` (`RunStatus`, `RunEventType` conformes) ; un test de contrat côté
Python garde le schéma d'événements honnête.

## Le SDK Python

Python reste **in-process** : la façade `aetherius.Aetherius().run(...)` exécute un Blueprint sans
daemon (voir [`sdks/python/README.md`](../sdks/python/README.md)). Un client **remote** mince (piloter
le daemon depuis Python, à parité avec le SDK TS) est un ajout **différé** : simple à faire plus tard
(`httpx` est déjà une dépendance), non requis pour ce jalon.

## L'enregistrement (recorder) : volontairement host-local

`POST /v1/recorder/sessions` renvoie **501**. L'enregistrement d'un Blueprint est un flux
**interactif et local à l'hôte** : un navigateur visible piloté par démonstration, qui produit un
fichier. Le modéliser sur du HTTP sans état serait un mauvais choix. L'endpoint reste **réservé** dans
le contrat ; pour enregistrer, utiliser `aetherius record` ou le Recorder de la Console (voir
[recorder.md](recorder.md)).

## Tester le daemon

Un Blueprint d'auto-test **zéro réseau, zéro extra** sert de sonde de bout en bout :
[`examples/vector/daemon-selftest.blueprint.json`](../examples/vector/daemon-selftest.blueprint.json)
(actions `set`/`emit` uniquement).

```bash
aetherius serve &                                     # démarre le daemon
curl -s localhost:8787/health                          # {"status":"ok","version":"..."}

# Soumettre le self-test (chemin résolu par le daemon) et lire le résultat
RUN=$(curl -s -X POST localhost:8787/v1/runs \
  -H 'Content-Type: application/json' \
  -d '{"blueprint":"examples/vector/daemon-selftest.blueprint.json","inputs":{"subject":"daemon"}}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["run_id"])')
curl -s localhost:8787/v1/runs/$RUN                     # status: succeeded, outputs.greeting: "hello, daemon"
```

Côté SDK TS, `make test-ts` **spawn le vrai daemon** et exécute ce self-test de bout en bout (le test
se skippe proprement si le paquet Python n'est pas importable). Côté Python, `tests/integration/
test_daemon_run.py` couvre toutes les routes via le `TestClient` (HTTP + WebSocket), de façon
déterministe. Voir [testing.md](testing.md).
