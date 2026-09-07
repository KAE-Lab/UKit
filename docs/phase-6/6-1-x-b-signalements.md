# 6.1.x-B — Ce qui a été signalé

> **Jalon livré (code, portes et documentation) le 2026-09-07 — protocole iPhone joué en entier le
> même jour, tout validé ; Android reporté à la vérification groupée de [Z](6-1-x-z-sortie.md),
> décision du 2026-09-07.** Le
> périmètre a doublé entre la spécification et la livraison, et chaque ajout vient d'une mesure ou
> d'un signalement arrivé après l'écriture : les **filtres d'UE à plusieurs codes** (mail du
> 2026-09-06), l'**entretien** à l'ouverture (idée du propriétaire du produit, confirmée par le code :
> la tâche n'était jamais réarmée au lancement), la **Scolarité sans compte** à la place du lien
> courriel, et le bloc **`optional`** à la place du découpage. Portes au moment de la livraison :
> `tsc` vert, ESLint à zéro, 582 tests, parité Celcat 4/4, `expo-doctor` 21/21, `expo export` sur les
> deux plateformes, les deux dossiers de portail rejoués sur comptes réels. Les écarts au texte sont
> en fin de document.
>
> **Le premier jalon dont le contenu vient des utilisateurs.** Les seize premières réponses du
> formulaire, arrivées entre le 2026-09-01 et le 2026-09-06, portent deux signalements — et c'est le
> même. Les références B1…B8 renvoient à la [mise à plat](6-2-mise-a-plat.md).
>
> **Ce jalon dépend de [6.1.x-A](6-1-x-a-montee-du-socle.md)** : la correction propre du défaut le
> plus signalé passe par un module que seule la montée apporte.

## La direction

Deux plateformes, deux utilisateurs qui ne se connaissent pas, un seul défaut : **la synchronisation
automatique du calendrier ne part jamais**. Et il n'a pas été corrigé par la 6.1 — celle-ci a corrigé
*ce que* la synchro synchronise et *ce qu'elle dit* quand elle échoue, jamais *le fait qu'elle
parte*. La documentation le disait déjà, en toutes lettres, dans les limites de
[settings.md](../features/settings.md) : *« non vérifié à ce jour : la tâche de fond application
fermée »*.

Une limite écrite depuis des semaines et confirmée deux fois de l'extérieur n'est plus une limite,
c'est un défaut.

## Ce qui est à faire

### La tâche de fond ne part jamais (B1, B2)

Ce que le code dit aujourd'hui, dans [`AppCore.tsx`](../../src/shared/services/AppCore.tsx) :

```
139  const TASK_DELAY = 12 * 60 * 60;
140  const BACKGROUND_FETCH_TASK = 'background-fetch';
142  TaskManager.defineTask(BACKGROUND_FETCH_TASK, …)      -> SettingsManager.syncCalendar()
449  BackgroundFetch.registerTaskAsync(…, { minimumInterval, stopOnTerminate: false, startOnBoot: true })
```

`expo-background-fetch` est **déprécié depuis le SDK 53** : il repose sur des API de plateforme
elles-mêmes dépréciées, ne reçoit plus de correctifs, et sera retiré. Son successeur
`expo-background-task` s'appuie sur `WorkManager` (Android) et `BGTaskScheduler` (iOS). L'API est
quasi identique — seul le paramètre d'options de `registerTaskAsync` change — et `expo-task-manager`
reste le même de part et d'autre.

La migration est **la** correction candidate. Elle n'est pas la preuve : voir le plan de test.

### Le drapeau d'échec ne se laisse pas effacer (B3)

Mesuré en écrivant cette spécification, et c'est plus précis que le signalement :

- `_lastSyncFailed` **n'est jamais persisté** — il vaut `false` à la construction (ligne 193) et ne
  repasse à `false` qu'après une synchronisation **réussie** (ligne 430) ;
- **éteindre puis rallumer l'interrupteur ne le touche pas** : `setCalendarSyncEnabled` (ligne 445)
  ne fait qu'enregistrer ou retirer la tâche.

C'est exactement le geste que l'utilisateur du Pixel 3 décrit avoir tenté — *« I tried to disable and
enable the option but it always says that the last sync is failed »*. **Son remède ne pouvait pas
marcher**, et rien ne le lui disait. Un état d'échec doit être effaçable par le geste qui, du point
de vue de l'utilisateur, remet la fonctionnalité à zéro.

À noter aussi : quand le drapeau est levé, la ligne d'état n'affiche **que**
`LAST_SYNCHRONIZATION_FAILED`, sans date — la date de la dernière synchronisation réussie, elle,
survit dans `previousSyncTime`. Les deux informations ne sont jamais montrées ensemble, alors que
c'est leur composition qui renseigne : *ce qui a réussi, quand ; ce qui a échoué, depuis*.

### Le webmail introuvable (B4)

`services.email` vaut `https://webmel.u-bordeaux.fr` dans la ligne `bordeaux`. La porte n'est
atteignable que par la rangée « messagerie » du tableau de bord de la Scolarité
([`ScolariteDashboard.tsx:260`](../../src/features/Scolarite/screens/ScolariteDashboard.tsx)), donc
seulement une fois connecté — et le signalement vient d'un enseignant-chercheur, qui ne le sera
jamais.

Proposition : une entrée discrète **sur l'écran de connexion de la Scolarité**, qui ouvre la porte
dans le navigateur intégré sans session. C'est là qu'atterrit quelqu'un qui cherche les services de
son université, et l'écran a déjà l'établissement en main. L'alternative — une entrée aux Réglages —
range la fonctionnalité là où personne ne la cherche.

### Deux entrées du registre (B6)

Les deux tombent exactement dans ces fichiers, donc elles se prennent au passage plutôt que de rester
ouvertes une version de plus. Détail dans [defauts-fonctionnels.md](../defauts-fonctionnels.md) :

- **la fiche du compte ne dit pas l'échec d'un parcours froid** — six tirets, `sessionFailure` non
  lu ; le remède est déjà écrit dans le registre (`EncartSession` en `variant="card"`) ;
- **une navigation bonus non gardée peut emporter tout le parcours froid** — les trois lectures
  complémentaires du dossier INP sont précédées d'un `navigate` qui ne l'est pas.

## Décisions et pièges

- **`moment()`, jamais `new Date()`** : le simulateur de date du menu de développement remplace
  `moment.now`, et tout `new Date()` lui échappe. La règle vaut ici plus qu'ailleurs — une tâche de
  fond se sonde en déplaçant le temps.
- **Les événements `keyboardWill*` n'existent pas sur Android**, et l'interrupteur de la
  synchronisation vit dans un écran qui en a. Sans rapport direct, mais c'est le même écran.
- **Éteindre la synchronisation retire ce qu'elle a écrit** (`purgeCalendarEvents`,
  `deleteAllPreviousCalendarEntries`), et c'est une confirmation obligatoire. Ne pas confondre
  « effacer l'état d'échec » avec « éteindre » : le premier ne doit rien retirer de l'agenda.
- **Le filtre `estBornable`** existe depuis la 6.0 : un cours Celcat sans fin ne fait plus échouer la
  synchronisation. Ce n'est donc pas la cause de B1, et la piste est close.

### Ce qui s'est ajouté avant la livraison

**Les filtres d'UE à plusieurs codes (B9).** Mail du 2026-09-06 : *« quand on filtre une UE, tous
les events contenant le code de l'UE n'apparaissent plus ; or un TP porte plusieurs codes »*. Mesuré
sur Celcat le même soir : le groupe `MI601A` porte dix-neuf événements à plusieurs modules sur
2025-2026 — `4TTV417U Artificial intelligence || 4TTI607U Artificial Intelligence`, le même cours
sous son code français et son code anglais. La cause n'était pas le filtre : `sujetDuCours` ne
gardait que le **premier** module, et la seconde UE était perdue à la projection, avant le filtre,
et jamais indexée pour les suggestions. Règle retenue, celle du mail : un cours reste tant qu'une
seule de ses UE n'est pas filtrée ([planning.md](../features/planning.md#contrats)).

**L'entretien (B10).** Le propriétaire du produit a proposé de *tenter une synchro à chaque
ouverture*. Le code lui a donné raison au-delà de ce qu'il pensait : la tâche n'était **jamais
réenregistrée au lancement**, sa promesse n'était ni attendue ni rattrapée, et l'ancien module ne
tournait pas dans l'Expo Go d'iOS. Règle écrite : *la tâche de fond est un bonus, l'ouverture est la
garantie* — et le même entretien replanifie les rappels de cours, qui n'étaient programmés qu'en
ouvrant le Planning ([settings.md](../features/settings.md#lentretien--la-tâche-de-fond-est-un-bonus-louverture-est-la-garantie)).

**B3 persisté.** La dernière tentative — date, issue, origine — est écrite ; l'interrupteur l'efface
dans les deux sens ; la ligne d'état dit le dernier succès **et** l'échec.

**B4 refondu.** Pas un lien : **la page Scolarité sans compte est la même que la page connectée**
(décision du propriétaire du produit, contre le « l'onglet sans compte EST le formulaire » du
2026-08-31). Les identifiants tapés dans le navigateur peuvent être mémorisés, dans un magasin à
part, sans ouvrir de session. « Autre campus » ne bouge pas.

**B6b par `optional`.** La prémisse du registre était fausse : le bloc existe depuis Aetherius
`0.5.8`, et l'application consommait la `0.5.9` sans s'en servir.

## Dépendances

[6.1.x-A](6-1-x-a-montee-du-socle.md), pour `expo-background-task`. Et le jalon
[6.1.x-D](6-1-x-d-calendriers-du-telephone.md), écrit pendant celui-ci, dépend de l'entretien.

## Plan de test sur appareil

**C'est le jalon où la vérification compte plus que le correctif.** Un défaut « corrigé » sans
mesure serait re-signalé par les mêmes utilisateurs.

1. **Une mesure de 24 heures, application fermée, sur les deux plateformes.** La synchronisation
   allumée, l'application tuée, l'appareil utilisé normalement : la tâche doit avoir tourné au moins
   une fois. Consigner l'heure de départ, l'heure d'exécution, et l'écart.
2. **Le même essai avec l'appareil redémarré** en cours de fenêtre — `startOnBoot` est déclaré, il
   n'a jamais été prouvé.
3. **L'état d'échec** : provoquer un échec (source injoignable), constater la pastille, puis vérifier
   que le geste retenu l'efface — et qu'il n'efface **que** ça.
4. **Le webmail** depuis l'écran de connexion, déconnecté, sur les deux plateformes.
5. **Le parcours froid INP**, pour les deux entrées du registre — et un onglet **Accès** cassé en
   local (`BLUEPRINTS_REMOTE=false`) : identité lue, run `partial`, aucun encart d'échec.
6. **Les filtres** : favoris `MI601A`, semaine du 12 janvier 2026 au simulateur de date ; filtrer
   `4TTV417U` → le cours d'IA reste ; filtrer aussi `4TTI607U` → il disparaît ; `4TTI607U` est
   proposé dans les suggestions de l'écran des filtres.
7. **L'entretien** : menu de développement, onglet Temps, bloc Entretien — sous Expo Go la tâche se
   dit « indisponible sous Expo Go », sur un build « disponible » et « enregistrée », et « Réveiller
   la tâche » y produit une tentative d'origine `tache` ; partout, réseau coupé
   puis « Forcer » → l'échec daté sous la date du dernier succès ; éteindre puis rallumer → l'échec
   disparaît, la date reste ; avancer la date de douze heures, passer en arrière-plan, revenir → une
   tentative `premier-plan`. Rappels actifs, « Oublier l'échéance » dans le bloc, application tuée,
   rouverte → `[entretien] lancement : … rappels replanifies` dans Metro (la date simulée ne survit
   pas à une fermeture : sans ce geste, le lancement dit `trop-tot`, et c'est juste).
8. **La Scolarité sans compte** : déconnecté à Bordeaux → la même page, portes ouvrant ENT,
   messagerie, Moodle, Apogée ; documents atteignables ; se connecter à la main dans le navigateur →
   proposition de mémoriser → au service suivant le formulaire se remplit seul, **aucun run** ;
   « Oublier » depuis l'écran du compte ; bascule INP → ses portes ; « Autre campus » → page
   inchangée ; connexion complète depuis l'écran du compte → tableau de bord normal.

## Limites écrites

- **Une tâche de fond n'est jamais garantie.** iOS l'accorde de façon opportuniste et Android la
  planifie sans promesse d'heure : le correctif rend la synchronisation **possible**, il ne la rend
  pas ponctuelle. Le texte de l'application dit « toutes les 12 h » — c'est cette phrase qu'il
  faudra peut-être corriger, autant que le code.
- **La mesure de 24 h ne se rejoue pas à chaque contribution.** Elle vaut pour ce jalon ; ensuite,
  seule une régression signalée la rouvrira.
- **B5 n'est pas ici** : afficher un calendrier externe dans le Planning est une capacité, pas une
  correction. Elle a sa spécification, [6.1.x-D](6-1-x-d-calendriers-du-telephone.md), écrite
  pendant ce jalon sur décision du propriétaire du produit, et se code à la session suivante.

## Écarts constatés à la livraison

Mesurés les 2026-09-06 et 2026-09-07. Le texte ci-dessus est laissé tel qu'il a été écrit.

- **B1 avait trois causes, pas une.** La dépréciation d'`expo-background-fetch` était la moins
  grave : la tâche n'était **jamais réenregistrée au lancement** (`registerTaskAsync` n'était appelé
  que par l'interrupteur), sa promesse n'était ni attendue ni rattrapée, et aucune tâche de fond ne
  tourne sous Expo Go — **le nouveau module non plus**, contrairement à ce que sa page de doc laisse
  croire : son JS rend `Restricted` dès qu'il se sait dans Expo Go, mesuré sur iPhone le 2026-09-07.
  La tâche se sonde donc sur un build de développement ; l'entretien à l'ouverture se sonde partout,
  et c'est lui la garantie. `expo-background-task` compte en **minutes** et n'a plus ni
  `stopOnTerminate` ni `startOnBoot` ; son greffon pose `processing`, celui d'`expo-task-manager`
  laisse `fetch`.
- **B3 était plus large** : la sortie anticipée de `syncCalendar` (pas de cible, pas de favori) ne
  touchait pas le drapeau non plus, et la branche « UKit » de `deleteAllPreviousCalendarEntries`
  sortait avant d'effacer la date. Les deux sont corrigés avec la persistance.
- **B4 n'a pas été fait comme écrit** — ni le lien discret, ni « sans session » au sens strict : le
  navigateur partage le magasin de cookies par décision de 6-F. Ce qui l'a remplacé est plus large
  et plus juste, voir ci-dessus.
- **B6a décrivait un remède qui n'existait pas** : `variant="card"` n'est pas une prop
  d'`EncartSession`. Il a gagné `enveloppe`, et la dérivation de l'échec bloquant est partagée
  (`echecBloquantDe`).
- **B6b : la prémisse du registre était fausse.** Le bloc `optional` existait ; `runBlueprint`
  acceptait déjà un run `partial`. Quatre blocs posés (trois à l'INP, l'annuaire à Bordeaux),
  `min_engine: "0.5.8"`, versions `11` et `7`. Rejoués sur comptes réels : nominal identique ; un
  onglet qui ne répond jamais fait céder son seul bloc et l'identité arrive. **Observation pour
  Aetherius** : depuis le poste, un hôte qui *refuse* la connexion (`127.0.0.1:1`) fait lever une
  erreur Playwright brute (« interrupted by another navigation to chrome-error:// ») que le bloc ne
  rattrape pas ; sur appareil, le même cas rend une page d'erreur et l'extraction rend `[]`, donc le
  bloc n'est même pas sollicité. À signaler là-bas, pas à contourner ici.
- **Le premier passage sur iPhone (2026-09-07) a corrigé deux choses** : la messagerie sans compte
  se disait « pas encore disponible » — la grille cherchait sa porte sous `messagerie` quand le
  catalogue la nomme `email` (`serviceDuPoint`, dans `widgets/definitions`) ; et l'encart
  d'invitation en tête de page gâchait la page sans compte — l'invitation est devenue le bouton
  « Se connecter » de la barre d'onglets, qui mène à l'écran du compte. Les filtres d'UE ont été
  vérifiés sur le cours d'IA du 15 janvier 2026.
- **Le glissement entre onglets de 6.1-E est retiré**, sur un signalement Android arrivé pendant le
  protocole (2026-09-07) : le pager cassait le ruban des jours et le carrousel des cours du Planning.
  Le navigateur redevient `createBottomTabNavigator`, `react-native-pager-view` et
  `@react-navigation/material-top-tabs` sortent, `@react-navigation/bottom-tabs` revient. Hors
  périmètre au départ, mais attribuable, et c'est le jalon des signalements.
- **Rallumer la synchronisation synchronise tout de suite** (retour iPhone du 2026-09-07) : éteindre
  retire les cours et la date par construction, et rallumer laissait « Jamais synchronisé » jusqu'à
  l'échéance suivante. L'entretien part à l'activation et au choix de la cible ; `setSyncCalendar`
  attend le retrait des anciens événements avant de prévenir, sinon la synchronisation lisait une
  table en train d'être effacée.
- **Les notes et examens restent floutés sans compte** (retour iPhone du 2026-09-07) : une rangée
  sans source publiée garde son teaser, avec ou sans compte — la page sans compte est la page
  connectée moins les aperçus, pas une page où tout s'ouvre en grand.
- **Le texte « toutes les 12 h » a été corrigé**, comme la limite le prévoyait, dans les trois
  langues — et `FORCE_SYNC` anglais disait « Forcer sync. », en français.
- **Le registre portait une entrée périmée de plus** : `scolarite.md` affirmait que le portail de
  l'INP n'était pas embarqué ; il l'est depuis la 6.1.
- **Deux publications restent à faire après le protocole** : les deux Blueprints de dossier
  (`npm run blueprints:publish`), et rien d'autre — le reste est une release.
- **Le protocole iPhone a été joué en entier le 2026-09-07**, en trois tours de retours, tous
  corrigés en séance (voir ci-dessus). **Android n'a pas été joué** : le second testeur n'est pas
  disponible à chaque jalon, et la vérification Android se fait désormais **en une fois à Z**, pour
  tous les jalons — la liste de ce que B lui laisse est dans [Z](6-1-x-z-sortie.md).
- **La version ne s'appelle plus 6.1.1** : la branche est `v6.1.x`, le numéro se décide à la sortie.
