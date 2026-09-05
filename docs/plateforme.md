# Plateforme, permissions et publication

UKit est une application **Expo** (SDK 54, React Native 0.81, React 19) publiée sur l'App Store et le
Play Store. Ce document couvre la configuration native, les permissions, la construction et la
publication.

## Identité de l'application

Déclarée dans [`app.config.ts`](../app.config.ts), qui charge `dotenv/config` au démarrage pour rendre
les variables d'environnement disponibles.

| Champ | Valeur |
|---|---|
| Nom | UKit |
| Slug Expo | `Ukit` (propriétaire `kaelab`) |
| Identifiant iOS | `com.bordeaux.ukit` |
| Paquet Android | `com.bordeaux1.emplois` |
| Orientation | portrait uniquement |
| Couleur principale | `#006F9F` |
| Projet EAS | `77596c7c-87fc-4c86-9189-3a70fd839abf` |
| Mises à jour OTA | désactivées (`updates.enabled: false`) |

Le paquet Android conserve son identifiant historique : le changer ferait perdre la continuité de
l'installation pour tous les utilisateurs existants. Ne pas y toucher.

`extra.sentryDSN` lit `process.env.SENTRY_DSN`, mais **aucun code de l'application n'exploite cette
valeur** : il n'y a pas de rapport d'erreur en production.

## Plugins Expo

```ts
plugins: [
  'expo-web-browser',
  'expo-secure-store',
  ['expo-local-authentication', { faceIDPermission: '…' }],
]
```

Ces trois plugins servent l'onglet [Scolarité](features/scolarite.md) : navigateur intégré, stockage
chiffré des identifiants, déverrouillage biométrique.

## Permissions

Chaque permission est justifiée par une fonctionnalité précise. Le texte iOS est celui que voit
l'utilisateur : il doit rester explicite sur la finalité et sur le fait que la donnée ne quitte pas
l'appareil.

| Permission | Plateforme | Utilisée par |
|---|---|---|
| Calendriers (lecture / écriture) | iOS `NSCalendarsUsageDescription`, `NSCalendarsFullAccessUsageDescription` · Android `READ_CALENDAR`, `WRITE_CALENDAR` | synchronisation de l'emploi du temps ([features/settings.md](features/settings.md)) |
| Rappels | iOS `NSRemindersUsageDescription` | déclaré, non utilisé par le code actuel |
| Localisation | iOS `NSLocationWhenInUseUsageDescription` · Android `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` | distance aux restaurants CROUS et aux BU ([features/campus.md](features/campus.md)) |
| Face ID / biométrie | iOS `NSFaceIDUsageDescription` + option du plugin | protection de l'onglet Scolarité |
| Tâches en arrière-plan | iOS `UIBackgroundModes: ['fetch']` | synchronisation périodique du calendrier |
| Notifications | demandée à l'exécution | rappels avant les cours |

Les permissions sont demandées **au moment de l'usage**, jamais au lancement : la localisation à
l'ouverture d'un écran Campus, le calendrier à l'activation de la synchronisation, les notifications
à l'activation des rappels, la biométrie à l'entrée dans Scolarité.

## Tâche de fond

`SettingsManager` enregistre une tâche `background-fetch` quand la synchronisation calendrier est
activée :

```ts
BackgroundFetch.registerTaskAsync('background-fetch', {
    minimumInterval: 12 * 60 * 60,   // 12 heures
    stopOnTerminate: false,
    startOnBoot: true,
});
```

La tâche appelle `SettingsManager.syncCalendar()`. `minimumInterval` est un **plancher**, pas une
garantie : les deux systèmes décident de la fréquence réelle selon l'usage et la batterie. Désactiver
la synchronisation désenregistre la tâche.

## Ressources

| Fichier | Rôle |
|---|---|
| [`assets/icons/icon.png`](../assets/icons/icon.png) | icône de l'application (iOS et Android) |
| [`assets/icons/splash.png`](../assets/icons/splash.png) | écran de démarrage, fond blanc, `resizeMode: contain` |
| [`assets/icons/logo.png`](../assets/icons/logo.png) | logo affiché dans l'onboarding |
| [`assets/images/default_resto.png`](../assets/images/default_resto.png) | visuel de repli des fiches restaurant |
| [`assets/locations.json`](../assets/locations.json) | référentiel des bâtiments ([cartographie.md](cartographie.md)) |
| [`assets/pdfjs/pdf.min.mjs.txt`](../assets/pdfjs/pdf.min.mjs.txt) · [`pdf.worker.min.mjs.txt`](../assets/pdfjs/pdf.worker.min.mjs.txt) | pdf.js et son worker, copiés **tels quels** du paquet `pdfjs-dist` (build `legacy`) par `npm run pdfjs:vendor` ; `VERSION` et `LICENSE` les accompagnent, et un test vérifie qu'ils sont ceux du paquet installé ([features/scolarite.md](features/scolarite.md)) |
| [`assets/pdfjs/viewer.html`](../assets/pdfjs/viewer.html) | la page du lecteur PDF d'Android : ses marqueurs sont remplacés à l'assemblage |

`assetBundlePatterns: ['**/*']` embarque toutes les ressources dans le binaire.

**Pourquoi `.txt`.** Metro traite `.mjs` comme du source — il le compilerait et l'embarquerait dans le
bundle. Or pdf.js s'exécute dans une WebView, qui a besoin de son texte tel quel : un fichier servi tel
quel est un asset, et `txt` est la seule extension neutre qu'un asset de texte puisse porter. C'est la
seule chose que [`metro.config.js`](../metro.config.js) ajoute à la configuration d'Expo — Metro n'en
avait besoin d'aucune jusqu'ici, et le fichier ne doit pas devenir l'endroit où l'on empile.

## Construction

Profils dans [`eas.json`](../eas.json) :

| Profil | Sortie | Usage |
|---|---|---|
| `development` | client de développement, distribution interne | débogage sur appareil |
| `preview` | APK Android, simulateur iOS | test interne, APK publié en Release GitHub |
| `production` | AAB Android, build iOS, `autoIncrement` | stores |

```bash
npm run build:android     # eas build -p android --profile preview
npm run build:ios         # eas build -p ios --profile preview
```

`cli.appVersionSource: "remote"` : c'est **EAS qui fait autorité sur le numéro de build**, pas les
`versionCode` du fichier de configuration.

### Expo Go ne sert plus, et il faut savoir pourquoi

**Expo Go n'embarque qu'un seul SDK à la fois, le plus récent.** Le 2026-09-04, le store l'a passé en
**SDK 57** ; le projet est en **54**. L'application du store a donc cessé d'ouvrir UKit — sur iOS
comme sur Android, avec un message explicite sur Android et une simple absence sur iOS, dont
l'interface a de surcroît retiré le champ de saisie d'URL. Ce n'est pas un incident : ça se
reproduira à chaque sortie de SDK.

Deux sorties, et elles ne se remplacent pas :

- **Android** : Expo publie un client par SDK, en APK, sur
  [`expo/expo-go-releases`](https://github.com/expo/expo-go-releases) — la version pour le SDK 54 est
  `Expo-Go-54.0.8.apk`. Il faut désinstaller celui du store d'abord : Android refuse de rétrograder
  une application installée. L'URL exacte se lit dans `https://api.expo.dev/v2/versions/latest`, champ
  `sdkVersions["54.0.0"].androidClientUrl`.
- **iOS** : **il n'y en a pas.** Apple ne laisse pas réinstaller une version antérieure du store. La
  seule voie est un **build de développement** (`eas build --profile development`), c'est-à-dire le
  client Expo Go du projet, contenant son propre runtime natif. On l'installe une fois ; il ne se
  reconstruit que quand une dépendance **native** change, pas à chaque modification de code.

Le build de développement est de toute façon la bonne réponse pour les deux plateformes : il rend le
poste de développement indépendant de ce qu'Expo fait de son application bac à sable.

> **Un piège du tunnel, mesuré le 2026-09-04.** Sur Android, le lecteur de PDF charge **pdf.js comme
> un asset servi par Metro** (c'est la raison d'être de `metro.config.js`). En Expo Go via un tunnel,
> ouvrir un document va donc chercher 1,8 Mo de bibliothèque **à travers ngrok** — et si le tunnel
> tombe, l'écran casse sans que l'application y soit pour quoi que ce soit. Le journal dit alors
> `Tunnel connection has been closed`, et une reconnexion suffit. **Ce chemin n'existe pas dans un
> build** : les assets y sont dans le binaire. Avant de chercher un défaut du lecteur, vérifier que le
> tunnel sert : `curl <url>/assets/assets/pdfjs/pdf.min.mjs.txt?platform=android` doit rendre 200 et
> 518 555 octets.

### Le build de développement : les quatre choses qui se perdent

Fait le 2026-09-04 pour un iPhone. La marche à suivre est celle d'Expo — enregistrer l'appareil
depuis [expo.dev](https://expo.dev/accounts/kaelab/settings/apple-devices), puis
`npx eas-cli build --profile development --platform ios`. Ce qui suit est ce qui **ne** s'y trouve
pas, parce que c'est propre à ce projet.

> **Le jalon [6.1-E](phase-6/6-1-e-finitions-interface.md) a changé le natif, donc le build de
> développement du 2026-09-04 est périmé.** Deux modules entrent — `react-native-pager-view` (le
> moteur du glissement entre onglets) et `expo-haptics` (le retour des contrôles dessinés) — et un
> sort, `@react-native-community/slider`, remplacé par un curseur maison. Expo Go les porte déjà
> tous ; **un build de développement doit être refait** avant de vérifier ce jalon sur iPhone.

**On ne reconstruit que sur un changement natif.** Le build embarque le runtime ; le JavaScript vient
de Metro comme avec Expo Go. Ajouter un module `expo-*`, toucher à la configuration native
d'`app.config.ts`, monter de SDK : on reconstruit. Modifier du code, un Blueprint, un écran : non.
C'est la ligne qui coûte le plus cher à ignorer — chercher pendant une heure un défaut qui n'est que
l'absence d'un module dans un vieux binaire.

**`expo-dev-client` est une dépendance du dépôt**, ajoutée automatiquement au premier build. Elle doit
être commitée : sans elle, le dépôt ne décrit plus ce qui a été construit.

**L'identifiant reste partagé avec l'application du store — et c'est une décision.**
`com.bordeaux.ukit` est le même des deux côtés, donc iOS les tient pour la même application :
installer le build de développement **remplace** celle du store, et efface ses données. On pourrait
les faire cohabiter en donnant un identifiant distinct au profil de développement ; **on ne le fait
pas**, parce que tester au quotidien dans les conditions réelles vaut mieux que de garder les deux.
Ne pas « corriger » ce point sans raison.

**Et iOS 16 demande le mode développeur** : *Réglages → Confidentialité et sécurité → Mode
développeur*, puis un redémarrage. L'entrée n'apparaît qu'après avoir installé une application signée
en interne.

> **Ce que ça change pour la vérification, et c'est le vrai gain.** Expo Go est un bac à sable
> générique : le code y tourne avec *ses* droits et *ses* limites. Un build de développement porte le
> runtime natif d'UKit — son identifiant, ses permissions, ses droits, ses modules. Deviennent donc
> testables des choses qui ne l'étaient pas, à commencer par **les notifications push**, retirées
> d'Expo Go depuis le SDK 53 : les rappels de cours, capacité livrée de l'application, n'y étaient pas
> vérifiables. `__DEV__` reste vrai, donc le chrono des runs
> ([qualite.md](qualite.md#lire-un-run-plutôt-que-le-supposer)) continue d'écrire ses mesures.

**On y reste après le saut de SDK.** Revenir à Expo Go rendrait le projet dépendant d'un calendrier
qu'on ne maîtrise pas, et ne rendrait de toute façon pas les capacités qu'il ne sait plus jouer. Expo
Go garde un usage : un essai jetable, ou faire tourner le projet chez quelqu'un qui n'a pas les
identifiants de signature.

### Le saut de SDK : à faire, mais pas dans la 6.1

**Décision du 2026-09-04.** Passer de 54 à 57 veut dire React Native **0.81.5 → 0.86.3** — cinq
versions mineures —, React 19.1 → 19.2, et **41 dépendances de plateforme** à faire bouger ensemble :
`reanimated`, `webview`, `screens`, `notifications`, `secure-store`, `local-authentication`,
`calendar`, `task-manager`… (les versions attendues par chaque SDK se lisent dans
`https://api.expo.dev/v2/sdks/<version>/native-modules`).

Ce n'est pas optionnel à terme : les stores imposent périodiquement une version d'API cible minimale,
et chez Expo c'est la montée de SDK qui la donne. Mais ce n'est **pas** un travail à mêler à la 6.1 :
c'est une version de **consolidation**, avec des utilisateurs déjà en 6.0, et y ajouter un saut de
runtime rendrait chaque régression ambiguë — on ne saurait plus si un défaut vient de la consolidation
ou du saut.

Il aura donc **son propre jalon**, après la sortie de la 6.1, avec une vérification appareil sur les
**deux** plateformes — ce que le build de développement rend enfin possible sur iOS.

**Et on reste sur Expo.** Ce qui a coincé est Expo Go, une commodité de développement remplaçable en
une commande, pas le cadre lui-même : l'essentiel des 41 dépendances sont des modules `expo-*`
(trousseau chiffré, biométrie, notifications, calendrier, tâches de fond), la chaîne de release passe
par EAS, et partir voudrait dire reprendre à sa charge deux projets natifs pour retrouver le même
tapis roulant de versions, en plus dur.

**Les paquets Expo suivent le SDK.** `npx expo-doctor` est sans écart depuis la passe de code
[6.1-C](phase-6/6-1-c-passe-de-code.md) — sept paquets avaient un patch de retard, et le `.gitignore`
devait dire `.expo/` et non `.expo/*` pour qu'il s'en satisfasse. `npx expo install --fix` les
réaligne, avec un piège : il **s'arrête en erreur** après avoir écrit `package.json`, parce qu'il
voudrait ajouter les greffons `expo-asset` et `expo-font` à `app.config.ts` et ne sait pas écrire dans
une configuration dynamique. Les versions sont bien posées ; les deux greffons sont facultatifs —
l'application charge ses polices à l'exécution — et `expo-doctor` ne les réclame pas. Le workflow de
release, lui, est sur `actions/setup-java@v5`.

## Publication

Un seul workflow : [`.github/workflows/release.yml`](../.github/workflows/release.yml), déclenché par
un tag `v*` ou manuellement (`workflow_dispatch`) avec trois entrées — `target_tag`, `release_notes`,
et les interrupteurs `skip_build` / `build_production`.

Enchaînement :

1. Mise à jour de version : `npm version <tag sans v>` sans tag git, puis commit et push du bump.
2. `npm install`.
3. Si `build_production` : iOS `eas build --profile production --auto-submit --no-wait`, puis Android
   construit localement en AAB et soumis par `eas submit`.
4. Si `skip_build` n'est pas coché : APK `preview` construit localement et attaché à une Release
   GitHub.

Secrets requis : `EXPO_TOKEN`, `GOOGLE_PLAY_KEY` (écrit dans `google-play-key.json` à l'exécution).

> **Le workflow tente de modifier `app.config.js`**, un fichier qui n'existe pas — la configuration est
> dans `app.config.ts`. Le `sed` de mise à jour de version et le `git add` correspondant sont donc
> sans effet : **le champ `version` de `app.config.ts` n'est pas mis à jour automatiquement** et doit
> être modifié à la main avant de poser un tag.

## La console de pilotage

[`.github/workflows/console.yml`](../.github/workflows/console.yml) construit
[`console/`](../console/README.md) et la déploie sur GitHub Pages à chaque poussée sur `master` qui
la touche, en deux jobs — construire, déployer dans l'environnement `github-pages` — comme la
documentation de Pages le prescrit. Elle n'embarque que l'URL du projet et la clé publiable, lues
dans deux **variables** de dépôt (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) : des valeurs publiques, déjà
dans le binaire de l'application. La clé de service n'apparaît nulle part.

À activer une fois à la main, avant le premier run : *Settings → Pages → Source : GitHub Actions*,
et les deux variables. L'environnement `github-pages` est créé au premier déploiement et protégé par
défaut sur la branche par défaut — le workflow tourne depuis `master`, pas depuis une branche de
travail.

## Les sondes du matin

[`.github/workflows/sondes.yml`](../.github/workflows/sondes.yml) joue chaque matin, à 5 h UTC, les
sondes de [`sondes/`](../sondes/README.md) : Python 3.12, `aetherius[browser]` épinglé, Chromium par
Playwright (`--with-deps`), les tests unitaires du verdict, puis le runner. Il écrit la table `sondes`
avec le secret `SUPABASE_SERVICE_ROLE_KEY` — le seul secret de ce workflow — et ouvre les issues avec
le jeton du workflow (`issues: write`). Deux entrées en dispatch : `dry_run`, et `casser` pour
vérifier la chaîne d'issue sans attendre une vraie panne. Il reste vert quand une source est en
panne ; il passe au rouge quand une sonde n'a pas pu se prononcer.

## Les numéros de version

Quatre endroits portent une version, et ils ne s'accordent pas aujourd'hui :

| Emplacement | Valeur actuelle | Rôle |
|---|---|---|
| [`package.json`](../package.json) | `5.6.1` | version npm, mise à jour par le workflow |
| [`app.config.ts`](../app.config.ts) `version` | `5.6.1` | version affichée et comparée par l'alerte de mise à jour |
| [`app.config.ts`](../app.config.ts) `versionCode` | `550` (racine) et `541` (bloc `android`) | deux valeurs divergentes ; seule celle du bloc `android` est lue, et `appVersionSource: remote` la rend de toute façon inopérante |
| [`VERSION`](../VERSION) | `4.0.4` | fichier lu à distance pour proposer une mise à jour |

Conséquence sur l'alerte de mise à jour : `UpdateAlert` ([`AppUI.tsx`](../src/shared/ui/AppUI.tsx))
compare la version du manifeste au contenu distant de `VERSION`. Avec `5.6.1` d'un côté et `4.0.4` de
l'autre, la comparaison serait toujours différente — donc l'alerte s'afficherait à chaque lancement.
Elle ne le fait pas, car **`UpdateAlert` est importé dans
[`rootContainer.tsx`](../src/shared/navigation/rootContainer.tsx) mais jamais rendu**. Le mécanisme
est inactif. Le rebrancher exige d'abord de réaligner `VERSION`.

## Vérifier

- Après un changement de permission : désinstaller l'application, la réinstaller, et vérifier que la
  demande apparaît au bon moment avec le bon texte.
- Après un changement de configuration native : construire un profil `preview` (une modification de
  `app.config.ts` n'est pas prise en compte par un simple rechargement).
- Avant de poser un tag : vérifier que `package.json`, `app.config.ts` et `VERSION` sont cohérents.

## Limites connues

- **`VERSION` est désynchronisé** de deux versions majeures par rapport au reste.
- **Le workflow cible `app.config.js`** au lieu de `app.config.ts` (voir ci-dessus).
- **`versionCode` est déclaré deux fois** avec deux valeurs.
- **Aucun rapport d'erreur en production** malgré la présence de `extra.sentryDSN`.
- **Les mises à jour OTA sont désactivées** : toute correction passe par une publication de store.
- **`expo-updates` figure dans les dépendances** mais n'est ni configuré ni utilisé.
