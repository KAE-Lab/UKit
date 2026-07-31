# Réglages

Le quatrième onglet : préférences d'affichage, filtres d'UE, notifications de cours, synchronisation
avec le calendrier du système, réinitialisation, et écran À propos.

Tout l'état de cet onglet est porté par `SettingsManager`
([donnees-et-persistance.md](../donnees-et-persistance.md)) : l'écran n'est qu'une surface de pilotage.

## Parcours utilisateur

L'écran est une suite de sections empilées, sous un titre qui s'efface au défilement :

| Section | Contenu |
|---|---|
| **Affichage** | langue (modale à trois choix), filtres d'UE (modale de gestion) |
| **Thème** | interrupteur mode sombre |
| **Notifications** | interrupteur des rappels de cours, curseur de délai |
| **Lancement** | ouvrir sur le groupe favori, réinitialiser l'application |
| **Calendrier** | interrupteur de synchronisation, choix du calendrier cible, date de dernière synchronisation |

Le bouton d'action de la barre d'onglets mène à **À propos**.

> **Capture attendue** — `reglages.png` : l'écran complet, sections visibles.
>
> **Capture attendue** — `reglages-langue.png` : la modale de langue.

## Les filtres d'UE

Un filtre masque les cours d'une UE dans le **planning des groupes favoris uniquement**
([planning.md](planning.md)). La modale propose deux moyens d'en ajouter un :

- **saisie libre** d'un code, mis en majuscules automatiquement ;
- **sélection dans la liste** des UE réellement rencontrées, alimentée par
  `PlanningDataManager.getAvailableUEs()` — celle-ci se remplit à mesure que des plannings sont
  chargés, par extraction du code d'UE des matières.

Les filtres sont stockés dans `settings.filters` et diffusés par l'événement `filter`, auquel
`RootContainer` et l'écran Réglages sont abonnés.

Un filtre se retire aussi depuis la fiche d'un cours, via le bouton d'en-tête `FilterRemoveButton`.

> **Capture attendue** — `reglages-filtres.png` : la modale de gestion des filtres d'UE, avec des
> filtres actifs et la liste des UE suggérées.

## Les notifications de cours

```text
Interrupteur activé
  └─ NotificationManager.requestPermissionsAsync()
  └─ SettingsManager.setCourseNotificationsEnabled(true)
  └─ relecture du cache de la semaine courante  (<favoris>@Week<n>)
       └─ NotificationManager.scheduleCourseNotifications(data)
```

Le curseur de délai (`courseNotificationDelay`, en minutes) replanifie de la même façon à la fin du
geste, pas pendant.

`scheduleCourseNotifications`
([`NotificationService.ts`](../../src/shared/services/NotificationService.ts)) :

1. **annule toutes** les notifications programmées — c'est une reconstruction complète, pas un
   ajout ;
2. sort immédiatement si les rappels sont désactivés ;
3. aplatit les données reçues (jour ou semaine) en une liste de cours ;
4. ne garde que ceux dont l'heure de déclenchement (début moins le délai) est encore à venir ;
5. trie chronologiquement et **plafonne à 20 notifications**, pour rester sous la limite de l'OS
   (64 sur iOS) ;
6. compose le message : matière et salle, cette dernière déduite de la description par
   `extractRoomFromDescription` (recherche de « salle », « bât », « amphi », « cremi », avec repli
   positionnel).

La planification est aussi déclenchée depuis le planning lui-même, à chaque chargement du planning
favori. Réglages ne fait que forcer une reconstruction immédiate.

## La synchronisation calendrier

Portée par `SettingsManager.syncCalendar()`
([`AppCore.tsx`](../../src/shared/services/AppCore.tsx)).

```text
Activation
  ├─ permission calendrier demandée si nécessaire
  ├─ liste des calendriers du système chargée
  ├─ BackgroundFetch.registerTaskAsync('background-fetch', 12 h)
  └─ choix de la cible : un calendrier existant, ou un calendrier "UKit" dédié

syncCalendar()
  ├─ crée le calendrier "UKit" au premier passage si c'est la cible
  ├─ PlanningApiService.fetchCalendarForSynchronization(premier groupe favori)
  │     └─ POST Celcat, année universitaire complète (août → août)
  ├─ pour chaque événement : mise à jour si connu, création sinon
  ├─ suppression des événements devenus obsolètes
  └─ écriture de previousSyncData / previousSyncTime
```

La table `previousSyncData` associe l'identifiant Celcat à l'identifiant de l'événement système :
c'est ce qui rend la synchronisation **idempotente**. Sans elle, chaque passage dupliquerait l'agenda.

La fenêtre synchronisée est l'**année universitaire** : du 1er août courant au 1er août suivant, avec
recul d'un an si l'on est avant août.

Création d'un calendrier dédié : sur iOS, une source locale ou iCloud est requise et recherchée parmi
les calendriers existants ; sur Android, une source locale est déclarée directement.

Changer de calendrier cible **supprime d'abord** tous les événements précédemment créés
(`deleteAllPreviousCalendarEntries`), pour ne pas laisser d'orphelins.

> **Capture attendue** — `reglages-calendrier.png` : la modale de choix du calendrier, montrant le
> calendrier UKit dédié et les calendriers existants.

## L'écran À propos

[`AboutScreen.tsx`](../../src/features/Settings/screens/AboutScreen.tsx) — sections d'information et
liens externes, tous issus de [`urls.ts`](../../src/shared/constants/urls.ts) :

historique de l'application, source des données, contact (site UKit, site KAE Lab), crédits des API
tierces (Affluences, Croustillant), et mentions légales pointant vers
[`PRIVACY.md`](../../PRIVACY.md).

C'est l'endroit où créditer une nouvelle source de données tierce.

> **Capture attendue** — `reglages-apropos.png` : l'écran À propos, sections déroulées.

## Décisions de conception

**L'écran ne détient pas la vérité, il la reflète.** Chaque interrupteur lit `SettingsManager` à
l'initialisation de son état local, puis écrit dans le manager. L'état React n'est qu'un miroir pour
le rendu.

**La replanification des notifications passe par le cache, pas par le réseau.** Changer le délai ne
doit pas déclencher un appel Celcat : on relit la semaine courante déjà en cache. Si elle n'y est pas,
rien n'est replanifié — le prochain chargement du planning s'en chargera.

**La synchronisation ne porte que sur le premier groupe favori**
(`this._favoriteGroups[0]`). Synchroniser une agrégation de groupes produirait des doublons dans
l'agenda pour les cours communs.

**`resetSettings` est volontairement partielle** : elle remet à zéro les préférences d'affichage et
les favoris de planning, mais ne touche ni aux caches, ni aux favoris Campus, ni au SecureStore. Voir
les limites.

## Vérifier

- Changer la langue : l'interface **et** les dates doivent basculer immédiatement.
- Basculer le mode sombre et parcourir les quatre onglets.
- Ajouter un filtre d'UE, revenir au planning favori : les cours correspondants doivent disparaître ;
  le retirer depuis la fiche d'un cours doit les faire réapparaître.
- Activer les notifications, régler le délai, vérifier avec le [mock temporel](../qualite.md) qu'une
  notification arrive bien avant un cours.
- Activer la synchronisation, choisir « UKit » : le calendrier doit être créé et peuplé. Relancer une
  synchronisation : aucun doublon.
- Changer de calendrier cible : les événements de l'ancien doivent avoir disparu.
- Réinitialiser l'application : le parcours d'accueil doit réapparaître.

## Limites connues

- **Ouvrir l'écran sans permission calendrier déclenche `toggleCalendarSync()`.** Dans
  `componentDidMount`, l'absence de permission appelle la même fonction que l'interrupteur : la
  permission est demandée, et si elle est accordée, l'état de synchronisation **bascule** au lieu de
  rester tel quel.
- **`syncCalendar` sort sans réinitialiser son drapeau** quand `fetchCalendarForSynchronization`
  renvoie une valeur vide : `_isSynchronizingCalendar` reste à `true` et l'indicateur tourne jusqu'au
  redémarrage.
- **Aucun retour d'erreur de synchronisation.** Un échec réseau est indiscernable d'un agenda vide.
- **Vingt notifications au maximum**, sur la seule semaine en cache : les cours au-delà ne sont pas
  couverts tant que leur semaine n'a pas été consultée.
- **`extractRoomFromDescription` est heuristique.** Une description au format inattendu produit une
  salle absente ou fausse dans la notification.
- **Les titres de notification sont en dur en français** (« Cours dans N min ») —
  voir [i18n.md](../i18n.md).
- **`resetSettings` ne réinitialise pas tout** (caches de planning, favoris Campus, filtres de liste,
  session universitaire).
- **`SettingsScreen` est un composant à classe de 348 lignes** portant seize champs d'état.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`screens/SettingsScreen.tsx`](../../src/features/Settings/screens/SettingsScreen.tsx) | écran d'onglet : état des réglages, gestionnaires, assemblage des sections et des modales |
| [`screens/AboutScreen.tsx`](../../src/features/Settings/screens/AboutScreen.tsx) | À propos : historique, sources, contact, crédits, mentions légales |
| [`components/SettingsSections.tsx`](../../src/features/Settings/components/SettingsSections.tsx) | les cinq sections : affichage, thème, notifications, lancement, calendrier |
| [`components/SettingsModals.tsx`](../../src/features/Settings/components/SettingsModals.tsx) | modales : langue, filtres d'UE, réinitialisation, choix du calendrier |
