# Campus — salles libres

Trouver une salle inoccupée dans un bâtiment en accès libre, à une heure donnée, en croisant
l'occupation Celcat avec les horaires d'ouverture du bâtiment.

Socle commun : [campus.md](campus.md). Sources : Celcat (section 1 de
[sources-externes.md](../sources-externes.md)) et
[`assets/locations.json`](../../assets/locations.json) ([cartographie.md](../cartographie.md)).

## Parcours utilisateur

1. La section du tableau de bord présente les bâtiments en accès libre, triés par distance.
2. « Voir tout » ouvre la liste : recherche par nom de bâtiment, mise en favori.
3. Toucher un bâtiment ouvre sa fiche : sélecteur d'heure en bandeau, et la liste des salles libres à
   cette heure, avec pour chacune la durée de disponibilité restante.

> **Capture attendue** — `salles-libres-liste.png` : la liste des bâtiments en accès libre.
>
> **Capture attendue** — `salles-libres-detail.png` : la fiche d'un bâtiment en journée, sélecteur
> d'heure et créneaux disponibles.
>
> **Capture attendue** — `salles-libres-ferme.png` : l'état fermé, hors horaires d'ouverture ou
> pendant les vacances.

## Flux de données

```text
CampusDataManager.loadData()                     au démarrage de l'application
  └─ CampusApiService.fetchRoomList()            GET ReadResourceListItems (resType=102)
  └─ CampusApiService.extractBuildingsFromRooms()
       └─ croisement avec locations.json (freeAccess === true)
  └─ AsyncStorage 'buildingList' (cache 7 jours)

FreeRoomScreen
  └─ CampusDataManager.getBuildingList() + distance depuis la position
  └─ CampusListLayout → FreeRoomListItem

FreeRoomDetailsScreen (params : building)
  └─ useFreeRoomsData(building)
       ├─ horaires du jour depuis building.schedule → liste d'heures sélectionnables
       ├─ une requête d'occupation par salle, en parallèle :
       │    CampusApiService.fetchRoomsScheduleDay([roomId], aujourd'hui)
       │    └─ POST Celcat GetCalendarData (resType=102, agendaDay)
       └─ calculateFreeRooms() → créneaux libres triés
```

## Reconstruction des bâtiments

Celcat expose des salles, pas des bâtiments. `extractBuildingsFromRooms` reconstitue la hiérarchie :

1. Sélection des clés de `locations.json` portant `freeAccess: true` — c'est le **référentiel des
   bâtiments éligibles**, pas Celcat.
2. Pour chaque salle Celcat, recherche du code de bâtiment dans son nom, par expression régulière de
   mot entier (`\bA28\b`, insensible à la casse) avec repli sur une inclusion simple.
3. Nettoyage du nom : retrait du suffixe entre parenthèses, puis troncature à partir du mot « salle »
   — `A28 - Salle 001 (Informatique)` devient `Salle 001`. Le nom complet est conservé dans
   `fullName`.
4. Les salles contenant « en attente » sont ignorées ; les bâtiments sans salle sont écartés ; le
   résultat est trié alphabétiquement.

## Calcul des créneaux libres

`calculateFreeRooms` ([`useFreeRoomsData.ts`](../../src/features/Campus/FreeRoom/hooks/useFreeRoomsData.ts))
est une fonction pure, exportée séparément du hook :

Pour chaque salle du bâtiment, à l'heure sélectionnée :

- la salle est **occupée** si un événement l'englobe (`début <= heure < fin`) ;
- sinon, on cherche le **prochain** événement pour borner la disponibilité ; sans événement suivant,
  la borne est l'heure de fermeture du bâtiment ;
- un créneau de **moins de 15 minutes est écarté** — trop court pour être utile ;
- le tri final privilégie la durée décroissante, puis le nom de salle.

La liste d'heures sélectionnables est construite depuis `building.schedule[jour ISO]` : une entrée par
heure pleine, de l'ouverture à la fermeture, avec **retrait de la dernière heure** quand la fermeture
tombe pile (`22:00` produit une liste s'arrêtant à `21:00` — il ne sert à rien de proposer un créneau
qui commence à la fermeture). L'heure courante est présélectionnée si elle est dans la plage, sinon la
première ou la dernière selon qu'on est avant l'ouverture ou après la fermeture.

Un bâtiment est déclaré **fermé** si le jour courant n'a pas d'entrée dans `schedule`, ou si un
événement de vacances est détecté sur l'une de ses salles.

## Contrats

```ts
interface RoomInfo    { id: string; name: string; fullName: string; }

interface BuildingInfo {
    id: string;            // "bat_a28"
    name: string;          // "A28"
    rooms: RoomInfo[];
    imageUrl?: string;
    distance?: number;
    campus?: string;
    lat?: number;
    lng?: number;
    schedule?: CampusEvent[];   // voir limites
}

interface FreeRoomSlot {
    room: RoomInfo;
    availableUntil: string;     // "18:00"
    durationMinutes: number;
}

interface CampusEvent {         // CampusApiService
    id: string;
    starttime: string;          // "08:00"
    endtime: string;
    date: { start: string; end: string };
    description: string;
    isVacances: boolean;
}
```

## Décisions de conception

**Le référentiel d'éligibilité est local, pas distant.** Un bâtiment n'apparaît que si
`locations.json` le déclare `freeAccess`. C'est un choix de responsabilité : Celcat sait quelles
salles existent, seule l'équipe sait lesquelles sont réellement accessibles librement aux étudiants.

**Une requête d'occupation par salle**, lancées en parallèle par `Promise.all`. L'API accepterait
plusieurs identifiants dans `federationIds[]`, mais le découpage par salle permet à un échec isolé de
ne pas vider tout le bâtiment (chaque promesse rattrape son erreur et renvoie une liste vide).

**Le calcul est une fonction pure exportée.** `calculateFreeRooms` ne dépend d'aucun état React : elle
est testable et réutilisable indépendamment du hook.

## Vérifier

- Ouvrir la liste : le ou les bâtiments en accès libre doivent apparaître avec leur distance.
- Ouvrir une fiche en journée : le sélecteur doit être positionné sur l'heure courante, et les salles
  libres correspondre à la réalité.
- Sélectionner une heure de forte occupation : la liste doit se réduire.
- Ouvrir une fiche un dimanche, ou un jour sans horaires : l'état « fermé » doit s'afficher.
- Pendant les vacances universitaires : l'état « fermé » doit s'afficher via la détection
  `isVacances`.
- Mode avion : la liste des bâtiments doit rester disponible (cache 7 jours), l'occupation vide.

## Limites connues

- **Un seul bâtiment est éligible aujourd'hui.** `locations.json` compte 73 entrées, dont **une
  seule** porte `freeAccess: true` (`A28`, le CREMI). La fonctionnalité est donc opérationnelle mais
  son périmètre est minimal ; l'étendre ne demande que d'enrichir le fichier
  ([cartographie.md](../cartographie.md)).
- **`BuildingInfo.schedule` est typé `CampusEvent[]`** alors que le code y accède comme à un
  dictionnaire indexé par jour (`building.schedule[String(currentDay)]`, puis `.open` / `.close`). Le
  type ne décrit pas la donnée réelle, qui vient de `locations.json`.
- **`campus` vaut toujours `'Talence'`** : `extractBuildingsFromRooms` lit `loc.campus || 'Talence'`,
  or aucune entrée de `locations.json` ne porte ce champ.
- **Le jour est lu via `new Date()`**, que le [mock temporel](../qualite.md) ne modifie pas. Simuler
  une date ne change donc pas le jour d'ouverture retenu, seulement les données Celcat interrogées.
- **Les libellés de recherche et d'état vide s'affichent en majuscules brutes** (`SEARCH_BUILDING`,
  `NO_BUILDING_FOUND`, `NO_FREE_ROOMS`, `ROOMS`) — voir [i18n.md](../i18n.md).
- **[`FreeRoomService.ts`](../../src/features/Campus/services/FreeRoomService.ts) ne contient plus de
  service** : la classe exportée est vide (un commentaire annonce une intégration future avec un
  `batiments.json`). Le fichier ne sert plus qu'à porter les contrats et `getDistanceInKm`.
- **La correspondance salle → bâtiment est textuelle.** Un renommage côté Celcat peut rattacher une
  salle au mauvais bâtiment ou la faire disparaître.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`FreeRoom/FreeRoomScreen.tsx`](../../src/features/Campus/FreeRoom/FreeRoomScreen.tsx) | liste des bâtiments en accès libre : distance, tri, recherche, favoris |
| [`FreeRoom/FreeRoomDetailsScreen.tsx`](../../src/features/Campus/FreeRoom/FreeRoomDetailsScreen.tsx) | fiche d'un bâtiment : sélecteur d'heure et salles libres |
| [`FreeRoom/components/FreeRoomListItem.tsx`](../../src/features/Campus/FreeRoom/components/FreeRoomListItem.tsx) | ligne de liste d'un bâtiment |
| [`FreeRoom/components/FreeRoomDetailsComponents.tsx`](../../src/features/Campus/FreeRoom/components/FreeRoomDetailsComponents.tsx) | bandeau d'heures, carte de salle libre, états fermé et vide |
| [`FreeRoom/hooks/useFreeRoomsData.ts`](../../src/features/Campus/FreeRoom/hooks/useFreeRoomsData.ts) | chargement de l'occupation et `calculateFreeRooms` (fonction pure) |
| [`services/FreeRoomService.ts`](../../src/features/Campus/services/FreeRoomService.ts) | contrats `RoomInfo` / `BuildingInfo` / `FreeRoomSlot` et `getDistanceInKm` |
