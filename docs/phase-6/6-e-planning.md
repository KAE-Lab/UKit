# 6-E — Act I : le planning

> La source la plus critique de l'application, la seule qui doit survivre hors ligne, et celle dont
> le port retire un serveur de l'architecture.

## Objectif

[`PlanningApiService`](../../src/features/Planning/services/PlanningApiService.ts) et la partie
distante de [`CampusApiService`](../../src/features/Campus/services/CampusApiService.ts) passent par
des Blueprints, en visant **`celcat.u-bordeaux.fr` directement**. Le relais `ukit.kbdev.io` sort de
l'architecture. Le cache de repli hors ligne, lui, ne bouge pas d'un octet.

## Pourquoi ce jalon est à part

L'emploi du temps est la seule fonctionnalité que le README promet de faire fonctionner hors ligne.
C'est aussi celle que les utilisateurs ouvrent tous les jours, dans un couloir, avec un réseau
médiocre. Une régression y est visible immédiatement et par tout le monde.

D'où une règle qui gouverne le jalon : **on ne touche pas au cache**. Il enveloppe l'appel, avant
comme après. C'est ce qui rend la bascule invisible, et c'est aussi ce qui permet de la défaire.

## Ce qui est livré

### Les Blueprints

| Blueprint | Ce qu'il fait | Remplace |
|---|---|---|
| `ukit.celcat.groupes` | la liste des groupes d'étudiants (`resType` 103) | `fetchGroupList` |
| `ukit.celcat.jour` | les cours d'une journée pour un ou plusieurs groupes | `fetchCalendarDay` |
| `ukit.celcat.semaine` | les cours d'une semaine | `fetchCalendarWeek` |
| `ukit.celcat.annee` | la plage annuelle pour la synchronisation calendrier | `fetchCalendarForSynchronization` |
| `ukit.celcat.salles` | la liste des salles (`resType` 102) | `fetchRoomList` |
| `ukit.celcat.occupation` | l'occupation des salles d'un bâtiment | l'appel calendrier de `CampusApiService` |

### Le relais disparaît

```json
"vars": { "domaine": "https://celcat.u-bordeaux.fr/calendar" }
```

`ukit.kbdev.io` existe parce qu'une page web ne peut pas appeler un autre domaine sans son accord, et
que l'application était une WebView. Une requête émise **nativement depuis l'appareil** n'y est pas
soumise. Le point d'entrée dédié n'a donc plus de raison d'être : un serveur à héberger, à payer et à
surveiller sort de l'architecture.

À vérifier avant de basculer, et à écrire dans [sources-externes.md](../sources-externes.md) quel que
soit le résultat : que le serveur de l'université ne filtre pas sur `Origin` ou `Referer`, et qu'il
tient la charge de tous nos utilisateurs sans le relais devant. Si l'un des deux tombe, le repli est
gratuit — `vars.domaine` redevient le relais par une publication de Blueprint, ce qui est une
démonstration en soi.

Le relais n'est **pas éteint** au terme du jalon. Il l'est en [6-H](6-h-livraison-finale.md), après
une période d'observation, et pas avant que la dernière version qui en dépend soit sortie du parc.

### Les constantes magiques deviennent des `vars`

`resType`, `calView`, `colourScheme` sont aujourd'hui recopiés dans quatre méthodes et deux
services. Ils deviennent des variables nommées, en un seul endroit, et leur signification s'écrit à
côté : **103 = groupes, 102 = salles**.

La borne de fin **exclusive** — un `+1 jour` implicite que rien n'expliquait — s'écrit là où on la
lit :

```json
"form": { "start": "{{ inputs.jour }}", "end": "{{ inputs.jour | add_days(1) }}" }
```

Et l'encodage exigeant survit : `federationIds[]` reste une clé littérale répétable, et le moteur
poste **les mêmes octets** que `qs.stringify(data, { arrayFormat: 'repeat' })`. C'est le point le
plus susceptible de casser en silence, donc c'est le premier que la parité vérifie.

### Ce qui reste dans le service, et ce n'est pas rien

Tout le travail de forme reste applicatif, et il est substantiel :

- le rejet des événements de catégorie `Vacances` **et** le refiltrage sur la date exacte (le serveur
  renvoie des débordements) ;
- le sujet tiré du premier `modules`, avec repli sur la catégorie ;
- le nettoyage de la description par
  [`formatDescription`](../../src/shared/utils/formatUtils.ts) : `\r`, `<br />`, entités HTML, lignes
  qui répètent la catégorie ou le sujet ;
- le **séparateur qui dépend de la vue** (`;` pour le jour et la synchronisation, `\n` pour la
  semaine) — une différence délibérée, à ne pas « corriger » ;
- l'extraction du code d'UE par expression régulière, qui alimente les filtres ;
- le tri double, heure puis sujet après retrait du code d'UE ;
- le découpage de la semaine en six jours et le calcul des horodatages.

Le filtrage `Vacances` **pourrait** descendre dans le Blueprint (il tient dans un prédicat) et le
fichier de référence d'Aetherius le fait. Ne pas le suivre ici : le service refiltre de toute façon
sur la date, et deux filtres dans deux endroits différents pour la même liste est exactement le genre
de duplication qui rend un comportement inexplicable trois mois plus tard. **Un filtre, un endroit.**

## Décisions et pièges

- **Le cache est intouchable.** `ScheduleList.fetchSchedule` tente le réseau si `NetInfo` détecte une
  connexion, écrit le cache, et lit le cache sinon, avec son bandeau daté. Ce flux reste identique ;
  seul l'appel réseau au milieu change de nature.
- **`ScheduleList` importe `axios` pour un jeton d'annulation.** C'est un des deux écarts documentés
  à la règle « le réseau vit dans les services »
  ([architecture.md](../architecture.md#invariants)). Le moteur a sa propre annulation
  (`client.cancel(runId)` ou un signal passé au run) : l'écart disparaît, et il faut penser à retirer
  l'import.
- **La synchronisation calendrier est du code hors React.** Elle passe par
  [`AppCore.tsx`](../../src/shared/services/AppCore.tsx) et une tâche de fond toutes les 12 h. Le
  client Aetherius doit donc être utilisable depuis un contexte sans écran — il l'est, mais aucun
  `confirm` ne doit se glisser dans ces Blueprints : personne n'écouterait, et la politique de délai
  refuserait.
- **Un run par groupe favori, ou un run pour tous ?** Aujourd'hui `federationIds[]` accepte plusieurs
  valeurs en une requête, et le planning agrégé s'en sert. Le Blueprint doit accepter une **liste**
  en entrée pour conserver ce comportement — le transformer en N requêtes multiplierait la charge sur
  un serveur universitaire, ce qui est le contraire du service à lui rendre.

## Définition de « terminé »

1. Les six Blueprints existent, sont publiés, et sont joués par les deux services.
2. `axios` et `qs` ont disparu de `PlanningApiService`, `CampusApiService` et `ScheduleList`.
3. Le cache, le bandeau daté et le repli hors ligne sont **inchangés**, vérifiés en mode avion.
4. La synchronisation calendrier et la tâche de fond fonctionnent, y compris application fermée.
5. `npm run parity` couvre les six appels, dont le planning agrégé multi-groupes, et il compare
   **l'encodage du corps** autant que la sortie.
6. La bascule sur `celcat.u-bordeaux.fr` est vérifiée sur appareil, en réseau mobile et en Wi-Fi.
7. `npx tsc --noEmit` et `npx eslint .` sans régression.
8. Documentation : [sources-externes.md](../sources-externes.md) réécrit pour Celcat (le relais y est
   noté comme sortant), [planning.md](../features/planning.md) et
   [campus-salles-libres.md](../features/campus-salles-libres.md) amendés, CHANGELOG.

## Plan de test

**Parité**, et c'est le jalon où elle porte le plus :

- un jour ordinaire, un jour de vacances, un jour sans cours ;
- une semaine complète, une semaine de vacances, une semaine à cheval sur deux mois ;
- le planning agrégé de deux et de trois groupes favoris ;
- la plage annuelle de synchronisation, sur les deux positions du basculement d'année scolaire ;
- la liste des groupes et la liste des salles, comparées **élément par élément** ;
- l'occupation des salles d'un bâtiment.

**Sur appareil** :

| Sonde | Attendu |
|---|---|
| Vue jour, vue semaine, nominal | identiques à avant, y compris les couleurs et les descriptions |
| Mode avion, jour déjà consulté | le cache s'affiche avec son bandeau daté |
| Mode avion, jour jamais consulté | état vide explicite, pas un plantage |
| Réseau qui coupe **pendant** le chargement | échec propre, repli sur cache si disponible |
| Changement de groupe favori | le planning agrégé suit, une seule requête |
| Simulation temporelle activée | les caches sont purgés comme avant ([qualite.md](../qualite.md)) |
| Synchronisation calendrier | les mêmes événements, aux mêmes dates, sans doublon |

La ligne « simulation temporelle » n'est pas décorative : `TimeMockService` purge les clés de cache à
chaque bascule, et c'est le seul moyen raisonnable de vérifier les autres lignes sans attendre le bon
jour.

## Limites écrites

- **Le serveur de l'université n'a aucun contrat.** Les constantes deviennent lisibles et
  corrigeables ; elles ne deviennent pas garanties. Un changement côté Celcat se traduira toujours
  par une réponse vide plutôt que par une erreur explicite — mais `expect` transforme au moins un
  statut inattendu en échec nommé.
- **Le refiltrage sur la date exacte reste applicatif**, donc une réponse qui déborde reste traitée
  après coup. C'est le comportement actuel, conservé volontairement.
- **Le relais reste allumé** à la fin du jalon, le temps d'observer. Son extinction est une décision
  de [6-H](6-h-livraison-finale.md), pas un oubli.
