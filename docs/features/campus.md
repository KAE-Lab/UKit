# Campus — socle et tableau de bord

L'onglet Campus regroupe tout ce qui concerne la vie sur le campus, en quatre sous-domaines
documentés séparément :

| Sous-domaine | Document |
|---|---|
| Restaurants universitaires | [campus-crous.md](campus-crous.md) |
| Bibliothèques universitaires | [campus-bibliotheques.md](campus-bibliotheques.md) |
| Salles libres | [campus-salles-libres.md](campus-salles-libres.md) |
| Vie étudiante (annonces) | [campus-vie-etudiante.md](campus-vie-etudiante.md) |

Le présent document décrit ce qu'ils **partagent** : le tableau de bord, le socle de liste, les hooks
communs et les services transverses.

## Parcours utilisateur

L'onglet ouvre sur un **tableau de bord** composé de quatre sections empilées, chacune présentant un
aperçu horizontal de son domaine et un bouton « voir tout » menant à l'écran de liste complet. Les
sections sont ordonnées par priorité éditoriale : annonces, restaurants, bibliothèques, salles libres.

Chaque écran de liste offre la même mécanique : recherche textuelle, filtre par catégorie accessible
depuis l'en-tête, mise en favori, tri automatique (favoris d'abord, puis par distance).

## Le tableau de bord

[`CampusDashboard.tsx`](../../src/features/Campus/Dashboard/CampusDashboard.tsx) est délibérément
mince : il pose l'en-tête animé, résout **une seule fois** la position de l'utilisateur, et transmet
les coordonnées à ses sections.

```text
CampusDashboard
  ├─ useCampusLocation().fetchLocation()      une requête GPS pour tout l'onglet
  └─ Animated.ScrollView
       ├─ BdeSection                          useBdeAnnonces()
       ├─ CrousSection      (lat, lon)        useCrousRestaurants()
       ├─ LibrarySection    (lat, lon)        useNearbyLibraries()   + bandeau si partiel
       └─ FreeRoomSection   (lat, lon)        CampusDataManager.getBuildingList()
```

**Chaque section charge ses propres données.** C'est une entorse assumée au principe « un composant
ne va pas chercher ses données » ([conventions.md](../conventions.md)) : elle rend les sections
indépendantes et permet à l'une d'échouer sans priver l'utilisateur des trois autres. La position,
elle, est mutualisée — c'est la ressource coûteuse et intrusive, on ne la demande qu'une fois.

**Une section et sa liste complète partagent leur hook.** Le carrousel du tableau de bord et l'écran
dédié lisent la même source avec la même machinerie — chargement, échec, nouvel essai. L'écrire une
fois évite qu'ils divergent : c'est le motif posé par `useBdeAnnonces` en
[6-B](../phase-6/6-b-supabase.md), étendu aux restaurants et aux bibliothèques en
[6-D](../phase-6/6-d-campus.md). Un échec reste **discret** sur le tableau de bord — le carrousel
disparaît, le journal dit pourquoi — et **explicite** sur l'écran dédié, qui a la place de le dire.

Chaque section suit le même gabarit : un titre, un bouton « voir tout », une liste horizontale de
cartes, et un état de chargement propre.

> **Capture attendue** — `campus-dashboard.png` : le tableau de bord, les quatre sections peuplées.

## Le socle de liste

[`CampusListLayout.tsx`](../../src/features/Campus/components/CampusListLayout.tsx) est le composant
générique dont dérivent les trois écrans de liste (CROUS, bibliothèques, salles libres). Il porte
l'intégralité de la mise en page commune :

| Responsabilité | Détail |
|---|---|
| Liste | `Animated.FlatList` avec rembourrage de zone sûre et de barre d'onglets |
| Chargement | indicateur centré tant que `loading` est vrai |
| Recherche | barre flottante en bas (`CampusSearchBar`), optionnelle via `hasSearch` |
| Filtres | icône dans l'en-tête + modale (`CampusFilterModal`), affichées si `filterOptions` est non vide |
| État vide | `CampusListEmptyState`, dont le message distingue « aucune donnée » de « aucun résultat pour ce filtre » |
| Défilement | `onAnimatedScroll` transmis, pour l'animation d'en-tête ([navigation.md](../navigation.md)) |

L'écran consommateur ne fournit que la donnée déjà filtrée et son `renderItem`. Un nouvel écran de
liste Campus **doit** passer par ce composant : c'est ce qui garantit que les quatre listes se
comportent identiquement.

> **Capture attendue** — `campus-liste-filtres.png` : la modale de filtres ouverte sur un écran de
> liste.
>
> **Capture attendue** — `campus-liste-vide.png` : l'état vide d'une liste dont le filtre ne renvoie
> rien.

[`useCampusListHeader.tsx`](../../src/features/Campus/components/hooks/useCampusListHeader.tsx)
complète le dispositif en installant l'icône de filtre dans l'en-tête, colorée différemment quand un
filtre est actif, et animée comme le reste de l'en-tête via `globalScrollValues`.

[`CampusCard.tsx`](../../src/features/Campus/components/CampusCard.tsx) est la carte de base : image
ou visuel de repli, titre, sous-titre, badge de distance, étoile de favori, contenu libre en enfant.
Les quatre types d'éléments (restaurant, BU, bâtiment, annonce) l'habillent différemment.

## Les hooks partagés

### `useCampusLocation`

[`useCampusLocation.ts`](../../src/features/Campus/hooks/useCampusLocation.ts) — obtient la position
de l'utilisateur, avec une stratégie en trois temps :

1. demande de permission d'accès en avant-plan ;
2. `getLastKnownPositionAsync()` d'abord — instantané, suffisant pour calculer une distance à
   quelques centaines de mètres près ;
3. `getCurrentPositionAsync({ accuracy: Balanced })` seulement si aucune position récente n'existe.

**Repli systématique sur Talence (44.8048, −0.5954)** si la permission est refusée ou si la
localisation échoue. C'est ce qui permet de tester sur émulateur et de garder l'écran utile pour un
étudiant qui refuse la géolocalisation : les distances sont alors calculées depuis le campus
principal, et l'écran reste exploitable au lieu d'être vide.

### `useFavorites`

[`useFavorites.ts`](../../src/features/Campus/hooks/useFavorites.ts) — liste d'identifiants persistée
sous la clé passée en paramètre (`crous_favorites`, `library_favorites`, `freeroom_favorites`).
Rechargée à chaque prise de focus (`useFocusEffect`), pour qu'un changement fait sur l'écran de détail
soit visible au retour sur la liste.

### `useSavedFilter`

[`useSavedFilter.ts`](../../src/features/Campus/hooks/useSavedFilter.ts) — filtre courant persisté,
chargé une fois au montage. Retourne un couple `[valeur, setter]` façon `useState`, ce qui rend son
adoption transparente.

## Services transverses

| Service | Rôle |
|---|---|
| [`CampusApiService.ts`](../../src/features/Campus/services/CampusApiService.ts) | Celcat côté salles : liste des salles (`resType=102`), reconstruction des bâtiments, occupation d'une journée |
| [`CampusDataManager.ts`](../../src/features/Campus/services/CampusDataManager.ts) | manager observable : liste des bâtiments en cache 7 jours |
| [`CrousService.ts`](../../src/features/Campus/services/CrousService.ts) | API Croustillant |
| [`LibraryService.ts`](../../src/features/Campus/services/LibraryService.ts) | API Affluences |
| [`BdeService.ts`](../../src/features/Campus/services/BdeService.ts) | annonces jsDelivr |
| [`FreeRoomService.ts`](../../src/features/Campus/services/FreeRoomService.ts) | contrats des salles libres et calcul de distance |

## Décisions de conception

**La distance est toujours recalculée localement.** Les fournisseurs renvoient parfois une distance,
mais relative à leur propre point de référence. Une formule de Haversine locale est appliquée dans les
trois services concernés, à partir de la position réelle.

**Le tri est uniforme** sur les trois listes : favoris d'abord, puis distance croissante. Il est
appliqué dans un `useMemo` avant le filtrage, jamais dans le rendu.

**Aucune donnée Campus n'est mise en cache**, à l'exception de la liste des bâtiments. Affluence,
menus, annonces et occupation sont rechargés à chaque montage : une valeur périmée serait pire qu'un
temps de chargement.

## Vérifier

- Ouvrir l'onglet Campus avec la géolocalisation autorisée : les quatre sections doivent se remplir,
  les distances être plausibles.
- Refuser la géolocalisation : les listes doivent rester peuplées, les distances calculées depuis
  Talence.
- Mettre un élément en favori depuis la liste, revenir au tableau de bord : l'étoile doit être à jour.
- Appliquer un filtre, quitter l'écran, y revenir : le filtre doit être conservé.
- Mode avion : chaque section doit afficher un état vide propre, sans plantage.

## Limites connues

- **Treize libellés d'interface s'affichent en majuscules brutes** (`ALL_ESTABLISHMENTS`, `RESTO_U`,
  `NO_RESULTS`…). Les clés sont invoquées avec un transtypage qui contourne la vérification de type et
  ne sont définies dans aucun dictionnaire. Détail et liste complète dans [i18n.md](../i18n.md).
- **Quatre chargements réseau concurrents au montage du tableau de bord**, chacun potentiellement
  multiple (les bibliothèques lancent à elles seules douze requêtes de découverte, plus une par site
  pour l'affluence). L'onglet est le plus coûteux de l'application au démarrage.
- **La position est résolue deux fois par écran de liste** : une fois par le tableau de bord, une
  autre par l'écran de liste quand on l'ouvre.
- **`getDistanceInKm` est dupliquée trois fois** — dans `CrousService`, `LibraryService` et
  `FreeRoomService` — avec un corps identique.
- **`CampusListLayout` désactive la règle `complexity`** : le composant accumule les options.
- Les sections du tableau de bord n'ont **pas d'état d'erreur distinct** de l'état vide.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`Dashboard/CampusDashboard.tsx`](../../src/features/Campus/Dashboard/CampusDashboard.tsx) | écran d'onglet : en-tête animé, résolution unique de la position, empilement des sections |
| [`Dashboard/components/BdeSection.tsx`](../../src/features/Campus/Dashboard/components/BdeSection.tsx) | section annonces : chargement, liste horizontale, accès à la liste complète |
| [`Dashboard/components/CrousSection.tsx`](../../src/features/Campus/Dashboard/components/CrousSection.tsx) | section restaurants |
| [`Dashboard/components/CrousSectionCard.tsx`](../../src/features/Campus/Dashboard/components/CrousSectionCard.tsx) | carte large d'un restaurant dans le carrousel du tableau de bord |
| [`Dashboard/components/LibrarySection.tsx`](../../src/features/Campus/Dashboard/components/LibrarySection.tsx) | section bibliothèques : liste + affluence par site |
| [`Dashboard/components/LibrarySectionCard.tsx`](../../src/features/Campus/Dashboard/components/LibrarySectionCard.tsx) | carte d'une BU avec son indicateur d'affluence |
| [`Dashboard/components/FreeRoomSection.tsx`](../../src/features/Campus/Dashboard/components/FreeRoomSection.tsx) | section salles libres : déclenche le chargement des bâtiments si le cache est vide |
| [`Dashboard/components/FreeRoomSectionCard.tsx`](../../src/features/Campus/Dashboard/components/FreeRoomSectionCard.tsx) | carte d'un bâtiment |
| [`components/CampusListLayout.tsx`](../../src/features/Campus/components/CampusListLayout.tsx) | socle générique des écrans de liste : liste, recherche, filtres, états |
| [`components/CampusLayoutComponents.tsx`](../../src/features/Campus/components/CampusLayoutComponents.tsx) | `CampusSearchBar`, `CampusFilterModal`, `CampusListEmptyState`, `CampusFailureNotice`, `CampusPartialNotice` |
| [`components/CampusCard.tsx`](../../src/features/Campus/components/CampusCard.tsx) | carte de base commune aux quatre types d'éléments |
| [`components/hooks/useCampusListHeader.tsx`](../../src/features/Campus/components/hooks/useCampusListHeader.tsx) | installe l'icône de filtre animée dans l'en-tête de l'écran |
| [`hooks/useCampusLocation.ts`](../../src/features/Campus/hooks/useCampusLocation.ts) | position de l'utilisateur, avec repli sur Talence |
| [`hooks/useCampusPosition.ts`](../../src/features/Campus/hooks/useCampusPosition.ts) | la même position, résolue une fois et rendue en état, pour les écrans de liste |
| [`hooks/useCrousRestaurants.ts`](../../src/features/Campus/hooks/useCrousRestaurants.ts) | restaurants : chargement, échec, nouvel essai — partagés par la liste et le carrousel |
| [`hooks/useNearbyLibraries.ts`](../../src/features/Campus/hooks/useNearbyLibraries.ts) | bibliothèques et affluences, plus la couverture du balayage |
| [`hooks/useFavorites.ts`](../../src/features/Campus/hooks/useFavorites.ts) | favoris persistés, rechargés au focus |
| [`hooks/useSavedFilter.ts`](../../src/features/Campus/hooks/useSavedFilter.ts) | filtre de liste persisté |
| [`services/CampusApiService.ts`](../../src/features/Campus/services/CampusApiService.ts) | Celcat salles : liste, reconstruction des bâtiments, occupation journalière |
| [`services/CampusDataManager.ts`](../../src/features/Campus/services/CampusDataManager.ts) | manager observable des bâtiments, cache 7 jours |
