# Navigation

UKit utilise React Navigation 7 (`@react-navigation/native`, `stack`, `material-top-tabs`). La navigation
est le squelette de l'application : l'organisation des dossiers de `src/features/` la reproduit
(voir [architecture.md](architecture.md)).

Implémentation : [`src/shared/navigation/`](../src/shared/navigation/).

## Structure

```text
RootContainer                       rootContainer.tsx
 ├─ firstload = true  → WelcomeScreen (hors navigateur)
 └─ firstload = false → NavigationContainer
      └─ CredentialsProvider        contexte Scolarité, englobe toute la pile
           └─ Stack "RootStack"     StackNavigator.tsx
                ├─ MainTabs         MainTabNavigator.tsx  (headerShown: false)
                │    ├─ PlanningTab  → Stack "PlanningStack" → ScheduleScreen
                │    ├─ CampusTab    → CampusDashboard
                │    ├─ ScolariteTab → ScolariteDashboard
                │    └─ SettingsTab  → SettingsScreen
                └─ 20 écrans empilés (détail ci-dessous)
```

Deux points à connaître avant de toucher à cette structure :

- **`CredentialsProvider` englobe la pile entière**, pas seulement l'onglet Scolarité. C'est
  volontaire : la session universitaire démarre au lancement de l'application, et la barre d'onglets
  personnalisée lit `useCredentials()` pour décider d'afficher le bouton de déconnexion. Déplacer ce
  provider casserait les deux comportements.
- **`PlanningTab` est un navigateur de pile à un seul écran.** Cette pile imbriquée existe pour que
  l'onglet Planning dispose de sa propre gestion d'en-tête ; `ScheduleScreen` désactive l'en-tête et
  `DayView` rend son propre bandeau collant avec la zone sûre.

## Les onglets

Définis dans [`MainTabNavigator.tsx`](../src/shared/navigation/MainTabNavigator.tsx).

| Route | Écran | Libellé | Icône |
|---|---|---|---|
| `PlanningTab` | `PlanningStackScreen` → [`ScheduleScreen`](../src/features/Planning/screens/ScheduleScreen.tsx) | `MY_PLANNING` | `calendar-month-outline` |
| `CampusTab` | [`CampusDashboard`](../src/features/Campus/Dashboard/CampusDashboard.tsx) | `CAMPUS` | `domain` |
| `ScolariteTab` | [`ScolariteDashboard`](../src/features/Scolarite/screens/ScolariteDashboard.tsx) | `SCOLARITY` | `toolbox-outline` |
| `SettingsTab` | [`SettingsScreen`](../src/features/Settings/screens/SettingsScreen.tsx) | `SETTINGS` | `cog-outline` |

### Les quatre onglets sont un pager

Depuis le jalon [6.1-E](phase-6/6-1-e-finitions-interface.md), le navigateur d'onglets est un
`createMaterialTopTabNavigator` posé **en bas** (`tabBarPosition: 'bottom'`), et non plus un
`createBottomTabNavigator`. Ce n'est pas un changement d'apparence — la barre est la même, et elle est
rendue en absolu, donc elle survole le pager comme elle survolait le conteneur d'onglets — c'est un
changement de **geste** : on passe d'un onglet à l'autre au doigt.

**Le glissement est accordé sur les quatre onglets**, et ce n'est pas la première version. Il n'était
d'abord ouvert qu'à la Scolarité et aux Réglages, par prudence : le Planning et le Campus portent des
gestes horizontaux — le ruban des jours, le carrousel des cours simultanés, les quatre carrousels du
tableau de bord — et un pager par-dessus semblait devoir leur voler le doigt. La vérification sur
appareil a montré que non : **une liste horizontale consomme le geste qui commence sur elle**, et le
pager ne reçoit que ce qu'elle laisse passer.

Restreindre coûtait donc plus que ça ne protégeait : un geste qui marche sur deux onglets sur quatre
s'apprend comme un défaut, pas comme une règle — on ne devine pas où il s'arrête.

L'option reste lue sur l'écran **focalisé** (`swipeEnabled`), donc un retrait se fait écran par écran,
en une ligne, si un conflit se constate.

Trois réglages du navigateur ne sont pas décoratifs :

- **`animationEnabled: false`.** Animé, un appui d'onglet fait *traverser* les pages intermédiaires
  au pager — et comme `lazy` ne les a pas montées, on verrait deux fonds vides défiler pour un seul
  appui. Le glissement au doigt, lui, reste animé nativement : c'est le geste qui porte l'animation.
- **`lazy: true`**, qui reproduit le montage paresseux d'avant : un onglet ne se monte qu'à sa
  première ouverture.
- **`overScrollMode: 'never'`**, sans quoi Android dessine une lueur dès qu'on glisse au-delà du
  dernier onglet.

Ce que la bascule coûte, et qui est écrit ici pour ne pas être découvert : il n'y a **plus de
détachement natif** des écrans inactifs (`freezeOnBlur` n'existe pas sur ce navigateur, les pages
restent attachées au pager). L'arbre React, lui, restait monté de toute façon. Et **la première
traversée par glissement monte la page voisine pendant le geste** : on peut voir le fond une fraction
de seconde. `lazyPreloadDistance` la supprimerait, au prix de monter Campus dès le lancement — refusé.

`react-native-pager-view` est un **module natif** : un build de développement antérieur à ce jalon ne
le porte pas ([plateforme.md](plateforme.md)).

> **Capture attendue** — `navigation-glissement.png` : le passage de la Scolarité aux Réglages au
> doigt, barre flottante visible.

### La barre d'onglets personnalisée

`CustomTabBar` remplace la barre native. Elle est flottante (positionnée en absolu au-dessus du
contenu), arrondie, ombrée, posée sur la **fumée** des flottants du bas
([`FondDePiedFlottant`](../src/shared/ui/PiedFlottant.tsx) — elle survole le contenu, elle parle
donc comme les pieds d'action), et **décalée sur la gauche** par une marge droite (`tokens.space.xl`)
qui libère la place d'un **bouton d'action contextuel** rendu à côté d'elle par `TabBarActionItem`
(un seul composant `BoutonDAction`, quatre contenus) :

| Onglet actif | Bouton affiché | Destination |
|---|---|---|
| `PlanningTab` | Recherche de groupes | `GroupSearch` |
| `CampusTab` | **Le bouton mystère** : contenu flouté, cadenas — le teaser des rangées Scolarité | la modale « Bientôt disponible » |
| `SettingsTab` | À propos | `About` |
| `ScolariteTab` **et session ouverte** | Compte | `CredentialsSettings` |
| `ScolariteTab` sans session | Aucun (un `View` invisible de 65 × 75 conserve la largeur) | — |

Conséquence pratique : tout écran de la pile principale doit prévoir un rembourrage bas suffisant
pour ne pas passer sous la barre. L'usage établi est `tokens.space.xxl + 80` dans
`contentContainerStyle`.

> **Capture attendue** — `navigation-tabbar.png` : la barre d'onglets flottante et son bouton d'action
> contextuel, sur l'onglet Planning.

## Les écrans empilés

Déclarés dans [`StackNavigator.tsx`](../src/shared/navigation/StackNavigator.tsx), typés par
`RootStackParamList`.

| Route | Écran | Paramètres | En-tête |
|---|---|---|---|
| `MainTabs` | `MainTabNavigator` | — | masqué |
| `GroupSearch` | [`GroupSelectionScreen`](../src/features/Planning/screens/GroupSelectionScreen.tsx) | — | `GROUPS` |
| `Group` | [`ScheduleScreen`](../src/features/Planning/screens/ScheduleScreen.tsx) | `{ name: string \| string[] }` | nom du groupe tronqué, bouton favori à droite |
| `Day` | [`DayView`](../src/features/Planning/views/DayView.tsx) | — | `DAY` |
| `Course` | [`CourseScreen`](../src/features/Planning/screens/CourseScreen.tsx) | `{ title?, data? }` | titre du cours, bouton de retrait de filtre |
| `Crous` | [`CrousScreen`](../src/features/Campus/Crous/CrousScreen.tsx) | — | `RESTAURANTS`, filtre à droite |
| `CrousMenu` | [`CrousMenuScreen`](../src/features/Campus/Crous/CrousMenuScreen.tsx) | `{ restaurantId, restaurantName, location?, openingLines? }` | `DETAILS` — comme toutes les fiches, le nom du lieu vit dans le bandeau |
| `Library` | [`LibraryScreen`](../src/features/Campus/Library/LibraryScreen.tsx) | — | `LIBRARIES`, filtre à droite |
| `LibraryDetails` | [`LibraryDetailsScreen`](../src/features/Campus/Library/LibraryDetailsScreen.tsx) | `{ library, affluence }` | nom de la BU |
| `FreeRoomScreen` | [`FreeRoomScreen`](../src/features/Campus/FreeRoom/FreeRoomScreen.tsx) | — | `FREE_ROOMS` |
| `FreeRoomDetails` | [`FreeRoomDetailsScreen`](../src/features/Campus/FreeRoom/FreeRoomDetailsScreen.tsx) | `{ building }` | `DETAILS` |
| `Bde` | [`BdeScreen`](../src/features/Campus/Bde/BdeScreen.tsx) | — | `STUDENT_LIFE` |
| `BdeDetail` | [`BdeDetailsScreen`](../src/features/Campus/Bde/BdeDetailsScreen.tsx) | `{ annonce }` | `DETAILS` |
| `WebBrowser` | [`WebBrowserScreen`](../src/features/Scolarite/screens/WebBrowserScreen.tsx) | `{ entrypoint?, href? }` | masqué (barre flottante propre) |
| `CredentialsSettings` | [`CredentialsSettingsScreen`](../src/features/Scolarite/screens/CredentialsSettingsScreen.tsx) | `{ ressaisie? }` | `ACCOUNT` |
| `Documents` | [`DocumentsScreen`](../src/features/Scolarite/screens/DocumentsScreen.tsx) | — | `MY_DOCUMENTS` |
| `Filters` | [`FiltersScreen`](../src/features/Settings/screens/FiltersScreen.tsx) | — | `FILTERS` |
| `DocumentViewer` | [`DocumentViewerScreen`](../src/features/Scolarite/screens/DocumentViewerScreen.tsx) | `{ uri, nom }` | nom de la pièce, bouton de partage — un PDF est rendu par iOS lui-même, par pdf.js sur Android |
| `LienEdt` | [`LienEdtScreen`](../src/features/Planning/screens/LienEdtScreen.tsx) | — | `TIMETABLE_LINK` |
| `Settings` | [`SettingsScreen`](../src/features/Settings/screens/SettingsScreen.tsx) | — | `SETTINGS` |
| `About` | [`AboutScreen`](../src/features/Settings/screens/AboutScreen.tsx) | — | `ABOUT` |

## Les en-têtes

Trois helpers de [`NavHelpers.tsx`](../src/shared/navigation/NavHelpers.tsx) portent toute la
cohérence visuelle des en-têtes. Ne pas configurer un en-tête à la main.

- **`NavBarHelper({ title, themeName, route, headerLeft, headerRight, gestureEnabled })`** produit les
  `StackNavigationOptions` d'un écran : titre stylé, transparence, et **animation du titre au
  défilement**. Il lit la valeur de défilement de l'écran dans le registre `globalScrollValues`,
  indexé par `route.key`. **Le titre est neutre** (`theme.font`, 2026-08-30) : le violet est la
  couleur d'action, et un titre en couleur d'action se lit comme un bouton — deux fiches
  surchargeaient d'ailleurs le leur en violet à la main, elles ne le font plus. **Toute sous-page
  défilante transmet son défilement** (`withHeaderAnimation` + `onAnimatedScroll`) : sans ça, le
  contenu passe derrière un titre qui ne s'efface jamais — c'est arrivé à l'écran des filtres à sa
  création.
- **`withHeaderAnimation(Composant)`** est le pendant côté écran. Le HOC crée une `Animated.Value`,
  l'enregistre dans `globalScrollValues[route.key]`, injecte `onAnimatedScroll` et `headerPadding`
  dans le composant, et nettoie l'entrée au démontage.
  **Pourquoi ce registre global :** React Navigation exige des paramètres de route sérialisables ; on
  ne peut pas y stocker une `Animated.Value`. Le registre la garde donc hors de la navigation, et un
  paramètre trivial (`animatedReady: true`) est posé pour forcer le recalcul des options d'en-tête.
  C'est un contournement assumé — le supprimer casserait l'animation de tous les en-têtes.
- **`withStaticHeader(Composant)`** injecte le même `headerPadding` sans logique de défilement, pour
  les écrans qui ne défilent pas. Il garantit que l'espacement sous l'en-tête reste identique
  partout.

Boutons d'en-tête réutilisables du même fichier : `SaveGroupButton` (ajout/retrait des favoris),
`FilterRemoveButton` (retrait d'un filtre UE depuis le détail d'un cours),
`BackButton` (dans [`Button.tsx`](../src/shared/ui/Button.tsx)). Le bouton retour global et le bouton
carte sont définis directement dans `StackNavigator`.

## Vérifier

- Parcourir les quatre onglets et vérifier que le bouton d'action contextuel change bien
  (groupes / à propos / déconnexion / rien).
- Ouvrir un écran de liste Campus, faire défiler : le titre doit apparaître dans l'en-tête, et
  l'icône de filtre rester alignée.
- Ouvrir `WebBrowser` et utiliser le retour matériel Android : il doit naviguer dans l'historique de
  la WebView avant de quitter l'écran.

## Limites connues

- **Le glissement entre onglets est retirable.** S'il vole un geste à un carrousel sur un appareil,
  `swipeEnabled: false` sur l'écran concerné ramène le comportement d'avant sans rien toucher
  d'autre : la barre reste la navigation de référence.
- **Des allers-retours très rapides peuvent désynchroniser la barre de la page.** Constaté sur
  appareil le 2026-09-04, en enchaînant volontairement les glissements gauche-droite : on se retrouve
  sur le Campus avec le Planning souligné. La course est **interne à la bibliothèque** — l'événement
  de sélection du pager et la mise à jour de l'état de navigation ne sont pas atomiques, et deux
  gestes qui se chevauchent peuvent laisser le second sans effet sur l'état — et elle ne se ferme pas
  proprement depuis l'application. Elle demande un enchaînement délibéré, et **un appui sur n'importe
  quel onglet resynchronise** : la barre émet alors sa propre navigation, que le pager suit.
- **`RootStackParamList` est incomplet pour deux routes.** `CrousMenu` ne déclare pas `restaurantId`
  alors que l'écran le lit et que l'appelant le passe ; `LibraryDetails` ne déclare pas `affluence`,
  dans le même cas. Le typage des paramètres est donc plus permissif que la réalité sur ces deux
  écrans.
- **`globalScrollValues` est un état module global.** Il est nettoyé au démontage, mais deux écrans
  partageant la même `route.key` (situation qui ne se produit pas aujourd'hui) entreraient en
  conflit.
- **`Day` et `Group` rendent la même vue** que l'onglet Planning avec un paramétrage différent. La
  route `Day` n'est atteinte par aucun appel de navigation dans le code actuel.
