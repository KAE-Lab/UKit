# Planning — emploi du temps

L'onglet historique et le cœur de l'application : consulter son emploi du temps universitaire, par
jour ou par semaine, pour un groupe donné ou pour l'agrégation de ses groupes favoris.

Sources de données : **deux**, et le catalogue décide laquelle — le serveur Celcat de l'université
(section 1 de [sources-externes.md](../sources-externes.md)) ou son **export iCalendar** (section 9,
jalon [6-I](../phase-6/6-i-planning-universel.md)). Les écrans ne savent pas qu'il y en a deux : le
contrat `PlanningEvent` est le même, et c'est ce qui a permis d'ajouter Bordeaux INP sans toucher un
seul composant.

## Parcours utilisateur

1. À l'ouverture, l'onglet affiche le **planning agrégé des groupes favoris** pour la journée
   courante. Sans favori, un état vide invite à en chercher un.
2. Le bandeau supérieur porte un curseur horizontal de dates. Une année scolaire entière est
   parcourable (365 jours à partir du 1er août).
3. Le bouton de droite bascule **jour / semaine**. Le bouton de gauche revient à aujourd'hui ou à la
   semaine courante.
4. Toucher un cours ouvre sa fiche : matière, code d'UE, horaires, salle, carte du bâtiment, ajout au
   calendrier système.
5. Le bouton d'action à côté de la barre d'onglets ouvre la **recherche de groupes** : liste complète,
   sections alphabétiques, recherche, ajout aux favoris.

![La vue jour : curseur de dates en bandeau, cartes de cours colorées par catégorie, salle et enseignant en description](../screenshots/planning-jour.png)

> **Capture attendue** — `planning-semaine.png` : la vue semaine, avec ses sections repliables.
>
> **Capture attendue** — `planning-groupes.png` : la recherche de groupes et ses sections
> alphabétiques colorées.
>
> **Capture attendue** — `planning-cours-detail.png` : la fiche d'un cours localisé, avec sa carte.

## Flux de données

```text
DayView (état : jour/semaine sélectionnés, mode)
  └─ DayViewHeader        titre, navigation, curseur de dates
  └─ DayComponent / WeekComponent   =  withHeaderAnimation(ScheduleList)
       └─ ScheduleList
            ├─ isConnected()                    NetInfo
            ├─ PlanningApiService.fetchCalendarDay | fetchCalendarWeek
            │      └─ sourceEdt()                 le catalogue decide : Celcat ou iCalendar
            │      ├─ Blueprint ukit.celcat.jour | ukit.celcat.semaine   (moteur embarqué)
            │      │      └─ PlanningApiMapping   projection Celcat, filtres
            │      └─ Blueprint ukit.portail.<code>.edt                  (moteur embarqué)
            │             └─ IcsMapping           projection iCalendar (ical.js)
            │      └─ PlanningAssembly            tri, découpage en six jours — commun aux deux
            ├─ AsyncStorage  <groupes>@date | <groupes>@Week<n>   (écriture si succès, lecture si échec)
            ├─ SourceFailureNotice                                (si ni réponse ni cache)
            ├─ PlanningDataManager.extractUEsFromCourses          (alimente les filtres)
            ├─ CourseManager.computeCourseUE / filterCourse        (mode jour)
            ├─ NotificationManager.scheduleCourseNotifications     (si planning favori)
            └─ groupOverlappingCourses → CourseGroupCarousel → CourseRow
```

Depuis le jalon [6-E](../phase-6/6-e-planning.md), le service n'émet plus aucune requête : il joue
quatre [Blueprints](../blueprints.md) qui visent **`celcat.u-bordeaux.fr` directement**. Le relais
`ukit.kbdev.io` est sorti de l'architecture — il n'existait que pour contourner une contrainte de
navigateur, et il répondait déjà `522` au moment de la bascule
([sources-externes.md](../sources-externes.md#1-celcat--emplois-du-temps)).

L'ordre est important : le réseau est tenté **en premier** dès qu'une connexion est détectée, le cache
n'intervient qu'en repli. Voir [donnees-et-persistance.md](../donnees-et-persistance.md).

### Recherche de groupes

```text
GroupSelectionScreen
  ├─ PlanningApiService.fetchGroupList()   Blueprint ukit.celcat.groupes (resType=103)
  ├─ AsyncStorage 'groups'                 cache d'affichage, repli hors ligne
  └─ generateSections()                    regroupement par première lettre, couleur cyclique
```

`PlanningDataManager` maintient en parallèle la même liste sous la clé `groupList`, avec une
expiration de 7 jours, pour l'onboarding et les suggestions de filtres. Les deux caches coexistent et
ne sont pas synchronisés.

## Contrats

Le contrat de données est défini dans
[`PlanningApiMapping.ts`](../../src/features/Planning/services/PlanningApiMapping.ts) — un module sans
dépendance de plateforme, donc testable ; le service le réexporte pour que les composants n'aient rien
à changer.

```ts
interface PlanningEvent {
    id: string;
    style: string;               // attribut style HTML pré-composé (hérité)
    color: string;               // couleur brute Celcat
    schedule: string;            // "08:00-10:00 CM"
    starttime: string;           // "08:00"
    endtime: string;             // "10:00"
    date: { start: string; end: string };   // ISO
    subject: string;             // matière, code d'UE retiré
    description: string;         // lignes nettoyées, jointes par \n
    category: string;            // "CM", "TD", "TP"…
    group: string;
    toFilter?: string | null;    // sous-groupe déduit de la description
    day?: string;                // "Lundi 12/05" (vue semaine)
    dayNumber?: string;          // jour ISO 1-7 (vue semaine)
}

interface PlanningWeekDay {
    dayNumber: string;
    dayTimestamp: number;
    courses: PlanningEvent[];
}
```

`CourseData` ([`CourseCard.tsx`](../../src/features/Planning/components/CourseCard.tsx)) est le
sous-ensemble consommé par les composants d'affichage. Le champ `UE` y est ajouté à l'exécution par
`CourseManager.computeCourseUE`, qui délègue la règle à
[`separerCodeUE`](../../src/features/Planning/services/PlanningAssembly.ts).

**Un code d'UE contient au moins une lettre**, et ce n'est pas cosmétique : les titres d'ADE
commencent souvent par une année, et sans cette contrainte `2025-2026 - Les rencontres du Réseau
d'Écoute` devenait un cours d'UE `2026` intitulé `- Les rencontres…`. Seize matières d'un seul groupe
étaient dans ce cas, mesurées le 2026-08-15. Les codes de Celcat — `4TIN602U` — en contiennent tous,
donc rien ne change pour eux.

Les quatre méthodes du service rendent un **résultat discriminé** plutôt qu'un `null` :

```ts
type PlanningDayResult =
    | { ok: true; courses: PlanningEvent[] }
    | { ok: false; failure: UkitFailure };
```

**Se teste avec `resultat.ok === false`, jamais avec `!resultat.ok`** : `tsconfig.json` n'active pas
`strictNullChecks`, et sans lui TypeScript ne restreint pas une union sur la simple véracité du
discriminant ([qualite.md](../qualite.md)). La famille de l'échec décide de l'écran
([blueprints.md](../blueprints.md#les-erreurs-cessent-dêtre-avalées)).

## Cache et persistance

| Clé | Contenu | Expiration |
|---|---|---|
| `<groupes>@YYYY/MM/DD` | `{ data, date }` — planning d'un jour | aucune, repli hors ligne |
| `<groupes>@Week<n>` | `{ data, date }` — planning d'une semaine | aucune, repli hors ligne |
| `groups` | `{ list, date }` — liste pour l'écran de recherche | aucune |
| `groupList` + `groupListTimestamp` | liste pour `PlanningDataManager` | 7 jours |

`<groupes>` vaut le nom du groupe, ou les favoris joints par `+` pour le planning agrégé. Quand le
cache est servi, un bandeau affiche sa date (`OFFLINE_DISPLAY_FROM_DATE`).

![Le bandeau de données en cache : « Offline display from Aug 9, 2026 10:00 AM » au-dessus des cours, qui restent complets et lisibles](../screenshots/planning-hors-ligne.png)

Et son opposé, quand il n'y a **rien** à replier : une journée jamais consultée, source injoignable.
Avant le jalon [6-E](../phase-6/6-e-planning.md), cet écran était un indicateur de chargement qui
tournait indéfiniment.

![L'échec d'une source : carte centrée, nuage barré, « Service unavailable. Check your connection and try again. » et un bouton Réessayer](../screenshots/planning-echec.png)

> **Capture attendue** — `planning-vide.png` : l'état vide quand aucun groupe n'est en favori.

## Décisions de conception

**Le planning agrégé est un `groupName` de type tableau.** `ScheduleScreen` reçoit `name` ; s'il
s'agit d'un tableau, il le remplace par `context.favoriteGroups`. Toute la chaîne — clé de cache,
requête `federationIds[]` multiple, activation des notifications, application des filtres UE —
distingue les deux cas par `Array.isArray(groupName)`. C'est le pivot du module : le modifier touche
tout le reste.

**Les filtres UE ne s'appliquent qu'au planning favori.** `CourseManager.filterCourse` renvoie `true`
sans condition quand `isFavorite` est faux. Consulter le planning d'un autre groupe montre donc tout,
volontairement : les filtres décrivent *ses* UE, pas celles d'autrui.

**Le jour et la semaine ne parsent pas la description pareil.** `projeterCours` reçoit `';'` en mode
jour et `'\n'` en mode semaine. C'est le comportement d'origine, conservé à la lettre par le jalon
[6-E](../phase-6/6-e-planning.md) — mais sa justification historique était fausse, et sa conséquence
réelle est écrite dans les [limites connues](#limites-connues).

**La position dans le calendrier survit à la navigation.** `DayView.lastSelectedDay` et
`lastSelectedWeek` sont des propriétés **statiques de classe** : revenir sur l'onglet Planning
restitue le jour consulté, pas aujourd'hui. C'est délibéré et non persisté (remis à zéro au
redémarrage).

**Les cours qui se chevauchent deviennent un carrousel.**
[`groupOverlappingCourses`](../../src/features/Planning/components/ScheduleListUtils.ts) regroupe les
cours dont les plages se recoupent ; `CourseGroupCarousel` les rend en pages horizontales avec des
points de position. L'index consulté est mémorisé dans une `Map` de module, indexée par
`heure de début + matière`, pour que le défilement ne se réinitialise pas au rendu suivant.

> **Capture attendue** — `planning-cours-simultanes.png` : un créneau à plusieurs cours, points de
> pagination visibles.

**Les couleurs Celcat sont retraduites.** `theme.courses` associe les couleurs brutes du serveur
(`#FFFF00`, `#800040`…) à des teintes de la palette de l'application, avec un `default`. Afficher la
couleur brute donnerait des tons saturés incohérents avec le reste de l'interface.

**Le rechargement au focus n'existe qu'en mode jour.** `ScheduleList` s'abonne à l'événement `focus`
de la navigation uniquement si `mode === 'day'` : c'est la vue par défaut, celle qu'on veut à jour en
revenant dans l'application.

## Vérifier

- Ouvrir l'onglet sans favori : l'état vide et son bouton vers la recherche doivent s'afficher.
- Ajouter deux groupes en favori : le planning agrégé doit fusionner leurs cours et la clé de cache
  contenir les deux noms joints par `+`.
- Basculer jour / semaine, naviguer dans le curseur, revenir avec le bouton « aujourd'hui ».
- Ouvrir un cours ayant une salle connue : la carte doit apparaître ; en ouvrir un sans salle : la
  fiche doit rester correcte sans carte.
- Ajouter un cours au calendrier système et vérifier sa présence dans l'application Calendrier.
- **Hors ligne** : ouvrir un jour déjà consulté — le cache daté doit s'afficher avec son bandeau ;
  ouvrir un jour jamais consulté — un écran d'échec explicite doit apparaître, avec un bouton
  Réessayer. Plus besoin du mode avion pour l'obtenir : pointer `vars.domaine` de
  `ukit-celcat-jour.blueprint.json` sur un hôte injoignable et recharger produit le même chemin, en
  vingt secondes et de façon reproductible.
- **Source qui a changé** : passer l'`expect.status` du même Blueprint à `418` doit produire un écran
  **différent** — « Réponse inattendue », sans bouton Réessayer, parce que rejouer ne répare pas une
  source qui a changé de contrat.
- Un dimanche, ou un jour sans cours : la carte « pas de cours » doit s'afficher.

## Les quatre états de l'emploi du temps

Depuis le jalon [6-I](../phase-6/6-i-planning-universel.md), le catalogue déclare **ce qui existe** et
[`sourceEdt()`](../../src/shared/etablissements/edt.ts) en tire la source à jouer. Le jalon
[6-J](../phase-6/6-j-compte-et-sources-par-etablissement.md) en a fait une union **totale** — elle ne
rend plus jamais `null` — ce qui force chaque consommateur à décider quoi faire de l'absence au lieu de
la laisser tomber dans un `else` :

| Le catalogue déclare | `kind` | La source jouée | Les groupes viennent de |
|---|---|---|---|
| `celcat_domaine` | `celcat` | les Blueprints `ukit.celcat.*` | un run — la liste complète du serveur |
| `edt` avec son référentiel | `ical` | `ukit.portail.<code>.edt` et son frère `.annee` | le **référentiel du catalogue**, sans réseau |
| `edt.abonnement`, lien collé | `abonnement` | `ukit.edt.abonnement` — un seul fichier, embarqué | **aucun** : le lien est déjà le planning de cet étudiant |
| `edt.abonnement`, aucun lien | `lien-attendu` | aucune — `EDT_LIEN_ATTENDU`, et l'écran propose le geste | — |
| rien | `aucun` | aucune — `PLANNING_ABSENT`, aucun run ne part | — |

**Les deux derniers ne se confondent pas**, et c'est tout l'objet de 6-J : *« cette université n'a pas
d'emploi du temps »* et *« elle en a un, il te manque un geste »* appellent deux gestes opposés de la
part d'un étudiant. Le second porte donc un bouton là où le premier n'en a aucun.

**L'ordre de préférence va du plus automatique au plus manuel.** Celcat gagne parce qu'un serveur
interrogeable a une liste de groupes vivante ; le référentiel ensuite, parce qu'un étudiant y choisit
encore son groupe ; l'abonnement en dernier, parce qu'il coûte un geste que personne n'a envie de
faire. Il n'est pas le chemin principal — il est celui qui existe toujours.

### Le lien d'abonnement collé, et pourquoi il est universel

Le Blueprint [`ukit.edt.abonnement`](../../blueprints/ukit-edt-abonnement.blueprint.json) demande le
lien **verbatim, sans bornes de dates**. C'est ce qui le rend universel : ADE accepte `firstDate` et
`lastDate` en paramètres, mais d'autres produits figent la fenêtre à l'export, et un paramètre inconnu
y est au mieux ignoré. Le filtrage par date est donc **applicatif** (`IcsMapping`), ce qui traite les
deux cas avec le même fichier. Le [cas de parité](../../tools/parity/ical-abonnement.parity.mjs) le
prouve contre la source réelle : les deux découpes rendent exactement les mêmes cours.

Trois conséquences à connaître :

- **le lien est un secret**, pas un réglage. Il ouvre un emploi du temps nominatif sans demander
  d'identifiant, donc il vaut un mot de passe et vit dans le trousseau
  ([`lienEdt.ts`](../../src/shared/etablissements/lienEdt.ts), clé `UKIT_EDT_LIENS`) ;
- **il est cloisonné par établissement, pas effacé** à la bascule — même règle que les groupes favoris
  ([settings.md](settings.md#des-favoris-par-établissement)). Seule la réinitialisation les efface tous ;
- **une réponse entière coûte cher**, d'où un cache **en mémoire** de cinq minutes dans
  `PlanningIcalSource`. Il est volontairement court : servir une salle déplacée pendant une heure serait
  pire que de retélécharger. Il n'est pas sur disque — le cache par vue de `ScheduleList` couvre déjà
  le hors-ligne, et ranger le même calendrier deux fois ferait deux copies à invalider.

**Avec un abonnement, il n'y a pas de groupe**, et c'est une différence de nature : le lien est déjà
l'emploi du temps de cet étudiant-là, filtré par son université. `groupesRequis()` le dit aux deux
écrans qui traitent « aucun favori » comme un état vide à remplir — l'accueil et l'onglet Planning —
sans quoi ils inviteraient à chercher un groupe dans une liste qui n'existe pas.

Ce n'est **pas** une branche par établissement — aucun `if (etablissement === …)` n'apparaît nulle
part — c'est une lecture de données, exactement comme l'hôte Celcat depuis le jalon 6-G.

### Deux prédicats, et les confondre casserait le Campus

`planningDisponible()` et `sallesDisponibles()` ne posent pas la même question, et le jalon 6-I les a
séparés parce qu'un seul prédicat en gardait **trois** :

| Prédicat | Ce qu'il garde | Ce dont il dépend |
|---|---|---|
| `planningDisponible()` | l'écran « pas d'emploi du temps », l'étape d'emploi du temps à l'accueil | Celcat, référentiel iCalendar **ou** abonnement |
| `sallesDisponibles()` | la section **salles libres** du Campus | un inventaire de salles Celcat, propre ou **emprunté** |

Les salles libres se reconstruisent depuis un inventaire Celcat, que l'emploi du temps vienne de là
ou non. Fondre les deux prédicats en un seul aurait fait réapparaître pour Bordeaux INP une section
définitivement cassée — le défaut que la campagne 6-G avait justement corrigé — et les garder séparés
est aussi ce qui a permis, deux heures plus tard, de la **rallumer** proprement.

### Un établissement peut emprunter l'inventaire d'un autre

Décision produit du 2026-08-15, prise en jouant le jalon sur appareil : la colonne `salles_libres`
laisse un établissement pointer le serveur d'inventaire d'un autre. Bordeaux INP emprunte celui de
l'Université de Bordeaux.

La raison est géographique, pas technique. Les écoles de l'INP sont sur le campus de Talence —
l'ENSC est à deux cents mètres des bâtiments que cette recherche liste. Refuser la fonctionnalité à
ses étudiants parce que leur emploi du temps vient d'ADE les priverait d'un service qui leur sert
réellement.

L'emprunt ne concerne **que** les salles : l'emploi du temps garde sa propre source, et les bâtiments
proposés restent ceux de l'UB, en accès libre. Adapter la recherche aux bâtiments de l'INP est un
sujet distinct — ils ne sont pas en accès libre, et le référentiel les publie avec
`acces_libre = false`.

### Ce que l'iCalendar donne, et ce qu'il ne donne pas

[`IcsMapping`](../../src/features/Planning/services/IcsMapping.ts) projette un événement sur le même
`PlanningEvent`. Trois champs n'ont pas de source directe :

- **`color`** — un iCalendar n'en porte aucune. Une empreinte stable de la matière choisit l'une des
  huit teintes de la palette dérivée (clés `palette-1…8`). Même cours, même couleur toute l'année ;
  Bordeaux ne change pas. **Les huit teintes sont toutes vives**, et c'est une correction : la
  première version reprenait celles de la table Celcat, dont un brun qui vire au gris en thème
  sombre. Il attrapait 8 matières sur 61, soit 467 cours sur l'année — un cours sur sept avait l'air
  de n'avoir pas de couleur. Une collision se lit comme deux cours de la même couleur ; une teinte
  neutre se lit comme une couleur manquante, et c'est la seule des deux qui soit un défaut ;
- **`category`** — elle vit dans `DESCRIPTION`, en texte libre. L'ancre fiable est le **code de
  module** (`COG7-CILAN`) : le type est la ligne qui le suit. Un événement sans code de module n'a pas
  de type dérivable, la catégorie vaut `''`, et la pastille ne s'affiche pas ;
- **`description`** — la salle vient d'un champ séparé (`LOCATION`) et est remise **en tête**, d'où le
  `depuis: 0` du format de salle. Trois lignes en sont retirées : l'horodatage `(Exporté le:…)`, qui
  change à chaque requête et mettrait une horloge dans la fiche ; la matière et le type, que l'écran
  affiche **déjà** en titre et en pastille. Les deux dernières ont été trouvées sur appareil — la
  fiche portait un `TD` en pastille et un `TD` en ligne.

### L'icône d'une ligne se déduit de son contenu, pas de son rang

C'était une règle positionnelle — première ligne un groupe, deuxième un enseignant, troisième une
salle — recopiée dans la carte et dans la fiche. Elle tenait tant que Celcat était la seule source :
ce serveur sert toujours ses lignes dans cet ordre. Avec un export iCalendar elle désignait n'importe
quoi, et la campagne l'a montré du premier coup — la salle `CD-O204` portait l'icône « groupe », le
type `TD` portait l'icône « lieu ».

[`CourseAnnotations`](../../src/features/Planning/components/CourseAnnotations.ts) lit désormais le
**contenu**. La salle se reconnaît contre le référentiel des lieux lui-même, c'est-à-dire contre la
donnée d'établissement introduite par ce jalon : une ligne qui désigne un bâtiment connu *est* une
ligne de salle. L'ordre des tests compte, et un test le verrouille : le code de module passe **avant**
la salle, parce que le motif bordelais `([A-Z][0-9]+)` trouve `B1` dans `JPB1-OPTIQ` — et `B1` est un
vrai bâtiment.

Les dates, elles, sont **en UTC honnête** : le même créneau hebdomadaire est servi `07:30Z` en
septembre et `08:30Z` en novembre, soit 09:30 à Paris les deux fois. Il n'y a pas de `VTIMEZONE` à
interpréter.

## Quand l'établissement ne publie pas d'emploi du temps

Ni `celcat_domaine`, ni `edt`, ni `edt.abonnement` dans le catalogue veut dire « cette université ne
publie pas son emploi du temps ici ». Le service rend alors `PLANNING_ABSENT` **sans qu'aucun run ne
parte**, et l'écran affiche « Cette université ne publie pas encore son emploi du temps dans UKit » —
sans bouton Réessayer, parce que rien n'est en panne et que la source ne répondra pas mieux dans dix
secondes.

**À ne pas confondre avec un lien attendu** (jalon 6-J). Un établissement qui déclare `edt.abonnement`
sans qu'aucun lien n'ait été collé rend `EDT_LIEN_ATTENDU`, et l'écran porte alors **le geste qui le
remplirait** : « Colle ton lien d'emploi du temps », avec un bouton. Rien n'est en panne là non plus —
mais il manque quelque chose que l'étudiant peut faire, et le taire serait lui laisser croire que son
université n'est pas couverte.

Un cinquième cas s'y ajoute depuis 6-I : un favori dont la ressource **ne figure plus au
référentiel**. Un relevé se périme à la rentrée suivante, et rendre une journée vide ferait passer un
référentiel obsolète pour une semaine sans cours.

Sa forme dépend de ce qu'il reste à montrer, et la distinction compte :

- **quelques favoris périmés parmi d'autres** → le planning des autres s'affiche, et un **bandeau**
  nomme ceux qui manquent. C'est la règle de couverture partielle du dépôt : ni un succès muet, ni un
  échec ;
- **tous les favoris périmés** → il n'y a rien à demander, et l'écran dit « ce groupe n'existe plus »,
  sans bouton Réessayer.

La première forme est une correction trouvée sur appareil : la version d'origine échouait dès qu'un
seul nom manquait, et vidait donc un planning dont la plus grande partie était parfaitement
disponible.

C'est un écran **différent** de celui d'une panne, d'une journée sans cours **et d'une liste de
favoris vide** ; les quatre se ressemblaient avant la Phase 6 et c'est précisément ce qu'elle a
supprimé. Le dernier cas a demandé une correction trouvée sur appareil : l'absence d'emploi du temps
est testée **avant** l'état « aucun groupe favori », parce qu'une université sans serveur n'en a jamais
— l'écran d'invitation à chercher un groupe gagnait donc toujours, avec un bouton menant à une
recherche qui ne peut rien trouver. Le cas est réel depuis le
jalon [6-G](../phase-6/6-g-etablissements.md) : Bordeaux INP est sur ADE, pas sur Celcat. Le porter
demande une capacité que le moteur n'a pas encore, et le sujet a sa propre spécification —
[6-I](../phase-6/6-i-planning-universel.md).

L'hôte et les codes d'inventaire des six Blueprints `ukit.celcat.*` viennent eux aussi du catalogue
depuis 6-G : ils sont passés en **entrées**, avec les valeurs de Bordeaux par défaut. Aucun
`if (etablissement === …)` n'apparaît dans un service — ce qui varie est une donnée.

## Limites connues

- **La vue semaine n'affiche aucune description, et ce n'est pas nouveau.** Mesure du 2026-08-09 : le
  serveur formate la description **à l'identique** dans les deux vues
  (`\r\n\r\n<br />\r\n\r\n`), que `formatDescription` réduit à une seule ligne séparée par `;`.
  Découper sur `'\n'` ne rend donc qu'un champ, qui porte la catégorie en tête et se fait écarter en
  entier. La justification historique — « le serveur ne formate pas pareil selon `calView` » — était
  fausse ; le comportement, lui, est celui de l'application depuis toujours. Le jalon 6-E l'a
  **conservé et verrouillé par un test**
  ([`PlanningApiMapping.test.ts`](../../src/features/Planning/services/PlanningApiMapping.test.ts)),
  parce que le corriger changerait l'affichage de la vue semaine : c'est une décision produit, pas une
  correction de migration.
- **Un `modules: []` retomberait sur la catégorie.** L'extraction rend `null` aussi bien pour un champ
  absent que pour une liste vide, et les deux cessent d'être distinguables. Le code d'origine rendait
  alors un sujet indéfini, affiché vide. Le cas n'existe dans aucune des 334 entrées d'une année
  interrogée le 2026-08-09.
- **Deux caches concurrents pour la liste des groupes** (`groups` et `groupList`), écrits par deux
  chemins différents et jamais réconciliés.
- **Le cache est par vue, pas par jour**, et ça surprend hors ligne : une semaine jamais consultée en
  ligne n'a rien à replier **même si plusieurs de ses jours sont en cache**, et affiche donc l'écran
  d'échec là où les mêmes jours s'ouvrent un par un. Les deux clés sont indépendantes
  (`…@AAAA/MM/JJ` et `…@Week<n>`) et `cacheOrFailure` ne consulte que celle de la vue courante.
  C'est cohérent — le bandeau porte **une** date de récupération, et l'assembler depuis des jours
  récupérés à des heures différentes en ferait un mensonge — mais ce n'est pas ce qu'on attend.
  Comportement antérieur au jalon 6-I, constaté en le vérifiant.
- **Le référentiel iCalendar est un relevé d'auteur, et il se périme.** Les index de ressource d'ADE
  sont positionnels et propres à un projet, et un projet est annuel : à la rentrée, le relevé se
  rejoue (`node tools/releve-ade.mjs --projet <n>`) et se republie. Un groupe favori qui ne résout
  plus produit un message dédié plutôt qu'une journée vide.
- **Le référentiel est partiel.** L'export anonyme d'ADE expose une tranche arbitraire de l'arbre des
  ressources : treize entrées couvrent les cinq écoles de Bordeaux INP à des granularités inégales —
  une promotion ici, un groupe là. La liste s'étend par publication.
- **La recherche de groupes ne filtre pas côté serveur pour une source iCalendar**, et n'en a pas
  besoin : la liste tient dans le catalogue et la recherche est déjà locale.
- **La synchronisation ne porte que le premier groupe favori** (`_favoriteGroups[0]`), pas le planning
  agrégé. Comportement d'origine, relevé en lisant le code au jalon 6-I et jamais interrogé depuis.
- **`computeScheduleWeek` est appelée au rendu**, pas au chargement : le calcul des UE et le filtrage
  de la vue semaine se rejouent à chaque rendu de `DayWeek`.
- **`ScheduleList` est un composant à classe dense** : chargement, cache, calcul et rendu dans le même
  fichier. Le jalon 6-E l'a découpé en méthodes nommées (`loadSchedule`, `cacheOrFailure`,
  `applySchedule`) sans le scinder — un composant à classe qui fonctionne ne se réécrit pas sans
  raison.
- **La route `Day`** est déclarée dans la pile mais n'est atteinte par aucun appel de navigation.
- **Trois erreurs de typage** subsistent dans ce module (`TS2612` sur `context`) — voir
  [qualite.md](../qualite.md).

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`views/DayView.tsx`](../../src/features/Planning/views/DayView.tsx) | vue composite de l'onglet : état jour/semaine, génération des 365 jours et des semaines, défilement du curseur, bascule de mode |
| [`screens/ScheduleScreen.tsx`](../../src/features/Planning/screens/ScheduleScreen.tsx) | enveloppe routée : résout le groupe (favoris si tableau) et configure l'en-tête |
| [`screens/GroupSelectionScreen.tsx`](../../src/features/Planning/screens/GroupSelectionScreen.tsx) | recherche de groupes : chargement, cache, sections alphabétiques, filtrage |
| [`screens/CourseScreen.tsx`](../../src/features/Planning/screens/CourseScreen.tsx) | fiche d'un cours : détails, extraction de la salle, carte Leaflet intégrée |
| [`components/ScheduleList.tsx`](../../src/features/Planning/components/ScheduleList.tsx) | chargement et rendu d'un planning (jour ou semaine), cache, filtres, notifications |
| [`components/ScheduleListUtils.ts`](../../src/features/Planning/components/ScheduleListUtils.ts) | `groupOverlappingCourses` : regroupement des cours qui se chevauchent |
| [`components/CourseAnnotations.ts`](../../src/features/Planning/components/CourseAnnotations.ts) | l'icône d'une ligne de description, déduite de son contenu — partagée par la carte et la fiche |
| [`components/CourseAnnotations.test.ts`](../../src/features/Planning/components/CourseAnnotations.test.ts) | ses tests, sur les deux formes réelles de description |
| [`components/DayViewHeader.tsx`](../../src/features/Planning/components/DayViewHeader.tsx) | bandeau collant : titre, boutons de navigation, curseurs jour et semaine |
| [`components/CalendarDay.tsx`](../../src/features/Planning/components/CalendarDay.tsx) | pastille d'un jour dans le curseur |
| [`components/CalendarWeek.tsx`](../../src/features/Planning/components/CalendarWeek.tsx) | pastille d'une semaine dans le curseur |
| [`components/CourseCard.tsx`](../../src/features/Planning/components/CourseCard.tsx) | point d'entrée du module carte : type `CourseData` et réexports |
| [`components/CourseRow.tsx`](../../src/features/Planning/components/CourseRow.tsx) | carte d'un cours : couleur, matière, UE, horaires, description, état « pas de cours » |
| [`components/CourseGroupCarousel.tsx`](../../src/features/Planning/components/CourseGroupCarousel.tsx) | carrousel paginé des cours simultanés, avec mémorisation de l'index |
| [`components/CalendarNewEventPrompt.tsx`](../../src/features/Planning/components/CalendarNewEventPrompt.tsx) | modale d'ajout d'un cours au calendrier système (permissions, calendrier par défaut) |
| [`components/DayWeekCollapsible.tsx`](../../src/features/Planning/components/DayWeekCollapsible.tsx) | section repliable d'un jour dans la vue semaine, avec résolution tolérante de la date |
| [`components/GroupSelectionComponents.tsx`](../../src/features/Planning/components/GroupSelectionComponents.tsx) | en-tête de section et ligne de groupe de l'écran de recherche |
| [`services/PlanningApiService.ts`](../../src/features/Planning/services/PlanningApiService.ts) | les quatre signatures publiques : choisit la source déclarée, joue le Blueprint, calcule les plages qui dépendent de l'heure courante |
| [`services/PlanningApiMapping.ts`](../../src/features/Planning/services/PlanningApiMapping.ts) | la projection **Celcat** : sujet, description, filtre `Vacances`, refiltrage sur la date |
| [`services/PlanningApiMapping.test.ts`](../../src/features/Planning/services/PlanningApiMapping.test.ts) | ses tests, joués par `npm test` |
| [`services/IcsMapping.ts`](../../src/features/Planning/services/IcsMapping.ts) | la projection **iCalendar** : type ancré sur le code de module, salle en tête, couleur dérivée |
| [`services/IcsMapping.test.ts`](../../src/features/Planning/services/IcsMapping.test.ts) | ses tests, sur des corps mesurés contre ADE |
| [`services/PlanningIcalSource.ts`](../../src/features/Planning/services/PlanningIcalSource.ts) | la branche iCalendar : résolution des ressources par le référentiel, les deux runs bornés, le run d'abonnement et son cache, la vérification d'un lien collé |
| [`components/LienEdtForm.tsx`](../../src/features/Planning/components/LienEdtForm.tsx) | la saisie d'un lien d'abonnement : vérification par un run réel, enregistrement, oubli. Un composant et non un écran — l'accueil le rend en place |
| [`screens/LienEdtScreen.tsx`](../../src/features/Planning/screens/LienEdtScreen.tsx) | l'écran de pile qui porte ce formulaire, atteint depuis l'état vide du Planning et depuis les Réglages |
| [`services/PlanningAssembly.ts`](../../src/features/Planning/services/PlanningAssembly.ts) | le contrat `PlanningEvent`, la lecture d'un code d'UE, le tri et le découpage en six jours — **communs aux deux sources** |
| [`services/PlanningAssembly.test.ts`](../../src/features/Planning/services/PlanningAssembly.test.ts) | la règle du code d'UE sur les deux formes de titre |
| [`services/PlanningDataManager.ts`](../../src/features/Planning/services/PlanningDataManager.ts) | manager observable : liste des groupes en cache 7 jours, extraction des UE disponibles, **rechargement au changement d'établissement** |
