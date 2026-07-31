# Campus — bibliothèques universitaires

Liste des BU de la région avec leur **affluence en temps réel**, leur état d'ouverture et leurs
horaires de la semaine.

Socle commun : [campus.md](campus.md). Source de données : Affluences, section 3 de
[sources-externes.md](../sources-externes.md).

## Parcours utilisateur

1. La section du tableau de bord présente les BU les plus proches avec leur pastille d'affluence.
2. « Voir tout » ouvre la liste : recherche par nom ou par ville, filtre « ouvertes uniquement »,
   mise en favori.
3. Toucher une BU ouvre sa fiche : jauge d'affluence, bandeau de dates, horaires du jour sélectionné,
   navigation de semaine en semaine.
4. Un bouton d'en-tête ouvre la carte de la bibliothèque.

> **Capture attendue** — `bu-liste.png` : la liste des BU, pastilles d'affluence de plusieurs couleurs
> si possible.
>
> **Capture attendue** — `bu-detail.png` : la fiche d'une BU ouverte, jauge d'affluence et horaires du
> jour.

## Flux de données

```text
LibraryScreen
  ├─ useCampusLocation().fetchLocation()
  ├─ LibraryService.fetchNearbyLibraries(lat, lng)
  │     └─ 12 × POST /app/v3/sites/map      balayage géographique, dédoublonné par id
  ├─ pour chaque BU : LibraryService.getAffluencesData(slug)
  │     └─ GET /app/v4/sites/{slug}/live-data
  ├─ tri : favoris d'abord, puis distance croissante
  └─ CampusListLayout → LibraryListItem

LibraryDetailsScreen  (params : library, affluence)
  └─ useLibraryTimetableData(library)
       └─ LibraryService.fetchLibraryTimetable(slug, weekOffset)
            └─ GET /app/v4/sites/{slug}/timetables?weekOffset=<n>
```

L'affluence de la liste est chargée en parallèle après la découverte des sites : la liste s'affiche
d'abord, les pastilles se remplissent ensuite.

## Contrats

```ts
interface LibraryInfo {
    id: string;
    name: string;           // primary_name du fournisseur
    campus: string;         // ville, à défaut le libellé CAMPUS
    lat: number;
    lng: number;            // noter "lng", pas "lon"
    slug: string;           // identifiant utilisé par les endpoints v4
    distance?: number;      // km, recalculé localement
    imageUrl?: string;
}

interface AffluencesData {
    isOpen: boolean;
    occupancyRate: number | null;   // pourcentage, null si non publié
    closingTime?: string;
    openingText?: string;           // "ouvre à 8h30"
}

interface TimetableEntry {
    day: string;
    isToday: boolean;
    openingHours: { openingHour: string; closingHour: string }[];
}
```

## Codes couleur d'affluence

`getLibraryStatus` ([`LibraryService.ts`](../../src/features/Campus/services/LibraryService.ts))
centralise la traduction d'une affluence en couleur et en libellé. C'est la seule source de vérité de
cette sémantique — ne pas la réimplémenter dans un composant.

| Condition | Couleur | Sens |
|---|---|---|
| fermée | `#f44336` rouge | quel que soit le taux |
| ouverte, taux `null` ou `< 50 %` | `#4caf50` vert | de la place |
| ouverte, taux `< 80 %` | `#ff9800` orange | se remplit |
| ouverte, taux `>= 80 %` | `#ff4436` rouge clair | pleine |

Un taux inconnu est traité comme « de la place » : afficher un avertissement sans donnée serait
trompeur.

## Décisions de conception

**Douze points de balayage plutôt qu'un.** L'endpoint de découverte ne renvoie que les sites proches
du point interrogé. Une seule requête depuis la position de l'étudiant masquerait les BU des autres
villes de la région. Les onze points fixes couvrent Bordeaux et les campus de Nouvelle-Aquitaine ;
ajouter une ville consiste à ajouter une coordonnée dans `scanPoints`.

**Le filtrage par catégorie (`id` 1 ou 20) est indispensable.** L'endpoint renvoie tous les types de
lieux gérés par le fournisseur — piscines, mairies, salles de sport. Sans ce filtre, la liste serait
inexploitable.

**La distance renvoyée par l'API est ignorée** quand les coordonnées du site sont disponibles :
`estimated_distance` est relative au point de balayage, pas à l'étudiant. Elle ne sert que de repli.

**Le taux d'occupation est lu à deux emplacements** (`liveAttendance.percentage` puis
`liveAttendance.occupancy`) : les deux formes coexistent selon les sites.

**Le filtre « ouvertes » considère qu'une BU sans donnée est ouverte** (`?? true`). Masquer une
bibliothèque parce que son affluence n'a pas encore été chargée serait un faux négatif visible.

## Vérifier

- Ouvrir la liste : des BU d'au moins deux villes doivent apparaître, la plus proche en tête.
- Vérifier les pastilles d'affluence en heure creuse puis en heure pleine : la couleur doit changer.
- Activer le filtre « ouvertes » en soirée : les BU fermées doivent disparaître.
- Ouvrir une fiche : la jauge, le jour courant présélectionné, et les horaires doivent être cohérents.
- Naviguer d'une semaine à l'autre dans la fiche : les horaires doivent se recharger.
- Mode avion : liste vide avec message, sans plantage.

## Limites connues

- **Douze requêtes de découverte à chaque ouverture**, plus une requête d'affluence par BU trouvée.
  C'est le chargement le plus lourd de l'application.
- **Les libellés de filtre et de recherche s'affichent en majuscules brutes** (`ALL_LIBRARIES`,
  `OPEN_LIBRARIES`, `SEARCH_BU_CITY`) — voir [i18n.md](../i18n.md).
- **Les points de balayage sont codés en dur** : une BU hors de leur portée reste invisible.
- **Les identifiants de catégorie (1, 20) et l'en-tête `x-service-name` sont des valeurs observées**,
  non documentées par le fournisseur.
- **Aucun cache** : la liste et les affluences sont rechargées à chaque montage.
- **`fetchNearbyLibraries` divise `estimated_distance` sans vérifier sa présence** dans la branche de
  repli ; un site sans coordonnées ni distance estimée produirait `NaN`.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`Library/LibraryScreen.tsx`](../../src/features/Campus/Library/LibraryScreen.tsx) | liste des BU : découverte, affluences, tri, filtres, recherche |
| [`Library/LibraryDetailsScreen.tsx`](../../src/features/Campus/Library/LibraryDetailsScreen.tsx) | fiche d'une BU : affluence, dates, horaires |
| [`Library/components/LibraryListItem.tsx`](../../src/features/Campus/Library/components/LibraryListItem.tsx) | ligne de liste d'une BU avec son état |
| [`Library/components/LibraryDetailsComponents.tsx`](../../src/features/Campus/Library/components/LibraryDetailsComponents.tsx) | `LibraryLiveAttendance`, `LibraryDatesHeader`, `LibraryOpeningHoursList` |
| [`Library/hooks/useLibraryTimetableData.ts`](../../src/features/Campus/Library/hooks/useLibraryTimetableData.ts) | horaires d'une BU : chargement par semaine, sélection du jour, défilement automatique |
| [`services/LibraryService.ts`](../../src/features/Campus/services/LibraryService.ts) | accès Affluences : découverte, affluence, horaires, `getLibraryStatus` |
