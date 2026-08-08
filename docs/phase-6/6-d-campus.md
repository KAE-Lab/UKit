# 6-D — Act I : les sources de campus

> Restaurants, bibliothèques et référentiel des lieux. Le jalon qui établit, en pratique, la
> frontière entre ce qui descend dans un Blueprint et ce qui reste du code.

> **Jalon livré.** Ce document a été amendé à la livraison : ce qui suit décrit ce qui est en place,
> et les endroits où la réalité a corrigé la spécification sont signalés par « Corrigé à la
> livraison ».

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
| [`ukit.campus.restaurants`](../../blueprints/ukit-campus-restaurants.blueprint.json) | la liste régionale des restaurants | `fetchRestaurantsBordeaux` |
| [`ukit.campus.restaurant-menu`](../../blueprints/ukit-campus-restaurant-menu.blueprint.json) | le menu d'un restaurant | `fetchRestaurantMenu` |
| [`ukit.campus.bibliotheques`](../../blueprints/ukit-campus-bibliotheques.blueprint.json) | les sites autour d'**un** point de balayage | le corps de `fetchNearbyLibraries` |
| [`ukit.campus.bibliotheque-affluence`](../../blueprints/ukit-campus-bibliotheque-affluence.blueprint.json) | l'affluence en direct d'un site | `getAffluencesData` |
| [`ukit.campus.bibliotheque-horaires`](../../blueprints/ukit-campus-bibliotheque-horaires.blueprint.json) | les horaires d'une semaine | `fetchLibraryTimetable` |

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

> **Corrigé à la livraison — il n'y a rien à produire, donc `format_date` n'apparaît nulle part.**
> L'application demande `/restaurants/{code}/menu`, qui rend **tous** les jours publiés d'un coup, et
> jamais `/menu/{jour}` : c'est l'écran qui choisit ensuite le jour affiché dans son bandeau de dates.
> Le fichier de référence hérité du jalon 3-G interrogeait un jour précis parce qu'il devait démontrer
> le filtre ; l'appel réel n'en a pas besoin. Ajouter une entrée `jour` inutilisée pour « garder la
> démonstration » aurait contredit la règle du jalon — un Blueprint par appel **réellement joué**.
>
> La moitié de cette section reste donc vraie et l'autre est sans objet : seule la conversion de la
> date **reçue** existe, et elle est bien restée applicative, dans
> [`CrousMapping.ts`](../../src/features/Campus/services/CrousMapping.ts), défaut corrigé.

### Corrigé à la livraison — deux défauts de plus, trouvés en mesurant la source

Écrire un Blueprint oblige à regarder ce que la source **rend vraiment**. Deux choses sont apparues,
et aucune n'était visible à la relecture du code :

- **`horaires` n'est plus un tableau.** La source le sert désormais comme une **chaîne JSON**
  (`"[\"du lundi au vendredi\", \"12h-13h45\"]"`). Le test `Array.isArray` d'origine était donc faux
  pour les 41 établissements de la région : l'application affichait « horaires non spécifiés »
  **partout**, en production, depuis un temps indéterminé. Corrigé — les deux formes sont acceptées,
  une troisième retombe sur le libellé traduit. C'est le **seul** changement de comportement
  volontaire du jalon, et donc le seul champ exclu de la projection de parité, avec le commentaire qui
  le nomme ([tools/parity/README.md](../../tools/parity/README.md)).
- **24 restaurants sur 41 rendent `404` sur `/menu`**, dont 8 que l'application affiche. Ce n'est pas
  une panne, c'est « ce restaurant ne publie pas de menu ». `expect.status` n'acceptant qu'un seul
  entier, le Blueprint du menu **ne porte pas d'`expect`** : un step `assert` accepte 200 **ou** 404
  et refuse tout le reste. Sans cette mesure, un étudiant sur deux aurait vu « réponse inattendue » là
  où l'écran affichait un état vide correct. Le motif est écrit dans
  [blueprints.md](../blueprints.md#accepter-deux-statuts-sans-accepter-nimporte-lequel).

### Le référentiel des bâtiments

[`assets/locations.json`](../../assets/locations.json) reste le socle embarqué. La table `batiments`
posée en [6-B](6-b-supabase.md) devient une surcouche : coordonnées, horaires d'ouverture, drapeau
d'accès libre, visuel. Un horaire faux se corrige alors sans release, ce qui est le défaut le plus
banal du référentiel.

Le modèle est celui des Blueprints, pour la même raison : le fichier gagne quand la surcouche est
absente, et une surcouche illisible ramène au fichier.

> **Corrigé à la livraison — la fusion est champ par champ, et les accesseurs restent synchrones.**
> Deux points que la spécification laissait ouverts et que l'implémentation a dû trancher.
>
> Une surcouche qui remplacerait une entrée entière ferait disparaître une coordonnée dès qu'une
> colonne est nulle — et l'écran n'afficherait alors ni erreur ni message, juste une carte au mauvais
> endroit. La fusion se fait donc **champ par champ**, et une colonne nulle n'écrase jamais rien.
> C'est le seul vrai risque de ce morceau, et il est verrouillé par un test.
>
> Quatre appelants lisent ce référentiel **pendant un rendu** — l'écran de carte, le bouton
> d'itinéraire, la reconstruction des bâtiments et l'extraction des lieux d'un cours. Les rendre
> asynchrones aurait répandu un `await` dans du code qui n'a aucune raison d'attendre. Le module est
> donc coupé en deux, comme `delivery.ts` face à `registry.ts` : une moitié pure qui tient la table et
> sait la fusionner, une moitié de plateforme qui lit le cache et la base.
>
> Un troisième point, non prévu : le référentiel gagne un **cache local** (`batiments@1`). Sans lui,
> une correction publiée serait perdue au premier lancement hors ligne — exactement le cas où un
> horaire faux coûte le plus cher.

### Les écrans distinguent enfin les échecs

C'est ici que le modèle d'erreur posé en [6-A](6-a-socle.md) devient visible. Les listes de
restaurants et de bibliothèques affichent aujourd'hui le même état vide qu'une source en panne. À la
fin du jalon :

- source injoignable → « Service indisponible », avec Réessayer ;
- réponse inattendue → un message qui dit que la source a changé ;
- liste réellement vide → l'état vide existant, inchangé.

> **Corrigé à la livraison — les signatures des services changent, comme en 6-B.** La définition de
> « terminé » ci-dessous demandait des signatures inchangées **et** des écrans qui distinguent les
> échecs : les deux ne tiennent pas ensemble, un écran ne pouvant afficher un échec qu'on ne lui rend
> pas. C'est l'arbitrage déjà rendu au jalon [6-B](6-b-supabase.md) — la règle « signature inchangée »
> du 6-A est subordonnée à l'immobilité de l'écran, et ici les écrans sont adaptés dans le même
> changement. Les cinq méthodes rendent donc une union `{ ok: true, … } | { ok: false, failure }`.
>
> Ce qui n'a **pas** bougé, et c'est ce qui compte : les types de données (`CrousRestaurant`,
> `CrousDayMenu`, `LibraryInfo`, `AffluencesData`, `TimetableEntry`) et donc tous les composants.
>
> Une conséquence non prévue, la même qu'en 6-B : le carrousel du tableau de bord et la liste
> complète portaient deux fois la même machinerie de chargement. Elle est sortie dans deux hooks,
> [`useCrousRestaurants`](../../src/features/Campus/hooks/useCrousRestaurants.ts) et
> [`useNearbyLibraries`](../../src/features/Campus/hooks/useNearbyLibraries.ts), plutôt que d'être
> écrite deux fois de plus.

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

1. **fait** — les cinq Blueprints existent dans [`blueprints/`](../../blueprints/) et sont joués par
   les services. `ukit.campus.affluence` est supprimé, `ukit.campus.restaurants` passe en version 2.
   Les neuf documents passent les gardes du publieur.
2. **fait** — `axios`, `qs` et `fetch` ont disparu de `CrousService` et de `LibraryService`.
3. **fait, avec un écart écrit** — les types de **données** sont inchangés et aucun composant n'a été
   touché pour cette raison ; les **signatures** rendent désormais l'échec (voir « Corrigé à la
   livraison » plus haut). Les écrans changent uniquement pour distinguer les états d'échec.
4. **fait** — `npm run parity` couvre les cinq appels et est vert sur données réelles, avec un champ
   explicitement exclu et documenté.
5. **fait** — la surcouche `batiments` est active, appliquée champ par champ, avec cache local ;
   le repli sur le fichier embarqué est vérifié base injoignable.
6. **fait** — base de référence intacte : 3 erreurs `tsc` héritées, 11 warnings `eslint` hérités.
   `npm test` vert (95 tests, dont 3 nouveaux modules).
7. **fait** — documentation.

## Plan de test

**Parité**, sur données réelles — les cinq cas sont dans [`tools/parity/`](../../tools/parity/README.md)
et verts : liste des restaurants (29 éléments, ordre après tri applicatif, champs), menus de trois
restaurants dont **deux en 404**, sites d'un point de balayage (8 bibliothèques, arité des catégories
comprise), affluence de deux sites, horaires de la semaine courante **et** d'une semaine décalée.

**Depuis le poste**, avant l'appareil :

```bash
npx tsc --noEmit && npx eslint .   # base de reference intacte
npm test                            # 95 tests, dont les trois modules de projection
npm run parity                      # cinq cas, sur les vraies sources
npx expo export --platform android  # les cinq noms, la cle de cache et l hote Affluences sont dans le bundle
```

**Sur appareil.** Le mode avion n'est utilisé nulle part, et c'est la leçon des jalons 6-A et 6-B :
couper la connexion d'un appareil de développement casse aussi Metro. Un chemin dégradé se produit
mieux **en modifiant le Blueprint** — un hôte en `.invalid`, un `expect` impossible, un chemin
d'extraction faux — ce qui est aussi la démonstration du dispositif. Ces sondes se jouent **avant** la
publication : tant que le bucket ne sert pas les nouveaux noms, le socle local gagne toujours.

| Sonde | Comment | Attendu | État |
|---|---|---|---|
| Liste des restaurants, position autorisée | onglet Campus, « Voir tout » | tri par distance identique à avant, **et les horaires réels affichés** | **joué** |
| Liste des restaurants, position refusée | refuser la permission dans les réglages système | liste complète, tri depuis le repli Talence, aucun plantage | **joué** |
| Menu d'un restaurant en service | ouvrir un restaurant qui publie | midi et soir, bandeau de dates identique | **joué** |
| Restaurant sans menu publié | ouvrir Restaurant la passerelle (code 1642) | état vide « aucun menu publié », **succès** — pas une erreur | **joué** |
| Source injoignable | `vars.api` du Blueprint → un hôte `.invalid` | « Service indisponible » **avec** Réessayer, pas une liste vide ; le carrousel du tableau de bord disparaît en silence | **joué** |
| Deux points de balayage sur douze en échec | voir le protocole ci-dessous | les dix autres s'affichent **plus** le bandeau, et les quatre BU exclusives aux points coupés disparaissent nommément | **joué** |
| Réponse inattendue | `expect.status` → `999` sur les restaurants | « Réponse inattendue », **sans** Réessayer | **joué** |
| Forme de la réponse changée | `$.data` et `$.data[*]` → `$.donnees` | l'`assert` de forme échoue → « Réponse inattendue », et le journal **nomme** la cause | **joué** |
| Affluence d'un site fermé | ouvrir une BU hors horaires | l'état fermé et son texte d'ouverture, pas un échec | **joué** |
| ~~Horaires, semaine suivante puis précédente~~ | — | **sonde retirée** : la navigation de semaine n'existe pas dans l'interface (voir ci-dessous) | — |
| Surcouche `batiments` appliquée | journal Metro au démarrage | `[batiments] surcouche appliquee : 73 lieu(x)` | **joué** |
| Base entièrement injoignable | `SUPABASE_URL` sur un hôte `.invalid`, puis `npx expo start -c` | les **deux** surcouches signalent leur échec ; restaurants et BU fonctionnent, les neuf Blueprints se résolvent et se jouent depuis le seul socle | **joué** |
| Livraison en place | panneau Blueprints du menu de développement, après publication | neuf lignes résolues, sept jouables — les deux parcours à secrets ne le sont pas | **joué** |
| Correction sans release | monter `vars.region` à `2`, version à `3`, republier, revenir au premier plan | `distant · v3` au panneau et la liste passe à la région publiée — **sans release** | **joué** |

> **Corrigé à la livraison — la correction s'applique au run suivant, pas à l'écran affiché.** Au
> retour au premier plan, le carrousel du tableau de bord **ne change pas** : son hook ne se rejoue
> pas, rien dans ses dépendances n'a bougé. C'est l'écran de liste, monté à la navigation, qui joue le
> Blueprint corrigé. Ce n'est pas un défaut — rafraîchir la livraison ne doit pas recharger des écrans
> que l'utilisateur est en train de lire — mais c'est contre-intuitif quand on vérifie, et il vaut
> mieux le savoir avant de conclure que la correction n'est pas arrivée.

> **Corrigé à la livraison — un panneau muet n'est pas un panneau en erreur.** Pendant la sonde de
> livraison, la zone de rapport affichait `manifeste pas encore lu` alors que la ligne montrait
> `distant · v3` en vert et que la correction était bien arrivée. C'est cohérent : le rapport vit en
> mémoire et un rechargement Metro l'efface, là où la surcouche vit dans le magasin local et survit.
> La couleur tranche — gris pour « pas de rapport », ambre pour « rapport en échec » — et le bouton
> **Rafraichir** lève le doute. Écrit dans [blueprints.md](../blueprints.md), parce que ce panneau
> existe précisément pour répondre à « pourquoi ma correction n'arrive pas » et qu'il peut se
> présenter muet alors que tout va bien.

> **Corrigé à la livraison — la sonde a démontré autre chose que prévu, et c'est mieux ainsi.** La
> liste passée en région 2 n'a d'abord montré **qu'un** établissement au lieu de 35 : le filtre de
> type « Resto U » était resté actif, et le CROUS nomme ses établissements `R.u. breuty` en région 2
> là où il écrit `Resto u'` en région 1. Sur 35 établissements, ce filtre en retient 1 et « Crous
> Market » aucun. La livraison avait parfaitement fonctionné ; c'est le filtrage **textuel** de
> l'application qui masquait le reste. La limite était écrite en théorie dans
> [campus-crous.md](../features/campus-crous.md) ; elle y est maintenant écrite **avec ses chiffres**.

La sixième ligne demandait une décision explicite avant d'écrire le code : **que fait-on quand deux
points de balayage sur douze échouent ?** Avant ce jalon, la réponse était « rien, on n'en sait
rien ». Elle est désormais « on affiche ce qu'on a, **en le disant** » : la liste plus un bandeau
discret avec Réessayer. Zéro réponse reste un échec plein.

> **Le protocole de la couverture partielle.** Modifier le Blueprint ne sert à rien ici : il est le
> même pour les douze points, donc le casser les fait tous échouer. Ce qu'il faut, c'est une entrée
> **invalide sur deux points seulement** — et la source s'en charge : une latitude non numérique lui
> fait rendre `400`, que `expect` refuse. Deux lignes temporaires dans `fetchNearbyLibraries` :
>
> ```ts
> points.map((point, index) =>
>     runBlueprint(BLUEPRINT.CAMPUS_BIBLIOTHEQUES, {
>         inputs: index < 2 ? { latitude: 'x', longitude: 'y' } : { latitude: point.lat, longitude: point.lng },
>     }),
> )
> ```
>
> Deux runs en `rejected`, dix en succès : c'est exactement la branche à observer, jouée par le vrai
> chemin de code, et sans toucher au réseau de l'appareil.
>
> **Le choix des deux points n'est pas indifférent, et la première tentative l'a appris.** Couper les
> deux premiers — la position de l'utilisateur et Bordeaux Centre — affiche bien le bandeau mais ne
> retire **aucune** bibliothèque de la liste : Talence/Pessac rend exactement les mêmes sites que
> Bordeaux Centre. Impossible, donc, de vérifier autre chose que le bandeau lui-même. La sonde a été
> refaite sur les index 4 et 7 (La Rochelle et Bayonne), qui portent quatre BU que personne d'autre ne
> voit — quatre noms précis à chercher dans la barre de recherche, présents avant, absents pendant.
>
> Vérifier une liste incomplète demande de savoir **ce qui doit manquer**. « Il m'a semblé en voir
> moins » n'est pas une vérification, et c'est ce qui a fait mesurer le recouvrement réel des douze
> points — noté dans [campus-bibliotheques.md](../features/campus-bibliotheques.md).

> **Corrigé à la livraison — deux sondes du plan n'étaient pas jouables, et l'appareil l'a dit.**
>
> « Horaires, semaine suivante puis précédente » supposait une navigation de semaine que
> **l'interface ne porte pas** : `useLibraryTimetableData` expose `weekOffset` et `setWeekOffset`,
> aucun composant ne les branche, et la fiche ne demande jamais que la semaine courante. La
> documentation de la partie l'annonçait pourtant depuis longtemps ; elle est corrigée, et la limite
> est désormais écrite. Le Blueprint accepte bien un décalage signé — la parité le joue sur deux
> semaines — donc la capacité ne coûterait que deux boutons, mais c'est une décision d'interface et
> elle se prend séparément.
>
> « Surcouche `batiments` absente → l'écran des salles libres est complet » supposait un écran des
> salles libres qui fonctionne : il dépend de Celcat, donc du relais, qui reste hors service jusqu'au
> jalon [6-E](6-e-planning.md). Et le défaut est plus profond que ce contretemps : **les quatre
> lecteurs du référentiel affichent exactement la même chose que la surcouche soit appliquée ou
> non** — c'est la propriété recherchée, et c'est précisément ce qui la rend invisible.
>
> `refreshBuildings` journalise donc son rapport, exactement comme `refreshBlueprints` le fait depuis
> le jalon 6-C : une ligne d'avertissement quand la surcouche n'est pas appliquée, une ligne de
> développement quand elle l'est. C'est ce qui rend le mécanisme observable sur un appareil sans
> ajouter d'interface à un mécanisme qui n'en demande pas.

## Limites écrites

- **Le filtre de catégorie reste une constante applicative** (1 et 20). Le descendre demanderait
  d'indexer une liste dans un prédicat, ce que la grammaire refuse des deux côtés. Une correction de
  ces identifiants demande donc toujours une release.
- **Les douze points de balayage restent en dur** dans le service. Ils pourraient rejoindre la base
  au jalon [6-G](6-g-etablissements.md), avec le catalogue des établissements — c'est le bon endroit
  pour eux, mais pas maintenant.
- **Le prédicat `where` lève sur un champ absent**, il ne filtre pas en silence. `item.type.code != 4`
  suppose donc que tout établissement porte un `type` ; c'est vrai pour les 41 d'aujourd'hui, et le
  jour où ce ne le serait plus, l'échec serait rangé en `data` — visible, donc corrigeable, ce qui
  vaut mieux qu'une liste amputée sans raison.
- **`fields` ne reconstruit pas un arbre.** Un menu (jour → service → catégorie → plats) et une
  journée d'horaires (paires ouverture/fermeture) descendent donc en **sous-arbres**, projetés côté
  application. C'est la limite qui a le plus décidé de la forme des Blueprints de ce jalon, et elle
  est désormais écrite dans [blueprints.md](../blueprints.md).
- **`as: number` n'apparaît nulle part.** La limite annoncée — un libellé sans nombre rend `null` là
  où un parseur maison rendait `0` — ne concerne que l'extraction DOM de l'Act II ; les cinq sources
  de ce jalon sont des API JSON, dont les nombres arrivent typés. Elle vaudra pour
  [6-F](6-f-scolarite.md).
- **Le référentiel des lieux n'a pas les gardes du registre des Blueprints** — pas d'empreinte, pas de
  refus d'ajout. C'est délibéré et ça se justifie par la nature de la donnée : une coordonnée n'est
  pas de la donnée exécutable. Un publieur compromis peut donc déplacer un bâtiment sur une carte ;
  il pouvait déjà, avec les Blueprints, faire bien pire. L'accès au projet reste un accès de
  production.
- **Aucun cache pour les cinq sources**, et la décision n'a pas bougé : hors ligne, ces écrans sont
  vides — mais ils disent désormais **pourquoi**.
