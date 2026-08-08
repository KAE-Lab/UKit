# Données et persistance

Tout l'état durable de UKit vit sur l'appareil : il n'y a **aucun compte UKit, et rien de ce qui
appartient à l'utilisateur n'est stocké ailleurs**. L'application lit des sources publiques ou
universitaires ([sources-externes.md](sources-externes.md)) et conserve localement ce dont elle a
besoin.

La [base de publication](backend.md) introduite par la [Phase 6](phase-6/README.md) ne change pas
cette phrase : elle porte ce que **l'équipe** publie — annonces, référentiels,
[Blueprints](blueprints.md) — jamais ce qui appartient à l'utilisateur. Chacune de ces publications a
un socle embarqué dans le binaire, et l'application fonctionne sans jamais la joindre.

Deux supports :

- **AsyncStorage** — réglages, caches, favoris. Non chiffré.
- **SecureStore** (`expo-secure-store`) — identifiants CAS et données personnelles de l'étudiant.
  Chiffré par le trousseau de l'OS.

## Le patron : manager singleton observable

Trois services suivent le même modèle. Ils sont instanciés une fois au niveau module, chargés au
démarrage par [`App.tsx`](../App.tsx), et diffusent leurs changements par un mini bus d'événements.

```ts
manager.on('evenement', callback);        // s'abonner
manager.unsubscribe('evenement', callback); // se désabonner
manager.notify('evenement', valeur);      // diffuser (et persister)
```

| Manager | Fichier | Porte |
|---|---|---|
| `SettingsManager` | [`AppCore.tsx`](../src/shared/services/AppCore.tsx) | thème, langue, groupes favoris, filtres UE, calendrier, notifications, premier lancement |
| `PlanningDataManager` | [`PlanningDataManager.ts`](../src/features/Planning/services/PlanningDataManager.ts) | liste des groupes, UE disponibles |
| `CampusDataManager` | [`CampusDataManager.ts`](../src/features/Campus/services/CampusDataManager.ts) | liste des bâtiments et de leurs salles |

Deux détails de comportement à connaître :

- **`SettingsManager.notify` persiste systématiquement**, y compris quand aucun abonné n'écoute :
  `saveSettings()` est appelé en première ligne. Toute mutation passant par `notify` est donc écrite
  sur disque.
- **`PlanningDataManager.notify` persiste après diffusion**, mais sort immédiatement si l'événement
  n'a aucun abonné — la sauvegarde est alors sautée. C'est une asymétrie avec `SettingsManager` : ne
  pas supposer que `notify` garantit l'écriture partout.

`RootContainer` est le seul abonné React de `SettingsManager` : il traduit les événements `theme`,
`favoriteGroups`, `firstload`, `language` et `filter` en état React, publié ensuite dans `AppContext`.

Pourquoi des singletons plutôt qu'un contexte unique : ces états sont lus par du code hors React —
la tâche de fond de synchronisation du calendrier, le planificateur de notifications, `Translator`.
Un contexte ne serait pas accessible depuis ces points.

## Clés AsyncStorage

| Clé | Écrite par | Contenu | Durée de vie |
|---|---|---|---|
| `firstload` | `SettingsManager.saveSettings` | booléen : parcours d'accueil non terminé | jusqu'à la fin de l'onboarding ou une réinitialisation |
| `settings` | `SettingsManager.saveSettings` | objet unique : `calendar`, `theme`, `favoriteGroups`, `language`, `openAppOnFavoriteGroup`, `filters`, `calendarSyncEnabled`, `courseNotificationsEnabled`, `courseNotificationDelay` | permanent |
| `groupList` | `PlanningDataManager` | liste complète des groupes Celcat | 7 jours (`groupListTimestamp`) |
| `groupListTimestamp` | `PlanningDataManager` | horodatage du dernier rafraîchissement | — |
| `groups` | [`GroupSelectionScreen`](../src/features/Planning/screens/GroupSelectionScreen.tsx) | `{ list, date }` — cache d'affichage de l'écran de recherche | sans expiration, repli hors ligne |
| `buildingList` | `CampusDataManager` | bâtiments en accès libre et leurs salles | 7 jours (`buildingListTimestamp`) |
| `buildingListTimestamp` | `CampusDataManager` | horodatage du dernier rafraîchissement | — |
| `<groupes>@YYYY/MM/DD` | [`ScheduleList`](../src/features/Planning/components/ScheduleList.tsx) | `{ data, date }` — emploi du temps d'un jour | sans expiration, repli hors ligne |
| `<groupes>@Week<n>` | `ScheduleList` | `{ data, date }` — emploi du temps d'une semaine | sans expiration, repli hors ligne |
| `previousSyncData` | `SettingsManager.syncCalendar` | table `id d'événement Celcat → id d'événement système` | jusqu'à désactivation de la synchronisation |
| `previousSyncTime` | `SettingsManager.syncCalendar` | horodatage de la dernière synchronisation | idem |
| `crous_favorites` | [`useFavorites`](../src/features/Campus/hooks/useFavorites.ts) | identifiants de restaurants favoris | permanent |
| `library_favorites` | `useFavorites` | identifiants de BU favorites | permanent |
| `freeroom_favorites` | `useFavorites` | identifiants de bâtiments favoris | permanent |
| `crous_filter` | [`useSavedFilter`](../src/features/Campus/hooks/useSavedFilter.ts) | filtre actif (`all` / `resto` / `market`) | permanent |
| `library_filter` | `useSavedFilter` | filtre actif (`all` / `open`) | permanent |
| `aetherius/blueprints@1` | le registre du moteur, via [`registry.ts`](../src/shared/aetherius/registry.ts) | la **surcouche** des Blueprints publiés : un document unique portant, par nom, le texte servi et son empreinte | jusqu'à la prochaine publication ou un retour à l'embarqué |

Le préfixe `<groupes>` est le nom du groupe, ou la concaténation des groupes favoris jointe par `+`
quand la vue affiche le planning agrégé.

La clé de livraison est la seule du tableau qui porte **un document unique pour plusieurs entrées**,
et c'est délibéré : un document illisible fait perdre la surcouche entière et l'application retombe
sur son socle embarqué. C'est le sens du repli, et c'est préférable à un index réparti sur plusieurs
clés qui pourrait se contredire. L'empreinte de chaque entrée est d'ailleurs **revérifiée à chaque
lecture** — un cache local n'est pas plus digne de confiance qu'un CDN
([blueprints.md](blueprints.md)).

## Clés SecureStore

Gérées exclusivement par [`SecureStoreService.ts`](../src/shared/services/SecureStoreService.ts).

| Clé | Contenu |
|---|---|
| `UKIT_CAS_CREDENTIALS` | `{ username, password }` du compte universitaire |
| `UKIT_COLD_DATA` | données étudiant scrapées une fois : prénom, numéro étudiant, INE, adresse mail, date de naissance |

Ces deux clés sont supprimées ensemble à la déconnexion (`logout` dans
[`CredentialsContext.tsx`](../src/features/Scolarite/services/CredentialsContext.tsx)). Aucune de ces
données ne quitte l'appareil.

## Stratégies de cache

Trois régimes coexistent, chacun adapté à la volatilité de la donnée :

**1. Cache à expiration (7 jours) — listes de référence.**
Groupes et bâtiments changent au rythme des semestres. `loadData()` lit le cache, compare son
horodatage à `Date.now()`, et ne va au réseau que si le délai est dépassé. En cas d'échec réseau, la
liste reste vide pour la session.

**2. Cache de repli sans expiration — emploi du temps.**
`ScheduleList.fetchSchedule` tente **toujours** le réseau d'abord si une connexion est détectée
(`isConnected()` via NetInfo), écrit le résultat en cache, et ne lit le cache que si l'appel échoue
ou si l'appareil est hors ligne. Quand le cache est servi, un bandeau affiche la date de la donnée
(`OFFLINE_DISPLAY_FROM_DATE`). Ce cache n'expire jamais et n'est jamais purgé : voir les limites.

**3. Pas de cache — données temps réel.**
Restaurants et menus CROUS, affluence et horaires des BU, annonces de vie étudiante, occupation des
salles : ces données sont rechargées à chaque montage d'écran. Les mettre en cache n'aurait pas de
sens (une affluence de bibliothèque périmée est pire qu'un chargement).

Les annonces sont le cas limite de ce régime, et il vaut d'être dit : elles viennent désormais de
notre [base de publication](backend.md), qui les sert en quelques kilo-octets et change quelques fois
par mois. Un cache y aurait du sens — c'est ce qui leur permettrait de survivre hors ligne, et ce qui
réduirait la bande passante quand le parc grandira. Il n'est pas fait, délibérément : le jalon 6-B a
préféré rendre l'échec **visible** plutôt que de le masquer derrière une donnée d'hier. Le jour où il
arrivera, le filtre d'expiration applicatif de
[`BdeMapping`](../src/features/Campus/services/BdeMapping.ts) sera exactement ce qui empêchera
d'afficher une annonce périmée sortie du cache — c'est pour ça qu'il est doublé avec la politique de
lecture.

### 4. Socle embarqué et surcouche distante — la donnée publiée

Ce que l'équipe publie suit un régime à part, et c'est celui qui porte la promesse du
[dos applicatif](backend.md) : **le binaire porte un socle, la base ne fait que le mettre à jour**.
L'application doit démarrer et s'utiliser au premier lancement, hors ligne, sans avoir jamais joint
quoi que ce soit.

| Publication | Socle embarqué | Surcouche | Branchée |
|---|---|---|---|
| Blueprints | [`blueprints/`](../blueprints/) | bucket `blueprints` + manifeste | 6-C |
| Référentiel des bâtiments | [`assets/locations.json`](../assets/locations.json) | table `batiments` | 6-D |
| Établissements | l'établissement historique, en dur | table `etablissements` | 6-G |
| Annonces de vie étudiante | *aucun* | table `annonces` | **6-B** |

Les annonces sont l'exception, et volontairement : une annonce n'a pas de valeur par défaut
raisonnable, et en figer une dans le binaire reviendrait à livrer un contenu éditorial périmé à
chaque installation. Leur absence produit une section vide, pas une application cassée.

## Invalidation

- **Changement d'heure simulée** — [`TimeMockService`](../src/shared/services/TimeMockService.ts)
  purge les clés d'emploi du temps (celles contenant `@Week` ou correspondant à `@YYYY/MM/DD`) à
  chaque activation ou désactivation du mock, pour que les vues ne montrent pas la donnée de la vraie
  date. Voir [qualite.md](qualite.md).
- **Changement de calendrier de synchronisation** — `setSyncCalendar` supprime d'abord tous les
  événements précédemment créés, puis efface `previousSyncData` et `previousSyncTime`.
- **Réinitialisation de l'application** — `SettingsManager.resetSettings()` remet thème, langue,
  favoris, filtres et `firstload` à leurs valeurs par défaut. **Elle ne vide ni les caches d'emploi du
  temps, ni les favoris Campus, ni le SecureStore.**

## Migration de format

Une seule migration existe, dans `applySettingsData` : les versions antérieures stockaient un unique
`groupName`, remplacé par le tableau `favoriteGroups`. Si `groupName` est présent et `favoriteGroups`
absent, le premier est converti en tableau à un élément. Ce code doit rester tant que des
installations anciennes peuvent être mises à jour.

## Limites connues

- **Les caches d'emploi du temps ne sont jamais purgés.** Une clé est écrite par jour consulté et par
  semaine consultée, pour chaque combinaison de groupes. Sur une année d'usage, cela représente
  plusieurs centaines d'entrées qui ne disparaissent qu'à la désinstallation.
- **La lecture de cache accepte trois formes** (`cache.data`, `cache.dayData`, `cache.weekData`) :
  vestige d'un format antérieur. Seule `data` est écrite aujourd'hui.
- **`resetSettings` est partielle** (voir ci-dessus) : l'utilisateur qui « réinitialise » conserve ses
  favoris Campus, ses filtres de liste et sa session universitaire.
- **AsyncStorage n'est pas chiffré.** Les groupes suivis et les favoris sont lisibles par toute
  personne ayant accès au stockage de l'application. Seules les données de
  [Scolarité](features/scolarite.md) sont protégées.
- **Aucun verrouillage de concurrence.** Deux écritures simultanées sur la même clé (par exemple deux
  écrans Campus modifiant les mêmes favoris) s'écrasent mutuellement, le dernier arrivé gagne.
