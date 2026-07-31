# Changelog

Toutes les évolutions notables du projet sont consignées ici. Le format s'inspire de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le versionnage suit
[SemVer](https://semver.org/lang/fr/). Tant que la version reste en `0.x`, l'API publique peut encore
évoluer entre deux versions mineures (durcissement de la Phase 1 en conditions réelles).

## [Non publié]

## [0.4.0] - 2026-07-20

Phase 2 — les Acts autonomes : **Oracle** (vision) et **Phantom** (agent) deviennent runnables, la
**composition multi-Act** et le **self-healing** lèvent la contrainte « un Act par Blueprint », et
l'**humain dans la boucle** (`confirm`) garde les actions sensibles. Phase 2 complète (A–E).

### Ajouté
- **Jalon 2-E — Human-in-the-loop (`confirm`)** ([docs/human-in-the-loop.md](docs/human-in-the-loop.md)) :
  une action **orthogonale aux Acts** (héritée par tous les drivers comme `notify`) qui **gare le
  run** jusqu'à une décision humaine puis reprend. **Attente bloquante, pas suspend/resume** : le
  worker parqué bloque sur un rendez-vous mémoire (`core/runtime/approvals.py`,
  `ApprovalRegistry`/`Rendezvous`), le run — navigateur compris — reste vivant ; la boucle asyncio,
  l'UI, ne gèlent jamais. Le **statut reste `running`** (deux nouveaux events
  `input_requested`/`input_provided` au contrat `events.schema.json`, aucun nouveau statut). **Timeout
  obligatoire** (`timeout_ms`, défaut 5 min) + `on_timeout` `approve`/`reject`/`fail:CODE` (défaut
  **reject**, deny-by-default : le step sensible gardé par `when` se saute) ; un run non surveillé
  (bibliothèque, sans surface) applique le timeout **immédiatement**. **Quatre surfaces, un seul
  rendez-vous** : Console (`ConfirmModal` via `ConsoleApprovalSink` sur `input_requested`),
  CLI/in-process (invite stdin `questionary`, sur un thread pour respecter le timeout, no-op sans
  TTY), **API daemon** (`POST /v1/runs/{id}/decisions`, token opaque lié au `run_id`, 404 run inconnu
  / 409 rien en attente ou token invalide), et **réponse de notification** (boutons ntfy
  Approve/Reject POSTant la route, via `Notification.data["confirm"]` + `AETHERIUS_DAEMON_PUBLIC_URL`).
  Piste d'audit `approvals` (migration store forward-only **v1→v2**) écrite par le daemon depuis le
  flux d'événements (source unique, sans course). Nouveaux : `core/actions/human.py` (spec `confirm`),
  `Capability.CONFIRM`, `RunContext.approvals` + `RunEngine.run(approvals=)`, `server/approvals.py`,
  `console/approvals.py`, `cli/approvals.py`, `store/approvals.py`. Contrats : event enum + route
  OpenAPI. Exemple zéro config : `examples/vector/confirm-before-post.blueprint.json`. **Phase 2
  terminée (A–E).**
- **Jalon 2-D — Composition multi-Act & self-healing** ([docs/composition.md](docs/composition.md)) :
  la contrainte « un Act par Blueprint » tombe. **`act` par step** — chaque step peut surcharger
  l'act du run (hérité dans les branches `if`/`repeat`/`for_each`, validé contre l'act **effectif**) ;
  les Acts navigateur (II/III/IV) partagent **un seul navigateur** : le moteur pré-scanne l'arbre
  (surcharges + chaînes de fallback) et instancie une seule instance du plus haut Act atteignable,
  par subsomption de la chaîne d'héritage des drivers (`core/runtime/drivers.py`, `DriverManager` à
  démarrage paresseux, teardown groupé). **Self-healing** opt-in : sur échec d'un step navigateur,
  la chaîne `options.fallback` (ou `fallback` par step, `[]` désactive) rejoue l'**intention** du
  step (`describe`, jamais devinée) sur l'Act supérieur — escalade `oracle` = rejeu du même step en
  ciblage vision (`fill` → `type`), escalade `phantom` = **micro-objectif** d'agent borné (6
  actions, capable d'écarter un obstacle ; limité aux intentions exprimables par le planner).
  L'escalade est ponctuelle (le step suivant repart sur son act) ; un step guéri est un succès
  (`StepResult.healed_by`, durée cumulée), le récit passe par des événements `progress` de niveau
  `warning` (aucun nouveau type d'événement) ; chaîne épuisée = l'erreur d'origine propagée
  inchangée. Schéma : champs `step.act`/`step.describe`/`step.fallback` + `options.fallback`
  (additifs). L'exécuteur est réorganisé (`core/runtime/steps.py` + `flow.py` extrait +
  `healing.py`), zéro régression mono-Act. Exemples zéro config : `examples/composition/`
  (run mixte Continuum→Oracle et sélecteur cassé rattrapé par vision, vérifiés en réel).
- **Jalon 2-C — Act IV Phantom** ([docs/acts/phantom.md](docs/acts/phantom.md)) : `act: "phantom"`
  est **runnable**. Un Blueprint **sans `steps`** déclare un `goal` et des `constraints` ; le moteur
  route vers `driver.run_goal` (seam goal-only dans `RunEngine.run`) qui lance la boucle
  **percevoir → raisonner → agir**. Le **planner** (Claude par défaut, rôle `Planner` du substrat de
  cognition, `acts/_cognition/planning.py`) choisit chaque action par **tool use forcé**
  (`tool_choice: any`) sur un vocabulaire restreint — ciblage **vision uniquement**, plus les outils
  terminaux `finish` (objectif atteint → sortie) et `abort` (impossible / contrainte violée → échec
  propre). L'action est jouée par le ciblage vision d'Oracle à travers la discrétion.
  `PhantomDriver` **étend** `OracleDriver` (un seul navigateur, une seule discrétion, provider et
  dispatch hérités) — un Blueprint `phantom` avec `steps` tourne déjà en mode scripté (socle 2-D).
  Garde-fou : budget `options.agent.max_steps` (défaut 40, nouveau modèle `AgentOptions` + schéma) ;
  un échec d'action est une **observation** mémorisée (résilience), jamais fatal — seuls `abort`, une
  réponse de planner inutilisable ou le budget épuisé arrêtent le run. Observabilité par réutilisation
  de `progress`/`step_started`/`step_finished` (`step_id` `agent[N]`, un `StepResult` par action),
  **aucun nouvel `EventType`**. Sorties : `finish` exposé sous `{{ steps.agent.* }}`, ou l'issue de
  l'agent (`{result, steps_taken}`) renvoyée telle quelle sans `outputs` déclarés. Garde validator
  « goal-only ⇒ act phantom ». Exemple zéro config :
  `examples/phantom/quotes-find-author.blueprint.json`.
- **Jalon 2-B — Act III Oracle** ([docs/acts/oracle.md](docs/acts/oracle.md)) : `act: "oracle"` est
  **runnable**. `OracleDriver` **étend** le driver Continuum (un seul navigateur, une seule
  discrétion, steps à sélecteur inchangés) et route les cibles vision : `click`/`type`/`upload`/
  `hover`/`wait_for` acceptent `target: {vision: "description"}` — capture en pixels CSS →
  grounding (un appel par cible, seuil de confiance 0.5 ajustable par `min_confidence`) → action
  par coordonnées off-center (bande 30–70 %) via la façade stealth (`HumanInput` gagne
  `hover_at`). `wait_for` par vision sonde l'écran (un grounding par sonde, `on_timeout:
  "fail:CODE"` honoré) ; `upload` alimente le file chooser ouvert par le clic. Nouvelle action
  **`read`** (extraction sémantique, capability + spec `core/actions/vision.py`) : avec `schema`
  les champs deviennent les sorties du step, sans schéma la valeur arrive sous `data`. Contrat
  documenté sans changement structurel (`target`, `vision.provider`) ; le Studio accepte les steps
  ciblés par vision. Exemple zéro config : `examples/oracle/quotes-vision-demo.blueprint.json`.
- **Action `wait` : plage aléatoire** — sans `ms`, `min_ms`/`max_ms` tirent une durée uniforme
  dans l'intervalle (act-agnostique) ; le gabarit fondateur `tiktok-upload` devient exact.
- **Oracle : recherche par défilement (scan)** — une cible vision hors du viewport est trouvée en
  défilant la page viewport par viewport (scroll humanisé sous discrétion, remontée en haut pour
  un départ en milieu de page), à coût borné : 8 coups d'œil maximum, un appel de grounding
  chacun ; `scan: false` épingle le step au viewport courant. Exemple zéro config :
  `examples/oracle/books-scan-below-fold.blueprint.json`.
- **Contribution : sondes réalistes** — la « Définition de terminé » exige désormais, en plus du
  flux nominal vérifié à la main, une ou deux sondes réalistes « dures » (dont un cas conçu pour
  échouer), consignées dans la doc de la capacité ([docs/testing.md](docs/testing.md)).
- **Jalon 2-A — Substrat de perception & cognition** ([docs/cognition.md](docs/cognition.md)) : la
  fondation partagée des Acts cognitifs. `ClaudeProvider` implémente le **grounding** (`locate` :
  description → `Box` + confiance) et l'**extraction sémantique** (`read`, schéma optionnel) par
  tool use forcé — réponse structurée, un appel par cible, modèle par défaut `claude-opus-4-8`
  écrasé par `vision.model`, clé via `ANTHROPIC_API_KEY` (`.env` supporté) ; `resolve_provider`
  résout `vision.provider` (`claude` défaut / `local`) ; `LocalGrounder` reste l'option locale
  derrière la même interface (rôles non portés en `CognitionError` typée). Perception de page en
  **pixels CSS** (`capture` : screenshot `scale="css"` + DOM optionnel, réduction 2576 px avec
  remise à l'échelle des boîtes), cible unifiée `Target.from_step` (sélecteur ou
  `target: {vision}`, ambiguïté rejetée), et **clic par coordonnées à travers le stealth**
  (`HumanInput.click_at`/`type_at`, gestes rejoués + timing humain, intégration Chromium réelle).
  Nouvelle erreur `CognitionError`. `import aetherius` reste léger (SDK importés paresseusement).
- **Phase 2 — Autonomie & Contrôle : cadrage + squelette.** Directives et **spécifications par jalon**
  ([docs/phase-2/](docs/phase-2/README.md), jalons 2-A à 2-E), plus les **stubs d'interface** du
  substrat de cognition ([`acts/_cognition/`](src/aetherius/acts/_cognition/),
  [`acts/_perception.py`](src/aetherius/acts/_perception.py),
  [`core/runtime/selector.py`](src/aetherius/core/runtime/selector.py),
  [`models/registry.py`](src/aetherius/models/registry.py)) et des Acts cognitifs (Oracle/Phantom).
  Les Acts II/III/IV deviennent trois stratégies au-dessus d'un même substrat navigateur + stealth +
  perception + cognition. La phase couvre aussi la composition multi-Act par step, le self-healing
  (fallback d'Act) et le human-in-the-loop (action `confirm`). Aucun comportement runtime modifié
  (`make check` vert, `import aetherius` reste léger).

### Modifié
- **Extras refondus (Jalon 2-A)** : nouvel extra `[cognition]` (`anthropic`, `pillow`) — le défaut
  partagé Oracle+Phantom, qui **absorbe l'ancien `[agent]`** (supprimé) ; `[vision]` repositionné
  en **grounder local optionnel** ; `[all]` et les markers pytest alignés (`cognition` remplace
  `agent`).
- **Oracle (Act III) redéfini** : le ciblage se fait par **grounding VLM** (Claude par défaut, un
  détecteur local restant une option branchable derrière la même interface) plutôt que par un modèle
  ONNX entraîné par tâche ; l'entraînement local devient une piste **optionnelle/avancée**. Fiches
  [docs/acts/oracle.md](docs/acts/oracle.md) et [docs/acts/phantom.md](docs/acts/phantom.md)
  réécrites (définition cible), [training/README.md](training/README.md) requalifié, section
  « Phase 2 » et descriptions Oracle du README harmonisées.

## [0.3.0] - 2026-07-17

Phase 1.5 : le socle devient **opérationnel** (planification, alertes, réactivité, furtivité réseau
et empreinte), et durcissement du socle Phase 1 avant d'entamer la Phase 2 (audit croisé de la doc).

### Ajouté
- **Durcissement de l'empreinte (Jalon 1.5-H)** — les signaux à forte valeur que le profil laissait à
  découvert sont fermés **de façon cohérente avec le profil actif** (un signal masqué mais incohérent
  est un tell pire que l'absence de masque). Côté navigateur,
  [`stealth/fingerprint/hardening.py`](src/aetherius/stealth/fingerprint/hardening.py) injecte, après
  le script de cohérence du profil, un init script masquant : **Canvas** (`toDataURL`/`toBlob`/
  `getImageData`) et **AudioContext** avec un bruit **déterministe par profil** (seed calculé côté
  Python, hachage JS — stable entre deux lectures d'un même run, différent d'un profil à l'autre, lu
  depuis une copie offscreen pour ne pas s'accumuler), **polices** (`measureText`), **client hints**
  (`navigator.userAgentData`), **écran** (`screen.*` + `devicePixelRatio`) et **WebGL2**
  (`getParameter`). Côté **Vector** (Act I, sans discrétion jusqu'ici),
  [`stealth/fingerprint/headers.py`](src/aetherius/stealth/fingerprint/headers.py) donne une identité
  d'en-têtes par défaut (`User-Agent`, `Sec-CH-UA`/`-Mobile`/`-Platform`, `Accept`, `Accept-Language`
  aligné sur la géo) supprimant la signature « client HTTP nu » — **opt-in** (injectée seulement quand
  `options.stealth` nomme un profil, un run sans stealth reste inchangé), les en-têtes explicites du
  Blueprint gardant la priorité (fusion insensible à la casse) ; l'impersonation TLS `curl_cffi` garde
  ses propres en-têtes. Le `FingerprintProfile` gagne les champs `screen`/`device_pixel_ratio`/
  `ua_platform`/`ua_full_version` et dérive `Sec-CH-UA` de sa propre version d'UA : la limite « UA-CH
  drift » est **levée**. Exemples exécutables zéro config
  `examples/continuum/fingerprint-hardening.blueprint.json` et
  `examples/vector/http-headers-identity.blueprint.json`. Voir [docs/stealth.md](docs/stealth.md).
- **Identité réseau (Jalon 1.5-G)** — option `options.proxy` de premier niveau qui rend le bot
  invisible **au niveau réseau**, pour les **deux** moteurs (la couche stealth ne touche que le
  navigateur). Le module `aetherius.network` est activé : `parse_proxy`/`ProxySpec` (rendu httpx et
  Playwright, credentials masqués dans les logs), `ProxyPool` (rotation `per_run`/`round_robin`/
  `random`/`sticky` — l'IP change d'un run à l'autre, ou reste stable par clé), `geo_hint` (cohérence
  timezone/locale/langues avec le pays de l'IP), `resolve_identity` (option du Blueprint > défaut
  d'environnement `AETHERIUS_PROXY_*` > aucun). Vector route par `httpx.Client(proxy=...)`
  (HTTP/HTTPS, plus SOCKS5 via l'extra `[network]` avec garde typée si absent) et peut imiter la
  poignée de main TLS d'un vrai navigateur (JA3/JA4) via un transport `curl_cffi` isolé
  (`acts/vector/impersonate.py`, extra `[network]`, `DependencyError` claire sinon). Continuum lie le
  proxy au lancement du contexte, force l'anti-fuite WebRTC (flag Chromium `disable_non_proxied_udp`
  + init-script filtrant les candidats ICE locaux — indispensable, sinon le proxy laisse fuir l'IP
  réelle) et dérive le profil d'empreinte pour coller à la géo (timezone/locale/`navigator.languages`
  alignés sur l'IP, vérifiés sur Chromium réel). Identifiants **jamais** stockés dans le Blueprint
  (`{{ secrets.x }}`). Le Studio préserve `options.proxy` verbatim (aucune régression à l'édition).
  Exemple exécutable `examples/vector/ip-echo-proxy.blueprint.json` (nécessite un proxy via `.env`).
  Voir [docs/network.md](docs/network.md).
- **Déploiement always-on (Jalon 1.5-F)** — recette 24/7 vérifiée de bout en bout pour héberger le
  daemon (et donc le scheduler) sur un hôte toujours allumé : VPS, Raspberry Pi, NAS. Les brouillons
  `deploy/` sont finalisés : image Docker multi-stage (wheel construit à part, image finale sans
  sources ni outils de build), utilisateur non-root, `HEALTHCHECK` sur `/health`, exemples embarqués
  comme sondes zéro config, variante Act II exécutable (`--build-arg BROWSER=1` : extra `[browser]` +
  Chromium sous `PLAYWRIGHT_BROWSERS_PATH` partagé) ; `docker-compose.yml` (volume persistant unique
  `/data`, port publié sur la loopback de l'hôte, `env_file` + `.env.example`, montage lecture seule
  `blueprints/` — les schedules résolvent des chemins côté conteneur) ; service systemd utilisateur
  (`enable-linger`, `EnvironmentFile` optionnel, redémarrage automatique) ; `.dockerignore` racine en
  allowlist (l'ancien `deploy/.dockerignore` était inopérant, le contexte de build étant la racine).
  Durcissement afférent : un `AETHERIUS_DAEMON_TOKEN` vide vaut absence de token — l'interpolation
  compose (`${VAR:-}`) n'active plus l'auth par accident (`server/config.py`, test miroir). Doc
  complète (recettes, persistance, sauvegarde SQLite, sécurité : loopback par défaut, exposer =
  token + reverse proxy TLS) : voir [docs/deployment.md](docs/deployment.md).
- **Actions custom / plugins (Jalon 1.5-E)** — points d'extension activés : un paquet tiers ajoute
  des actions de Blueprint et des canaux de notification sans forker le cœur. Découverte par
  entry-points (`aetherius.actions`, `aetherius.notify_channels`) dans le nouveau module
  `aetherius.plugins` (`load_plugins()` idempotent, appelé au démarrage par la CLI, le lifespan du
  daemon et `RunEngine.run` ; surface d'import unique pour les auteurs de plugins). Le registre
  d'actions dormant est activé : une action plugin embarque son `ActionSpec` (visible du Studio et
  des validators, invariant « registre = source, catalogue = projection » préservé), est
  **act-agnostique** (hors capability-table, validée dynamiquement) et dispatchée par les drivers
  en repli après leur `match` built-in. Gardes de collision sur les deux registres (les built-ins
  restent prioritaires, un conflit est un échec de chargement explicite) et pannes isolées (un
  plugin qui lève à l'import est loggé et sauté, jamais fatal). Plugin d'exemple exécutable
  (`examples/plugins/` : action `demo.slugify` + canal `logfile` + Blueprint zéro réseau), chargé
  par de vrais entry-points dans les tests. Voir [docs/plugins.md](docs/plugins.md).
- **Écran Console « Schedules »** — l'UI du scheduler (Jalon 1.5-D) dans la Console : liste des
  schedules (trigger, politique d'alerte, statut, prochains/derniers tirs en heure locale, sonde
  d'honnêteté « daemon actif ou non »), pause/reprise (`p`, la reprise recale la cadence),
  suppression confirmée (`d`, nouveau `ConfirmModal` réutilisable), **détail** avec l'historique
  des runs du schedule et un **tir manuel** aux événements streamés en direct (même brique
  in-process que `aetherius schedule run`, extraite dans `server/scheduler/manual.py::fire_schedule`
  et partagée CLI/Console), et **formulaire guidé** de création/édition (inputs du Blueprint en
  champs, secrets jamais saisis — état `.env` affiché, trigger/misfire/notify validés à la
  sauvegarde). Raccourci `s` dans Library pour planifier le Blueprint surligné. Captures SVG
  déterministes (fuseau épinglé, store de démo figé) et neutralisation renforcée des chemins
  (le home ne fuit plus, même tronqué dans une colonne). Voir [docs/console.md](docs/console.md).
- **Scheduler intégré au daemon (Jalon 1.5-D)** — rejeu persistant d'un Blueprint à heure fixe
  (cron à 5 champs, évalué dans le fuseau local, DST gérés via `tzlocal`), par intervalle ou en tir
  unique (`at`). Boucle de tick dans le lifespan du daemon (30 s, `AETHERIUS_DAEMON_SCHEDULER_TICK_SECONDS`) ;
  un run planifié passe par `RunManager.submit` — mêmes événements, même historique, plus le lien
  `schedule_id`. Rattrapage des tirs manqués par politique `misfire` (`skip`/`run_once`/`run_all`,
  portée par le trigger, résolue par le tick au-delà d'une fenêtre de grâce) et politique d'alerte
  par schedule (`failure`/`success`/`always`/`change` — la dédup au changement d'état s'appuie sur
  `state.compare_and_set`, cibles `{{ secrets.x }}` rendues au tir, jamais persistées). CLI
  `aetherius schedule add|list|rm|pause|resume|run` (écrit directement dans le store : marche daemon
  éteint ; `cli.py` devient le package `cli/`) et API `/v1/schedules` (CRUD + tir immédiat,
  contrat OpenAPI à jour). Exemple zéro config : `examples/vector/quotes-watch.blueprint.json`.
  Dépendances : `croniter` (déjà déclarée) + `tzlocal`. Voir [docs/scheduler.md](docs/scheduler.md).
- **Notifications natives (Jalon 1.5-C)** — couche d'alerte sans dépendance nouvelle (`notify/`) :
  quatre canaux built-in en un POST `httpx` chacun (webhook générique, Discord, Telegram, ntfy pour
  la push téléphone, en mode JSON publishing), action `notify` Act-agnostique (handler partagé, se
  combine à `when`), `NotifySink` de fin de run (`failure`/`success`/`always`) et registre de canaux
  prêt pour les plugins (Jalon E). Échec d'envoi contenu : jamais fatal au run, `delivered` exposé
  dans les outputs du step. Exemple zéro config :
  `examples/vector/books-restock-notify.blueprint.json`. Voir
  [docs/notifications.md](docs/notifications.md).
- **Réactivité et flux conditionnel (Jalon 1.5-B)** — garde d'étape `when` universelle (évaluée
  avant dispatch, même règle de véracité que `assert` ; step sauté = statut `skipped` + événement
  `step_skipped`, contrats et SDK TypeScript à jour) et actions `if`/`repeat`/`for_each` exécutées
  par un **exécuteur récursif** dans le moteur (`core/runtime/steps.py`), en amont des drivers —
  tous les Acts en héritent sans câblage, `repeat` rejoint les capacités Vector. Variable de boucle
  `as` (défaut `item`) exposée au template le temps de l'itération, validation sémantique récursive
  des branches, identifiants de steps imbriqués traçables (`loop[2].fetch`), schéma des steps
  formalisé (`when`, `then`/`else`/`steps`). Deux exemples zéro config dans `examples/vector/`.
  Voir [docs/blueprint-schema.md](docs/blueprint-schema.md).
- **Persistance durable (Jalon 1.5-A)** — socle de stockage SQLite (stdlib `sqlite3`, mode WAL, zéro
  dépendance) sous `~/.aetherius/aetherius.db`, avec migrations versionnées (`PRAGMA user_version`) et
  trois dépôts typés : schedules, historique des runs, état clé/valeur inter-run (`compare_and_set`
  pour la déduplication d'alertes). Le daemon persiste désormais le résultat de ses runs dans le store
  (migration douce, sans régression). Voir [docs/store.md](docs/store.md).
- **Cadrage Phase 1.5** — squelette (stubs, interfaces, contrats) et spécifications par jalon pour
  rendre le socle **récurrent, réactif et furtif** : persistance SQLite (`store/`), notifications
  natives (`notify/`), scheduler du daemon, flux conditionnel (`when`, `if`/`repeat`/`for_each`),
  plugins, déploiement 24/7, **identité réseau** (`network/` : proxy, rotation d'IP, anti-fuite
  WebRTC, cohérence géo, impersonation TLS) et **durcissement de l'empreinte**
  (`stealth/fingerprint/` : canvas/audio/UA-CH/écran/WebGL2 + identité d'en-têtes pour Vector).
  Aucune capacité n'est encore activée (jalons en attente : l'action `notify` est déclarée mais
  marquée `PENDING`, les modules lèvent une erreur « jalon en attente ») ; `make check` reste vert.
  Nouvel extra optionnel `[network]` (SOCKS5 + `curl_cffi`). Voir [docs/phase-1.5/](docs/phase-1.5/README.md).
- **Suivi des nouveaux onglets (Act II — Continuum)** : un clic ouvrant un onglet (`target="_blank"`,
  `window.open`) rend la nouvelle page active pour les steps suivants, avec retombée sur une page
  survivante si l'onglet actif se referme. Auparavant les steps restaient bloqués sur l'onglet initial.
- **Recorder « Make input »** : le `type`/`format` de l'input produit est inféré du type HTML du champ
  (`number`, `date`+`format`, `email`/`url`, …) au lieu d'un `string` générique.

### Sécurité
- **Évaluateur `where` (Act I — Vector)** : rejet explicite des attributs magiques (`__class__`,
  `__globals__`, tout nom en `__`) dans l'AST-walk. L'allowlist de nœuds bloquait déjà l'exécution de
  code, mais la traversée d'attributs dunder combinée à une comparaison restait un oracle booléen sur
  le graphe d'objets Python — la garde ferme cette évasion de sandbox sans dépendre de l'absence
  d'appels/indexation.

### Corrigé
- **`precise_sleep` (stealth/humanizer)** : le busy-wait pur sous 20 ms saturait un cœur CPU à 100 %
  (chaque point de geste souris), risque de privation de ressources sur le daemon en multi-run.
  Désormais `time.sleep` cède le CPU pour le gros du délai et le busy-wait ne couvre que la queue
  (~1,5 ms) — précision de timing inchangée, CPU au repos (~9 %).
- **Debug (Act II — Continuum)** : quand les entrées sont humanisées, `slow_mo` est à 0 et les actions
  brutes (`select`, `upload`, `navigate`, …) défilaient instantanément, illisibles en debug. Elles
  reçoivent maintenant un délai manuel équivalent.

## [0.2.0] - 2026-07-10

Première release publique. Elle clôt la **Phase 1** : le socle d'Aetherius, utilisable comme
**bibliothèque** (in-process Python) et comme **service** (daemon local + SDK), avec sa Console.

### Ajouté
- **Daemon local (FastAPI)** — passerelle HTTP + WebSocket exposant le moteur à tout langage
  (`aetherius serve`, bind loopback, token bearer optionnel) : `POST /v1/runs`, `GET /v1/runs/{id}`,
  `WS /v1/runs/{id}/events` (rejeu bufferisé + flux live jusqu'à `done`), `POST /v1/blueprints/validate`,
  `GET /v1/schema`, `GET /health`. L'enregistrement reste host-local (`POST /v1/recorder/sessions` → 501).
  Voir [docs/daemon.md](docs/daemon.md).
- **SDK TypeScript** `@aetherius/client` (Node 20+) — spawn du daemon (ou `baseUrl`),
  `client.run(blueprint, { inputs, secrets, onEvent })`, streaming d'événements typé.
- **Console : écran Settings** — démarrer/arrêter le daemon et voir son statut, sans quitter le terminal.
- **Act I — Vector** : client HTTP/API (requêtes, retries/backoff, 5 stratégies d'auth, extraction
  JSONPath et CSS/XPath, moteur de templates Jinja2).
- **Act II — Continuum** : automatisation d'un vrai navigateur (Playwright, extra `[browser]`) —
  navigation, interactions, extraction DOM, `wait_for` avec échec nommé, sessions persistantes, debug.
- **Système de discrétion (stealth)** : couche transverse (`options.stealth`) — souris humaine par
  rejeu géométrique de gestes, clavier/scroll/timing humains, fingerprint, warmup de profil.
- **Recorder** : création de Blueprint par démonstration (Continuum et Vector) + gesture recorder.
- **Builder headless + Blueprint Studio** : construction guidée de Blueprints sans JSON, avec aperçu
  validé en direct, réutilisable par la Console, le daemon et les SDKs.
- **Console (Textual)** : Library, Runs, Catalog, Recorder, Blueprint Studio, Settings.
- **Contrats** langage-agnostiques (`contracts/`) : schéma Blueprint, OpenAPI du daemon, schéma
  d'événements — source de vérité, gardés par des tests.

### Notes
- SemVer `0.x` : l'API peut évoluer pendant le durcissement de la Phase 1.
- La **Phase 2** ajoutera Act III (Oracle, vision) et Act IV (Phantom, agent autonome).

[Non publié]: https://github.com/kln-mltre/Aetherius/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/kln-mltre/Aetherius/releases/tag/v0.4.0
[0.3.0]: https://github.com/kln-mltre/Aetherius/releases/tag/v0.3.0
[0.2.0]: https://github.com/kln-mltre/Aetherius/releases/tag/v0.2.0
