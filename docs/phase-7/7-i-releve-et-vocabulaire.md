# 7-I — Le relevé, et le vocabulaire du mouvement

> **Publication : 6.3.** Ce jalon s'est appelé 6.2-A, puis 6.3-A après le renumérotage du 2026-09-08
> ([README de la phase 6](../phase-6/README.md)) ; il rejoint la phase 7 le 2026-09-15.

> **Cadre, pas encore spécification.** La direction précise de la 6.3 se tranche sur des captures posées
> côte à côte, et son détail au moment du relevé. Ce document pose la méthode et les contraintes ; il se
> complète avant d'être ouvert.
>
> Le jalon fondateur de la 6.3, sur le modèle de [6-K](../phase-6/6-k-socle-visuel.md) : celui-ci a donné à
> l'application son vocabulaire de **formes**, celui-là lui donne son vocabulaire de **mouvement**.

## La direction

*« Rien n'apparaît sans être annoncé par sa forme. »* La 6.1-E a rendu l'application correcte ; elle
ne l'a pas rendue fluide, et le second travail n'est pas la suite du premier. Squelettes de contenu à
la place des indicateurs, entrées échelonnées, ressorts plutôt que durées fixes, états pressés,
transitions d'écran — et, décision du 2026-09-06, **un fond par écran**.

Trois choses sont prises à la référence, et une ne l'est pas :

| Pris | Laissé |
|---|---|
| **les fonds par écran** | **la rondeur** — [theme.md](../theme.md) garde « aucune forme ronde, tout est carré arrondi » |
| **la mise en scène du contenu** | **la fonte propre** — « une seule police, celle du système » reste la règle |
| **les transitions d'écran** | |

## Ce qui est à faire

### 1. Le relevé de ce qui saute

Écran par écran, sur le modèle de [inventaire-visuel.md](../inventaire-visuel.md) : **une mesure
datée qui ne bouge plus**, et qui servira de liste de contrôle finale. C'est ce relevé qui rend la
version vérifiable — sans lui, on ne saura pas dire quand elle est finie.

### 2. Le vocabulaire partagé

Posé dans [theme.md](../theme.md), section « Les décisions durables » : squelettes, cascade,
ressorts, états pressés, transitions, fond d'écran. Une règle existante **est réécrite** :

> *« Un chargement bref ne montre rien »* (seuil de 300 ms,
> [`indicateurRetarde.ts`](../../src/shared/ui/indicateurRetarde.ts)) — les squelettes de contenu la
> contredisent par construction, et la 6.3 les demande. La réécrire est un geste du jalon, pas une
> entorse commise en passant.

### 3. L'écran fondateur : le tableau de bord Campus

Décision du 2026-09-06. C'est le plus simple à adapter et le plus varié en états — quatre sources
tierces, carrousels, tuiles, chargements indépendants, échecs partiels. **Tout le vocabulaire y passe
en une fois**, et ce qui y est décidé fait règle pour les lots de [7-J](7-j-ecrans.md).

Fichiers : [`CampusDashboard.tsx`](../../src/features/Campus/Dashboard/CampusDashboard.tsx),
`Dashboard/rafraichissement.tsx`, `Dashboard/components/`, et les sections `Crous`, `Library`,
`FreeRoom`, `Bde`.

## Décisions du 2026-09-14

> Prises à la [mise à plat de la phase 7](7-mise-a-plat.md), après la 6.2.1 ; elles complètent le
> cadre sans le rouvrir. L'écran fondateur reste le tableau de bord Campus, et ce qui y est décidé fait
> toujours règle pour les lots de [7-J](7-j-ecrans.md). La 6.3 vient **après** la 6.2.2 (économie et
> socle), la 6.2.3 (la mesure) et les annonces de la console ([7-F](7-f-console-annonces.md)) : elle
> **se compare aux chiffres de la 6.2.3**, qui sont sa ligne de base.

Le tableau de bord porte désormais aussi :

- **Les cartes d'annonce v2.** Cadre **4:5**, qui remplace le 1:1 du 2026-08-30. Par défaut l'image
  **couvre** le cadre autour d'un **point focal** choisi dans la console ; « **contenir** sur fond
  flou » reste une option par annonce. Un `type` — événement, info, bon plan, partenaire — et ses
  badges ; un seul gabarit, deux largeurs. Les **cartes spéciales** s'injectent dans les autres
  carrousels par `emplacements` — annonces, restaurants, bibliothèques, salles —, à la **même
  hauteur** que leurs voisines. Fichiers :
  [`BdeAnnonceCard.tsx`](../../src/features/Campus/Bde/BdeAnnonceCard.tsx) réécrite,
  [`BdeSection.tsx`](../../src/features/Campus/Dashboard/components/BdeSection.tsx),
  [`BdeScreen.tsx`](../../src/features/Campus/Bde/BdeScreen.tsx),
  [`CarrouselDeSection.tsx`](../../src/features/Campus/Dashboard/components/CarrouselDeSection.tsx).
  Les colonnes arrivent en base avec la 6.2.2 ; l'éditeur avec aperçu du téléphone, dans la console
  ([7-F](7-f-console-annonces.md)).
- **L'ordre des annonces**, par un module **pur et testé**, `src/shared/annonces/ordre.ts` : les
  épinglées d'abord, puis le score de créneau et la priorité, puis une **rotation déterministe par
  heure**. Les paramètres vivent en base — épinglage, priorité, créneaux —, l'algorithme dans
  l'application, et la console montre « l'ordre vu à telle heure » avec le même module.
  `BdeService` l'applique.
- **Le côté application des colonnes d'`etablissements`** — `credits`, `campus`, `alias` :
  `COLONNES`, `types.ts`, `catalogue.ts`, `socle.ts`, la version de cache. La base les porte depuis
  la 6.2.2 — la règle des trois gestes est scindée, piège mesuré le 2026-08-29 — ; ici s'écrit ce
  qui les lit.
- **Les squelettes** : `shared/ui/Squelette.tsx`, une forme par carte, scintillement Reanimated, et
  les placeholders **blurhash** d'`expo-image` — la colonne est calculée par la console au
  téléversement. C'est ce qui réécrit la règle « un chargement bref ne montre rien », comme prévu
  plus haut.
- **Les cartes d'erreur illustrées**, au gabarit **exact** des cartes qu'elles remplacent —
  `CarteEnPanne`, une par section, illustration monochrome dans la grammaire du filigrane. Une
  section garde sa hauteur quoi qu'il arrive à sa source.
- **Les fonds par écran** sont des **images statiques pré-rendues, une par onglet et par thème**,
  dans la veine du visuel « aurora » de la v6 : derrière la zone d'en-tête, estompées au
  défilement, servies par `expo-image` (`shared/ui/FondDEcran.tsx`, zéro coût de rendu). Elles
  s'accordent à la fumée de [`PiedFlottant`](../../src/shared/ui/PiedFlottant.tsx), elles ne la
  concurrencent pas.
- **Le tirer-pour-rafraîchir signature**, sobre, à la place du spinner système.
- **La requête d'occupation groupée** par bâtiment, **si** la sonde de la 6.2.2 la valide — sur trois
  journées, un run groupé comparé aux dix-huit runs individuels de l'A28 ; sinon la règle actuelle,
  une requête par salle, reste, derrière le cache d'occupation que la 6.2.2 pose de toute façon.
- **Les deux thèmes à égalité.** Décision de Kylian : **aucun verrou** tant qu'aucun chiffre ne le
  justifie ; chaque écran de la 6.3 se juge **dans les deux thèmes**, sur les deux appareils, avec
  ses captures avant et après dans [screenshots/](../screenshots/).

## L'état de l'infrastructure, mesuré le 2026-09-06

Ce qu'il y a déjà, et ce qui manque :

- **Reanimated 4 est présent mais n'anime que cinq fichiers** :
  [`Card`](../../src/shared/ui/Card.tsx), `ApparitionEnFondu`, `Interrupteur`, `Curseur`,
  `WebBrowserComponents`. `Card` porte le **seul** `LinearTransition` du dépôt.
- **Les en-têtes fondent au scroll en `Animated` legacy**, avec `useNativeDriver: false`
  ([`NavHelpers.tsx`](../../src/shared/navigation/NavHelpers.tsx)), consommé par une douzaine
  d'écrans. **Deux moteurs d'animation coexistent** — les converger fait partie du jalon.
- **L'haptique n'existe qu'à deux endroits** : `Interrupteur` et `Curseur`.
- **Les transitions d'écran sont celles par défaut** de la pile de navigation, sans aucune
  personnalisation.
- **Il n'existe aucun fond d'écran.** L'identité tient aux aplats de thème, aux ombres, à la
  « fumée » des flottants du bas ([`PiedFlottant.tsx`](../../src/shared/ui/PiedFlottant.tsx)) et au
  filigrane à six pour cent ([`GlypheFiligrane.tsx`](../../src/shared/ui/GlypheFiligrane.tsx)). Le
  fond par écran est donc un **ajout**, et il se raccroche naturellement au vocabulaire du
  filigrane. `PiedFlottant` est le seul consommateur d'`expo-linear-gradient` et de `MaskedView` du
  dépôt : le fond doit s'y accorder, pas le concurrencer.
- **Les images passent par le `Image` de React Native** — pas d'`expo-image`, donc ni `cachePolicy`,
  ni placeholder blurhash, ni transition de chargement. *Corrigé le 2026-09-14 : `expo-image` arrive
  avec la **6.2.2**, avec les URL de rendu du Pro et le repli sur l'origine ; la 6.3 le trouve en
  place — squelettes, placeholders et fonds statiques s'appuient dessus — et n'a pas à l'introduire.*

## À trancher avant ouverture

- **La direction des fonds** : sur captures, côte à côte avec la référence. *Le 2026-09-14 en a
  tranché la technique et la veine — des images statiques pré-rendues, par onglet et par thème, dans
  la veine du visuel « aurora » de la v6 ; le rendu exact se juge toujours sur captures, dans les deux
  thèmes.*
- **Les transitions d'écran, et jusqu'où.** Les transitions d'élément partagé sont à **mesurer**
  avant d'être promises : Reanimated 4 a retiré son mécanisme, et la pile de navigation n'en offre
  pas. Ne rien inscrire ici tant que ce n'est pas prouvé sur appareil.
- **Le sort des deux moteurs d'animation** : tout converger, ou seulement ce que les écrans pilotes
  touchent.

## Dépendances

[6.1.x-A](../phase-6/6-1-x-a-montee-du-socle.md) : la boucle d'itération, et le socle sur lequel le
mouvement sera jugé. Écrire des animations avant la montée reviendrait à les rejuger après.

Depuis le 2026-09-14, trois de plus, dans cet ordre : [7-C](7-c-economie-et-socle.md), publié en 6.2.2
(`expo-image`, le cache d'occupation, les colonnes en base), [7-D](7-d-la-mesure.md), publié en 6.2.3
(la ligne de base à laquelle la 6.3 se compare), et [7-F](7-f-console-annonces.md), les annonces de la
console, sans lequel les cartes v2 n'auraient rien à afficher.

## Limites écrites

- **Ce qui se vérifie devient un jalon, ce qui se juge se tranche en session.** Le relevé, le
  vocabulaire et l'écran fondateur sont ce jalon ; refaire un écran est un lot de
  [7-J](7-j-ecrans.md), mené en session.
- **Le tableau de bord Campus est un écran de référence de 6-K.** Le prendre comme écran fondateur
  rouvre ce contrat, et il faut l'assumer explicitement plutôt que le constater après coup.
