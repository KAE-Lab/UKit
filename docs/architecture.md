# Architecture

Point de vérité principal : le [README](../README.md) à la racine. Ce dossier `docs/` en détaille les
parties. Ce document décrit **comment le code est organisé et pourquoi**.

## Le principe directeur

UKit est découpé **par domaine de navigation**, pas par type technique. Un onglet de l'application
correspond à un dossier de [`src/features/`](../src/features/), et ce dossier contient tout ce dont
l'onglet a besoin : ses écrans, ses composants, ses hooks, ses services distants. Ce qui est
réellement partagé — et seulement cela — vit dans [`src/shared/`](../src/shared/).

La conséquence pratique : pour reprendre une fonctionnalité, on ouvre un seul dossier. Pour en
supprimer une, on supprime un seul dossier. Les dépendances croisées entre features sont
l'exception (une seule aujourd'hui, documentée plus bas).

```text
src/
  features/
    Planning/       emploi du temps : jour, semaine, groupes, cours, filtres UE
      components/   composants d'affichage propres au planning
      screens/      écrans routés
      services/     accès Celcat + cache de la liste des groupes
      views/        DayView, la vue composite qui orchestre l'onglet
    Campus/         vie de campus : dashboard + quatre sous-domaines
      components/   socle de liste partagé par les sous-domaines
      hooks/        géolocalisation, favoris, filtres persistés
      services/     Celcat salles, CROUS, bibliothèques, BDE, salles libres
      Dashboard/    l'écran d'accueil de l'onglet et ses sections
      Crous/  Library/  FreeRoom/  Bde/     un dossier par sous-domaine
    Scolarite/      session universitaire : login CAS, données étudiant, messagerie
      components/   session WebView cachée, vues de login, cartes
      screens/      dashboard, réglages du compte, navigateur intégré
      services/     contexte de session (état + orchestration)
    Settings/       réglages, synchronisation calendrier, notifications, à propos
    Onboarding/     parcours de premier lancement
  shared/
    aetherius/      le moteur : façade, registre, secrets, modèle d'erreur, et leurs tests
    supabase/       la base de publication : client anonyme et types du schéma
    constants/      URLs externes centralisées
    i18n/           Translator + dictionnaires fr / en / es
    map/            écran carte (Leaflet + OpenStreetMap en WebView)
    navigation/     conteneur racine, navigateurs, helpers d'en-tête
    services/       AppCore (contexte + réglages), notifications, SecureStore, mock temporel
    theme/          tokens de design et thèmes clair / sombre
    ui/             composants atomiques (boutons, alertes, barre de statut, menu dev)
    utils/          utilitaires de formatage
assets/
  locations.json    coordonnées et métadonnées des bâtiments du campus
  icons/  images/   icône, logo, splash, visuel de repli
```

## Les couches

1. **Configuration et amorçage** — [`app.config.ts`](../app.config.ts) (identité, permissions,
   plugins Expo) et [`App.tsx`](../App.tsx) (chargement des ressources puis rendu). Voir
   [plateforme.md](plateforme.md).
2. **Socle transverse** — [`src/shared/`](../src/shared/) : thème, i18n, navigation, réglages,
   persistance, cartographie. Aucune de ces briques ne connaît une feature en particulier, à
   l'exception documentée d'`AppCore`.
3. **Features** — [`src/features/`](../src/features/) : chaque domaine est autonome. Un écran
   consomme un hook ou un service du même dossier, jamais le service d'une autre feature.
4. **Services distants** — la seule couche qui parle au réseau. Une feature ne fait jamais d'appel
   HTTP depuis un composant : tout passe par un service, ce qui rend la surface externe
   inventoriable en un seul endroit ([sources-externes.md](sources-externes.md)).
5. **Le moteur** — [`shared/aetherius/`](../src/shared/aetherius/) : depuis la
   [Phase 6](phase-6/README.md), un service n'émet plus de requête lui-même. Il demande au registre
   le [Blueprint](blueprints.md) correspondant à l'appel, le fait jouer, et travaille la donnée
   reçue. Ce qui reste du service est ce qui doit y rester : le cache, les conversions, le calcul,
   la traduction d'un échec en écran.

## Séquence de démarrage

Décrite par [`App.tsx`](../App.tsx), dans cet ordre exact :

1. `SplashScreen.preventAutoHideAsync()` est appelé **au niveau module**, avant tout rendu, pour que
   le splash natif reste affiché pendant la préparation.
2. `AnimatedAppLoader` prépare en parallèle : la police `Montserrat_500Medium`, le préchargement des
   images et des jeux d'icônes vectorielles, puis — séquentiellement —
   `PlanningDataManager.loadData()`, `CampusDataManager.loadData()`, `SettingsManager.loadSettings()`.
3. Une fois prêt, `AnimatedSplashScreen` recouvre l'application d'une image identique au splash natif
   et la fait disparaître en fondu sur 1 s. C'est ce qui évite le clignotement entre splash natif et
   premier écran.
4. [`RootContainer`](../src/shared/navigation/rootContainer.tsx) s'abonne aux événements de
   `SettingsManager` (thème, groupes favoris, langue, filtres, premier lancement), publie l'état dans
   `AppContext`, et rend soit l'[onboarding](features/onboarding.md) si `firstload` est vrai, soit le
   `NavigationContainer`.

Conséquence à connaître : **les données de démarrage sont chargées avant le premier rendu**. Un écran
peut donc supposer que `SettingsManager` et les managers de listes sont déjà peuplés. En contrepartie,
un `loadData()` lent retarde l'apparition de l'application.

Le coût est réel, et il est **proportionnel à la latence du réseau** quand les caches ont expiré. Les
deux `loadData()` retombent sur le réseau au-delà de sept jours de cache — liste des groupes Celcat
pour l'un, liste des bâtiments pour l'autre — et ils sont `await`és **l'un après l'autre**, donc
leurs latences s'additionnent avant le premier pixel. Sur une connexion lente, un démarrage à cache
froid attend deux allers-retours en série, puis le fondu d'une seconde par-dessus.

Le socle a pourtant tout ce qu'il faut pour ne pas payer ça : les deux managers sont observables et
persistent leur état. Rendre depuis le cache et rafraîchir en arrière-plan rendrait le démarrage
indépendant du réseau. Ce n'est pas fait, ce n'est pas un défaut de la [Phase 6](phase-6/README.md),
et c'est un chantier à part entière — il change la garantie que les écrans tiennent aujourd'hui pour
acquise (« les managers sont déjà peuplés »), donc il se traite avec eux, pas à côté.

La seconde cause de lenteur au démarrage est indépendante de celle-ci et vit ailleurs : la session
universitaire démarre elle aussi à chaque lancement
([features/scolarite.md](features/scolarite.md#limites-connues)).

## Diffusion de l'état

Deux mécanismes coexistent, chacun avec son rôle :

- **`AppContext`** ([`AppCore.tsx`](../src/shared/services/AppCore.tsx)) diffuse aux écrans le nom du
  thème, les groupes favoris et les filtres. C'est un contexte React ordinaire, alimenté par
  `RootContainer`.
- **Les managers observables** (`SettingsManager`, `PlanningDataManager`, `CampusDataManager`) sont
  des singletons avec un mini bus d'événements `on` / `unsubscribe` / `notify`. Ils survivent aux
  démontages d'écrans et persistent eux-mêmes leur état.

Ce couple est délibéré : le contexte sert le rendu, les managers servent la persistance et les
consommateurs hors React (tâche de fond, planificateur de notifications). Détail complet dans
[donnees-et-persistance.md](donnees-et-persistance.md).

## Invariants

- **Un fichier de logique reste sous 400 lignes**, une fonction sous 100 lignes, la profondeur
  d'imbrication sous 4, la complexité cyclomatique sous 15. Ces seuils sont appliqués par
  [`eslint.config.mjs`](../eslint.config.mjs) : ce sont des garde-fous d'architecture, pas du confort.
  Au-delà, on découpe en sous-modules. Seul [`Theme.ts`](../src/shared/theme/Theme.ts) déroge
  explicitement (`eslint-disable max-lines`) : c'est un fichier de données de style, le découper
  nuirait à la lisibilité.
- **100 % TypeScript.** Aucun `.js` ou `.jsx` dans `src/`. Pas de `any` sans justification. À noter :
  [`tsconfig.json`](../tsconfig.json) étend `expo/tsconfig.base` **sans activer `strict`** — le
  typage est donc systématique par discipline, pas par contrainte du compilateur
  ([qualite.md](qualite.md)).
- **Aucune chaîne visible en dur** : tout passe par `Translator` ([i18n.md](i18n.md)).
- **Aucune valeur de style en dur** : tout passe par les tokens ([theme.md](theme.md)).
- **Aucune dépendance cartographique propriétaire** : les cartes sont rendues par Leaflet et
  OpenStreetMap dans une WebView ([cartographie.md](cartographie.md)).
- **Le réseau est confiné aux services.** Un composant n'appelle jamais `axios` ni `fetch`
  directement. Deux écarts subsistent et sont documentés là où ils vivent :
  [`AppUI.tsx`](../src/shared/ui/AppUI.tsx) interroge le fichier de version distant
  ([plateforme.md](plateforme.md)), et [`ScheduleList.tsx`](../src/features/Planning/components/ScheduleList.tsx)
  importe `axios` pour un jeton d'annulation ([features/planning.md](features/planning.md)).
- **Les services distants échouent en silence utile** : ils renvoient `null` ou `[]` plutôt que de
  propager une exception. C'est un choix assumé (l'application reste utilisable hors ligne grâce au
  cache) dont la contrepartie est qu'une erreur réseau et une réponse vide sont indistinguables côté
  appelant. Voir [sources-externes.md](sources-externes.md).
  **Cet invariant est en cours de remplacement** par la [Phase 6](phase-6/README.md) : un échec est
  désormais typé et rangé dans une famille d'écran, et une liste vide redevient une liste vide. Il
  disparaîtra du document quand la dernière source aura migré ([blueprints.md](blueprints.md)).
  Première source sortie : `BdeService` ([6-A](phase-6/6-a-socle.md)).
- **Le comportement distant est de la donnée.** Ce qu'on demande à une source et ce qu'on en retient
  vit dans [`blueprints/`](../blueprints/), pas dans le binaire — donc corrigeable sans release. Le
  calcul, le cache, l'internationalisation et l'heure courante n'y descendent jamais
  ([blueprints.md](blueprints.md)).

## Dépendances entre features

Une seule dépendance croisée existe, et elle est volontaire :

- [`AppCore.tsx`](../src/shared/services/AppCore.tsx) importe `PlanningApiService` pour la
  synchronisation du calendrier système et la tâche de fond. La synchronisation est un réglage
  global, pas une fonctionnalité du planning, mais elle a besoin des événements du planning.
- [`NotificationService.ts`](../src/shared/services/NotificationService.ts) importe les types du
  planning pour la même raison.

Toute autre dépendance croisée entre deux dossiers de `features/` est à éviter : passer par
`shared/` ou par les paramètres de navigation.

## Carte des fichiers du socle

Les fichiers de `src/features/` sont recensés par la documentation de leur feature. Voici ceux de la
racine et de [`src/shared/`](../src/shared/).

| Fichier | Rôle |
|---|---|
| [`App.tsx`](../App.tsx) | point d'entrée : préchargement des ressources, chargement des managers, splash animé |
| [`app.config.ts`](../app.config.ts) | configuration Expo ([plateforme.md](plateforme.md)) |
| [`shared/navigation/rootContainer.tsx`](../src/shared/navigation/rootContainer.tsx) | conteneur racine : abonnements aux réglages, `AppContext`, aiguillage onboarding / navigation |
| [`shared/navigation/StackNavigator.tsx`](../src/shared/navigation/StackNavigator.tsx) | pile principale, `RootStackParamList`, en-têtes des 18 écrans |
| [`shared/navigation/MainTabNavigator.tsx`](../src/shared/navigation/MainTabNavigator.tsx) | barre d'onglets personnalisée et son bouton d'action contextuel |
| [`shared/navigation/NavHelpers.tsx`](../src/shared/navigation/NavHelpers.tsx) | `NavBarHelper`, `withHeaderAnimation`, `withStaticHeader`, boutons d'en-tête |
| [`shared/aetherius/client.ts`](../src/shared/aetherius/client.ts) | la façade du moteur, instanciée une fois pour toute l'application |
| [`shared/aetherius/secrets.ts`](../src/shared/aetherius/secrets.ts) | résolution des secrets depuis le document unique de `SecureStore` |
| [`shared/aetherius/registry.ts`](../src/shared/aetherius/registry.ts) | résolution d'un Blueprint entre socle embarqué et surcouche publiée |
| [`shared/aetherius/failures.ts`](../src/shared/aetherius/failures.ts) | un échec de run traduit en famille d'écran et en clé de traduction |
| [`shared/aetherius/runBlueprint.ts`](../src/shared/aetherius/runBlueprint.ts) | l'appel type : résoudre, jouer, rendre des sorties ou un échec décrit |
| [`shared/aetherius/index.ts`](../src/shared/aetherius/index.ts) | la porte d'entrée du socle : un service importe d'ici, jamais des paquets |
| [`shared/aetherius/secrets.test.ts`](../src/shared/aetherius/secrets.test.ts) · [`registry.test.ts`](../src/shared/aetherius/registry.test.ts) · [`failures.test.ts`](../src/shared/aetherius/failures.test.ts) | les tests du socle, joués par `npm test` ([qualite.md](qualite.md)) |
| [`shared/supabase/client.ts`](../src/shared/supabase/client.ts) | client anonyme de la base de publication ([backend.md](backend.md)) |
| [`shared/supabase/types.ts`](../src/shared/supabase/types.ts) | types des tables, tels que la base les rend |
| [`shared/services/AppCore.tsx`](../src/shared/services/AppCore.tsx) | `AppContext`, `SettingsManager`, synchronisation calendrier, tâche de fond, utilitaires de lieux et de cours |
| [`shared/services/NotificationService.ts`](../src/shared/services/NotificationService.ts) | planification des rappels de cours ([features/settings.md](features/settings.md)) |
| [`shared/services/SecureStoreService.ts`](../src/shared/services/SecureStoreService.ts) | stockage chiffré des identifiants et des données étudiant |
| [`shared/services/TimeMockService.ts`](../src/shared/services/TimeMockService.ts) | simulation temporelle pour la vérification manuelle ([qualite.md](qualite.md)) |
| [`shared/theme/Theme.ts`](../src/shared/theme/Theme.ts) | tokens, thèmes clair et sombre, styles partagés ([theme.md](theme.md)) |
| [`shared/i18n/Translator.ts`](../src/shared/i18n/Translator.ts) | service de traduction, langue courante, locale moment ([i18n.md](i18n.md)) |
| [`shared/i18n/fr.ts`](../src/shared/i18n/fr.ts) · [`en.ts`](../src/shared/i18n/en.ts) · [`es.ts`](../src/shared/i18n/es.ts) | dictionnaires, 215 clés chacun |
| [`shared/map/MapScreen.tsx`](../src/shared/map/MapScreen.tsx) | écran carte Leaflet ([cartographie.md](cartographie.md)) |
| [`shared/ui/AppUI.tsx`](../src/shared/ui/AppUI.tsx) | `StatusBar` (thème), `Split` (séparateur), `UpdateAlert` (contrôle de version, non rendu) |
| [`shared/ui/Button.tsx`](../src/shared/ui/Button.tsx) | boutons partagés : retour, accueil, tiroir, ligne de réglage |
| [`shared/ui/Alerts.ts`](../src/shared/ui/Alerts.ts) | `ErrorAlert` (messages éphémères) et `RequestError` (non utilisé) |
| [`shared/ui/ModMenu.tsx`](../src/shared/ui/ModMenu.tsx) | menu flottant de simulation temporelle ([qualite.md](qualite.md)) |
| [`shared/ui/OpenMapButton.tsx`](../src/shared/ui/OpenMapButton.tsx) | bouton d'ouverture de carte — non importé ([cartographie.md](cartographie.md)) |
| [`shared/constants/urls.ts`](../src/shared/constants/urls.ts) | URLs externes : liens applicatifs (`URL`) et points d'entrée Celcat (`WebApiURL`) |
| [`shared/utils/formatUtils.ts`](../src/shared/utils/formatUtils.ts) | `upperCaseFirstLetter` et `formatDescription` (nettoyage des descriptions Celcat) |

## Documentation associée

| Sujet | Document |
|---|---|
| Organisation d'un module, style de code | [conventions.md](conventions.md) |
| Routes, navigateurs, en-têtes | [navigation.md](navigation.md) |
| Managers, caches, clés de stockage | [donnees-et-persistance.md](donnees-et-persistance.md) |
| Tout ce que l'application appelle à l'extérieur | [sources-externes.md](sources-externes.md) |
| Les fichiers d'instructions et leur publication | [blueprints.md](blueprints.md) |
| La base de publication | [backend.md](backend.md) |
| La migration vers les Blueprints, jalon par jalon | [phase-6/README.md](phase-6/README.md) |
| Tokens et thèmes | [theme.md](theme.md) |
| Localisation | [i18n.md](i18n.md) |
| Cartes | [cartographie.md](cartographie.md) |
| Expo, permissions, build, release | [plateforme.md](plateforme.md) |
| Portes de qualité et vérification | [qualite.md](qualite.md) |
