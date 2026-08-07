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
- **Annonces de vie étudiante** — contenu éditorial servi depuis le dépôt `ukit-data` via jsDelivr,
  publiable sans mise à jour de l'application, avec activation et date d'expiration.
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
- **Règles ESLint d'architecture** ajoutées comme garde-fous : taille de fichier, taille de fonction,
  profondeur d'imbrication, complexité cyclomatique, interdiction de `any`.
  [docs/qualite.md](docs/qualite.md)
- **Suppression de tous les types `any`** hérités de la migration, hors onze occurrences résiduelles
  signalées en avertissement.

### Corrigé

- Comptage des cours dans la vue semaine.
- Doublons de notifications lors de replanifications successives.
- Apparence de la section active de la barre de navigation sur Android.
- Erreurs de typage introduites par la migration TypeScript.

### Retiré

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
