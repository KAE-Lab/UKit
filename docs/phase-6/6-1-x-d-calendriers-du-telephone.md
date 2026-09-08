# 6.1.x-D — Les calendriers du téléphone, et le ciblage par plateforme

> **Jalon livré (code, portes et documentation) le 2026-09-07 — protocole iPhone à jouer, Android
> reporté à la vérification groupée de [Z](6-1-x-z-sortie.md).** Les deux chantiers sont livrés, la
> plateforme d'abord : colonne `plateformes` appliquée en base le même jour (essai à blanc puis
> réel, `check` vérifié, écriture anonyme refusée), la règle et la console étendues ; puis les
> calendriers, en trois modules purs testés et une seule pièce de plateforme. Portes : `tsc` vert,
> ESLint à zéro, 667 tests, `expo-doctor` 21/21, `expo export` sur les deux plateformes. **Les
> écarts au texte sont en fin de document**, avant l'analyse du push — le plus important est le
> point d'insertion de la fusion.
>
> **Le premier jalon de la 6.1.x qui ajoute une capacité**, et c'est une décision du propriétaire du
> produit du 2026-09-06 : la prochaine release doit *se débarrasser d'un maximum de demandes* avant
> d'ouvrir la 6.2 visuelle. Deux demandes convergent ici — *« afficher un calendrier externe dans le
> Planning »* (formulaire du 2026-09-03, B5 de la [mise à plat](6-2-mise-a-plat.md)) et *« ajouter mes
> propres événements à l'emploi du temps »* (retour oral). Une seule réponse les sert toutes les deux.
>
> **Spécifié pendant [6.1.x-B](6-1-x-b-signalements.md), à coder à la session suivante.** Le jalon
> dépend de B : l'entretien y garantit la fraîcheur de l'autre sens de la synchronisation.
>
> **Il porte aussi le ciblage par plateforme** (demande du 2026-09-07), fusionné ici le même jour
> plutôt qu'un jalon E à part : une demi-journée de travail ne vaut pas le coût fixe d'un jalon — la
> relecture de la doc, un protocole, une bannière. Les deux chantiers sont indépendants et se
> livrent dans l'ordre qu'on veut ; ils partagent la vérification Android de [Z](6-1-x-z-sortie.md).
> Les messages en notification, en vrai push, sont **reportés à la version suivante** ; l'analyse est
> en bas.

## La direction

L'application **écrit** déjà ses cours dans l'agenda du téléphone ; elle ne l'a jamais **lu** —
`getEventsAsync` n'était appelé nulle part le 2026-09-06. Ce jalon lit dans l'autre sens : les
événements des calendriers que l'utilisateur choisit apparaissent dans le Planning, jour et semaine,
mêlés aux cours.

C'est ce que « fusion réciproque » veut dire, et rien de plus : **chaque côté affiche l'autre**.
Aucune édition ne se propage — Celcat reste la vérité des cours, l'agenda du téléphone celle des
événements personnels. Ajouter un événement personnel se fait **dans l'éditeur du système**, ouvert
depuis UKit : pas d'éditeur maison, pas de donnée à stocker, pas de récurrence à réinventer. Un
« + » dans le Planning ouvre `createEventInCalendarAsync` pré-rempli sur le jour affiché ; l'événement
atterrit dans le calendrier choisi et s'affiche au retour.

Ce qui a été écarté, et pourquoi : **un éditeur d'événements dans UKit** (édition, suppression,
récurrence, alarmes — réécrire un agenda que le téléphone a déjà, pour le faire moins bien) ; **une
synchronisation d'édition** (un cours modifié dans l'agenda serait réécrasé au prochain passage, et
l'utilisateur ne saurait pas pourquoi).

## Ce qui est à faire — les calendriers

### Le choix des calendriers, dans les Réglages

Une rangée de plus dans la section Calendrier de [`SettingsSections.tsx`](../../src/features/Settings/components/SettingsSections.tsx)
— « Calendriers affichés dans le Planning » — qui pousse un **écran de multi-sélection** sur le
modèle de [`FiltersScreen`](../../src/features/Settings/screens/FiltersScreen.tsx) :
`SettingsChoicePopup` est mono-sélection, et un choix multiple dans une modale serait une sous-page
qui ne dit pas son nom. Chaque ligne porte le nom du calendrier, sa source et **sa couleur**, que la
modale actuelle n'affiche pas.

Deux règles, décidées :

- **rien ne s'affiche tant que rien n'est coché.** Opt-in, calendrier par calendrier ;
- **le calendrier cible de la synchronisation est exclu d'office**, et non proposé : le relire
  afficherait deux fois chaque cours. En plus, les événements dont l'identifiant est dans
  `previousSyncData` sont exclus quel que soit leur calendrier — la table peut être désynchronisée
  (un `updateEventAsync` qui échoue laisse un orphelin), et le filtre par calendrier ne suffit pas seul.

Persistance : `calendriersAffiches: string[]` dans le document `settings` de `SettingsManager`
([donnees-et-persistance.md](../donnees-et-persistance.md)). Une bascule d'établissement ne le purge
pas : ce sont des calendriers du téléphone, pas d'une université.

### La lecture, et où elle se mêle

Un mapper **pur**, `TelephoneMapping.ts`, sur le modèle exact d'[`IcsMapping.ts`](../../src/features/Planning/services/IcsMapping.ts) :
il reçoit des `Calendar.Event[]` et rend des `PlanningEvent`, sans appeler `getEventsAsync` —
c'est ce qui le rend jouable sous vitest. Les cas à verrouiller sont ceux que le type annonce :
`startDate` en `string | Date`, `allDay`, `location: null`, `status === 'canceled'` (exclu),
`availability === 'free'` (à décider : exclu par défaut), la journée **locale** et non UTC, et le
refiltrage applicatif — iOS rend tout ce qui chevauche l'intervalle, Android seulement ce qui y tient
(`getEventsAsync`, [expo-calendar](../../node_modules/expo-calendar/build/legacy/Calendar.d.ts)).

Le point d'insertion : [`ScheduleList.loadSchedule`](../../src/features/Planning/components/ScheduleList.tsx),
**après** `keep()` et **après** `cacheOrFailure()` — les événements du téléphone ne vont pas dans le
cache `<groupes>@…` (locaux, instantanés, et les figer servirait du périmé au repli hors ligne), et
ils se mêlent aussi au chemin de repli. Ils échappent au filtre d'UE et à l'indexation des UE
(`preparerPourAffichage` ne touche que les cours), et **aux rappels** : `applySchedule` planifie sur
le planning entier des favoris, il doit exclure ce qui vient du téléphone — on ne notifie pas les
rendez-vous personnels à la place de l'agenda.

Le contrat gagne `source?: 'telephone'` sur `PlanningEvent` (facultatif, comme `sites` et `modules`),
pour que les écrans distinguent sans deviner.

### Ce que les écrans font d'un événement du téléphone

| Où | Comportement |
|---|---|
| `CourseRow` | la **couleur du calendrier**, rendue telle quelle — `PlanningEvent.color` est aujourd'hui une clé de `theme.courses` ; une teinte hexadécimale inconnue retombe sur `default`, donc `CourseRow` et `CourseScreen` acceptent en plus une hexadécimale. L'utilisateur reconnaît son calendrier à sa couleur, c'est le sens du choix |
| carrousel des chevauchements | un événement qui chevauche un cours entre dans le même carrousel (`groupOverlappingCourses` est purement horaire) — accepté : ils sont simultanés |
| journée entière | un **bandeau** en tête de jour, sans heures — `starttime`/`endtime` n'ont pas de sens, et `timeToMinutes` mettrait l'événement à minuit |
| jour vide | `renderEmptyDay` cède quand des événements existent — **y compris le dimanche**, en vue jour (corrigé le 2026-09-08) |
| `CourseScreen` | ni carte ni UE — `resoudreLieux` sur « Chez Marie » matcherait un bâtiment bordelais —, et une action **« Ouvrir dans le calendrier »** (`openEventInCalendarAsync`) ; l'appui long « ajouter au calendrier » est désactivé sur ce qui en vient |
| en-tête du Planning | un **« + »** → `createEventInCalendarAsync({ startDate: jour affiché 9:00, endDate: 10:00 })`, l'éditeur du système ; relecture au retour au premier plan et au focus |

### La fraîcheur

Lecture **à chaque focus et à chaque vrai retour au premier plan**, jamais mise en cache : locale et
instantanée. Le système n'expose aucun événement « le calendrier a changé » par `expo-calendar` ;
relire au focus suffit, et c'est ce que fait déjà le Planning pour « Aujourd'hui ». Dans l'autre
sens, l'entretien de [6.1.x-B](6-1-x-b-signalements.md) garantit que les cours écrits dans l'agenda
sont à jour à l'ouverture et quand un favori change.

### Ce qui reste hors code

Le texte de `NSCalendarsFullAccessUsageDescription` ([`app.config.ts`](../../app.config.ts)) justifie
l'accès complet par « lister vos calendriers pour choisir une destination et y ajouter vos cours » :
il doit dire aussi « afficher vos événements dans le planning ». C'est un point de revue App Store.
Aucune permission nouvelle : l'accès complet iOS 17 et `READ_CALENDAR` sont déjà demandés.
`PRIVACY.md` ne change pas — la lecture est locale, rien ne quitte l'appareil.

## Ce qui est à faire — la plateforme

**Cibler par plateforme.** Un défaut qui n'existe que sur Android ou que sur iOS mérite un message de
service qui ne dérange pas l'autre moitié du parc. La colonne s'ajoute aux **deux** tables ciblées —
messages de service et annonces — et, par prudence, à tout contenu ciblé à venir : le ciblage est un
module commun, une colonne de plus s'y ajoute une fois pour tous.

### La plateforme

- **Schéma** ([`supabase/schema.sql`](../../supabase/schema.sql)) : une colonne `plateformes text[]`
  sur `annonces` et `service_messages`, `null` = les deux, contrainte `check` sur les valeurs
  `ios` / `android`. Même règle qu'`etablissements` : « ajouter avant de retirer », une version
  antérieure ignore la colonne et voit tout.
- **Le module de ciblage** ([`shared/ciblage/ciblage.ts`](../../src/shared/ciblage/ciblage.ts)) :
  `Ciblage` gagne `plateformes: readonly ('ios' | 'android')[] | null` ; `projeterCiblage` la lit
  défensivement (tableau vide = toutes, valeur inconnue **écartée** — une plateforme qu'on ne
  connaît pas n'est pas la nôtre) ; `ContexteDeCiblage` gagne `plateforme`, lue une fois dans
  [`contexte.ts`](../../src/shared/ciblage/contexte.ts) (`Platform.OS`) ; `estCible` la compare.
  Trois tests dans [`ciblage.test.ts`](../../src/shared/ciblage/ciblage.test.ts).
- **La console** ([`console/src/schema/tables.ts`](../../console/src/schema/tables.ts)) : le champ
  dans le jeu de champs de ciblage partagé par les deux descripteurs — deux cases, iOS et Android,
  aucune cochée = les deux — et la colonne dans les deux listes.
- **La doc** : [pilotage.md](../pilotage.md) § « Le ciblage » passe à quatre critères ; le tableau
  des colonnes, la règle de bord (« une plateforme inconnue cache »), et le cas d'usage — un défaut
  d'une seule plateforme.

## Décisions et pièges

- **`Platform.OS` se lit une fois** dans la couture, jamais dans la règle : le module de ciblage
  reste pur et testé sous vitest.
- **Un contenu ciblé sur une plateforme que le parc ne connaît pas encore** — une troisième valeur un
  jour — cache, comme une audience inconnue : le sens de l'erreur du ciblage est restrictif.
- **`expo-calendar/legacy`, jamais la racine** : au SDK 57 elle expose des souches qui lèvent à
  l'appel, et `tsc` les accepte ([6.1.x-A](6-1-x-a-montee-du-socle.md)).
- **`getEventsAsync` jette** sur une liste de calendriers vide, une date absente : une liste vide
  court-circuite l'appel, elle ne le tente pas.
- **Ne pas relire ce qu'UKit a écrit** : calendrier cible exclu **et** identifiants de
  `previousSyncData` exclus. L'un sans l'autre laisse un doublon.
- **`moment()`, jamais `new Date()`** pour le jour affiché — le simulateur de date du menu de
  développement ne déplace que `moment.now`.
- **Le premier écran à toucher est `ScheduleList`**, un composant à classe dense
  ([planning.md](../features/planning.md#limites-connues)) : le mapper vit à part, testé, et l'écran
  ne fait que fusionner.

## Ce que la vérification sur iPhone a corrigé (2026-09-08)

Le protocole a trouvé **trois défauts**, tous de la même famille : le Planning décrivait l'emploi du
temps seul, là où il porte désormais deux sources.

1. **Un événement de plusieurs jours s'affichait « de 00:00 à 23:59 »** sur ses jours intermédiaires,
   au lieu d'un bandeau. `allDay` ne suffit pas à reconnaître un jour plein : trois jours de vacances
   avec des heures occupent le jour du milieu en entier. La règle devient « ce jour est-il
   entièrement couvert ? », et le premier comme le dernier jour gardent leurs heures réelles.
2. **« Journée libre » masquait les rendez-vous du dimanche.** Le dimanche court-circuitait l'état
   vide avant même de regarder ce qu'il y avait à montrer — une garde héritée des six colonnes de la
   vue semaine, appliquée à tort à la vue jour.
3. **Sans aucun groupe favori, rien ne s'affichait**, calendriers cochés ou non : le chargement
   sortait avant de lire le téléphone, et l'état « aucun favori » passait devant. Un utilisateur qui
   coche ses calendriers sans suivre de groupe voit maintenant ses rendez-vous.
4. **Et l'invitation à ajouter un groupe revenait à chaque jour creux** — la première correction du
   point 3 la rendait dès que le jour était vide. Remarqué par le propriétaire du produit en
   vérifiant : les deux états vides ne disent pas la même chose. « Journée libre » décrit *ce
   jour-là* ; « aucun groupe favori » invite à **configurer**, et n'a donc de sens que si rien n'est
   configuré — ni favori, ni calendrier coché.

Une règle en deux temps les résume, écrite dans
[planning.md](../features/planning.md#les-calendriers-du-téléphone-dans-le-planning) : **un état vide
ne paraît que si le jour n'a rien à montrer, cours et téléphone confondus** — et l'invitation à
configurer, seulement si rien n'est configuré.

Un **cinquième défaut**, sans rapport avec les calendriers, a été trouvé en jouant le point de la
synchronisation forcée : sans cible ou sans groupe favori, le bouton « Forcer une synchronisation »
ne produisait **rien** — ni écriture, ni message. Le service ne rend pas d'échec dans ce cas, ce n'en
est pas un, mais l'écran n'affichait donc aucun retour et le bouton passait pour cassé. Il dit
maintenant ce qui manque ([settings.md](../features/settings.md#la-synchronisation-calendrier)).
Défaut antérieur au jalon.

Le reste du protocole est passé du premier coup : les heures et les couleurs, le carrousel partagé
avec un cours, le bandeau d'une journée entière, l'événement à cheval sur minuit sur ses deux jours,
l'occurrence d'un récurrent et son ouverture dans l'agenda, le « + » et son éditeur pré-rempli, la
persistance des calendriers cochés, la vue semaine, l'absence de rappel sur un rendez-vous personnel,
le chemin dégradé quand la permission calendrier est retirée, et le calendrier de synchronisation
absent de la liste.

## Dépendances

[6.1.x-B](6-1-x-b-signalements.md) — l'entretien, pour la fraîcheur du sens écriture.

## Plan de test sur appareil

1. **Deux calendriers cochés, un décoché** : les événements des deux apparaissent aux bonnes heures,
   dans leur couleur, ceux du troisième non ; sur les deux plateformes.
2. **Le calendrier de synchronisation n'est pas proposé**, et aucun cours n'apparaît deux fois — y
   compris après une synchronisation forcée.
3. **Un événement à cheval sur minuit et un événement journée entière** : le premier apparaît sur les
   deux jours (iOS et Android doivent rendre pareil après refiltrage), le second en bandeau.
4. **Un jour sans cours mais avec un rendez-vous** : la carte du rendez-vous, pas l'état « pas de
   cours ».
5. **Le « + »** : l'éditeur du système s'ouvre sur le jour affiché ; l'événement enregistré est dans
   le Planning au retour, sans relancer.
6. **Sa fiche** : pas de carte, pas d'UE, « Ouvrir dans le calendrier » ouvre l'application d'agenda.
7. **Les rappels** : un rendez-vous personnel ne produit aucune notification UKit.
8. **Le chemin dégradé** : permission retirée dans les réglages du système → la rangée des Réglages
   le dit, le Planning affiche les cours seuls, sans erreur.
9. **Plateforme** : un message ciblé `android` seul — invisible sur l'iPhone ; le même sans
   plateforme — visible. Idem pour une annonce. La moitié Android se joue à la vérification groupée
   de [Z](6-1-x-z-sortie.md). Une valeur inconnue publiée à la main : le contenu ne se montre nulle part.

## Limites écrites

- **Le dimanche n'existe pas dans la vue semaine** : six colonnes depuis toujours. La vue jour, elle,
  l'affiche — corrigé le 2026-09-08, voir la section ci-dessous.
- **Une modification faite dans UKit n'existe pas** : on lit, on ouvre l'éditeur du système, on ne
  modifie rien soi-même. C'est la décision, pas une lacune.
- **Un rendez-vous qui chevauche un cours partage son carrousel** : simultané, donc au même endroit.
- **La couleur est celle du calendrier**, pas celle des matières : un agenda coloré en bleu à côté de
  cours bleus se distinguera mal. Le choix du calendrier est celui de l'utilisateur.
- **Tester la plateforme demande les deux appareils**, et Android n'est vu qu'à Z.

## Écarts constatés à la livraison

Ce que la réalité a corrigé dans le texte ci-dessus, dans l'ordre d'importance :

1. **La fusion se joue dans `applySchedule`, après la dérivation, et non dans `loadSchedule`.** Le
   texte plaçait l'insertion après `keep()` et `cacheOrFailure()`, avant que les cours ne soient
   dérivés ; or `preparerPourAffichage` **mute** le sujet pour en extraire un code d'UE, et
   `extractUEsFromCourses` aurait indexé « 2B Dentiste » comme une UE. Les cours seuls passent par
   les filtres, l'indexation et les rappels ; le téléphone entre ensuite. L'intention tient : le
   cache ne reçoit que les cours, le chemin de repli reçoit bien le téléphone.
2. **La vue des favoris seulement.** Le texte ne le disait pas : le planning d'un groupe cherché est
   celui de quelqu'un d'autre, un rendez-vous personnel n'y apparaît pas.
3. **Un événement « disponible » s'affiche** (décision du 2026-09-07), là où le texte proposait de
   l'exclure par défaut : anniversaires et fériés sont « free », et l'utilisateur a coché ce
   calendrier pour les voir. Seul l'annulé est exclu.
4. **Le « + » est opt-in, et pré-positionne l'éditeur.** Il ne se montre que si un calendrier coché
   accepte l'écriture, et l'éditeur s'ouvre dessus — sinon l'événement pouvait atterrir dans un
   calendrier non affiché, et « s'affiche au retour » était faux. Sur Android,
   `startNewActivityTask: false` est obligatoire : le défaut résout l'appel à l'ouverture.
5. **La journée entière n'a pas le même format sur les deux plateformes** — le texte l'ignorait.
   iOS la date en local, Android en UTC à fin exclusive ; lue comme un instant local, la seconde
   forme débordait sur deux jours. Le drapeau est lu une fois depuis `Platform.OS` dans la source.
   Règle déduite des sources natives d'`expo-calendar`, **à confirmer sur les deux appareils** : le
   protocole ajoute une journée entière et un événement de trois jours.
6. **La couleur : la casse et l'absence, pas l'alpha.** Android formate déjà `#RRGGBB` ; iOS peut
   rendre `nil`. `couleurDeCours` normalise et retombe sur `default`.
7. **Les rappels ne voient jamais le téléphone**, par construction (cours seuls) **et** par une garde
   dans `flattenScheduleData` — le texte ne demandait que l'une des deux.
8. **Trois modules purs de plus que prévu** (`FusionTelephone`, `couleurDeCours`,
   `ScheduleListEtats` — ce dernier sans logique) et une extraction : `deleteAllPreviousCalendarEntries`
   sort d'`AppCore.tsx` vers `CalendarSyncHelpers.retirerEvenementsSynchronises`, parce que les
   deux fichiers hôtes frôlaient la barre des 400 lignes ; `ScheduleList` l'a franchie et a rendu
   ses bandeaux et ses états. Refactors sans changement de comportement.
9. **Un point de couleur partagé**, `shared/ui/PointDeCouleur`, relevé quatre fois avant que
   l'écran des calendriers n'en ait besoin une cinquième — remonté selon la règle de 6-K.
10. **Le libellé de la rangée** est « Calendriers du téléphone », pas « Calendriers affichés dans
    le Planning » : le libellé de gauche d'une rangée de réglage ne se comprime pas, et la valeur à
    droite (« 2 choisis ») doit tenir.
11. **La console gagne un type de champ générique** `cases` — plusieurs valeurs d'une liste fermée
    déclarée par le descripteur — plutôt qu'un type `plateformes` : le prochain critère à valeurs
    fermées n'aura rien à écrire.

Ce que seul l'appareil dira, consigné pour le protocole : le format exact d'une journée entière sur
chaque plateforme ; que l'éditeur iOS respecte le `calendarId` pré-rempli ; qu'un calendrier
d'abonnement (anniversaires, fériés) arrive avec `allowsModifications: false` et une couleur non
nulle ; et si l'ouverture de l'éditeur déclenche un aller-retour d'`AppState` — une double lecture,
inoffensive par la garde de `relireTelephone`.

---

## Reporté à la version suivante : les messages en notification

> **Finalement livré dans cette version**, le 2026-09-08, par le jalon
> [6.1.x-E](6-1-x-e-notifications-push.md) : le propriétaire du produit a voulu l'essayer avant la
> sortie. Les quatre questions ci-dessous y sont tranchées. L'analyse reste telle qu'écrite.

**La demande.** L'application sait parler à ses utilisateurs par un bandeau, une feuille et une
pastille — mais seulement quand elle est ouverte. Un incident, une annonce importante, un « mets à
jour » devraient pouvoir **réveiller le téléphone**, chez tout le monde, tout de suite. C'est du
**push**, et c'est ce qui est voulu ; la notification locale posée par la tâche de fond n'en est
qu'une approximation — elle atteint une application fermée, mais quand le système réveille la
tâche, jamais à la seconde.

**Ce que la base publierait** : un message de service gagne `notifier boolean not null default false`.
Coché, le message doit atteindre l'appareil **même application fermée**. Décoché, rien ne change :
bandeau, feuille, pastille.

**Ce que l'appareil ferait**, quelle que soit la voie :

- le message notifié se marque « vu » à l'ouverture de la notification, pas à sa réception : ouvrir
  l'application depuis la notification doit mener à la feuille du message ;
- un message déjà vu ne se notifie jamais, et un message ne se notifie qu'**une fois** par appareil
  (la mémoire « vu » de [`shared/messages/vus.ts`](../../src/shared/messages/vus.ts) gagne une
  seconde table, « notifié ») ;
- le ciblage s'applique **avant** de notifier : audience, campus, version, plateforme ;
- la permission de notification est celle des rappels de cours, déjà demandée à l'activation des
  rappels — un utilisateur qui les a refusés ne reçoit pas de message non plus, et la console ne
  peut pas le savoir.

**Les deux voies, comparées le 2026-09-07 :**

| | **Notification locale à la réception** | **Push par le service d'Expo** |
|---|---|---|
| Comment | l'**entretien** ([6.1.x-B](6-1-x-b-signalements.md)) relit les messages — au lancement, au retour au premier plan, et par la tâche de fond — et pose une notification locale pour tout message `notifier` non encore notifié | l'appareil enregistre un **jeton push** dans la base ; la console envoie par l'API d'Expo ; le téléphone reçoit sans que l'application tourne |
| Délai | celui de la tâche de fond (douze heures, quand le système la réveille) ou de la prochaine ouverture | quelques secondes |
| Ce que la base reçoit | **rien** — la règle de `PRIVACY.md` tient : « aucune écriture de l'application, par construction » | **une écriture par appareil** : le jeton, et de quoi le cibler (campus, version, plateforme) — sinon le ciblage se fait côté serveur, donc la base apprend ce qu'elle ne savait pas |
| Ce qui change ailleurs | rien : la tâche de fond existe, l'entretien existe, `expo-notifications` est déjà là | une table `jetons`, une politique d'écriture — la première du projet —, un envoi depuis la console, `PRIVACY.md` amendé, et un build de développement pour tester (Expo Go ne porte plus les push depuis le SDK 53) |
| Ce qu'on perd | l'immédiateté : un incident publié à 9 h peut n'être notifié qu'à l'ouverture suivante | la promesse « rien de vous ne transite », qui est la raison d'être du moteur embarqué |

**Pourquoi c'est un projet à part, et pas une option.** Le push ouvre la **première écriture** de
l'application vers la base — le jeton — avec une politique d'écriture et un mot dans `PRIVACY.md` ;
cibler côté serveur apprendrait à la base le campus, la version et la plateforme de chaque appareil,
sauf à envoyer un push silencieux à tous et laisser l'appareil trier, ce qui demande un gestionnaire
de notifications en arrière-plan ; l'envoi passe par l'API d'Expo depuis une fonction Supabase ou une
action GitHub, pas depuis la console dans le navigateur ; et rien ne se teste sous Expo Go — chaque
itération demande un build de développement. La notification locale, elle, ne coûte qu'un jalon
court et tient la promesse du README, mais elle n'est pas ce qui est demandé.

**Décision du 2026-09-07 : reporté à la version suivante**, à spécifier comme un jalon entier, avec
la question de la promesse tranchée avant d'écrire une ligne. La règle de ciblage et les gestes
ci-dessus valent quelle que soit la voie.
