# Campus — restaurants universitaires

Liste des restaurants et cafétérias CROUS de la région, triés par distance, avec les menus du jour et
des jours suivants.

**La région est une donnée de catalogue** depuis le jalon
[6-J](../phase-6/6-j-compte-et-sources-par-etablissement.md), colonne `crous_region`. Elle était une
`vars` du Blueprint, avec un commentaire qui l'assumait — « l'application vise une seule région ».
C'était vrai, et ça le reste : le périmètre du produit est le **secteur bordelais**
([README](../../README.md)), et la valeur vaut toujours `1`. Ce qui a changé n'est pas la valeur mais
sa **nature** — c'est exactement la forme que prend une constante bordelaise avant de devenir fausse,
et le jalon 6-G en a déterré onze du même genre. Un établissement qui ne déclare pas de région ne fait
pas afficher les restaurants d'une autre ville : la **section disparaît**, comme celle des salles
libres chez un établissement sans inventaire.

Socle commun : [campus.md](campus.md). Source de données : Croustillant, section 4 de
[sources-externes.md](../sources-externes.md).

## Parcours utilisateur

1. La section du tableau de bord présente un carrousel des restaurants les plus proches.
2. « Voir tout » ouvre la liste complète : recherche par nom ou par ville, filtre par type
   (tous / Resto U / Crous Market), mise en favori.
3. Toucher un restaurant ouvre sa fiche : sélecteur de dates en bandeau, menu du midi et du soir
   détaillé par catégorie.
4. Un bouton d'en-tête ouvre la carte du restaurant.

![La liste des restaurants : distance, favori, et les horaires du fournisseur — « du lundi au vendredi | SELF : 11h30-13h30 | BAR : 8h-14h30 »](../screenshots/crous-liste.png)

La ligne d'horaires de cette capture est le correctif du jalon [6-D](../phase-6/6-d-campus.md) : avant
lui, ces trois mentions étaient remplacées par « Horaires non spécifiés », pour **tous** les
établissements de la région.

**Elle tient sur une seule ligne, et se coupe s'il le faut.** C'est une phrase libre du fournisseur,
parfois longue : sur deux lignes, la carte d'un restaurant devenait plus haute que celle d'une
bibliothèque, et les quatre carrousels du tableau de bord cessaient d'être alignés. Toutes les cartes
de section ont la même hauteur, et c'est au contenu de s'y plier
([theme.md](../theme.md#les-décisions-durables)).

Ce qui est tronqué se retrouve **en entier sur l'écran du menu, en pied de page et ligne par ligne**.
Trois décisions, et chacune corrige un essai précédent :

- **selon leur forme**, et non ligne après ligne. Le contrat porte **deux champs** : `opening`, la
  chaîne jointe qu'affichent les cartes de liste, et `openingLines`, la liste telle que la source la
  publie. Ajouter le second était gratuit côté parité — `opening` en est exclu depuis le jalon 6-D
  ([tools/parity/](../../tools/parity/README.md)).

  La source **ne déclare aucune structure, mais elle en publie une**, et le relevé du 2026-08-21 sur
  les quarante-et-un restaurants de la région la donne : sur 81 lignes, **36** sont de la forme
  « NOM : créneau », **25** sont des portées de jours (« du lundi au vendredi »), et **20** sont des
  créneaux nus ou des phrases libres. `structurerHoraires`
  ([CrousMapping.ts](../../src/features/Campus/services/CrousMapping.ts)) les reconnaît, et l'écran
  donne à chacune sa mise en page : intertitre pour une **période** (« du lundi au vendredi »), nom en
  gras pour un **guichet** qui n'annonce pas son créneau (« CAFET' : »), deux colonnes pour un
  **service** et son créneau, ligne en gras pour un créneau seul, icône d'information pour une phrase.

  La distinction période / guichet n'est pas cosmétique : une première version les confondait sous un
  seul type, et un comptoir se lisait alors comme une plage de jours. La source, elle, les distingue
  bien — l'un finit par un deux-points, l'autre nomme un jour ;

  **Toute ligne non reconnue retombe en phrase**, affichée telle quelle : le pire cas est donc
  exactement ce que l'écran faisait avant. C'est ce qui autorise à reconnaître un format qu'aucun
  contrat ne garantit — cette source a déjà changé de forme une fois, et ce fichier en porte la trace ;
- **en pied.** La raison d'ouvrir cet écran est le menu. Les horaires sont une référence, pas
  l'information principale : en tête, ils passaient devant ;
- **dans la page, pas derrière un bouton.** Une information se lit, elle ne se déclenche pas — et le
  bouton qu'on aurait pu poser, à la manière du « Réserver » d'une bibliothèque, **existe déjà en
  en-tête** : c'est la carte du restaurant.

La grammaire est celle d'un repas juste au-dessus : une icône d'accent, un titre, puis une carte. Les
filets séparent les lignes **sauf autour d'un intertitre** : un titre touche ce qu'il annonce.

![Le menu d'un restaurant un jour de service, bandeau de dates et plats par catégorie](../screenshots/crous-menu.png)

![Un restaurant qui ne publie pas de menu : l'état vide, sans message d'erreur ni bouton](../screenshots/crous-menu-absent.png)

Cette dernière capture est à contraster avec un écran d'échec. Les deux disaient la même chose avant
la [Phase 6](../phase-6/README.md) ; ici la source a parfaitement répondu, elle n'a simplement rien à
publier — et 24 des 41 établissements de la région sont dans ce cas.

## Flux de données

```text
CrousScreen
  ├─ useCampusPosition()                      position resolue une fois
  ├─ useCrousRestaurants(lat, lon)            partage avec le carrousel du tableau de bord
  │     └─ CrousService.fetchRestaurantsBordeaux(lat, lon)
  │           └─ Blueprint ukit.campus.restaurants
  ├─ tri : favoris d'abord, puis distance croissante
  ├─ filtre : type d'établissement + recherche textuelle
  └─ CampusListLayout → CrousRestaurantListItem

CrousMenuScreen  (params : restaurantId, restaurantName, location)
  ├─ CrousService.fetchRestaurantMenu(restaurantId)
  │     └─ Blueprint ukit.campus.restaurant-menu
  ├─ CrousDateHeader     sélection du jour
  └─ CrousMealCard       une carte par service (midi, soir)
```

Le service n'émet plus de requête depuis le jalon [6-D](../phase-6/6-d-campus.md) : il joue des
[Blueprints](../blueprints.md) et travaille la donnée reçue. Ce qui est resté applicatif — la
position, Haversine, le tri, la relecture de la date, les libellés — est listé dans la section 4 de
[sources-externes.md](../sources-externes.md).

Aucun cache : les menus changent quotidiennement et sont rechargés à chaque ouverture.

## Contrats

Les types de **données** n'ont pas bougé avec la migration — c'est ce qui a permis de ne pas toucher
aux composants :

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

Ce qui a changé, c'est ce que les **méthodes** rendent : une union discriminée qui porte l'échec,
calquée sur `BlueprintRun` du socle.

```ts
type CrousRestaurantsResult = { ok: true; restaurants: CrousRestaurant[] } | { ok: false; failure: UkitFailure };
type CrousMenuResult        = { ok: true; menus: CrousDayMenu[] }         | { ok: false; failure: UkitFailure };
```

**Se teste avec `resultat.ok === false`, jamais avec `!resultat.ok`** : sans `strictNullChecks`,
TypeScript ne restreint pas une union sur la simple véracité du discriminant.

`CrousMenu`, `CrousMenuCategory` et `CrousDish` ont été **retirés** au jalon 6-D : aucun écran ne les
lisait, et `CrousRestaurant.menus` n'était jamais rempli.

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

**Les établissements de `type.code === 4` sont écartés** par un prédicat `where` du Blueprint : cette
catégorie ne correspond pas à un lieu de restauration exploitable pour l'étudiant. Le `4` y est écrit
en clair et non en `vars` — une spécification d'extraction n'est **jamais** rendue, donc une variable
y serait un nom mort.

**Les dates sont converties à la lecture**, et cette conversion-là ne descend pas. L'API renvoie
`DD-MM-YYYY`, toute l'application manipule `YYYY-MM-DD`. Les filtres de date du moteur **produisent**
un format attendu par une source ; ils refusent d'en interpréter un, bruyamment. La conversion reste
donc dans [`CrousMapping.ts`](../../src/features/Campus/services/CrousMapping.ts), et une date déjà
au format de l'application y traverse sans être retournée.

**Un restaurant sans menu n'est pas une panne.** 24 des 41 établissements de la région rendent `404`
sur `/menu`, dont 8 que l'application affiche. Le Blueprint ne porte donc pas d'`expect` : un step
`assert` accepte 200 **ou** 404, et refuse tout le reste. L'écran garde son état vide « aucun menu
publié » là où un `expect: {status: 200}` aurait affiché « réponse inattendue » à un étudiant sur
deux.

**L'image est une URL construite**, pas un champ renvoyé : `/restaurants/{code}/preview`. Un
restaurant sans visuel côté fournisseur affiche donc une image cassée, rattrapée par
[`default_resto.png`](../../assets/images/default_resto.png). Aucun Blueprint ne la porte : ce n'est
pas une requête que le service émet, c'est une adresse qu'une balise image résout.

**Cette photo se remplace depuis la base**, sans release : une ligne
`('crous', '<code>', '<url>')` dans la table [`visuels`](../backend.md#le-schéma) gagne sur celle du
fournisseur, et la chaîne vide dit « celle-ci est fausse, n'en montre aucune » — l'écran reprend alors
`default_resto.png`. La résolution est faite par `CrousService`, à la projection de la liste ; le
mapping, lui, reste pur. Le changement arrive au prochain retour au premier plan.

**Les horaires étaient invisibles, et personne ne le savait.** La source a cessé de servir `horaires`
comme un tableau pour le servir comme une **chaîne JSON** ; `Array.isArray` étant faux pour les 41
établissements, l'écran affichait « horaires non spécifiés » partout. Mesuré et corrigé au jalon 6-D :
`horairesLisibles` accepte les deux formes, et une troisième retombe sur le libellé traduit. C'est le
**seul** changement de comportement volontaire du jalon, et donc le seul champ exclu de la projection
de parité ([tools/parity/README.md](../../tools/parity/README.md)).

## Vérifier

- Ouvrir la liste : les restaurants proches doivent apparaître en premier, avec une distance
  plausible.
- Appliquer le filtre « Resto U » puis « Crous Market » : la liste doit se réduire cohéremment.
- Rechercher une ville (« Pessac », « Talence ») : la correspondance porte sur le nom **et** sur la
  zone.
- Ouvrir un restaurant en période de service : le menu du jour doit s'afficher, midi et soir séparés.
- Ouvrir **Restaurant la passerelle** (code 1642) ou tout autre établissement qui ne publie rien :
  l'état « aucun menu publié » doit s'afficher, **sans** message d'erreur.
- Chemin dégradé : pointer `vars.api` du Blueprint sur un hôte `.invalid` — la liste doit afficher
  « Service indisponible » **avec** Réessayer, et non un état vide.
- Chemin dégradé : mettre `expect.status` à `999` — « Réponse inattendue », **sans** Réessayer. Les
  deux écrans doivent être différents ; s'ils ne le sont pas, la vérification n'a rien vérifié.
- **Visuel publié** : poser une ligne `('crous', '<code>', '<url du bucket>')` dans
  [`visuels`](../backend.md#le-schéma), revenir au premier plan. La photo doit changer, **et le reste
  de la fiche ne doit pas bouger**. Puis `image_url = ''` : l'image par défaut. Puis supprimer la
  ligne : la photo de la source revient — c'est ce dernier temps qui prouve le rafraîchissement au
  retour au premier plan, les deux premiers marcheraient avec un simple redémarrage.
  Le changement se voit sur la **liste complète**, pas sur le carrousel du tableau de bord, qui garde
  son état de montage — même cause que le repli hors ligne qui n'en est pas un, ci-dessous.
- **Visuel publié, base injoignable** : l'interrupteur *Hors ligne* du menu flottant **ne coupe pas la
  base** (il coupe le `fetch` du moteur, pas celui du client Supabase). Pointer `SUPABASE_URL` sur
  `https://127.0.0.1:1` dans `.env` et recharger Metro. La dernière
  surcouche connue doit tenir, servie par le cache, **sans écran d'erreur** — une table injoignable
  n'est pas une panne, et sans cache une photo retirée parce qu'elle était fausse reviendrait.

## Limites connues

- **Aucun repli hors ligne, et ce qu'on croit en voir n'en est pas un.** Le hors ligne coupé depuis le
  menu de développement ([qualite.md](../qualite.md)) laisse le carrousel du tableau de bord afficher
  ses restaurants, ce qui ressemble à un cache : ce n'en est pas un. C'est l'**état React** de la
  section, chargé avant la coupure, que l'effet ne rejoue que sur un changement de position ou un
  nouvel essai ([`useCrousRestaurants.ts`](../../src/features/Campus/hooks/useCrousRestaurants.ts)).
  La liste complète, qui se monte à neuf, affiche bien « Service indisponible ». Au redémarrage de
  l'application hors ligne, les deux seraient vides. C'est la décision écrite dans
  [donnees-et-persistance.md](../donnees-et-persistance.md) — un menu change tous les jours — mais
  elle se vérifie mal, et c'est ce piège d'observation qu'il faut connaître.
- **Le classement par type repose sur des chaînes présentes dans le nom**, et c'est plus fragile que
  ça n'en a l'air. Mesuré le 2026-08-08 en publiant la région 2 sur un appareil : le CROUS y nomme ses
  établissements `R.u. breuty`, `R.u. crousty`… là où la région 1 écrit `Resto u'`. Sur les 35
  établissements servis, le filtre « Resto U » en retient **1**, le filtre « Crous Market » **0**.
  Un renommage côté fournisseur ne produit donc aucune erreur : il vide simplement un filtre, en
  silence. C'est une fragilité applicative que les Blueprints ne réparent pas — le filtrage textuel
  n'est pas descendu, et il ne pouvait pas l'être.
- **Le prédicat `where` lève sur un établissement sans `type`.** `item.type.code != 4` compare un
  champ absent, ce que les deux moteurs refusent au lieu de filtrer en silence. Aucun des 41
  établissements n'est dans ce cas aujourd'hui ; le jour où la source en servirait un, l'échec serait
  rangé en `data` — visible, donc corrigeable, ce qui est préférable à une liste amputée sans raison.
- **La région est un `vars`, pas une entrée.** La changer demande une publication de fichier, ce qui
  est désormais une minute — mais pas un réglage utilisateur.
- **Aucun cache** : rouvrir une fiche relance systématiquement l'appel.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`Crous/CrousScreen.tsx`](../../src/features/Campus/Crous/CrousScreen.tsx) | liste des restaurants : composition, tri, filtres, recherche |
| [`Crous/CrousMenuScreen.tsx`](../../src/features/Campus/Crous/CrousMenuScreen.tsx) | fiche d'un restaurant : menus par jour et par service, état vide, état d'échec |
| [`Crous/components/CrousRestaurantListItem.tsx`](../../src/features/Campus/Crous/components/CrousRestaurantListItem.tsx) | ligne de liste d'un restaurant |
| [`Crous/components/CrousDateHeader.tsx`](../../src/features/Campus/Crous/components/CrousDateHeader.tsx) | bandeau de sélection du jour dans la fiche |
| [`Crous/components/CrousMealCard.tsx`](../../src/features/Campus/Crous/components/CrousMealCard.tsx) | carte d'un service (midi ou soir), catégories et plats |
| [`hooks/useCrousRestaurants.ts`](../../src/features/Campus/hooks/useCrousRestaurants.ts) | chargement, échec et nouvel essai, partagés par la liste et le carrousel |
| [`services/CrousService.ts`](../../src/features/Campus/services/CrousService.ts) | orchestration des deux Blueprints, distances et tri |
| [`services/CrousMapping.ts`](../../src/features/Campus/services/CrousMapping.ts) | le contrat et la projection : date, horaires, services — sans plateforme |
| [`services/CrousMapping.test.ts`](../../src/features/Campus/services/CrousMapping.test.ts) | ses tests, joués par `npm test` |
