# Déployer Aetherius en continu (24/7)

Les schedules (voir [scheduler.md](scheduler.md)) ne tirent que si le daemon tourne. Un logiciel
local ne s'exécute pas machine éteinte : la réponse honnête au « faire tourner le bot hors de ma
machine » est d'**héberger le daemon sur un hôte toujours allumé** — un VPS à quelques euros, un
Raspberry Pi, un NAS. Ce document est la recette complète ; les artefacts vivent dans
[`deploy/`](../deploy/).

Deux voies, même résultat :

| Voie | Pour qui | Artefacts |
|------|----------|-----------|
| **Docker Compose** | VPS, NAS, tout hôte avec Docker | [`deploy/Dockerfile`](../deploy/Dockerfile), [`deploy/docker-compose.yml`](../deploy/docker-compose.yml), [`deploy/.env.example`](../deploy/.env.example) |
| **systemd (sans Docker)** | Raspberry Pi, machine perso qui reste allumée | [`deploy/aetherius.service`](../deploy/aetherius.service) |

Dans les deux cas, **tout l'état durable vit sous un seul répertoire** (`AETHERIUS_DATA_DIR`) :

| Chemin | Contenu |
|--------|---------|
| `aetherius.db` | Schedules, historique des runs, état inter-run (voir [store.md](store.md)) |
| `profiles/` | Profils navigateur persistants (sessions Continuum) |
| `runs/` | Artefacts de run (screenshots, snapshots) |

Sauvegarder ce répertoire, c'est sauvegarder le déploiement. Les tirs manqués pendant une coupure
sont rattrapés au redémarrage selon la politique `misfire` de chaque schedule (`run_once` par
défaut — voir [scheduler.md](scheduler.md)).

## Recette Docker (VPS, NAS)

Prérequis : Docker Engine avec le plugin Compose (`docker compose version`).

```bash
git clone <repo> && cd Aetherius/deploy
cp .env.example .env        # requis, même vide ; token et secrets se renseignent ici
docker compose up -d --build
curl -s localhost:8787/health   # {"status":"ok","version":"..."}
```

Ce que fait le compose, et pourquoi :

- **Le port n'est publié que sur la loopback de l'hôte** (`127.0.0.1:8787:8787`) : le daemon n'est
  pas joignable depuis le réseau. Pour l'exposer, lire [Sécurité](#sécurité) d'abord.
- **Le volume nommé `aetherius-data`** porte `/data` (la base SQLite, les profils, les artefacts) :
  `docker compose down && up` ne perd rien.
- **`./blueprints` est monté en lecture seule** sur `/app/blueprints` : les Blueprints utilisateur
  s'y déposent côté hôte et les schedules les référencent par leur chemin **côté conteneur**
  (`blueprints/mon-blueprint.blueprint.json`).
- **Les exemples du dépôt sont dans l'image** (`examples/…`) : des sondes zéro configuration pour
  vérifier le déploiement sans rien écrire.
- **`.env` porte le token et les secrets** (`AETHERIUS_SECRET_*`, voir [secrets.md](secrets.md)) —
  jamais l'image ni le compose versionné. `TZ` y fixe le fuseau du conteneur : les expressions cron
  s'évaluent en **heure locale du daemon**, UTC par défaut dans un conteneur.
- **Restart et santé** : `restart: unless-stopped` relance le conteneur après un crash ou un reboot
  de l'hôte ; le `HEALTHCHECK` de l'image sonde `/health` (`docker ps` affiche `healthy`).

### Vérifier de bout en bout

Un run immédiat via l'API (le self-test n'a besoin ni de réseau ni d'extra) :

```bash
RUN=$(curl -s -X POST localhost:8787/v1/runs \
  -H 'Content-Type: application/json' \
  -d '{"blueprint":"examples/vector/daemon-selftest.blueprint.json","inputs":{"subject":"deploy"}}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["run_id"])')
curl -s localhost:8787/v1/runs/$RUN     # status: succeeded
```

Puis un schedule qui tire réellement (surveillance de `quotes.toscrape.com` toutes les 6 h) :

```bash
docker compose exec aetherius aetherius schedule add quotes-watch \
  --blueprint examples/vector/quotes-watch.blueprint.json --cron "0 */6 * * *"
docker compose exec aetherius aetherius schedule list
```

La CLI écrit directement dans le store : le daemon voit le schedule au tick suivant (30 s). L'API
`/v1/schedules` fait la même chose à distance (voir [scheduler.md](scheduler.md)). Après un
`docker compose down && docker compose up -d`, `schedule list` montre les mêmes schedules et
l'historique est intact — c'est le volume qui fait foi.

### Act II (Continuum) dans l'image

L'image de base reste légère (Act I + scheduler + notifications). Pour exécuter des Blueprints
`continuum`, construire la variante navigateur — nettement plus lourde (Chromium et ses
dépendances système) :

```bash
docker compose build --build-arg BROWSER=1 && docker compose up -d
```

(ou décommenter `args: BROWSER: "1"` dans le compose pour rendre le choix durable). Le build
installe l'extra `[browser]` et `playwright install --with-deps chromium` dans un chemin partagé
(`PLAYWRIGHT_BROWSERS_PATH`) lisible par l'utilisateur de service. Les profils persistants vont
dans `/data/profiles`, donc dans le volume.

### Sauvegarde et mise à jour

La base est en mode WAL : copier le fichier à chaud n'est pas fiable. Passer par l'API de backup
SQLite, puis rapatrier le fichier :

```bash
docker compose exec aetherius python -c \
  "import sqlite3; src = sqlite3.connect('/data/aetherius.db'); dst = sqlite3.connect('/tmp/backup.db'); src.backup(dst); dst.close()"
docker compose cp aetherius:/tmp/backup.db ./aetherius-backup.db
```

Mise à jour : `git pull && docker compose up -d --build` — l'état est dans le volume, l'image est
jetable.

## Recette systemd (Raspberry Pi, machine perso)

Sans Docker : le daemon tourne comme **service systemd utilisateur**, relancé en cas d'échec et
démarré avec la machine.

1. Installer Aetherius pour l'utilisateur (au choix : `pipx install aetherius`,
   `pip install --user aetherius`, ou un venv dédié). Vérifier : `aetherius serve --help`.
2. Installer le service :

   ```bash
   mkdir -p ~/.config/systemd/user
   cp deploy/aetherius.service ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now aetherius
   loginctl enable-linger $USER
   curl -s localhost:8787/health
   ```

   `enable-linger` est le point qui change tout : sans lui, systemd arrête les services utilisateur
   à la déconnexion de la session. Avec lui, le daemon démarre au boot et survit au logout.
3. Adapter `ExecStart` si le binaire n'est pas dans `~/.local/bin` (pipx et `pip install --user` y
   installent par défaut ; pour un venv, pointer `<venv>/bin/aetherius`).

Token et secrets se placent dans `~/.aetherius/daemon.env` (référencé par le service, optionnel) :

```bash
install -m 600 /dev/null ~/.aetherius/daemon.env
# puis y écrire AETHERIUS_DAEMON_TOKEN=... et les AETHERIUS_SECRET_*
```

Exploitation courante :

```bash
journalctl --user -u aetherius -f      # les logs du daemon
systemctl --user restart aetherius     # après une mise à jour du paquet
```

L'état vit sous `~/.aetherius` (fixé par le service via `AETHERIUS_DATA_DIR`) : le même répertoire
que l'usage local classique, la même sauvegarde SQLite que plus haut (sans le `docker compose
exec`).

## Sécurité

Le modèle par défaut est **local d'abord**, et c'est un choix :

- **Loopback par défaut.** Le daemon ne fait pas de TLS et son token est optionnel : tel quel, il
  n'est sûr que servi sur `127.0.0.1` (ce que font le compose et le service livrés). **Ne jamais
  publier le port en clair sur Internet.**
- **Exposer = token + TLS, les deux.** Pour piloter le daemon depuis une autre machine :
  1. définir `AETHERIUS_DAEMON_TOKEN` (`.env` ou `daemon.env`) — toute requête `/v1/*` doit alors
     présenter `Authorization: Bearer <token>` ; seul `/health` reste public ;
  2. mettre un **reverse proxy TLS** devant la loopback. Exemple Caddy (certificats automatiques,
     WebSocket compris) :

     ```caddyfile
     aetherius.exemple.fr {
         reverse_proxy 127.0.0.1:8787
     }
     ```

  Un tunnel (Tailscale, WireGuard) est une alternative saine : le port reste sur la loopback et le
  réseau privé fait le transport.
- **Les secrets restent dans des fichiers d'environnement non versionnés** (`.env`,
  `daemon.env` en `600`) : jamais dans l'image, le compose, l'unité systemd ou un Blueprint
  (voir [secrets.md](secrets.md)).

## Piloter le daemon distant

Une fois exposé derrière TLS, tout client parle au même contrat ([daemon.md](daemon.md)) :

```bash
curl -s https://aetherius.exemple.fr/v1/schedules -H "Authorization: Bearer $TOKEN"
```

```ts
import { Aetherius } from "@aetherius/client";

const client = new Aetherius({ baseUrl: "https://aetherius.exemple.fr", token: process.env.TOKEN });
const result = await client.run("blueprints/quotes-watch.blueprint.json", {});
```

Le chemin du Blueprint est résolu **par le daemon, sur son disque** : c'est le déploiement qui
porte les fichiers (le montage `blueprints/`), pas le client.

## Limites connues

- **Pas d'orchestration multi-nœuds** : un daemon, un hôte, un volume. C'est le périmètre voulu du
  jalon (voir [phase-1.5/f-deployment.md](phase-1.5/f-deployment.md)).
- **Le Recorder et la Console restent host-local** : on n'enregistre pas de Blueprint à travers le
  daemon (`/v1/recorder/sessions` → 501, voir [daemon.md](daemon.md)). Créer les Blueprints en
  local, puis les déposer dans `blueprints/`.
- **L'image Docker est base-only par défaut** : les Blueprints `continuum` exigent la variante
  `BROWSER=1` ; `oracle` et `phantom` viendront avec la Phase 2.
