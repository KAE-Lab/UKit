# Jalon F — Déploiement always-on (24/7)

**Statut : livré.** Les artefacts [`deploy/`](../../deploy/) sont finalisés et vérifiés de bout en
bout : image Docker multi-stage non-root avec healthcheck (variante Act II via
`--build-arg BROWSER=1`), `docker-compose.yml` (volume persistant `/data`, port publié sur la
loopback de l'hôte, `.env` non versionné, montage `blueprints/`), service systemd utilisateur
(`enable-linger`, redémarrage automatique) et `.dockerignore` racine en allowlist (le contexte de
build ne peut pas embarquer un secret). La recette complète — VPS / Raspberry Pi / NAS, volume,
secrets, sécurité — est documentée dans [`docs/deployment.md`](../deployment.md). Décision actée en
la vérifiant : un `AETHERIUS_DAEMON_TOKEN` vide vaut absence de token (`server/config.py`), pour
que l'interpolation d'environnement des déploiements n'active jamais l'auth par accident. Ce
document conserve la spécification d'origine du jalon.

## Objectif

Répondre honnêtement au besoin « faire tourner le bot même machine éteinte ». Un logiciel local ne
s'exécute pas machine éteinte : la solution est d'**héberger le daemon sur un hôte toujours allumé**
(VPS à quelques euros, Raspberry Pi, NAS) pour que les schedules (Jalon D) tirent en continu. Pas de
service hébergé Aetherius à opérer.

## Dépendances

Requiert le **Jalon D** (c'est le scheduler qu'on fait tourner 24/7). Sans lui, l'hébergement n'a
pas d'intérêt.

## Périmètre

**Inclus.** Une image Docker fonctionnelle, un `docker-compose.yml` avec volume persistant, un
gabarit systemd (sans Docker), et une doc de déploiement claire, sécurité comprise.
**Exclu.** Toute infra hébergée par le projet ; l'orchestration multi-nœuds.

## À finaliser

- [`deploy/Dockerfile`](../../deploy/Dockerfile) — vérifier l'install (base ; documenter comment
  ajouter `[browser]` et `playwright install chromium` pour Act II, image plus lourde) ; s'assurer que
  `AETHERIUS_DATA_DIR=/data` pointe le volume ; `aetherius serve` lit `AETHERIUS_DAEMON_HOST/PORT`.
- [`deploy/docker-compose.yml`](../../deploy/docker-compose.yml) — volume nommé sur `/data` (la base
  SQLite et les profils survivent) ; `restart: unless-stopped` ; secrets/token via `.env` non
  versionné.
- [`deploy/aetherius.service`](../../deploy/aetherius.service) — service systemd **utilisateur** ;
  documenter `loginctl enable-linger` pour survivre à la déconnexion.
- **Persistance** : confirmer que tout l'état durable est bien sous `AETHERIUS_DATA_DIR`
  (`aetherius.db` + `profiles/` + `runs/`), donc capturé par un seul volume.

## Sécurité (à documenter explicitement)

- Le daemon **bind en loopback par défaut** (`127.0.0.1:8787`). L'exposer hors de l'hôte **exige** un
  `AETHERIUS_DAEMON_TOKEN` **et**, en pratique, un **reverse proxy TLS** devant (le daemon ne fait pas
  de TLS lui-même). Ne jamais exposer le port en clair sur Internet.
- Secrets (`AETHERIUS_SECRET_*`) via fichier d'environnement non versionné, jamais dans l'image ni le
  compose committé.

## Plan de test / vérification

Manuel (composant infra, pas de test unitaire) :
- `docker compose up --build` → `GET /health` répond `{"status":"ok"}`.
- Créer un schedule à intervalle court → il tire, l'historique se remplit.
- `docker compose down && up` → le schedule et l'historique **persistent** (volume).
- Sur une machine allumée : installer le service systemd, vérifier le redémarrage automatique.

## Définition de terminé

Doc `docs/deployment.md` (recettes VPS / Raspberry Pi / NAS, volume, secrets, sécurité) ; artefacts
`deploy/` vérifiés à la main (build image, run, `/health`, un schedule qui tire et persiste au
redémarrage) ; pointeur depuis `docs/daemon.md`.

## Critères d'acceptation

Un utilisateur suit `docs/deployment.md`, obtient un daemon qui tourne 24/7 sur un hôte allumé, avec
schedules et historique qui survivent aux redémarrages, et une configuration réseau sûre par défaut.
