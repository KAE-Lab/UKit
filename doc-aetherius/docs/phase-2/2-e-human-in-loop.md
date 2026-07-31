# Jalon 2-E — Human-in-the-loop (action `confirm`)

**Statut : livré.** Doc de référence : [docs/human-in-the-loop.md](../human-in-the-loop.md). Orthogonal
aux Acts. Une action qui **met le run en pause** jusqu'à une décision humaine (approuver/rejeter, ou
fournir une valeur), avec timeout. Rend le bot **pilotable à 100 % à distance** (surveillance restock →
« confirmer l'achat ? ») **et** en local (comme les permissions de Claude Code).

## Objectif

Un step `confirm` qui : (1) émet une **demande** de décision (notification via les canaux existants +
événement dédié), (2) **gare le run** en attendant la réponse, (3) reprend avec la décision, ou
applique une politique de **timeout**. Utilisable en remote (piloter un daemon depuis le téléphone) et
en local (prompt console/CLI).

## Dépendances

Requiert le **store** (1.5-A, pour tracer la demande), les **notifications** (1.5-C, pour la demander)
et le **daemon** (pour la surface de décision distante). **Indépendant des Acts** — peut être livré à
tout moment de la Phase 2.

## Interfaces et fichiers

À créer / brancher :

- **Action `confirm`** (nom finalisable : `confirm` / `request_approval` / `ask`) dans
  [`acts/_shared.py`](../../src/aetherius/acts/_shared.py) — **act-agnostique**, comme `notify`
  (héritée par tous les drivers). Elle émet la demande puis **bloque le worker-thread** sur un
  rendez-vous — exactement comme `_wait` bloque déjà sur `time.sleep`, mais sur un `Event`. Retourne
  `{approved: bool, decision, value}`. Champs : `message`/`title`, `channel`/`target` (pour notifier),
  `timeout_ms`, `on_timeout` (`approve` / `reject` / `fail:CODE`, calqué sur `wait_for`).
- **Nouvel `EventType` `input_requested`** (+ éventuel `input_provided`) → éditer **à la fois**
  [`contracts/events.schema.json`](../../contracts/events.schema.json) (enum fermé,
  `additionalProperties: false`) **et** [`core/events/models.py`](../../src/aetherius/core/events/models.py).
  Le **statut du run reste `running`** (worker garé) — pas de nouveau statut, modèle honnête.
- **Canal de retour** (la seule pièce vraiment manquante) : un **registre de rendez-vous en mémoire**
  sur le [`RunManager`](../../src/aetherius/server/jobs.py) (`asyncio.Event`/queue par `run_id` +
  token de décision), signalé depuis la boucle asyncio via `loop.call_soon_threadsafe` — le **miroir
  exact** du pont `QueueSink` existant (thread → loop). Persistance de la demande pour
  l'observabilité : une petite table `approvals` (migration forward-only sur `PRAGMA user_version`,
  [`store/schema.py`](../../src/aetherius/store/schema.py)), ou le KV `state`
  ([`compare_and_set`](../../src/aetherius/store/state.py)).
- **Surfaces de décision** :
  - **API daemon** : route `POST /v1/runs/{id}/decisions` (aucune route ne mute un run aujourd'hui) →
    [`contracts/openapi.yaml`](../../contracts/openapi.yaml) + `server/routes/runs.py`.
  - **Console** : réutiliser [`ConfirmModal`](../../src/aetherius/console/widgets/confirm.py),
    déclenché sur l'événement `input_requested`.
  - **CLI / in-process** : prompt stdin (`questionary`, déjà présent) pour un run local.
  - **Réponse de notification** : bouton d'action ntfy / callback Telegram deep-linkant vers la route
    daemon (la `Notification.data` existe mais n'est pas transmise — l'exploiter).

## Contrat

Nouvel event `input_requested` (events.schema.json + EventType). Nouvelle route
`POST /v1/runs/{id}/decisions` (openapi.yaml). L'action `confirm` reste un step libre
(`additionalProperties: true`). Garder `tests/contracts/` verts.

## Points de conception

- **Attente bloquante, pas suspend/resume** : le run (et son navigateur) reste **vivant et garé**. Un
  vrai suspend persisté est irréaliste avec une page Playwright vivante ; parquer le worker est le
  modèle honnête, et le timeout le libère toujours.
- **Le worker-thread bloque, pas la boucle** : les runs tournent sur `asyncio.to_thread` / un worker
  Textual — bloquer là ne gèle ni le daemon ni l'UI. La décision arrive sur la boucle asyncio et
  franchit la frontière via `call_soon_threadsafe`.
- **Timeout obligatoire** : un `confirm` sans réponse ne gare pas un run éternellement ; `on_timeout`
  décide (approuver par défaut ? rejeter ? échouer avec un code). Défaut prudent à cadrer.
- **Sécurité** : le token de décision est opaque et lié au `run_id` ; la route daemon garde le même
  modèle loopback + token bearer que le reste de l'API.
- **Local comme remote** : la même action sert les deux ; seul le canal de retour diffère (prompt vs
  route). Un seul concept, plusieurs surfaces.

## Plan de test

- `confirm` bloque puis reprend quand le rendez-vous est signalé (Event mémoire, sans daemon).
- `on_timeout` : `approve` / `reject` / `fail:CODE` appliqués correctement à l'expiration.
- Route daemon : `POST /v1/runs/{id}/decisions` débloque un run garé (test d'intégration daemon).
- Persistance : la demande est tracée (table `approvals`/`state`) et observable ; un token inconnu est
  rejeté proprement.
- Contrats : events + openapi restent gardés.

## Exemple exécutable à livrer

Un run **local** qui demande une confirmation en console avant un step « sensible », timeout court par
défaut. Walkthrough Console + **captures SVG** (`make screenshots`, requis par CONTRIBUTING pour un
nouvel écran/interaction). Doc `docs/human-in-the-loop.md`.

## Définition de terminé

Les 6 points de [CONTRIBUTING](../../CONTRIBUTING.md#définition-de--terminé-), **captures SVG
comprises** (interaction UI non triviale) ; approbation vérifiée à la main par **les trois** voies
(console, API daemon, réponse de notification) ; timeout + `on_timeout` testés ; `make check` vert.

## Critères d'acceptation

Un step `confirm` gare le run jusqu'à une décision reçue via console, API daemon ou notification ; à
l'expiration, `on_timeout` s'applique ; le run reste `running` pendant l'attente et se termine
proprement ; rien ne gèle le daemon ni l'UI.
