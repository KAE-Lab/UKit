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
l'exception (quatre aujourd'hui, toutes documentées plus bas).

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
    etablissements/ le catalogue des universités : socle embarqué, surcouche publiée, liens d'abonnement, purge
    constants/      URLs externes centralisées
    i18n/           Translator + dictionnaires fr / en / es
    map/            carte embarquée (MapLibre + OpenFreeMap en WebView)
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
   inventoriable en un seul endroit ([sources-externes.md](sources-externes.md)). **La
   [base de publication](backend.md) se lit avec la même règle** : depuis un service, jamais depuis
   un composant, et par le client unique de [`shared/supabase/`](../src/shared/supabase/) — aucun
   service ne construit le sien.
5. **Le moteur** — [`shared/aetherius/`](../src/shared/aetherius/) : depuis la
   [Phase 6](phase-6/README.md), un service n'émet plus de requête lui-même. Il demande au registre
   le [Blueprint](blueprints.md) correspondant à l'appel, le fait jouer, et travaille la donnée
   reçue. Ce qui reste du service est ce qui doit y rester : le cache, les conversions, le calcul,
   la traduction d'un échec en écran. Le registre résout entre le socle embarqué et la surcouche
   publiée **sans jamais toucher au réseau** ; le rafraîchissement est un geste séparé, déclenché par
   le conteneur racine, jamais sur le chemin d'un run.

## Séquence de démarrage

Décrite par [`App.tsx`](../App.tsx), dans cet ordre exact :

1. `SplashScreen.preventAutoHideAsync()` est appelé **au niveau module**, avant tout rendu, pour que
   le splash natif reste affiché pendant la préparation.
2. `AnimatedAppLoader` prépare en parallèle : le préchargement des
   images et des jeux d'icônes vectorielles, puis — séquentiellement — `loadEtablissements()`,
   `loadLiensEdt()`, `loadBuildings()`, `SettingsManager.loadSettings()`, puis
   `PlanningDataManager.loadData()` et `CampusDataManager.loadData()`.
   **Aucun ne touche le réseau** : ils lisent le magasin local, et ce qui doit être rafraîchi l'est
   sans être attendu.

   **L'ordre n'est pas indifférent, et il a été corrigé au jalon
   [6-J](phase-6/6-j-compte-et-sources-par-etablissement.md).** Les deux managers chargent des données
   qui appartiennent à **un** établissement, et c'est `loadSettings()` qui dit lequel — il restaure le
   code persisté. Ils couraient avant lui : un étudiant de Bordeaux INP dont le cache de groupes avait
   expiré voyait donc partir, au démarrage, une requête vers le serveur de **Bordeaux** — la seule
   source que le catalogue connaisse tant que le code n'est pas restauré — et la réponse écrasait sa
   liste. Le défaut ne se voyait qu'un jour sur sept, quand le cache expirait, ce qui l'a laissé vivre.
3. Une fois prêt, `AnimatedSplashScreen` recouvre l'application d'une image identique au splash natif
   et la fait disparaître en fondu sur 1 s. C'est ce qui évite le clignotement entre splash natif et
   premier écran.
4. [`RootContainer`](../src/shared/navigation/rootContainer.tsx) s'abonne aux événements de
   `SettingsManager` (thème, groupes favoris, langue, filtres, premier lancement), publie l'état dans
   `AppContext`, et rend soit l'[onboarding](features/onboarding.md) si `firstload` est vrai, soit le
   `NavigationContainer`.

Conséquence à connaître : **les données de démarrage sont chargées avant le premier rendu**. Un écran
peut donc supposer que `SettingsManager` et les managers de listes sont déjà peuplés. En contrepartie,
un `loadData()` lent retarde l'apparition de l'application — d'où la règle : **rien de ce chargement
ne touche le réseau**.

Ce n'était pas le cas jusqu'au jalon [6-E](phase-6/6-e-planning.md). Les deux `loadData()` retombaient
sur le réseau au-delà de sept jours de cache — liste des groupes Celcat pour l'un, liste des bâtiments
pour l'autre — et ils étaient `await`és **l'un après l'autre**, donc leurs latences s'additionnaient
avant le premier pixel. La facture a été payée en vrai : tant que le relais Celcat répondait `522`
après vingt secondes, le splash restait figé jusqu'à quarante secondes. Une fois tous les sept jours
seulement, ce qui rendait le symptôme apparemment aléatoire et l'a laissé vivre longtemps.

Les deux managers servent désormais leur cache immédiatement et lancent le rafraîchissement **sans
l'attendre**. Étant observables, la liste fraîche atteint les écrans par `notify` dès qu'elle arrive :
[`WelcomeScreen`](../src/features/Onboarding/WelcomeScreen.tsx) s'abonne à `groupList`, et les deux
écrans de salles libres relisent la liste du manager — et déclenchent eux-mêmes un chargement si elle
est vide. Un premier lancement sans aucun cache reste donc complet, il l'est simplement une fraction
de seconde plus tard.

La contrepartie, à connaître : sur un premier lancement, un écran ouvert très vite peut voir une liste
encore vide et lancer sa propre requête, en doublon de celle du démarrage. Deux runs Act I ne
partagent aucun état, donc c'est une requête de trop, pas un défaut — et poser un verrou coûterait plus
que ce qu'il éviterait.

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
- **Aucune dépendance cartographique propriétaire** : les cartes sont rendues par MapLibre et
  OpenStreetMap dans une WebView ([cartographie.md](cartographie.md)).
- **Le réseau est confiné aux services.** Un composant n'appelle jamais `axios` ni `fetch`
  directement. **Un seul écart subsiste** et il est documenté là où il vit :
  [`AppUI.tsx`](../src/shared/ui/AppUI.tsx) interroge le fichier de version distant
  ([plateforme.md](plateforme.md)). Le second — `ScheduleList` important `axios` pour un jeton
  d'annulation qui n'annulait rien — a disparu au jalon [6-E](phase-6/6-e-planning.md) : le moteur
  accepte un `AbortSignal`, donc le composant n'a plus besoin d'une bibliothèque réseau pour annuler
  ([features/planning.md](features/planning.md)).
- **Les services distants échouent en silence utile** : ils renvoient `null` ou `[]` plutôt que de
  propager une exception. C'est un choix assumé (l'application reste utilisable hors ligne grâce au
  cache) dont la contrepartie est qu'une erreur réseau et une réponse vide sont indistinguables côté
  appelant. Voir [sources-externes.md](sources-externes.md).
  **Cet invariant est en cours de remplacement** par la [Phase 6](phase-6/README.md) : un échec est
  désormais typé et rangé dans une famille d'écran, et une liste vide redevient une liste vide. Il
  disparaîtra du document quand la dernière source aura migré ([blueprints.md](blueprints.md)).
  Sources déjà sorties : `BdeService` ([6-A](phase-6/6-a-socle.md)), `CrousService` et
  `LibraryService` ([6-D](phase-6/6-d-campus.md)), `PlanningApiService` et `CampusApiService`
  ([6-E](phase-6/6-e-planning.md)). Il ne reste que la scolarité.
- **Le démarrage ne dépend d'aucune source distante.** Le splash attend le chargement des managers,
  donc rien de ce chargement ne touche le réseau : les caches sont servis tels quels et le
  rafraîchissement part **sans être attendu**. Même principe que le registre de Blueprints, dont la
  résolution ne touche jamais le réseau ([blueprints.md](blueprints.md)). Ce que l'écart a coûté est
  raconté dans [la séquence de démarrage](#séquence-de-démarrage).
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

Deux autres sont apparues au jalon [6-J](phase-6/6-j-compte-et-sources-par-etablissement.md), et elles
sont volontaires pour la même raison — **le parcours d'accueil propose des gestes qui appartiennent à
d'autres domaines** :

- [`Onboarding/components/WelcomeSteps.tsx`](../src/features/Onboarding/components/WelcomeSteps.tsx)
  importe `ScolariteLoginView` (Scolarité) et `LienEdtForm` (Planning). L'accueil demande le compte
  universitaire et le lien d'emploi du temps ; recopier ces deux formulaires ferait **deux chemins vers
  le même trousseau**, qui divergeraient à la première correction. C'est précisément pour rendre ce
  partage possible que `CredentialsProvider` a remonté dans
  [`rootContainer.tsx`](../src/shared/navigation/rootContainer.tsx).
- [`Onboarding/hooks/useWelcomeState.ts`](../src/features/Onboarding/hooks/useWelcomeState.ts) importe
  `PlanningDataManager`. Celle-ci **est antérieure** à 6-J et n'était pas documentée ; elle l'est
  maintenant, parce qu'une dépendance tue est plus dangereuse qu'une dépendance assumée.

Toute autre dépendance croisée entre deux dossiers de `features/` est à éviter : passer par
`shared/` ou par les paramètres de navigation.

La règle qui départage, et qui a servi à trancher les deux ci-dessus : **on partage un composant quand
le dupliquer créerait deux chemins vers le même état persistant.** Un rendu qu'on recopie coûte de la
maintenance ; un accès au trousseau qu'on recopie coûte un défaut de sécurité.

## Carte des fichiers du socle

Les fichiers de `src/features/` sont recensés par la documentation de leur feature. Voici ceux de la
racine et de [`src/shared/`](../src/shared/).

| Fichier | Rôle |
|---|---|
| [`App.tsx`](../App.tsx) | point d'entrée : préchargement des ressources, chargement des managers, splash animé |
| [`app.config.ts`](../app.config.ts) | configuration Expo ([plateforme.md](plateforme.md)) |
| [`metro.config.js`](../metro.config.js) | la configuration Metro d'Expo, plus `txt` en extension d'asset — pour servir pdf.js tel quel à la WebView du lecteur ([plateforme.md](plateforme.md)) |
| [`shared/navigation/rootContainer.tsx`](../src/shared/navigation/rootContainer.tsx) | conteneur racine : abonnements aux réglages, `AppContext`, aiguillage onboarding / navigation, rafraîchissement des six surcouches publiées — livraison, lieux, visuels, catalogue, salutations, messages de service — au démarrage et au retour au premier plan, et l'hôte des messages |
| [`shared/navigation/StackNavigator.tsx`](../src/shared/navigation/StackNavigator.tsx) | pile principale, `RootStackParamList`, en-têtes des 20 écrans |
| [`shared/navigation/MainTabNavigator.tsx`](../src/shared/navigation/MainTabNavigator.tsx) | barre d'onglets personnalisée et son bouton d'action contextuel |
| [`shared/navigation/NavHelpers.tsx`](../src/shared/navigation/NavHelpers.tsx) | `NavBarHelper`, `withHeaderAnimation`, `withStaticHeader`, boutons d'en-tête |
| [`shared/aetherius/client.ts`](../src/shared/aetherius/client.ts) | la façade du moteur, instanciée une fois pour toute l'application |
| [`shared/aetherius/secrets.ts`](../src/shared/aetherius/secrets.ts) | résolution des secrets depuis le document unique de `SecureStore` |
| [`shared/aetherius/delivery.ts`](../src/shared/aetherius/delivery.ts) | le cadrage du registre : socle, périmètre des secrets, URL du manifeste ([blueprints.md](blueprints.md)) |
| [`shared/aetherius/registry.ts`](../src/shared/aetherius/registry.ts) | le registre branché : magasin de cache, rafraîchissement, retour à l'embarqué, diagnostic |
| [`shared/aetherius/failures.ts`](../src/shared/aetherius/failures.ts) | un échec de run traduit en famille d'écran et en clé de traduction |
| [`shared/aetherius/runBlueprint.ts`](../src/shared/aetherius/runBlueprint.ts) | l'appel type : résoudre, jouer, rendre des sorties ou un échec décrit |
| [`shared/aetherius/index.ts`](../src/shared/aetherius/index.ts) | la porte d'entrée du socle : un service importe d'ici, jamais des paquets |
| [`shared/aetherius/secrets.test.ts`](../src/shared/aetherius/secrets.test.ts) · [`delivery.test.ts`](../src/shared/aetherius/delivery.test.ts) · [`failures.test.ts`](../src/shared/aetherius/failures.test.ts) | les tests du socle, joués par `npm test` ([qualite.md](qualite.md)) |
| [`shared/supabase/client.ts`](../src/shared/supabase/client.ts) | client anonyme de la base de publication, construit au premier usage ([backend.md](backend.md)) |
| [`shared/supabase/types.ts`](../src/shared/supabase/types.ts) | types des tables, tels que la base les rend, et le schéma en lecture seule |
| [`shared/supabase/failures.ts`](../src/shared/supabase/failures.ts) | un échec de lecture traduit dans le même vocabulaire que ceux du moteur |
| [`shared/supabase/index.ts`](../src/shared/supabase/index.ts) | la porte d'entrée de la base : un service importe d'ici |
| [`shared/supabase/failures.test.ts`](../src/shared/supabase/failures.test.ts) | la table d'erreurs de la base, jouée par `npm test` |
| [`shared/locations/referentiel.ts`](../src/shared/locations/referentiel.ts) | le référentiel des lieux : socle embarqué, fusion de la surcouche, accesseurs **synchrones** ([donnees-et-persistance.md](donnees-et-persistance.md)) |
| [`shared/locations/index.ts`](../src/shared/locations/index.ts) | sa couture de plateforme : cache local et lecture de la table `batiments` |
| [`shared/locations/referentiel.test.ts`](../src/shared/locations/referentiel.test.ts) | la fusion champ par champ, jouée par `npm test` |
| [`shared/locations/salles.ts`](../src/shared/locations/salles.ts) | reconnaître un bâtiment dans un libellé de salle, selon le format publié par l'établissement |
| [`shared/locations/salles.test.ts`](../src/shared/locations/salles.test.ts) | les deux formes réelles, et la non-régression bordelaise |
| [`shared/biometrie/decision.ts`](../src/shared/biometrie/decision.ts) | après un échec de biométrie, propose-t-on le code ? Aucune dépendance, donc jouable sous Node ([features/scolarite.md](features/scolarite.md)) |
| [`shared/biometrie/index.ts`](../src/shared/biometrie/index.ts) | la séquence en deux temps — biométrie d'abord, code ensuite — et les capacités de l'appareil |
| [`shared/biometrie/decision.test.ts`](../src/shared/biometrie/decision.test.ts) | la frontière entre une annulation et un échec, dont une erreur ne se voit pas — jouée par `npm test` |
| [`shared/visuels/referentiel.ts`](../src/shared/visuels/referentiel.ts) | les visuels publiés : la surcouche en mémoire et la résolution des trois états — pas de socle embarqué, le socle est l'image de la source ([backend.md](backend.md)) |
| [`shared/visuels/index.ts`](../src/shared/visuels/index.ts) | sa couture de plateforme : cache local et lecture de la table `visuels` |
| [`shared/visuels/referentiel.test.ts`](../src/shared/visuels/referentiel.test.ts) | la distinction du vide et du nul, dont une erreur ferait disparaître une photo en silence — joué par `npm test` |
| [`shared/ciblage/ciblage.ts`](../src/shared/ciblage/ciblage.ts) | le ciblage d'un contenu publié — audience, campus, fenêtre de versions — partagé par les annonces et les messages de service : projection défensive et règle de présentation, purs ([pilotage.md](pilotage.md)) |
| [`shared/ciblage/versions.ts`](../src/shared/ciblage/versions.ts) | le comparateur de versions `X.Y.Z` et la fenêtre inclusive, purs |
| [`shared/ciblage/contexte.ts`](../src/shared/ciblage/contexte.ts) | ce que l'appareil sait de lui-même au moment de présenter : établissement actif, version, statut de testeur |
| [`shared/ciblage/ciblage.test.ts`](../src/shared/ciblage/ciblage.test.ts) · [`versions.test.ts`](../src/shared/ciblage/versions.test.ts) | joués par `npm test` |
| [`shared/messages/projection.ts`](../src/shared/messages/projection.ts) | le contrat d'un message de service et sa projection depuis la ligne, la péremption — pur ([pilotage.md](pilotage.md)) |
| [`shared/messages/presentation.ts`](../src/shared/messages/presentation.ts) | la règle de présentation : une modale ou un bandeau, une chose à la fois — pur |
| [`shared/messages/vus.ts`](../src/shared/messages/vus.ts) | la mémoire « vu », par appareil : élagage contre une lecture réussie, oubli à la réinitialisation |
| [`shared/messages/index.ts`](../src/shared/messages/index.ts) | sa couture de plateforme : cache local, lecture de la table `service_messages`, abonnés |
| [`shared/messages/MessagesDeServiceHote.tsx`](../src/shared/messages/MessagesDeServiceHote.tsx) | l'hôte des messages, monté par le conteneur racine au-dessus de la navigation : rejoue la règle et rend le bandeau d'information ou la feuille |
| [`shared/messages/PastilleService.tsx`](../src/shared/messages/PastilleService.tsx) | la pastille d'état de service, au gabarit des boutons d'en-tête, posée par chaque en-tête d'onglet à droite de son titre : grise et « Rien à signaler » avec le lien du formulaire, rouge et la feuille de l'incident |
| [`shared/messages/projection.test.ts`](../src/shared/messages/projection.test.ts) · [`presentation.test.ts`](../src/shared/messages/presentation.test.ts) | joués par `npm test` |
| [`shared/testeur/identifiant.ts`](../src/shared/testeur/identifiant.ts) | l'identifiant d'installation : tiré une fois, gardé au trousseau, jamais envoyé ([pilotage.md](pilotage.md)) |
| [`shared/testeur/statut.ts`](../src/shared/testeur/statut.ts) | « cet appareil est-il un testeur ? » : cache, lecture de la colonne `id` de `testeurs`, comparaison locale |
| [`shared/testeur/index.ts`](../src/shared/testeur/index.ts) | la porte d'entrée du module |
| [`shared/etablissements/catalogue.ts`](../src/shared/etablissements/catalogue.ts) | le catalogue : projection d'une ligne, table en mémoire, établissement actif, libellés propres à l'université ([features/settings.md](features/settings.md)) |
| [`shared/etablissements/socle.ts`](../src/shared/etablissements/socle.ts) | le socle embarqué — la **donnée** : une copie des lignes publiées à la date de la release |
| [`shared/etablissements/socle.test.ts`](../src/shared/etablissements/socle.test.ts) | le socle est exactement ce que la projection rend de `supabase/etablissements.sql`, et tout Blueprint qu'il nomme est embarqué — joué par `npm test` |
| [`shared/etablissements/premierRafraichissement.ts`](../src/shared/etablissements/premierRafraichissement.ts) | le signal « le premier rafraîchissement du catalogue a répondu », et son attente plafonnée ([features/onboarding.md](features/onboarding.md)) |
| [`shared/etablissements/premierRafraichissement.test.ts`](../src/shared/etablissements/premierRafraichissement.test.ts) | une réponse, un plafond, jamais les deux — joué par `npm test` |
| [`shared/etablissements/bascule.ts`](../src/shared/etablissements/bascule.ts) | la bascule d'établissement — purge, adoucissement, sélection — partagée par les Réglages, l'accueil et le formulaire de connexion |
| [`shared/etablissements/celcat.ts`](../src/shared/etablissements/celcat.ts) | ce que le catalogue fournit aux six Blueprints Celcat, et le prédicat des salles libres |
| [`shared/etablissements/edt.ts`](../src/shared/etablissements/edt.ts) | quelle source d'emploi du temps l'établissement publie — Celcat, référentiel iCalendar, abonnement collé, lien attendu, ou aucune — et les échecs qui en découlent |
| [`shared/etablissements/edt.test.ts`](../src/shared/etablissements/edt.test.ts) | le choix de la source et la résolution partielle, joués par `npm test` |
| [`shared/etablissements/index.ts`](../src/shared/etablissements/index.ts) | sa couture de plateforme : cache local, lecture de la table `etablissements`, chargement et écriture des liens d'abonnement, purge au changement |
| [`shared/etablissements/lienEdt.ts`](../src/shared/etablissements/lienEdt.ts) | les liens d'abonnement collés, **cloisonnés par établissement** : lecture défensive, fusion, lien actif ([features/planning.md](features/planning.md)) |
| [`shared/etablissements/lienEdt.test.ts`](../src/shared/etablissements/lienEdt.test.ts) | le cloisonnement, dont une erreur ferait perdre un lien en silence — joué par `npm test` |
| [`shared/etablissements/comptes.ts`](../src/shared/etablissements/comptes.ts) | la session universitaire **cloisonnée par établissement** : lecture défensive, fusion, conversion des clés d'avant ([features/scolarite.md](features/scolarite.md)) |
| [`shared/etablissements/comptes.test.ts`](../src/shared/etablissements/comptes.test.ts) | le cloisonnement et la conversion, dont une erreur ferait perdre une session sans rien dire — joué par `npm test` |
| [`shared/etablissements/purge.ts`](../src/shared/etablissements/purge.ts) | ce qu'on efface en quittant un établissement, et ce que seule la réinitialisation efface |
| [`shared/etablissements/catalogue.test.ts`](../src/shared/etablissements/catalogue.test.ts) | la projection et le repli sur le socle, joués par `npm test` |
| [`shared/services/AppCore.tsx`](../src/shared/services/AppCore.tsx) | `AppContext`, `SettingsManager`, synchronisation calendrier, tâche de fond, utilitaires de lieux et de cours |
| [`shared/services/CalendarSyncHelpers.ts`](../src/shared/services/CalendarSyncHelpers.ts) | les deux pièces « calendrier système » de la synchronisation, sorties d'`AppCore` au jalon [6-E](phase-6/6-e-planning.md) quand il a franchi les 400 lignes |
| [`shared/services/NotificationService.ts`](../src/shared/services/NotificationService.ts) | planification des rappels de cours ([features/settings.md](features/settings.md)) |
| [`shared/services/SecureStoreService.ts`](../src/shared/services/SecureStoreService.ts) | stockage chiffré des identifiants, des données étudiant, des liens d'abonnement et de l'identifiant d'installation |
| [`shared/services/TimeMockService.ts`](../src/shared/services/TimeMockService.ts) | simulation temporelle pour la vérification manuelle ([qualite.md](qualite.md)) |
| [`shared/services/NetworkMockService.ts`](../src/shared/services/NetworkMockService.ts) | l'interrupteur hors ligne : couper le réseau de l'application sans couper celui de l'appareil ([qualite.md](qualite.md)) |
| [`shared/services/Base64.ts`](../src/shared/services/Base64.ts) · [`Base64.test.ts`](../src/shared/services/Base64.test.ts) | le décodage base64 en JavaScript, parce que le natif d'Expo Go ne le garantit pas ([features/scolarite.md](features/scolarite.md)) |
| [`shared/services/ReinitialisationComplete.ts`](../src/shared/services/ReinitialisationComplete.ts) | la remise à zéro complète du menu de développement : trousseau, documents, AsyncStorage, puis rechargement ([qualite.md](qualite.md)) |
| [`shared/theme/tokens.ts`](../src/shared/theme/tokens.ts) | les primitives de design, isolées pour être testables sous Node ([theme.md](theme.md#les-tokens)) |
| [`shared/theme/Theme.ts`](../src/shared/theme/Theme.ts) | thèmes clair et sombre, échelle sémantique, styles partagés ([theme.md](theme.md)) |
| [`shared/i18n/Translator.ts`](../src/shared/i18n/Translator.ts) | service de traduction, langue courante, locale moment ([i18n.md](i18n.md)) |
| [`shared/i18n/fr.ts`](../src/shared/i18n/fr.ts) · [`en.ts`](../src/shared/i18n/en.ts) · [`es.ts`](../src/shared/i18n/es.ts) | dictionnaires, 217 clés chacun |
| [`shared/map/EmbeddedMap.tsx`](../src/shared/map/EmbeddedMap.tsx) | carte MapLibre embarquée dans les fiches ([cartographie.md](cartographie.md)) |
| [`shared/ui/AppUI.tsx`](../src/shared/ui/AppUI.tsx) | `StatusBar` (thème) et `UpdateAlert` (contrôle de version, non rendu) |
| [`shared/ui/Button.tsx`](../src/shared/ui/Button.tsx) | boutons partagés : retour, accueil, tiroir, ligne de réglage |
| [`shared/ui/Alerts.ts`](../src/shared/ui/Alerts.ts) | `ErrorAlert` (messages éphémères) |
| [`shared/ui/Card.tsx`](../src/shared/ui/Card.tsx) | la surface d'une carte — fond, rayon, ombre, apparition animée ([theme.md](theme.md#le-vocabulaire-partagé)) |
| [`shared/ui/SectionHeader.tsx`](../src/shared/ui/SectionHeader.tsx) | l'en-tête d'une section de tableau de bord : titre, chevron, destination |
| [`shared/ui/Badge.tsx`](../src/shared/ui/Badge.tsx) | une pastille icône + libellé, teinte d'action ou ton sémantique |
| [`shared/ui/MetaRow.tsx`](../src/shared/ui/MetaRow.tsx) | une ligne « icône + texte secondaire », avec de quoi poser un contenu à droite |
| [`shared/ui/EmptyState.tsx`](../src/shared/ui/EmptyState.tsx) | icône, titre, message, action facultative — le bloc commun à « rien à afficher » et « source en panne » |
| [`shared/ui/ScreenState.tsx`](../src/shared/ui/ScreenState.tsx) | **où** un état plein écran se pose : le centrage sur la surface libre, et les hauteurs `HEADER_OFFSET` et `TAB_BAR_HEIGHT` ([theme.md](theme.md#les-décisions-durables)) |
| [`shared/ui/ActionButton.tsx`](../src/shared/ui/ActionButton.tsx) | une action hors dialogue : `filled`, `tonal`, `destructive` ([theme.md](theme.md#les-décisions-durables)) |
| [`shared/ui/LoadingState.tsx`](../src/shared/ui/LoadingState.tsx) | l'attente, en ligne ou plein écran, et la phrase qui dit ce qu'on attend |
| [`shared/ui/Dialogue.tsx`](../src/shared/ui/Dialogue.tsx) | le dialogue informatif partagé : titre, corps, action, sortie secondaire, lien discret ([theme.md](theme.md#les-décisions-durables)) |
| [`shared/ui/ModaleBientot.tsx`](../src/shared/ui/ModaleBientot.tsx) | ce que le voile d'un teaser promet — une composition de `Dialogue` |
| [`shared/ui/Bandeau.tsx`](../src/shared/ui/Bandeau.tsx) | le bandeau flottant en haut de l'écran, la seule forme de bandeau de l'application : une information, fermable, au gabarit des en-têtes ([theme.md](theme.md#les-décisions-durables)) |
| [`shared/ui/ModMenuTesteur.tsx`](../src/shared/ui/ModMenuTesteur.tsx) | le panneau Testeur du menu de développement : l'identifiant d'installation, le statut, relire et oublier les messages ([qualite.md](qualite.md)) |
| [`shared/ui/ChoixEtablissement.tsx`](../src/shared/ui/ChoixEtablissement.tsx) | la liste des universités puis la confirmation de la bascule, partagée par les Réglages et le formulaire de connexion |
| [`shared/ui/ProgressBar.tsx`](../src/shared/ui/ProgressBar.tsx) | une jauge horizontale, rayon calculé sur la hauteur |
| [`shared/ui/Icon.tsx`](../src/shared/ui/Icon.tsx) | une icône de l'une ou l'autre famille Material, typée par union discriminée |
| [`shared/ui/GlypheFiligrane.tsx`](../src/shared/ui/GlypheFiligrane.tsx) | le filigrane d'identité : une grande silhouette en transparence sur une surface unique — le geste de signature, règles d'usage dans son en-tête ([theme.md](theme.md#les-décisions-durables)) |
| [`shared/ui/PiedFlottant.tsx`](../src/shared/ui/PiedFlottant.tsx) | le pied d'action flottant : le vocabulaire de la barre de recherche — dégradé d'amortissement, bande du fond de page — et le dégagement que l'écran doit lui laisser ([theme.md](theme.md#les-décisions-durables)) |
| [`shared/ui/ModMenu.tsx`](../src/shared/ui/ModMenu.tsx) | menu flottant de développement : simulation temporelle et livraison ([qualite.md](qualite.md)) |
| [`shared/ui/ModMenuBlueprints.tsx`](../src/shared/ui/ModMenuBlueprints.tsx) | son panneau de diagnostic de la livraison ([blueprints.md](blueprints.md)) |
| [`shared/ui/ModMenuReinitialisation.tsx`](../src/shared/ui/ModMenuReinitialisation.tsx) | son bouton de remise à zéro complète, avec confirmation |
| [`shared/ui/SourceFailureNotice.tsx`](../src/shared/ui/SourceFailureNotice.tsx) | l'échec d'une source, tel qu'un écran le montre : message de la famille, bouton Réessayer seulement s'il répare, ou l'**action** qui remplirait l'écran ([blueprints.md](blueprints.md)) |
| [`shared/constants/urls.ts`](../src/shared/constants/urls.ts) | URLs externes : liens applicatifs (`URL`). Les points d'entrée Celcat en sont sortis au jalon [6-E](phase-6/6-e-planning.md) — ils vivent dans les Blueprints |
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
| Tokens, thèmes, composants partagés, recette d'écran | [theme.md](theme.md) |
| L'état visuel mesuré, avant le socle | [inventaire-visuel.md](inventaire-visuel.md) |
| Les défauts de comportement connus | [defauts-fonctionnels.md](defauts-fonctionnels.md) |
| Localisation | [i18n.md](i18n.md) |
| Cartes | [cartographie.md](cartographie.md) |
| Expo, permissions, build, release | [plateforme.md](plateforme.md) |
| Portes de qualité et vérification | [qualite.md](qualite.md) |
