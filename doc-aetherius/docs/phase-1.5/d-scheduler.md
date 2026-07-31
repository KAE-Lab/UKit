# Jalon D — Scheduler intégré au daemon

**Statut : livré.** Triggers (`cron`/`interval`/`at`), misfire, `SchedulerService` (boucle de tick
dans le lifespan du daemon), politique d'alerte par schedule, routes `/v1/schedules` et CLI
`aetherius schedule …` sont implémentés dans
[`src/aetherius/server/scheduler/`](../../src/aetherius/server/scheduler/),
[`server/routes/schedules.py`](../../src/aetherius/server/routes/schedules.py) et
[`cli/schedule.py`](../../src/aetherius/cli/schedule.py) (le module `cli.py` est devenu le package
`cli/`, sans changement de comportement). Choix retenus par rapport à la piste initiale :

- **La politique `misfire` voyage dans le dict `trigger`** (`{"misfire": "skip", …}`) : pas de
  migration de schéma, le store garde ses dicts opaques. Résolue par le tick lui-même au-delà d'une
  fenêtre de grâce (2 × tick) — pas de phase spéciale au démarrage.
- **La politique d'alerte vit côté scheduler** (`scheduler/alerts.py`), pas via `NotifySink` : elle
  ajoute `on: "change"` (dédup `state.compare_and_set`, scope = id du schedule) que le sink, sans
  état, ne peut pas porter. Mêmes primitives `build_channel` + `dispatch`. Le registre notify gagne
  `known_kinds()` pour rejeter un canal inconnu à l'écriture.
- **L'issue d'un run planifié est enregistrée par le `RunManager`** (kwarg `schedule_id` sur
  `submit`, propagé au `RunRecord`), pas par un `store.runs.record` séparé dans le tick — l'écriture
  d'historique reste unique.
- **Dépendance ajoutée en plus de `croniter` : `tzlocal`** (minuscule, pure-python). Les cron
  s'évaluent dans le fuseau local ; `datetime.astimezone()` ne fournit qu'un offset figé, et il faut
  le fuseau IANA réel pour que « 3h du matin » survive aux DST.
- `aetherius schedule run` exécute **in-process** (immédiat, marche daemon éteint) ;
  `POST /v1/schedules/{id}/run` passe par le daemon. Ni l'un ni l'autre ne touche la cadence.
- **L'écran Console Schedules a été livré séparément**, juste après le jalon : liste, détail
  (historique + tir manuel via la brique partagée `scheduler/manual.py::fire_schedule`),
  formulaire guidé de création/édition, raccourci `s` depuis Library — voir
  [docs/console.md](../console.md) § Schedules.

Référence d'usage : [`docs/scheduler.md`](../scheduler.md) ; exemple zéro config :
[`quotes-watch`](../../examples/vector/quotes-watch.blueprint.json). Ce document conserve la
spécification d'origine du jalon.

## Objectif

Rejouer un Blueprint à **heure fixe (cron)** ou **par intervalle**, de façon **persistante** et
**observable**, avec une politique d'alerte par schedule. C'est le cœur de la Phase 1.5 (« vérifier
tous les jours à minuit et 3h »).

## Dépendances

Requiert le **Jalon A** (store, dur) et le **Jalon C** (notify, pour la politique d'alerte).

## Interfaces et fichiers

Déjà en place (à implémenter) :

- [`scheduler/triggers.py`](../../src/aetherius/server/scheduler/triggers.py) — `Trigger`
  (`kind` cron/interval/at, `expr`/`seconds`/`when`) et `next_run_at(trigger, after)`. Cron évalué
  avec `croniter`.
- [`scheduler/service.py`](../../src/aetherius/server/scheduler/service.py) — `SchedulerService(manager, store, tick_seconds=…)`
  avec `start()`, `stop()`, `tick(now)`. Chaque tick interroge `store.schedules.due(now)`, soumet via
  `RunManager.submit` (réutilise le worker-thread + le flux d'événements existants), enregistre
  l'issue via `store.runs.record`, applique la politique `notify`, et met à jour `mark_fired`.
- [`scheduler/misfire.py`](../../src/aetherius/server/scheduler/misfire.py) — `MisfirePolicy`
  (`skip` / `run_once` / `run_all`) et `resolve_misfires(...)` pour les tirs manqués (daemon éteint).

À créer / brancher :

- **Lifespan du daemon** : brancher un `lifespan=` sur `create_app`
  ([`server/app.py`](../../src/aetherius/server/app.py) — le seam est libre aujourd'hui) pour
  démarrer/arrêter le `SchedulerService` ; exposer `app.state.scheduler`. Instancier le store via
  `get_store()`.
- **Routes API** : `server/routes/schedules.py` — `POST /v1/schedules`, `GET /v1/schedules`,
  `GET /v1/schedules/{id}`, `PATCH /v1/schedules/{id}` (pause/reprise/édition),
  `DELETE /v1/schedules/{id}`, `POST /v1/schedules/{id}/run` (tir immédiat). Mettre à jour
  [`contracts/openapi.yaml`](../../contracts/openapi.yaml) et le garder gardé par `tests/contracts/`.
- **CLI** : groupe `aetherius schedule add|list|rm|pause|resume|run`
  ([`cli.py`](../../src/aetherius/cli.py), Typer). **La CLI écrit directement dans le `store`** ; le
  daemon relit le store à chaque tick — donc pas de client IPC/HTTP à écrire, et l'ajout marche
  daemon allumé ou non. Les routes API servent l'usage programmatique/SDK.
- **Dépendance mypy** : `croniter` n'a pas de stubs — ajouter `croniter.*` à la liste
  `[[tool.mypy.overrides]]` `ignore_missing_imports` de `pyproject.toml`.

## Contrat d'un schedule

Un schedule référence un Blueprint (chemin), ses `inputs`, ses `secrets` (noms), un `trigger`, une
politique `notify` (canal + `on_change`/`on_failure`/`always`), un `enabled`. Persisté en
`ScheduleRecord` (Jalon A).

## Points de conception

- **Réutiliser `RunManager.submit`** : un run planifié doit être indiscernable d'un run manuel
  (mêmes événements, même historique). Ne pas dupliquer le moteur.
- **Discipline mono-boucle** : toute mutation d'état du daemon se fait sur la boucle asyncio
  (cf. `server/jobs.py`). Le `tick` orchestre ; le travail bloquant reste sur les workers.
- **Dédup d'alerte** : le `scope` de l'état inter-run = l'id de schedule ; utiliser
  `state.compare_and_set` pour n'alerter qu'à la transition.
- **Idempotence des tirs** : `mark_fired` avant/après soumission pour ne pas rejouer deux fois un
  même créneau si un tick chevauche.

## Plan de test

- `next_run_at` : cron (`0 0,3 * * *`), intervalle, `at` one-shot ; bords (DST, fin de mois).
- `misfire` : gap avec `skip`/`run_once`/`run_all`.
- `tick` : avec un store mémoire/temporaire et un `RunManager` factice, un schedule dû est soumis une
  fois, l'issue enregistrée, `mark_fired` mis à jour.
- API + CLI : add/list/rm/pause/run (tests d'intégration daemon).

## Exemple exécutable à livrer

Un schedule de démonstration à **intervalle court** sur un Blueprint zéro-config (ex. scrape de
`quotes.toscrape.com`), qui tire, s'enregistre dans l'historique, et — combiné au Jalon C — envoie
une alerte. Walkthrough Console si un écran Schedules est ajouté (captures SVG via `make screenshots`).

## Définition de terminé

Les 6 points de [CONTRIBUTING](../../CONTRIBUTING.md#définition-de--terminé-) ; doc
`docs/scheduler.md` ; `make check` vert ; un vrai schedule vérifié à la main (il tire aux bons
créneaux, survit à un redémarrage du daemon).

## Critères d'acceptation

`aetherius schedule add … --cron "0 0,3 * * *"` crée un schedule persistant ; le daemon le déclenche
aux créneaux prévus ; l'historique le consigne ; une alerte part selon la politique ; pause/reprise
et suppression fonctionnent ; rien ne se perd au redémarrage.
