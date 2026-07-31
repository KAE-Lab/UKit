# Jalon A — Persistance durable (`store/`, SQLite)

**Statut : livré.** L'implémentation SQLite est en place dans
[`src/aetherius/store/`](../../src/aetherius/store/) ; les trois dépôts sont fonctionnels et plus
aucune opération ne lève de `NotImplementedError`. La **migration douce** (optionnelle) a été
réalisée : le daemon persiste l'historique de ses runs dans le store. Référence d'usage et schéma :
[`docs/store.md`](../store.md). Ce document conserve la spécification d'origine du jalon.

## Objectif

Un socle de stockage **durable** sous `~/.aetherius`, prérequis du scheduler (Jalon D), de
l'historique des runs et de la déduplication d'alertes (Jalon C). Premier vrai besoin d'état durable
du projet : le daemon est aujourd'hui 100 % en mémoire.

## Décision

**SQLite via la stdlib `sqlite3`** : un seul fichier portable (`settings.db_path`
→ `~/.aetherius/aetherius.db`), zéro dépendance nouvelle, sûr en concurrence sous WAL. Pas d'ORM, pas
de serveur — cohérent avec l'esprit « léger et portable ».

## Périmètre

**Inclus.** Connexion SQLite (mode WAL), création/migration du schéma, et trois dépôts typés :
schedules, historique des runs, état clé/valeur inter-run.
**Exclu.** L'usage de ces dépôts par le scheduler (Jalon D) et par `notify` (Jalon C) ; la migration
de l'UI/Console.

## Interfaces et fichiers

Déjà en place (à implémenter) :

- [`store/engine.py`](../../src/aetherius/store/engine.py) — `Store(db_path)` (ouvre la connexion +
  migrations), propriétés `schedules` / `runs` / `state`, `close()`, et `get_store()`
  (singleton `lru_cache` rooté sur `settings.db_path`).
- [`store/models.py`](../../src/aetherius/store/models.py) — `ScheduleRecord`, `RunRecord`
  (pydantic v2). `trigger` et `notify` restent des **dicts opaques** : le store les persiste tels
  quels ; seuls le scheduler et `notify` les interprètent.
- [`store/schedules.py`](../../src/aetherius/store/schedules.py) — `ScheduleRepository`
  (`create`, `get`, `all`, `update`, `delete`, `due(now)`, `mark_fired(id, next_run_at)`).
- [`store/runs.py`](../../src/aetherius/store/runs.py) — `RunRepository`
  (`record`, `recent(*, blueprint, schedule_id, limit)`, `get`).
- [`store/state.py`](../../src/aetherius/store/state.py) — `StateRepository`
  (`get`, `set`, `compare_and_set(scope, key, value) -> bool`). `compare_and_set` renvoie `True`
  **ssi** la valeur diffère de la précédente : c'est le signal de transition qui alimente la dédup
  d'alertes.

Déjà branché : [`config/settings.py`](../../src/aetherius/config/settings.py) expose `db_path`.

## Contrat / schéma

La table `schedules` doit pouvoir reconstruire un `ScheduleRecord` intégral (y compris `trigger` et
`notify` sérialisés en JSON). Indices utiles : `due()` interroge par `enabled` + `next_run_at`.
`RunRepository.recent` renvoie **du plus récent au plus ancien**, borné par `limit`.

## Points de conception à respecter

- **Concurrence.** Le daemon (boucle asyncio + threads de worker) et la CLI peuvent écrire en même
  temps : WAL + `PRAGMA busy_timeout`. Le moteur reste synchrone ; garder les accès store hors de la
  boucle si besoin (cf. `server/jobs.py` pour le pattern thread → boucle).
- **Migrations.** Prévoir une table `schema_version` (ou `user_version` PRAGMA) pour faire évoluer le
  schéma sans casser une base existante.
- **Le store ne dépend de rien du domaine** (ni scheduler, ni notify) : records opaques, couplage nul.

## Migration douce (optionnelle, à signaler)

Faire graduer l'historique en mémoire du daemon (`server/jobs.py`, `RunManager`) vers
`RunRepository.record` en fin de run. À faire proprement et sans régression, ou à laisser au Jalon D
si cela déborde — le documenter dans les deux cas.

## Plan de test

- Tests miroir `tests/unit/store/` sur une base **temporaire** (`tmp_path/aetherius.db`) : CRUD des
  schedules, `due()` avec des `next_run_at` passés/futurs, `recent()` (ordre + `limit` + filtres),
  `compare_and_set` (première écriture, valeur identique, transition).
- Aucun accès au vrai `~/.aetherius` en test (override `AETHERIUS_DATA_DIR`).

## Définition de terminé

1. Tests miroir écrits avec le code. 2. Doc `docs/store.md` (schéma, invariants, limites). 3. `make
check` vert. 4. Flux vérifié à la main : ouvrir une base, écrire/lire un schedule et un run. 5. Pas
d'exemple Blueprint dédié (composant infra) — mais l'exemple exécutable du Jalon D s'appuiera dessus.

## Critères d'acceptation

Un `Store` réel persiste schedules, runs et état ; survit à un redémarrage de process ; `get_store()`
renvoie un singleton fonctionnel ; les trois dépôts n'ont plus aucun `NotImplementedError`.
