# 6-I — L'emploi du temps universel

> **Spécification ouverte, et débloquée.** Écrite au jalon [6-G](6-g-etablissements.md), qui l'a
> rendue nécessaire : le second établissement livré n'a pas d'emploi du temps dans UKit. Sa dépendance
> — le jalon **3-I** d'Aetherius, `from: "text"` dans l'extraction — est **livrée et publiée en
> 0.5.4** ; il n'y a donc plus rien qui empêche de commencer. Rien n'est implémenté ici : ce document
> existe pour que les mesures des 10 et 11 août ne soient pas à refaire.

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

Sondé le 2026-08-10 sur `ade.bordeaux-inp.fr`, en lecture seule :

```
/jsp/custom/modules/plannings/anonymous_cal.jsp
    ?resources=<ids>&projectId=<n>&calType=ical&firstDate=AAAA-MM-JJ&lastDate=AAAA-MM-JJ
```

- l'export est **anonyme** : aucun cookie, aucune authentification ;
- il est **borné par l'URL** : `firstDate` / `lastDate` sont des paramètres. C'est le point décisif —
  ça se branche **sans rien changer** sur les signatures existantes du service (`fetchCalendarDay`,
  `fetchCalendarWeek`, `fetchCalendarForSynchronization`) ;
- il est **riche** : `SUMMARY` porte la matière, `LOCATION` la salle, `DESCRIPTION` le code de module,
  le type (CM/TD/CI), le groupe et l'enseignant ;
- il est **vivant**, et l'année écoulée reste servie — mesuré le 2026-08-11 : **93** événements sur
  une semaine de septembre 2025, **220** en janvier 2026, **71** en mai 2026, et **0** en septembre
  2026 (la rentrée n'est pas publiée). Conséquence pratique : **on peut développer et vérifier tout de
  suite**, sans attendre la rentrée, et un cas de parité épinglé sur une **semaine passée fixe** est
  reproductible pour toujours — là où un test sur « cette semaine » casserait à chaque vacances.

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
livraison changent la façon d'écrire les Blueprints ici, et méritent d'être sues avant :

- le décodage suit l'en-tête de réponse, avec une **table d'encodages bornée et identique** dans les
  deux moteurs : `iso-8859-1` et ses alias, `windows-1252`, et **tout le reste en UTF-8**. Un serveur
  qui étiquette autrement sera donc lu en UTF-8, sans avertissement ;
- une extraction `from: "text"` **refuse** `path`, `where`, `fields`, `selector`, `selector_type`,
  `attr` et `multiple` — un Blueprint qui croirait filtrer est arrêté à la validation ;
- le corps n'est lu en octets **que si** un `from: "text"` est déclaré : les Blueprints existants ne
  paient rien.

Première tâche du jalon, avant tout le reste : **épingler `@aetherius/engine` et
`@aetherius/react-native` en `^0.5.4`** dans `package.json`.

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

Pour la couleur, la question à trancher **avant** d'écrire le mapper : la dériver de la matière (une
empreinte stable, donc la même couleur pour le même cours toute l'année) uniformiserait les deux
sources et rendrait l'application cohérente d'un établissement à l'autre. Garder celle de Celcat d'un
côté et en inventer une de l'autre donnerait deux apparences pour un même écran. C'est une décision
produit, pas un détail d'implémentation.

### 3. La découverte des groupes n'est pas résolue par l'iCal

ADE n'expose pas d'arbre de ressources anonyme : l'export prend des **identifiants numériques**, et
rien ne dit lequel correspond à quel groupe. Deux réponses possibles, et elles ne coûtent pas la même
chose :

| Réponse | Ce qu'elle demande | Ce qu'elle donne |
|---|---|---|
| Un référentiel `id → nom de groupe`, construit **une fois hors ligne** par un auteur et publié en base | une passe d'auteur par établissement | la même expérience qu'aujourd'hui : l'étudiant choisit son groupe dans une liste |
| L'étudiant **colle son lien d'abonnement**, généré depuis son ENT | un écran de saisie, et un lien par étudiant | marche partout, y compris là où l'export est personnel — mais demande un geste que personne n'a envie de faire |

La première est le modèle déjà en place pour `assets/locations.json` : de la donnée d'auteur, publiée,
corrigeable sans release. C'est celle à privilégier ; la seconde reste le repli pour les
établissements dont l'export n'est pas anonyme.

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
la forme des descriptions Celcat. Or l'ADE de Bordeaux INP écrit ses salles `CD-O204`, `GA-S-174`,
`EA- (AMPHI A)` : **aucune ne correspond**. La fiche de cours ne proposera donc pas de carte pour ce
portail tant que la reconnaissance de salle n'est pas, elle aussi, une donnée d'établissement.

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

## Esquisse de livraison

1. **Épingler `^0.5.4`** — le jalon `3-I` d'Aetherius est livré.
2. **UKit** — `ical.js` (Mozilla, pur JavaScript, compatible React Native). On ne réécrit pas la
   RFC 5545 : les fuseaux, le pliage de lignes, l'échappement et les récurrences sont un nid à
   défauts, et c'est précisément le genre de roue qu'une bibliothèque standard a déjà.
3. Un `IcsMapping.ts` à côté de [`PlanningApiMapping.ts`](../../src/features/Planning/services/PlanningApiMapping.ts),
   testé sur des fixtures réelles — le parsing est de la **projection**, donc applicatif, donc
   testable sous vitest.
4. Les Blueprints ADE de l'INP, publiés sous le préfixe réservé.
5. Le référentiel des ressources, publié en base.
6. La **reconnaissance de salle par établissement**, pour que la carte du cours fonctionne ailleurs
   qu'à Bordeaux.
7. Un cas de parité, **épinglé sur une semaine passée fixe** : le même jour, lu par l'iCal et lu par
   l'export brut. Une semaine figée est reproductible pour toujours, là où « cette semaine » casserait
   à chaque vacances.

## Limites prévisibles

- **Un export iCal est une photo, pas une API.** Il ne porte pas d'identifiant stable de groupe, et
  les champs utiles vivent dans `DESCRIPTION`, en texte libre, dont la mise en forme dépend de la
  configuration de l'établissement. Le projeter demandera une tolérance que Celcat n'exigeait pas.
- **Certains exports sont personnels**, donc secrets : un lien d'abonnement collé par un étudiant
  vaut un identifiant, et devra vivre dans le trousseau, pas dans les réglages en clair.
- **La plage de dates n'est pas toujours un paramètre.** Elle l'est chez ADE ; chez d'autres produits
  le lien porte une fenêtre figée à l'export, et l'application devra filtrer ce qu'elle reçoit.
