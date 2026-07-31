# Notifications

Couche d'alerte native (`src/aetherius/notify/`), **sans dépendance nouvelle** : chaque canal
built-in est un simple POST JSON via `httpx`, déjà au cœur. Deux surfaces d'usage :

1. **L'action `notify`** — une étape de Blueprint, Act-agnostique (dispatchée par le handler
   partagé de `acts/_shared.py` sur Vector comme Continuum). Se combine à la garde `when` pour
   l'alerte conditionnelle.
2. **Le `NotifySink`** — un sink de run qui alerte automatiquement en fin de run selon une
   politique (`failure` / `success` / `always`). Passable à `RunEngine.run(sinks=...)`, consommé
   par le scheduler (Jalon D).

## L'action `notify`

```json
{
  "id": "alert",
  "action": "notify",
  "when": "{{ 'In stock' in (steps.check.availability | first) }}",
  "channel": "ntfy",
  "target": "{{ secrets.ntfy_topic }}",
  "title": "Retour en stock",
  "message": "{{ steps.check.title | first }}",
  "url": "{{ vars.product_url }}",
  "level": "info"
}
```

| Paramètre | Rôle |
|-----------|------|
| `channel` (requis) | Type de canal : `webhook`, `discord`, `telegram`, `ntfy` — ou tout canal ajouté par un plugin (voir [docs/plugins.md](plugins.md)). |
| `message` (requis) | Corps de l'alerte (interpolable). |
| `title` | Titre optionnel. |
| `level` | `info` (défaut), `warning` ou `error` — mappé sur la sévérité du fournisseur. |
| `target` | **Adresse du canal** en une valeur : URL de webhook (`webhook`), URL de webhook Discord (`discord`), topic (`ntfy`), chat id (`telegram`). |
| `url` | Lien profond optionnel attaché à l'alerte (la page produit, ...). |
| `config` | Objet de configuration complet, superset de `target`, pour les canaux multi-clés (ex. Telegram : `bot_token` + `chat_id`). |

Sorties du step : `{"delivered": bool, "channel": "<kind>"}` — et un événement `progress`
(`notify: <kind> delivered` / `delivery failed`, level `warning` en cas d'échec) sur le bus.

### `target` vs `config`

`target` est le raccourci mono-valeur : chaque canal déclare la clé de config qu'il remplit
(`register_channel(kind, target_key=...)`). Pour un canal à plusieurs clés, passer `config` :

```json
{
  "action": "notify",
  "channel": "telegram",
  "config": { "bot_token": "{{ secrets.tg_token }}", "chat_id": "{{ secrets.tg_chat }}" },
  "message": "Run terminé"
}
```

`target` et `config` se combinent (`target` remplit la clé primaire si `config` ne la donne pas).

## Canaux built-in et mapping wire

Tous enregistrés dans le registre (`notify/registry.py`) via `register_channel` — la même couture
que les canaux tiers du Jalon E (contrat d'extension : [docs/plugins.md](plugins.md)). Chaque
`send` est **un** POST JSON (timeout fixe 10 s, indépendant des options du Blueprint).

| Canal | Cible | Requête |
|-------|-------|---------|
| `webhook` | `url` | POST JSON de la Notification brute : `{"body", "title", "level", "url", "data"}`. |
| `discord` | `webhook_url` | Corps seul → `{"content": body}` ; titre ou lien → embed (`title`, `description`, `url`, `color` bleu/orange/rouge selon `level`). |
| `telegram` | `bot_token` + `chat_id` (target = `chat_id`) | `POST api.telegram.org/bot<token>/sendMessage`, `text` = titre + corps + lien. **Sans `parse_mode`** : texte brut, un corps arbitraire ne casse jamais sur l'échappement Markdown. |
| `ntfy` | `topic` (+ `server`, défaut `https://ntfy.sh`) | **Mode JSON publishing** (POST sur la racine du serveur) : `{"topic", "message", "title", "priority", "click"}`. `level` → priorité 3/4/5. Le mode JSON évite les en-têtes HTTP (latin-1) qui corrompraient les titres accentués. |

ntfy est la réponse simple à « alerte sur mon téléphone » : installer l'app, s'abonner à un topic,
et le POST devient une push — pas d'app à écrire.

## Cibles et secrets

Les adresses de canal (URL de webhook, token de bot, topic) donnent le droit d'écrire — et pour
ntfy, de lire — le canal : ce sont des **secrets** de Blueprint (`{{ secrets.x }}`), résolus au
runtime, jamais stockés dans le fichier (voir [docs/secrets.md](secrets.md), gabarits dans
[.env.example](../.env.example)). Un topic ntfy public est un secret *de fait* : le traiter comme
tel.

## Politique d'échec

- **Une config cassée fait échouer le step** : canal inconnu, clé de config manquante, `level`
  invalide → `NotificationError` typée, levée avant tout envoi. Un Blueprint mal câblé se voit.
- **Un échec de livraison n'avorte jamais le run** qu'il observe : `dispatch()` contient
  l'exception (log `aetherius.notify` + swallow, même discipline que le bus d'événements et le
  `QueueSink` du daemon) et renvoie `False`. Le step reste `success` avec `delivered: false` et
  l'événement `progress` passe en `warning`.
- **Un seul essai d'envoi** (limite connue) : pas de retry sur les notifications — c'est un signal
  de courtoisie, pas une transaction. Un workflow récurrent (scheduler) réalertera au run suivant.

## `NotifySink` : alerter sur l'issue d'un run

```python
from aetherius.notify import NotifySink, build_channel

channel = NotifySink(build_channel("ntfy", {"topic": "mes-runs"}), on="failure")
RunEngine().run(blueprint, sinks=[LogSink(), channel])
```

Le sink n'écoute que l'événement `done` : selon `on` (`failure` défaut / `success` / `always`),
il construit une Notification (statut, message d'issue, erreur éventuelle, `run_id` dans `data`,
level `error` sur échec) et l'envoie via `dispatch` — donc lui aussi contenu. Le scheduler
(Jalon D) n'attache pas ce sink : sa politique par schedule ajoute `change` (dédup via le store,
que le sink, sans état, ne peut pas porter) et vit donc côté scheduler, sur les mêmes primitives
`build_channel` + `dispatch` (voir [docs/scheduler.md](scheduler.md)). `NotifySink` reste la brique
des runs pilotés en direct (`RunEngine.run(sinks=...)`).

## Déduplication (n'alerter qu'au changement d'état)

`notify` de base alerte à chaque exécution du step. Pour n'alerter **qu'à la transition**
(rupture → en stock), le point de jonction est `StateRepository.compare_and_set(scope, key, value)`
du store (Jalon A, voir [docs/store.md](store.md)) : il renvoie `True` seulement quand la valeur
change. Cette politique appartient au **scheduler** (Jalon D), qui possède le `scope` (l'id de
schedule) ; la couche notify reste sans état. C'est la politique `notify` d'un schedule avec
`"on": "change"` : elle compare les outputs de chaque run réussi au tir précédent et n'alerte
qu'au changement (voir [docs/scheduler.md](scheduler.md)).

## Réponses de notification (human-in-the-loop)

`Notification.data` porte un contexte structuré qu'un canal peut exploiter. L'action `confirm`
(Jalon 2-E, [docs/human-in-the-loop.md](human-in-the-loop.md)) s'en sert : quand une demande est
émise via le daemon **et** qu'une URL publique est configurée (`AETHERIUS_DAEMON_PUBLIC_URL`),
`data["confirm"]` contient `{decisions_url, token, auth}`. Le canal **ntfy** le traduit en deux
boutons d'action HTTP **Approve** / **Reject** qui POSTent `/v1/runs/{id}/decisions` — approuver
depuis le téléphone en un tap, sans app à construire. Sans URL joignable, `data["confirm"]` est absent
et l'alerte reste informative (pas de bouton mort). Les autres canaux ignorent `data["confirm"]`
aujourd'hui ; un callback Telegram (bot recevant les réponses) est une évolution future.

## Tester les notifications

L'exemple zéro configuration (webhook → écho public httpbin) :

```bash
aetherius run examples/vector/books-restock-notify.blueprint.json
# outputs.in_stock = true ; step alert : delivered = true (POST réel vers httpbin.org/post)
```

Pour une alerte réelle sur téléphone : installer l'app ntfy, s'abonner à un topic privé, puis
pointer le step dessus (`"channel": "ntfy", "target": "{{ secrets.ntfy_topic }}"`, topic dans
`.env`). Même exemple lançable depuis la Console (Library → Run) ; le Studio propose l'action
`notify` avec ses champs.

## Limites connues

- Un seul essai d'envoi, pas de retry (voir Politique d'échec).
- Telegram : texte brut uniquement (pas de `parse_mode`), par choix de robustesse.
- Discord : `content` simple ou un embed unique — pas de fichiers joints ni de composants.
- La déduplication inter-run n'est pas portée par cette couche (voir ci-dessus).
