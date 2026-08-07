# 6-D — Act I : les sources de campus

> Restaurants, bibliothèques et référentiel des lieux. Le jalon qui établit, en pratique, la
> frontière entre ce qui descend dans un Blueprint et ce qui reste du code.

## Objectif

[`CrousService`](../../src/features/Campus/services/CrousService.ts) et
[`LibraryService`](../../src/features/Campus/services/LibraryService.ts) n'émettent plus de requête :
ils orchestrent des Blueprints et travaillent la donnée reçue. Le référentiel des bâtiments gagne sa
surcouche distante.

Ces trois sources sont choisies ensemble parce qu'elles couvrent les trois formes que prend le
travail : une API publique et saine (Croustillant), une API privée aux en-têtes imités et à
l'orchestration compliquée (Affluences), et un référentiel local qui devient une donnée publiée.

## Ce qui est livré

### Les Blueprints

| Blueprint | Ce qu'il fait | Remplace |
|---|---|---|
| `ukit.campus.restaurants` | la liste régionale des restaurants | `fetchRestaurantsBordeaux` |
| `ukit.campus.restaurant-menu` | le menu d'un restaurant | `fetchRestaurantMenu` |
| `ukit.campus.bibliotheques` | les sites autour d'**un** point de balayage | le corps de `fetchNearbyLibraries` |
| `ukit.campus.bibliotheque-affluence` | l'affluence en direct d'un site | `getAffluencesData` |
| `ukit.campus.bibliotheque-horaires` | les horaires d'une semaine | `fetchLibraryTimetable` |

**Un Blueprint par appel réellement joué**, pas un par source. Le fichier de référence hérité
d'Aetherius fait tenir la carte et l'affluence dans un seul document parce qu'il devait démontrer les
deux en une exécution ; l'application, elle, les appelle à des moments différents et pour des écrans
différents. Deux Blueprints se rejouent seuls, et une panne de l'un n'emporte pas l'autre.

### Le balayage reste applicatif, et c'est le point de la journée

`fetchNearbyLibraries` lance **douze requêtes en parallèle** — la position de l'utilisateur plus
onze points fixes couvrant la région — puis dédoublonne par identifiant de site, filtre sur les
catégories 1 et 20, recalcule les distances par Haversine et trie.

De tout cela, **une seule chose descend** : la requête. Le Blueprint prend une latitude et une
longitude, rend les sites de ce point. Le service le joue douze fois — les runs Act I sont
concurrents sans limite — et fait le reste.

Trois raisons, et aucune n'est un manque du moteur :

- la liste des douze points est une **décision produit** (quelles villes on couvre), pas une
  propriété de la source ;
- le filtre « l'une des catégories du site vaut 1 ou 20 » n'est **pas exprimable** : `categories` est
  une liste, et indexer une liste est refusé par le prédicat d'extraction, des deux côtés et
  volontairement. Le Blueprint extrait donc `$.categories[*].id`, et l'application filtre ;
- Haversine est du calcul, et le calcul n'entre pas dans un Blueprint. Le jour où il y entrerait, il
  faudrait le réimplémenter à l'identique dans deux moteurs.

> **Piège d'arité, à connaître avant de le rencontrer.** Un chemin d'extraction qui ne correspond à
> rien rend `null`, une seule correspondance rend **la valeur**, plusieurs rendent **la liste**. Un
> site à une seule catégorie rend donc `20`, pas `[20]`. Le code appelant normalise ; les deux
> moteurs se comportent à l'identique.

### Les conversions de format descendent, dans un seul sens

L'API de restauration attend `DD-MM-YYYY` là où l'application manipule des dates ISO. Produire ce
format depuis une date ISO se fait dans le Blueprint. **Relire** une date reçue dans ce format ne s'y
fait pas : les filtres de date lisent `YYYY-MM-DD` et refusent le reste, bruyamment. La conversion
de la date **reçue** reste donc dans `CrousService`, avec son défaut actuel à corriger au passage
(`.includes()` appelé sur une valeur possiblement nulle).

### Le référentiel des bâtiments

[`assets/locations.json`](../../assets/locations.json) reste le socle embarqué. La table `batiments`
posée en [6-B](6-b-supabase.md) devient une surcouche : coordonnées, horaires d'ouverture, drapeau
d'accès libre, visuel. Un horaire faux se corrige alors sans release, ce qui est le défaut le plus
banal du référentiel.

Le modèle est celui des Blueprints, pour la même raison : le fichier gagne quand la surcouche est
absente, et une surcouche illisible ramène au fichier.

### Les écrans distinguent enfin les échecs

C'est ici que le modèle d'erreur posé en [6-A](6-a-socle.md) devient visible. Les listes de
restaurants et de bibliothèques affichent aujourd'hui le même état vide qu'une source en panne. À la
fin du jalon :

- source injoignable → « Service indisponible », avec Réessayer ;
- réponse inattendue → un message qui dit que la source a changé ;
- liste réellement vide → l'état vide existant, inchangé.

## Décisions et pièges

- **Le cache ne bouge pas.** Ces données n'en ont pas aujourd'hui (une affluence périmée est pire
  qu'un chargement) et ce jalon ne change pas cette décision. Il l'écrit simplement là où on la
  cherche : dans [donnees-et-persistance.md](../donnees-et-persistance.md).
- **Les en-têtes imités descendent tels quels.** `x-service-name`, `Origin`, `Referer`, l'agent
  utilisateur : ce sont des valeurs observées, pas documentées, et c'est exactement pourquoi elles
  ont leur place dans un fichier corrigeable à distance plutôt que dans un binaire.
- **Douze requêtes restent douze requêtes.** Ne pas profiter du port pour « optimiser » le balayage :
  c'est un changement de comportement produit, il se décide séparément, avec ses propres mesures.
- **`Translator` n'entre pas dans un Blueprint.** Les libellés de repli (`UNSPECIFIED_HOURS`,
  `CATEGORY`) restent applicatifs — un Blueprint ne connaît pas la langue choisie.

## Définition de « terminé »

1. Les cinq Blueprints existent dans [`blueprints/`](../../blueprints/), sont publiés, et sont joués
   par les services.
2. `axios`, `qs` et `fetch` ont disparu de `CrousService` et de `LibraryService`.
3. Les signatures typées des deux services sont inchangées ; les écrans n'ont pas été touchés, sauf
   pour distinguer les états d'échec.
4. `npm run parity` couvre les cinq appels et est vert sur données réelles.
5. La surcouche `batiments` est active, avec repli sur le fichier embarqué vérifié hors ligne.
6. `npx tsc --noEmit` et `npx eslint .` sans régression.
7. Documentation : [sources-externes.md](../sources-externes.md) dit, pour Croustillant et
   Affluences, quel Blueprint porte quoi et ce qui est resté applicatif ;
   [campus-crous.md](../features/campus-crous.md) et
   [campus-bibliotheques.md](../features/campus-bibliotheques.md) amendés ; CHANGELOG.

## Plan de test

**Parité**, sur données réelles : liste des restaurants (nombre, ordre après tri applicatif, champs),
menu d'un restaurant sur trois jours différents dont un sans service, sites d'un point de balayage,
affluence d'un site ouvert **et** d'un site fermé, horaires d'une semaine courante et d'une semaine
décalée.

**Sur appareil** :

| Sonde | Attendu |
|---|---|
| Liste des restaurants, position autorisée | tri par distance identique à avant |
| Liste des restaurants, position refusée | liste sans distance, sans plantage |
| Menu d'un jour sans service | état vide, **succès** — pas une erreur |
| Bibliothèques, mode avion | « Service indisponible », pas une liste vide |
| Un des douze points de balayage en échec | les onze autres s'affichent — un échec partiel n'emporte pas la liste |
| Affluence d'un site fermé | l'état fermé, pas un échec |
| Horaires, semaine suivante puis précédente | navigation identique à avant |
| Surcouche `batiments` absente (mode avion, cache vide) | le fichier embarqué sert, l'écran est complet |

La cinquième ligne mérite une décision explicite avant d'écrire le code : **que fait-on quand deux
points de balayage sur douze échouent ?** Aujourd'hui la réponse est « rien, on n'en sait rien ».
Après le jalon, on le sait — et la bonne réponse est d'afficher ce qu'on a, en le disant.

## Limites écrites

- **Le filtre de catégorie reste une constante applicative** (1 et 20). Le descendre demanderait
  d'indexer une liste dans un prédicat, ce que la grammaire refuse des deux côtés. Une correction de
  ces identifiants demande donc toujours une release.
- **Les douze points de balayage restent en dur** dans le service. Ils pourraient rejoindre la base
  au jalon [6-G](6-g-etablissements.md), avec le catalogue des établissements — c'est le bon endroit
  pour eux, mais pas maintenant.
- **`as: number` extrait le premier nombre d'un texte.** Un libellé sans nombre rend `null` là où un
  parseur maison rendait parfois `0`. La différence se décide côté application, elle ne s'ignore pas.
