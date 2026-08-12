# 6-I — L'emploi du temps universel

> **Spécification ouverte.** Écrite au jalon [6-G](6-g-etablissements.md), qui l'a rendue nécessaire :
> le second établissement livré n'a pas d'emploi du temps dans UKit, et il ne l'aura pas tant que ce
> jalon n'existe pas. Rien n'est implémenté ici — ce document existe pour que la mesure faite le
> 2026-08-10 ne soit pas à refaire.

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

## Les deux obstacles, et ils ne sont pas du même ordre

### 1. Un Blueprint ne peut pas ramener ce corps — c'est un manque du moteur

L'extraction d'Aetherius ne connaît que `from: "json"` et `from: "html"`
(`src/aetherius/core/extraction/dispatch.py`), et le step `http.request` publie `status_code` et
`headers`, **jamais le texte brut** (`src/aetherius/acts/vector/driver.py`).

Faire passer un iCal par l'extracteur HTML détruirait le pliage de lignes de la RFC 5545 — une ligne
de continuation commence par une espace, et rien ne garantit qu'une normalisation HTML la préserve.
C'est exactement le contournement que la [note de portée de la Phase 6](README.md) interdit : *« un
manque se traite là-bas, pas par un contournement ici »*.

**Ce jalon dépend donc d'un jalon Aetherius**, désormais **spécifié** :
`docs/phase-3/3-i-extraction-texte.md` dans le dépôt voisin — un `from: "text"` dans l'extraction, les
deux moteurs, un cas de conformance. C'est la seconde dépendance inter-dépôt de la phase, après 3-H,
et **elle doit être livrée avant de commencer ici**.

### 2. La découverte des groupes n'est pas résolue par l'iCal

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

1. **Aetherius** — jalon `3-I`, déjà spécifié : `from: "text"` dans l'extraction, les deux moteurs,
   corpus de conformance.
2. **UKit** — `ical.js` (Mozilla, pur JavaScript, compatible React Native). On ne réécrit pas la
   RFC 5545 : les fuseaux, le pliage de lignes, l'échappement et les récurrences sont un nid à
   défauts, et c'est précisément le genre de roue qu'une bibliothèque standard a déjà.
3. Un `IcsMapping.ts` à côté de [`PlanningApiMapping.ts`](../../src/features/Planning/services/PlanningApiMapping.ts),
   testé sur des fixtures réelles — le parsing est de la **projection**, donc applicatif, donc
   testable sous vitest.
4. Les Blueprints ADE de l'INP, publiés sous le préfixe réservé.
5. Le référentiel des ressources, publié en base.
6. Un cas de parité : le même jour, lu par l'iCal et lu par l'export brut.

## Limites prévisibles

- **Un export iCal est une photo, pas une API.** Il ne porte pas d'identifiant stable de groupe, et
  les champs utiles vivent dans `DESCRIPTION`, en texte libre, dont la mise en forme dépend de la
  configuration de l'établissement. Le projeter demandera une tolérance que Celcat n'exigeait pas.
- **Certains exports sont personnels**, donc secrets : un lien d'abonnement collé par un étudiant
  vaut un identifiant, et devra vivre dans le trousseau, pas dans les réglages en clair.
- **La plage de dates n'est pas toujours un paramètre.** Elle l'est chez ADE ; chez d'autres produits
  le lien porte une fenêtre figée à l'export, et l'application devra filtrer ce qu'elle reçoit.
