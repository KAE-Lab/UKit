# Campus — socle et tableau de bord

L'onglet Campus regroupe tout ce qui concerne la vie sur le campus, en quatre sous-domaines
documentés séparément :

| Sous-domaine | Document |
|---|---|
| Restaurants universitaires | [campus-crous.md](campus-crous.md) |
| Bibliothèques universitaires | [campus-bibliotheques.md](campus-bibliotheques.md) |
| Salles libres | [campus-salles-libres.md](campus-salles-libres.md) |
| Annonces (section « Vie étudiante » jusqu'au 2026-08-30) | [campus-vie-etudiante.md](campus-vie-etudiante.md) |

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

## Une section vide dit pourquoi, et propose un geste

Un carrousel sans carte n'affichait **rien du tout** : un en-tête de section, son chevron, et le vide
en dessous. Ça se lit comme une application cassée — d'autant que la cause la plus fréquente est un
**filtre**, donc quelque chose que l'utilisateur a posé lui-même et peut défaire.
[`SectionEtatVide`](../../src/features/Campus/Dashboard/components/SectionEtatVide.tsx) distingue
trois causes, et surtout trois **gestes** :

| Cause | Ce qui s'affiche | Le geste |
|---|---|---|
| le filtre masque tout | « Tout est masqué par ton filtre. » | **Tout afficher**, ici même |
| la source a échoué | le **titre** de la famille d'échec, « Service indisponible » | **Réessayer** si la famille le justifie, sinon **Voir tout** vers l'écran dédié |
| il n'y a légitimement rien | « Aucun restaurant à proximité. » | aucun — il n'y en a pas |

La décision du tableau de bord ne change pas : **ce n'est pas ici qu'on explique une panne**, c'est
sur l'écran dédié, où vivent le message complet et le bouton Réessayer. Mais ne rien afficher n'était
pas « rester discret », c'était laisser croire à un bug. La ligne renvoie donc là où l'explication se
trouve.

Le bouton Réessayer n'apparaît que si la famille d'échec est réessayable : c'est la table de
[`failures.ts`](../../src/shared/aetherius/failures.ts) qui décide, pas la section.

Le bloc est une [`CampusNotice`](../../src/features/Campus/components/CampusLayoutComponents.tsx) —
le bandeau de couverture partielle, généralisé quand ce second usage est apparu. Il en existait en
réalité **trois copies** : celle-ci, le bandeau partiel, et une ligne d'échec propre aux annonces avec
son propre rayon et son propre rembourrage. Les quatre sections partagent maintenant la même. C'est une **ligne**,
pas un état plein écran : elle laisse la place à la donnée, alors qu'un `EmptyState` **est** l'écran.

## Le socle de liste

[`CampusListLayout.tsx`](../../src/features/Campus/components/CampusListLayout.tsx) est le composant
générique dont dérivent les trois écrans de liste (CROUS, bibliothèques, salles libres). Il porte
l'intégralité de la mise en page commune :

| Responsabilité | Détail |
|---|---|
| Liste | `Animated.FlatList` avec rembourrage de zone sûre et de barre d'onglets |
| Chargement | indicateur centré tant que `loading` est vrai |
| Recherche | barre flottante en bas (`CampusSearchBar`), optionnelle via `hasSearch` — et **affichée seulement s'il y a quelque chose à chercher** |
| Filtres | icône dans l'en-tête + modale (`CampusFilterModal`), affichées si `filterOptions` est non vide |
| État vide | `CampusListEmptyState` dans un [`ScreenState`](../../src/shared/ui/ScreenState.tsx), dont le message distingue « aucune donnée » de « aucun résultat pour ce filtre » |
| Grille | `numColumns` optionnel, une colonne par défaut. Les annonces rangent leurs affiches à deux par rangée ; les listes de lieux restent une carte par rangée |
| Défilement | `onAnimatedScroll` transmis, pour l'animation d'en-tête ([navigation.md](../navigation.md)) |

L'écran consommateur ne fournit que la donnée déjà filtrée, son `renderItem`, et le **couple
titre + message** de son état vide. Un nouvel écran de liste Campus **doit** passer par ce composant :
c'est ce qui garantit que les quatre listes se comportent identiquement.

### La barre de recherche, et quand elle n'est pas là

Elle reste **flottante en bas**, à portée de pouce. Ce qui la rendait discrète n'était pas sa hauteur
mais sa couleur : elle prenait `greyBackground`, c'est-à-dire un fond, et un champ de la couleur d'un
fond ne se voit pas. Elle porte désormais la surface d'une carte, un filet et l'ombre partagée — un
objet **posé sur** la liste plutôt qu'un creux dedans. Depuis le 2026-08-30, elle partage **le fond
et le gabarit des pieds d'action flottants**
([`PiedFlottant`](../../src/shared/ui/PiedFlottant.tsx)) : la **fumée de flou** — le contenu
transparaît flouté et s'estompe sans couture —, la hauteur 50, et **l'assise de la barre
d'onglets** (`inset − 15`, plancher `sm`), jugée parfaite sur appareil et qui fait loi pour tous les
flottants. La zone sûre entière a été essayée entre les deux : les objets remontaient trop et
laissaient un trou dessous.

**Deux choses la séparent du clavier, et il faut les deux.** Le clavier d'iOS est posé *par-dessus*
l'application, avec des coins supérieurs arrondis et un fond qui laisse passer ce qu'il y a derrière :
sans une **dalle opaque** de la couleur de la page, à la hauteur exacte du clavier, ce sont les cartes
de la liste qui apparaissent dans ces coins. Elle est rendue **hors** du `KeyboardAvoidingView`, qui
translate ses enfants vers le haut — une dalle qui monterait avec eux ne couvrirait justement pas la
zone du clavier. Et la marge de zone sûre, qui ne sert qu'à dégager l'indicateur d'accueil, tombe
quand le clavier est ouvert : le clavier le masque déjà, et la garder laissait un ruban de vingt
points qu'on lit comme un trou. Sous Android la fenêtre se redimensionne, rien de tout cela ne se
produit, et le mécanisme y est explicitement inactif.

Elle n'apparaît qu'à partir d'un **seuil d'éléments** (`seuilRecherche`, 4 par défaut — le double,
8, pour la grille d'annonces à deux par rangée) **ou** si une requête est saisie, et le rembourrage
de pied de liste suit la même condition. Le seuil a remplacé le simple « liste non vide » le
2026-08-30 : chercher parmi trois cartes n'apporte rien, et la fumée de la barre n'a rien à voiler
sur une liste qui tient à l'écran — elle flottait sur un aplat nu. La seconde moitié reste non
négociable : taper une recherche sans résultat ferait disparaître le champ, et avec lui la croix qui
l'efface — on serait enfermé.

Un cas se distingue et il est délibéré : quand la **couverture est partielle** et la liste vide, le
bandeau `CampusPartialNotice` reste affiché au-dessus de l'état vide. Il vivait dans l'en-tête de la
liste, qui n'existe plus dans ce cas ; le taire ferait passer « on n'a pas pu tout interroger » pour
« il n'y a rien ».

> **Capture attendue** — `campus-liste-filtres.png` : la modale de filtres ouverte sur un écran de
> liste.
>
> **Capture attendue** — `campus-liste-vide.png` : l'état vide d'une liste dont le filtre ne renvoie
> rien.

[`useCampusListHeader.tsx`](../../src/features/Campus/components/hooks/useCampusListHeader.tsx)
complète le dispositif en installant l'icône de filtre dans l'en-tête, colorée différemment quand un
filtre est actif, et animée comme le reste de l'en-tête via `globalScrollValues`.

[`CampusCard.tsx`](../../src/features/Campus/components/CampusCard.tsx) est la carte de base des
**lieux** : image ou visuel de repli, titre, sous-titre, badge de distance, étoile de favori,
contenu libre en enfant. Les trois types de lieux (restaurant, BU, bâtiment) l'habillent
différemment ; les annonces, qui affichent des affiches 1:1 et non des photos de lieux, ont leur
propre carte ([campus-vie-etudiante.md](campus-vie-etudiante.md)).

Depuis le jalon [6-K](../phase-6/6-k-socle-visuel.md), sa **surface** vient de
[`Card`](../../src/shared/ui/Card.tsx) et son corps se compose de
[`MetaRow`](../../src/shared/ui/MetaRow.tsx) et [`Badge`](../../src/shared/ui/Badge.tsx) : la même
déclaration était écrite six fois. Ce qui reste propre à Campus — la distance à pied formatée,
l'affluence d'une bibliothèque, le titre et son étoile — vit dans
[`CampusCardParts.tsx`](../../src/features/Campus/components/CampusCardParts.tsx), et **pas** dans le
socle : celui-ci n'a aucune raison de connaître les bibliothèques.

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
| [`BdeService.ts`](../../src/features/Campus/services/BdeService.ts) | annonces de la [base de publication](../backend.md) |
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
- **Appliquer un filtre qui ne laisse rien, puis revenir au tableau de bord** : la section doit dire
  que tout est masqué et proposer « Tout afficher ». Toucher le bouton doit **repeupler le carrousel
  immédiatement**. C'est la sonde du défaut corrigé le 2026-08-21
  ([defauts-fonctionnels.md](../defauts-fonctionnels.md)) : le tableau de bord est un onglet qui ne se
  démonte jamais, et il restait sur le filtre lu au lancement de l'application.
- Réseau coupé depuis le [menu flottant](../qualite.md) — pas le mode avion, qui coupe aussi Metro :
  chaque section doit afficher un état vide propre, sans plantage.
- Sur une liste (CROUS, BU, salles libres) : réseau coupé, la **barre de recherche doit disparaître** ;
  réseau rétabli, elle revient ; une recherche sans résultat la laisse en place, croix comprise.
- Comparer l'écran d'une liste hors ligne et celui d'une recherche sans résultat : **ils doivent être
  différents**, jusqu'à la teinte du carré d'icône — rouge pâle pour la panne, gris pour l'absence.
  S'ils se ressemblent, la vérification n'a rien vérifié.
- Sur une recherche sans résultat, toucher **« Tout afficher »** : la requête et le filtre doivent se
  retirer ensemble et la liste revenir entière.
- Clavier ouvert sur une liste, dans les **deux thèmes** : aucune zone découverte entre la barre de
  recherche et le clavier, y compris dans ses coins supérieurs arrondis.

## Limites connues

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
| [`Dashboard/components/SectionEtatVide.tsx`](../../src/features/Campus/Dashboard/components/SectionEtatVide.tsx) | ce qu'une section montre quand son carrousel n'a rien : filtre, panne, ou absence |
| [`components/CampusListLayout.tsx`](../../src/features/Campus/components/CampusListLayout.tsx) | socle générique des écrans de liste : liste, recherche, filtres, états |
| [`components/CampusLayoutComponents.tsx`](../../src/features/Campus/components/CampusLayoutComponents.tsx) | `CampusSearchBar`, `CampusFilterModal`, `CampusListEmptyState`, `CampusFailureNotice`, `CampusPartialNotice` |
| [`components/CampusCard.tsx`](../../src/features/Campus/components/CampusCard.tsx) | carte de base commune aux trois types de lieux ; sa surface vient de `shared/ui/Card` |
| [`components/CampusCardParts.tsx`](../../src/features/Campus/components/CampusCardParts.tsx) | `CardTitleRow` (titre + étoile), `DistanceBadge` (distance formatée), `LibraryStatusRow` (état et jauge d'affluence) — du domaine Campus, partagé entre la liste et le tableau de bord |
| [`components/CampusMapSection.tsx`](../../src/features/Campus/components/CampusMapSection.tsx) | la section « S'y rendre » d'une fiche : la carte du lieu en bannière, partagée par les fiches de restaurant et de BU ([cartographie.md](../cartographie.md)) |
| [`components/CampusSectionHeader.tsx`](../../src/features/Campus/components/CampusSectionHeader.tsx) | la tête d'une section de fiche : icône dans son carré teinté (`theme.sectionsHeaders`), une couleur par section — le motif de la grille Scolarité, étendu aux fiches |
| [`components/hooks/useCampusListHeader.tsx`](../../src/features/Campus/components/hooks/useCampusListHeader.tsx) | installe l'icône de filtre animée dans l'en-tête de l'écran |
| [`hooks/useCampusLocation.ts`](../../src/features/Campus/hooks/useCampusLocation.ts) | position de l'utilisateur, avec repli sur Talence |
| [`hooks/useCampusPosition.ts`](../../src/features/Campus/hooks/useCampusPosition.ts) | la même position, résolue une fois et rendue en état, pour les écrans de liste |
| [`hooks/useCrousRestaurants.ts`](../../src/features/Campus/hooks/useCrousRestaurants.ts) | restaurants : chargement, échec, nouvel essai — partagés par la liste et le carrousel |
| [`hooks/useNearbyLibraries.ts`](../../src/features/Campus/hooks/useNearbyLibraries.ts) | bibliothèques et affluences, plus la couverture du balayage |
| [`hooks/useFavorites.ts`](../../src/features/Campus/hooks/useFavorites.ts) | favoris persistés, rechargés au focus |
| [`hooks/useSavedFilter.ts`](../../src/features/Campus/hooks/useSavedFilter.ts) | filtre de liste persisté |
| [`services/CampusApiService.ts`](../../src/features/Campus/services/CampusApiService.ts) | Celcat salles : liste, reconstruction des bâtiments, occupation journalière |
| [`services/CampusDataManager.ts`](../../src/features/Campus/services/CampusDataManager.ts) | manager observable des bâtiments, cache 7 jours |
