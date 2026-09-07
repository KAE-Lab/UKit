# 6.1.x-D — Les calendriers du téléphone, et le ciblage par plateforme

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
| jour vide | `renderEmptyDay` cède quand des événements existent ; le dimanche reste absent (limite) |
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

- **Le dimanche n'existe pas dans le Planning**, cours ou pas : six colonnes depuis toujours. Un
  rendez-vous du dimanche est invisible. À rouvrir si la demande vient.
- **Une modification faite dans UKit n'existe pas** : on lit, on ouvre l'éditeur du système, on ne
  modifie rien soi-même. C'est la décision, pas une lacune.
- **Un rendez-vous qui chevauche un cours partage son carrousel** : simultané, donc au même endroit.
- **La couleur est celle du calendrier**, pas celle des matières : un agenda coloré en bleu à côté de
  cours bleus se distinguera mal. Le choix du calendrier est celui de l'utilisateur.
- **Tester la plateforme demande les deux appareils**, et Android n'est vu qu'à Z.

---

## Reporté à la version suivante : les messages en notification

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
