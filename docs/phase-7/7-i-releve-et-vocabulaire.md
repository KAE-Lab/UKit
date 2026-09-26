# 7-I — Le relevé, et le vocabulaire du mouvement

> **Publication : 6.3.** Ce jalon s'est appelé 6.2-A, puis 6.3-A après le renumérotage du 2026-09-08
> ([README de la phase 6](../phase-6/README.md)) ; il rejoint la phase 7 le 2026-09-15.

> **Jalon ouvert le 2026-09-26.** Ce document était un cadre ; il est devenu spécification ce jour-là,
> après la lecture du code et des documents qu'il cite : les [décisions du 2026-09-26](#décisions-du-2026-09-26),
> la [définition de « terminé »](#définition-de--terminé-), le [plan de test](#plan-de-test) et ce que
> [la lecture du code a corrigé](#ce-que-la-lecture-du-code-a-corrigé). Les écarts entre ce texte et ce
> qui sera fait s'écriront en fin de document, comme pour [6-K](../phase-6/6-k-socle-visuel.md).
>
> Le jalon fondateur de la 6.3, sur le modèle de [6-K](../phase-6/6-k-socle-visuel.md) : celui-ci a donné à
> l'application son vocabulaire de **formes**, celui-là lui donne son vocabulaire de **mouvement**.

> **Amendé le 2026-09-24 : le point de départ visuel est l'Épure** ([identite.md](../identite.md)), l'identité
> née le 2026-09-23 pour les slides de Disrupt Campus. Dans l'application, elle entre à l'intensité
> « signature » : des moments — l'accueil, les états vides, les cartes d'erreur illustrées, les fonds par
> écran —, jamais des traces sur les écrans de travail. Les deux règles laissées plus bas, la police du
> système et l'absence de rondeur, sont **tranchées le 2026-09-26** : elles tiennent
> ([décisions](#décisions-du-2026-09-26)).

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

Il s'écrit dans **`docs/inventaire-mouvement.md`** et compte, sans juger : les moteurs d'animation et
leurs fichiers, les durées et les seuils écrits en dur, les composants d'attente et leurs consommateurs,
puis, écran par écran, le moteur de l'en-tête, les états de chargement, vide et erreur, la façon dont le
contenu entre, l'image et son attente, la stabilité de la hauteur, l'haptique et le fond. Pour le
tableau de bord Campus, il confirme ou corrige sur appareil ce que la lecture du code a listé
([plus bas](#ce-que-la-lecture-du-code-a-corrigé)), avec les captures et les vidéos prises **avant** le
premier changement. Il finit par « ce que le relevé décide » — ce qui entre dans ce jalon, ce qui va
dans un lot de [7-J](7-j-ecrans.md) — et par la liste des écrans que les trois lots de 7-J ne couvrent
pas.

### 2. Le vocabulaire partagé

Posé dans [theme.md](../theme.md), section « Les décisions durables » : squelettes, cascade, ressorts,
états pressés, transitions, fond d'écran, mouvement réduit. Les durées et le ressort deviennent un
sous-arbre **`tokens.mouvement`** de [`tokens.ts`](../../src/shared/theme/tokens.ts), pur et testable ;
le tableau du vocabulaire partagé gagne les trois composants du jalon, `Squelette`, `CarteEnPanne`,
`FondDEcran`. Une règle existante **est réécrite** :

> *« Un chargement bref ne montre rien »* (seuil de 300 ms,
> [`indicateurRetarde.ts`](../../src/shared/ui/indicateurRetarde.ts)) — les squelettes de contenu la
> contredisent par construction, et la 6.3 les demande. La réécrire est un geste du jalon, pas une
> entorse commise en passant. Elle devient *« un chargement annonce sa forme »* : dans le flux, un
> squelette au gabarit du contenu paraît tout de suite ; le seuil reste pour l'indicateur plein écran et
> pour tout indicateur sans forme.

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
> socle) et les annonces de la console ([7-F](7-f-console-annonces.md)), et elle **embarque la mesure**
> ([7-D](7-d-la-mesure.md), en premier sur sa branche) : depuis le 2026-09-21, elle n'a pas de ligne de
> base, ses chiffres sont la première.

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
  ([7-F](7-f-console-annonces.md)). *Livré le 2026-09-22 : la carte v2 est **dessinée** par l'aperçu
  de la console — cadre, focale, badge (aucun pour un événement), logo du partenaire, carte spéciale
  entre ses voisines — et c'est lui la référence à reproduire :
  [la carte v2, dessinée ici](7-f-console-annonces.md#la-carte-v2-dessinée-ici).* *Le 2026-09-26, la
  « même hauteur » l'emporte sur « un seul gabarit » là où les deux se contredisent : voir les
  [décisions](#décisions-du-2026-09-26).*
- **L'ordre des annonces**, par un module **pur et testé**, `src/shared/annonces/ordre.ts` : les
  épinglées d'abord, puis le score de créneau et la priorité, puis une **rotation déterministe par
  heure**. Les paramètres vivent en base — épinglage, priorité, créneaux —, l'algorithme dans
  l'application, et la console montre « l'ordre vu à telle heure » avec le même module.
  `BdeService` l'applique. *Écrit et testé par 7-F le 2026-09-22 ([`ordre.ts`](../../src/shared/annonces/ordre.ts),
  `ordonner(annonces, instant, parametresDe)`, la rotation par « heure modulo taille du groupe », les
  créneaux en jours ISO et heures de Paris lues par `Intl` avec repli local — à vérifier sur Hermes) :
  ici, `BdeService` l'applique après son filtre, avec le `maintenant()` qu'il tient déjà, et
  `AnnonceRow` porte déjà les colonnes.*
- **Le côté application des colonnes d'`etablissements`** — `credits`, `campus`, `alias` :
  `COLONNES`, le type de ligne, `catalogue.ts`, `socle.ts`, la version de cache. La base les porte depuis
  la 6.2.2 — la règle des trois gestes est scindée, piège mesuré le 2026-08-29 — ; ici s'écrit ce
  qui les lit. *Le partage exact avec le lot 3 de 7-J est dans les [décisions](#décisions-du-2026-09-26).*
- **Les squelettes** : `shared/ui/Squelette.tsx`, une forme par carte, pulsation Reanimated, et
  les placeholders **blurhash** d'`expo-image` — la colonne est calculée par la console au
  téléversement. C'est ce qui réécrit la règle « un chargement bref ne montre rien », comme prévu
  plus haut.
- **Les cartes d'erreur illustrées**, au gabarit **exact** des cartes qu'elles remplacent —
  `CarteEnPanne`, une par section, illustration monochrome dans la grammaire de l'Épure. Une
  section garde sa hauteur quoi qu'il arrive à sa source.
- **Les fonds par écran** sont des **images statiques pré-rendues, une par onglet et par thème**,
  derrière la zone d'en-tête, estompées au défilement, servies par `expo-image`
  (`shared/ui/FondDEcran.tsx`, zéro coût de rendu). Elles s'accordent à la fumée de
  [`PiedFlottant`](../../src/shared/ui/PiedFlottant.tsx), elles ne la concurrencent pas. *La « veine du
  visuel aurora de la v6 » écrite le 2026-09-14 n'existe nulle part dans le dépôt : la veine est celle
  de l'Épure, choisie sur planche.*
- ~~**Le tirer-pour-rafraîchir signature**, sobre, à la place du spinner système.~~ *Retiré le
  2026-09-26 : le spinner du système reste ([décisions](#décisions-du-2026-09-26)).*
- **La requête d'occupation groupée** par bâtiment, **si** la sonde de la 6.2.2 la valide — sur trois
  journées, un run groupé comparé aux dix-sept runs individuels de l'A28 ; sinon la règle actuelle,
  une requête par salle, reste, derrière le cache d'occupation que la 6.2.2 pose de toute façon.
  *Tranché le 2026-09-26 : elle entre, en dernier ([décisions](#décisions-du-2026-09-26)).*
- **Les deux thèmes à égalité.** Décision du propriétaire du produit : **aucun verrou** tant qu'aucun
  chiffre ne le justifie ; chaque écran de la 6.3 se juge **dans les deux thèmes**, sur les deux
  appareils, avec ses captures avant et après dans [screenshots/](../screenshots/).

## Décisions du 2026-09-26

> Prises à l'ouverture du jalon, après la lecture du code de la branche et de la console. Les
> quatre premières sont celles du propriétaire du produit ; les suivantes en découlent ou tranchent ce
> que le cadre laissait ouvert.

| Sujet | Décision |
|---|---|
| **Les dates** | La phase n'en porte plus : ni date de gel, ni version « visée ». Une version sort quand ses jalons sont livrés ([README de la phase](README.md#les-publications)). |
| **Les cartes spéciales** | **Le gabarit de l'hôte.** Dans un carrousel de lieux, l'annonce prend la largeur et la hauteur de visuel de ses voisines — l'image en `cover` autour de sa focale, le badge du type, le kicker et le titre. Dans le carrousel des annonces et dans la grille, elle reste 4:5. « Un seul gabarit, deux largeurs » devient **une seule carte, deux cadres** : la règle de [theme.md](../theme.md) — les cartes d'une section ont la même hauteur — l'emporte sur la lettre de l'aperçu, qui dessinait la spéciale entre des voisines fictives 4:5. Elle se place **en tête** de son carrousel. |
| **L'occupation groupée** | **Dans ce jalon, en dernier.** La sonde tient sur tout sauf la clause « 99 % d'événements à zéro ou une salle », qui supposait qu'un cours multi-salles serait inattribuable ; il est attribuable à chacune de ses salles. Ce qui l'accompagne : une règle d'attribution pure portée de la sonde, les événements de vacances — qui ne nomment aucune salle — distribués à toutes les salles pour que la fermeture d'un bâtiment tienne, un sous-cas de parité groupé, le Blueprint en version 4 (sa description seule change). Un run groupé en échec ne met rien en cache et se rejoue à l'ouverture suivante. |
| **Le tirer-pour-rafraîchir** | **Le spinner du système reste.** Sur Android le contrôle natif intercepte le geste sans en donner la progression ; un geste maison sur les deux plateformes était le point le plus risqué du jalon pour un moment que l'Épure porte déjà ailleurs. |
| La police | **Celle du système**, tranchée ; Geist reste au site et à la communication ([identite.md](../identite.md#ce-qui-reste-à-trancher)). |
| La rondeur | **Le carré arrondi**, tranché pour l'application ; l'Épure s'y plie ici. |
| Les moteurs d'animation | **Converger l'écran fondateur seul** — son en-tête, son défilement, ses cartes — et écrire la règle : tout nouveau mouvement s'écrit en Reanimated ; l'`Animated` legacy est toléré dans l'existant jusqu'à la reprise de l'écran. [`NavHelpers`](../../src/shared/navigation/NavHelpers.tsx) et ses onze écrans convergent dans les lots de [7-J](7-j-ecrans.md) : le toucher sans reprendre ses écrans casserait tous les en-têtes pour rien. |
| Les fonds par écran | **Campus seul dans ce jalon**, le composant prêt pour les trois autres onglets en 7-J. L'image est **pré-estompée** — Android n'a pas de masque — et s'efface au défilement par son opacité. Les deux thèmes se dessinent sur planche : l'Épure claire n'existe pas encore. |
| Les transitions d'écran | **Celles de la pile**, écrites comme telles. Mesuré : Reanimated 4.5 livre encore `SharedTransition`, mais derrière un drapeau natif désactivé par défaut, et la pile de navigation est en JavaScript ; rien de promis pour la 6.3. |
| Le catalogue | **La lecture** dans ce jalon : le type de ligne, la projection, le socle embarqué, `COLONNES`, la version de cache `@5` après vérification des valeurs en production, un accesseur `campusActif()` ; et le repli « Talence » du mapping des bâtiments et des deux cartes de salles, parce qu'ils vivent dans l'écran fondateur. La liste regroupée par campus, la recherche par alias et les crédits à l'écran restent au **lot 3 de 7-J**. |
| Le blurhash des lieux | **Hors 6.3** : seule la table `annonces` porte la colonne ; restaurants, bibliothèques et bâtiments gardent le gris du conteneur pendant le chargement. |
| La section Annonces vide | Squelette d'abord ; si la base n'a rien, la section **se replie en animant** au lieu de disparaître d'un coup. |
| Une carte partenaire | Toucher ouvre la **fiche**, comme toute annonce ; le bouton d'action y porte le lien. |
| La mesure | **Aucun événement nouveau**, donc aucune migration : `source.echec` couvre les pannes ; `annonce.impression` compte une carte spéciale vue dans un carrousel de lieux, par un filtre sur la nature de l'élément. |
| Le squelette | Il reproduit la **structure** de la carte — mêmes tokens, textes remplacés par une espace et une barre, la règle du teaser de `LigneScolarite` : la hauteur est égale par construction, pas par constante. |
| La méthode | Ce qui se juge se choisit **sur planche**, plusieurs options côte à côte, avant d'être codé : les fonds dans les deux thèmes, la carte en panne, le squelette. |

## L'état de l'infrastructure, mesuré le 2026-09-06

Ce qu'il y a déjà, et ce qui manque ; **remesuré le 2026-09-26** sur la branche du jalon, après la
fusion de `main` :

- **Reanimated 4 est présent mais n'anime que cinq fichiers** :
  [`Card`](../../src/shared/ui/Card.tsx), `ApparitionEnFondu`, `Interrupteur`, `Curseur`,
  `WebBrowserComponents`. `Card` porte le **seul** `LinearTransition` du dépôt. *Inchangé le 26-09 ;
  vingt fichiers animent encore en `Animated` legacy, cinq avec `useNativeDriver: false`.*
- **Les en-têtes fondent au scroll en `Animated` legacy**, avec `useNativeDriver: false`
  ([`NavHelpers.tsx`](../../src/shared/navigation/NavHelpers.tsx)), consommé par une douzaine
  d'écrans. **Deux moteurs d'animation coexistent** — les converger fait partie du jalon. *Le 26-09 :
  onze écrans exactement, et trois en-têtes d'onglet recopiés à la main — Campus, Scolarité, Réglages.*
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
  *Le 26-09 : en place dans huit fichiers, aucun `placeholder` ni `contentPosition` encore posé ;
  `expo-image` 57.0.5 offre les deux.*
- *Le 26-09 : aucun token de mouvement ; les durées sont éparpillées — 200, 220, 120, 240, 250, 300,
  1 000 et 4 000 ms — ; aucun composant ne respecte le réglage « réduire les animations » du système.*

## Ce que la lecture du code a corrigé

Relu le 2026-09-26, sur `main` puis sur `v6.3` fusionnée :

- **Le tableau de bord change de hauteur partout.** Chaque section passe d'un indicateur d'environ
  84 points à un carrousel d'environ 260, à quatre instants différents — trois sections attendent la
  position, la quatrième non ; la section Annonces disparaît entièrement quand elle est vide ; les
  favoris et le filtre, relus à chaque retour sur l'onglet, refont trier les cartes **après** le premier
  rendu, et le ressort de `Card` fait glisser les cartes à chaque retour ; le bandeau de couverture
  partielle des bibliothèques s'insère après le chargement ; une panne remplace une carte de 260 points
  par une ligne de 36. C'est la liste que le relevé confirme sur appareil.
- **Deux fondus se superposent** sur chaque carte : celui de `Card` à l'entrée et celui de l'image à
  son arrivée — ce que [theme.md](../theme.md) nomme et interdit.
- **`AnnonceRow` porte les colonnes, `BdeService` ne les lit pas** : ses vingt et une colonnes nommées
  ignorent `type`, `emplacements`, `ajustement`, `focale`, `priorite`, `epinglee`, `creneaux`,
  `blurhash` et `partenaire`, et il n'appelle pas `ordonner()`. `statut` et la programmation sont
  filtrés par la politique de lecture : l'application n'a pas à les lire.
- **Il n'existe pas de `types.ts` dans `shared/etablissements/`** : le type de ligne est dans
  `shared/supabase/types.ts`, les types applicatifs dans `catalogue.ts`. Et le parseur du test du
  socle ne connaît que le cast `::jsonb` : la colonne `alias`, un `text[]`, lui demande d'apprendre.
- **L'A28 compte dix-sept salles**, pas dix-huit : le chiffre mesuré par la sonde et sur les deux
  appareils le 2026-09-21.
- **Reanimated 4 n'a pas « retiré » l'élément partagé** : il le livre derrière un drapeau natif
  désactivé, et la pile est en JavaScript. Le résultat est le même — rien n'est promis —, la raison
  est écrite juste.
- **La fusion `main → v6.3`** a donné huit conflits, tous de documentation sauf `policies.sql` ;
  `schema.sql` et `fonctions.sql` ont fusionné seuls, contrairement à ce que le README de la phase
  annonçait. Après elle, [`AppCore.tsx`](../../src/shared/services/AppCore.tsx) est à **400 lignes
  effectives sur 400** : rien n'y entre.
- **Le « visuel aurora de la v6 »** cité le 2026-09-14 n'existe dans aucun dépôt ; le seul producteur
  d'image d'identité est le kit de l'Épure, qui ne connaît que le sombre.

## Dépendances

[6.1.x-A](../phase-6/6-1-x-a-montee-du-socle.md) : la boucle d'itération, et le socle sur lequel le
mouvement sera jugé. Écrire des animations avant la montée reviendrait à les rejuger après.

Depuis le 2026-09-14, trois de plus, dans cet ordre : [7-C](7-c-economie-et-socle.md), publié en 6.2.2
(`expo-image`, le cache d'occupation, les colonnes en base), [7-D](7-d-la-mesure.md), joué en premier
sur la même branche `v6.3` (depuis le 2026-09-21 ; il n'y a plus de ligne de base d'avant la refonte),
et [7-F](7-f-console-annonces.md), les annonces de la console, sans lequel les cartes v2 n'auraient
rien à afficher. *Les trois sont livrés le 2026-09-26, et `main` est fusionnée dans `v6.3`.*

## Définition de « terminé »

1. `docs/inventaire-mouvement.md` existe, daté, avec ses commandes rejouables ; il compte au lieu de
   juger, et il dit ce qu'il décide.
2. Les captures et les vidéos **avant** ont été prises sur les deux appareils et dans les deux thèmes
   avant le premier changement de code ; les captures **après** leur répondent, sous la convention de
   [screenshots/](../screenshots/README.md).
3. [theme.md](../theme.md) porte le vocabulaire du mouvement dans « Les décisions durables », la règle
   du chargement réécrite, les trois composants dans le tableau du vocabulaire partagé ;
   `tokens.mouvement` existe et est lu par les composants qui animaient déjà.
4. Le tableau de bord Campus : aucune section ne change de hauteur entre son squelette, son contenu et
   sa panne ; le contenu entre en cascade ; aucun reflux au premier rendu ; le fond est posé et
   s'efface au défilement ; les deux thèmes, les deux appareils.
5. La carte v2 rend **comme l'aperçu de la console** — cadre, focale, contenir, badge, partenaire,
   blurhash — par un module pur partagé avec elle ; `BdeService` lit les colonnes et applique
   `ordonner()` ; une carte spéciale paraît en tête du carrousel de son emplacement, au gabarit de
   l'hôte, et compte une impression.
6. Le catalogue lit `credits`, `campus` et `alias` ; le socle les embarque et son test le garantit ;
   le cache est en `@5`, incrémenté après vérification des valeurs en production ; plus aucun
   « Talence » de repli dans le mapping des bâtiments ni dans les cartes de salles.
7. L'occupation d'un bâtiment part en **un** run ; la règle d'attribution est pure et testée, la
   fermeture par vacances tient, le cas de parité groupé est vert, le Blueprint est en version 4.
8. Le réglage « réduire les animations » du système coupe cascades et pulsations.
9. `npx tsc --noEmit`, `npx eslint . --max-warnings=0`, `npm test`, `npm run parity`, `npx expo export`
   sur les deux plateformes : verts ; l'intégration continue verte sur `v6.3`.
10. La documentation dans le même changement : ce document amendé, [theme.md](../theme.md),
    [campus.md](../features/campus.md), [campus-vie-etudiante.md](../features/campus-vie-etudiante.md),
    [campus-salles-libres.md](../features/campus-salles-libres.md), [navigation.md](../navigation.md),
    [backend.md](../backend.md), [identite.md](../identite.md), le README et le CHANGELOG, l'état du
    [README de la phase](README.md#létat).

## Plan de test

Sur l'iPhone 13 Pro et le Galaxy A8, dans les deux thèmes, Metro lu depuis le poste :

1. **Ouverture à froid de Campus** : les quatre squelettes paraissent tout de suite, à la hauteur des
   cartes ; le contenu entre en cascade ; aucun changement de hauteur de section ; aucun reflux au
   premier rendu quand des favoris existent.
2. **Le fond** : derrière le titre, il s'efface au défilement et revient ; il ne concurrence pas la
   fumée de la barre d'onglets.
3. **Panne par section** : l'interrupteur HORS LIGNE du menu flottant pour les trois sources tierces ;
   `SUPABASE_URL` sur `.invalid` et `expo start -c` pour les annonces. Chaque section montre sa carte
   en panne à la hauteur d'une carte, Réessayer ou Voir tout selon la famille.
4. **Le filtre qui masque tout** : la ligne « Tout afficher » repeuple immédiatement, inchangée.
5. **La carte v2** : une annonce re-téléversée par la console, en audience `testeurs`, montre son
   blurhash puis son image cadrée comme l'aperçu de la console ; une ancienne, en « contenir », garde
   son rendu ; un événement n'a pas de badge, un bon plan en a un.
6. **La carte spéciale** : un bon plan en emplacement « restaurants » paraît en tête du carrousel
   Restaurants au gabarit des voisines ; toucher ouvre la fiche ; le bloc Mesure du menu de
   développement compte une impression.
7. **L'ordre** : deux annonces épinglées ou prioritaires paraissent dans l'ordre du panneau « ordre vu
   à telle heure » de la console ; l'heure de Paris sous Hermes se lit dans le journal.
8. **L'étoile de favori** : retour haptique, un reflux animé ; un retour sur l'onglet ne fait plus rien
   bouger.
9. **Mouvement réduit** activé dans le système : ni pulsation ni cascade, tout reste lisible.
10. **Le tirer** : le spinner du système, le contenu gardé pendant la relecture.
11. **L'occupation** : la fiche de l'A28 écrit **une** ligne `[chrono] ukit.celcat.occupation` au lieu de
    dix-sept ; les créneaux libres sont ceux de la veille ; une journée de vacances, par la simulation
    temporelle, ferme le bâtiment.
12. Les captures « après » et les deux vidéos.

## Limites écrites

- **Ce qui se vérifie devient un jalon, ce qui se juge se tranche en session.** Le relevé, le
  vocabulaire et l'écran fondateur sont ce jalon ; refaire un écran est un lot de
  [7-J](7-j-ecrans.md), mené en session.
- **Le tableau de bord Campus est un écran de référence de 6-K.** Le prendre comme écran fondateur
  rouvre ce contrat, et il faut l'assumer explicitement plutôt que le constater après coup : les
  captures « avant » sont là pour dire ce qui a bougé.
- **Le mouvement n'a pas de porte automatique.** Aucun test ne monte un composant ; ce qui peut être
  pur — les durées, l'attribution des salles, la projection des colonnes — est testé, le reste se juge
  sur les deux appareils.
- **Les durées échappent à `ukit/no-style-literals`** : ce sont des arguments, pas des propriétés de
  style. `tokens.mouvement` est une convention, pas une règle appliquée.
- **Les lieux n'ont pas de blurhash** ; le gris du conteneur reste leur attente.
- **Un run d'occupation groupé en échec vide tout le bâtiment pour cette ouverture**, là où dix-sept
  runs en laissaient réussir quelques-uns ; le cache ne garde rien et l'ouverture suivante rejoue.
- **L'ordre des annonces change à l'heure pleine**, mais un tableau de bord laissé ouvert garde l'ordre
  de l'heure où il a lu : il relit au retour au premier plan et au tirer.
