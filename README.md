<p align="center">
  <img src="assets/icons/logo.png" alt="UKit" width="300" />
</p>

<p align="center"><strong>Le kit de survie pour l'étudiant bordelais.</strong></p>

<p align="center">
  <a href="https://github.com/KAE-Lab/UKit/actions"><img src="https://github.com/KAE-Lab/UKit/actions/workflows/release.yml/badge.svg" alt="Mobile App Release" /></a>
  <a href="https://github.com/KAE-Lab/UKit/releases/latest"><img src="https://img.shields.io/github/v/release/KAE-Lab/UKit?label=APK" alt="Latest Release" /></a>
</p>

<p align="center">
  <a href="https://play.google.com/store/apps/details?id=com.bordeaux1.emplois"><img src="https://img.shields.io/badge/Google_Play-414141?style=for-the-badge&logo=google-play&logoColor=white" alt="Google Play" /></a>
  <a href="https://apps.apple.com/app/id1394708917"><img src="https://img.shields.io/badge/App_Store-000000?style=for-the-badge&logo=apple&logoColor=white" alt="App Store" /></a>
</p>

> Application compagnon des étudiants de l'Université de Bordeaux.
> Emploi du temps, restauration, bibliothèques, salles libres et compte universitaire, au même endroit.

## La vision

Les informations dont un étudiant a besoin chaque jour sont dispersées : l'emploi du temps sur un
serveur de planning, les menus des restaurants sur un site associatif, l'affluence des bibliothèques
sur une application tierce, l'identité et la messagerie derrière un portail universitaire. Chacune
demande une application, un compte ou une recherche.

**UKit rassemble ces sources dans une seule application** — le kit de survie pour l'étudiant
bordelais : rapide, sobre, et qui fonctionne hors ligne pour ce qui compte le plus, l'emploi du temps.

### Le périmètre, parce qu'il décide de tout le reste

**UKit vise les établissements du secteur bordelais, pas la France.** L'objectif est d'être *le* kit
qu'un étudiant qui arrive à Bordeaux installe sans se poser la question — l'outil par défaut des
étudiants bordelais — donc de couvrir **toutes les facs de Bordeaux**. Sortir de la région est un très
long terme, pas un objectif.

Cette phrase est écrite ici parce que son absence coûte cher : sans elle, on conçoit spontanément pour
la France entière et on paie des généralisations que personne n'a demandées. Concrètement, elle
autorise trois choses à rester bordelaises — la région CROUS, les points de balayage des
bibliothèques, l'inventaire des salles libres — **tout en étant des données de catalogue** et non des
constantes de code. La différence n'est pas cosmétique : une donnée se corrige par une publication le
jour où l'hypothèse tombe, une constante demande une release. C'est la leçon des onze constantes
bordelaises que le jalon [6-G](docs/phase-6/6-g-etablissements.md) a dû déterrer une par une.

Trois principes portent le projet :

- **Souveraineté.** Aucune dépendance à un service propriétaire payant. Les cartes sont rendues par
  MapLibre sur des données OpenStreetMap, jamais par un fournisseur qui trace l'utilisateur.
- **Rien de vous ne transite.** Aucun compte UKit n'est requis, aucune donnée personnelle ne quitte
  l'appareil : l'application interroge les sources **directement depuis l'appareil**, avec la
  connexion de l'utilisateur, et conserve tout localement. Ce qui relève du compte universitaire est
  chiffré par le trousseau de l'appareil et ne le quitte jamais — c'est d'ailleurs la raison pour
  laquelle le moteur d'automatisation est *embarqué* plutôt qu'hébergé.

  UKit a bien une base distante, et il faut dire laquelle : elle porte **ce que nous publions** —
  annonces, référentiels, fichiers d'instructions — jamais ce qui appartient à l'utilisateur. Les
  requêtes qui l'atteignent sont anonymes et en lecture seule, et l'application **fonctionne sans
  jamais la joindre** : tout ce qu'elle publie existe déjà dans le binaire, et n'y est que mis à
  jour. C'est un point de publication, pas une dorsale.
  → [docs/backend.md](docs/backend.md)
- **Un socle lisible.** Découpage par domaine de navigation, TypeScript partout, tokens de design,
  aucune chaîne en dur : le code doit pouvoir être repris sans contexte oral.
- **Le comportement est de la donnée.** Ce qu'il faut demander à une source, et ce qu'il faut en
  retenir, vit dans des [Blueprints](docs/blueprints.md) versionnés — pas dans le binaire. Une source
  qui change se corrige par une publication de fichier, pas par une release.

<p align="center"><sub>· · ·</sub></p>

## Le périmètre fonctionnel

L'application s'organise en quatre onglets.

**Planning** — l'emploi du temps universitaire, en vue jour ou semaine, pour un groupe donné ou pour
l'agrégation des groupes favoris. Curseur de dates couvrant l'année scolaire, fiche détaillée par
cours avec sa salle et sa carte, filtres par UE, ajout au calendrier du système, rappels avant les
cours. La dernière consultation reste disponible hors ligne, datée.
→ [docs/features/planning.md](docs/features/planning.md)

**Campus** — un tableau de bord et quatre sous-domaines : les annonces de la vie étudiante, les
restaurants universitaires et leurs menus, les bibliothèques avec leur affluence en temps réel et
leurs horaires, et les salles libres des bâtiments en accès libre. Tout est trié par distance, avec
recherche, filtres et favoris.
→ [docs/features/campus.md](docs/features/campus.md)

**Scolarité** — trois sections qui n'ont pas la même nature : **ton dossier** (formation courante,
numéro étudiant, fraîcheur de la lecture), **tes services** (webmail avec son compteur de non-lus,
ENT, Moodle, Apogée — tous issus du catalogue), et **tes documents**, des pièces rangées sur
l'appareil qui fonctionnent sans compte. Protégé par authentification biométrique, identifiants
stockés chiffrés.
→ [docs/features/scolarite.md](docs/features/scolarite.md)

**Réglages** — langue, thème, filtres d'UE, rappels de cours, synchronisation avec le calendrier du
système, réinitialisation, et écran À propos.
→ [docs/features/settings.md](docs/features/settings.md)

Au premier lancement, un [parcours d'accueil](docs/features/onboarding.md) en cinq étapes règle le
thème, la langue, l'établissement et le premier groupe favori.

<p align="center"><sub>· · ·</sub></p>

## Les sources de données

Les données universitaires proviennent de systèmes **tiers**, interrogés directement par
l'application — sans intermédiaire.

| Source | Ce qu'elle fournit | Accès |
|---|---|---|
| Celcat (`celcat.u-bordeaux.fr`) | emplois du temps, groupes, salles et leur occupation | API interne, sans authentification |
| CAS / ENT Université de Bordeaux | identité étudiant, formation, messagerie | identifiants universitaires, extraction de pages |
| CAS / mondossierweb Bordeaux INP | identité étudiant, formation | identifiants universitaires, extraction de pages |
| ADE Bordeaux INP | emploi du temps | export iCalendar anonyme, aucune authentification |
| Affluences | bibliothèques, affluence temps réel, horaires | API privée |
| Croustillant | restaurants CROUS et menus | API publique |
| OpenFreeMap | fonds de carte (style Positron, données OpenStreetMap) | tuiles vectorielles publiques, sans clé, attribution affichée |

Endpoints, charges utiles, transformations et fragilités connues sont détaillés dans
**[docs/sources-externes.md](docs/sources-externes.md)** — le document à lire avant toute
intervention touchant au réseau.

À côté de ces sources tierces, et à ne pas confondre avec elles, UKit a sa propre **base de
publication** (Supabase) : elle porte ce que l'équipe publie — les [Blueprints](docs/blueprints.md),
les annonces de vie étudiante, le référentiel des bâtiments, le catalogue des établissements. Elle ne
relaie aucune de ces sources et ne voit passer aucune donnée personnelle ; l'application fonctionne
sans elle, sur son socle embarqué. Les annonces y sont lues depuis le jalon 6-B ; le dépôt
`ukit-data` qui les servait par jsDelivr cesse d'être écrit. Depuis le jalon 6-G, c'est aussi elle qui
porte **les universités** : ajouter un établissement est une ligne en base et un fichier publié.
→ [docs/backend.md](docs/backend.md)

<p align="center"><sub>· · ·</sub></p>

## Architecture du dépôt

```text
App.tsx              amorçage : ressources, managers, splash animé
app.config.ts        configuration Expo : identité, permissions, plugins
src/
  features/          un dossier par domaine de navigation
    Planning/          emploi du temps
    Campus/            vie de campus (dashboard, CROUS, BU, salles libres, annonces)
    Scolarite/         session universitaire
    Settings/          réglages et à propos
    Onboarding/        premier lancement
  shared/            socle transverse
    aetherius/         le moteur : façade, registre de Blueprints, secrets, modèle d'erreur
    supabase/          la base de publication : client anonyme et types du schéma
    etablissements/    le catalogue des universités : socle, surcouche publiée, purge
    navigation/        conteneur racine, navigateurs, helpers d'en-tête
    services/          contexte et réglages, notifications, stockage chiffré, mock temporel
    theme/             tokens de design et thèmes clair / sombre
    i18n/              Translator et dictionnaires fr / en / es
    map/               carte embarquée (MapLibre + OpenFreeMap)
    ui/                composants atomiques
    constants/         URLs externes
    utils/             utilitaires de formatage
blueprints/          les fichiers d'instructions embarqués (le socle hors ligne)
  portails/            les portails d'établissements publiés, jamais embarqués
supabase/            schéma et politiques d'accès de la base de publication
tools/               publication des Blueprints, harnais de parité
assets/              icônes, visuels, référentiel des bâtiments du campus
docs/                cette documentation
```

Chaque dossier de `features/` est autonome : ses écrans, ses composants, ses hooks et ses services
distants. Reprendre une fonctionnalité, c'est ouvrir un seul dossier.

Les principes que le code respecte :

- un fichier de logique reste **sous 400 lignes**, une fonction sous 100 (règles ESLint) ;
- **100 % TypeScript**, pas de `any` sans justification ;
- **aucune valeur de style en dur** : tout vient des tokens de `shared/theme` ;
- **aucune chaîne visible en dur** : tout passe par `Translator`, dans les trois langues ;
- **le réseau vit dans les services**, jamais dans un composant ;
- **pas de dépendance cartographique propriétaire.**

Détail des couches, de la séquence de démarrage et des invariants :
[docs/architecture.md](docs/architecture.md).

<p align="center"><sub>· · ·</sub></p>

## Développement local

Prérequis : Node.js 18+, npm, et l'application Expo Go ou un émulateur.

```bash
npm install
npx expo start        # puis a (Android), i (iOS), ou scan du QR code
```

Avant de proposer un changement :

```bash
npx tsc --noEmit      # typage
npx eslint .          # règles d'architecture
npm test              # socle du moteur
npm run parity        # sources migrées, comparées aux services historiques
```

Les deux premières ne sont pas encore vertes ; la base de référence à ne pas dégrader est décrite
dans [docs/qualite.md](docs/qualite.md). Les deux dernières le sont. Aucune ne couvre l'interface :
**la vérification manuelle sur l'application réelle fait partie de la définition de « terminé »**
([CONTRIBUTING.md](CONTRIBUTING.md)).

<p align="center"><sub>· · ·</sub></p>

## État des lieux

Ce que l'application fait réellement aujourd'hui. Cette section est la source de vérité du périmètre
livré ; elle est mise à jour à chaque contribution.

### Socle

- [x] **Architecture par domaine de navigation** — `features/` autonomes + `shared/` transverse,
  migration TypeScript intégrale, règles ESLint d'architecture en place.
  [docs/architecture.md](docs/architecture.md), [docs/conventions.md](docs/conventions.md)
- [x] **Navigation** — pile principale de 20 écrans, quatre onglets, barre d'onglets personnalisée
  avec bouton d'action contextuel, animation d'en-tête au défilement centralisée.
  [docs/navigation.md](docs/navigation.md)
- [x] **Thème** — tokens de design (espacements, rayons, typographie, ombres), **échelle de couleurs
  sémantiques** dans les deux thèmes, thèmes clair et sombre complets, alignement sur la préférence
  système au premier lancement. [docs/theme.md](docs/theme.md)
- [x] **Socle visuel** — le vocabulaire visuel est **extrait** des écrans qui font référence, pas
  inventé : neuf composants partagés dans [`shared/ui/`](src/shared/ui/), chacun relevé au moins deux
  fois avant d'être remonté, et une **règle ESLint qui refuse les valeurs de style en dur** en nommant
  le token de remplacement. La consigne existait depuis toujours dans ce README et n'était appliquée
  par rien — le dépôt portait 53 couleurs et 142 valeurs en dur, mesurées dans
  [docs/inventaire-visuel.md](docs/inventaire-visuel.md). Une
  [recette d'écran](docs/theme.md#la-recette-décran) donne à chaque refonte sa liste à cocher.
  L'application n'a **qu'une police, celle du système** : la hiérarchie tient à la taille et à la
  graisse, et rien ne dénote entre iOS et Android.

  Une **passe de finition** a suivi : les neuf dialogues, les six états plein écran et les quatre
  formes de bouton parlent désormais une seule langue. Ce qu'elle a trouvé vaut d'être retenu — le
  *bloc* d'état vide était partagé depuis 6-K, son **hôte** ne l'était pas, et c'est l'hôte qui décide
  de la hauteur : six écrans calaient le leur différemment, d'où des messages qui flottaient tantôt
  trop haut, tantôt trop bas. Un [`ScreenState`](src/shared/ui/ScreenState.tsx) décide maintenant, et
  il **ancre le bloc sous l'en-tête** plutôt que de le centrer : centrer demanderait de connaître ce
  qui occupe le bas de chaque écran. L'application **tutoie** partout, et les avertissements ESLint
  sont passés de 79 à 53.
- [x] **Internationalisation** — français, anglais, espagnol ; 268 clés par dictionnaire, typage de
  la clé, locale des dates alignée. **Plus aucune chaîne visible en dur ni clé manquante** : les
  treize libellés Campus qui manquaient sont traduits, et les casts qui les masquaient au compilateur
  sont retirés. [docs/i18n.md](docs/i18n.md)
- [x] **Persistance locale** — managers observables, caches à expiration pour les listes de
  référence, cache de repli hors ligne pour l'emploi du temps, stockage chiffré pour le compte
  universitaire. [docs/donnees-et-persistance.md](docs/donnees-et-persistance.md)
- [x] **Cartographie libre** — MapLibre et OpenFreeMap (données OpenStreetMap) en WebView, marqueur au thème de
  l'application, carte **embarquée dans les fiches** (cours, restaurant, BU) plutôt que sur un écran
  à part, référentiel de 73 bâtiments embarqué dans le binaire et corrigeable à distance. Où se
  donne un cours **se lit** désormais dans un champ que la source déclare, au lieu d'être deviné dans
  du texte libre : deux causes indépendantes faisaient disparaître la carte d'une fiche de cours, sans
  jamais afficher d'erreur. [docs/cartographie.md](docs/cartographie.md)
- [x] **Publication** — profils EAS (développement, aperçu, production) et chaîne de release GitHub
  Actions vers les deux stores. [docs/plateforme.md](docs/plateforme.md)
- [ ] **Tests automatisés** — un premier harnais existe, borné : `npm test` couvre le socle du moteur
  (résolution des secrets, livraison des Blueprints et ses gardes, modèle d'erreur) et le
  [harnais de parité](tools/parity/README.md) rejoue les sources migrées contre les vraies. Aucun
  test d'écran ni de composant, et l'intégration continue ne joue toujours que la publication.
  **`npx tsc --noEmit` est vert** depuis le 2026-08-16 — il ne l'avait jamais été.
  [docs/qualite.md](docs/qualite.md)
- [ ] **Le comportement en données** — l'accès aux sources migre vers des
  [Blueprints](docs/blueprints.md) joués par le moteur Aetherius embarqué, publiés depuis une base
  et corrigeables sans release. Le socle est en place (6-A), **la base de publication existe** (6-B),
  et **le canal de correction est branché** (6-C) : une source qui change se répare par une
  publication de fichier, reçue au retour au premier plan, avec trois interrupteurs d'arrêt. **Les
  deux sources de campus sont migrées** (6-D) — restaurants et bibliothèques, cinq Blueprints, cinq
  cas de parité sur données réelles —, **l'emploi du temps aussi** (6-E) : six Blueprints, la
  bascule directe sur Celcat, et **un serveur retiré de l'architecture** —, puis **la session
  universitaire** (6-F), le morceau qui justifiait la phase. Depuis 6-G, **l'application n'est plus
  mono-université** : le catalogue vit en base, et **Bordeaux INP a été ajouté sans release** — une
  ligne en base, un Blueprint publié. Depuis 6-I, **il a aussi son emploi du temps**, par l'export
  iCalendar de son serveur ADE : une seconde source de planning, choisie par le catalogue, sans qu'un
  seul écran apprenne qu'il en existe deux. Depuis 6-J, **le compte se propose dès l'accueil** et
  l'application accepte un **lien d'abonnement collé** : une fac qu'on n'a pas portée devient
  utilisable sans écrire une ligne. Le volet 1 est clos ; **le socle visuel est posé** (6-K), **la session
  Scolarité est faite** — elle a commencé par une sonde des deux portails et en a rapporté la
  formation, les documents locaux et la fin des sélecteurs positionnels — **la session annonces
  aussi** (cartes au format affiche 1:1, liste en grille) ; reste la session des réglages, puis la
  clôture (6-Z), qui sort la **v6.0** : la version part en deux temps, et ce qui attend le contenu
  de la rentrée — mise en avant des annonces, compléments Bordeaux INP, notes — part en v6.1
  ([docs/phase-6/README.md](docs/phase-6/README.md#la-v6-part-en-deux-temps)).
- [x] **Base de publication** — un projet Supabase mince, en lecture publique seule, dont le schéma et
  les politiques s'appliquent depuis les fichiers du dépôt. Aucun compte, aucune donnée personnelle,
  et l'application démarre et s'utilise sans jamais la joindre. Elle porte aussi, depuis la passe de
  finition, **les visuels** : la photo d'un restaurant, d'une bibliothèque, d'un bâtiment ou d'une
  annonce se remplace par une ligne, pour tout le monde, sans release — ces images venaient jusque-là
  d'une source tierce et n'étaient corrigeables par rien. [docs/backend.md](docs/backend.md)
- [x] **Livraison des Blueprints** — le registre résout entre le socle embarqué et une surcouche
  publiée, vérifiée à l'empreinte à chaque lecture ; le rafraîchissement est hors du chemin d'un run,
  et un panneau de diagnostic dit d'où vient chaque Blueprint.
  [docs/blueprints.md](docs/blueprints.md)

### Fonctionnalités

- [x] **Planning** — vues jour et semaine, planning agrégé des groupes favoris, curseur couvrant
  l'année scolaire, recherche de groupes par sections, fiche de cours avec carte, filtres d'UE,
  carrousel des cours simultanés, repli hors ligne daté. Source jouée par quatre
  [Blueprints](docs/blueprints.md) visant l'université **sans relais** ; une panne, une source qui a
  changé et une journée sans cours produisent trois écrans différents.
  [docs/features/planning.md](docs/features/planning.md)
- [x] **Campus — tableau de bord** — quatre sections indépendantes, position résolue une seule fois,
  socle de liste commun (recherche, filtres persistés, favoris, états vides).
  [docs/features/campus.md](docs/features/campus.md)
- [x] **Campus — restaurants** — liste régionale triée par distance, filtres par type, menus du jour
  et des jours suivants par service. Source jouée par deux [Blueprints](docs/blueprints.md) : une
  panne, une source qui a changé et un restaurant qui ne publie rien produisent trois écrans
  différents. [docs/features/campus-crous.md](docs/features/campus-crous.md)
- [x] **Campus — bibliothèques** — découverte régionale par balayage géographique, affluence en temps
  réel, horaires semaine par semaine. Trois [Blueprints](docs/blueprints.md), et une couverture
  partielle du balayage se **dit** au lieu d'amputer la liste en silence.
  [docs/features/campus-bibliotheques.md](docs/features/campus-bibliotheques.md)
- [x] **Campus — salles libres** — reconstruction des bâtiments depuis les salles Celcat, croisement
  avec les horaires d'ouverture, créneaux libres par heure. Un seul bâtiment est déclaré en accès
  libre à ce jour. [docs/features/campus-salles-libres.md](docs/features/campus-salles-libres.md)
- [x] **Campus — vie étudiante** — annonces éditoriales publiées depuis la
  [base](docs/backend.md) sans mise à jour de l'application, avec activation et expiration. Premier
  écran où une panne de la source **se dit** au lieu d'afficher une liste vide. Les cartes sont au
  **format affiche** — visuel 1:1 plein cadre, jamais recadré, pied minimal avec l'émetteur en
  pastille — et la liste complète est une grille de deux colonnes ; la fiche épouse le ratio du
  visuel.
  [docs/features/campus-vie-etudiante.md](docs/features/campus-vie-etudiante.md)
- [x] **Scolarité** — connexion CAS, récupération de l'identité au premier login puis rafraîchissement
  léger, compteur de messages non lus, verrou biométrique, navigateur intégré avec remplissage
  automatique du formulaire. Les 323 lignes de WebView cachée pilotée par du JavaScript injecté sont
  devenues **deux [Blueprints](docs/blueprints.md)** (6-F) : les identifiants ne traversent plus la
  source d'un script, et chaque attente porte un délai déclaré et un échec nommé. Le portail n'est
  plus le seul : **celui de Bordeaux INP est arrivé sans release** (6-G), et une université qui n'a
  pas de messagerie extractible ne montre simplement pas la carte.
  Une connexion **propose** ce qu'elle trouve en chemin — les UE non suivies en filtres, à
  Bordeaux ; l'emploi du temps personnel en groupe, à l'INP — derrière une confirmation, parce que
  deviner juste dans le dos de quelqu'un reste deviner dans son dos.

  **La première session d'écran du volet 2 a refait cet onglet** (2026-08-25), et elle a commencé par
  une sonde des deux dossiers plutôt que par un habillage : la page n'avait rien à dire, et aucun
  travail visuel n'y répondait. La page porte désormais **trois sections de natures différentes** —
  ce que l'application sait, ce qu'on peut ouvrir, ce qu'on a rangé — dont **la formation courante**,
  lue des deux côtés. Ses états ne prennent plus l'écran : ce sont des encarts, et **les documents
  restent atteignables sans compte** — ce qui rend l'onglet vivant pour « Autre université », où il
  était jusqu'ici entièrement mort. Deux exports morts sont supprimés au passage.

  La sonde a aussi supprimé **la fragilité que cette phase désignait comme la plus sérieuse du
  projet** : les cinq identifiants DOM positionnels de Bordeaux ont un libellé voisin, vérifié hors
  ligne sur le DOM capturé — 11 libellés, 11 nœuds uniques — et sont devenus des ancrages par
  libellé. Un décalage ne peut plus rendre *la mauvaise valeur*, il ne rend plus *rien*. Elle a
  corrigé trois affirmations fausses de la documentation au passage, dont **l'INE de Bordeaux INP**,
  qui existe.
  [docs/features/scolarite.md](docs/features/scolarite.md)
- [x] **Multi-établissement** — le catalogue des universités vit en
  [base](docs/backend.md) et pilote l'interface : choix à l'accueil, changement dans les réglages,
  purge de ce qui appartenait à l'université quittée. Les Blueprints de portail sont namespacés sous
  `ukit.portail.`, **le seul préfixe qu'un manifeste a le droit d'étendre** — et un service qu'un
  établissement ne publie pas se **dit** au lieu d'échouer.
  [docs/phase-6/6-g-etablissements.md](docs/phase-6/6-g-etablissements.md)
- [x] **Le compte à l'accueil, et l'emploi du temps par lien collé** — la connexion au compte
  universitaire est proposée dès le parcours d'accueil, **sautable et rappelée**, et omise chez un
  établissement qui ne publie aucun portail. Pour l'emploi du temps, un **lien d'abonnement iCal collé
  à la main** devient le repli universel : un seul Blueprint embarqué, aucune écriture par
  établissement, et **« Mon université n'est pas dans la liste »** rend l'application utilisable pour
  une fac bordelaise qu'on n'a pas portée — planning, restaurants, bibliothèques et salles libres
  compris. [docs/phase-6/6-j-compte-et-sources-par-etablissement.md](docs/phase-6/6-j-compte-et-sources-par-etablissement.md)
- [x] **Réglages** — langue, thème, filtres d'UE, rappels de cours avec délai réglable,
  synchronisation idempotente du calendrier système (tâche de fond toutes les 12 h), réinitialisation,
  À propos. [docs/features/settings.md](docs/features/settings.md)
- [x] **Premier lancement** — parcours en cinq étapes : thème et langue, puis l'**établissement**,
  puis les groupes qu'il conditionne. Valeurs par défaut issues de l'appareil, sélection de groupes
  filtrée par année et semestre — étape omise quand l'université ne publie pas d'emploi du temps.
  [docs/features/onboarding.md](docs/features/onboarding.md)

Les limites connues de chaque partie sont documentées dans la section « Limites connues » de son
document.

<p align="center"><sub>· · ·</sub></p>

## Documentation

| Document | Contenu |
|---|---|
| [docs/architecture.md](docs/architecture.md) | couches, séquence de démarrage, invariants, carte des fichiers du socle |
| [docs/conventions.md](docs/conventions.md) | anatomie d'un module, style de code, ajout d'un écran ou d'une source |
| [docs/navigation.md](docs/navigation.md) | navigateurs, routes et paramètres, en-têtes animés |
| [docs/donnees-et-persistance.md](docs/donnees-et-persistance.md) | managers observables, clés de stockage, stratégies de cache |
| [docs/sources-externes.md](docs/sources-externes.md) | inventaire complet des sources distantes, endpoints et fragilités |
| [docs/blueprints.md](docs/blueprints.md) | les fichiers d'instructions : frontière, écriture, publication d'une correction |
| [docs/backend.md](docs/backend.md) | la base de publication : schéma, politiques, clés, limites |
| [docs/phase-6/](docs/phase-6/README.md) | le cadrage de la migration vers les Blueprints, jalon par jalon |
| [docs/theme.md](docs/theme.md) | tokens, palettes, composants partagés, **recette d'écran** |
| [docs/inventaire-visuel.md](docs/inventaire-visuel.md) | l'état visuel mesuré du dépôt, avant le socle : littéraux, divergences, manques |
| [docs/defauts-fonctionnels.md](docs/defauts-fonctionnels.md) | les défauts de comportement connus, tenus **à part** de l'esthétique |
| [docs/i18n.md](docs/i18n.md) | Translator, dictionnaires, ajout d'une chaîne |
| [docs/cartographie.md](docs/cartographie.md) | MapLibre et OpenFreeMap, `locations.json` |
| [docs/plateforme.md](docs/plateforme.md) | configuration Expo, permissions, build EAS, release |
| [docs/qualite.md](docs/qualite.md) | portes de qualité, vérification manuelle, simulation temporelle |
| [docs/features/](docs/features/) | une documentation par domaine fonctionnel |
| [docs/screenshots/](docs/screenshots/README.md) | captures attendues et convention |
| [docs-aetherius/](docs-aetherius/) | Aetherius, le moteur d'automatisation — doc complète sur son dépôt |
| [CONTRIBUTING.md](CONTRIBUTING.md) | workflow, définition de « terminé », principes de code |
| [CHANGELOG.md](CHANGELOG.md) | évolutions notables, version par version |
| [PRIVACY.md](PRIVACY.md) | politique de confidentialité |

<p align="center"><sub>· · ·</sub></p>

## Crédits

UKit a été initialement pensé et développé par ses créateurs originaux. Un grand merci à eux pour leur
travail sur les premières versions de l'application :

* [Jean](https://github.com/HackJack-101)
* [Thomas](https://github.com/thclmnt)
* [Florian](https://github.com/AamuLumi)
* [Gogotron](https://github.com/Gogotron)
* [Clément](https://github.com/Shapeqs)

Le projet est aujourd'hui repris, maintenu et développé par l'organisation KAE Lab. Un remerciement
particulier à Jean pour sa confiance et pour nous avoir transmis les clés de l'application.

L'application s'appuie sur deux services tiers que nous remercions : **Affluences** pour les données
d'affluence des bibliothèques, et **[Croustillant](https://croustillant.menu)** pour les menus des
restaurants universitaires.

## Contact

* **Email** : contact@kaelab.dev
* **GitHub Issues** : ouvrir un ticket sur le dépôt pour un suivi public.

L'organisation KAE Lab centralise la maintenance et les retours techniques.

## Licence

Distribué sous licence Apache 2.0. Voir [LICENSE](LICENSE) pour plus de détails.

---

<p align="center"><sub>· · ·&nbsp; UKit &nbsp;— &nbsp;KAE Lab &nbsp;· · ·</sub></p>
