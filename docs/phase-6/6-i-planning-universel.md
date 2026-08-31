# 6-I — L'emploi du temps universel

> **Jalon livré** — 2026-08-15. **Bordeaux INP a un emploi du temps**, par l'export iCalendar anonyme
> d'ADE, et l'écran est celui de Bordeaux au pixel près — aucun composant n'a été touché. Le
> catalogue porte la source, le référentiel des groupes et la reconnaissance de salle ; les deux
> Blueprints vivent sous le préfixe réservé, donc **ajoutés sans release**. Les écarts entre ce texte
> et ce que la mesure a imposé sont rassemblés dans [Écarts constatés](#écarts-constatés), en bas de
> page — ils sont nombreux, et le premier est que la mesure d'origine visait le mauvais projet ADE.

## Le problème

Le jalon [6-E](6-e-planning.md) a porté l'emploi du temps sur **Celcat**, et ça a marché parce que
`celcat.u-bordeaux.fr` répond sans authentification. C'est une **exception**, pas la règle :

- Celcat ne couvre qu'une partie de l'Université de Bordeaux ;
- les instances Celcat des autres universités sont derrière un SSO — mesuré sur Toulouse III
  (`edt.univ-tlse3.fr` renvoie vers Shibboleth) et Toulouse II ;
- un balayage de vingt universités françaises n'a trouvé **aucune** autre instance Celcat ouverte ;
- Bordeaux INP, le second établissement du catalogue, est sur **ADE**.

Porter chaque produit d'emploi du temps un par un serait sans fin. Mais tous — ADE, Hyperplanning,
Celcat, uPortal — savent **exporter en iCal**, et c'est un format normalisé (RFC 5545).

## Ce que la mesure a établi

Sondé le 2026-08-10, **et re-sondé le 2026-08-15 en livrant** — la seconde mesure a corrigé la
première sur deux points, et c'est écrit dans les [Écarts constatés](#écarts-constatés). Sur
`ade.bordeaux-inp.fr`, en lecture seule :

```
/jsp/custom/modules/plannings/anonymous_cal.jsp
    ?resources=<ids>&projectId=<n>&calType=ical&firstDate=AAAA-MM-JJ&lastDate=AAAA-MM-JJ
```

- l'export est **anonyme** : aucun cookie, aucune authentification ;
- il est **borné par l'URL** : `firstDate` / `lastDate` sont des paramètres. C'est le point décisif —
  ça se branche **sans rien changer** sur les signatures existantes du service (`fetchCalendarDay`,
  `fetchCalendarWeek`, `fetchCalendarForSynchronization`) ;
- il est **riche** : `SUMMARY` porte la matière, `LOCATION` la salle, `DESCRIPTION` le code de module,
  le type (CM/TD/CI), le groupe et l'enseignant. La forme exacte, elle, n'est pas celle qu'on croyait
  — voir l'écart 4 ;
- il est **vivant**, et l'année écoulée reste servie — **3156 événements sur l'année 2025-2026** pour
  tout l'établissement (mesure du 2026-08-15, `projectId=1`). Conséquence pratique : **on peut
  développer et vérifier tout de suite**, sans attendre la rentrée, et un cas de parité épinglé sur
  une **semaine passée fixe** est reproductible pour toujours — là où un test sur « cette semaine »
  casserait à chaque vacances ;
- il couvre **tout Bordeaux INP**, pas seulement une école : ENSC, ENSEIRB-MATMECA, ENSCBP, ENSEGID
  et ENSTBB sont dans le même arbre de ressources ;
- `resources` accepte **plusieurs index séparés par une virgule**, et les bornes de dates sont
  **inclusives** : le planning agrégé des favoris tient donc en une requête, et une journée se demande
  par `debut = fin`.

## Trois obstacles, et ils ne sont pas du même ordre

### 1. Un Blueprint ne pouvait pas ramener ce corps — c'était un manque du moteur, il est comblé

L'extraction d'Aetherius ne connaît que `from: "json"` et `from: "html"`
(`src/aetherius/core/extraction/dispatch.py`), et le step `http.request` publie `status_code` et
`headers`, **jamais le texte brut** (`src/aetherius/acts/vector/driver.py`).

Faire passer un iCal par l'extracteur HTML détruirait le pliage de lignes de la RFC 5545 — une ligne
de continuation commence par une espace, et rien ne garantit qu'une normalisation HTML la préserve.
C'est exactement le contournement que la [note de portée de la Phase 6](README.md) interdit : *« un
manque se traite là-bas, pas par un contournement ici »*.

**Ce jalon dépendait donc d'un jalon Aetherius, et il est livré** :
`docs/phase-3/3-i-extraction-texte.md` dans le dépôt voisin, publié en **0.5.4**. Trois choses de sa
livraison ont décidé de la façon d'écrire les Blueprints ici :

- le décodage suit l'en-tête de réponse, avec une **table d'encodages bornée et identique** dans les
  deux moteurs : `iso-8859-1` et ses alias, `windows-1252`, et **tout le reste en UTF-8**. Un serveur
  qui étiquette autrement sera donc lu en UTF-8, sans avertissement ;
- une extraction `from: "text"` **refuse** `path`, `where`, `fields`, `selector`, `selector_type`,
  `attr` et `multiple` — un Blueprint qui croirait filtrer est arrêté à la validation ;
- le corps n'est lu en octets **que si** un `from: "text"` est déclaré : les Blueprints existants ne
  paient rien.

Première tâche du jalon, avant tout le reste : **épingler `@aetherius/engine` et
`@aetherius/react-native` en `^0.5.4`** dans `package.json`. C'est fait, et le premier geste qui a
suivi a été de jouer les deux fichiers contre la vraie source sous Node — 5 événements sur une
journée, 587 sur l'année, accents compris.

### 2. Deux champs de `PlanningEvent` n'ont pas de source dans un iCal

Le contrat rendu aux écrans est
[`PlanningEvent`](../../src/features/Planning/services/PlanningApiMapping.ts), treize champs plats.
**Tant que le mapper iCal produit ce type-là, aucun écran ne change** — ni les cases de cours, ni le
carrousel des cours simultanés, ni la vue semaine, ni la fiche. C'est le même mécanisme qui a fait que
Bordeaux INP n'a pas touché un seul écran de scolarité au jalon 6-G, et **c'est le résultat attendu :
visuellement identique au système de groupes.**

Deux champs demandent une décision, parce que la source ne les donne pas :

| Champ | Celcat | iCal |
|---|---|---|
| `color` / `style` | `backgroundColor`, donné par le serveur | **rien** |
| `category` (CM/TD/TP) | `eventCategory`, un champ à part | dans `DESCRIPTION`, en texte libre — donc heuristique |
| `subject`, `date`, `starttime`, `endtime` | champs | `SUMMARY`, `DTSTART`/`DTEND` — direct |

**La couleur est dérivée de la matière**, et c'est la décision produit du jalon. Une empreinte
stable (FNV-1a) choisit l'une des **huit teintes que `theme.courses` utilise déjà pour Celcat**,
exposées sous les clés `palette-1…8` : même cours, même couleur toute l'année ; même vocabulaire
visuel d'un établissement à l'autre ; et **pas un pixel de changé pour Bordeaux**, qui garde la
couleur de son serveur. Aucun composant n'a été touché — `CourseRow` et `CourseScreen` lisaient déjà
`theme.courses[data.color] ?? theme.courses.default`.

**La catégorie est bien une heuristique**, et son ancre n'est pas celle que ce texte annonçait : voir
l'écart 4. Un événement sans code de module n'a pas de type dérivable, la catégorie vaut alors la
chaîne vide, et la pastille ne s'affiche pas — une garde d'affichage ajoutée dans les deux composants,
la seule qu'il ait fallu.

### 3. La découverte des groupes n'est pas résolue par l'iCal

ADE n'expose pas d'arbre de ressources anonyme : l'export prend des **identifiants numériques**, et
rien ne dit lequel correspond à quel groupe. Deux réponses possibles, et elles ne coûtent pas la même
chose :

| Réponse | Ce qu'elle demande | Ce qu'elle donne |
|---|---|---|
| Un référentiel `id → nom de groupe`, construit **une fois hors ligne** par un auteur et publié en base | une passe d'auteur par établissement | la même expérience qu'aujourd'hui : l'étudiant choisit son groupe dans une liste |
| L'étudiant **colle son lien d'abonnement**, généré depuis son ENT | un écran de saisie, et un lien par étudiant | marche partout, y compris là où l'export est personnel — mais demande un geste que personne n'a envie de faire |

**La première a été retenue**, et le relevé est scripté :
[`tools/releve-ade.mjs`](../../tools/releve-ade.mjs) balaie les index, lit les libellés dans les
événements et rend un rapport ; l'auteur nomme. Treize groupes sur cinq écoles sont publiés dans la
colonne `edt` du catalogue. Ce que le relevé a appris de plus que ce texte — l'index positionnel,
l'échantillonnage sur trois semaines, et pourquoi le script ne peut pas nommer seul — est dans les
écarts 2, 3 et 9.

La seconde reste le repli pour les établissements dont l'export n'est pas anonyme, et elle appartient
à [6-J](6-j-compte-et-sources-par-etablissement.md).

## Ce que la carte du cours va révéler, et qui n'est pas dans l'iCal

Le référentiel des lieux **est** migré : 73 bâtiments en base depuis le jalon
[6-D](6-d-campus.md), `assets/locations.json` en socle embarqué, correction champ par champ et
**ajout** d'un code absent — donc les bâtiments d'une nouvelle université se publient sans release.

Mais **ce qui relie un cours à un bâtiment est resté bordelais**, et c'est du code :

```js
// shared/services/AppCore.tsx
let regexBuilding = RegExp('([A-Z][0-9]+)', 'im');   // "A29", "B18"…
```

Cette expression attend une lettre suivie de chiffres, et `getLocations()` découpe sur ` | ` et `/` —
la forme des descriptions Celcat. Or l'ADE de Bordeaux INP écrit ses salles `CD-O204`, `CA-N103`,
`E103 - FabLaB,CD-O108` : **aucune ne correspond**.

**C'est fait** : la découpe et le motif sont une donnée de catalogue (colonne `salles`), le code vit
dans [`salles.ts`](../../src/shared/locations/salles.ts), et les dix bâtiments de l'INP sont publiés.
Deux détails que la généralisation a coûtés, et qu'un test verrouille : les séparateurs **n'ont pas
le même rôle** — le premier énumère, les suivants tronquent — et le segment est essayé **tel quel**
avant le motif, sans quoi `A5bis` capturerait `A5`, c'est-à-dire un autre bâtiment et une carte
fausse.

C'est exactement le défaut des onze points de balayage en dur que 6-G a corrigé, au même endroit du
raisonnement : une constante bordelaise déguisée en règle générale. Elle se traite ici, et elle se
vérifie en ouvrant une fiche de cours INP sur un téléphone — pas autrement.

## Ce que 6-G a déjà posé pour que ce jalon soit additif

- `celcat_domaine` est **nullable**, et `null` veut dire « cet établissement ne publie pas son emploi
  du temps ici » ;
- l'onglet Planning **dit** cette absence (`ERROR_TIMETABLE_UNAVAILABLE`) au lieu d'échouer, et
  l'accueil saute l'étape des groupes ;
- le préfixe `ukit.portail.` est ouvert : les Blueprints ADE d'un établissement pourront être
  **ajoutés à distance**, sous `ukit.portail.<code>.edt.*`, sans release.

Le jour où ce jalon arrive, il remplit un trou déjà nommé — il ne défait rien. Aucune colonne
spéculative n'a été ajoutée au catalogue pour lui : la spécification de 6-G dit qu'un parcours qui ne
rentre pas dans la forme prévue demande un Blueprint de plus, pas une colonne de plus.

## Ce qui a été livré

1. ✅ **`^0.5.4` épinglé**, `ical.js` 2.2.1 (Mozilla, zéro dépendance) en dépendance. On n'a pas
   réécrit la RFC 5545 : le pliage de lignes et l'échappement sont bien présents dans les corps
   d'ADE, et ce sont exactement les défauts qu'une bibliothèque standard évite.
2. ✅ Deux Blueprints sous le préfixe réservé —
   [`ukit.portail.bordeaux-inp.edt`](../../blueprints/portails/ukit-portail-bordeaux-inp-edt.blueprint.json)
   et son frère `.annee`, qui ne diffère que par son `timeout_ms` (une année pèse 247 Ko).
3. ✅ [`IcsMapping.ts`](../../src/features/Planning/services/IcsMapping.ts) à côté de
   `PlanningApiMapping.ts`, et un **assemblage commun aux deux sources**
   ([`PlanningAssembly.ts`](../../src/features/Planning/services/PlanningAssembly.ts)) : le découpage
   en six jours n'avait aucune raison d'exister deux fois.
4. ✅ Le catalogue gagne deux colonnes, `edt` et `salles`, et
   [`edt.ts`](../../src/shared/etablissements/edt.ts) arbitre entre les deux sources. **Les quatre
   signatures du service n'ont pas bougé d'une lettre.**
5. ✅ Le référentiel des ressources, relevé par [`tools/releve-ade.mjs`](../../tools/releve-ade.mjs)
   et publié en base — treize groupes sur cinq écoles.
6. ✅ La **reconnaissance de salle par établissement**
   ([`salles.ts`](../../src/shared/locations/salles.ts)), et les dix bâtiments de l'INP relevés sur
   OpenStreetMap ([`batiments-bordeaux-inp.sql`](../../supabase/batiments-bordeaux-inp.sql)).
7. ✅ Un cas de parité [`ical-inp`](../../tools/parity/ical-inp.parity.mjs), **épinglé sur la semaine
   du 17 novembre 2025** : la même réponse lue par `ical.js` d'un côté et par un analyseur écrit à la
   main de l'autre. 40 éléments comparés.

## Définition de « terminé »

1. ✅ `@aetherius/engine` et `@aetherius/react-native` en **`^0.5.4`**, `from: "text"` vérifié de bout
   en bout contre la vraie source sous Node (5 événements sur une journée, 587 sur l'année).
2. ✅ Bordeaux INP a un emploi du temps, et **aucun écran n'a été modifié pour ça** — seules deux
   gardes d'affichage ont bougé, et elles servent les deux sources (voir Écarts).
3. ✅ Le catalogue porte la source, les paramètres d'année, le référentiel et le format de salle.
   Aucun `if (etablissement === …)` nulle part.
4. ✅ `npx tsc --noEmit` (3 erreurs, base inchangée), `npx eslint .` (11 warnings, base inchangée),
   `npm test` (**205**, contre 161), `npm run parity` (**12 cas**, contre 11).
5. ✅ Documentation : [planning.md](../features/planning.md),
   [sources-externes.md](../sources-externes.md), [backend.md](../backend.md),
   [blueprints.md](../blueprints.md), [qualite.md](../qualite.md),
   [donnees-et-persistance.md](../donnees-et-persistance.md), `blueprints/README.md`,
   `supabase/README.md`, `tools/parity/README.md`, le README et le CHANGELOG.
6. ⏳ **La campagne sur appareil**, ci-dessous — la seule porte qu'un terminal ne peut pas franchir.

## Plan de test sur appareil

**Pas de mode avion** : il coupe aussi Metro. Trois outils le remplacent, et ils sont plus précis —
vider `SUPABASE_URL` dans `.env` puis relancer Expo (`-c`), pointer un `inputs.domaine` du Blueprint
sur `https://127.0.0.1:1/` et republier (une adresse qui *refuse*, pas un nom qui ne résout pas), et
le **panneau Blueprints** du menu de développement (sept tapes sur le numéro de version dans
*À propos*).

| # | Sonde | Attendu |
|---|---|---|
| 1 | Réglages → Bordeaux INP, onglet Planning | l'écran « pas d'emploi du temps » a **disparu**, et les favoris de l'université quittée aussi (écart 13) |
| 2 | Recherche de groupes sur INP | les treize groupes du référentiel, sans réseau |
| 3 | `ENSC 2A GR1`, vue jour au 18/11/2025 | 5 cours à **08:00, 09:30, 11:00, 14:00, 15:30** — heure locale, pas UTC |
| 4 | Vue semaine du 17/11/2025 | 17 cours répartis, **aucune description ne porte « Exporté le »** |
| 5 | `ENSC 2A GR1` + `ENSC 1A` en favoris | planning agrégé, **une seule requête** |
| 6 | Fiche d'un cours en `CD-O204` | la **carte** s'affiche sur l'ENSC |
| 7 | Fiche d'un cours à `LOCATION` vide | fiche correcte, **sans** carte, sans erreur |
| 8 | Couleurs | même matière = même couleur d'un jour à l'autre, dans la palette de Bordeaux |
| 9 | Retour sur **Bordeaux** | planning, couleurs, salles libres et cartes **strictement inchangés** |
| 10 | Section **salles libres** sur INP | **présente**, listant les bâtiments en accès libre de l'UB (écart 12) |
| 11 | Blueprint pointé sur `127.0.0.1:1` | « service indisponible », **avec** Réessayer |
| 12 | `expect.status` passé à `418` | « réponse inattendue », **sans** Réessayer — écran distinct du 11 |
| 13 | Favori dont la ressource sort du référentiel | message « ce groupe n'existe plus », distinct des 11 et 12 |
| 14 | Hors ligne sur un jour déjà consulté | le cache daté et son bandeau |
| 15 | `SUPABASE_URL` vidé, installation neuve | Bordeaux seul — l'INP disparaît proprement |
| 16 | Synchronisation calendrier système, groupe INP | les cours arrivent dans l'application Calendrier, **sur les deux établissements** |

Les sondes **10, 11, 12, 13 et 15** doivent produire des écrans **différents**. S'ils convergent vers
« aucun résultat », le jalon n'a rien apporté — c'est le critère de la phase, pas une formule.

## Écarts constatés

Quinze. Ils vont dans trois directions : **la mesure d'origine était partiellement fausse**, le port
a révélé dans le code existant trois pièges qu'aucun test n'aurait attrapés, et **la campagne sur
appareil en a trouvé six de plus** — dont cinq qu'aucun terminal ne pouvait montrer. Le dernier a été
trouvé par accident, en jouant une sonde dégradée qui en a révélé une autre.

1. **La mesure du 10 août visait un projet ADE mort.** `projectId=2` — la valeur reprise telle quelle
   dans l'exemple livré par Aetherius au jalon 3-I — porte **54 événements sur l'année**. Le projet
   vivant est `projectId=1`, avec **3156**. Les UID les nomment en clair : `2025-2026`,
   `NEPASTOUCHER2526_SAUV`, `2526_POUR_ESUP`, `2025-2026FormationJanvier`, `TMP2526`. Conséquence
   directe : le projet **change à chaque rentrée**, donc c'est de la donnée publiable et non une
   constante de fichier. Il vit dans `edt.params`, **à côté du référentiel**, pour qu'une rentrée soit
   une publication et non deux.

2. **`resources` est un index positionnel, pas un identifiant.** `resources=1` rend la racine de
   l'arbre — tout l'établissement, cinq écoles — et l'identifiant interne lu dans un UID (`92`) ne
   rend rien. C'est ce qui rend le référentiel indispensable, et c'est aussi ce qui le rend
   périssable.

3. **Une seule semaine de relevé publierait des doublons silencieux.** Sur la semaine du 17 novembre,
   les index 2, 157 et 169 rendent les **38 mêmes événements**, aux UID près. En janvier l'index 169
   n'en rend plus aucun, en mars l'index 157 non plus : ce ne sont pas des doublons, ce sont des
   sous-groupes d'option dont l'emploi du temps *coïncidait* cette semaine-là. Le script échantillonne
   donc **trois semaines écartées dans l'année**, et il aurait fallu s'en apercevoir autrement en
   proposant « ENSC 1A » trois fois pour trois ressources différentes.

4. **`SUMMARY` n'est pas une ancre universelle, le code de module l'est.** Le texte de cette
   spécification pariait sur le fait que la matière est reproduite dans la description — c'est vrai à
   l'ENSC, faux à l'ENSCBP et à l'ENSEIRB. Ce qui tient sur les cinq écoles est le **code de module**
   (`COG7-CILAN`, `ESE7-INFS2`, `BIO7-MBCM4`) : le type du cours est la ligne qui le suit, et rien
   d'autre ne le désigne. Compter les lignes depuis le début désignerait le commentaire une fois sur
   dix — un CM de 3A porte « CHAPRON Axelle - IBM » puis « GROUPE A » avant son code.

5. **`(Exporté le:…)` porte l'horodatage de la requête.** Il change à chaque appel. Non retiré, il
   afficherait une horloge dans la fiche du cours et **aucune paire de lectures ne serait jamais
   égale** : la parité serait rouge par construction et le cache invalidé en permanence. C'est le
   genre de détail qui ne se voit qu'en jouant la source deux fois de suite.

6. **`DTSTART` est en UTC honnête**, et c'était la bonne nouvelle du jalon. Le même créneau
   hebdomadaire est servi `07:30Z` en septembre et `08:30Z` en novembre — 09:30 à Paris les deux fois.
   Il n'y a pas de `VTIMEZONE` à interpréter. Le test le verrouille dans un fuseau **fixé** par
   `vitest.config.ts` : sans ça il passerait à Bordeaux et échouerait ailleurs, ce qui est la pire
   forme de test.

7. **Un seul motif de salle couvre tout Bordeaux INP.** Les cinq écoles écrivent leurs salles sous la
   même forme — deux majuscules, un tiret — et la première lettre nomme l'école : `CA/CC/CD` à l'ENSC,
   `EA/EB` à l'ENSEIRB-MATMECA, `PA` à l'ENSCBP, `GA/GB` à l'ENSEGID, `BA/BB` à l'ENSTBB. La
   spécification craignait trois formes ; il y en a une.

8. **Le piège du code existant, et il aurait cassé le Campus.** `planningDisponible()` gardait **trois
   choses** : l'écran « pas d'emploi du temps », l'étape des groupes à l'accueil, et la section des
   **salles libres**. Or celle-ci ne dépend pas de l'emploi du temps mais de l'inventaire du serveur
   Celcat. L'élargir naïvement à l'iCalendar aurait fait réapparaître pour l'INP une section
   définitivement cassée — exactement le défaut que la campagne 6-G avait corrigé, réintroduit par le
   jalon suivant. Le prédicat est scindé : `planningDisponible()` (Celcat **ou** iCal) et
   `sallesDisponibles()` (Celcat seul).

9. **Le référentiel est un travail d'auteur, et le script ne le remplace pas.** Sa première version
   nommait automatiquement tout index à libellé unique : elle a produit `S3` cinq fois, `R3` six fois,
   et raté `ENSC 2A GR1`. Un index qui ne voit qu'un libellé est souvent un module, pas un groupe ;
   un vrai groupe en voit plusieurs, parce qu'un étudiant suit aussi les cours de sa promotion. Le
   script rapporte, propose et montre les inclusions ; **c'est l'auteur qui nomme**, et les treize
   entrées publiées ont chacune été confrontées à trois semaines et au préfixe de module de son école.

10. **Une teinte neutre au milieu d'une palette de couleurs n'est pas une couleur.** La première
    version dérivait la couleur sur les huit teintes que `theme.courses` utilise pour Celcat, dont un
    brun qui vire au **gris** en thème sombre. Mesuré après coup sur l'année complète : il attrapait
    8 matières sur 61, soit **467 cours** — un cours sur sept avait l'air de n'avoir pas de couleur,
    et c'est exactement ce que la campagne a rapporté. La distribution, elle, était saine (4 à 11
    matières par créneau) : le défaut n'était pas l'empreinte, c'était la palette. Elle est désormais
    une roue de huit teintes **toutes vives**. Une collision se lit comme deux cours de la même
    couleur ; une teinte neutre se lit comme une couleur manquante, et c'est la seule des deux qui
    soit un défaut.

11. **L'icône d'une ligne de description était positionnelle.** Première ligne un groupe, deuxième un
    enseignant, troisième une salle — recopié dans la carte et dans la fiche. C'était juste tant que
    Celcat était la seule source, parce que ce serveur sert toujours ses lignes dans cet ordre. Sur
    appareil, dès la première fiche INP : la salle `CD-O204` portait l'icône « groupe », le type `TD`
    portait l'icône « lieu ». La règle lit désormais le **contenu**, et la salle se reconnaît contre
    le référentiel des lieux lui-même. Un détail que le test a corrigé et que la relecture n'aurait
    pas vu : le code de module doit passer **avant** la salle, parce que le motif bordelais
    `([A-Z][0-9]+)` trouve `B1` dans `JPB1-OPTIQ`, et `B1` est un vrai bâtiment. La même campagne a
    montré que le type était affiché **deux fois**, en pastille et en ligne ; il est écarté de la
    description, comme Celcat écarte déjà les siennes.

12. **Les salles libres sont rallumées pour Bordeaux INP, et c'est une décision produit.** L'écart 8
    avait raison de séparer les deux prédicats — les fondre aurait produit une section cassée — mais
    la conclusion « donc l'INP n'y a pas droit » était une conclusion technique appliquée à une
    question qui ne l'est pas. Ses écoles sont sur le campus de Talence, à deux cents mètres des
    bâtiments que cette recherche liste. La colonne `salles_libres` laisse donc un établissement
    **emprunter** l'inventaire d'un autre ; l'emprunt ne concerne que les salles, l'emploi du temps
    garde sa source. Et ce qui a rendu ce revirement facile, c'est précisément d'avoir séparé les deux
    prédicats deux heures plus tôt : il a coûté une colonne et six lignes.

13. **Changer d'établissement n'effaçait pas les groupes favoris**, et c'est le défaut le plus
    instructif de la campagne. `resetSettings` les efface depuis toujours ; le changement
    d'établissement, non — il ne connaissait que le magasin local et le trousseau. Deux gestes qui
    effacent la même chose avec deux définitions de « la même chose », c'est-à-dire **exactement** la
    phrase écrite dans le commentaire de `resetSettings`, et exactement l'écart 6 du jalon 6-G, à
    l'envers.

    Il était invisible jusqu'ici : tant que Bordeaux INP n'avait pas d'emploi du temps, des favoris
    bordelais restés en place ne rencontraient jamais rien. Dès qu'il en a eu un, arriver sur l'onglet
    Planning affichait « ce groupe n'existe plus » — pour un groupe qui existe parfaitement, à
    l'université qu'on venait de quitter. Le message était juste et la situation absurde.

    La purge des réglages propres à l'établissement — favoris et filtres d'UE — vit désormais dans
    `SettingsManager.purgerReglagesEtablissement()`, appelée par le setter plutôt que par les deux
    points d'appel : l'oubli dans l'un des deux est précisément ce qui a produit le défaut. La
    comparaison porte sur le code que **ce module** connaît, et non sur celui du catalogue, que
    `changerEtablissement` a déjà posé quand on arrive — le lire aurait rendu la garde muette.

14. **Une année en tête de titre était prise pour un code d'unité d'enseignement.** `computeCourseUE`
    reconnaissait un code par `[0-9][A-Z0-9]+`, ce qui allait tant que la seule source était Celcat —
    ses codes ressemblent à `4TIN602U`. Les titres d'ADE commencent souvent par une année :
    `2025-2026 - Les rencontres du Réseau d'Écoute` devenait un cours d'UE **`2026`** intitulé
    `- Les rencontres du Réseau d'Écoute`, tiret orphelin compris — et l'en-tête de la fiche annonçait
    `2026`. **Seize matières d'un seul groupe** étaient dans ce cas.

    Le code d'UE exige désormais **au moins une lettre**, ce qui est vrai de tous ceux de Celcat et
    d'aucune année. La règle vivait en **deux exemplaires** — le calcul de l'UE et le tri d'affichage —
    et elle n'en a plus qu'un, `separerCodeUE`. C'est le troisième défaut du jalon dont la cause est
    une règle écrite deux fois.

    Il n'est apparu qu'en ouvrant la fiche d'un événement de vie étudiante, c'est-à-dire en regardant
    autre chose qu'un cours. Les sondes cherchaient un cours ordinaire ; c'est une capture envoyée
    « pour être sûr de n'être passé à côté de rien » qui l'a montré.

15. **Un seul favori périmé vidait tout le planning agrégé.** La résolution des ressources était
    écrite en tout-ou-rien, avec une justification qui avait l'air solide : *« jouer les groupes
    résolus et taire les autres rendrait un planning agrégé silencieusement incomplet, ce qui est pire
    qu'un échec »*. Elle avait raison sur un mot et tort sur l'autre — c'est le **silence** qui est le
    problème, pas l'incomplétude.

    Le dépôt avait déjà la troisième réponse, écrite pour la base de publication : *une couverture
    partielle n'est ni un succès muet ni un échec, elle se dit par un bandeau au-dessus de la liste*
    ([sources-externes.md](../sources-externes.md)). C'est désormais ce que fait le planning : les
    favoris qui résolvent sont joués, ceux qui manquent sont **nommés** dans un bandeau, et l'échec
    n'est gardé que lorsqu'il ne reste rien à demander.

    Il a été trouvé **par accident** : la sonde 13 avait retiré un groupe du référentiel, la sonde 15
    avait vidé `SUPABASE_URL`, et l'appareil travaillait donc sur un catalogue périmé qu'il ne pouvait
    plus rafraîchir. C'est en signalant ce qu'il croyait être un résidu de sonde que l'utilisateur a
    décrit le vrai défaut. Une campagne de chemins dégradés en révèle d'autres qu'elle ne visait pas,
    et c'est une raison de plus de la jouer en entier.

## Limites écrites

- **L'index de ressource se re-relève à chaque rentrée.** Il est stable *à l'intérieur* d'un projet
  ADE, et un projet est annuel. `node tools/releve-ade.mjs --projet <n>` rejoue le relevé ; c'est une
  publication, pas une release.
- **Le référentiel est partiel, et c'est assumé.** L'export anonyme expose une tranche arbitraire de
  l'arbre : les feuilles par groupe ne sont pas systématiquement atteignables, et treize entrées
  couvrent cinq écoles à des granularités inégales — une promotion ici, un groupe là. Publier un
  index qui mélange plusieurs promotions serait proposer à un étudiant un planning qui n'est pas le
  sien ; la liste s'étend par publication, à mesure qu'on identifie les nœuds.
- **La catégorie (CM/TD/TP) est une heuristique.** Un événement sans code de module n'a pas de type
  dérivable : la catégorie vaut alors la chaîne vide, et la pastille ne s'affiche pas. C'est un
  résultat, pas un échec — inventer une catégorie serait pire.
- **Les salles libres proposées à un étudiant de l'INP sont celles de l'Université de Bordeaux.**
  C'est voulu — même campus — mais ce n'est pas dit à l'écran, et les bâtiments de l'INP n'y figurent
  pas : ils sont publiés avec `acces_libre = false`, ce qui est exact. Adapter la recherche à leurs
  propres bâtiments est un sujet distinct, et il n'est pas ouvert.
- **La carte de l'INP est à la précision du site, pas du bâtiment.** OpenStreetMap cartographie
  chaque école comme un bâtiment unique et ne nomme pas ses ailes : `CA`, `CC` et `CD` partagent donc
  le point de l'ENSC. Placer une aile au hasard à cinquante mètres serait pire — *un bâtiment sans
  coordonnées n'est pas une carte vide, c'est une carte fausse*.
- **Les bâtiments de l'INP n'ont pas de repli hors ligne** avant le premier rafraîchissement : ils
  arrivent par la table `batiments`, pas par `assets/locations.json`. C'est la contrepartie assumée
  d'un établissement ajouté sans release, et elle est la même que pour son portail.
- **Un motif de salle vient de la base et s'exécute sur l'appareil.** Il est compilé une fois, mis en
  cache, appliqué à des chaînes courtes et gardé par un `try/catch` qui retombe sur le comportement
  historique. La vraie limite reste celle de toute la phase : l'accès au projet Supabase est un accès
  de production.
- **Un export iCal est une photo, pas une API.** Il ne porte pas d'identifiant stable de groupe, et
  les champs utiles vivent dans `DESCRIPTION`, en texte libre, dont la mise en forme dépend de la
  configuration de l'établissement.
- **Certains exports sont personnels**, donc secrets : un lien d'abonnement collé par un étudiant
  vaut un identifiant, et devra vivre dans le trousseau, pas dans les réglages en clair. C'est la
  moitié « colle ton lien iCal » de [6-J](6-j-compte-et-sources-par-etablissement.md), et ce jalon ne
  la couvre pas.
- **La plage de dates n'est pas toujours un paramètre.** Elle l'est chez ADE ; chez d'autres produits
  le lien porte une fenêtre figée à l'export, et l'application devra filtrer ce qu'elle reçoit.
