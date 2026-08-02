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

Trois principes portent le projet :

- **Souveraineté.** Aucune dépendance à un service propriétaire payant. Les cartes sont rendues par
  Leaflet sur des données OpenStreetMap, jamais par un fournisseur qui trace l'utilisateur.
- **Aucun serveur.** UKit n'a pas de dorsale applicative, pas de compte UKit, pas de base distante.
  L'application interroge directement les sources et conserve tout localement. Ce qui relève du
  compte universitaire est chiffré par le trousseau de l'appareil et ne le quitte jamais.
- **Un socle lisible.** Découpage par domaine de navigation, TypeScript partout, tokens de design,
  aucune chaîne en dur : le code doit pouvoir être repris sans contexte oral.

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

**Scolarité** — la connexion au compte universitaire : identité de l'étudiant, compteur de messages
non lus, et navigateur intégré vers l'ENT, le webmail et Apogée. Protégé par authentification
biométrique, identifiants stockés chiffrés.
→ [docs/features/scolarite.md](docs/features/scolarite.md)

**Réglages** — langue, thème, filtres d'UE, rappels de cours, synchronisation avec le calendrier du
système, réinitialisation, et écran À propos.
→ [docs/features/settings.md](docs/features/settings.md)

Au premier lancement, un [parcours d'accueil](docs/features/onboarding.md) en quatre étapes règle le
thème, la langue et le premier groupe favori.

<p align="center"><sub>· · ·</sub></p>

## Les sources de données

Toutes les données proviennent de systèmes tiers, interrogés directement par l'application.

| Source | Ce qu'elle fournit | Accès |
|---|---|---|
| Celcat (`ukit.kbdev.io`) | emplois du temps, groupes, salles et leur occupation | API interne, sans authentification |
| CAS / ENT Université de Bordeaux | identité étudiant, messagerie | identifiants universitaires, extraction de pages |
| Affluences | bibliothèques, affluence temps réel, horaires | API privée |
| Croustillant | restaurants CROUS et menus | API publique |
| jsDelivr / `ukit-data` | annonces de vie étudiante, visuels | fichier JSON sur CDN |
| OpenStreetMap / CartoDB | fonds de carte | tuiles publiques |

Endpoints, charges utiles, transformations et fragilités connues sont détaillés dans
**[docs/sources-externes.md](docs/sources-externes.md)** — le document à lire avant toute
intervention touchant au réseau.

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
    navigation/        conteneur racine, navigateurs, helpers d'en-tête
    services/          contexte et réglages, notifications, stockage chiffré, mock temporel
    theme/             tokens de design et thèmes clair / sombre
    i18n/              Translator et dictionnaires fr / en / es
    map/               écran carte (Leaflet + OpenStreetMap)
    ui/                composants atomiques
    constants/         URLs externes
    utils/             utilitaires de formatage
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
```

Ces deux commandes ne sont pas encore vertes ; la base de référence à ne pas dégrader est décrite
dans [docs/qualite.md](docs/qualite.md). Il n'y a pas de test automatisé : **la vérification manuelle
sur l'application réelle fait partie de la définition de « terminé »**
([CONTRIBUTING.md](CONTRIBUTING.md)).

<p align="center"><sub>· · ·</sub></p>

## État des lieux

Ce que l'application fait réellement aujourd'hui. Cette section est la source de vérité du périmètre
livré ; elle est mise à jour à chaque contribution.

### Socle

- [x] **Architecture par domaine de navigation** — `features/` autonomes + `shared/` transverse,
  migration TypeScript intégrale, règles ESLint d'architecture en place.
  [docs/architecture.md](docs/architecture.md), [docs/conventions.md](docs/conventions.md)
- [x] **Navigation** — pile principale de 18 écrans, quatre onglets, barre d'onglets personnalisée
  avec bouton d'action contextuel, animation d'en-tête au défilement centralisée.
  [docs/navigation.md](docs/navigation.md)
- [x] **Thème** — tokens de design (espacements, rayons, typographie, ombres), thèmes clair et sombre
  complets, alignement sur la préférence système au premier lancement.
  [docs/theme.md](docs/theme.md)
- [x] **Internationalisation** — français, anglais, espagnol ; 209 clés par dictionnaire, typage de
  la clé, locale des dates alignée. Treize libellés d'écrans Campus restent non traduits.
  [docs/i18n.md](docs/i18n.md)
- [x] **Persistance locale** — managers observables, caches à expiration pour les listes de
  référence, cache de repli hors ligne pour l'emploi du temps, stockage chiffré pour le compte
  universitaire. [docs/donnees-et-persistance.md](docs/donnees-et-persistance.md)
- [x] **Cartographie libre** — Leaflet et OpenStreetMap en WebView, marqueur au thème de
  l'application, référentiel local de 73 bâtiments. [docs/cartographie.md](docs/cartographie.md)
- [x] **Publication** — profils EAS (développement, aperçu, production) et chaîne de release GitHub
  Actions vers les deux stores. [docs/plateforme.md](docs/plateforme.md)
- [ ] **Tests automatisés** — aucun harnais n'est en place ; la vérification est manuelle, et
  l'intégration continue ne joue que la publication. [docs/qualite.md](docs/qualite.md)

### Fonctionnalités

- [x] **Planning** — vues jour et semaine, planning agrégé des groupes favoris, curseur couvrant
  l'année scolaire, recherche de groupes par sections, fiche de cours avec carte, filtres d'UE,
  carrousel des cours simultanés, repli hors ligne daté.
  [docs/features/planning.md](docs/features/planning.md)
- [x] **Campus — tableau de bord** — quatre sections indépendantes, position résolue une seule fois,
  socle de liste commun (recherche, filtres persistés, favoris, états vides).
  [docs/features/campus.md](docs/features/campus.md)
- [x] **Campus — restaurants** — liste régionale triée par distance, filtres par type, menus du jour
  et des jours suivants par service. [docs/features/campus-crous.md](docs/features/campus-crous.md)
- [x] **Campus — bibliothèques** — découverte régionale par balayage géographique, affluence en temps
  réel, horaires semaine par semaine.
  [docs/features/campus-bibliotheques.md](docs/features/campus-bibliotheques.md)
- [x] **Campus — salles libres** — reconstruction des bâtiments depuis les salles Celcat, croisement
  avec les horaires d'ouverture, créneaux libres par heure. Un seul bâtiment est déclaré en accès
  libre à ce jour. [docs/features/campus-salles-libres.md](docs/features/campus-salles-libres.md)
- [x] **Campus — vie étudiante** — annonces éditoriales publiées sans mise à jour de l'application,
  avec activation et expiration.
  [docs/features/campus-vie-etudiante.md](docs/features/campus-vie-etudiante.md)
- [x] **Scolarité** — connexion CAS, récupération de l'identité au premier login puis rafraîchissement
  léger, compteur de messages non lus, verrou biométrique, navigateur intégré avec remplissage
  automatique du formulaire. [docs/features/scolarite.md](docs/features/scolarite.md)
- [x] **Réglages** — langue, thème, filtres d'UE, rappels de cours avec délai réglable,
  synchronisation idempotente du calendrier système (tâche de fond toutes les 12 h), réinitialisation,
  À propos. [docs/features/settings.md](docs/features/settings.md)
- [x] **Premier lancement** — parcours en quatre étapes, valeurs par défaut issues de l'appareil,
  sélection de groupes filtrée par année et semestre.
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
| [docs/theme.md](docs/theme.md) | tokens, palettes, usage du thème |
| [docs/i18n.md](docs/i18n.md) | Translator, dictionnaires, ajout d'une chaîne |
| [docs/cartographie.md](docs/cartographie.md) | Leaflet et OpenStreetMap, `locations.json` |
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
