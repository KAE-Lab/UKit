# 6.1.1-B — Ce qui a été signalé

> **Le premier jalon dont le contenu vient des utilisateurs.** Les seize premières réponses du
> formulaire, arrivées entre le 2026-09-01 et le 2026-09-06, portent deux signalements — et c'est le
> même. Les références B1…B8 renvoient à la [mise à plat](6-2-mise-a-plat.md).
>
> **Ce jalon dépend de [6.1.1-A](6-1-1-a-montee-du-socle.md)** : la correction propre du défaut le
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

## Dépendances

[6.1.1-A](6-1-1-a-montee-du-socle.md), pour `expo-background-task`.

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
5. **Le parcours froid INP**, pour les deux entrées du registre.

## Limites écrites

- **Une tâche de fond n'est jamais garantie.** iOS l'accorde de façon opportuniste et Android la
  planifie sans promesse d'heure : le correctif rend la synchronisation **possible**, il ne la rend
  pas ponctuelle. Le texte de l'application dit « toutes les 12 h » — c'est cette phrase qu'il
  faudra peut-être corriger, autant que le code.
- **La mesure de 24 h ne se rejoue pas à chaque contribution.** Elle vaut pour ce jalon ; ensuite,
  seule une régression signalée la rouvrira.
- **B5 n'est pas ici** : afficher un calendrier externe dans le Planning est une capacité, pas une
  correction. Elle part en 6.3.
