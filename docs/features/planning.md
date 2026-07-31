# Planning — emploi du temps

L'onglet historique et le cœur de l'application : consulter son emploi du temps universitaire, par
jour ou par semaine, pour un groupe donné ou pour l'agrégation de ses groupes favoris.

Source de données : Celcat, section 1 de [sources-externes.md](../sources-externes.md).

## Parcours utilisateur

1. À l'ouverture, l'onglet affiche le **planning agrégé des groupes favoris** pour la journée
   courante. Sans favori, un état vide invite à en chercher un.
2. Le bandeau supérieur porte un curseur horizontal de dates. Une année scolaire entière est
   parcourable (365 jours à partir du 1er août).
3. Le bouton de droite bascule **jour / semaine**. Le bouton de gauche revient à aujourd'hui ou à la
   semaine courante.
4. Toucher un cours ouvre sa fiche : matière, code d'UE, horaires, salle, carte du bâtiment, ajout au
   calendrier système.
5. Le bouton d'action à côté de la barre d'onglets ouvre la **recherche de groupes** : liste complète,
   sections alphabétiques, recherche, ajout aux favoris.

> **Capture attendue** — `planning-jour.png` : la vue jour, curseur de dates visible, sur une journée
> chargée.
>
> **Capture attendue** — `planning-semaine.png` : la vue semaine, avec ses sections repliables.
>
> **Capture attendue** — `planning-groupes.png` : la recherche de groupes et ses sections
> alphabétiques colorées.
>
> **Capture attendue** — `planning-cours-detail.png` : la fiche d'un cours localisé, avec sa carte.

## Flux de données

```text
DayView (état : jour/semaine sélectionnés, mode)
  └─ DayViewHeader        titre, navigation, curseur de dates
  └─ DayComponent / WeekComponent   =  withHeaderAnimation(ScheduleList)
       └─ ScheduleList
            ├─ isConnected()                    NetInfo
            ├─ PlanningApiService.fetchCalendarDay | fetchCalendarWeek
            │      └─ POST Celcat GetCalendarData
            ├─ AsyncStorage  <groupes>@date | <groupes>@Week<n>   (écriture si succès, lecture si échec)
            ├─ PlanningDataManager.extractUEsFromCourses          (alimente les filtres)
            ├─ CourseManager.computeCourseUE / filterCourse        (mode jour)
            ├─ NotificationManager.scheduleCourseNotifications     (si planning favori)
            └─ groupOverlappingCourses → CourseGroupCarousel → CourseRow
```

L'ordre est important : le réseau est tenté **en premier** dès qu'une connexion est détectée, le cache
n'intervient qu'en repli. Voir [donnees-et-persistance.md](../donnees-et-persistance.md).

### Recherche de groupes

```text
GroupSelectionScreen
  ├─ PlanningApiService.fetchGroupList()   GET ReadResourceListItems (resType=103)
  ├─ AsyncStorage 'groups'                 cache d'affichage, repli hors ligne
  └─ generateSections()                    regroupement par première lettre, couleur cyclique
```

`PlanningDataManager` maintient en parallèle la même liste sous la clé `groupList`, avec une
expiration de 7 jours, pour l'onboarding et les suggestions de filtres. Les deux caches coexistent et
ne sont pas synchronisés.

## Contrats

Définis dans [`PlanningApiService.ts`](../../src/features/Planning/services/PlanningApiService.ts).

```ts
interface PlanningEvent {
    id: string;
    style: string;               // attribut style HTML pré-composé (hérité)
    color: string;               // couleur brute Celcat
    schedule: string;            // "08:00-10:00 CM"
    starttime: string;           // "08:00"
    endtime: string;             // "10:00"
    date: { start: string; end: string };   // ISO
    subject: string;             // matière, code d'UE retiré
    description: string;         // lignes nettoyées, jointes par \n
    category: string;            // "CM", "TD", "TP"…
    group: string;
    toFilter?: string | null;    // sous-groupe déduit de la description
    day?: string;                // "Lundi 12/05" (vue semaine)
    dayNumber?: string;          // jour ISO 1-7 (vue semaine)
}

interface PlanningWeekDay {
    dayNumber: string;
    dayTimestamp: number;
    courses: PlanningEvent[];
}
```

`CourseData` ([`CourseCard.tsx`](../../src/features/Planning/components/CourseCard.tsx)) est le
sous-ensemble consommé par les composants d'affichage. Le champ `UE` y est ajouté à l'exécution par
`CourseManager.computeCourseUE`.

## Cache et persistance

| Clé | Contenu | Expiration |
|---|---|---|
| `<groupes>@YYYY/MM/DD` | `{ data, date }` — planning d'un jour | aucune, repli hors ligne |
| `<groupes>@Week<n>` | `{ data, date }` — planning d'une semaine | aucune, repli hors ligne |
| `groups` | `{ list, date }` — liste pour l'écran de recherche | aucune |
| `groupList` + `groupListTimestamp` | liste pour `PlanningDataManager` | 7 jours |

`<groupes>` vaut le nom du groupe, ou les favoris joints par `+` pour le planning agrégé. Quand le
cache est servi, un bandeau affiche sa date (`OFFLINE_DISPLAY_FROM_DATE`).

> **Capture attendue** — `planning-hors-ligne.png` : le bandeau de données en cache, en mode avion.
>
> **Capture attendue** — `planning-vide.png` : l'état vide quand aucun groupe n'est en favori.

## Décisions de conception

**Le planning agrégé est un `groupName` de type tableau.** `ScheduleScreen` reçoit `name` ; s'il
s'agit d'un tableau, il le remplace par `context.favoriteGroups`. Toute la chaîne — clé de cache,
requête `federationIds[]` multiple, activation des notifications, application des filtres UE —
distingue les deux cas par `Array.isArray(groupName)`. C'est le pivot du module : le modifier touche
tout le reste.

**Les filtres UE ne s'appliquent qu'au planning favori.** `CourseManager.filterCourse` renvoie `true`
sans condition quand `isFavorite` est faux. Consulter le planning d'un autre groupe montre donc tout,
volontairement : les filtres décrivent *ses* UE, pas celles d'autrui.

**Le jour et la semaine ne parsent pas la description pareil.** `parseEvent` reçoit `';'` en mode
jour et `'\n'` en mode semaine, parce que Celcat ne formate pas la description de la même façon selon
`calView`. Uniformiser casserait l'affichage des salles.

**La position dans le calendrier survit à la navigation.** `DayView.lastSelectedDay` et
`lastSelectedWeek` sont des propriétés **statiques de classe** : revenir sur l'onglet Planning
restitue le jour consulté, pas aujourd'hui. C'est délibéré et non persisté (remis à zéro au
redémarrage).

**Les cours qui se chevauchent deviennent un carrousel.**
[`groupOverlappingCourses`](../../src/features/Planning/components/ScheduleListUtils.ts) regroupe les
cours dont les plages se recoupent ; `CourseGroupCarousel` les rend en pages horizontales avec des
points de position. L'index consulté est mémorisé dans une `Map` de module, indexée par
`heure de début + matière`, pour que le défilement ne se réinitialise pas au rendu suivant.

> **Capture attendue** — `planning-cours-simultanes.png` : un créneau à plusieurs cours, points de
> pagination visibles.

**Les couleurs Celcat sont retraduites.** `theme.courses` associe les couleurs brutes du serveur
(`#FFFF00`, `#800040`…) à des teintes de la palette de l'application, avec un `default`. Afficher la
couleur brute donnerait des tons saturés incohérents avec le reste de l'interface.

**Le rechargement au focus n'existe qu'en mode jour.** `ScheduleList` s'abonne à l'événement `focus`
de la navigation uniquement si `mode === 'day'` : c'est la vue par défaut, celle qu'on veut à jour en
revenant dans l'application.

## Vérifier

- Ouvrir l'onglet sans favori : l'état vide et son bouton vers la recherche doivent s'afficher.
- Ajouter deux groupes en favori : le planning agrégé doit fusionner leurs cours et la clé de cache
  contenir les deux noms joints par `+`.
- Basculer jour / semaine, naviguer dans le curseur, revenir avec le bouton « aujourd'hui ».
- Ouvrir un cours ayant une salle connue : la carte doit apparaître ; en ouvrir un sans salle : la
  fiche doit rester correcte sans carte.
- Ajouter un cours au calendrier système et vérifier sa présence dans l'application Calendrier.
- **Hors ligne** : activer le mode avion, ouvrir un jour déjà consulté — le cache daté doit s'afficher
  avec son bandeau ; ouvrir un jour jamais consulté — la vue doit rester en chargement sans planter.
- Un dimanche, ou un jour sans cours : la carte « pas de cours » doit s'afficher.

## Limites connues

- **Le jeton d'annulation n'annule rien.** `ScheduleList` crée un `axios.CancelToken.source()`, le
  stocke et l'annule au démontage ou au changement de requête, mais **ne le transmet à aucun appel** :
  `PlanningApiService` ne l'accepte pas en paramètre. Une réponse tardive peut donc encore écrire dans
  l'état d'un composant démonté.
- **Un échec réseau sans cache laisse la vue en chargement.** Si `fetchedData` reste `null`, aucun
  `setState` final n'est effectué : `loading` demeure vrai et l'indicateur tourne indéfiniment.
- **`ScheduleList` importe `axios` directement**, seul écart au principe « le réseau vit dans les
  services » avec l'alerte de mise à jour.
- **Deux caches concurrents pour la liste des groupes** (`groups` et `groupList`), écrits par deux
  chemins différents et jamais réconciliés.
- **`computeScheduleWeek` est appelée au rendu**, pas au chargement : le calcul des UE et le filtrage
  de la vue semaine se rejouent à chaque rendu de `DayWeek`.
- **`ScheduleList` est un composant à classe de 341 lignes** qui mélange chargement, cache, calcul et
  rendu. C'est le fichier le plus dense du module.
- **La route `Day`** est déclarée dans la pile mais n'est atteinte par aucun appel de navigation.
- **Trois erreurs de typage** subsistent dans ce module (`TS2612` sur `context`) — voir
  [qualite.md](../qualite.md).

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`views/DayView.tsx`](../../src/features/Planning/views/DayView.tsx) | vue composite de l'onglet : état jour/semaine, génération des 365 jours et des semaines, défilement du curseur, bascule de mode |
| [`screens/ScheduleScreen.tsx`](../../src/features/Planning/screens/ScheduleScreen.tsx) | enveloppe routée : résout le groupe (favoris si tableau) et configure l'en-tête |
| [`screens/GroupSelectionScreen.tsx`](../../src/features/Planning/screens/GroupSelectionScreen.tsx) | recherche de groupes : chargement, cache, sections alphabétiques, filtrage |
| [`screens/CourseScreen.tsx`](../../src/features/Planning/screens/CourseScreen.tsx) | fiche d'un cours : détails, extraction de la salle, carte Leaflet intégrée |
| [`components/ScheduleList.tsx`](../../src/features/Planning/components/ScheduleList.tsx) | chargement et rendu d'un planning (jour ou semaine), cache, filtres, notifications |
| [`components/ScheduleListUtils.ts`](../../src/features/Planning/components/ScheduleListUtils.ts) | `groupOverlappingCourses` : regroupement des cours qui se chevauchent |
| [`components/DayViewHeader.tsx`](../../src/features/Planning/components/DayViewHeader.tsx) | bandeau collant : titre, boutons de navigation, curseurs jour et semaine |
| [`components/CalendarDay.tsx`](../../src/features/Planning/components/CalendarDay.tsx) | pastille d'un jour dans le curseur |
| [`components/CalendarWeek.tsx`](../../src/features/Planning/components/CalendarWeek.tsx) | pastille d'une semaine dans le curseur |
| [`components/CourseCard.tsx`](../../src/features/Planning/components/CourseCard.tsx) | point d'entrée du module carte : type `CourseData` et réexports |
| [`components/CourseRow.tsx`](../../src/features/Planning/components/CourseRow.tsx) | carte d'un cours : couleur, matière, UE, horaires, description, état « pas de cours » |
| [`components/CourseGroupCarousel.tsx`](../../src/features/Planning/components/CourseGroupCarousel.tsx) | carrousel paginé des cours simultanés, avec mémorisation de l'index |
| [`components/CalendarNewEventPrompt.tsx`](../../src/features/Planning/components/CalendarNewEventPrompt.tsx) | modale d'ajout d'un cours au calendrier système (permissions, calendrier par défaut) |
| [`components/DayWeekCollapsible.tsx`](../../src/features/Planning/components/DayWeekCollapsible.tsx) | section repliable d'un jour dans la vue semaine, avec résolution tolérante de la date |
| [`components/GroupSelectionComponents.tsx`](../../src/features/Planning/components/GroupSelectionComponents.tsx) | en-tête de section et ligne de groupe de l'écran de recherche |
| [`services/PlanningApiService.ts`](../../src/features/Planning/services/PlanningApiService.ts) | accès Celcat : liste des groupes, calendrier jour / semaine / année, parsing des événements |
| [`services/PlanningDataManager.ts`](../../src/features/Planning/services/PlanningDataManager.ts) | manager observable : liste des groupes en cache 7 jours, extraction des UE disponibles |
