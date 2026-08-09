# Changelog

Toutes les évolutions notables du projet sont consignées ici. Le format s'inspire de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le versionnage suit
[SemVer](https://semver.org/lang/fr/).

Ce fichier a été ouvert avec le socle de documentation : les versions antérieures à `5.6.1` ne sont
pas détaillées rétrospectivement. Leur contenu reste consultable dans les
[Releases GitHub](https://github.com/KAE-Lab/UKit/releases) et dans l'historique Git.

## [Non publié]

Le plus gros ensemble de changements depuis la reprise du projet : quatre fonctionnalités majeures,
puis une refonte complète de l'architecture. Rien de tout cela n'est encore publié sur les stores.

### Ajouté

- **La session universitaire jouée par le moteur** (jalon
  [6-F](docs/phase-6/6-f-scolarite.md)). `ScolariteWebSession.tsx` est **supprimé** : 323 lignes de
  WebView cachée pilotée par du JavaScript en gabarits de chaîne, quatre scripts déclenchés selon
  l'URL de fin de chargement, trois `MutationObserver` avec trois plafonds différents et un garde-fou
  global de 60 s deviennent deux [Blueprints](docs/blueprints.md) — `ukit.scolarite.dossier` pour le
  parcours froid, `ukit.scolarite.messagerie` pour le parcours chaud.

  **Les identifiants ne traversent plus la source d'un script.** Ils sont encodés en JSON et
  transmis par une communication corrélée avec l'agent injecté : un mot de passe contenant une
  apostrophe ne peut plus casser le remplissage, par construction. Le même défaut existait dans le
  remplissage automatique du **navigateur intégré**, hors périmètre du jalon mais corrigé au passage.

  **Un décalage des sélecteurs GWT devient une erreur, plus une donnée fausse.** Les cinq libellés
  voisins du dossier sont lus et affirmés ; s'ils bougent, la session échoue avec un message
  explicite et **rien n'est écrit** dans le trousseau. C'est le seul endroit où la version migrée est
  franchement meilleure que l'originale, et elle ne le doit qu'au fait que la description est de la
  donnée. Le libellé `Prénom et Nom` rend d'ailleurs un service de plus : c'est lui qui autorise à
  prendre le premier mot de l'identité comme prénom, la lecture du prénom sur l'ENT ayant disparu
  avec la page qui la portait.

  **Les échecs se distinguent enfin.** Identifiants refusés, portail injoignable, messagerie muette,
  libellés décalés et sélecteur introuvable produisent cinq écrans différents au lieu d'un onglet qui
  restait sur son dernier état. Un mot de passe faux est nommé en **13 s** au lieu de 41, grâce à une
  garde sur le panneau d'erreur du CAS — mesurée, parce que les deux sélecteurs que le code d'origine
  interrogeait (`#msg.success`, `#msg.errors`) ne correspondaient **plus à rien** depuis un moment,
  sans que rien ne le signale.

  **Une session à la fois, et elle ne survit pas à l'écran qui l'a demandée** : la seconde demande
  est refusée explicitement, l'application qui passe en arrière-plan annule le run — et reprend au
  retour —, et une session annulée n'écrit rien, ce qui évite qu'une déconnexion en cours de route
  remette dans le trousseau l'identité qu'elle vient d'effacer.

  **Un portail muet propose de réessayer**, alors que sa famille d'échec ne le prévoit pas. C'est une
  décision d'écran prise après mesure : sur un appareil, une source injoignable n'est **jamais**
  rangée en « service indisponible », donc le bouton n'apparaissait sur aucune panne réseau. La
  limite est celle du moteur et elle est écrite ; l'application en corrige la conséquence pour les
  deux codes qui décrivent un service absent, et laisse un refus d'identifiants sans bouton — rejouer
  le même mot de passe donnerait le même refus.

  **Vérifié sur iPhone**, parcours froid et chaud, avec les chemins dégradés joués un par un et
  produisant chacun un écran distinct. La livraison à chaud a été jouée en conditions réelles sur le
  bucket de production : une version volontairement cassée publiée, reçue et jouée par l'appareil,
  puis la correction publiée et reçue — **sans que rien ne soit réinstallé entre les deux**.

  Ce qui **ne change pas** : le verrou biométrique, le stockage chiffré, le navigateur intégré, la
  distinction froid/chaud, et la promesse que les identifiants ne vont qu'au CAS de l'université.

- **L'emploi du temps joué par le moteur, et un serveur en moins** (jalon
  [6-E](docs/phase-6/6-e-planning.md)). `PlanningApiService` et `CampusApiService` n'émettent plus
  aucune requête : six [Blueprints](docs/blueprints.md) portent les six appels que l'application joue
  réellement — la liste des groupes, une journée, une semaine, la plage annuelle de synchronisation,
  la liste des salles, l'occupation d'un bâtiment. `axios` et `qs` disparaissent des deux services et
  de `ScheduleList`.

  **Le relais `ukit.kbdev.io` sort de l'architecture.** Il existait parce qu'une page web ne peut pas
  appeler un autre domaine sans son accord, et que l'application était une WebView ; une requête
  émise nativement depuis l'appareil n'y est pas soumise. Les Blueprints visent
  `celcat.u-bordeaux.fr` directement — un serveur à héberger, à payer et à surveiller en moins. Trois
  conditions ont été mesurées avant de basculer et sont consignées dans
  [sources-externes.md](docs/sources-externes.md) : le serveur ne filtre ni sur `Origin`, ni sur
  `Referer`, ni sur l'`User-Agent`.

  **Et le relais était déjà tombé.** Il répondait `522` à chacune des trois sondes du jour de la
  bascule : le planning des utilisateurs sans cache était en panne. Ce jalon est donc autant une
  réparation qu'une migration.

  Vérifié sur iPhone : vue jour et semaine identiques, planning agrégé, synchronisation calendrier
  sans doublon, et les trois familles d'échec produisant trois écrans distincts. Captures dans
  [docs/features/planning.md](docs/features/planning.md). Deux points restent **non vérifiés** et sont
  écrits comme tels : la tâche de fond application fermée, et le réseau Wi-Fi (les sondes ont été
  jouées en 4G) — voir [6-e-planning.md](docs/phase-6/6-e-planning.md).

  **Le cache n'a pas bougé d'un octet.** Il enveloppe l'appel, avant comme après — c'est ce qui rend
  la bascule invisible sur la seule fonctionnalité que l'application promet de faire marcher hors
  ligne, et c'est aussi ce qui permettrait de la défaire.

  Ce qui reste applicatif est écrit, et ce n'est pas rien : le rejet des vacances *et* le refiltrage
  sur la date exacte — **un filtre, un endroit**, contrairement au fichier de référence qui les
  dédoublait —, le nettoyage des descriptions, l'extraction du code d'UE, le tri double, le découpage
  de la semaine, et les calculs de plage qui ont besoin de l'heure courante.

- **Un interrupteur « hors ligne » dans le menu de développement.** Il coupe le réseau de
  l'**application** — `isConnected()` et le `fetch` du moteur — sans toucher à celui de l'appareil,
  donc sans perdre Metro. Le mode avion, lui, coupe la session de développement : en pratique on
  finissait par ne pas tester le chemin dégradé, celui qui décide de l'expérience réelle. Les deux
  volets sont nécessaires — sans le second, les écrans Campus ne verraient rien, ils ne consultent
  pas `NetInfo`. Ne couvre pas la WebView de l'Act II, ce qui est écrit.
  [docs/qualite.md](docs/qualite.md)

- **Le planning distingue enfin ses échecs** (jalon [6-E](docs/phase-6/6-e-planning.md)). Une source
  injoignable affiche « Service indisponible » avec Réessayer, une réponse inattendue le dit sans
  proposer de rejouer, et une journée légitimement vide garde sa carte « pas de cours ». Un échec
  réseau sans cache **laissait auparavant l'indicateur de chargement tourner indéfiniment** ; il
  produit désormais un écran nommé. Le bandeau de cache daté, lui, est inchangé.

- **Les sources de campus jouées par le moteur** (jalon [6-D](docs/phase-6/6-d-campus.md)).
  `CrousService` et `LibraryService` n'émettent plus aucune requête : cinq
  [Blueprints](docs/blueprints.md) portent les cinq appels que l'application joue réellement —
  restaurants, menu d'un restaurant, sites d'un point de balayage, affluence, horaires d'une semaine.
  Les URLs, les en-têtes imités du client web Affluences et les constantes de protocole deviennent des
  fichiers corrigeables à distance ; `axios`, `qs` et `fetch` disparaissent des deux services.

  **La frontière s'écrit ici, en pratique.** Le balayage géographique en douze points reste
  applicatif, et pour trois raisons dont aucune n'est un manque du moteur : la liste des villes
  couvertes est une décision produit, le filtre de catégorie demanderait d'indexer une liste dans un
  prédicat — refusé par les deux moteurs, volontairement — et Haversine est du calcul, qu'il faudrait
  sinon réimplémenter à l'identique deux fois.

  **Les écrans distinguent enfin les échecs.** Une source injoignable affiche « Service
  indisponible » avec Réessayer, une réponse inattendue le dit sans proposer de rejouer, et une liste
  légitimement vide garde son état vide. Trois écrans différents là où il n'y en avait qu'un.

  Et une nuance que l'ancien code ne savait pas exprimer : **une couverture partielle se dit**. Deux
  points de balayage muets sur douze n'emportent plus les dix autres — la liste s'affiche, avec un
  bandeau qui signale qu'elle est peut-être incomplète.

- **Le référentiel des bâtiments gagne sa surcouche distante** (jalon
  [6-D](docs/phase-6/6-d-campus.md)). `assets/locations.json` reste le socle embarqué — l'application
  doit être complète hors ligne et au premier lancement — et la table `batiments` le corrige **champ
  par champ**, sans jamais écraser une valeur avec du vide. Un horaire faux, une coordonnée décalée ou
  un visuel à remplacer se corrigent désormais sans release, ce qui est le défaut le plus banal de ce
  référentiel.

- **La livraison des Blueprints** (jalon [6-C](docs/phase-6/6-c-livraison.md)). C'est le jalon où la
  phase commence à payer : **corriger une source devient une publication de fichier, pas une
  release**. Le registre résout chaque [Blueprint](docs/blueprints.md) entre le socle embarqué dans
  le binaire et une surcouche publiée sur la base ; `npm run blueprints:publish` valide, téléverse,
  calcule les empreintes et régénère le manifeste, et la correction atteint les appareils au retour
  au premier plan suivant.

  Les deux propriétés qui décident du reste : la résolution **ne touche jamais au réseau** — un run
  n'attend pas un CDN pour savoir quoi jouer — et le rafraîchissement **ne lève jamais**, il rend un
  rapport. Un point de publication en panne ne devient pas une application en panne.

  Un Blueprint distant est de la donnée exécutable, et il est traité comme telle : empreinte SHA-256
  revérifiée à **chaque lecture**, validation complète avant mise en cache, périmètre de secrets
  fermé, version strictement supérieure, et un nom absent du binaire reste refusé. Ces neuf gardes
  sont couvertes par des tests unitaires jouant le vrai registre.

  Et parce qu'un mécanisme de déploiement sans retour arrière n'en est pas un, trois interrupteurs
  d'arrêt : `--desactiver` ou `--arret` côté publieur, un bouton « Embarqué » dans l'application, et
  `BLUEPRINTS_REMOTE=false` à la construction. Le menu de développement gagne un onglet
  **Blueprints** qui dit, pour chacun, sa version, son origine et la raison du dernier
  rafraîchissement — la question « pourquoi ma correction n'arrive pas » se répond en trois secondes.

- **La base de publication, et les annonces qui y passent** (jalon
  [6-B](docs/phase-6/6-b-supabase.md)). UKit a désormais un dos : un projet Supabase mince, dont le
  schéma et les politiques d'accès vivent dans [`supabase/`](supabase/) et s'appliquent depuis ces
  fichiers. Les annonces de vie étudiante y sont lues, visuels compris ; le dépôt `ukit-data` servi
  par jsDelivr cesse d'être écrit, et son repli est retiré. Le référentiel des 73 bâtiments y est
  migré mais pas encore lu — c'est le jalon 6-D qui le branchera.

  Ce que la base **ne** change **pas** mérite d'être dit aussi clairement : aucun compte n'est
  requis, aucune donnée personnelle ne la traverse, et l'application démarre et s'utilise
  entièrement sans jamais la joindre. C'est un point de publication, pas un intermédiaire — le
  [README](README.md) et [PRIVACY](PRIVACY.md) sont reformulés dans ce sens.

  Et le gain visible, enfin : **le modèle d'erreur atteint son premier écran**. Une panne de la
  source affiche « Service indisponible » et un bouton Réessayer, là où elle produisait une liste
  vide indistinguable d'une absence d'annonces ; le carrousel du tableau de bord ne disparaît plus
  en silence. Le bouton n'apparaît que si réessayer peut réparer quelque chose. Au passage, une
  annonce sans date d'expiration ne disparaît plus de l'écran — la base la publie, le code la
  masquait.

- **Le socle du moteur Aetherius et la première source migrée** (jalon
  [6-A](docs/phase-6/6-a-socle.md)). L'application embarque `@aetherius/engine` et
  `@aetherius/react-native`, sait jouer un [Blueprint](docs/blueprints.md) depuis n'importe quel
  service, et **les annonces de vie étudiante y passent déjà**, derrière la signature inchangée de
  `BdeService.fetchAnnonces` — l'ancien chemin reste en repli jusqu'au jalon 6-H. Rien ne change
  pour l'utilisateur : c'est la fondation des sept jalons suivants.

  Le vrai apport est le **modèle d'erreur**. Les services rendaient `null` ou `[]`, ce qui rendait
  une panne du fournisseur et une réponse légitimement vide indistinguables ; un échec est désormais
  rangé dans l'une des neuf familles du moteur, traduite en message dans les trois dictionnaires.
  Le Blueprint des annonces a gagné au passage l'extraction de la description longue, qu'il oubliait,
  et une assertion sur la forme de la réponse — sans elle, une clé disparue produirait un succès à
  liste vide.
- **Un premier harnais de test automatisé**, borné au socle du moteur : `npm test`
  ([vitest](https://vitest.dev)) couvre la résolution des secrets, le registre de Blueprints et la
  table du modèle d'erreur. `npm run parity` rejoue le Blueprint des annonces contre la vraie source
  et le compare au service historique. [docs/qualite.md](docs/qualite.md)
- **Cadrage et squelette de la Phase 6** — la façon d'atteindre les sources distantes va quitter le
  binaire pour devenir des [Blueprints](docs/blueprints.md) joués par le moteur Aetherius embarqué,
  publiés depuis une base et corrigeables sans release. Ce changement pose la documentation de phase
  ([docs/phase-6/](docs/phase-6/README.md), huit jalons spécifiés), les deux documents transverses
  ([blueprints.md](docs/blueprints.md), [backend.md](docs/backend.md)), le socle de code
  (`src/shared/aetherius/`, `src/shared/supabase/`), les six Blueprints de référence dans
  [`blueprints/`](blueprints/), le schéma et les politiques de la base ([`supabase/`](supabase/)) et
  le [harnais de parité](tools/parity/README.md).
- **Onglet Campus et son tableau de bord** — quatre sections indépendantes (annonces, restaurants,
  bibliothèques, salles libres) au-dessus d'un socle de liste commun : recherche, filtres persistés,
  favoris, tri par distance, états vides. La position de l'utilisateur est résolue une seule fois pour
  tout l'onglet. [docs/features/campus.md](docs/features/campus.md)
- **Détecteur de salles libres** — reconstruction des bâtiments depuis les salles Celcat, croisement
  avec les horaires d'ouverture déclarés dans `locations.json`, et calcul des créneaux libres par
  heure avec leur durée de disponibilité.
  [docs/features/campus-salles-libres.md](docs/features/campus-salles-libres.md)
- **Recherche et filtres** sur les listes de restaurants et de bibliothèques, avec persistance du
  filtre choisi, propagée aux sections du tableau de bord.
- **Annonces de vie étudiante** — contenu éditorial publiable sans mise à jour de l'application, avec
  activation et date d'expiration. Servi à l'origine depuis le dépôt `ukit-data` via jsDelivr, puis
  depuis la [base de publication](docs/backend.md) au jalon 6-B.
  [docs/features/campus-vie-etudiante.md](docs/features/campus-vie-etudiante.md)
- **Onglet Scolarité** — connexion au compte universitaire par CAS dans une WebView invisible,
  récupération de l'identité de l'étudiant au premier login puis rafraîchissement léger de la
  messagerie aux lancements suivants, verrou biométrique, et navigateur intégré avec remplissage
  automatique du formulaire de connexion. Identifiants et données personnelles stockés chiffrés, sans
  jamais quitter l'appareil. [docs/features/scolarite.md](docs/features/scolarite.md)
- **Rappels de cours** — notification programmée avant chaque cours du planning favori, avec délai
  réglable, reconstruction complète à chaque planification et plafond de vingt rappels pour rester
  sous la limite du système. [docs/features/settings.md](docs/features/settings.md)
- **Nouvelle navigation** — quatre onglets avec barre personnalisée, bouton d'action contextuel selon
  l'onglet actif, et animation d'en-tête au défilement centralisée dans des helpers partagés.
  [docs/navigation.md](docs/navigation.md)
- **Nouveau parcours de planning** — fusion des vues jour et semaine dans un écran unique avec bascule
  de mode, curseur de dates couvrant l'année scolaire, et carrousel pour les cours simultanés.
  [docs/features/planning.md](docs/features/planning.md)
- **Écran Réglages refondu** — sections thématiques, modales de langue, de filtres d'UE, de choix de
  calendrier et de réinitialisation.
- **Socle de documentation** — [README](README.md) comme document maître,
  [CONTRIBUTING](CONTRIBUTING.md) portant la définition de « terminé », et [`docs/`](docs/) détaillant
  architecture, conventions, navigation, persistance, sources externes, thème, i18n, cartographie,
  plateforme, qualité, plus une documentation par domaine fonctionnel.

### Modifié

- **Migration TypeScript intégrale** — plus aucun fichier `.js` ou `.jsx` dans `src/` : i18n,
  navigation, services, thème, composants d'interface, modules Planning, Campus, Scolarité, Settings
  et Onboarding, ainsi que les fichiers racine.
- **Nouvelle architecture de dossiers** — découpage par **domaine de navigation** (`src/features/`)
  au lieu du découpage par type technique, avec un `src/shared/` réservé au réellement transverse.
  Chaque feature porte ses écrans, composants, hooks et services.
  [docs/architecture.md](docs/architecture.md)
- **`DataService` éclaté** en services dédiés par domaine : accès Celcat côté planning et côté salles,
  managers observables séparés pour les groupes et les bâtiments.
- **Le rendu d'un échec de source est remonté dans `shared/ui/`** sous le nom `SourceFailureNotice` :
  le planning en avait besoin, et une dépendance croisée entre deux dossiers de `features/` est ce que
  l'architecture demande d'éviter. Les écrans Campus qui l'importaient sous son ancien nom ne changent
  pas.
- **Les deux pièces « calendrier système » sont sorties d'`AppCore`** vers
  [`CalendarSyncHelpers.ts`](src/shared/services/CalendarSyncHelpers.ts) : le fichier franchissait la
  limite de 400 lignes que le projet s'impose, et ce sont deux fonctions sans état.
- **Règles ESLint d'architecture** ajoutées comme garde-fous : taille de fichier, taille de fonction,
  profondeur d'imbrication, complexité cyclomatique, interdiction de `any`.
  [docs/qualite.md](docs/qualite.md)
- **Suppression de tous les types `any`** hérités de la migration, hors onze occurrences résiduelles
  signalées en avertissement.

### Corrigé

- **La spécification du jalon [6-C](docs/phase-6/6-c-livraison.md) décrivait moins que ce qui avait
  été livré.** Son commit de livraison ne l'avait pas touchée : le panneau de diagnostic y était
  attribué au mauvais fichier, annoncé avec deux boutons au lieu de trois — celui qui joue un
  Blueprint manquait, alors que c'est lui qui rend le parcours de correction vérifiable — et la table
  des gardes en listait cinq contre dix réellement couvertes par les tests. Corrigé contre le code, et
  l'anomalie est écrite en tête du document plutôt que gommée. Une ligne de checklist a été ajoutée au
  [CONTRIBUTING](CONTRIBUTING.md) : une spécification restée intacte est indiscernable d'une
  spécification dont l'amendement a été écrasé, donc elle se vérifie par `git diff`, pas de mémoire.
- **Le splash attendait deux appels réseau avant de s'effacer.** `PlanningDataManager.loadData()` et
  `CampusDataManager.loadData()` sont attendus par [`App.tsx`](App.tsx) et allaient chercher leur
  liste sur le réseau dès que le cache de sept jours avait expiré. Tant que le relais Celcat
  répondait `522` après vingt secondes, l'application restait donc figée jusqu'à quarante secondes au
  démarrage — une fois tous les sept jours, ce qui rendait le symptôme apparemment aléatoire. Les deux
  managers servent désormais leur cache immédiatement et rafraîchissent **sans bloquer** ; étant
  observables, la liste fraîche atteint les écrans dès qu'elle arrive. Le passage à
  `celcat.u-bordeaux.fr` avait masqué le symptôme, il ne l'avait pas corrigé.
- **Le sélecteur de date du menu de développement était invisible en thème clair sur iOS.**
  `DateTimePicker` ne recevait pas `themeVariant` : il suivait l'apparence du **système** et non celle
  de l'application, donc un iPhone en mode sombre affichait du texte blanc sur le fond clair du menu.
- **La simulation temporelle ne s'appliquait qu'à la moitié de l'application.** Elle remplace
  `moment.now`, donc tout ce qui date par `new Date()` lui échappait : les salles libres retenaient le
  vrai jour d'ouverture — un bâtiment restait fermé quel que soit le jour simulé — et la péremption
  des annonces ignorait l'heure simulée. Les cinq sites concernés datent désormais par `moment()`. La
  règle est écrite dans [qualite.md](docs/qualite.md) : le code applicatif date par `moment()`, jamais
  par `new Date()`.
- **Le jeton d'annulation du planning n'annulait rien.** `ScheduleList` créait un
  `axios.CancelToken`, le stockait et l'annulait au démontage — sans jamais le transmettre à un
  appel, que `PlanningApiService` n'acceptait pas. Une réponse tardive pouvait donc écrire dans
  l'état d'un composant démonté. Le moteur accepte un `AbortSignal` : l'annulation fonctionne, et le
  dernier composant qui importait une bibliothèque réseau ne le fait plus.
- **Une synchronisation calendrier en échec laissait l'indicateur tourner pour toujours.** Le retour
  anticipé oubliait de rabaisser le drapeau `isSynchronizingCalendar`, et l'écran de réglages ne
  pouvait plus distinguer un échec d'une synchro sans fin.
- **Les horaires des restaurants CROUS étaient invisibles.** La source a cessé de servir `horaires`
  comme un tableau pour le servir comme une chaîne JSON ; le test `Array.isArray` était donc faux
  pour les 41 établissements de la région, et l'écran affichait « horaires non spécifiés » partout.
  Les deux formes sont désormais acceptées. Défaut trouvé en mesurant la source pour écrire son
  Blueprint, pas à la relecture.
- **Une réponse de menu sans date vidait le menu entier.** La normalisation appelait `.includes()`
  avant de vérifier que la valeur n'était pas nulle ; l'exception était rattrapée par le service, qui
  rendait alors une liste vide sans rien signaler.
- **Un restaurant qui ne publie aucun menu n'est plus confondu avec une panne.** 24 des 41
  établissements répondent `404` sur cette route, ce qui veut dire « rien à publier » : le Blueprint
  l'accepte explicitement et refuse tout autre statut.
- Comptage des cours dans la vue semaine.
- Doublons de notifications lors de replanifications successives.
- Apparence de la section active de la barre de navigation sur Android.
- Erreurs de typage introduites par la migration TypeScript.

### Retiré

- `CrousMenu`, `CrousMenuCategory` et `CrousDish` : trois interfaces qu'aucun écran ne lisait, et le
  champ `CrousRestaurant.menus` qui n'était jamais rempli.
- Le Blueprint de référence `ukit.campus.affluence`, remplacé par les trois documents que les écrans
  demandent réellement.
- `ERROR_WITH_CODE` et `ERROR_WITH_MESSAGE` des trois dictionnaires : leur seul lecteur reniflait la
  forme d'une erreur `axios` pour deviner ce qui s'était passé. La famille d'échec le dit mieux, et
  avec un message par cas.
- `WebApiURL` de [`urls.ts`](src/shared/constants/urls.ts) : le domaine du relais Celcat et ses trois
  routes, avec leurs deux derniers lecteurs. L'adresse de la source vit désormais dans les
  Blueprints, donc corrigeable sans release.
- `axios` et `qs` de `PlanningApiService`, `CampusApiService` et `ScheduleList`. Les deux paquets
  restent installés : `AppUI` interroge encore le fichier de version distant, et `qs` sert au harnais
  de parité pour comparer l'encodage historique.
- Fichiers de journalisation d'erreurs laissés dans le dépôt.

## [5.6.1] - 2026-04-13

Dernière version publiée sur les stores.

## [5.6.0] - 2026-04-03

## [5.5.2] - 2026-04-02

## [5.5.0] - 2026-03-23

## [5.4.0] - 2026-03-08

## [5.3.0] - 2026-03-01

## [5.2.0] - 2026-02-28

## [5.1.0] - 2026-02-27

## [5.0.0] - 2026-02-23

Première version de la reprise du projet par KAE Lab, à partir de UKit 4.1.2.
