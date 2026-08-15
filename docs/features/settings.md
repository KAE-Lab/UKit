# Réglages

Le quatrième onglet : préférences d'affichage, filtres d'UE, notifications de cours, synchronisation
avec le calendrier du système, réinitialisation, et écran À propos.

Tout l'état de cet onglet est porté par `SettingsManager`
([donnees-et-persistance.md](../donnees-et-persistance.md)) : l'écran n'est qu'une surface de pilotage.

## Parcours utilisateur

L'écran est une suite de sections empilées, sous un titre qui s'efface au défilement :

| Section | Contenu |
|---|---|
| **Établissement** | l'université sélectionnée (modale de choix, avec confirmation) |
| **Affichage** | langue (modale à trois choix), filtres d'UE (modale de gestion) |
| **Thème** | interrupteur mode sombre |
| **Notifications** | interrupteur des rappels de cours, curseur de délai |
| **Lancement** | ouvrir sur le groupe favori, réinitialiser l'application |
| **Calendrier** | interrupteur de synchronisation, choix du calendrier cible, date de dernière synchronisation |

Le bouton d'action de la barre d'onglets mène à **À propos**.

> **Capture attendue** — `reglages.png` : l'écran complet, sections visibles.
>
> **Capture attendue** — `reglages-langue.png` : la modale de langue.
>
## Changer d'établissement

L'entrée est **en première position**, et pas par courtoisie : c'est le réglage dont tous les autres
dépendent — les groupes, le planning, la session universitaire, les points de balayage des
bibliothèques. Le nom affiché à droite vient du **catalogue** et n'est pas traduit ; c'est une donnée,
comme le nom d'un calendrier système trois sections plus bas
([6-G](../phase-6/6-g-etablissements.md)).

![La modale d'établissement et sa confirmation : la liste des universités, puis l'écran qui annonce ce que la bascule effacera](../screenshots/reglages-etablissement.png)

La modale a **deux temps** : la liste, puis une confirmation qui annonce ce qui sera effacé. Une
bascule immédiate au premier toucher rendrait ce coût invisible jusqu'à ce qu'il soit payé. Toucher
l'établissement **déjà actif** ne déclenche rien — il n'y a rien à purger, et une confirmation pour un
non-changement apprend à la valider sans la lire.

Ce que la bascule efface, et **par quel chemin** — les deux ne sont pas au même endroit, et les
confondre a coûté un défaut :

| Effacé | Par | Pourquoi |
|---|---|---|
| `groupList`, `groupListTimestamp`, `groups` | [`purge.ts`](../../src/shared/etablissements/purge.ts) | ce sont des identifiants d'une université |
| **les groupes favoris et les filtres d'UE** | [`SettingsManager.purgerReglagesEtablissement()`](../../src/shared/services/AppCore.tsx) | ils nomment des groupes et des UE d'une université, mais vivent dans le document de réglages — que `purge.ts` ne connaît pas, et ne doit pas connaître |
| les caches de planning (`…@Week…`, `…@AAAA/MM/JJ`) | `purge.ts` | un planning gardé s'afficherait sous une autre fac sans que rien ne le dise |
| `buildingList`, `buildingListTimestamp`, la surcouche `batiments@1`, les favoris de salles libres | `purge.ts` | les bâtiments sont reconstruits depuis les salles de **cette** université |
| les identifiants et les données froides du trousseau | `purge.ts` | ils appartiennent au portail quitté |

> **La deuxième ligne de ce tableau a été fausse pendant deux jalons.** Ce document annonçait
> l'effacement des favoris depuis le jalon 6-G ; le code ne le faisait pas — `resetSettings` les
> effaçait, la bascule non. Personne ne l'a vu parce que le défaut n'avait aucun symptôme : tant que
> Bordeaux INP n'avait pas d'emploi du temps, des favoris bordelais restés en place ne rencontraient
> jamais rien. Le jalon [6-I](../phase-6/6-i-planning-universel.md) lui en a donné un, et l'onglet
> Planning s'est mis à annoncer « ce groupe n'existe plus » pour un groupe qui existe parfaitement —
> à l'université qu'on venait de quitter. Une documentation en avance sur son code ne se distingue
> pas d'une documentation juste, et c'est ce qui rend ce genre d'écart cher.

Ce qui **reste**, et c'est délibéré : les favoris de restaurants et de bibliothèques. Ils pointent
Croustillant et Affluences, deux sources **nationales** — un étudiant qui passe d'une fac bordelaise à
l'autre garde la même bibliothèque préférée, et la lui effacer serait une régression déguisée en
propreté.

La purge court **avant** la sélection, jamais après : jouée après, elle courrait contre les écrans qui
se rechargent déjà sur le nouvel établissement, et l'un d'eux réécrirait ce qu'on efface.

**La réinitialisation passe par la même porte**, et c'est une correction du jalon 6-G. Elle n'avait
jamais touché au trousseau ; ce n'était pas faux tant que l'application ne connaissait qu'une
université, mais elle rouvre le parcours d'accueil — donc le choix de l'établissement — et quelqu'un
pouvait repartir sur une autre fac **en restant connecté au portail de la précédente**. Deux gestes
qui effacent la même chose ne doivent pas avoir deux définitions de « la même chose ».

**Le changement se propage aux écrans déjà montés**, et il a fallu le faire explicitement. Le code de
l'établissement passe par `AppContext` ([`AppCore.tsx`](../../src/shared/services/AppCore.tsx)), à côté
du thème et des groupes favoris : sans ça, un onglet monté ne rendait pas à nouveau et gardait l'état
de l'université précédente — la section des salles libres restait masquée après un retour à Bordeaux.
Le contexte de scolarité, lui, s'abonne directement à l'événement pour **oublier ce qu'il garde en
mémoire** : il est monté au-dessus de toute la pile, il ne se démonte donc pas à la bascule, et
l'onglet affichait encore le prénom de l'étudiant de l'autre fac alors que le trousseau était déjà
vide. Les deux ont été trouvés sur appareil.

**Un établissement retiré du catalogue ne bascule personne.** La politique de lecture le fait
disparaître de la liste ; l'appareil de quelqu'un qui l'avait choisi continue sur ce qu'il en sait et
affiche une phrase sous l'entrée. Basculer d'office au milieu d'une année serait pire que prévenir.

« Ce qu'il en sait » est littéral : le rafraîchissement **reporte** l'établissement sélectionné depuis
le cache précédent quand la base ne le publie plus. Sans ce report, il cessait de résoudre et
l'application retombait sur l'établissement historique — une bascule silencieuse, mesurée sur
appareil. Le report ne pouvant rien quand le cache a perdu l'entrée (réinstallation), l'avertissement
couvre **les deux causes** : reporté, ou irrésoluble. Le repli reste possible ; il n'est plus muet.

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
  │     └─ Blueprint ukit.celcat.annee, année universitaire complète (août → août)
  ├─ pour chaque événement : mise à jour si connu, création sinon
  ├─ suppression des événements devenus obsolètes
  └─ écriture de previousSyncData / previousSyncTime
```

La table `previousSyncData` associe l'identifiant Celcat à l'identifiant de l'événement système :
c'est ce qui rend la synchronisation **idempotente**. Sans elle, chaque passage dupliquerait l'agenda.

La fenêtre synchronisée est l'**année universitaire** : du 1er août courant au 1er août suivant, avec
recul d'un an si l'on est avant août. Ses deux bornes sont **calculées par le service** et passées en
entrée au Blueprint : savoir de quel côté du 1er août on se trouve demande l'heure courante, ce qui
rendrait le fichier non rejouable, donc non vérifiable ([blueprints.md](../blueprints.md)).

Deux propriétés de ce run, depuis le jalon [6-E](../phase-6/6-e-planning.md) :

- **il part d'une tâche de fond, sans écran.** Aucun `confirm` ne doit donc entrer dans ce Blueprint :
  personne ne l'écouterait, et la politique de délai le refuserait ;
- **son délai est relevé à 60 s** (`options.timeout_ms`). La réponse pèse environ 200 Ko pour une
  année, et un délai dépassé dans une tâche qui tourne toutes les 12 h coûte un cycle entier.

Un échec laisse le calendrier **tel quel** et repassera au cycle suivant : purger des événements déjà
posés sur la foi d'une source injoignable serait pire que ne rien faire.

> **Non vérifié à ce jour : la tâche de fond application fermée.** La synchronisation manuelle a été
> jouée après la migration du jalon [6-E](../phase-6/6-e-planning.md) et rend les mêmes événements,
> aux mêmes dates, sans doublon. Le passage automatique toutes les 12 h avec l'application tuée, lui,
> n'a pas été observé — il demande d'attendre une nuit ou de déclencher `BackgroundFetch` depuis
> Xcode. Les deux chemins appellent le même objet de service, donc le risque est faible, mais il
> n'est pas nul : c'est le seul endroit où un run part sans écran, et un `confirm` qui s'y glisserait
> bloquerait la tâche sans que personne le voie.

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
- Réinitialiser l'application : le parcours d'accueil doit réapparaître, **et l'onglet Scolarité doit
  redemander les identifiants**. La sonde est celle qui a révélé le défaut, en vérifiant le jalon
  6-G : on revenait sur l'accueil en restant connecté.

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
- **`resetSettings` ne réinitialise toujours pas tout** : les favoris de restaurants et de
  bibliothèques et leurs filtres de liste survivent. Ils pointent des sources **nationales**, et c'est
  la même règle qu'au changement d'établissement — mais pour une réinitialisation, l'argument est plus
  faible : quelqu'un qui efface tout s'attend probablement à ce que tout parte. À trancher un jour, et
  écrit ici en attendant.
- **`SettingsScreen` est un composant à classe de 348 lignes** portant seize champs d'état.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`screens/SettingsScreen.tsx`](../../src/features/Settings/screens/SettingsScreen.tsx) | écran d'onglet : état des réglages, gestionnaires, assemblage des sections et des modales |
| [`screens/AboutScreen.tsx`](../../src/features/Settings/screens/AboutScreen.tsx) | À propos : historique, sources, contact, crédits, mentions légales |
| [`components/SettingsSections.tsx`](../../src/features/Settings/components/SettingsSections.tsx) | les six sections : établissement, affichage, thème, notifications, lancement, calendrier |
| [`components/SettingsModals.tsx`](../../src/features/Settings/components/SettingsModals.tsx) | modales : langue, filtres d'UE, réinitialisation, choix du calendrier |
| [`components/SettingsInstitutionPopup.tsx`](../../src/features/Settings/components/SettingsInstitutionPopup.tsx) | la modale d'établissement : la liste, puis la confirmation de ce qui sera effacé |
