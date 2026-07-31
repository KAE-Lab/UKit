# Jalon C — Notifications natives (`notify/` + action `notify` + sink)

**Statut : livré.** Les quatre canaux ([`notify/channels/`](../../src/aetherius/notify/channels/)),
`dispatch`, le registre et le `NotifySink` sont implémentés ; l'action `notify` est dispatchée par
le handler partagé ([`acts/_shared.py`](../../src/aetherius/acts/_shared.py)) sur Vector et
Continuum, et `NOTIFY` est sorti de `PENDING_ACTIONS`. Choix retenus par rapport à la piste
initiale : `dispatch()` renvoie un **bool** (l'échec d'envoi est contenu mais le step expose
`delivered`) ; `register_channel` déclare une **`target_key`** par canal (le param `target` reste
le raccourci mono-valeur, le param `config` couvre les canaux multi-clés comme Telegram) ; ntfy
publie en **mode JSON** (racine du serveur) pour survivre aux titres accentués (en-têtes HTTP
latin-1). Référence d'usage : [`docs/notifications.md`](../notifications.md) ; exemple exécutable
zéro config :
[`books-restock-notify`](../../examples/vector/books-restock-notify.blueprint.json). Ce document
conserve la spécification d'origine du jalon.

## Objectif

Envoyer des **alertes multi-canaux sans dépendance nouvelle**. Presque toutes les cibles ne sont
qu'un POST HTTP, et `httpx` est déjà au cœur : on couvre webhook générique, Discord, Telegram et
**ntfy** (push téléphone) sans rien ajouter.

## Deux surfaces d'usage

1. **Action `notify`** (Act-agnostique) — une étape de Blueprint : `channel`, `message`, `title`,
   `level`, `target`. Se combine avec la garde `when` du Jalon B pour l'alerte conditionnelle.
2. **`NotifySink`** — un sink de run qui alerte automatiquement en fin de run selon une politique
   (`failure` / `success` / `always`). Passable à `RunEngine.run(sinks=...)` et utilisé par le
   scheduler (Jalon D).

## Interfaces et fichiers

Déjà en place (à implémenter) :

- [`notify/base.py`](../../src/aetherius/notify/base.py) — `NotificationChannel` (Protocol :
  `send(Notification)`), structural comme `core.events.sinks.Sink`.
- [`notify/message.py`](../../src/aetherius/notify/message.py) — `Notification`
  (`body`, `title`, `level`, `url`, `data`) et `NotificationLevel`.
- [`notify/registry.py`](../../src/aetherius/notify/registry.py) — `register_channel(kind)` +
  `build_channel(kind, config)` ; table `kind -> factory`, **seam des plugins du Jalon E**.
- [`notify/sink.py`](../../src/aetherius/notify/sink.py) — `NotifySink(channel, on=...)`.
- [`notify/__init__.py`](../../src/aetherius/notify/__init__.py) — `dispatch(notification, channel)` :
  envoie et **contient l'échec** (log, jamais propagé au run — même discipline que `QueueSink`).
- [`notify/channels/`](../../src/aetherius/notify/channels/) — `WebhookChannel(url)`,
  `DiscordChannel(webhook_url)`, `TelegramChannel(bot_token, chat_id)`,
  `NtfyChannel(topic, server=…)`. Chaque `send` = un POST `httpx` mappant `Notification` sur le
  format du fournisseur.

À faire aussi :

- **Dispatch de l'action** : ajouter un handler `_notify` au `SharedActionsMixin`
  ([`acts/_shared.py`](../../src/aetherius/acts/_shared.py) — court, marge OK ; sinon un module
  dédié), l'appeler depuis le `run_step` de Vector et Continuum, puis **retirer** `NOTIFY` de
  `PENDING_ACTIONS` (les deux Acts). Garder les tests anti-drift verts.
- **Enregistrer les canaux built-in** via `register_channel` (dogfood du registre, prêt pour le
  Jalon E).

## Cibles et secrets

Les adresses de canal (URL de webhook, token de bot, topic) sont des **secrets** de Blueprint
(`{{ secrets.x }}`), résolus au runtime, jamais stockés (voir [docs/secrets.md](../secrets.md)).
`build_channel` reçoit une config déjà résolue.

## Détection de changement (dédup)

Pour n'alerter **qu'au repassage en stock** et pas à chaque run : s'appuyer sur
`StateRepository.compare_and_set(scope, key, value)` (Jalon A), qui renvoie `True` sur transition.
Le `notify` de base fonctionne **sans** le store ; la dédup est une politique par-dessus, portée
plutôt par le scheduler (Jalon D) qui possède le `scope` (l'id de schedule). Documenter le point de
jonction sans dupliquer la logique.

## Points de conception

- **Un échec d'alerte n'avorte jamais le run** qu'il observe (log + swallow), comme le bus
  d'événements existant.
- **Aucune dépendance nouvelle** : tout via `httpx`. Pas de SDK Discord/Telegram.
- **ntfy** est la réponse simple à « alerte sur mon téléphone » : un POST, pas d'app à écrire.

## Plan de test

- Unitaires par canal avec un transport `httpx` **mocké** (vérifier URL, méthode, payload mappé) — 
  aucun réseau réel, reste en CI de base.
- `NotifySink` : politique `failure`/`success`/`always` déclenche (ou non) un `dispatch`.
- Action `notify` : dispatché par les deux drivers ; anti-drift verts après retrait de `PENDING`.

## Exemple exécutable à livrer

`examples/vector/` : un Blueprint « scrape + notify » utilisant un **webhook public de test**
(ex. un endpoint webhook.site ou un `httpbin`/`ntfy` de démonstration) documenté dans sa
`description`, lançable depuis `aetherius run` et la Console. Les secrets (URL réelle) via `.env`.

## Définition de terminé

Les 6 points de [CONTRIBUTING](../../CONTRIBUTING.md#définition-de--terminé-) ; doc
`docs/notifications.md` (canaux, mapping, secrets, limites) ; `make check` vert ; alerte réelle
vérifiée à la main au moins une fois.

## Critères d'acceptation

`aetherius run` d'un Blueprint avec `notify` envoie réellement une alerte sur au moins un canal ;
`NotifySink` alerte sur échec ; `NOTIFY` n'est plus dans `PENDING_ACTIONS` ; zéro nouvelle
dépendance ajoutée.
