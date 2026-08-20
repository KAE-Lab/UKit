# Navigation

UKit utilise React Navigation 7 (`@react-navigation/native`, `stack`, `bottom-tabs`). La navigation
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
                └─ 17 écrans empilés (détail ci-dessous)
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

### La barre d'onglets personnalisée

`CustomTabBar` remplace la barre native. Elle est flottante (positionnée en absolu au-dessus du
contenu), arrondie, ombrée, et **décalée sur la gauche** par une marge droite (`tokens.space.xl`) qui
libère la place d'un **bouton d'action contextuel** rendu à côté d'elle par `TabBarActionItem` :

| Onglet actif | Bouton affiché | Destination |
|---|---|---|
| `PlanningTab` | Recherche de groupes | `GroupSearch` |
| `SettingsTab` | À propos | `About` |
| `ScolariteTab` **et session ouverte** | Déconnexion | `CredentialsSettings` |
| Autre cas | Aucun (un `View` invisible de 65 × 75 conserve la largeur) | — |

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
| `CrousMenu` | [`CrousMenuScreen`](../src/features/Campus/Crous/CrousMenuScreen.tsx) | `{ restaurantId, restaurantName, location }` | nom du restaurant, bouton carte |
| `Library` | [`LibraryScreen`](../src/features/Campus/Library/LibraryScreen.tsx) | — | `LIBRARIES`, filtre à droite |
| `LibraryDetails` | [`LibraryDetailsScreen`](../src/features/Campus/Library/LibraryDetailsScreen.tsx) | `{ library, affluence }` | nom de la BU, bouton carte |
| `FreeRoomScreen` | [`FreeRoomScreen`](../src/features/Campus/FreeRoom/FreeRoomScreen.tsx) | — | `FREE_ROOMS` |
| `FreeRoomDetails` | [`FreeRoomDetailsScreen`](../src/features/Campus/FreeRoom/FreeRoomDetailsScreen.tsx) | `{ building }` | `DETAILS` |
| `Bde` | [`BdeScreen`](../src/features/Campus/Bde/BdeScreen.tsx) | — | `STUDENT_LIFE` |
| `BdeDetail` | [`BdeDetailsScreen`](../src/features/Campus/Bde/BdeDetailsScreen.tsx) | `{ annonce }` | `DETAILS` |
| `Geolocation` | [`MapScreen`](../src/shared/map/MapScreen.tsx) | `{ title?, location }` | `MAP`, transparent |
| `WebBrowser` | [`WebBrowserScreen`](../src/features/Scolarite/screens/WebBrowserScreen.tsx) | `{ entrypoint?, href? }` | masqué (barre flottante propre) |
| `CredentialsSettings` | [`CredentialsSettingsScreen`](../src/features/Scolarite/screens/CredentialsSettingsScreen.tsx) | — | `LOGOUT` |
| `Settings` | [`SettingsScreen`](../src/features/Settings/screens/SettingsScreen.tsx) | — | `SETTINGS` |
| `About` | [`AboutScreen`](../src/features/Settings/screens/AboutScreen.tsx) | — | `ABOUT` |

## Les en-têtes

Trois helpers de [`NavHelpers.tsx`](../src/shared/navigation/NavHelpers.tsx) portent toute la
cohérence visuelle des en-têtes. Ne pas configurer un en-tête à la main.

- **`NavBarHelper({ title, themeName, route, headerLeft, headerRight, gestureEnabled })`** produit les
  `StackNavigationOptions` d'un écran : titre stylé, transparence, et **animation du titre au
  défilement**. Il lit la valeur de défilement de l'écran dans le registre `globalScrollValues`,
  indexé par `route.key`.
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

- **`RootStackParamList` est incomplet pour deux routes.** `CrousMenu` ne déclare pas `restaurantId`
  alors que l'écran le lit et que l'appelant le passe ; `LibraryDetails` ne déclare pas `affluence`,
  dans le même cas. Le typage des paramètres est donc plus permissif que la réalité sur ces deux
  écrans.
- **`globalScrollValues` est un état module global.** Il est nettoyé au démontage, mais deux écrans
  partageant la même `route.key` (situation qui ne se produit pas aujourd'hui) entreraient en
  conflit.
- **`Day` et `Group` rendent la même vue** que l'onglet Planning avec un paramétrage différent. La
  route `Day` n'est atteinte par aucun appel de navigation dans le code actuel.
