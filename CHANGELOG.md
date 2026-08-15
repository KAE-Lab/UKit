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

- **L'emploi du temps universel** (jalon [6-I](docs/phase-6/6-i-planning-universel.md)).
  **Bordeaux INP a un emploi du temps**, par l'**export iCalendar** de son serveur ADE — et l'écran est
  celui de Bordeaux au pixel près : aucun composant n'a été modifié pour ça.

  C'est la réponse à un constat mesuré : un balayage de vingt universités françaises n'a trouvé
  **aucune** instance Celcat interrogeable sans authentification hors Bordeaux, alors que presque tous
  les produits d'emploi du temps savent exporter en iCal (RFC 5545). Porter chaque produit un par un
  serait sans fin ; lire un format normalisé ne l'est pas.

  Ce qui rend l'ajout possible sans release : le catalogue déclare **ce qui existe** — les deux
  Blueprints à jouer, le projet ADE de l'année, le référentiel `groupe → ressource`, et la façon de
  lire un code de bâtiment dans une salle. Les quatre signatures du service de planning n'ont pas
  bougé d'une lettre, et les Blueprints vivent sous le préfixe réservé `ukit.portail.`.

  Trois décisions valent d'être connues. **La couleur d'un cours est dérivée de sa matière** — un
  iCalendar n'en porte aucune — par une empreinte stable qui choisit l'une des huit teintes que
  l'application utilise déjà : même cours, même couleur toute l'année, et Bordeaux ne change pas.
  **La reconnaissance de salle est devenue une donnée d'établissement** : elle était une expression
  bordelaise en dur, et aucune salle de l'INP ne lui correspondait. **Le référentiel des groupes est
  un relevé d'auteur**, scripté (`tools/releve-ade.mjs`) et rejouable à chaque rentrée, parce qu'ADE
  n'expose aucun arbre de ressources anonyme.

  Treize groupes sur les cinq écoles de l'INP, dix bâtiments relevés sur OpenStreetMap, un cas de
  parité épinglé sur une semaine passée fixe, et 51 tests de plus.

  **La campagne sur appareil a corrigé trois choses**, dont deux qu'aucun terminal ne montrait :
  l'icône d'une ligne de description était assignée par sa **position** — juste avec Celcat, fausse
  avec un iCalendar, où la salle portait l'icône « groupe » —, et la palette dérivée contenait une
  teinte neutre qui faisait passer un cours sur sept pour un cours sans couleur. La troisième est une
  décision produit : **la recherche de salles libres est ouverte à Bordeaux INP**, qui emprunte
  l'inventaire de l'Université de Bordeaux — ses écoles sont sur le même campus, à deux cents mètres
  des bâtiments concernés.

  Elle a aussi corrigé un cinquième point, invisible sur un cours ordinaire : une **année en tête de
  titre** — `2025-2026 - Les rencontres du Réseau d'Écoute` — était prise pour un code d'unité
  d'enseignement, ce qui amputait le titre et affichait `2026` en en-tête de fiche. Seize matières
  d'un seul groupe étaient dans ce cas. Un code d'UE exige désormais au moins une lettre.

  Elle a enfin révélé un défaut **antérieur au jalon** : changer d'université n'effaçait pas les
  groupes favoris ni les filtres d'UE, alors que la réinitialisation le faisait — et que la
  documentation l'annonçait depuis le jalon 6-G. Il n'avait aucun symptôme tant que le second
  établissement n'avait pas d'emploi du temps ; dès qu'il en a eu un, l'onglet Planning annonçait
  « ce groupe n'existe plus » pour un groupe qui existe, à l'université qu'on venait de quitter.

- **Le multi-établissement** (jalon [6-G](docs/phase-6/6-g-etablissements.md)). UKit n'est plus une
  application mono-université : le **catalogue des établissements** vit dans la
  [base de publication](docs/backend.md) et pilote l'interface. Ajouter une université est désormais
  **une ligne en base et un fichier publié** — pas une release, pas une revue de store.

  **Bordeaux INP est en ligne, et il est arrivé sans release.** Son portail a été écrit et joué contre
  un compte étudiant réel, et il n'a presque rien en commun avec celui de Bordeaux : même produit CAS
  mais un `<button>` là où l'autre a un `<input>`, `mondossierweb` en Vaadin (PC-Scol) là où l'autre
  est en GWT (Apogée), champs ancrés **par leur libellé** au lieu d'identifiants positionnels, pas
  d'INE, pas de messagerie extractible. Ce qui ne change pas, c'est la **sortie** : les deux fichiers
  rendent les mêmes cinq champs, et aucun écran n'a appris qu'il existe deux portails.

  **Un service absent cesse d'être une panne.** Une université sans messagerie extractible ne montre
  simplement pas la carte ; une université sans emploi du temps interrogeable l'affiche en toutes
  lettres au lieu d'échouer, et l'accueil saute l'étape des groupes. C'est un nouveau constructeur du
  modèle d'erreur (`serviceAbsent`), parce qu'aucune famille du moteur ne décrivait « ce service
  n'existe pas ici » — et pour cause : aucun run ne part.

  **Le registre sait maintenant *ajouter*, et rien de plus.** La garde levée par le jalon 3-H
  d'Aetherius est activée en opt-in, bornée au préfixe réservé `ukit.portail.` et au périmètre de
  secrets de l'application. Un nom hors préfixe est ignoré, un portail qui réclamerait un secret hors
  périmètre est refusé **avant** le cache, et retirer la capacité désinstalle ce qu'elle avait laissé
  entrer — dix cas de test le figent.

  Au passage, trois constantes bordelaises quittent le binaire : l'hôte Celcat et ses codes
  d'inventaire (devenus des **entrées** des six Blueprints d'emploi du temps), les onze points de
  balayage des bibliothèques, et les quatre adresses du navigateur intégré — le dernier hôte de
  Bordeaux compilé dans un écran.

- **Le choix de l'établissement** à l'accueil et dans les réglages. Changer
  d'établissement demande une confirmation qui **annonce ce qui sera effacé** — groupes favoris,
  planning en cache, session universitaire — puis purge ce qui appartenait à l'université quittée. Les
  favoris de restaurants et de bibliothèques restent : ces sources-là sont nationales.

  Le parcours de premier lancement passe à cinq étapes : thème et langue, puis l'établissement, puis
  les groupes qu'il conditionne — et cette dernière **disparaît** quand l'université ne publie pas
  d'emploi du temps.

- **La phase 6 gagne un second volet : la refonte visuelle**
  ([6-K](docs/phase-6/6-k-socle-visuel.md)). Une phase correspond à une version, et rien ne part sur
  les stores tant que l'application n'est pas présentable : le volet 1 l'a rendue **corrigeable**, le
  volet 2 la rend **montrable**. Le socle visuel y est **extrait** des écrans qui font déjà référence
  — Planning, la barre d'onglets, le tableau de bord Campus, les listes CROUS et bibliothèques — et
  non inventé, ce qui garantit que le travail déjà fait ne bouge pas. Les écrans restants — annonces,
  scolarité, réglages — se reprennent ensuite **en sessions**, hors jalon : la beauté d'un écran n'a
  pas de définition de « terminé », alors qu'un composant, une règle et une capture identique en ont
  une. Au passage, `6-H` devient **`6-Z`** : le jalon de clôture doit rester le dernier quel que soit
  le nombre de jalons ajoutés, et un dossier trié par nom se lit alors dans l'ordre d'exécution.

- **Une spécification ouverte pour l'emploi du temps universel**
  ([6-I](docs/phase-6/6-i-planning-universel.md)). Le second établissement n'a pas de planning dans
  UKit, et ce n'est pas un oubli : presque aucune université française n'expose un Celcat ouvert. La
  voie mesurée est l'export **iCal**, qui existe partout — elle demande une capacité que le moteur n'a
  pas encore, et le document dit laquelle et pourquoi elle ne se contourne pas ici.

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
  `BdeService.fetchAnnonces` — l'ancien chemin reste en repli jusqu'au jalon 6-Z. Rien ne change
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

### Corrigé

- **Le Planning dit l'absence d'emploi du temps au lieu de réclamer des groupes favoris.** Une
  université sans serveur interrogeable n'a jamais de groupes favoris : l'écran « ton planning est
  vide, cherche un groupe » gagnait donc toujours, avec un bouton menant à une recherche qui ne peut
  rien trouver. La **section « salles libres »** disparaît pour la même raison — elle se reconstruit
  depuis les salles du même serveur.

- **Un Blueprint ne peut plus s'appuyer sur un sélecteur qu'un seul moteur comprend.** Le portail du
  second établissement avait été écrit avec `:text-is()` et `:nth-match()` : ces pseudo-classes
  appartiennent à **Playwright**, donc au moteur Python qui sert à mettre un fichier au point depuis un
  poste. Le moteur embarqué résout par `document.querySelectorAll` et les rejette comme CSS invalide —
  le run passait le CAS puis mourait à l'extraction, avec un message sans rapport avec la cause.
  Réécrit en **XPath**, seul langage de sélection que les deux moteurs partagent, et un test refuse
  désormais ces pseudo-classes dans n'importe quel Blueprint du dépôt.

- **Un établissement retiré du catalogue ne bascule plus personne en silence.** Il disparaissait aussi
  du cache : il cessait de résoudre, l'application retombait sur l'établissement historique, et posait
  quelqu'un sur une autre université sans un mot. Le rafraîchissement **reporte** désormais
  l'établissement sélectionné depuis le cache quand la base ne le publie plus — il continue de
  fonctionner — et l'avertissement couvre aussi le cas où le cache l'a perdu, où le repli reste la
  seule issue mais cesse d'être muet.

- **Changer d'établissement se propage enfin aux écrans déjà ouverts.** Le code de l'université passe
  par `AppContext`, à côté du thème et des groupes favoris : sans ça, un onglet monté gardait l'état de
  l'établissement précédent — la section des salles libres restait masquée après un retour à Bordeaux.
  Le contexte de scolarité oublie en plus ce qu'il garde **en mémoire** : le trousseau était vidé, mais
  l'onglet affichait encore le prénom de l'étudiant de l'autre fac.

- **La réinitialisation déconnecte enfin la session universitaire.** `resetSettings` n'avait jamais
  touché au trousseau — sans conséquence tant que l'application ne connaissait qu'une université, mais
  faux dès que la réinitialisation rouvre un parcours d'accueil qui **redemande l'établissement** : on
  pouvait repartir sur une autre fac en restant connecté au portail de la précédente. Elle passe
  désormais par la même purge que le changement d'établissement. Trouvé sur appareil, pendant la
  campagne de vérification du jalon 6-G.

### Modifié

- **Les Blueprints de portail sont renommés** `ukit.portail.bordeaux.*`, et leurs secrets deviennent
  `portail_user` / `portail_pass` — neutres vis-à-vis de l'établissement, sans quoi chaque nouvelle
  université aurait exigé une release rien que pour un nom de secret. **Les clés du trousseau n'ont
  pas bougé : personne n'est déconnecté.** Une installation existante passe la mise à jour sans rien
  remarquer, son établissement étant réputé `bordeaux`.

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
