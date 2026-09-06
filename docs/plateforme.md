# Plateforme, permissions et publication

UKit est une application **Expo** (SDK 57, React Native 0.86, React 19.2 — depuis la montée de socle
[6.1.1-A](phase-6/6-1-1-a-montee-du-socle.md)) publiée sur l'App Store et le Play Store. Ce document couvre la configuration native, les permissions, la construction et la
publication.

## Identité de l'application

Déclarée dans [`app.config.ts`](../app.config.ts), qui charge `dotenv` au démarrage — en silence,
`config({ quiet: true })`, parce que la version 17 annonce chaque chargement et que cette configuration
est évaluée à chaque commande Expo — pour rendre les variables d'environnement disponibles.

| Champ | Valeur |
|---|---|
| Nom | UKit |
| Slug Expo | `Ukit` (propriétaire `kaelab`) |
| Identifiant iOS | `com.bordeaux.ukit` |
| Paquet Android | `com.bordeaux1.emplois` |
| Orientation | portrait uniquement |
| Couleur principale | `#006F9F` |
| Projet EAS | `77596c7c-87fc-4c86-9189-3a70fd839abf` |
| Mises à jour OTA | désactivées (`updates.enabled: false`) ; `expo-updates` n'est plus une dépendance depuis 6.1.1-A |
| Apparence | `userInterfaceStyle: automatic`, et l'application impose son thème au natif par `Appearance.setColorScheme` ([theme.md](theme.md#changer-de-thème)) |

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

> Écrit le 2026-09-04, quand le projet était en SDK 54. Depuis la montée [6.1.1-A](phase-6/6-1-1-a-montee-du-socle.md)
> le projet est en 57 et l'Expo Go du store le rouvre ; le mécanisme décrit ici reste vrai, et se
> reproduira au prochain SDK.

**Expo Go n'embarque qu'un seul SDK à la fois, le plus récent.** Le 2026-09-04, le store l'a passé en
**SDK 57** ; le projet était en **54**. L'application du store a donc cessé d'ouvrir UKit — sur iOS
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

### Monter de SDK

**La décision, d'abord.** Le 2026-09-04, en vérifiant 6.1-E, le saut 54 → 57 a été renvoyé « à son
propre jalon, après la 6.1 » : une version de consolidation, avec des utilisateurs déjà en 6.0, ne
peut pas porter cinq versions mineures de React Native sans rendre chaque régression ambiguë. Et **on
reste sur Expo** : ce qui a coincé est Expo Go, une commodité remplaçable en une commande, pas le
cadre — l'essentiel des dépendances de plateforme sont des modules `expo-*`, la chaîne de release
passe par EAS, et partir voudrait dire reprendre deux projets natifs pour retrouver le même tapis
roulant de versions, en plus dur. Ce n'est pas optionnel à terme : les stores imposent une API cible
minimale, et chez Expo c'est la montée de SDK qui la donne.

**La procédure, telle qu'elle a été jouée le 2026-09-06** ([6.1.1-A](phase-6/6-1-1-a-montee-du-socle.md)),
pour que le prochain saut ne se redécouvre pas :

1. `npx expo install expo@^57.0.0 --fix`. Il écrit `package.json` puis **sort en erreur** : il
   voudrait ajouter des greffons (`@react-native-community/datetimepicker`, `expo-asset`, `expo-font`,
   `expo-sharing`, `expo-splash-screen`) à une configuration TypeScript qu'il ne sait pas éditer. Les
   versions sont posées, `expo-doctor` ne réclame aucun de ces greffons : ne pas le rejouer.
2. Ce que `--fix` ne fait pas, à la main : `expo` sur un **patch précis** (`~57.0.20` — la régression
   mémoire de Hermes v1 avec `react-native-worklets` est corrigée en 57.0.9, le démarrage de
   développement en 57.0.17) ; `babel-preset-expo` en devDependency, hors de la liste des modules
   natifs ; `typescript` sur la ligne que le SDK attend (`~6.0.3`, `expo-doctor` le vérifie) et
   `@types/react` déclaré. Les versions attendues par un SDK se lisent dans le
   `bundledNativeModules.json` du paquet `expo`.
3. `babel.config.js` : le greffon devient `react-native-worklets/plugin` — `react-native-reanimated/plugin`
   n'en est plus qu'un alias.
4. `npm install`, puis `npx expo-doctor@latest` jusqu'à zéro écart.
5. **Les ruptures ne se voient pas au typage.** `tsc` sans `strict` accepte une promesse ignorée, et
   c'est exactement la forme des ruptures de ce saut. Celles rencontrées entre 54 et 57 :
   - `expo-calendar` : la racine du paquet porte l'API objet, et les fonctions historiques n'y sont
     plus que des souches qui **lèvent** ; le même code vit sous `expo-calendar/legacy`
     ([features/settings.md](features/settings.md#limites-connues)) ;
   - `expo-file-system` : `File.copy()` rend une promesse (SDK 56) ; le service des documents est
     synchrone par contrat et lit le fichier juste après — `copySync()` ;
   - `expo-blur` : `experimentalBlurMethod` devient `blurMethod` (SDK 55) ;
   - React Native 0.86 retire `StyleSheet.absoluteFillObject` — `absoluteFill` est l'objet ;
   - Reanimated 4.5 type `withInitialValues` sur ce que l'animation anime : un `FadeIn` n'accepte plus
     un glissement, `FadeInDown` anime les deux ;
   - `expo-modules-core` n'est plus hissé à la racine de `node_modules` : l'identifiant d'installation
     lit `randomUUID()` d'`expo-crypto`, l'API publique ;
   - le type `ExpoConfig` perd la clé `splash` historique. Le greffon natif la lit toujours quand
     aucune propriété de greffon ne la remplace, et l'écran de démarrage animé la relit telle quelle :
     passer au greffon `expo-splash-screen` changerait le rendu (image centrée à largeur fixe), ce
     qu'une montée ne fait pas ;
   - **TypeScript 6 passe `strict` à vrai par défaut** : la porte est passée de zéro à plus de deux
     cents erreurs sans qu'une ligne change. `tsconfig.json` écrit désormais `strict: false`
     ([qualite.md](qualite.md#typage)), et les onze vrais défauts que le défaut avait révélés sont
     corrigés.
6. **`expo/fetch` est le `fetch` global depuis le SDK 56** — celui remis au moteur Aetherius par
   `NetworkMockService` et celui du client Supabase. Le défaut est gardé et vérifié sur appareil ;
   le repli, si une source se comporte autrement, est `EXPO_PUBLIC_USE_RN_FETCH=1` à la construction.
7. **iOS 16.4 devient le minimum** (SDK 56) — iPhone 7, 6s et SE de première génération restent sur
   la version précédente. Xcode 26.4 côté EAS. C'est la seule chose visible d'une montée, et elle va
   dans le CHANGELOG.
8. **Les builds de développement sont périmés par construction**, sur les deux plateformes ; l'Expo
   Go du store rouvre le projet, et c'est la moitié de la raison d'être du saut.

**Les portes**, dans cet ordre : `tsc`, ESLint à zéro, la suite unitaire, la parité, `expo-doctor`,
puis **`npx expo export` sur les deux plateformes** — la seule qui prouve que Metro résout les
modules natifs et que Babel passe les directives `'worklet'`. Puis le protocole appareil du jalon,
sur des builds neufs.

**Ce qui a surpris.** Le `npm ci` de la console n'était pas cassé (le lockfile avait été réaligné par
6.1-B) ; il y avait trois cadres de clavier raisonnant sur l'edge-to-edge et non deux, plus un
quatrième qui laissait Android sans comportement ; et la copie de fichier devenue asynchrone n'aurait
été vue que sur appareil, par un document vide. Sur iPhone, sous l'Expo Go du store, deux choses de
plus : `Updates.reloadAsync()` ne rejetait plus, il **fermait Expo Go** — la réinitialisation du menu
de développement recharge désormais par `reloadAppAsync` d'`expo`, et `expo-updates` sort des
dépendances ; et le thème du téléphone se mélangeait à celui de l'application, d'où
`Appearance.setColorScheme` ([theme.md](theme.md#changer-de-thème)).

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
[`console/`](../console/README.md) et la déploie sur GitHub Pages à chaque poussée sur `main` qui
la touche, en deux jobs — construire, déployer dans l'environnement `github-pages` — comme la
documentation de Pages le prescrit. Elle n'embarque que l'URL du projet et la clé publiable, lues
dans deux **variables** de dépôt (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) : des valeurs publiques, déjà
dans le binaire de l'application. La clé de service n'apparaît nulle part.

À activer une fois à la main, avant le premier run : *Settings → Pages → Source : GitHub Actions*,
et les deux variables. L'environnement `github-pages` est créé au premier déploiement et protégé par
défaut sur la branche par défaut — le workflow tourne depuis `main`, pas depuis une branche de
travail. La branche s'appelait `master` jusqu'au 2026-09-06 ; un tag homonyme rendait `git push
origin master` ambigu, et le renommage a suivi la suppression du tag ([6.1.1-A](phase-6/6-1-1-a-montee-du-socle.md#la-branche-principale-devient-main)).

## Les sondes du matin

[`.github/workflows/sondes.yml`](../.github/workflows/sondes.yml) joue chaque matin, à 5 h UTC, les
sondes de [`sondes/`](../sondes/README.md) : Python 3.12, `aetherius[browser]` épinglé, Chromium par
Playwright (`--with-deps`), les tests unitaires du verdict, puis le runner. Il écrit la table `sondes`
avec le secret `SUPABASE_SERVICE_ROLE_KEY` — le seul secret de ce workflow — et ouvre les issues avec
le jeton du workflow (`issues: write`). Deux entrées en dispatch : `dry_run`, et `casser` pour
vérifier la chaîne d'issue sans attendre une vraie panne. Il reste vert quand une source est en
panne ; il passe au rouge quand une sonde n'a pas pu se prononcer.

## Les numéros de version

Quatre endroits portent une version :

| Emplacement | Valeur | Rôle |
|---|---|---|
| [`package.json`](../package.json) | `6.1.0` | version npm, mise à jour par le workflow |
| [`app.config.ts`](../app.config.ts) `version` | `6.1.0` | version affichée, et comparée à la table `app_release` ([backend.md](backend.md)) |
| [`app.config.ts`](../app.config.ts) `android.versionCode` | `551` | **seule déclaration** depuis 6.1.1-A — une clé racine du même nom, qui n'est pas un champ Expo, portait une autre valeur ; de toute façon inopérante, `appVersionSource: remote` fait d'EAS l'autorité |
| [`VERSION`](../VERSION) | `6.1.0` | fichier historique, aligné par le protocole de release ; plus lu à distance depuis [6-Z](phase-6/6-z-livraison-finale.md) |

Avant de poser un tag, les trois premiers doivent s'accorder ([6-1-z](phase-6/6-1-z-sortie.md)).

## Vérifier

- Après un changement de permission : désinstaller l'application, la réinstaller, et vérifier que la
  demande apparaît au bon moment avec le bon texte.
- Après un changement de configuration native : construire un profil `preview` (une modification de
  `app.config.ts` n'est pas prise en compte par un simple rechargement).
- Avant de poser un tag : vérifier que `package.json`, `app.config.ts` et `VERSION` sont cohérents.

## Limites connues

- **Le workflow met à jour `package.json` et `app.config.ts`**, pas `VERSION` : le protocole de release
  l'aligne à la main.
- **Aucun rapport d'erreur en production** malgré la présence de `extra.sentryDSN`.
- **Les mises à jour OTA sont désactivées** : toute correction passe par une publication de store.
- **`androidStatusBar.backgroundColor` et la couleur passée à `StatusBar`** sont inertes sous
  l'edge-to-edge, obligatoire depuis le SDK 57 ; `barStyle` reste lu. Gardés tant qu'un rendu ne dit
  pas le contraire.
- **`@expo/vector-icons` est déprécié depuis le SDK 56** au profit des paquets
  `@react-native-vector-icons/*` ; le SDK 57 l'épingle encore, et 41 fichiers l'importent. La
  migration est une session à part.
- **`expo-calendar` est consommé par son API historique** (`/legacy`), l'API objet étant une
  réécriture de la synchronisation ([features/settings.md](features/settings.md#limites-connues)).
- **Le mode strict de TypeScript reste éteint**, explicitement ([qualite.md](qualite.md#typage)).
