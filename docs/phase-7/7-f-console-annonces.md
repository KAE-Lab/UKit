# 7-F — Les annonces dans la console

> **Spécification, ouverte le 2026-09-14, pas encore livrée.** Aucune publication. Le deuxième des quatre
> jalons de la console, sur le socle de [7-E](7-e-console-socle.md) : publier une annonce en voyant ce
> qu'elle donnera sur un téléphone. Il suit aussi les migrations de
> [7-C](7-c-economie-et-socle.md#6-les-colonnes-additives), qui donnent aux annonces leur type, leur
> cadrage, leur ordre et leur cycle de vie.

## La direction

Aujourd'hui, une annonce se publie en remplissant une vingtaine de champs, dont une description écrite
dans un mini-langage que seule l'aide d'un champ décrit, et un tableau JSON pour la galerie. On ne voit
le résultat qu'en publiant en audience `testeurs` et en ouvrant son téléphone. 7-F met le téléphone dans
la console : l'éditeur montre la carte, la fiche et l'ordre du carrousel pendant qu'on écrit. Le
téléphone reste la preuve ; la console devient l'endroit où l'on n'a plus à deviner.

## Préalable, côté application : deux modules purs partagés

Deux règles vivent dans l'application et doivent être **les mêmes** dans la console, sans quoi l'aperçu
mentirait :

- **la grammaire de la description** : le découpage du mini-langage de
  [`DescriptionAnnonce.tsx`](../../src/features/Campus/Bde/DescriptionAnnonce.tsx) — titres de section,
  icônes, puces, exergue, transition, signature, gras — sort dans un module pur,
  `src/shared/annonces/grammaire.ts`, qui rend un arbre. Le composant de l'application ne fait plus que
  le dessiner, et la console dessine le même arbre en HTML ;
- **l'ordre des annonces** : `src/shared/annonces/ordre.ts`, pur, que la
  6.3 ([7-I](7-i-releve-et-vocabulaire.md)) branche dans `BdeService` — les épinglées d'abord,
  puis le score de créneau et la priorité, puis une rotation déterministe par heure.

Ces deux modules sont **versionnés avec l'application**, testés par `npm test`, et importés par la
console par un chemin relatif. Deux conditions : n'importer aucun module de React Native — la règle des
modules purs du dépôt —, et que la construction de la console les résolve (l'`include` de
`console/tsconfig.json`, et l'accès au fichier par Vite en développement, `server.fs.allow`). Si la 6.3
n'a pas encore écrit `ordre.ts` quand 7-F s'ouvre, 7-F l'écrit, avec ses tests, et la 6.3 le branche.

## Ce qui est à faire

### L'éditeur

Une page propre à la table `annonces`, en deux colonnes : le formulaire à gauche, **l'aperçu à droite**,
qui suit la saisie.

**L'aperçu** montre, dans le thème clair ou sombre au choix :

- la **carte**, aux deux largeurs où elle vit — le carrousel du tableau de bord et la cellule de la
  grille —, dans son cadre 4:5 : l'image **couverte** autour de sa focale ou **contenue** sur son fond
  flou, le type et son badge, l'émetteur en kicker, le titre ;
- la **fiche** : le visuel au ratio borné entre 3:4 et 16:9, le chapeau, la description rendue par la
  grammaire partagée, la galerie, le bouton d'action ;
- les **cartes spéciales** d'un emplacement autre que les annonces, dans le carrousel qui les accueille.

**Le point focal se choisit sur l'image** : un clic pose `focale = {x, y}` en fractions, et l'aperçu
recadre aussitôt. « Couvrir » ou « contenir » est une bascule à côté.

**Les champs nouveaux** : le type ; les emplacements, en cases ; la priorité ; « épinglée » ; les
**créneaux**, par un petit éditeur de plages — des jours de la semaine, une heure de début, une heure de
fin ; le **statut**, et une programmation lisible (« publiée le 3 octobre à 11 h » quand `publiee_le` est
à venir) ; le partenaire — nom, logo téléversé, lien —, proposé quand le type est `partenaire` ou
`bon_plan` ; le blurhash, calculé au téléversement et jamais saisi.

**La description garde son mini-langage** — c'est lui qui laisse un BDE structurer son annonce sans
release —, dans un champ qui aide : une barre qui insère les marqueurs, et l'aperçu qui les rend. **La
galerie** se téléverse en plusieurs fichiers d'un coup et se réordonne par glisser-déposer, à la place
du tableau JSON.

### L'ordre vu à une heure donnée

Un panneau « Ordre du carrousel » : une heure, un jour, un campus, et l'option « appareil testeur ». Il
rend la liste des annonces **dans l'ordre où un téléphone les montrerait** à cet instant, par `ordre.ts`,
après le même ciblage que l'application ([`shared/ciblage/ciblage.ts`](../../src/shared/ciblage/ciblage.ts),
pur). C'est ce qui répond à « à 12 h 30, à Talence, mon annonce est-elle en tête ? » sans avoir un
téléphone à Talence à 12 h 30.

### Les gestes

- **Dupliquer** une annonce : le geste le plus fréquent d'une équipe de communication, qui refait la
  même affiche d'une semaine à l'autre.
- **Archiver** plutôt que supprimer : `statut = 'archivee'` retire l'annonce sans perdre sa trace ni
  ses chiffres ([7-G](7-g-console-statistiques.md)).
- **Voir sur mon téléphone** : passe l'audience à `testeurs` le temps de vérifier, et le dit en tête de
  l'éditeur tant que c'est le cas.

## Décisions et pièges

- **L'aperçu est une approximation, et il le dit** : un rendu web d'un écran React Native ne tombe pas
  au pixel près — police du système, ombres, arrondis. La vérification finale reste le téléphone, en
  audience `testeurs`.
- **La grammaire a une seule source.** Une console qui réécrirait son propre découpage finirait par
  afficher une fiche que l'application ne rend pas.
- **Les créneaux sont en heure de Paris**, comme toute l'application ; l'éditeur l'écrit à côté des
  heures.
- **Une annonce programmée est une annonce `publiee` dont `publiee_le` est à venir**, pas un quatrième
  statut : la politique de lecture de la base la cache jusqu'à son heure.

## Dépendances

[7-E](7-e-console-socle.md) ; les migrations de [7-C](7-c-economie-et-socle.md#6-les-colonnes-additives) ;
les deux modules partagés, ci-dessus.

## Plan de test

1. **L'aperçu fidèle.** Trois annonces réelles — une affiche 4:5, une affiche carrée, un visuel
   paysage —, composées dans l'éditeur, publiées en `testeurs`, comparées à l'aperçu sur l'iPhone et sur
   le Galaxy A8 : même recadrage, même texte, même ordre des sections.
2. **La focale.** Déplacer le point focal d'une affiche carrée couverte : le recadrage suit, dans
   l'aperçu puis sur le téléphone.
3. **L'ordre.** Deux annonces épinglées et deux avec des créneaux différents : le panneau rend l'ordre
   qu'un téléphone montre à l'heure dite, simulation de date du menu de développement à l'appui.
4. **La programmation.** Une annonce dont `publiee_le` est dans dix minutes : invisible, puis visible au
   premier retour au premier plan après son heure.
5. **La galerie.** Quatre images téléversées d'un coup, puis réordonnées : l'ordre de la fiche suit.

## Limites écrites

- **L'aperçu n'est pas le téléphone** : il ne remplace ni l'audience `testeurs` ni la recette sur les
  deux appareils.
- **Les cartes spéciales ne se rendent dans l'application qu'à partir de la 6.3** : avant, la console
  les compose sans effet, et le dit.
