# 7-F — Les annonces dans la console

> **Jalon livré le 2026-09-22** — les deux modules purs partagés, l'éditeur avec l'aperçu du téléphone,
> le point focal, les nouveaux champs, la galerie, le panneau « ordre du carrousel », les trois
> gestes, les tests, la documentation et les captures ; ouvert le 2026-09-22 sur la branche
> `feat/console-annonces`, depuis `main`. Le [plan de test](#plan-de-test) a été joué sur la console
> locale par un navigateur piloté (Playwright, 33 points), avec un compte jetable supprimé après ; ce
> qui se joue sur les deux appareils attend le propriétaire du produit, et ce qui demande la 6.3 est
> écrit en [limite](#limites-écrites). Ce que la réalité a corrigé du texte ci-dessous est dans
> [Ce que la réalité a corrigé](#ce-que-la-réalité-a-corrigé-le-2026-09-22), et **ce que l'aperçu
> dessine** de la carte v2 — que l'application ne rend pas encore — est la référence de
> [7-I](7-i-releve-et-vocabulaire.md) : [la carte v2, dessinée ici](#la-carte-v2-dessinée-ici).
>
> **Spécification, ouverte le 2026-09-14.** Aucune publication. Le deuxième des quatre
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
  [`src/shared/annonces/grammaire.ts`](../../src/shared/annonces/grammaire.ts), qui rend un arbre. Le
  composant de l'application ne fait plus que le dessiner, et la console dessine le même arbre en HTML ;
- **l'ordre des annonces** : [`src/shared/annonces/ordre.ts`](../../src/shared/annonces/ordre.ts), pur,
  que la 6.3 ([7-I](7-i-releve-et-vocabulaire.md)) branche dans `BdeService` — les épinglées d'abord,
  puis le score de créneau et la priorité, puis une rotation déterministe par heure.

Ces deux modules sont **versionnés avec l'application**, testés par `npm test`, et importés par la
console par un chemin relatif. Deux conditions : n'importer aucun module de React Native — la règle des
modules purs du dépôt —, et que la construction de la console les résolve (l'`include` de
`console/tsconfig.json`, et l'accès au fichier par Vite en développement, `server.fs.allow`). Si la 6.3
n'a pas encore écrit `ordre.ts` quand 7-F s'ouvre, 7-F l'écrit, avec ses tests, et la 6.3 le branche.

## Ce que la réalité a corrigé, le 2026-09-22

Les endroits où l'exécution a amendé le texte des sections suivantes — annoncés, jamais cachés.

**Les modules partagés.**

- **`ordre.ts` n'existait pas** : 7-F l'a écrit, avec onze tests. La rotation est précisée : à égalité
  d'épinglage, de créneau actif et de priorité, le groupe est trié par identifiant puis **tourné** de
  « l'heure courante modulo sa taille » — chaque annonce passe en tête à son tour, et deux appareils
  ou la console rendent le même ordre à la même heure, sans tirage au sort. Les **créneaux** sont
  précisés aussi : `jours` en ISO (1 = lundi, 7 = dimanche), heures `HH:MM` **de Paris**, début inclus,
  fin exclue, une plage qui passe minuit (`22:00` → `02:00`) acceptée. L'heure de Paris se lit par
  `Intl.DateTimeFormat` avec son fuseau, l'heure locale de l'appareil en repli — **à vérifier sur
  Hermes** quand [7-I](7-i-releve-et-vocabulaire.md) branche le module.
- **Un troisième module pur est sorti de l'application, et il n'était pas prévu** :
  [`src/shared/theme/palettes.ts`](../../src/shared/theme/palettes.ts), les couleurs de base des deux
  thèmes (fond, carte, gris, texte, accent, filets, `sectionsHeaders`), que `Theme.ts` étale — le même
  geste que `tokens.ts` en 6-K, pour la même raison : `Theme.ts` importe `react-native`, et l'aperçu ne
  peut pas dériver du thème. Décidé avec le propriétaire du produit à l'ouverture, contre la copie des
  douze valeurs dans la console.
- **La console compile les modules qu'elle importe sous `strict` et `noUncheckedIndexedAccess`** :
  `versions.ts` et `rendu.ts`, purs et déjà importables, avaient deux indexations que le typage relâché
  de la racine laissait passer. Corrigées dans l'application, typage seul, aucun comportement.
- **`AnnonceRow` n'avait jamais reçu les colonnes de 7-C** — la règle « types relus dans le même commit
  que le schéma » n'avait pas été suivie. Ajoutées, additives ; `BdeService.COLONNES` ne change pas.
- **Les icônes sont les mêmes des deux côtés** : la police MaterialCommunityIcons embarquée par
  l'application (7 448 glyphes) est la 7.4.47, exactement `@mdi/font@7.4.47` sur npm. La console la
  charge **avec l'aperçu**, jamais avant : la liste des annonces ne l'attend pas.

**L'éditeur.**

- **Aucune migration** : toutes les colonnes existaient depuis 7-C, la politique de lecture et le
  journal aussi. Le jalon n'a écrit aucune ligne de SQL.
- **L'éditeur n'est pas une page à part** : la page générique
  ([`Ressource.tsx`](../../console/src/pages/Ressource.tsx)) se **complète** — des boutons en tête, un
  aperçu à côté du formulaire, un encart au-dessus d'une ligne — et le formulaire générique gagne quatre
  capacités, décidées à l'ouverture : des **groupes** de champs (`groupe` sur un champ, rendus en
  `fieldset`), une colonne d'**aperçu** collante qui reçoit la ligne en cours de saisie, une **action
  qui rend une ligne** — la copie que « Dupliquer » ouvre —, et des **actions inertes tant que le
  formulaire est modifié** : elles agissent sur la ligne enregistrée, pas sur l'écran, et « Notifier »
  un message y gagne la même garde. Une cinquième, trouvée à la recette : **la phrase d'une écriture
  qui change l'adresse voyage avec la navigation**. « Enregistré. » d'une ligne neuve et « Copie
  créée » d'un dupliqué disparaissaient avec le formulaire qui remonte à sa nouvelle adresse — depuis
  7-E pour la première. La page porte le retour pour l'adresse qui vient d'être ouverte, et le
  formulaire remonté le montre.
- **Cinq types de champ nouveaux** dans le vocabulaire des descripteurs, chacun avec son schéma zod,
  sa saisie inverse et son résumé en une ligne pour les listes : `description` (la zone et sa barre de
  marqueurs), `focale` (le clic sur l'image, les flèches au clavier, la bascule couvrir/contenir qui
  pose la colonne sœur `ajustement`, gardée cachée), `creneaux`, `galerie` (plusieurs fichiers d'un
  coup, chacun par le pipeline de 7-E, réordonnés par `@dnd-kit` — à la souris et au clavier, la
  console se parcourt entière au clavier) et `partenaire` (nom, logo, lien ; tout vide vaut nul).
  Les `cases` gagnent `auMoinsUne` : `emplacements` est `not null` en base et ne connaît pas
  « toutes ».
- **Le logo d'un partenaire** va dans `partenaires/` du bucket, à 400 px sur le grand côté, dans les
  deux tables de largeur (`compression.ts`, `tools/media/plan.mjs`).
- **Le badge du type ne s'affiche pas pour un événement** : c'est la norme, et une étiquette sur chaque
  carte serait le « bruit répété » que la règle des listes interdit. Les trois autres types portent
  le leur ; un partenaire y met son logo.
- **« Supprimer » reste**, à côté d'« Archiver » : c'est [7-H](7-h-console-roles.md) qui décide qui
  peut quoi, et sa confirmation dit déjà que l'archive garde la trace.
- **Le panneau d'ordre demande la version à la main** (vide : aucune borne), plutôt que de lire
  `app_release` — une ligne que « rien ne lit encore dans l'application ».

## La carte v2, dessinée ici

L'application rend encore la carte du 2026-08-30 (1:1, jamais recadrée) ; la carte v2 est décidée
pour la 6.3 ([7-I](7-i-releve-et-vocabulaire.md)) et n'était dessinée nulle part. L'aperçu de la console
la dessine en premier, avec les mesures relevées dans les composants React Native, et **c'est lui la
référence** que 7-I reproduit ([`apercu/Carte.tsx`](../../console/src/pages/Annonces/apercu/Carte.tsx),
[`apercu.css`](../../console/src/styles/apercu.css)) :

- **le cadre est 4:5**, dans la surface de carte (`cardBackground`, `radius.xl`, `shadow.md`) ; par
  défaut l'image **couvre** le cadre, recadrée autour de la **focale** (`object-position` en fractions,
  `{ x: 0.5, y: 0.3 }` par défaut) ; « **contenir** » montre l'image entière sur une copie floutée
  d'elle-même (flou 16) — l'ancienne règle, gardée par ligne pour les affiches déjà composées ;
- **le badge du type**, en haut à gauche de l'image : un carré arrondi (`radius.sm`) sur le fond de
  carte, le libellé en petites capitales 11/600 dans la teinte d'identité de l'annonce, l'ombre `md` ;
  **rien pour un événement**, la norme ne s'étiquette pas ; le logo du partenaire, 16 px, devant le
  libellé « Partenaire » ou « Bon plan » ;
- **le pied** ne change pas : l'émetteur en kicker (12/600, capitales, `fontSecondary`), le titre
  (16/700), une ligne chacun ;
- **sans visuel**, l'accroche fait l'affiche, en grand dans la teinte, sur le fond teinté à 8 % ; sans
  accroche non plus, le pictogramme teinté ;
- **un seul gabarit, deux largeurs** : 60 % de l'écran dans le carrousel, la moitié de l'écran moins
  la gouttière dans la grille ;
- **une carte spéciale** est cette même carte, dans le carrousel de l'emplacement coché, à la hauteur
  de ses voisines — l'aperçu la montre entre deux voisines sans contenu.

La fiche, elle, ne change pas de dessin : l'aperçu reproduit celle de l'application (visuel au ratio
borné entre 3:4 et 16:9, kicker, titre 28/700, chapeau en `fontSecondary`, la description par la
grammaire partagée, la galerie, le bouton flottant).

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

*Livré tel quel ; la programmation lisible est la pastille d'état en tête de l'aperçu — « Programmée,
publiée le 3 octobre à 11 h » —, calculée sur la saisie en cours, pas seulement sur la ligne
enregistrée ([`etat.ts`](../../console/src/pages/Annonces/etat.ts), pur).*

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

*Livré à `#/annonces/ordre`, avec la plateforme et la version en plus ; la visibilité est celle de la
politique de lecture, le ciblage celui de l'application, l'ordre celui du module partagé
([`visibles.ts`](../../console/src/pages/Annonces/visibles.ts), pur).*

### Les gestes

- **Dupliquer** une annonce : le geste le plus fréquent d'une équipe de communication, qui refait la
  même affiche d'une semaine à l'autre. *Livré : une copie en `brouillon`, titre suffixé « (copie) »,
  ouverte aussitôt — elle ne part pas en ligne avant d'être relue.*
- **Archiver** plutôt que supprimer : `statut = 'archivee'` retire l'annonce sans perdre sa trace ni
  ses chiffres ([7-G](7-g-console-statistiques.md)).
- **Voir sur mon téléphone** : passe l'audience à `testeurs` le temps de vérifier, et le dit en tête de
  l'éditeur tant que c'est le cas. *Livré avec le geste inverse, « Rendre à tout le monde ».*

## Décisions et pièges

- **L'aperçu est une approximation, et il le dit** : un rendu web d'un écran React Native ne tombe pas
  au pixel près — police du système, ombres, arrondis. La vérification finale reste le téléphone, en
  audience `testeurs`. *Et il dit aussi que la carte 4:5 qu'il dessine est celle que la 6.3 rendra.*
- **La grammaire a une seule source.** Une console qui réécrirait son propre découpage finirait par
  afficher une fiche que l'application ne rend pas.
- **Les créneaux sont en heure de Paris**, comme toute l'application ; l'éditeur l'écrit à côté des
  heures.
- **Une annonce programmée est une annonce `publiee` dont `publiee_le` est à venir**, pas un quatrième
  statut : la politique de lecture de la base la cache jusqu'à son heure.
- **Un formulaire d'une ligne neuve remonte à son adresse** : ce qui doit survivre à ce remontage — la
  phrase du geste — passe par la page, pas par l'état du formulaire.
- **Un `tbody` squelette ne se pose que dans une table** : trouvé à la recette sur le panneau d'ordre,
  qui empile des blocs.

## Dépendances

[7-E](7-e-console-socle.md) ; les migrations de [7-C](7-c-economie-et-socle.md#6-les-colonnes-additives) ;
les deux modules partagés, ci-dessus.

## Plan de test

*Joué le 2026-09-22 sur la console locale par un navigateur piloté (Playwright, Chromium 1280 px), avec
un compte jetable `recette.editeur.7f`, supprimé après avec ses lignes et ses objets — 33 points, tous
verts, aucune erreur de console. Ce qui a été mesuré :*

1. *Une annonce composée dans l'éditeur (bon plan, couleur 2, description avec titre iconé,
   trois niveaux de puces, exergue, transition, signature) : l'aperçu rend la section « Programme »
   avec l'icône `calendar-check`, la signature efface la marque de fin, le badge dit « Bon plan » ;
   l'affiche 4:5 téléversée pèse 14 Ko en WebP, blurhash calculé ; le thème sombre passe le fond du
   téléphone au noir.*
2. *La focale : un clic à 80 % / 90 % de l'image déplace l'`object-position` de l'aperçu de
   `50% 30%` à `80% 90%` ; « contenir » montre la copie floutée et l'image entière ; la base reçoit
   `{ x: 0.797, y: 0.898 }`.*
3. *L'ordre : deux épinglées et deux à créneaux (11 h–14 h, 18 h–23 h, priorité 1), un lundi à 12 h 30,
   campus Bordeaux, iOS 6.3.0 : les épinglées, puis « midi », puis « soir » ; à 13 h 30 les deux
   épinglées ont tourné ; à 19 h « soir » passe devant « midi ». Mêmes valeurs que `ordre.test.ts`.*
4. *La programmation : `publiee_le` à +10 min, la pastille dit « Programmée, publiée le 22 septembre
   à 22 h 32 », l'API anonyme ne rend pas la ligne ; `publiee_le` à −1 min, elle la rend.*
5. *La galerie : quatre images d'un coup, quatre objets distincts nommés par le pipeline de 7-E ;
   réordonnées au clavier (espace, flèche, espace) : `1,2,3,4` → `2,1,3,4`, et la fiche de l'aperçu
   suit ; la ligne enregistrée porte l'ordre.*
6. *Les gestes : inertes sur un formulaire modifié ; « Voir sur mon téléphone » écrit `testeurs` et
   l'encart paraît ; « Rendre à tout le monde » ; « Dupliquer » ouvre une copie en brouillon avec ses
   quatre images ; « Archiver » pose le statut ; le journal porte six entrées au nom du compte.*

*Ce qui reste à jouer sur les deux appareils, par le propriétaire du produit : les points 1, 4 et 5
ci-dessous ; les points 2 et 3 se ferment en [7-I](7-i-releve-et-vocabulaire.md).*

1. **L'aperçu fidèle.** Trois annonces réelles — une affiche 4:5, une affiche carrée, un visuel
   paysage —, composées dans l'éditeur, publiées en `testeurs`, comparées à l'aperçu sur l'iPhone et sur
   le Galaxy A8 : même recadrage, même texte, même ordre des sections. *Avant la 6.3 : même texte et
   même ordre des sections ; le recadrage, c'est 7-I.*
2. **La focale.** Déplacer le point focal d'une affiche carrée couverte : le recadrage suit, dans
   l'aperçu puis sur le téléphone. *Dans l'aperçu : vérifié ; sur le téléphone : 7-I.*
3. **L'ordre.** Deux annonces épinglées et deux avec des créneaux différents : le panneau rend l'ordre
   qu'un téléphone montre à l'heure dite, simulation de date du menu de développement à l'appui.
   *Dans la console et par les tests purs : vérifié ; contre le téléphone : 7-I, qui branche le module.*
4. **La programmation.** Une annonce dont `publiee_le` est dans dix minutes : invisible, puis visible au
   premier retour au premier plan après son heure. *Par l'API anonyme : vérifié ; sur l'appareil : à
   jouer.*
5. **La galerie.** Quatre images téléversées d'un coup, puis réordonnées : l'ordre de la fiche suit.
   *Dans l'aperçu et en base : vérifié ; sur l'appareil : à jouer.*

## Limites écrites

- **L'aperçu n'est pas le téléphone** : il ne remplace ni l'audience `testeurs` ni la recette sur les
  deux appareils.
- **La carte v2, la focale, les cartes spéciales et l'ordre ne se rendent dans l'application qu'à
  partir de la 6.3** ([7-I](7-i-releve-et-vocabulaire.md)) : avant, la console les compose sans effet,
  et le dit — l'aperçu, le panneau d'ordre et l'aide des champs le rappellent. Le téléphone
  d'aujourd'hui montre l'affiche 1:1 entière, triée par date de publication.
- **La lecture de l'heure de Paris par `Intl` sur Hermes** se vérifie sur appareil en 7-I ; le repli
  est l'heure locale, celle de Bordeaux.
- **Un rédacteur borné à ses campus** ([7-H](7-h-console-roles.md)) écrit encore comme un admin : les
  politiques par rôle ne sont pas posées, l'éditeur ne fait qu'y laisser la place (la lecture seule
  d'un compte sans droits est respectée).
- **Le dernier enregistrement gagne**, toujours : le verrou contre l'écrasement est en 7-H.
