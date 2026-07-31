# Store — persistance durable

Le store est le socle d'état **durable** d'Aetherius : un seul fichier SQLite portable sous
`~/.aetherius/aetherius.db` (chemin exposé par [`config/settings.py`](../src/aetherius/config/settings.py)
via `db_path`, surchargé par `AETHERIUS_DATA_DIR`). Il porte trois besoins qui doivent **survivre à un
process** : les schedules, l'historique des runs et un état clé/valeur inter-run. Bâti sur la stdlib
`sqlite3` — zéro dépendance, un fichier unique, sûr en concurrence sous WAL. Introduit par le
Jalon 1.5-A ; il est le prérequis du scheduler (Jalon D) et de la déduplication d'alertes (Jalon C).

Implémentation : [`src/aetherius/store/`](../src/aetherius/store/).

## API publique

```python
from aetherius.store import get_store, ScheduleRecord, RunRecord

store = get_store()                     # singleton, rooté sur settings.db_path
store.schedules.create(ScheduleRecord(...))
store.runs.record(RunRecord(...))
changed = store.state.compare_and_set("scope", "key", "valeur")
```

- `Store(db_path)` ouvre la connexion (WAL + migrations) et expose trois dépôts : `.schedules`,
  `.runs`, `.state`. `close()` ferme la connexion.
- `get_store()` renvoie le singleton du process (`lru_cache`), construit sur `settings.db_path`.
- `ScheduleRecord` / `RunRecord` (pydantic v2) sont les lignes durables. `trigger` et `notify` restent
  des **dicts opaques** : le store les persiste tels quels (JSON) ; seuls le scheduler et `notify` les
  interprètent — le store ne dépend d'aucun code du domaine.

### Dépôts

- **`ScheduleRepository`** — `create`, `get`, `all`, `update`, `delete`, `due(now)`,
  `mark_fired(id, next_run_at)`. `due(now)` renvoie les schedules **activés** dont `next_run_at` est
  ≤ *now*, triés par échéance. `mark_fired` estampille `last_run_at` (maintenant) et `next_run_at`
  (la prochaine échéance, ou `None` une fois le déclencheur épuisé).
- **`RunRepository`** — `record`, `get`, `recent(*, blueprint, schedule_id, limit=50)`. `recent`
  renvoie **du plus récent au plus ancien**, borné par `limit`, filtrable par Blueprint ou schedule.
- **`StateRepository`** — `get`, `set`, `compare_and_set(scope, key, value)`. `compare_and_set`
  écrit la valeur et renvoie `True` **ssi** elle diffère de la précédente : c'est le **signal de
  transition** (rupture → retour en stock) qui permet d'alerter une seule fois par changement.

## Schéma

Trois tables, versionnées par `PRAGMA user_version` (DDL et migrations dans
[`store/schema.py`](../src/aetherius/store/schema.py)). Version courante : **1**.

| Table | Colonnes | Index |
|---|---|---|
| `schedules` | `id` (PK), `name`, `blueprint`, `inputs`, `secrets`, `trigger`, `notify`, `enabled`, `created_at`, `next_run_at`, `last_run_at` | `(enabled, next_run_at)` pour `due()` |
| `runs` | `run_id` (PK), `blueprint_name`, `status`, `schedule_id`, `error`, `outputs`, `started_at`, `finished_at` | `started_at`, `blueprint_name`, `schedule_id` |
| `state` | `scope`, `key`, `value`, PK `(scope, key)` | — |

Encodage : les champs dict/list (`inputs`, `secrets`, `trigger`, `notify`, `outputs`) sont du **JSON**
en colonnes `TEXT` ; les `datetime` sont des chaînes **ISO-8601** ; `enabled` un entier 0/1. La
reconstruction repasse par pydantic (`Model(**row)`), qui parse les dates et coerce `enabled`.

### Migrations

Chaque version est une liste d'instructions appliquée dans **une transaction** (le DDL SQLite est
transactionnel), puis `user_version` est incrémenté. `apply_migrations` ne rejoue que les versions
manquantes : une base existante se met à jour sans jamais réexécuter une étape déjà appliquée. Faire
évoluer le schéma = **ajouter** une migration, jamais modifier une migration livrée.

## Invariants et concurrence

- **WAL + `busy_timeout`.** La connexion s'ouvre en `journal_mode=WAL` avec un `busy_timeout`, pour
  que le daemon (boucle asyncio + threads worker) et la CLI puissent lire/écrire le même fichier. Les
  lecteurs ne bloquent pas ; seuls deux écrivains concurrents s'attendent, dans la limite du timeout.
- **`check_same_thread=False`.** Le daemon persiste ses runs depuis un thread worker
  (`asyncio.to_thread`) ; la connexion unique est partagée entre threads, la sérialisation est confiée
  à SQLite.
- **`compare_and_set` est atomique.** Lecture et écriture partagent un `BEGIN IMMEDIATE` : deux
  appelants concurrents ne peuvent pas observer tous les deux l'ancienne valeur et courir la
  transition.
- **Secrets jamais persistés.** `ScheduleRecord.secrets` ne stocke que des **noms** ; les valeurs sont
  résolues au moment du tir (voir [secrets.md](secrets.md)).
- **Comparaison temporelle.** `due()` compare `next_run_at` comme texte ISO-8601 ; l'ordre est correct
  à condition d'écrire des datetimes de **convention temporelle homogène** (le scheduler travaille en
  UTC). Écrire des dates avec des fuseaux mélangés fausserait la comparaison.

## Migration douce du daemon

Le daemon persiste désormais le **résultat** de chaque run dans `RunRepository` en fin d'exécution
(voir [`server/jobs.py`](../src/aetherius/server/jobs.py) et [daemon.md](daemon.md) § Sous le capot).
L'écriture se fait hors de la boucle (`asyncio.to_thread`), **avant** la fermeture du flux, et en mode
best-effort : une défaillance du store n'interrompt jamais le run. Le flux d'événements *live* reste,
lui, en mémoire. Le lien `schedule_id` reste `None` pour les runs manuels ; le scheduler
(Jalon 1.5-D) le renseigne pour les runs qu'il tire — c'est lui aussi qui consomme `due()`,
`mark_fired` et l'état inter-run (`compare_and_set`) pour la dédup d'alerte (voir
[scheduler.md](scheduler.md)).

## Limites

- Pas d'ORM ni de serveur : SQLite fichier, un seul nœud. Le partage multi-machine (déploiement
  distribué) n'est pas un objectif de ce jalon.
- La concurrence visée est **faible** (un daemon local + la CLI) ; le store ne prétend pas encaisser
  une charge d'écriture élevée.
- Le store ignore la sémantique de `trigger` et `notify` : leur validation appartient au scheduler et
  à `notify`.

## Tests

Tests miroir sur base temporaire (`tmp_path/aetherius.db`, aucun accès au vrai `~/.aetherius`) :
[`tests/unit/store/`](../tests/unit/store/). La persistance de bout en bout via le daemon est couverte
par [`tests/integration/test_daemon_run.py`](../tests/integration/test_daemon_run.py).
