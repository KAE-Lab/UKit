# Campus — restaurants universitaires

Liste des restaurants et cafétérias CROUS de la région, triés par distance, avec les menus du jour et
des jours suivants.

Socle commun : [campus.md](campus.md). Source de données : Croustillant, section 4 de
[sources-externes.md](../sources-externes.md).

## Parcours utilisateur

1. La section du tableau de bord présente un carrousel des restaurants les plus proches.
2. « Voir tout » ouvre la liste complète : recherche par nom ou par ville, filtre par type
   (tous / Resto U / Crous Market), mise en favori.
3. Toucher un restaurant ouvre sa fiche : sélecteur de dates en bandeau, menu du midi et du soir
   détaillé par catégorie.
4. Un bouton d'en-tête ouvre la carte du restaurant.

> **Capture attendue** — `crous-liste.png` : la liste des restaurants, distances et favoris visibles.
>
> **Capture attendue** — `crous-menu.png` : le menu d'un restaurant un jour de service, midi et soir.

## Flux de données

```text
CrousScreen
  ├─ useCampusLocation().fetchLocation()
  ├─ CrousService.fetchRestaurantsBordeaux(lat, lon)
  │     └─ GET /regions/1/restaurants          région 1 = Nouvelle-Aquitaine
  ├─ tri : favoris d'abord, puis distance croissante
  ├─ filtre : type d'établissement + recherche textuelle
  └─ CampusListLayout → CrousRestaurantListItem

CrousMenuScreen  (params : restaurantId, restaurantName, location)
  ├─ CrousService.fetchRestaurantMenu(restaurantId)
  │     └─ GET /restaurants/{id}/menu
  ├─ CrousDateHeader     sélection du jour
  └─ CrousMealCard       une carte par service (midi, soir)
```

Aucun cache : les menus changent quotidiennement et sont rechargés à chaque ouverture.

## Contrats

```ts
interface CrousRestaurant {
    id: string;            // code numérique du CROUS, en chaîne
    title: string;
    short_desc: string;    // zone, à défaut adresse
    lat: number;
    lon: number;           // noter "lon", pas "lng"
    opening: string;       // horaires joints par " | "
    distance?: number;     // km, calculé localement
    image_url?: string;    // endpoint /preview du fournisseur
}

interface CrousDayMenu {
    date: string | null;                              // normalisée en YYYY-MM-DD
    midi: { name: string, dishes: string[] }[];
    soir: { name: string, dishes: string[] }[];
}
```

`CrousMenu`, `CrousMenuCategory` et `CrousDish` sont également déclarés dans le service mais ne sont
pas utilisés par les écrans, qui consomment `CrousDayMenu`.

## Filtres

Le filtrage par type est **textuel**, faute de champ de catégorie exploitable côté fournisseur :

| Filtre | Condition sur le titre, en minuscules |
|---|---|
| `resto` | contient `crous cafet` ou `resto u` |
| `market` | contient `crous moovy market` ou `crous market` |

Le filtre est persisté sous `crous_filter`, les favoris sous `crous_favorites`.

## Décisions de conception

**La région est codée en dur à 1** (Nouvelle-Aquitaine). L'application vise l'Université de Bordeaux ;
élargir supposerait de choisir une région, donc une préférence utilisateur qui n'existe pas.

**Les établissements de `type.code === 4` sont écartés** au niveau du service : cette catégorie ne
correspond pas à un lieu de restauration exploitable pour l'étudiant.

**Les dates sont converties à la lecture.** L'API renvoie `DD-MM-YYYY`, toute l'application manipule
`YYYY-MM-DD`. La conversion est faite une fois, dans le service, pour que les écrans n'aient jamais à
connaître le format du fournisseur.

**L'image est une URL construite**, pas un champ renvoyé : `/restaurants/{code}/preview`. Un
restaurant sans visuel côté fournisseur affiche donc une image cassée, rattrapée par
[`default_resto.png`](../../assets/images/default_resto.png).

## Vérifier

- Ouvrir la liste : les restaurants proches doivent apparaître en premier, avec une distance
  plausible.
- Appliquer le filtre « Resto U » puis « Crous Market » : la liste doit se réduire cohéremment.
- Rechercher une ville (« Pessac », « Talence ») : la correspondance porte sur le nom **et** sur la
  zone.
- Ouvrir un restaurant en période de service : le menu du jour doit s'afficher, midi et soir séparés.
- Ouvrir un restaurant un week-end ou hors période : l'état « pas de menu » doit s'afficher
  proprement.
- Mode avion : la liste doit être vide avec son message, sans plantage.

## Limites connues

- **Les libellés de filtre et le texte de recherche s'affichent en majuscules brutes**
  (`ALL_ESTABLISHMENTS`, `RESTO_U`, `CROUS_MARKET`, `SEARCH_RESTO_CITY`) — voir [i18n.md](../i18n.md).
- **Le classement par type repose sur des chaînes présentes dans le nom.** Un renommage côté CROUS
  fait basculer un établissement dans « aucun filtre » sans erreur.
- **`fetchRestaurantMenu` suppose que `day.date` existe** : la normalisation appelle `.includes()`
  sur la valeur avant de vérifier qu'elle n'est pas nulle. Une réponse sans date ferait échouer la
  transformation — capturée par le `try` du service, qui renvoie alors une liste vide.
- **Aucun cache** : rouvrir une fiche relance systématiquement l'appel.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`Crous/CrousScreen.tsx`](../../src/features/Campus/Crous/CrousScreen.tsx) | liste des restaurants : chargement, tri, filtres, recherche |
| [`Crous/CrousMenuScreen.tsx`](../../src/features/Campus/Crous/CrousMenuScreen.tsx) | fiche d'un restaurant : menus par jour et par service |
| [`Crous/components/CrousRestaurantListItem.tsx`](../../src/features/Campus/Crous/components/CrousRestaurantListItem.tsx) | ligne de liste d'un restaurant |
| [`Crous/components/CrousDateHeader.tsx`](../../src/features/Campus/Crous/components/CrousDateHeader.tsx) | bandeau de sélection du jour dans la fiche |
| [`Crous/components/CrousMealCard.tsx`](../../src/features/Campus/Crous/components/CrousMealCard.tsx) | carte d'un service (midi ou soir), catégories et plats |
| [`services/CrousService.ts`](../../src/features/Campus/services/CrousService.ts) | accès Croustillant : restaurants, menus, normalisation |
