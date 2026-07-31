# Phase 1.5 — socle opérationnel

Phase intermédiaire entre la **Phase 1** (le socle réutilisable, terminée en v0.2.0) et la
**Phase 2** (les Acts autonomes). Elle rend le socle capable de porter des workflows **récurrents et
réactifs** en conditions réelles — sans casser l'existant et sans alourdir le cœur.

## Pourquoi

Un cas d'usage concret la motive : *surveiller un produit en rupture de stock, vérifier plusieurs
fois par jour, et alerter au retour en stock pour être le premier à réserver*. Aujourd'hui c'est
impossible, car le socle a trois manques structurels :

1. **Aucune planification.** Le moteur (`RunEngine.run`) est un parcours linéaire, one-shot, des
   `steps` ; rien ne rejoue un Blueprint à heure fixe ou par intervalle. Le daemon est
   fire-and-forget et **100 % en mémoire** (tout est perdu au redémarrage).
2. **Aucune alerte native.** Envoyer une notification (webhook, Discord, Telegram, push téléphone)
   est du code redondant qu'Aetherius existe pour supprimer, mais que rien n'offre.
3. **Aucune réactivité inter-run.** Impossible de brancher (« si en stock, alerter ») ni de comparer
   un run au précédent (« n'alerter qu'au repassage en stock »). Les actions `if`/`repeat`/`for_each`
   sont **déclarées mais non exécutées**.

## Décisions d'architecture

- **Planification = scheduler intégré au daemon** (cron + intervalle, persistant). Un seul processus,
  multiplateforme, fidèle à l'identité « bibliothèque + daemon local ». Pas de délégation au cron de
  l'OS.
- **24/7 « hors machine » = recette de déploiement always-on** (Docker + systemd + doc), pas de
  service hébergé. Un logiciel local ne tourne pas machine éteinte : la réponse honnête est
  d'héberger le daemon sur un hôte allumé (VPS, Raspberry Pi, NAS).
- **Persistance = SQLite via `sqlite3` (stdlib).** Un fichier portable sous `~/.aetherius`, zéro
  dépendance nouvelle, sûr en concurrence.
- **Alertes = couche notifications native, sans dépendance** (tout en HTTP via `httpx`, déjà au
  cœur). Action `notify` + alerte automatique, avec détection de changement pour ne pas spammer.
- **Furtivité réseau = option `options.proxy` de premier niveau** (Jalon G), atteignant les deux
  moteurs. Proxy + rotation d'IP, mais aussi anti-fuite WebRTC et cohérence géo — sans quoi un proxy
  laisse fuir l'IP réelle. Le durcissement de l'empreinte (Jalon H) complète le tableau côté
  navigateur **et** côté Vector.

Tout reste **léger** : `sqlite3` est stdlib, `httpx` déjà présent, `croniter` minuscule, le proxy
HTTP/HTTPS ne coûte aucune dépendance (SOCKS5 et TLS impersonation dans l'extra optionnel `[network]`),
et le scheduler vit dans `server/` (chargé seulement quand on `serve`). L'invariant « `import
aetherius` reste léger » est préservé.

## Les jalons et leur ordre

Chaque jalon fait l'objet d'une **spécification autonome**. Le squelette (stubs, interfaces,
contrats) est déjà en place dans le code ; chaque spécification décrit ce qu'il reste à implémenter,
sa « Définition de terminé », son plan de test et son exemple exécutable.

Deux familles : **socle opérationnel** (A–F, planification/réactivité/alertes) et **furtivité réseau**
(G–H, orthogonales aux précédentes).

```
A. Persistance (store/, SQLite)  ───────────────┐
                                                ├──►  D. Scheduler (daemon)  ──►  F. Déploiement 24/7
B. Réactivité (when + if/repeat/for_each)  ─────┤
C. Notifications (notify/ + action + sink)  ────┘
E. Actions custom / plugins   [indépendant, après B et C]

G. Identité réseau (proxy + rotation + anti-fuite)  ──►  H. Durcissement de l'empreinte
   [orthogonal à A–F]
```

| Jalon | Spécification | Dépend de | Résumé |
|-------|---------------|-----------|--------|
| A | [a-store.md](a-store.md) | — | **Livré.** Store SQLite durable (schedules, historique, état inter-run) — voir [docs/store.md](../store.md). |
| B | [b-flow.md](b-flow.md) | — | **Livré.** Garde d'étape `when` + actions de flux `if`/`repeat`/`for_each` exécutées par le moteur — voir [docs/blueprint-schema.md](../blueprint-schema.md). |
| C | [c-notifications.md](c-notifications.md) | A (pour la dédup) | **Livré.** Canaux d'alerte + action `notify` + sink d'alerte auto — voir [docs/notifications.md](../notifications.md). |
| D | [d-scheduler.md](d-scheduler.md) | A, C | **Livré.** Scheduler cron/intervalle dans le daemon + CLI + API — voir [docs/scheduler.md](../scheduler.md). |
| E | [e-plugins.md](e-plugins.md) | après B, C | **Livré.** Actions et canaux tiers via entry-points — voir [docs/plugins.md](../plugins.md). |
| F | [f-deployment.md](f-deployment.md) | D | **Livré.** Recette de déploiement always-on (Docker, systemd) — voir [docs/deployment.md](../deployment.md). |
| G | [g-network.md](g-network.md) | — | **Livré.** Proxy (Vector + Continuum), rotation d'IP, anti-fuite WebRTC, cohérence géo, TLS impersonation — voir [docs/network.md](../network.md). |
| H | [h-fingerprint.md](h-fingerprint.md) | G | **Livré.** Empreinte durcie (canvas/audio/polices/UA-CH/écran/WebGL2, cohérente avec le profil) + identité d'en-têtes par défaut pour Vector — voir [docs/stealth.md](../stealth.md). |

**Ordre recommandé :** A, puis B et C (parallélisables), puis D, puis E, puis F. G et H sont
indépendants du reste : G puis H, à tout moment (G se marie au scheduler D pour la surveillance
récurrente).

## Implémenter un jalon

Un jalon se traite en suivant sa **spécification** et la [« Définition de terminé »](../../CONTRIBUTING.md#définition-de--terminé-)
de `CONTRIBUTING.md`. Chaque spécification pointe vers les stubs déjà en place et les fichiers à
toucher ; le squelette compile déjà (`make check` vert) et les capacités pas encore exécutées sont
marquées « jalon en attente » (comme `PENDING_ACTIONS` et `console/screens/_pending.py`).
L'implémentation d'un jalon inclut sa doc `docs/<feature>.md` définitive, son exemple exécutable et
ses tests miroir, puis bascule sa case dans le [README](../../README.md), section « État
d'avancement ».
