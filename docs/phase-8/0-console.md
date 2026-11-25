# Lot 0 — La console

> **Livré le 2026-11-25**, publié sur https://kae-lab.github.io/UKit/ depuis `main` : le socle et les
> écrans (lot 0a), les statistiques et le tableau de bord (lot 0b), les finitions, la recette et les
> vérifications de 7-Z (lot 0c) — [ce qui a été fait](#ce-qui-a-été-fait), [la recette](#la-recette-du-2026-11-25).
> Ce qui reste est écrit dans les [limites](#limites-écrites).

> **Ouvert le 2026-11-24.** Aucune publication de l'application : la console se publie sur GitHub Pages
> à chaque poussée sur `main` qui touche `console/` ([README de la console](../../console/README.md)).
> Branche `feat/console-refonte`, fusionnée dans `main` à la livraison, puis `main` dans
> `prochaine-version`. Reprend [7-G](../phase-7/7-g-console-statistiques.md), dont la spécification
> reste la base des statistiques.

## La direction

La console a été construite en septembre avec une interface rudimentaire, sur le socle de
[7-E](../phase-7/7-e-console-socle.md) : elle marche, mais elle parle une autre langue que
l'application refaite en 7-J et que le site refait le 2026-11-18. L'accent y est encore le bleu du
système, le fond sombre un noir pur, les menus déroulants ceux du navigateur, et des encarts y
expliquent l'interface. La refonte lui donne la langue de UKit, et en fait un outil qu'on a plaisir
à ouvrir chaque jour, avant que l'équipe arrive en janvier.

- **Les valeurs viennent de l'application, pas d'une copie** : les couleurs de
  [`palettes.ts`](../../src/shared/theme/palettes.ts) et les échelles de
  [`tokens.ts`](../../src/shared/theme/tokens.ts) se posent en variables CSS au démarrage, comme
  l'aperçu des annonces le fait déjà. Le fond `#0B0B12` et les cartes `#15151E` en sombre, `#F2F2F7`
  et le blanc en clair, l'accent `#6381F8` / `#3B5FE5`, la police du système, des chiffres tabulaires.
- **Les deux thèmes**, celui du système par défaut, et une bascule mémorisée (système, clair, sombre).
- **Une teinte par domaine**, prise aux en-têtes d'onglet de l'application (`fondDOnglet`) : Suivre
  prend celle du Planning, Publier celle de Campus, l'équipe et le compte celle des Réglages. Elle
  colore l'en-tête de la page, rien d'autre.
- **Les composants de l'application** : les rangées groupées des Réglages, les intertitres en casse de
  phrase, les icônes Lucide au trait de 1,75, neutres ; la couleur réservée aux états et aux actions,
  jamais posée sur une donnée.
- **Pas de texte qui explique l'interface sous un contrôle** : ce qui doit être dit tient en un court
  paragraphe en tête de la page ; les états, les erreurs et les confirmations restent sur place.
- **Les chiffres d'abord**, sur le modèle de Plausible : une rangée de chiffres clés avec leur
  variation, une courbe, des listes à barres de fond. Le classique propre suffit pour un outil.

## Ce qui est à faire

### 1. Le socle

- Le module de thème : les variables CSS tirées de `src/shared/theme` pour les deux thèmes, la
  bascule, et la teinte de domaine. `console/src/styles/tokens.css` ne garde que ce qui n'existe pas
  dans l'application (largeurs de la barre latérale, de la colonne de lecture).
- Les composants de base, un par rôle : `Bouton` (plein, tonal, discret, destructif), les champs dont
  un `Select` de Base UI à la place du `<select>` natif, un contrôle segmenté, `Table`, `Carte`,
  `Rangee` et `Groupe`, `Pastille` d'état, les états (squelette, vide, erreur). Plus de `<button>` brut
  ni de `style={{` hors d'une valeur calculée.
- La structure : la barre latérale (Suivre, Publier, l'équipe et le compte), l'en-tête de page (grand
  titre resserré, filtre de campus dans le même contrôle que les autres), la version mobile.

### 2. Les écrans

Chaque écran se refait, dans les deux thèmes, et se coche à la livraison.

- [x] Connexion, première connexion
- [x] Tableau de bord
- [x] Statistiques : vue d'ensemble, annonces, sources, réglages, rapport partenaire (nouveaux)
- [x] Sources (la carte réservée aux échecs de `source.echec` se remplit)
- [x] Retours, fiche d'un retour, compteurs
- [x] Jetons push
- [x] Journal
- [x] Annonces : liste, éditeur, aperçu du téléphone, ordre du carrousel, point focal, galerie
- [x] Messages de service, testeurs, visuels, établissements, salutations, bâtiments, version publiée
- [x] Équipe et invitation, compte
- [x] Les états partagés : conflit d'écriture, garde de sortie, lecture seule, erreur de lecture,
  valeur inconnue, téléversement
- [x] Le menu mobile

### 3. Les statistiques

La spécification de [7-G](../phase-7/7-g-console-statistiques.md) tient telle quelle : quatre pages,
une période choisie une fois, les testeurs exclus par défaut, le rapport partenaire en CSV et en
impression, les agrégats calculés dans la console, aucune case sous cinq. Ce que ce lot y ajoute :

- **Recharts**, que 7-G prévoyait et qui n'est pas installé, chargé avec les seules pages de
  statistiques pour ne pas alourdir les autres.
- **Le calcul dans un module pur** (`console/src/stats/`), testé contre des lignes de `mesures`
  écrites à la main : c'est lui que le plan de test compare au SQL.
- **Le tableau de bord en tire sa rangée de chiffres clés** — parc actif, sessions de la semaine,
  ouvertures d'annonces, échecs de source —, chacun avec sa variation sur la semaine d'avant.

### 4. Les vérifications de 7-Z

L'egress du cycle en cours face au quota du Pro, les sauvegardes quotidiennes actives, les sondes
vertes ; et les échecs de connexion universitaire lus contre les sondes, maintenant qu'une page les
montre. Les constats vont dans [7-K](../phase-7/7-k-sortie-6-3.md) ou au registre, pas les chiffres
bruts, qui restent dans l'équipe ([mesure.md](../mesure.md#les-petites-cases)). **Faites le
2026-11-25** : [les constats](../phase-7/7-k-sortie-6-3.md#les-vérifications-de-7-z-le-2026-11-25).

## Décisions et pièges

- **Ce qui ne bouge pas** : le verrou contre l'écrasement et son dialogue de conflit
  ([`verrou.ts`](../../console/src/lib/verrou.ts)) ; les adresses qui portent l'état (`#/annonces/<clé>`,
  `?q=&page=&tri=&f.*=`), le retour arrière fidèle et le filtre de campus retenu ; Ctrl ou Cmd+S, la
  barre d'enregistrement, la garde de sortie ; les droits affichés et la lecture seule motivée
  ([`droits.ts`](../../console/src/auth/droits.ts)) ; l'adresse d'un retour réservée aux admins ; le
  secret montré une fois ; un chargement ou une erreur qui ne déplace jamais la mise en page ;
  l'aperçu fidèle par `src/shared` ; le déploiement sous `/UKit/` en routage par le fragment.
- **Une refonte, pas une réécriture** : la logique des pages, les requêtes et les droits restent ; ce
  qui change est le rendu et les composants. Une page dont la logique gêne le rendu se signale au
  registre plutôt que de se réécrire en passant.
- **`mesures` se lit par tranches** (`.range()`), sur la période choisie seulement ; `jetons_push`
  reste lu en entier tant que le parc se compte en milliers.
- **Le parc à notifications sous-compte** : la vue d'ensemble le dit une fois, en tête de page.
- **Le parc actif n'a pas de variation** : `jetons_push` ne garde que le dernier dépôt de chaque
  appareil, le parc d'une semaine passée ne s'y lit pas. Le tableau de bord pose à sa place la part
  de la 6.3 à côté des sessions ([`parc.ts`](../../console/src/stats/parc.ts)).
- **Une variation ne se compare qu'à une période comparable** ([`periode.ts`](../../console/src/stats/periode.ts)) :
  la période précédente doit commencer le 2 décembre 2026 ou après, deux semaines après la sortie de la
  6.3.1 sur les deux stores (18 novembre), le délai que 7-G donnait à la 6.3 avant que les courbes
  disent quelque chose. Avant, elle compte l'adoption, pas l'usage, et la console affichait des
  variations à quatre chiffres. Sinon un tiret, et l'en-tête des statistiques ne dit plus « comparée
  à ». Une date plutôt qu'un seuil sur les chiffres : un seuil cacherait aussi la vraie flambée
  d'échecs d'une source qui tombe.
- **Une semaine close bouge encore** : un téléphone envoie ses compteurs quand il passe en
  arrière-plan, parfois le lendemain. L'exactitude se juge contre une requête SQL jouée au même
  instant que la lecture de la console, jamais contre une ligne de base de la veille.
- **`mesures` se lit par semaines calées sur le lundi** ([`useMesures.ts`](../../console/src/requetes/useMesures.ts)),
  chacune en cache : la semaine du tableau de bord est celle de la vue d'ensemble.
- **Recharts se charge à part**, avec les statistiques et la courbe du tableau de bord : le paquet
  de départ ne grossit pas, la courbe arrive après les chiffres, à sa hauteur réservée.
- **Les petites cases, partout** ([`cases.ts`](../../console/src/stats/cases.ts)) : un compte de un à
  quatre devient « moins de 5 », zéro reste zéro. Le total se lit toujours à côté (un chiffre clé, une
  part) : tant qu'une petite case se retrouverait par différence, la plus petite case visible se cache
  aussi et se lit « masqué » (secret secondaire). Une case cachée se range par nom, jamais par compte ;
  un taux qui s'appuie sur elle ne s'écrit pas, et sous vingt au dénominateur un taux se lit grisé. La
  protection vaut tableau par tableau, et les tableaux de la page Annonces ne cachent que les petites
  cases : choisir une annonce redonne ses chiffres exacts, un secret secondaire n'y protégerait rien.
  Recouper deux tableaux en dirait plus ; c'est accepté dans la console, dont chaque éditeur peut lire
  `mesures` ligne à ligne, pas dans le rapport.
- **Le rapport partenaire, seul chiffre qui sort de l'équipe**, découpe le total par campus et par
  semaine sans les croiser : un croisement n'aurait presque que des petites cases, et ses deux totaux
  les redonneraient. Les petits campus y sont « campus regroupés » : « autres campus » se confondait
  avec l'« Autre campus » du catalogue.
- **Le rapport partenaire** s'exporte pour un tableur français (point-virgule, virgule décimale,
  indicateur d'ordre des octets) et s'imprime en thème clair, quel que soit celui de la console.

## Ce qui a été fait

- **Lot 0a, le socle et les écrans** : le thème tiré de `src/shared/theme`, les deux thèmes et la
  bascule, la teinte de domaine, les composants de base (Base UI pour le sélecteur, les dialogues, le
  menu), chaque écran de la liste refait.
- **Lot 0b, les statistiques** : le calcul pur de `src/stats/`, Recharts chargé à part, les quatre
  pages et le rapport partenaire, le tableau de bord sur le modèle de Plausible, la page Sources qui
  montre les échecs mesurés par l'application.
- **Lot 0c, les finitions** :
  - une variation ne se compare qu'à une période comparable (voir les décisions) ;
  - les listes tiennent dans leur largeur à 1 440 et 1 024 pixels, sur une ligne : le titre de la
    ligne prend la place qui reste et se tronque, un autre texte se tronque à une largeur bornée, une
    date de l'année se lit sans l'année ; ce qui n'a d'ordinaire rien à dire ne prend plus de colonne
    et devient un **repère** à côté du titre, seulement quand la valeur s'écarte du cas courant
    ([`reperes.ts`](../../console/src/composants/liste/reperes.ts)) : le type, l'épingle, l'audience et
    les campus d'une annonce, le ciblage d'un message, l'établissement inactif, les campus d'un
    rédacteur et son mot de passe provisoire ; une case fausse ne remplit plus une colonne de « non » ;
  - un court paragraphe en tête de page, le mode d'emploi d'une table sur sa page de détail ;
  - la barre latérale tient sans défiler à 1 440 × 900, et défile en barre fine plus bas ; les barres
    de défilement prennent les couleurs du thème ;
  - l'interrupteur (`Switch`) et la case (`Checkbox`) de Base UI à la place des cases du navigateur ;
    les champs de date et d'heure **restent natifs**, habillés aux couleurs du thème (contour, rayon,
    fond, `color-scheme` posé par le module de thème, qui donne au calendrier du navigateur le thème de
    la console) : un sélecteur de dates maison aurait coûté une dépendance pour un geste que le
    navigateur fait bien ;
  - `.pile` ne s'élargit plus à son contenu ; les compteurs et les semaines des Retours tiennent à
    1 024 pixels ; les logos des établissements se montrent entiers ; l'icône de « Réessayer » reprend
    sa taille dans une erreur de lecture.

## La recette du 2026-11-25

Jouée dans la console locale par un Chromium sans fenêtre, avec trois comptes jetables supprimés après
(un admin créé par `console:editeur`, un rédacteur borné invité par la page Équipe, un lecteur créé par
l'API d'administration), une annonce et un visuel de recette en audience « testeurs », supprimés après.

| Cas | Résultat |
|---|---|
| La bascule de thème suit le système, puis retient le choix après rechargement | passé |
| Une couleur changée dans `palettes.ts` change la console sans toucher `console/` | passé (accent changé puis rétabli) |
| Un conflit d'écriture à deux onglets : « Modifiée entre-temps », par qui et quand, « Recharger » | passé |
| Ctrl+S enregistre ; une valeur hors catalogue bloque l'enregistrement en la nommant | passé |
| La garde de sortie sur une saisie non enregistrée, Échap garde la saisie | passé |
| Une adresse filtrée (`?q=&f.audience=`) rouverte garde la recherche et le filtre | passé |
| La valeur inconnue : marquée en liste (repère) et dans le formulaire, « décoche-la » | passé |
| Le téléversement : réduit, en WebP, blurhash calculé, enregistré | passé |
| L'erreur de lecture : base coupée, l'erreur à la place des lignes, « Réessayer » relit | passé |
| L'invitation : le mot de passe provisoire montré une fois, la première connexion n'offre que le choix du mot de passe | passé |
| Le rédacteur borné : bandeau de ses campus, une annonce de tous les campus en lecture seule, la sienne modifiable, page Équipe refusée et absente du menu | passé |
| Le lecteur : « Lecture seule » et sa raison, boutons et champs inertes, page Équipe absente | passé |
| Le tableau de bord contre le SQL joué au même instant (sessions, ouvertures, échecs de la semaine) | passé, égalité exacte |
| Les largeurs : aucun défilement horizontal de la page à 1 440, 1 024 et 390 pixels ; aucune liste qui défile à 1 440 et 1 024 | passé ; à 390, une liste défile dans sa carte |

Les états partagés que le lot 0a avait cochés sans les voir (conflit, garde de sortie, lecture seule,
erreur de lecture, valeur inconnue, téléversement) ont été vus là, et leurs captures reprises dans
[`docs/screenshots/console/`](../screenshots/console/).

## Définition de « terminé »

- Chaque écran de la liste refait et coché, vérifié à 1 440, 1 024 et 390 pixels de large, dans les
  deux thèmes ; une planche avant et après pour chacun.
- Aucune couleur, taille ni rayon écrit en dur hors du module de thème ; plus de composant natif
  de formulaire visible.
- Les statistiques justes au plan de test de 7-G, et le module de calcul couvert par ses tests.
- Les portes : `npx tsc --noEmit`, `npx eslint .`, `npm test`, `npm --prefix console run build`.
- La console publiée depuis `main`, et le [guide de l'équipe](../guide-console.md) à jour de ce qui a
  changé pour qui publie.

## Plan de test

1. **Le socle** : la bascule de thème suit le système puis la mémorise ; une couleur changée dans
   `palettes.ts` change la console sans toucher `console/`.
2. **Ce qui ne bouge pas**, joué à la main : un conflit d'écriture à deux onglets, Ctrl+S, une sortie
   sur saisie non enregistrée, une adresse filtrée rouverte, un compte lecteur et un compte rédacteur.
3. **Les statistiques** : le plan de test de 7-G (l'exactitude contre le SQL, les petites cases, les
   testeurs, l'export).
4. **Les largeurs** : chaque écran à 390 pixels sans défilement horizontal de la page.

## Limites écrites

- **À 390 pixels, une liste défile dans sa carte** : ses colonnes ne se replient pas. La page, elle, ne
  défile jamais en largeur.
- **Aucune variation avant le 16 décembre 2026** sur la semaine du tableau de bord, et plus tard sur
  une période plus longue : la période d'avant doit commencer le 2 décembre ou après.
- **La planche avant et après** n'est pas dans le dépôt : les captures d'avant restent dans l'historique
  de git, celles d'après remplacent les anciennes sous le même nom.
- **Ce que la recette a relevé hors du lot** est au [registre](../defauts-fonctionnels.md) : les failles
  des dépendances de la console et les alertes Dependabot, `jetons_push` sans colonne unique lisible, la
  page Équipe blanche après une lecture des droits en échec, les sondes « du matin » qui passent
  l'après-midi, les refus de connexion universitaire que les sondes n'expliquent pas.

- **La console n'est pas une application mobile** : elle se lit sur un téléphone, elle s'utilise sur
  un ordinateur. La version mobile garde la lecture et les gestes courts.
- **Les pages de la 7.0** — modération, retours enrichis, événements, boîte à idées — ne sont pas dans
  ce lot ; elles arrivent avec les lots qui créent leurs données, sur ce socle.
