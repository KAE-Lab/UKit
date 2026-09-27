# Inventaire du mouvement

État mesuré du dépôt au **2026-09-26**, sur la branche `v6.3` à `131ae8c`, avant tout changement du
jalon [7-I](phase-7/7-i-releve-et-vocabulaire.md). Ce document **compte**, il ne juge pas : ce que le
jalon change est exactement ce qui est relevé ici, et la liste de contrôle de la sortie
([7-K](phase-7/7-k-sortie-6-3.md)) est ce relevé, rejoué. Il est le pendant, pour le mouvement, de
[inventaire-visuel.md](inventaire-visuel.md) pour les formes.

> **Une mesure, pas une intuition.** Chaque compte porte sa commande, pour être rejoué ; chaque fait
> porte son fichier et sa ligne. Ce qui se juge à l'œil — un saut, un clignotement — est nommé par
> le code qui le produit, puis confirmé sur appareil pour l'écran fondateur.

## Périmètre de la mesure

Compté : `src/**/*.ts`, `src/**/*.tsx` et `App.tsx`. **Exclus** : les tests, `src/shared/theme/Theme.ts`
et les paquets de `node_modules/`, sauf pour lire ce que la pile de navigation fait par défaut. Les
lignes effectives sont celles d'ESLint (`max-lines`, blancs et commentaires exclus) :

```bash
npx eslint --no-inline-config --rule '{"max-lines":["warn",{"max":1,"skipBlankLines":true,"skipComments":true}]}' -f json <fichiers>
```

## 1. Les moteurs

### 1.1 Reanimated — 5 fichiers

```bash
grep -rln "react-native-reanimated" src App.tsx --include='*.ts' --include='*.tsx'
```

[`shared/ui/Card.tsx`](../src/shared/ui/Card.tsx) (`FadeIn` sans durée + `LinearTransition.springify()`,
le **seul** `LinearTransition` du dépôt), [`ApparitionEnFondu.tsx`](../src/shared/ui/ApparitionEnFondu.tsx)
(`FadeIn.duration(200)`), [`Interrupteur.tsx`](../src/shared/ui/Interrupteur.tsx) (`withTiming` 200 ms),
[`Curseur.tsx`](../src/shared/ui/Curseur.tsx) (`Gesture.Pan`, `withTiming` 120 ms),
[`Scolarite/components/WebBrowserComponents.tsx`](../src/features/Scolarite/components/WebBrowserComponents.tsx)
(`withTiming` 250 ms ×4). `withSpring` : **0**. `FadeOut` : 0. `useReducedMotion` : 0.

### 1.2 `Animated` legacy — 21 fichiers

```bash
grep -rnE "^import \{[^}]*\bAnimated\b[^}]*\} from 'react-native'" src App.tsx --include='*.ts' --include='*.tsx'
# plus un import multi-lignes : src/features/Scolarite/components/ScolariteLoginView.tsx:4
```

| Rôle | Fichiers |
|---|---|
| **Sources d'animation** (une `Animated.Value` qui pilote quelque chose) | `NavHelpers.tsx` (11 en-têtes poussés), `CampusDashboard.tsx`, `ScolariteDashboard.tsx`, `SettingsScreen.tsx` (trois en-têtes d'onglet recopiés), `GroupSelectionScreen.tsx`, `Bandeau.tsx`, `ChargementPleinePage.tsx`, `ScolariteLoadingScreen.tsx`, `ProgressBar.tsx`, `ModMenu.tsx`, `App.tsx` (splash) |
| **Relais de défilement** (un `Animated.ScrollView` ou `FlatList` qui ne fait que rapporter `onScroll`) | `BdeDetailsScreen`, `CampusListLayout`, `ScheduleList`, `PageScolarite`, `ScolariteLoginView`, `CredentialsSettingsScreen`, `DocumentsScreen`, `AboutScreen`, `CalendriersAffichesScreen`, `FiltersScreen` |

`useNativeDriver: false` — **5 occurrences** : [`NavHelpers.tsx:300`](../src/shared/navigation/NavHelpers.tsx)
(le fondu du titre des onze écrans poussés, sur le thread JS), `ModMenu.tsx:94` et `:105`,
`ScolariteLoadingScreen.tsx:123` (la largeur de la barre), `GroupSelectionScreen.tsx:319`.
`useNativeDriver: true` — 7 : les trois en-têtes d'onglet, `Bandeau`, `ChargementPleinePage`,
`ScolariteLoadingScreen` (le libellé), `App.tsx`. `scrollEventThrottle` : 14 sites, tous à 16.

### 1.3 Les autres moteurs

| Moteur | Où | Ce qu'il anime |
|---|---|---|
| `LayoutAnimation` | **un seul site**, [`transitions.ts:19`](../src/shared/ui/transitions.ts) (220 ms, `easeInEaseOut`, `opacity`) ; 4 appelants : `bascule.ts:29`, `CredentialsContext.tsx:834`, `WelcomeScreen.tsx:98`, `SettingsScreen.tsx:338` | les bascules de structure |
| `<Modal>` natif | 12 usages dans 9 fichiers, **tous** `animationType="fade"` (`grep -rnE "<Modal\b" src`) | toutes les modales et feuilles |
| `react-native-collapsible` | `DayWeekCollapsible.tsx:151`, sans durée passée (300 ms `easeOutCubic` par défaut) | le pliage des jours en vue semaine |
| `react-native-image-viewing` | `VisionneuseImages.tsx:32`, ses propres transitions, `Image` de React Native hors cache | la visionneuse d'annonce |
| `PanResponder` + `Animated.spring` sans configuration | `ModMenu.tsx:80-106` | la traînée du menu de développement |
| Gestes `react-native-gesture-handler` | 4 : la barre d'onglets (`glissementDOnglets.tsx:35-37`), le curseur, le tiroir du navigateur, `GestureDetector` de `MainTabNavigator.tsx:294` | — |
| Transitions de navigation | **aucune option** dans `StackNavigator.tsx` (défauts de `@react-navigation/stack` 7.7.2 : `SlideFromRightIOS` ; `FadeFromRightAndroid` sur Android 14+, `ScaleFromCenterAndroid` avant) ; onglets `animation: 'shift'` (`MainTabNavigator.tsx:359`) | — |

### 1.4 Ce qui n'existe pas

```bash
grep -rnE "useReducedMotion|isReduceMotionEnabled|placeholder=\{|blurhash|contentPosition|withSpring|Squelette|FondDEcran|CarteEnPanne" src App.tsx --include='*.ts' --include='*.tsx'
```

Aucun token de mouvement dans [`tokens.ts`](../src/shared/theme/tokens.ts) ; aucun composant ne lit le
réglage « réduire les animations » du système ; aucun `placeholder` d'image (les sept `placeholder=`
trouvés sont des `TextInput`) ; `blurhash` n'existe côté application que comme colonne du type de ligne
(`supabase/types.ts:68`) ; aucun `contentPosition` ; aucun ressort paramétré ; ni squelette, ni fond
d'écran, ni carte en panne. **L'haptique** vit à deux endroits, `Interrupteur.tsx:106` et
`Curseur.tsx:108`, tous deux `Haptics.selectionAsync`.

## 2. Les durées et les seuils écrits en dur

Aucune échelle ne les porte ; chacune vit dans son fichier.

| Valeur | Où | Rôle |
|---:|---|---|
| 1 000 ms | `App.tsx:133` | fondu de sortie du splash (voile `#ffffff` quel que soit le thème, `:169`) |
| 220 ms | `transitions.ts:20` | `LayoutAnimation` des bascules de structure |
| 200 ms | `ApparitionEnFondu.tsx:46` | `DUREE_FONDU_MS` : la couture chargement → contenu, et la `transition` des images `expo-image` (5 sites) |
| 200 ms | `Bandeau.tsx:39` | entrée du bandeau de service, glissement −16 pt (`:40`) |
| 200 ms | `Interrupteur.tsx:64` | course de la poignée, `Easing.out(cubic)` |
| 240 ms | `ChargementPleinePage.tsx:90` | fondu de la ligne de patience ; `ScolariteLoadingScreen.tsx:146-152` le libellé d'étape (0,35 → 1) |
| 250 ms | `WebBrowserComponents.tsx:39-49` | le tiroir de la barre d'action, quatre fois |
| 120 ms | `Curseur.tsx:61` | recalage de la poignée sur le cran |
| 300 ms | `indicateurRetarde.ts:36` | `DELAI_AVANT_INDICATEUR_MS` : rien avant, puis l'indicateur |
| 4 000 ms | `ChargementPleinePage.tsx:51` | la seconde ligne d'attente ; `useWelcomeState.ts:36` le plafond du catalogue à l'accueil |
| 520 ms | `useEcranDeProgression.ts:19` | `GRACE_MS` : l'écran d'attente reste après la fin du parcours froid |
| 50 ms | `NavHelpers.tsx:290` ; `DayView.tsx:222, 294, 336` ; `CrousDateHeader.tsx:21` ; `useLibraryTimetableData.ts:59` ; `FreeRoomDetailsScreen.tsx:41` | `setTimeout` avant `setParams` ou `scrollToIndex` ; 500 ms de reprise sur `onScrollToIndexFailed` |
| 1 500 ms | `rafraichissement.tsx:42` | plafond du tirer sans section |
| [0, 60] → [1, 0] | `NavHelpers.tsx:38-39` | le titre des onze écrans poussés s'efface |
| [0, 50] → [1, 0] | `CampusDashboard.tsx:43-47`, `ScolariteDashboard.tsx:76-78`, `SettingsScreen.tsx:81` | les trois titres d'onglet s'effacent |
| `insets.top + 70` | `NavHelpers.tsx:304, 315` (littéral) ; `ScreenState.tsx:58` (`HEADER_OFFSET`) ; `BdeDetailsScreen.tsx:157` (recopié) | la hauteur de l'en-tête transparent |
| `insets.top + 60` | `CampusDashboard.tsx:19`, `ScolariteDashboard.tsx:311`, `SettingsScreen.tsx:392` | la hauteur des trois titres d'onglet |
| `insets.top + 65` | `CrousDateHeader.tsx:41`, `LibraryDetailsComponents.tsx:78`, `FreeRoomDetailsComponents.tsx:23`, `GroupSelectionScreen.tsx:361` | quatre bandeaux dans le flux, cinq points sous l'en-tête |
| `insets.top + 50` | `AboutScreen.tsx:146` | écrase le `headerPadding` de `withHeaderAnimation` |
| 75 / 50 / 26 | `ScreenState.tsx:61` ; `HeaderButton.tsx:28-29` | la barre d'onglets, le bouton d'en-tête et son glyphe |
| 160 / 180 | les trois `*SectionCard.tsx` ; `CampusCard.tsx:48` | la hauteur du visuel d'une carte de carrousel, d'une carte de liste |
| `width × 0,85` ×5, `round(width × 0,6)` ×1 | `CrousSectionCard.tsx:14`, `LibrarySectionCard.tsx:14`, `FreeRoomSectionCard.tsx:16`, `LibrarySection.tsx:16`, `FreeRoomSection.tsx:16` ; `BdeSection.tsx:20` | les largeurs de carte, figées à l'import du module (`Dimensions.get` : 12 sites) |
| 0,7 ×7 · 0,8 ×5 · 0,85 ×3 · 0,9 ×2 · 1 ×1 | 18 sites ; **91 autres `TouchableOpacity` au défaut 0,2** | l'opacité d'appui |
| 12 ×8 · 8 ×5 · `space.sm` ×2 · un objet ×1 | 16 `hitSlop` dans 11 fichiers | les cibles tactiles agrandies |
| 9 / 34 / 46 / 97 / 100 % ; 4 000 / 18 000 / 3 000 / 24 000 / 420 ms | `ScolariteLoadingScreen.tsx:61-67` | les paliers du parcours froid |
| 10 pt ; 60 pt ou 500 pt/s | `glissementDOnglets.tsx:28` ; `directionDuGlissement.ts:12-14` | le glissement sur la barre |
| 50 % · 1 000 ms | `impressions.ts:30` | une impression d'annonce |

## 3. Les attentes et les états, et qui les consomme

```bash
grep -rn "<LoadingState\|<ChargementPleinePage\|<ActivityIndicator\|<EmptyState\|<SourceFailureNotice\|<ScreenState\|RefreshControl\|<Card\b" src App.tsx --include='*.tsx'
```

| Composant | Usages | Où |
|---|---:|---|
| `LoadingState` (dans le flux, rien avant 300 ms) | 7 | les 4 sections du tableau de bord, `LibraryDetailsComponents`, `StepGroupes`, `WelcomeSteps` |
| `ChargementPleinePage` (plein écran, phrase obligatoire) | 6 | `CampusListLayout`, `CrousMenuScreen`, `FreeRoomDetailsScreen`, `ScheduleListEtats`, `GroupSelectionScreen`, `WebBrowserScreen` |
| `ActivityIndicator` posé à la main, **sans seuil** | 6 | `Button` (synchro), `TuileScolarite`, `WidgetRow`, `LienEdtForm`, `ScolariteLoginView`, `DocumentViewerScreen` (le seul plein écran sans le seuil) |
| `EmptyState` | 12 | dont 2 blocs de vide **maison** qui ne l'emploient pas : `LibraryDetailsComponents.tsx:181-200` (« fermé »), `FreeRoomDetailsComponents.tsx:140-143` (« aucune salle ») |
| `SourceFailureNotice` | 7 | 5 directs + 2 par l'alias `CampusFailureNotice` |
| `ScreenState` | 8 | dont `ChargementPleinePage` ; 10 autres fichiers n'en importent que les constantes |
| `RefreshControl` | **1** | `CampusDashboard.tsx:74` (spinner système) ; 2 `onRefresh` natifs de liste ailleurs |
| `Card` (le seul reflux animé) | 5 | `BdeAnnonceCard`, `CampusCard` (rendu 3 fois), les trois `*SectionCard` ; **aucun** ne passe `animated={false}` |
| `ApparitionEnFondu` | 6 | dont `ScheduleList` à chaque jour affiché, `TuileScolarite`, `WidgetRow` |

Deux états d'échec **n'existent pas** : la fiche d'un bâtiment (`useFreeRoomsData` ne porte pas de
`failure` ; une source injoignable rend toutes les salles libres, [defauts-fonctionnels.md](defauts-fonctionnels.md))
et le lecteur de document en panne de rendu se dit par un repli, pas par une famille d'échec.

## 4. Écran par écran

Une ligne par écran : le moteur de l'en-tête, comment il attend, comment son contenu entre, si sa
hauteur tient, ce qu'il a d'haptique. Le détail de chaque saut est dans la section 5 pour l'écran
fondateur et dans la section 6 pour les divergences ; le reste vit dans les grilles de lecture qui ont
produit ce tableau, et ne se recopie pas.

| Écran | En-tête | Attente | Vide | Erreur | Entrée du contenu | Image | Hauteur stable | Haptique |
|---|---|---|---|---|---|---|---|---|
| **Planning** (onglet) | dans le flux (`DayViewHeader`), + `withHeaderAnimation` legacy sur une pile sans en-tête | `ChargementPleinePage`, seuil 300 ms | `EmptyState` ×2 | `SourceFailureNotice` | `ApparitionEnFondu` à chaque jour ; deux fondus successifs | — | non : bandeaux insérés, « + » qui arrive, ruban recalé à 50 ms, pliage en semaine | aucune |
| **Campus** (onglet, fondateur) | maison legacy, `useNativeDriver: true`, inset iOS | `LoadingState` ×4, seuil 300 ms | section qui **disparaît** (annonces) ou une ligne | une ligne `CampusNotice` | brutale par section ; `Card` `FadeIn` + image 200 ms **empilés** | `expo-image`, gris puis fondu, sans placeholder | **non** (section 5) | aucune |
| **Scolarité** (onglet) | deux moteurs : titre flottant legacy, ou en-tête dans le flux selon l'état | plein écran centré, encart, ou par tuile sans seuil | `EmptyState` | `SourceFailureNotice` en carte, deux mots par tuile | brutale ; valeurs en `ApparitionEnFondu` | `expo-image` (logo), `opacity: 0` puis 1 à la mesure | non, à sept niveaux | aucune |
| **Réglages** (onglet) | maison legacy, `useNativeDriver: true`, `+ 60` | un indicateur dans une rangée, sans seuil | aucun | toasts | brutale ; une `LayoutAnimation` sur un seul commit | — | non : la section Calendrier change de forme après le montage | interrupteurs, curseur |
| Restaurants, BU, salles (listes) | `withHeaderAnimation` legacy, JS | `ChargementPleinePage` plein écran, sans patience | `EmptyState` plain | `SourceFailureNotice` plain | brutale ; `Card` + image empilés ; retri après le premier rendu | `expo-image` 180 pt, gris puis fondu | non : ancre d'attente ≠ liste ; barre de recherche qui paraît avec le contenu | aucune |
| Annonces (grille) | idem | idem | `EmptyState` plain | idem | idem, copie floutée sans transition sous l'affiche | `expo-image` ×2 par carte, 1:1 | non | aucune |
| Fiche restaurant | statique, titre à opacité 1 fixe ; bandeau `+ 65` | plein écran, remplace tout | `EmptyState` + un `Text` maison | `SourceFailureNotice` plain | brutale ; ruban recalé à 100 ms | WebView de carte, gris puis tuiles | non : attente à +118, contenu à +65 | aucune |
| Fiche bibliothèque | idem | `LoadingState` dans le flux, sous un titre | bloc **maison** « fermé » | `SourceFailureNotice` **en carte** (la seule) | brutale ; ruban peint vide puis rempli | idem | non : quatre hauteurs sur la zone horaires | aucune |
| Fiche bâtiment | idem, geste iOS | plein écran, remplace tout | `EmptyState` (fermé) + `Text` maison | **aucun** | brutale ; un rendu « (0) » précède la liste ; fermeture décidée après `loading` | idem | non | aucune |
| Fiche annonce | `withHeaderAnimation` legacy, `+ 70` recopié | aucune (paramètres) | `null` sans annonce | aucun (repli d'image = gris cliquable) | brutale ; images en fondu, N cadres qui changent de ratio | `expo-image`, cadre carré puis au ratio à `onLoad` | non | aucune |
| Recherche de groupes | statique, `scrollY` écrit et jamais lu ; bande `+ 65` | plein écran, avec patience | `EmptyState` | toasts ; sans cache l'attente ne finit pas | brutale ; fond qui change de couleur | — | non | aucune |
| Planning d'un groupe, Jour | `withHeaderAnimation` legacy ; vide de 70 pt dans le flux | comme l'onglet | comme l'onglet | comme l'onglet | comme l'onglet | — | non | aucune |
| Fiche de cours | statique, `withStaticHeader` | aucune | aucun | toasts | brutale ; carte posée après le montage, bouton qui disparaît | WebView | non | aucune |
| Lien d'emploi du temps | statique | dans le bouton | aucun | ligne de verdict | brutale | — | non | aucune |
| Compte | `withHeaderAnimation` legacy sur deux vues | barre de progression sans seuil | formulaire | `SourceFailureNotice` en carte, plain, ligne | brutale : trois rendus qui se remplacent, à 62 pt d'écart | `expo-image` (logo) | non | aucune |
| Documents | `withHeaderAnimation` legacy | aucune (synchrone) | `EmptyState` card | toasts | brutale ; un rendu vide précède la liste | — | non | aucune |
| Lecteur de document | statique, bandeau maison | indicateur **sans seuil**, absolu | aucun | `EmptyState` centré (le seul centré du dépôt) | brutale ; WebView recréée par stratégie | WebView | **oui** (boîte fixe) | aucune |
| Navigateur intégré | aucun ; barre flottante Reanimated | plein écran, **monté deux fois** | aucun | aucun (page native) | brutale | WebView | oui (boîte) | aucune |
| À propos | `withHeaderAnimation`, `+ 50` qui écrase `+ 70` | aucune | aucun | aucun | statique | `Image` RN local | **oui** | aucune |
| Filtres d'UE | `withHeaderAnimation` | aucune | rangée `NO_FILTER` | aucun | brutale à chaque frappe | — | non | aucune |
| Calendriers du téléphone | `withHeaderAnimation` | **rien** (`null`) puis tout | rangée | carte permission | brutale, liste relue à chaque focus | — | non | interrupteurs |
| Accueil | aucun ; bouton retour à `opacity` sec | `LoadingState` ×2, barre du parcours froid | pied de liste | `SourceFailureNotice` card | `LayoutAnimation` à chaque étape ; sortie vers la navigation **sans** adoucissement | `Image` RN, `expo-image` (logo) | non : chaque étape a son dégagement (96, 118, 64) | aucune |
| Barre d'onglets | — | — | — | — | contenu du bouton d'action remplacé sec ; onglet monté à son premier focus sous `shift` | — | **oui** (75) | aucune |
| En-têtes poussés | legacy, JS ; titre lié à une valeur neuve puis reposé à 50 ms | — | — | — | — | — | oui | aucune |
| Modales (12) | — | aucune | — | — | `fade` natif ; `ChoixEtablissement` change de contenu dans sa boîte | — | non pour trois d'entre elles | aucune |
| Bandeau de service | absolu, `zIndex` 900 | — | — | — | entrée legacy 200 ms, **aucune sortie** | — | 1 ou 2 lignes | aucune |
| Splash | — | voile blanc 1 000 ms, du blanc vers le noir en thème sombre | — | — | tout rend d'un coup sous le voile | deux images qui se succèdent | oui | — |
| Menu de développement | déplaçable, `PanResponder` | textes | textes | textes | deux arbres sans transition ; re-rendu chaque seconde | `Image` RN | non | aucune |

## 5. Le tableau de bord Campus : ce qui saute

La lecture du code donne treize faits ; la vidéo de l'iPhone 13 Pro prise le 2026-09-26 à 19 h 31 en
confirme l'essentiel et en ajoute un que le code seul ne montrait pas.

**Sur l'appareil, image par image (quatre par seconde).** À l'ouverture de l'onglet, les quatre
en-têtes de section sont **seuls**, sans indicateur — le seuil de 300 ms. Un quart de seconde plus
tard, la carte des **salles libres** paraît la **première**, tout en bas : elle vient du cache de sept
jours, les autres attendent le réseau. Un quart de seconde encore, les annonces et les restaurants
arrivent au-dessus d'elle et la **poussent hors de l'écran** : ce que l'utilisateur venait de voir a
disparu. Le remplissage complet tient en une demi-seconde, et pendant cette demi-seconde rien n'a la
hauteur qu'il aura.

**Dans le code :**

1. Chaque section remplace un indicateur d'environ 84 points (`ActivityIndicator` + deux marges `xl`)
   par un carrousel d'environ 285 (visuel 160, titre, deux lignes, rembourrage `md`, pied `lg`) par un
   ternaire, sans transition — `BdeSection.tsx:56-70`, `CrousSection.tsx:76-92`,
   `LibrarySection.tsx:76-92`, `FreeRoomSection.tsx:113-126`.
2. Les quatre sections basculent à quatre instants : les annonces dès le montage
   (`useBdeAnnonces.ts:46-53`), les trois autres après la position — permission puis GPS
   (`useCrousRestaurants.ts:49`, `useNearbyLibraries.ts:54`, `FreeRoomSection.tsx:42`,
   `useCampusLocation.ts:30-44`) —, les salles avant les autres quand leur cache est chaud
   (`FreeRoomSection.tsx:47-57`).
3. Rien pendant les 300 premières millisecondes de chaque section : `LoadingState` rend `null` avant le
   seuil (`LoadingState.tsx:38-39`) ; l'en-tête de section reste seul.
4. La section Annonces **disparaît** quand la réponse est vide : `return null` (`BdeSection.tsx:36`) ;
   tout ce qui est dessous remonte.
5. Une panne remplace le carrousel par une ligne `CampusNotice` d'environ 36 points
   (`SectionEtatVide.tsx:49-60`, `CampusLayoutComponents.tsx:330-341`).
6. Le bandeau de couverture partielle des bibliothèques s'insère entre l'en-tête et le carrousel
   après le chargement (`LibrarySection.tsx:74`).
7. Les cartes se retrient **après** le premier rendu : les favoris sont relus à chaque focus
   (`useFavorites.ts:8-22`), puis triés en tête (`CrousSection.tsx:43-49`, `LibrarySection.tsx:45-51`,
   `FreeRoomSection.tsx:84-92`) ; le filtre est relu de même et refiltre (`useSavedFilter.ts:19-29`).
8. Chaque retri est un reflux animé par le ressort de `Card` (`LinearTransition.springify()`,
   `Card.tsx:58`), rejoué à chaque retour sur l'onglet.
9. Deux fondus sur les mêmes pixels de chaque carte : le `FadeIn` de `Card` et la transition de
   200 ms de l'image (`VisuelAvecRepli.tsx:56`, `BdeAnnonceCard.tsx:79`) — ce
   qu'[`ApparitionEnFondu.tsx:33-35`](../src/shared/ui/ApparitionEnFondu.tsx) nomme.
10. L'image passe du gris du conteneur à l'image en 200 ms ; en échec, du gris au repli
    `default_resto.png` **sans** transition, après un ou deux essais d'adresse
    (`VisuelAvecRepli.tsx:49`, `useSourceRendue.ts:46`).
11. Les affluences des bibliothèques arrivent dans un second temps : la rangée d'état gagne une jauge
    et un pourcentage, et le filtre « ouvertes » retire alors des cartes déjà affichées
    (`useNearbyLibraries.ts:77-96`, `CampusCardParts.tsx:154-171`, `LibrarySection.tsx:39-43`).
12. Un tirer qui échoue vide la liste des annonces, des restaurants et des bibliothèques
    (`useBdeAnnonces.ts:60`, `useCrousRestaurants.ts:64`, `useNearbyLibraries.ts:67`) : le carrousel
    cède à une ligne ; seules les salles gardent leur cache (`FreeRoomSection.tsx:57`).
13. Sur iOS, le titre est invisible tant que `scrollY` n'a pas quitté `reposY = −hauteurEnTete`
    (`CampusDashboard.tsx:41-47, 70`) ; l'en-tête, le défilement et le `RefreshControl` sont en
    `Animated` legacy avec un inset de contenu calé sur appareil le 2026-09-03 (`:32-39`).

Les mesures de hauteur ci-dessus sont des lectures, pas des relevés d'appareil : les cartes n'exposent
que leur largeur, et leur hauteur dépend de la police du système et de la taille de texte réglée.

## 6. Les divergences mesurées

### 6.1 Trois hauteurs d'en-tête, quatre compensations

`HEADER_OFFSET` vaut 70 ([`ScreenState.tsx:58`](../src/shared/ui/ScreenState.tsx)) et
[`NavHelpers.tsx:304, 315`](../src/shared/navigation/NavHelpers.tsx) l'écrit en littéral sans l'importer.
Les trois en-têtes d'onglet réservent **60** (`CampusDashboard.tsx:19`, `ScolariteDashboard.tsx:311`,
`SettingsScreen.tsx:392`). Quatre bandeaux dans le flux posent **65** (`CrousDateHeader.tsx:41`,
`LibraryDetailsComponents.tsx:78`, `FreeRoomDetailsComponents.tsx:23`, `GroupSelectionScreen.tsx:361`).
`AboutScreen.tsx:146` pose **50** par-dessus le `headerPadding` reçu, et `BdeDetailsScreen.tsx:157`
recopie **70** au lieu de lire la prop. Un même écran d'attente, ancré à `+ 70 + 48`, ne tombe donc
jamais là où son contenu commencera.

### 6.2 Deux seuils et deux moteurs pour le même fondu de titre

Les onze écrans poussés effacent leur titre sur **60** points, sur le thread JS (`useNativeDriver: false`,
`NavHelpers.tsx:38, 300`) ; les trois onglets sur **50**, en natif (`useNativeDriver: true`). Le titre
poussé est d'abord lié à une `new Animated.Value(0)` (`NavHelpers.tsx:34`), puis reposé 50 ms après le
montage par `setParams({ animatedReady: true })` (`:287-289`) : chaque en-tête est rendu deux fois.
`GroupSelectionScreen` écrit un `scrollY` que son en-tête ne lit jamais (`:317-320`, `:74`).

### 6.3 Deux durées pour la même couture

`Card` entre en `FadeIn` **sans durée** (le défaut de Reanimated, `Card.tsx:58`) ;
`ApparitionEnFondu` fixe 200 ms (`:61`), la même valeur que la transition des images. Sur une carte à
image, les deux jouent sur les mêmes pixels (5.9).

### 6.4 Deux clés pour un même fond

`theme.background` et `theme.courseBackground` valent la même couleur dans les deux thèmes
(`palettes.ts:43, 55` ; `Theme.ts:93, 416`). L'onglet Campus et la fiche d'annonce lisent la première,
les listes et les trois autres fiches la seconde. Aucun pixel ne diffère ; la clé, si.

### 6.5 Deux gabarits de vide dans le même groupe d'écrans

`EmptyState` — surface de 72, glyphe de 32, titre obligatoire — et deux blocs maison : le « fermé »
de la fiche bibliothèque (icône de 48, sans titre, `LibraryDetailsComponents.tsx:181-200`) et
l'« aucune salle » de la fiche bâtiment (un `Text` centré, `FreeRoomDetailsComponents.tsx:140-143`). Le
lecteur de document centre son repli verticalement (`DocumentViewerScreen.tsx:186-190`) là où
`ScreenState` ancre tous les autres en haut.

### 6.6 Un repli d'image sans transition, une image avec

`VisuelAvecRepli.tsx:49` rend le repli local sec, `:56` fond l'image distante en 200 ms ; la copie
floutée d'une affiche arrive sans transition sous l'affiche qui, elle, fond (`BdeAnnonceCard.tsx:67-84`).

### 6.7 Cinq opacités d'appui, et le défaut pour les autres

0,7 · 0,8 · 0,85 · 0,9 · 1 sur 18 sites ; **91** `TouchableOpacity` gardent le 0,2 de React Native.
Aucun état pressé n'est autre chose qu'une opacité. `AboutScreen.tsx:167` pose 1 : aucun retour.

### 6.8 Quatre façons d'agrandir une cible

`hitSlop` 12 (×8), 8 (×5), `tokens.space.sm` (×2), un objet asymétrique (×1) ; 109 `TouchableOpacity`
n'en ont aucun.

### 6.9 Un indicateur sans seuil, et un seuil qui laisse un trou

Six `ActivityIndicator` posés à la main ignorent les 300 ms (section 3) ; les deux composants
d'attente les respectent, et pendant ces 300 ms `LoadingState` **ne tient pas la place**
(`LoadingState.tsx:15-17`) : l'en-tête de section reste seul, puis le bloc arrive, puis le contenu.

### 6.10 Un splash blanc dans les deux thèmes

Le voile du splash est `#ffffff` (`App.tsx:169`, `app.config.ts:25`) ; le fond sombre est `#000000` :
le fondu de sortie, 1 000 ms, va du blanc au noir. L'accueil se remplace par la navigation d'un coup,
sans l'adoucissement que ses propres étapes emploient (`rootContainer.tsx:161-165`).

### 6.11 Une entrée animée, aucune sortie

Le bandeau de service entre en 200 ms et disparaît d'un coup (`Bandeau.tsx:46-51`,
`MessagesDeServiceHote.tsx:77-85`) ; la barre flottante du navigateur disparaît sec avant l'animation
de retour de la pile (`WebBrowserScreen.tsx:109-113`).

## 7. Ce que le relevé décide

Sans opinion ajoutée, les relevés ci-dessus déterminent le contenu du jalon et ce qui va ailleurs.

| Relevé | Conséquence |
|---|---|
| 1.4 — aucune échelle de mouvement, huit durées éparses | `tokens.mouvement` ([7-I](phase-7/7-i-releve-et-vocabulaire.md)) |
| 1.4 — aucun respect de « réduire les animations » | une règle du vocabulaire, `useReducedMotion` dans tout ce qui pulse ou cascade (7-I) |
| 3 et 6.9 — l'attente dans le flux ne tient pas la place | `Squelette`, et la règle « un chargement annonce sa forme » (7-I) |
| 5.1, 5.4, 5.5 — une section change de hauteur avec sa source | `CarteEnPanne` au gabarit, section Annonces qui se replie en animant (7-I) |
| 5.2, 5.7, 5.8 — le contenu bascule à quatre instants et se retrie après coup | les données prêtes avant le rendu, la cascade d'entrée (7-I) |
| 5.9, 6.3, 6.6 — deux fondus empilés, deux durées | une seule couture par carte, `Card` lit `tokens.mouvement` (7-I) |
| 5.10 — gris puis image, sans placeholder | le blurhash des annonces (7-I) ; les lieux restent gris (limite) |
| 5.13, 6.2 — l'écran fondateur en `Animated` legacy | l'en-tête et le défilement de Campus en Reanimated (7-I) ; les onze écrans poussés et `NavHelpers` avec les lots de [7-J](phase-7/7-j-ecrans.md) |
| 6.1 — quatre compensations d'en-tête | une constante, `HEADER_OFFSET`, importée partout : Campus en 7-I, le reste écran par écran en 7-J |
| 6.4 — deux clés pour un même fond | à trancher par le lot Planning de 7-J, qui porte `courseBackground` |
| 6.5, 6.9 — vides et attentes maison | les fiches Campus, hors des trois lots de 7-J (section 8) |
| 6.7, 6.8 — états pressés et cibles | « un état pressé se voit » sur `Card` (7-I) ; le reste avec chaque écran repris |
| 6.10, 6.11 — splash, accueil, bandeau | hors 7-I ; le splash et l'accueil sont des moments de l'Épure, à ouvrir avec 7-J ou après |
| 4 — les transitions de pile par défaut | écrites comme telles dans le vocabulaire (7-I) ; rien de promis |

## 8. Les écrans que les trois lots de 7-J ne couvrent pas

Les lots de [7-J](phase-7/7-j-ecrans.md) reprennent le Planning, la Scolarité et les Réglages. Ce
relevé laisse en dehors, avec leur nombre de sauts relevés : les quatre **listes Campus** (11 à 15
chacune, la plupart partagés par `CampusListLayout`), les quatre **fiches Campus** (7 à 11), la
recherche de groupes (16), le planning d'un groupe (21), la fiche de cours (13), le lien d'emploi du
temps (10), le compte (14), les documents (6), le lecteur (5), le navigateur intégré (8), À propos (3),
les filtres (7), les calendriers du téléphone (5), l'**accueil** (18), la barre d'onglets (6), les
modales (11), le bandeau de service (7), le splash (10) et le menu de développement (12). Ce que le
vocabulaire de 7-I posera dans `shared/ui/` s'y appliquera par les composants partagés — `Card`,
`LoadingState`, `VisuelAvecRepli`, `NavHelpers` — sans qu'un lot les rouvre ; le reste demande une
session par écran, et c'est cette liste, pas une impression, qui décidera d'une extension.

## Ce que le relevé a corrigé dans la documentation

Six affirmations de trois documents en vigueur ne correspondaient plus au code ; elles sont
corrigées dans le même changement que ce relevé :

- [theme.md](theme.md) décrivait `ApparitionEnFondu` avec « un léger glissement » à deux endroits :
  c'est un fondu seul depuis 6.1-E (`ApparitionEnFondu.tsx:25-31`) ; disait « un glyphe dans un
  disque de 72 » pour l'état vide, qui est un carré arrondi `radius.lg` (`EmptyState.tsx:120-131`) ;
  affirmait que `NavHelpers` importe `HEADER_OFFSET`, qu'il recopie (`NavHelpers.tsx:304, 315`).
- [navigation.md](navigation.md) comptait « 20 écrans empilés » pour 21 routes, et disait que
  l'onglet Scolarité sans session n'affiche aucun bouton d'action, alors qu'il propose « Se
  connecter » depuis 6.1.x-B (`MainTabNavigator.tsx:238-263`).
- [donnees-et-persistance.md](donnees-et-persistance.md) citait la clé `etablissements@1` : `@4`.

## Limites de cet inventaire

- **Il compte des lignes, pas des millisecondes.** Une transition « brutale » se lit dans le code ;
  sa perception se juge sur appareil, et seule celle de l'écran fondateur l'a été.
- **Les hauteurs sont des estimations de lecture**, la police du système et la taille de texte les
  déplacent. Un squelette « au gabarit » se prouve sur les deux appareils, pas ici.
- **Les modales et le navigateur** sont relevés sans leurs pages web : ce que MapLibre ou un portail
  anime dans une `WebView` n'est pas du mouvement de l'application.
- **La date compte.** Cette photographie est celle du 2026-09-26. Elle ne se met pas à jour : le
  relevé final de [7-K](phase-7/7-k-sortie-6-3.md) se pose à côté, et se compare.
