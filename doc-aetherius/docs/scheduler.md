# Scheduler — rejouer un Blueprint à heure fixe ou par intervalle

Le scheduler (Phase 1.5, Jalon D) rejoue un Blueprint de façon **persistante et observable** :
« vérifier tous les jours à minuit et 3h, alerter au retour en stock ». Il vit **dans le daemon**
([`src/aetherius/server/scheduler/`](../src/aetherius/server/scheduler/)) — un seul processus,
multiplateforme, pas de délégation au cron de l'OS — et s'appuie sur les jalons précédents : les
schedules et l'historique vivent dans le [store](store.md) (Jalon A), les alertes passent par la
couche [notifications](notifications.md) (Jalon C).

```
CLI aetherius schedule ──► store (SQLite) ◄── daemon (tick toutes les 30 s)
API /v1/schedules      ──►                     │
                                               ├─► RunManager.submit (mêmes événements,
                                               │   même historique qu'un run manuel)
                                               └─► politique notify (failure/success/always/change)
```

## Un schedule

Un schedule référence un Blueprint (chemin), ses `inputs`, ses `secrets` (**noms seulement**,
résolus au tir — voir [secrets.md](secrets.md)), un `trigger`, une politique `notify`, un `enabled`.
Persisté en `ScheduleRecord` ; `trigger` et `notify` sont les deux dicts opaques du store, dont le
scheduler est le seul interprète.

### Le trigger

| Kind | Champs | Sémantique |
|------|--------|------------|
| `cron` | `expr` | Expression cron à 5 champs, évaluée dans le **fuseau local** de l'hôte (`0 0,3 * * *` = minuit et 3h locales ; les DST sont absorbés via le fuseau IANA résolu par `tzlocal`). |
| `interval` | `seconds` | Un tir toutes les `seconds` secondes, ancré sur le moment du tir précédent. |
| `at` | `when` | Un tir unique à l'instant ISO donné (interprété en local si naïf) ; le schedule s'épuise ensuite (`next_run_at = null`). |

Tout est **stocké en UTC** : le store ordonne `next_run_at` en texte ISO-8601, correct uniquement
sous une convention temporelle homogène (voir [store.md](store.md) § Invariants).

### Les tirs manqués (misfire)

Un daemon local n'est pas toujours allumé. Au réveil, les schedules en retard au-delà d'une **fenêtre
de grâce** (2 × la période de tick, soit 60 s par défaut) passent par leur politique, portée par le
dict `trigger` (`"misfire": …`) :

- `run_once` (défaut) — coalesce le retard en **un** tir de rattrapage ;
- `skip` — ne tire pas, recale simplement la prochaine échéance ;
- `run_all` — rejoue chaque créneau manqué (plafonné à 100, les plus récents survivent).

La résolution est faite par le tick lui-même : pas de phase spéciale au démarrage, le premier tick
rattrape naturellement. En deçà de la fenêtre de grâce, un retard est un tir normal (le tick est la
résolution temporelle du scheduler).

### La politique d'alerte (`notify`)

`{"channel": …, "target": …, "config": {…}, "on": …}` — dict vide = pas d'alerte. `channel` est un
kind du registre de notifications (`webhook`, `discord`, `telegram`, `ntfy`, plus les plugins du
Jalon E). `target`/`config` acceptent `{{ secrets.x }}`, rendu au tir avec les secrets du schedule :
les adresses de canal ne sont **jamais persistées**. `on` :

- `failure` (défaut) — alerte quand le run n'est pas `success` (`partial` compte comme échec) ;
- `success` / `always` ;
- `change` — alerte seulement quand les **outputs d'un run réussi diffèrent** du tir précédent
  (`state.compare_and_set`, scope = id du schedule — voir [notifications.md](notifications.md)
  § Déduplication). Les runs échoués n'alertent pas et ne déplacent pas la référence : un échec
  transitoire ne fabrique jamais de fausse « transition ».

Un échec d'alerte (secret manquant, canal cassé, livraison) est **contenu** : loggé
(`aetherius.scheduler`), jamais fatal au tick ni au run.

## CLI

```bash
aetherius schedule add stock-watch \
  --blueprint examples/vector/books-restock-notify.blueprint.json \
  --cron "0 0,3 * * *" \
  --notify ntfy --notify-target "{{ secrets.ntfy_topic }}" --notify-on change \
  --secret ntfy_topic

aetherius schedule list            # id, nom, trigger, enabled, next/last run
aetherius schedule run stock-watch # tir immédiat, in-process (cadence intacte)
aetherius schedule pause stock-watch
aetherius schedule resume stock-watch   # la cadence repart de maintenant
aetherius schedule rm stock-watch
```

- **La CLI écrit directement dans le store** ; le daemon relit `due()` à chaque tick. Ajouter,
  suspendre ou supprimer marche donc daemon allumé **ou éteint** — aucun client IPC.
- `add` échoue vite : trigger invalide, politique inconnue ou Blueprint illisible sont rejetés à
  l'écriture. Le chemin du Blueprint est **résolu en absolu** pour être indépendant du cwd du daemon.
- Exactement un déclencheur parmi `--cron` / `--every SECONDES` / `--at ISO` ; `--misfire`,
  `--input k=v`, `--secret NOM`, `--notify-config k=v` (canaux multi-clés) en options ;
  `--disabled` crée en pause.
- Les commandes acceptent l'**id ou le nom** (si unique).
- `run` exécute in-process (comme `aetherius run`) mais consigne le run avec son `schedule_id` et
  applique la politique d'alerte ; il ne touche ni `next_run_at` ni `last_run_at`.

## API

| Route | Rôle |
|-------|------|
| `POST /v1/schedules` | Crée (201, `next_run_at` calculé). Trigger/notify invalides → 422. |
| `GET /v1/schedules` | Liste complète. |
| `GET /v1/schedules/{id}` | Un schedule (404 sinon). |
| `PATCH /v1/schedules/{id}` | Édition partielle. `enabled: true` (reprise) ou trigger modifié → `next_run_at` recalculé depuis maintenant (une pause n'est jamais « rattrapée »). |
| `DELETE /v1/schedules/{id}` | Suppression (204). |
| `POST /v1/schedules/{id}/run` | Tir immédiat : 202 + `{run_id}`, à suivre comme n'importe quel run (WebSocket, `GET /v1/runs/{id}`). Cadence intacte. |

Contrat : [`contracts/openapi.yaml`](../contracts/openapi.yaml) (schemas `Trigger`, `NotifyPolicy`,
`Schedule*`), gardé par `tests/contracts/`. Auth bearer identique au reste de la surface `/v1`.

## Depuis la Console

L'écran **Schedules** (`aetherius` → Home → Schedules) offre la parité avec la CLI et l'API :
liste avec statut et prochains tirs, pause/reprise, suppression confirmée, **détail** avec
l'historique des runs du schedule et un tir manuel aux événements streamés en direct, et un
**formulaire guidé** de création/édition (inputs du Blueprint en champs, secrets affichés avec
leur état `.env`, trigger et politique d'alerte validés à la sauvegarde). Le tir manuel de la
Console passe par la même brique in-process que `aetherius schedule run`
(`server/scheduler/manual.py::fire_schedule`) : historique, alertes et cadence obéissent aux mêmes
règles. Depuis **Library**, la touche `s` planifie le Blueprint surligné (formulaire prérempli).
Prise en main illustrée : [docs/console.md](console.md) § Schedules.

## Sous le capot

- **`SchedulerService`** démarre avec le daemon (lifespan FastAPI, `app.state.scheduler`) et tick
  toutes les `scheduler_tick_seconds` (30 s par défaut, env `AETHERIUS_DAEMON_SCHEDULER_TICK_SECONDS`
  — utile en démo/test). Chaque tick interroge `store.schedules.due(now)` sur un thread worker : la
  boucle asyncio n'attend jamais SQLite.
- **Un run planifié est indiscernable d'un run manuel** : soumis via `RunManager.submit`
  (mêmes événements WebSocket, même historique durable), avec en plus le lien `schedule_id` dans le
  `RunRecord`.
- **Idempotence des tirs** : `next_run_at` est avancé (`mark_fired`) **avant** la soumission — un
  tick qui chevauche ne peut pas rejouer le même créneau.
- **Suivi de fin** : une tâche « follower » attend la fin de chaque run soumis puis applique la
  politique notify (hors boucle) ; à l'arrêt du daemon, les followers sont attendus, pas annulés —
  une alerte due part avant l'extinction.
- **Un schedule cassé se voit** : Blueprint disparu/invalide au tir → run `failed` consigné dans
  l'historique + politique `failure` appliquée. Un trigger corrompu en base (édition manuelle :
  CLI et API valident à l'écriture) → schedule **désactivé** avec log, plutôt qu'une erreur chaude
  à chaque tick.

## Tester le scheduler

Démonstration zéro configuration avec
[`examples/vector/quotes-watch.blueprint.json`](../examples/vector/quotes-watch.blueprint.json)
(première citation de quotes.toscrape.com) et une alerte visible sur l'écho public httpbin :

```bash
aetherius schedule add quotes-watch \
  --blueprint examples/vector/quotes-watch.blueprint.json \
  --every 60 \
  --notify webhook --notify-target https://httpbin.org/post --notify-on always

AETHERIUS_DAEMON_SCHEDULER_TICK_SECONDS=5 aetherius serve
# toutes les ~60 s : un run part (log uvicorn), s'ajoute à l'historique, l'alerte est POSTée

aetherius schedule list                    # next/last run avancent
aetherius schedule run quotes-watch        # tir immédiat sans attendre le créneau
```

Arrêter le daemon quelques minutes puis le relancer : le schedule a survécu (store durable) et le
retard est rattrapé en un tir (`run_once`). Pour une vraie alerte téléphone, remplacer le webhook
par `--notify ntfy --notify-target "{{ secrets.ntfy_topic }}" --notify-on change` (topic dans
`.env`, voir [notifications.md](notifications.md)).

## Limites connues

- **Un seul daemon par store** : rien n'arbitre deux daemons pointés sur le même fichier SQLite
  (chacun tirerait… une seule fois par créneau grâce à `mark_fired`-avant-soumission, mais lequel
  tire n'est pas défini). Le déploiement visé est mono-nœud (Jalon F).
- **La granularité est le tick** (30 s par défaut) : un cron « à la seconde près » n'est pas un
  objectif.
- La politique `change` compare le **JSON trié des outputs** : un Blueprint dont les outputs
  contiennent un champ volatil (horodatage, compteur) alertera à chaque run — exposer des outputs
  stables, ou dédier un Blueprint à la surveillance.
- `aetherius schedule run` et le **Fire now** de la Console exécutent dans leur propre processus
  (pas via le daemon) : un tir manuel peut donc chevaucher un tir planifié du daemon. Le tir via
  API (`POST /v1/schedules/{id}/run`) passe, lui, par le daemon.

## Tests

Miroir : [`tests/unit/server/scheduler/`](../tests/unit/server/scheduler/) (triggers avec bords
DST/fin de mois sous `TZ=Europe/Paris`, misfire, service avec store temporaire et RunManager
factice, politique d'alerte) ; [`tests/unit/test_cli_schedule.py`](../tests/unit/test_cli_schedule.py)
(CLI sur store isolé) ; [`tests/integration/test_daemon_schedules.py`](../tests/integration/test_daemon_schedules.py)
(CRUD API, tir manuel, boucle de tick réelle via TestClient).
