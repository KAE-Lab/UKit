# UKit

[![Mobile App Release](https://github.com/KAE-Lab/UKit/actions/workflows/release.yml/badge.svg)](https://github.com/KAE-Lab/UKit/actions)
[![Latest Release](https://img.shields.io/github/v/release/KAE-Lab/UKit?label=APK)](https://github.com/KAE-Lab/UKit/releases/latest)

[![Google Play](https://img.shields.io/badge/Google_Play-414141?style=for-the-badge&logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.bordeaux1.emplois)
[![App Store](https://img.shields.io/badge/App_Store-000000?style=for-the-badge&logo=apple&logoColor=white)](https://apps.apple.com/app/id1394708917)

UKit est une application compagnon moderne destinée aux étudiants de l'Université de Bordeaux. Ce projet est un fork majeur du dépôt initial, restructuré pour moderniser l'architecture globale (React Navigation v6, moteur Hermes) et sécuriser la gestion des données.

## Points clés du projet

- **Souveraineté et Open Source** : Remplacement intégral de Google Maps par OpenStreetMap via une intégration Leaflet personnalisée. Cela garantit une totale indépendance vis-à-vis des API payantes et du tracking GAFAM.
- **Migration TypeScript** : Sécurisation du codebase par un typage statique progressif (actuellement ~18% du volume de code).
- **Architecture Moderne** : Utilisation de React Navigation 6, du moteur Hermes pour la performance Android et d'un système de thèmes par tokens.

## Fonctionnalités

- **Emploi du temps** : Synchronisation en temps réel avec l'ENT et gestion de l'affichage par jour ou par semaine.
- **Cartographie** : Localisation des bâtiments et des salles de cours sur le campus via un moteur cartographique libre.
- **Restauration** : Accès aux menus des restaurants universitaires (CROUS) et calcul de distance en temps réel.

## État de la migration (src)

Le projet suit une stratégie de migration "Feature-first" :
- Fichiers TypeScript : 5 / 32
- Volume de code TypeScript : 1127 / 6209 lignes (18.1%)

## Développement local

1. **Prérequis** : Node.js (v18+), npm, Expo CLI.
2. **Installation** :
   ```bash
   npm install
   npx expo start
   ```

## Crédits

UKit a été initialement pensé et développé par ses créateurs originaux. Un grand merci à eux pour leur travail sur les premières versions de l'application :
* [Jean](https://github.com/HackJack-101)
* [Thomas](https://github.com/thclmnt)
* [Florian](https://github.com/AamuLumi)
* [Gogotron](https://github.com/Gogotron)
* [Clément](https://github.com/Shapeqs)

Le projet est aujourd'hui repris, maintenu et développé par l'organisation KAE Lab. Un remerciement particulier à Jean pour sa confiance et pour nous avoir transmis les clés de l'application.

## Contact

Pour toute question sur le projet, un bug à remonter ou une proposition d'amélioration, vous pouvez passer par :

* **Email** : contact@kaelab.dev
* **GitHub Issues** : Ouvrir un ticket directement sur le dépôt pour un suivi public.

L'organisation KAE Lab centralise la maintenance et les retours techniques.

## Licence

Distribué sous licence Apache 2.0. Voir [LICENSE](LICENSE) pour plus de détails.
