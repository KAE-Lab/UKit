---
paths:
  - "app.config.ts"
  - "eas.json"
  - ".easignore"
  - "metro.config.js"
  - "babel.config.js"
  - "package.json"
  - "VERSION"
  - "tools/expo/**"
  - "tools/pdfjs/**"
  - ".github/workflows/release.yml"
  - ".github/dependabot.yml"
  - "src/shared/push/**"
  - "src/shared/services/entretien.ts"
---
# Plateforme, build et release

- Identifiants immuables : paquet Android `com.bordeaux1.emplois` (c'est la fiche Play Store de 2015, un changement rompt la continuité d'installation) ; iOS `com.bordeaux.ukit`, partagé avec le build de développement par choix.
- Release (tag et sources de version : CLAUDE.md) : la production part par `workflow_dispatch` avec `build_production` (iOS `--auto-submit`, Android AAB puis `eas submit`) ; le dispatch réécrit `package.json`, `package-lock.json` et la `version` d'`app.config.ts` depuis `target_tag`, jamais `VERSION`. Poser le tag seulement après vérification sur les deux appareils. `eas credentials -p ios` avant le workflow si une capacité iOS est ajoutée. Un numéro de version décrit ce qui est sorti, il se décide à la sortie ; notes de version = ce qui change pour l'utilisateur, sans promesse de robustesse.
- Expo Go n'embarque que le dernier SDK et `expo-notifications` y plante sous Android (import dynamique derrière `isRunningInExpoGo()`). Le build de développement remplace l'app du store (même identifiant, données effacées). Le reconstruire à chaque changement natif (module `expo-*`, config native d'`app.config.ts`, SDK), jamais pour du code, un Blueprint ou un écran.
- Monter de SDK dans un jalon dédié, avant tout travail visuel : `expo` sur un patch précis, `typescript` et `@types/react` sur la ligne du SDK, portes puis builds neufs ; ne pas rejouer `npx expo install expo@^N --fix` (erreur sur des greffons qu'il ne sait pas éditer) ; importer `expo-calendar/legacy` (la racine lève) ; laisser `splash` inchangé ; repli de `expo/fetch` : `EXPO_PUBLIC_USE_RN_FETCH=1` à la construction. Dire la hausse du minimum iOS dans les notes de version.
- Dépendances : critique ou haute transitive → `npm audit fix` sans `--force`, PR `chore(deps)` avec portes et `expo export` ; les paquets épinglés par le SDK (`expo*`, `react*`, `react-native*`, `@react-navigation/*`, `babel-preset-expo`, `typescript`) attendent la montée du socle.
- Deux configurations de sécurité réseau dans le plugin `autorites-universitaires` (production muette sur le clair, `debug` qui l'autorise) : Android ignore `usesCleartextTraffic` dès qu'une config existe. Les racines HARICA 2021 sont embarquées pour toutes les connexions (un Android d'avant mi-2021 refuse Celcat, ENT, Moodle et le webmail) ; ne vaut que pour un build.
- `google-services.json` hors du dépôt public (variable EAS fichier `GOOGLE_SERVICES_JSON`) ; en `--local` le runner l'écrit et `.easignore` (qui remplace `.gitignore` pour l'archive EAS) doit rester la copie de `.gitignore` moins cette ligne : toute ligne ajoutée à l'un se recopie dans l'autre (écart actuel inscrit dans `docs/defauts-fonctionnels.md`).
- Push : clé FCM au menu « Google Service Account » puis « Push Notifications (FCM V1) » ; un silence iOS en test = limites APNs/Expo, attendre sans redéployer. Permissions demandées à l'usage, jamais au lancement ; seules les notifications font exception, une fois par l'entretien (jamais pendant l'accueil ni après un refus). Textes iOS explicites sur la finalité (revue App Store) ; `NSCalendarsFullAccessUsageDescription` suit l'usage réel.
- La tâche de fond `ukit-entretien` est un bonus (`minimumInterval` en minutes, plancher) : l'entretien se joue aussi à l'ouverture. Test : `adb shell cmd jobscheduler run -f <package> <id>` ; mesure de production sur 24 h application tuée.
- pdf.js reste en `.txt` (Metro compilerait `.mjs`), mis à jour par `npm run pdfjs:vendor` ; ne rien ajouter d'autre à `metro.config.js`. Mises à jour OTA éteintes (`updates.enabled: false`) : une correction distante passe par les Blueprints ou la base, le reste par un store.
- Carte (WebView MapLibre + OpenFreeMap, décision `carte-maplibre`) : coordonnées `{lat, lng}` (traduire le `lon` de Croustillant à la frontière), pas d'écran carte dédié, attribution atteignable.
