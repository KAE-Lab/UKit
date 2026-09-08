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
6. Depuis [6.1.x-D](../phase-6/6-1-x-d-calendriers-du-telephone.md), les **calendriers du téléphone**
   cochés dans les Réglages apparaissent mêlés aux cours, dans la couleur de leur calendrier — un
   rendez-vous dans le fil de la journée, une journée entière en bandeau en tête du jour. Leur fiche
   n'a ni carte ni UE, et ouvre l'agenda du système. Un **« + »** dans l'en-tête ouvre l'éditeur du
   système sur le jour affiché ; il n'existe que si un calendrier est affiché.

![La vue jour : curseur de dates en bandeau, cartes de cours colorées par catégorie, salle et enseignant en description](../screenshots/planning-jour.png)

> **Capture attendue** — `planning-semaine.png` : la vue semaine, avec ses sections repliables.
>
> **Capture attendue** — `planning-groupes.png` : la recherche de groupes et ses sections
> alphabétiques colorées.
>
> **Capture attendue** — `planning-cours-detail.png` : la fiche d'un cours localisé, avec sa carte.
>
> **Capture attendue** — `planning-telephone.png` : une journée où un rendez-vous personnel et une
> journée entière se mêlent aux cours, dans la couleur de leur calendrier, avec le « + » en en-tête.

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
            ├─ PlanningDataManager.extractUEsFromCourses          (alimente les filtres, modules compris)
            ├─ CourseManager.preparerPourAffichage → filtresUe     (UE posées, filtre des favoris — jour et semaine)
            ├─ NotificationManager.scheduleCourseNotifications     (si planning favori, cours seuls)
            ├─ TelephoneSource.lireEvenementsDuTelephone          (expo-calendar : calendriers cochés, jamais en cache)
            │      └─ TelephoneMapping → FusionTelephone            projection pure, fusion APRES la dérivation
            ├─ separerJourneeEntiere → BandeauJourneeEntiere        (journées entières, en tête du jour)
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
[`PlanningAssembly.ts`](../../src/features/Planning/services/PlanningAssembly.ts) — un module sans
dépendance de plateforme, donc testable, commun aux deux sources depuis le jalon 6-I ;
`PlanningApiMapping` et le service le réexportent pour que les composants n'aient rien à changer.

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
    sites?: string[];            // bâtiments déclarés par la source ("Bâtiment A28")
    modules?: string[];          // intitulés de matière déclarés, tous, dans l'ordre
    source?: 'telephone';        // un événement d'un calendrier du téléphone (6.1.x-D) ; absent pour un cours
    journeeEntiere?: boolean;    // sans heures : rendu en bandeau, jamais en carrousel
    idTelephone?: string;        // l'identifiant système, pour l'ouvrir dans l'agenda ; `id` est composite
}

interface PlanningWeekDay {
    dayNumber: string;
    dayTimestamp: number;
    courses: PlanningEvent[];
}
```

`CourseData` ([`CourseCard.tsx`](../../src/features/Planning/components/CourseCard.tsx)) est le
sous-ensemble consommé par les composants d'affichage. Les champs `UE` et `ues` y sont ajoutés à
l'exécution par `CourseManager.computeCourseUE`, qui délègue à
[`filtresUe.ts`](../../src/features/Planning/services/filtresUe.ts) — un module pur — la lecture des
codes dans `modules`, par [`separerCodeUE`](../../src/features/Planning/services/PlanningAssembly.ts).

**Un cours peut porter plusieurs codes d'UE**, et c'est mesuré : le groupe `MI601A` comptait
dix-neuf événements à plusieurs modules sur l'année 2025-2026 — `4TTV417U Artificial intelligence ||
4TTI607U Artificial Intelligence`, le même cours sous son code français et son code anglais. Ce
groupe n'a plus que des vacances en 2026-2027 ; **pour rejouer la règle, prendre `4TRN901S`**, trouvé
le 2026-09-08 en sondant le serveur et plus complet : il porte des cours à `4TRNN01U` seul, d'autres
à `4TRNN02U` seul, et onze qui portent les deux — les vendredis de 9h30 à 12h30 à partir du
2 octobre. Le sujet
ne garde que le premier (`UE`), la liste entière est dans `ues`. Jusqu'au 2026-09-06, la projection
jetait les suivants : filtrer l'UE en français masquait le TP à qui suit l'UE en anglais, et la
seconde n'apparaissait même pas dans les suggestions de filtres. Un utilisateur l'a signalé par mail.

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

**Où se donne un cours se lit, ça ne se devine plus.** Celcat publie un champ `sites`
(`["Bâtiment A28"]`) que rien n'extrayait ; la fiche de cours cherchait donc un code de salle dans la
description, à un rang que le catalogue déclare. Deux choses faisaient échouer cette heuristique en
silence, sans jamais afficher d'erreur — juste une carte absente :

- **la vue semaine ne produisait aucune description.** Le serveur formate à l'identique dans les deux
  vues, `formatDescription` réduit cela à des `;`, et découper sur `\n` ne rendait qu'un champ,
  porteur de la catégorie, donc écarté en entier. Plus de salle, plus d'enseignant, plus de semaines ;
- **une double espace dans `modules`** (`4TIN606U  Histoire…`, contre une seule dans la description)
  empêchait de reconnaître la ligne du module comme une répétition du sujet. Elle restait, tout
  glissait d'un rang, et la « ligne de salle » devenait le nom de l'enseignant.

**Et une troisième, trouvée le 2026-09-08 sur signalement d'un utilisateur : `modules` ne porte pas
toujours l'intitulé.** La plupart des groupes servent `4TIN602U Techn algorithmiques` ; le master
Génie Logiciel sert `4TGL902U`, le code nu, et met l'intitulé dans la seule description —
`4TGL902U Programmation Large Echelle`. L'intitulé était alors perdu **deux fois** : le sujet n'en
portait pas, et la ligne de description qui le portait était écartée comme répétition du module,
puisqu'elle contient le code. Le cours s'affichait sous son code. La conséquence silencieuse était
pire que l'affichage : sans intitulé, [`separerCodeUE`](../../src/features/Planning/services/PlanningAssembly.ts)
ne sépare rien, le cours ne porte **aucun code d'UE**, et les filtres d'UE de ces groupes ne
filtraient rien. [`completerLesModules`](../../src/features/Planning/services/PlanningApiMapping.ts)
rend au code nu l'intitulé que la description porte, en retenant la ligne qui commence par ce code
suivi d'une espace — et rien d'autre : si la description ne l'a pas, le module reste tel quel. On ne
devine pas un intitulé.

Depuis le 2026-08-22 : `sites` est extrait des trois Blueprints de cours, `lieuxDesSites` le réduit à
un code par le **même** format d'établissement que les libellés de salle, et le séparateur est `;`
pour toutes les vues. Les trois replis historiques restent et servent encore — un export iCalendar
n'a pas de `sites`, et les caches écrits avant ce champ non plus.

> **Ce changement déplace des pixels**, et c'est le seul assumé : les lignes de la vue semaine,
> jusque-là vides, affichent désormais groupes, enseignant, salle et semaines — comme la vue jour.

**Le planning agrégé est un `groupName` de type tableau.** `ScheduleScreen` reçoit `name` ; s'il
s'agit d'un tableau, il le remplace par `context.favoriteGroups`. Toute la chaîne — clé de cache,
requête `federationIds[]` multiple, activation des notifications, application des filtres UE —
distingue les deux cas par `Array.isArray(groupName)`. C'est le pivot du module : le modifier touche
tout le reste.

**Les filtres UE ne s'appliquent qu'au planning favori.** `CourseManager.filterCourse` renvoie `true`
sans condition quand `isFavorite` est faux. Consulter le planning d'un autre groupe montre donc tout,
volontairement : les filtres décrivent *ses* UE, pas celles d'autrui.

**Un cours reste tant qu'une seule de ses UE n'est pas filtrée.** La règle est celle demandée par
l'utilisateur qui a signalé le défaut, et c'est la seule qui respecte l'inscription : un TP commun aux
deux UE d'une matière appartient à qui suit l'une **ou** l'autre. Un cours dont toutes les UE sont
filtrées disparaît ; un cours sans UE ne disparaît jamais. La comparaison est verbatim, comme les
codes que le planning écrit ([`filtresUe.ts`](../../src/features/Planning/services/filtresUe.ts),
verrouillé par ses tests — aucun n'existait sur le filtre avant ce correctif).

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

Les cartes du carrousel **convergent vers une même hauteur par le gabarit** (2026-08-30) : une
ligne par texte, titre compris, coupée en points de suspension — l'UE et le détail du cours portent
l'intitulé complet — et la carte s'étire sur le reliquat de la rangée. Sans cette convergence, une
carte plus courte calée en haut laissait un trou de fond de page sous elle ; trois formes essayées
et défaites : l'étirement seul déplaçait le vide dans la carte, deux lignes de titre bornées
laissaient une ligne d'écart, deux lignes étirées traînaient un blanc sous les titres courts.
L'indicateur de pages se pose dans le coin bas droit **à hauteur de la dernière ligne d'infos**, qui
lui laisse le coin plutôt que de passer dessous. Un spacer sous le contenu a aussi été essayé et
défait : il rendait les cartes du carrousel plus hautes que les cartes seules.

> **Capture attendue** — `planning-cours-simultanes.png` : un créneau à plusieurs cours, points de
> pagination visibles.

**Les couleurs Celcat sont retraduites.** `theme.courses` associe les couleurs brutes du serveur
(`#FFFF00`, `#800040`…) à des teintes de la palette de l'application, avec un `default`. Afficher la
couleur brute donnerait des tons saturés incohérents avec le reste de l'interface. Une troisième
forme existe depuis 6.1.x-D : l'hexadécimale d'un calendrier du téléphone, rendue **telle quelle**,
parce que l'utilisateur reconnaît son calendrier à sa couleur — c'est le sens de son choix.
[`couleurDeCours`](../../src/features/Planning/services/couleurDeCours.ts) résout les trois : la clé
de palette d'abord, l'hexadécimale ensuite, `default` enfin.

**Le rechargement au focus n'existe qu'en mode jour.** `ScheduleList` s'abonne à l'événement `focus`
de la navigation uniquement si `mode === 'day'` : c'est la vue par défaut, celle qu'on veut à jour en
revenant dans l'application.

## Vérifier

- Ouvrir l'onglet sans favori : l'état vide et son bouton vers la recherche doivent s'afficher.
- Ouvrir un dimanche, ou un jour sans cours : « Journée libre » doit se poser **exactement au même
  endroit** que l'état vide ci-dessus et que l'écran d'échec plus bas. Les trois passent par le même
  hôte ([`ScreenState`](../../src/shared/ui/ScreenState.tsx)) ; s'ils sautent d'un état à l'autre,
  c'est que l'un d'eux a repris un centrage local.
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
- **Les calendriers du téléphone** ([6.1.x-D](../phase-6/6-1-x-d-calendriers-du-telephone.md)) :
  deux calendriers cochés, un décoché — les événements des deux aux bonnes heures, dans leur
  couleur, ceux du troisième non ; le calendrier de synchronisation n'est pas proposé et aucun
  cours n'apparaît deux fois, y compris après une synchronisation forcée ; un événement à cheval
  sur minuit sur les deux jours, borné, et une journée entière en bandeau ; un jour sans cours mais
  avec un rendez-vous montre la carte, pas « journée libre » ; le « + » ouvre l'éditeur du système
  sur le jour affiché et l'événement est là au retour, sans relancer ; sa fiche n'a ni carte ni UE
  et « Ouvrir dans le calendrier » ouvre l'agenda ; un rendez-vous ne produit aucun rappel ;
  permission retirée dans les réglages du système : le Planning affiche les cours seuls, sans
  erreur, et l'écran des Réglages le dit ; **basculer d'établissement garde les calendriers
  cochés et leurs événements** — ce sont ceux du téléphone, pas d'une université — là où les cours
  écrits dans l'agenda, eux, sont retirés et réécrits.
- Un dimanche, ou un jour sans cours **et sans rendez-vous** : la carte « pas de cours » doit s'afficher — avec ses
  **confettis** : une journée libre est une bonne nouvelle, et c'est l'icône qui sourit, jamais le
  texte.

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

### L'emploi du temps personnel

ADE **présélectionne la fiche de l'étudiant connecté** dans son arbre de ressources : le portail de
scolarité y lit un identifiant qui désigne *son* emploi du temps, là où le référentiel du catalogue
ne connaît que des promotions. Cet identifiant ne peut pas vivre dans le catalogue publié — il est
propre à une personne — mais tout le reste de l'application ne sait interroger qu'un `GroupeEdt`.

[`edtPersonnel.ts`](../../src/shared/etablissements/edtPersonnel.ts) le range donc à côté, au
trousseau et cloisonné par établissement, et `sourceEdt()` le **fusionne** au référentiel au moment
de le lire — en tête de liste, parce que c'est celui qu'on cherche. Le groupe personnel se résout
alors exactement comme un autre : ni `resoudreRessources`, ni l'écran de choix, ni les favoris
n'apprennent qu'il existe.

La fusion vit dans `sourceEdt()` **et nulle part ailleurs**, parce que c'est le seul passage que tous
les lecteurs du référentiel traversent. La poser plus loin obligerait chaque appelant à se souvenir
qu'elle existe, et le premier qui l'oublierait rendrait un emploi du temps vide à celui qui vient de
l'accepter — deux symptômes qui n'ont pas l'air d'avoir la même cause. Un test le vérifie par le
chemin réel ([`edt.test.ts`](../../src/shared/etablissements/edt.test.ts)).

Rien ne s'y écrit tout seul : la proposition et sa confirmation appartiennent à la Scolarité
([scolarite.md](scolarite.md#ce-que-la-connexion-trouve-en-plus-et-quelle-propose)).

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

## Un seul cache pour la liste des groupes

L'écran de recherche tenait son propre cache (`groups`, sans expiration, avec sa date embarquée) à
côté de celui du manager (`groupList`, sept jours, horodatage à part) : deux formats, deux
politiques, deux écritures pour la même réponse, et une seule invalidation au changement
d'établissement — la liste de l'écran survivait à la bascule. Depuis 6.1-C,
[`PlanningDataManager`](../../src/features/Planning/services/PlanningDataManager.ts) est le seul à
lire et à écrire, et il porte l'état de sa lecture — en cours, en échec, datée (`getGroupListEtat`,
événement `groupListEtat`) — pour que l'écran de recherche date son bandeau hors ligne et que
l'accueil dise pourquoi l'étape des groupes est vide. La politique est écrite et testée à part, dans
[`groupListCache.ts`](../../src/features/Planning/services/groupListCache.ts) : le test a été écrit
**avant** la fusion, pour figer ce que les deux caches faisaient de juste — sept jours, le repli daté,
une liste fraîche qui efface la date.

**Le jour courant se recalcule au retour au premier plan.** L'onglet ne se démonte jamais et
[`DayView`](../../src/features/Planning/views/DayView.tsx) calculait « Aujourd'hui » à son montage :
laissé en arrière-plan jusqu'au lendemain, le bouton menait encore à la veille (mesuré en production
le 2 septembre 2026). Au vrai retour d'arrière-plan
([`premierPlan.ts`](../../src/shared/services/premierPlan.ts)), si la date a changé, tout se recalcule
comme au lancement — le même geste que la simulation temporelle du menu de développement.

## Revenir sur l'onglet ne vide plus la journée

Le retour sur l'onglet Planning déclenche un rafraîchissement (`addListener('focus')`), et il posait
`schedule: null` comme n'importe quel chargement : la journée **disparaissait**, puis revenait
identique.

Le défaut est ancien ; c'est le **glissement entre onglets** du jalon
[6.1-E](../phase-6/6-1-e-finitions-interface.md) qui l'a rendu visible, et la raison vaut d'être
retenue : on voit désormais la page d'arrivée **pendant** le geste, alors qu'un changement d'onglet
instantané ne laissait pas le temps de voir l'avant. Une nouvelle façon de naviguer révèle ce qu'une
autre masquait.

L'écran ne se vide donc que si le chargement porte sur **autre chose** — un autre jour, une autre
semaine, un autre groupe. Relire la même clé garde le contenu affiché jusqu'à son remplacement : il
est juste, puisque c'est la même journée. Et l'attente reste alors **silencieuse** — ni indicateur, ni
fondu — parce que rien à l'écran ne change. Un **autre** jour, lui, arrive toujours en fondu, qu'il
vienne du cache ou du réseau ([theme.md](../theme.md#les-décisions-durables)).

## Les calendriers du téléphone dans le Planning

Le jalon [6.1.x-D](../phase-6/6-1-x-d-calendriers-du-telephone.md) lit l'agenda dans l'autre sens :
l'application y écrivait ses cours depuis toujours, elle ne l'avait jamais lu. Les événements des
calendriers que l'utilisateur coche dans les Réglages
([settings.md](settings.md#les-calendriers-du-téléphone)) apparaissent dans le Planning, jour et
semaine, mêlés aux cours. **Chaque côté affiche l'autre**, et rien de plus : aucune édition ne se
propage, Celcat reste la vérité des cours et l'agenda celle des rendez-vous. Ajouter un événement
se fait dans l'éditeur du système, ouvert par le « + » — pas d'éditeur maison, pas de donnée à
stocker, pas de récurrence à réinventer.

**La lecture est locale, instantanée, et jamais mise en cache.** Elle se joue à chaque chargement
du planning des favoris, au retour au premier plan, au focus, à la fermeture de l'éditeur et quand
le choix des calendriers change — sans réseau, par une *relecture* qui remêle le téléphone à la
dernière issue appliquée et cède à un chargement en cours. Le cache `<groupes>@…` ne reçoit que les
cours : figer des rendez-vous servirait du périmé au repli hors ligne.

**Elle ne concerne que la vue des favoris.** Le planning d'un groupe cherché est celui de quelqu'un
d'autre ; un rendez-vous personnel n'y a rien à faire.

**La fusion se joue après la dérivation, jamais avant** — c'est l'écart le plus important au texte
de la spécification, qui plaçait l'insertion dans `loadSchedule`. `preparerPourAffichage` **mute**
le sujet pour en extraire un code d'UE, et l'indexation des UE aurait pris « 2B Dentiste » pour une
UE. Les cours seuls passent donc par les filtres, l'indexation et les rappels ; le téléphone entre
ensuite, dans [`FusionTelephone`](../../src/features/Planning/services/FusionTelephone.ts), et n'est
plus touché par rien sauf le tri d'affichage. Un rendez-vous ne produit jamais de rappel — on ne
notifie pas à la place de l'agenda —, et `flattenScheduleData` le garantit une seconde fois.

**Ce qu'on ne relit pas.** Le calendrier cible de la synchronisation, par son identifiant **et** par
le titre du calendrier dédié `UKit` (la cible a deux identités avant et après le premier passage) ;
et les événements dont l'identifiant est dans `previousSyncData`, quel que soit leur calendrier — la
table peut porter un orphelin. L'un sans l'autre laisserait un doublon.

**Deux règles de plateforme, décidées dans la couture et jouées dans le mapper.** iOS rend tout ce
qui *chevauche* l'intervalle demandé, Android seulement ce qui y *tient* : la source interroge donc
sept jours de chaque côté de ce qui est affiché, et
[`TelephoneMapping`](../../src/features/Planning/services/TelephoneMapping.ts) décide qu'un
événement appartient à un jour **local** — à cheval sur minuit, il appartient aux deux, borné à
chacun (`22:00`–`23:59`, puis `00:00`–`01:30`), et une fin posée exactement à minuit ne mord pas sur
le lendemain. Une journée entière est datée en local sur iOS, en **UTC à fin exclusive** sur
Android — lue comme un instant local, elle débordait sur deux jours ; le drapeau est lu une fois
depuis `Platform.OS`, jamais dans le mapper. Règle déduite des sources natives d'`expo-calendar`,
à confirmer sur les deux appareils.

**Ce qui s'affiche.** Tout sauf un événement annulé ; un événement « disponible » — anniversaire,
férié — s'affiche, parce que l'utilisateur a coché ce calendrier pour le voir (décision du
2026-09-07, contre l'exclusion par défaut que la spécification proposait). Un rendez-vous qui
chevauche un cours partage son carrousel : ils sont simultanés.

**Un jour entièrement couvert se rend en bandeau**, et pas seulement une journée entière déclarée.
`allDay` ne suffit pas : un événement de plusieurs jours qui porte des heures — parti vendredi soir,
rentré dimanche matin — occupe le samedi en entier, et le rendre « de 00:00 à 23:59 » dans le fil de
la journée est faux deux fois : ce n'est pas un créneau, et ça écrase la journée. Mesuré sur iPhone
le 2026-09-08 avec trois jours de vacances. Le premier et le dernier jour gardent leurs heures
réelles, eux : ils commencent ou finissent quelque part. Le bandeau
([`BandeauJourneeEntiere`](../../src/features/Planning/components/BandeauJourneeEntiere.tsx)) se pose
en tête du jour et compte dans la pastille de la vue semaine ; dans un carrousel, `timeToMinutes`
mettrait l'événement à minuit.

**Un état vide ne paraît que si le jour n'a rien à montrer**, cours et téléphone confondus. Les deux
états du Planning décrivaient l'emploi du temps seul, et masquaient donc ce que l'appareil venait
d'apporter — un écran qui dit « rien » alors qu'il a de quoi remplir la journée ment. Un jour sans
cours mais avec un rendez-vous montre donc le rendez-vous, pas « journée libre ».

**Et les deux états vides ne disent pas la même chose.** « Journée libre » décrit *ce jour-là* ;
« aucun groupe favori » est une invitation à **configurer**. La seconde ne paraît donc que si rien
n'est configuré du tout — ni favori, ni calendrier coché. Quelqu'un qui a coché ses calendriers a
fait son choix de planning : lui redemander un groupe à chaque jour creux serait du bruit, et ses
journées vides sont des journées libres comme les autres. L'invitation reste à un toucher, dans la
barre d'onglets. Réglé le 2026-09-08, sur appareil, après une première version qui rendait
l'invitation dès que le jour était vide.

**Le dimanche s'affiche en vue jour.** Il ne court-circuite plus l'état vide : sans cours ni
rendez-vous la liste est vide et le message paraît de lui-même, mais un rendez-vous du dimanche
tombe un dimanche comme un autre jour. La limite des six colonnes ne vaut que pour la vue semaine.

**La fiche** d'un événement du téléphone ne résout aucun lieu — « Chez Marie » matcherait un
bâtiment bordelais —, n'a ni UE ni bouton de filtre, et porte « Ouvrir dans le calendrier »
(`openEventInCalendarAsync` sur l'occurrence : les récurrents partagent leur identifiant sur iOS,
d'où `instanceStartDate`). L'appui long « ajouter au calendrier » n'existe pas sur ce qui en vient.

**Le « + »** ne se montre que si un calendrier coché accepte l'écriture, et pré-positionne l'éditeur
dessus — c'est ce qui rend vrai « l'événement est dans le Planning au retour » ; l'utilisateur peut
en choisir un autre dans l'éditeur. Le jour proposé est celui qui est affiché, à 9 h ; en vue
semaine, aujourd'hui si la semaine est courante, sinon le lundi — par `moment()`, jamais
`new Date()`, pour suivre la date simulée. `startNewActivityTask: false` est obligatoire : sans lui,
Android résout l'appel à l'ouverture de l'éditeur, avant la saisie.

## Limites connues

- **Un `modules: []` retomberait sur la catégorie.** L'extraction rend `null` aussi bien pour un champ
  absent que pour une liste vide, et les deux cessent d'être distinguables. Le code d'origine rendait
  alors un sujet indéfini, affiché vide. Le cas n'existe dans aucune des 334 entrées d'une année
  interrogée le 2026-08-09.
- **Le cache est par vue, pas par jour**, et ça surprend hors ligne : une semaine jamais consultée en
  ligne n'a rien à replier **même si plusieurs de ses jours sont en cache**, et affiche donc l'écran
  d'échec là où les mêmes jours s'ouvrent un par un. Les deux clés sont indépendantes
  (`…@AAAA/MM/JJ` et `…@Week<n>`) et `cacheOrFailure` ne consulte que celle de la vue courante.
  C'est cohérent — le bandeau porte **une** date de récupération, et l'assembler depuis des jours
  récupérés à des heures différentes en ferait un mensonge — mais ce n'est pas ce qu'on attend.
  Comportement antérieur au jalon 6-I, constaté en le vérifiant.
- **La fiche d'un cours n'affiche que sa première UE**, et son bouton de filtre ne filtre que
  celle-là. Les codes suivants sont dans `ues` et comptent pour le filtre, mais rien ne les montre :
  un étudiant qui veut masquer la seconde UE d'un TP la saisit depuis l'écran des filtres, où elle
  est désormais proposée. À reprendre si le besoin se signale.
- **Le référentiel iCalendar est un relevé d'auteur, et il se périme.** Les index de ressource d'ADE
  sont positionnels et propres à un projet, et un projet est annuel : à la rentrée, le relevé se
  rejoue (`node tools/releve-ade.mjs --projet <n>`) et se republie. Un groupe favori qui ne résout
  plus produit un message dédié plutôt qu'une journée vide.
- **Le référentiel est partiel.** L'export anonyme d'ADE expose une tranche arbitraire de l'arbre des
  ressources : treize entrées couvrent les cinq écoles de Bordeaux INP à des granularités inégales —
  une promotion ici, un groupe là. La liste s'étend par publication.
- **La recherche de groupes ne filtre pas côté serveur pour une source iCalendar**, et n'en a pas
  besoin : la liste tient dans le catalogue et la recherche est déjà locale.
- **La catégorie fantôme `nocourse` a disparu.** Une journée vide était rendue en **injectant un faux
  cours** dans la liste, que `CourseRow` reconnaissait pour afficher le message à la place d'une
  carte. Le détour coûtait sa hauteur au bloc : il se retrouvait dans une cellule de liste, qui ne
  s'étire pas, donc il se posait là où la cellule tombait. C'est un état d'écran comme les deux
  autres depuis la passe de finition. Le filtre défensif sur `nocourse` de
  [`DayWeekCollapsible`](../../src/features/Planning/components/DayWeekCollapsible.tsx) est resté :
  il ne se déclenchait déjà plus avant ce changement, et le retirer sortait du périmètre.
- **`ScheduleList` est un composant à classe dense** : chargement, cache, calcul et rendu dans le même
  fichier. Le jalon 6-E l'a découpé en méthodes nommées (`loadSchedule`, `cacheOrFailure`,
  `applySchedule`) sans le scinder — un composant à classe qui fonctionne ne se réécrit pas sans
  raison. Le jalon 6.1.x-D lui a fait franchir la limite de 400 lignes : les bandeaux et les états
  plein écran vivent depuis dans
  [`ScheduleListEtats`](../../src/features/Planning/components/ScheduleListEtats.tsx), sans état,
  et la fusion du téléphone dans un module pur.
- **Un événement du téléphone de plus de sept jours peut manquer sur Android**, qui ne rend que ce
  qui tient en entier dans la fenêtre interrogée (±7 jours autour de l'affiché). Une semaine de
  vacances posée en journée entière peut donc s'arrêter avant sa fin dans le Planning.
- **Un groupe cherché ne montre pas le téléphone** : c'est le planning de quelqu'un d'autre.
- **La couleur d'un événement du téléphone est celle de son calendrier**, pas celle des matières :
  un agenda bleu à côté de cours bleus se distinguera mal. Le choix du calendrier est celui de
  l'utilisateur.
- **Le format d'une journée entière n'a été déduit que des sources natives** d'`expo-calendar` ;
  le protocole de 6.1.x-D le vérifie sur iPhone, celui de 6.1.x-Z sur Android.
- **Le compteur de la rangée des Réglages ne retire pas la cible de synchronisation.** Cocher un
  calendrier puis le choisir comme cible fait dire « 2 choisis » à la rangée alors que l'écran n'en
  montre qu'un — la cible n'est ni listée ni lue, pour ne pas afficher les cours deux fois. L'état
  est **préservé** : reprendre une autre cible fait réapparaître le calendrier, coché, avec ses
  événements. Seul le compte est faux, et seulement dans ce cas de bord.
- **La route `Day`** est déclarée dans la pile mais n'est atteinte par aucun appel de navigation.
- **Trois erreurs de typage** subsistent dans ce module (`TS2612` sur `context`) — voir
  [qualite.md](../qualite.md).

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`views/DayView.tsx`](../../src/features/Planning/views/DayView.tsx) | vue composite de l'onglet : état jour/semaine, génération des 365 jours et des semaines — refaite au retour au premier plan si la date a changé —, défilement du curseur, bascule de mode, et les déclencheurs de relecture du téléphone (retour, focus, éditeur fermé, choix des calendriers) |
| [`screens/ScheduleScreen.tsx`](../../src/features/Planning/screens/ScheduleScreen.tsx) | enveloppe routée : résout le groupe (favoris si tableau) et configure l'en-tête |
| [`screens/GroupSelectionScreen.tsx`](../../src/features/Planning/screens/GroupSelectionScreen.tsx) | recherche de groupes : chargement par le manager, repli daté sur son cache, sections alphabétiques, filtrage |
| [`services/groupListCache.ts`](../../src/features/Planning/services/groupListCache.ts) | la politique du cache de la liste des groupes — expiration, lecture défensive, repli daté — pure |
| [`services/groupListCache.test.ts`](../../src/features/Planning/services/groupListCache.test.ts) | ses tests, écrits avant la fusion des deux caches (6.1-C), joués par `npm test` |
| [`screens/CourseScreen.tsx`](../../src/features/Planning/screens/CourseScreen.tsx) | fiche d'un cours : détails, extraction de la salle, carte intégrée ([`EmbeddedMap`](../../src/shared/map/EmbeddedMap.tsx), [cartographie.md](../cartographie.md)) ; pour un événement du téléphone, ni lieu ni UE, et « Ouvrir dans le calendrier » |
| [`components/ScheduleList.tsx`](../../src/features/Planning/components/ScheduleList.tsx) | chargement et rendu d'un planning (jour ou semaine), cache, filtres — appliqués au chargement, jamais au rendu —, notifications, et la fusion du téléphone **après** tout cela |
| [`components/ScheduleListEtats.tsx`](../../src/features/Planning/components/ScheduleListEtats.tsx) | ses bandeaux et ses états plein écran — pas de favori, journée libre, chargement — sortis quand il a franchi 400 lignes (6.1.x-D) |
| [`components/BandeauJourneeEntiere.tsx`](../../src/features/Planning/components/BandeauJourneeEntiere.tsx) | une journée entière du téléphone, en tête du jour : filet à la couleur du calendrier, titre, et la fiche au toucher |
| [`components/ScheduleListUtils.ts`](../../src/features/Planning/components/ScheduleListUtils.ts) | `groupOverlappingCourses` : regroupement des cours qui se chevauchent |
| [`components/CourseAnnotations.ts`](../../src/features/Planning/components/CourseAnnotations.ts) | l'icône d'une ligne de description, déduite de son contenu — partagée par la carte et la fiche |
| [`components/CourseAnnotations.test.ts`](../../src/features/Planning/components/CourseAnnotations.test.ts) | ses tests, sur les deux formes réelles de description |
| [`components/DayViewHeader.tsx`](../../src/features/Planning/components/DayViewHeader.tsx) | bandeau collant : titre, le « + » vers l'éditeur du système quand il a lieu d'être, boutons de navigation, curseurs jour et semaine |
| [`components/CalendarDay.tsx`](../../src/features/Planning/components/CalendarDay.tsx) | pastille d'un jour dans le curseur |
| [`components/CalendarWeek.tsx`](../../src/features/Planning/components/CalendarWeek.tsx) | pastille d'une semaine dans le curseur |
| [`components/CourseCard.tsx`](../../src/features/Planning/components/CourseCard.tsx) | point d'entrée du module carte : type `CourseData` et réexports |
| [`components/CourseRow.tsx`](../../src/features/Planning/components/CourseRow.tsx) | carte d'un cours : couleur, matière, UE, horaires, description — sans appui long sur ce qui vient du téléphone |
| [`components/CourseGroupCarousel.tsx`](../../src/features/Planning/components/CourseGroupCarousel.tsx) | carrousel paginé des cours simultanés, avec mémorisation de l'index |
| [`components/CalendarNewEventPrompt.tsx`](../../src/features/Planning/components/CalendarNewEventPrompt.tsx) | modale d'ajout d'un cours au calendrier système (permissions, calendrier par défaut) |
| [`components/DayWeekCollapsible.tsx`](../../src/features/Planning/components/DayWeekCollapsible.tsx) | section repliable d'un jour dans la vue semaine, avec résolution tolérante de la date |
| [`components/GroupSelectionComponents.tsx`](../../src/features/Planning/components/GroupSelectionComponents.tsx) | en-tête de section et ligne de groupe de l'écran de recherche |
| [`services/PlanningApiService.ts`](../../src/features/Planning/services/PlanningApiService.ts) | les quatre signatures publiques : choisit la source déclarée, joue le Blueprint, calcule les plages qui dépendent de l'heure courante |
| [`services/PlanningApiMapping.ts`](../../src/features/Planning/services/PlanningApiMapping.ts) | la projection **Celcat** : sujet, description, filtre `Vacances`, refiltrage sur la date |
| [`services/PlanningApiMapping.test.ts`](../../src/features/Planning/services/PlanningApiMapping.test.ts) | ses tests, joués par `npm test` |
| [`services/IcsMapping.ts`](../../src/features/Planning/services/IcsMapping.ts) | la projection **iCalendar** : type ancré sur le code de module, salle en tête, couleur dérivée |
| [`services/IcsMapping.test.ts`](../../src/features/Planning/services/IcsMapping.test.ts) | ses tests, sur des corps mesurés contre ADE |
| [`services/TelephoneMapping.ts`](../../src/features/Planning/services/TelephoneMapping.ts) | la projection des **calendriers du téléphone** : la journée locale, minuit, la journée entière selon la plateforme, les exclusions — pure, sans `expo-calendar` |
| [`services/TelephoneMapping.test.ts`](../../src/features/Planning/services/TelephoneMapping.test.ts) | ses tests, sur les formes que le type d'expo-calendar annonce et que ses sources natives produisent |
| [`services/FusionTelephone.ts`](../../src/features/Planning/services/FusionTelephone.ts) | la fusion du téléphone avec les cours, jour et semaine, et la mise à part des journées entières — pure |
| [`services/FusionTelephone.test.ts`](../../src/features/Planning/services/FusionTelephone.test.ts) | ses tests : le tri, les colonnes par index, les bandeaux |
| [`services/TelephoneSource.ts`](../../src/features/Planning/services/TelephoneSource.ts) | la lecture : calendriers cochés qui existent encore, cible de synchronisation écartée, `previousSyncData`, fenêtre ±7 jours, et le calendrier où le « + » écrit — la seule pièce de plateforme du jalon |
| [`services/couleurDeCours.ts`](../../src/features/Planning/services/couleurDeCours.ts) | la couleur d'une ligne : clé de palette, hexadécimale d'un calendrier, ou `default` — pure |
| [`services/couleurDeCours.test.ts`](../../src/features/Planning/services/couleurDeCours.test.ts) | ses tests |
| [`services/PlanningIcalSource.ts`](../../src/features/Planning/services/PlanningIcalSource.ts) | la branche iCalendar : résolution des ressources par le référentiel, les deux runs bornés, le run d'abonnement et son cache, la vérification d'un lien collé |
| [`components/LienEdtForm.tsx`](../../src/features/Planning/components/LienEdtForm.tsx) | la saisie d'un lien d'abonnement : vérification par un run réel, enregistrement, oubli. Un composant et non un écran — l'accueil le rend en place |
| [`screens/LienEdtScreen.tsx`](../../src/features/Planning/screens/LienEdtScreen.tsx) | l'écran de pile qui porte ce formulaire, atteint depuis l'état vide du Planning et depuis les Réglages |
| [`services/PlanningAssembly.ts`](../../src/features/Planning/services/PlanningAssembly.ts) | le contrat `PlanningEvent`, la lecture d'un code d'UE, le tri et le découpage en six jours — **communs aux deux sources** |
| [`shared/etablissements/edtPersonnel.ts`](../../src/shared/etablissements/edtPersonnel.ts) | l'emploi du temps personnel trouvé dans le dossier : la table cloisonnée, et sa fusion au référentiel publié |
| [`services/PlanningAssembly.test.ts`](../../src/features/Planning/services/PlanningAssembly.test.ts) | la règle du code d'UE sur les deux formes de titre |
| [`services/filtresUe.ts`](../../src/features/Planning/services/filtresUe.ts) | les UE d'un cours (toutes, lues dans `modules`) et le filtre des favoris : masqué seulement si toutes le sont — pur, `CourseManager` y délègue |
| [`services/filtresUe.test.ts`](../../src/features/Planning/services/filtresUe.test.ts) | ses tests, sur les intitulés réels de `MI601A` |
| [`services/PlanningDataManager.ts`](../../src/features/Planning/services/PlanningDataManager.ts) | manager observable : liste des groupes en cache 7 jours, extraction des UE disponibles, **rechargement au changement d'établissement** |
