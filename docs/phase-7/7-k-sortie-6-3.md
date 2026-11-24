# 7-K — Sortie de la 6.3

> **Cadre.** Publication : **6.3**. Le contenu exact dépend de ce que [7-I](7-i-releve-et-vocabulaire.md)
> relève et de ce que [7-J](7-j-ecrans.md) reprend.

> **Sortie en 6.3.1, en ligne sur les deux stores au 2026-11-18**, par [la prochaine version](../prochaine-version.md) plutôt que par
> le protocole ci-dessous. Ce qui en a été tenu et ce qui ne l'a pas été :
> [la sortie telle qu'elle s'est faite](#la-sortie-telle-quelle-sest-faite).

## Ce qui sort

La version **6.3**, « le mouvement de l'interface » : le relevé, le vocabulaire, l'écran fondateur,
et les lots de [7-J](7-j-ecrans.md) qui auront été livrés.

## Le protocole

Celui de [6.1-Z](../phase-6/6-1-z-sortie.md). Deux points propres à une version visuelle :

1. **Le relevé de 7-I est la liste de contrôle de sortie.** Chaque ligne se coche ou s'explique.
   C'est ce qui remplace, pour une version qui se juge à l'œil, les portes automatiques des autres.
   *Ajouté le 2026-09-14, amendé le 2026-09-21 :* la sortie compare le **relevé final au relevé
   initial**, et **pose les premiers chiffres** — sessions, onglets vus, ouvertures, échecs de source,
   parts des thèmes — comme ligne de base de la suite : la mesure part dans la 6.3 elle-même, il n'y a
   pas de chiffres d'avant la refonte.
2. **Les captures de [screenshots/](../screenshots/) se refont** pour tout écran repris, **dans les
   deux thèmes** — décision du 2026-09-14, les deux thèmes à égalité —, et les écrans de référence
   de 6-K se comparent aux anciennes — c'est le seul moyen de voir ce qui a bougé sans qu'on l'ait
   décidé.
3. **Les visuels et les captures des stores se refont avec l'équipe**, textes « Quoi de neuf »
   compris — c'est de la communication, et c'est la première sortie qu'elle accompagne (ajouté le
   2026-09-14).

## La sortie, telle qu'elle s'est faite

[La prochaine version](../prochaine-version.md), ouverte le 2026-11-10, a remplacé ce protocole par
trois lots en série — zéro défaut, petites fonctions, deux campus —, un audit par parcours au banc
Android et un passage sur iPhone. La 6.3.0, numérotée le 14 et construite le 16, n'a jamais été
publiée : la **6.3.1**, le même contenu plus le texte coupé d'Android, est en ligne sur les deux stores
au **2026-11-18**. La **6.3.2**, le correctif de la carte du cours en cours, est envoyée le 2026-11-24 :
en ligne sur Android le jour même, en examen chez Apple ([CHANGELOG](../../CHANGELOG.md)).

| Point du protocole | Ce qui s'est fait |
|---|---|
| Le protocole de [6.1-Z](../phase-6/6-1-z-sortie.md) | remplacé par celui de la prochaine version, pas rejoué point par point |
| 1. Le relevé final contre le relevé initial | **pas fait.** L'audit par parcours a tenu lieu de liste de sortie ; le relevé de [l'inventaire du mouvement](../inventaire-mouvement.md) n'a pas été rejoué. À faire, ou à abandonner en l'écrivant ici |
| 1, second volet : les premiers chiffres de la mesure | posés le 2026-11-24, gardés hors du dépôt : [la ligne de base](#la-ligne-de-base) |
| 2. Les captures de l'application, dans les deux thèmes | reprises sur la 6.3.1 le 2026-11-17 ([screenshots/](../screenshots/README.md)) ; la confirmation du changement d'établissement reste à prendre |
| 2, second volet : les écrans de référence de 6-K comparés aux anciens | **pas fait** |
| 3. Les visuels des stores, « Quoi de neuf » | faits sans l'équipe, qui arrive en janvier : cinq captures de l'App Store le 2026-11-17, les textes de la 6.3.1 et de la 6.3.2 |
| Les fiches des stores ([7-D](7-d-la-mesure.md)) | *Data safety* enregistrée le 2026-11-16 et partie en examen avec la 6.3.1 ; *App Privacy* remplie par le propriétaire avant la sortie, son contenu n'a pas été relu depuis |

## La ligne de base

Posée le 2026-11-24, sur la semaine du mardi 17 au lundi 23 novembre 2026, appareils testeurs exclus,
avec les requêtes de [mesure.md](../mesure.md#lire-les-chiffres). **Ses chiffres ne sont pas ici** : le
dépôt est public, et une lecture faite à la main ne sort pas de l'équipe
([les petites cases](../mesure.md#les-petites-cases)). Le propriétaire la garde hors du dépôt ; la
console la rendra lisible à l'équipe en [7-G](7-g-console-statistiques.md). Le seul chiffre public est
celui de `parc_actif_arrondi()` : **plus de 2 100 appareils actifs** fin novembre.

## Ce qui vient après

La 6.4, **la boucle** ([7-L](7-l-la-boucle.md)) : le formulaire natif, les annonces en notification, le
partage, les pages du site dans l'application, et les sujets reportés — notes et résultats, compléments du
portail Bordeaux INP, calendrier externe dans le Planning, onglets natifs et typage de `Theme.ts` —, à
trancher à l'ouverture. La mise en avant des annonces par créneaux n'y attend plus : ses paramètres
entrent en base avec [7-C](7-c-economie-et-socle.md), et l'ordre est rendu par l'application dès
[7-I](7-i-releve-et-vocabulaire.md).

## Limites écrites

- **Une version visuelle n'a pas de critère d'arrêt naturel.** Le relevé en tient lieu ; sans lui,
  elle ne se termine que par lassitude.
