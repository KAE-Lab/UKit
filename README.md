<p align="center">
  <img src="assets/icons/logo.png" alt="UKit" width="300" />
</p>

<p align="center"><strong>Le kit de survie pour l'étudiant bordelais.</strong></p>

<p align="center">
  <a href="https://github.com/KAE-Lab/UKit/actions/workflows/verifier.yml"><img src="https://github.com/KAE-Lab/UKit/actions/workflows/verifier.yml/badge.svg" alt="Vérifier" /></a>
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

Les informations dont un étudiant a besoin chaque jour sont dispersées : l'emploi du temps sur un serveur de planning, les menus des restaurants sur un site associatif, l'affluence des bibliothèques sur une application tierce, l'identité et la messagerie derrière un portail universitaire. **UKit rassemble ces sources dans une seule application** : rapide, sobre, et qui fonctionne hors ligne pour ce qui compte le plus, l'emploi du temps.

**UKit vise les établissements du secteur bordelais, pas la France.** L'objectif est d'être l'outil par défaut des étudiants bordelais, donc de couvrir toutes les facs de Bordeaux. Ce qui est bordelais est une donnée de catalogue, jamais une constante de code : une donnée se corrige par publication, une constante demande une release.

Trois principes portent le projet :

- **Souveraineté.** Aucune dépendance à un service propriétaire payant ; les cartes sont rendues par MapLibre sur des données OpenStreetMap.
- **Rien de vous ne transite.** Aucun compte UKit, aucune donnée personnelle ne quitte l'appareil : l'application interroge les sources directement depuis l'appareil et conserve tout localement ; ce qui relève du compte universitaire est chiffré par le trousseau de l'appareil. La base distante porte ce que nous publions (annonces, référentiels, instructions), jamais ce qui appartient à l'utilisateur, et l'application fonctionne sans jamais la joindre. Deux choses remontent de l'appareil, chacune avec son interrupteur : le jeton de notification et des compteurs anonymes (des nombres par jour et par campus, jamais qui). Voir [PRIVACY.md](PRIVACY.md).
- **Le comportement est de la donnée.** Ce qu'il faut demander à une source et en retenir vit dans des Blueprints versionnés, joués par le moteur Aetherius embarqué : une source qui change se corrige par une publication de fichier, pas par une release.

## Ce que fait l'application

Quatre onglets : **Planning** (emploi du temps en vue jour ou semaine, filtres par UE, rappels, ajout au calendrier du système, lecture hors ligne), **Campus** (annonces de la vie étudiante, restaurants universitaires et menus, bibliothèques avec affluence en temps réel, salles libres), **Scolarité** (dossier, services de l'université, documents, protégés par biométrie) et **Réglages**. Un parcours d'accueil de trois à six étapes (selon l'établissement) règle le thème, la langue, l'établissement et le premier groupe favori.

## Les sources de données

| Source | Ce qu'elle fournit | Accès |
|---|---|---|
| Celcat (`celcat.u-bordeaux.fr`) | emplois du temps, groupes, salles et leur occupation | API interne, sans authentification |
| CAS / ENT Université de Bordeaux | identité étudiant, formation, messagerie | identifiants universitaires, extraction de pages |
| CAS / mondossierweb Bordeaux INP | identité étudiant, formation | identifiants universitaires, extraction de pages |
| ADE Bordeaux INP | emploi du temps | export iCalendar anonyme |
| Affluences | bibliothèques, affluence temps réel, horaires | API privée |
| Croustillant | restaurants CROUS et menus | API publique |
| OpenFreeMap | fonds de carte (données OpenStreetMap) | tuiles vectorielles publiques, attribution affichée |

Endpoints, fragilités et mesures : [docs/sources-externes.md](docs/sources-externes.md).

## Développement local

Prérequis : Node.js 22 (`.nvmrc`, 20.19 minimum), npm, un build de développement EAS (Expo Go ne suffit pas).

```bash
npm install
npx expo start
npx tsc --noEmit && npx eslint . --max-warnings=0 && npm test
```

Pour contribuer (mise en place, workflow, conventions, vérifications) : [CONTRIBUTING.md](CONTRIBUTING.md). Le pourquoi des choix non évidents : [docs/decisions.md](docs/decisions.md). Guide de l'équipe pour la console : [docs/guide-console.md](docs/guide-console.md). L'histoire du projet : [docs/histoire.md](docs/histoire.md).

## Crédits

UKit a été initialement pensé et développé par ses créateurs originaux. Un grand merci à eux pour leur travail sur les premières versions de l'application :

* [Jean](https://github.com/HackJack-101)
* [Thomas](https://github.com/thclmnt)
* [Florian](https://github.com/AamuLumi)
* [Gogotron](https://github.com/Gogotron)
* [Clément](https://github.com/Shapeqs)

Le projet est aujourd'hui repris, maintenu et développé par l'organisation KAE Lab. Un remerciement particulier à Jean pour sa confiance et pour nous avoir transmis les clés de l'application.

L'application s'appuie sur deux services tiers que nous remercions : **Affluences** pour les données d'affluence des bibliothèques, et **[Croustillant](https://croustillant.menu)** pour les menus des restaurants universitaires.

## Contact

* **Email** : contact@kaelab.dev
* **GitHub Issues** : ouvrir un ticket sur le dépôt pour un suivi public.

## Licence

Distribué sous licence Apache 2.0. Voir [LICENSE](LICENSE) pour plus de détails.

---

<p align="center"><sub>· · ·&nbsp; UKit &nbsp;— &nbsp;KAE Lab &nbsp;· · ·</sub></p>
