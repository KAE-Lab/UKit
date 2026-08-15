# 6-E — Act I : le planning

> La source la plus critique de l'application, la seule qui doit survivre hors ligne, et celle dont
> le port retire un serveur de l'architecture.

> **Jalon livré.** Ce document a été amendé à la livraison : ce qui suit décrit ce qui est en place.
> Les endroits où la réalité a corrigé la spécification sont rassemblés dans
> [« Écarts constatés à l'implémentation »](#écarts-constatés-à-limplémentation) — il y en a cinq, et
> l'un d'eux invalide une affirmation de ce document. Ce qui n'a pas pu être vérifié est écrit aussi,
> plutôt que coché.

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

> **Mesuré le 2026-08-09, avant d'écrire une ligne.** Le serveur ne filtre **ni sur `Origin`, ni sur
> `Referer`, ni sur l'`User-Agent`** : les trois envoyés faux ou vides, la réponse reste `200`. Il
> répond en 0,6 s sur une liste et 2,3 s pour une année entière (216 Ko, 334 événements), et accepte
> `federationIds[]` répété.
>
> **Et le relais était déjà tombé.** Trois sondes, trois **522 (Cloudflare)** après vingt secondes. Le
> planning des utilisateurs sans cache était donc en panne : ce jalon est autant une réparation
> qu'une migration. C'est aussi ce qui a décidé de la forme du harnais de parité — voir
> « Écarts constatés » plus bas.

Le relais n'est **pas éteint** au terme du jalon. Il l'est en [6-Z](6-z-livraison-finale.md), après
une période d'observation, et pas avant que la dernière version qui en dépend soit sortie du parc.
Son extinction est désormais une formalité : il ne répond plus.

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
| Source injoignable, jour déjà consulté | le cache s'affiche avec son bandeau daté |
| Source injoignable, jour jamais consulté | échec nommé et bouton Réessayer, pas un indicateur qui tourne |
| Statut inattendu (`expect` à 418) | écran **différent** du précédent, sans bouton Réessayer |
| Changement de groupe favori | le planning agrégé suit, une seule requête |
| Simulation temporelle activée | les caches sont purgés comme avant ([qualite.md](../qualite.md)) |
| Synchronisation calendrier | les mêmes événements, aux mêmes dates, sans doublon |

**Comment casser la source sans couper le réseau.** Les trois sondes dégradées se jouent en éditant le
Blueprint **embarqué** — `vars.domaine` sur un hôte injoignable, puis `expect.status` à `418`, puis
`params.resType` à une valeur absurde — et en rechargeant Metro. Vingt secondes par aller-retour, rien
n'est publié, le bucket n'est jamais touché. Le mode avion n'apporterait qu'une chose de plus : la
branche `isConnected()` fausse, que ce jalon ne modifie pas — elle décide **avant** que le service
soit appelé.

La ligne « simulation temporelle » n'est pas décorative : `TimeMockService` purge les clés de cache à
chaque bascule, et c'est le seul moyen raisonnable de vérifier les autres lignes sans attendre le bon
jour.

## Ce que la vérification sur appareil a établi

Jouée sur iPhone via Expo Go, le 2026-08-09, avec deux groupes favoris. Les chemins dégradés ont été
obtenus en cassant le Blueprint **embarqué** et en rechargeant Metro — pas en coupant le réseau : plus
rapide, reproductible, et le bucket n'a jamais été touché.

| Sonde | Résultat |
|---|---|
| Vue jour, vue semaine, planning agrégé, fiche de cours, calendrier système, simulation temporelle | **identiques à avant** |
| `vars.domaine` injoignable, jour déjà consulté | cache servi, bandeau daté |
| `vars.domaine` injoignable, jour jamais consulté | « Service indisponible » **avec** Réessayer — là où l'indicateur tournait indéfiniment |
| Bouton Réessayer | rejoue réellement, une ligne `unavailable` par tentative |
| `expect.status` à 418, jour jamais consulté | « Réponse inattendue », **sans** Réessayer |
| `expect.status` à 418, jour déjà consulté | cache servi : un échec n'écrase pas une donnée qu'on a |
| `resType` à 999 sur les groupes | Toast « Contenu introuvable », liste servie par le cache, bandeau daté |

**Les trois familles produisent trois écrans différents**, ce qui est la seule mesure qui compte ici.
Un détail non anticipé mérite d'être noté : `resType=999` ne rend pas une liste vide mais un **corps
vide avec un statut 200**, rangé en `data` (« la réponse n'est plus lisible ») et non en `rejected`.
La distinction est juste, et elle n'aurait pas été devinée depuis un bureau.

### Ce qui n'a pas été vérifié, et ce qui le couvre en attendant

Trois points de ce plan de test n'ont pas été observés sur appareil. Ils sont écrits ici plutôt que
cochés : un critère qu'on déclare vert sans l'avoir vu est pire qu'un critère ouvert, parce que
personne ne le rouvrira.

| Non vérifié | Pourquoi | Ce qui le couvre en attendant |
|---|---|---|
| **La tâche de fond, application fermée** (point 4 de la définition de terminé) | demande de laisser l'appareil une nuit, ou de déclencher `BackgroundFetch` depuis Xcode | la synchronisation **manuelle** a été jouée et est correcte, sans doublon. Les deux chemins appellent le même objet de service : seul l'appel réseau au milieu a changé, et il est prouvé par ailleurs |
| **Le réseau Wi-Fi** (point 6) | les trois captures ont été prises en **4G** ; le réseau mobile est donc prouvé, pas le Wi-Fi | rien de la bascule ne dépend du transport : le serveur ne filtre sur aucun en-tête, et le relais qui aurait pu se comporter différemment n'est plus dans le chemin |
| **Les créneaux de salles libres** | hors période universitaire le bâtiment est fermé pour de vrai | le cas de parité `celcat-occupation` sur données réelles — journée ordinaire **et** journée de vacances — et [`CampusApiMapping.test.ts`](../../src/features/Campus/services/CampusApiMapping.test.ts). Simuler un mardi de novembre rouvre désormais le bâtiment, la sonde est donc rejouable |

Les deux premiers se lèvent en quelques minutes le jour où l'occasion se présente. Le troisième s'est
levé de lui-même : le mock temporel atteint désormais ce hook.

## Écarts constatés à l'implémentation

Cinq points où le terrain a contredit ce document. Ils sont écrits ici plutôt que corrigés en
silence : la spécification a eu tort, et savoir *où* vaut mieux que la relire comme si elle avait eu
raison partout.

1. **« Les mêmes octets que `qs.stringify` » est faux, et sans conséquence.** `qs` sort en RFC3986
   (une espace devient `%20`), l'encodeur du moteur reproduit `quote_plus` de Python (une espace
   devient `+`). Partout ailleurs les deux coïncident au caractère près, `!'()*~` compris — or les
   identifiants de salles portent des espaces (`CREMI - Bât. A28 Salle 005`). Les deux formes ont été
   postées au serveur réel : même statut, même réponse au SHA-256 près. Le harnais compare le corps
   **réellement émis** — un `fetch` espion, pas une réimplémentation — en normalisant cet écart et lui
   seul ([tools/parity/README.md](../../tools/parity/README.md)).
2. **Le harnais fait viser Celcat aux deux chemins.** Le relais étant mort, l'y pointer rendrait six
   cas rouges en permanence pour une raison qui n'est pas celle qu'on veut mesurer. Ce que la parité
   isole reste ce que la migration change : l'encodage du moteur contre `qs`, l'extraction déclarative
   contre le parsing à la main. Que la bascule d'hôte fonctionne est établi par la mesure directe.
3. **La semaine se termine à `add_days(6)`, pas `add_days(7)`.** Le code d'origine envoyait
   `endOf('week')`, soit le dimanche. Élargir la fenêtre d'un jour n'aurait rien changé à l'écran —
   les jours ISO 7 sont écartés ensuite — mais aurait été un changement non demandé sur la source la
   plus critique.
4. **Le filtre `Vacances` n'est descendu dans aucun Blueprint**, comme ce document le demandait — et
   pour une raison de plus que celle écrite : la recherche de salles libres en a *besoin*. Ce sont les
   événements de vacances qui déclarent un bâtiment fermé.
5. **Le séparateur de description : la justification était fausse.** Ce document, et
   [features/planning.md](../features/planning.md), affirmaient que « le serveur ne formate pas la
   description de la même façon selon `calView` ». Mesure faite : le format est **identique** dans les
   deux vues, et la conséquence du séparateur `\n` est que la vue semaine n'affiche **aucune**
   description. C'est le comportement de l'application depuis toujours. Il est conservé et verrouillé
   par un test ; le corriger est une décision produit, pas une correction de migration.

## Limites écrites

- **Le serveur de l'université n'a aucun contrat.** Les constantes deviennent lisibles et
  corrigeables ; elles ne deviennent pas garanties. Un changement côté Celcat se traduira toujours
  par une réponse vide plutôt que par une erreur explicite — mais `expect` transforme au moins un
  statut inattendu en échec nommé.
- **Le refiltrage sur la date exacte reste applicatif**, donc une réponse qui déborde reste traitée
  après coup. C'est le comportement actuel, conservé volontairement.
- **Le relais reste allumé** à la fin du jalon, le temps d'observer. Son extinction est une décision
  de [6-Z](6-z-livraison-finale.md), pas un oubli — mais il ne répond déjà plus.
- **Un `modules: []` retomberait sur la catégorie**, là où le code d'origine rendait un sujet
  indéfini. Après extraction, `[]` et `null` sont indistinguables. Le cas n'existe dans aucune des 334
  entrées d'une année interrogée, et le sujet indéfini s'affichait de toute façon vide.
- **La vue semaine n'affiche aucune description**, et c'est le comportement d'origine (voir les écarts
  constatés). Le jalon ne le corrige pas.
