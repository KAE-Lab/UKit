---
paths:
  - "src/shared/navigation/**"
  - "src/**/screens/**/*.tsx"
  - "src/**/*Dashboard.tsx"
---
# Navigation

- `CredentialsProvider` reste dans `rootContainer`, au-dessus de l'accueil ET de `NavigationContainer` : la session démarre au lancement et la barre d'onglets lit `useCredentials()`. `PropositionsModal` et les messages de service sont rendus à la racine.
- L'accueil est rendu À LA PLACE du `NavigationContainer` tant que `isFirstLoad()` : ni pile, ni geste retour ; un formulaire y est rendu en place (nulle part où pousser un écran).
- Le fond du `NavigationContainer` suit `theme.background` (pas de flash blanc au changement de thème).
- Aucun en-tête configuré à la main : `NavBarHelper` + `withHeaderAnimation` ou `withStaticHeader` ; titre en `theme.font` (le violet est la couleur d'action). `navigation.setOptions({ headerRight })` écrase `NavBarHelper` ; boutons d'en-tête = `shared/ui/HeaderButton`. Toute sous-page défilante transmet son défilement (`onAnimatedScroll`).
- `globalScrollValues` (par `route.key`) et `animatedReady: true` contournent l'obligation de paramètres de route sérialisables : ne pas les supprimer, deux écrans de même `route.key` entreraient en conflit.
- Onglets = `createBottomTabNavigator` + `CustomTabBar` flottante ; tout écran de pile garde un rembourrage bas (`TAB_BAR_HEIGHT`). Le geste entre onglets vit sur la barre (`useGlissementDeBarre`) : ni pager, ni `Pan` par page. Garder le `screenListeners` de `MainTabNavigator` : il compte `onglet.vu` à chaque `focus`.
- Les onglets ne se démontent jamais : toute lecture au montage se périme. Relire au focus ou au VRAI retour au premier plan (`shared/services/premierPlan.ts` : `active` est aussi émis par le centre de contrôle et Face ID).
- Aucun lien web ne part dans le navigateur du système : `navigate('WebBrowser', { href })`, sauf le bouton explicite de `WebBrowserScreen`. Partent au système : `mailto`, `tel`, le plan (`lienVersLePlan`), le lien du magasin, et le don (décision `dons-helloasso`). `AboutScreen` ouvre encore ses liens au système : écart inscrit dans `docs/defauts-fonctionnels.md`. `domainesInternes` seulement pour le formulaire de retours. Retour matériel Android = historique de la WebView d'abord.
- Nouvel écran : `features/<Domaine>/screens/`, route dans `RootStackParamList` + `Stack.Screen` avec `NavBarHelper`, titre dans les trois dictionnaires, recette d'écran (règle `ui-theme`).
- Les transitions sont celles de la pile `@react-navigation/stack` (JavaScript) ; rien de promis au-delà.
