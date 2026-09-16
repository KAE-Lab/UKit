# Les campus

> **Ce dossier range les fiches des campus**, une par campus, ouvertes depuis le
> [modèle du kit](kit-d-adaptation.md#le-modèle-de-fiche), et le [kit d'adaptation](kit-d-adaptation.md)
> qui sert à collecter la moitié publique d'un campus. La méthode est celle
> d'[adaptation-campus.md](../adaptation-campus.md) ; le travail en cours, trois nouveaux campus, est le
> jalon [7-B](../phase-7/7-b-nouveaux-campus.md).

## Le principe

- **Un campus à la fois**, au rythme des comptes prêtés : chaque portail universitaire a des défauts que son
  voisin n'a pas — Bordeaux INP en a trouvé huit, sur appareil ([6-G](../phase-6/6-g-etablissements.md)).
- **Une ligne de catalogue par campus, même quand le portail est partagé.** La ligne est l'unité de
  ciblage, de source d'emploi du temps, de géographie et de trousseau ; les Blueprints, eux, se référencent
  par leur nom, donc un campus qui partage le portail de l'Université de Bordeaux nomme
  `ukit.portail.bordeaux.*` sans rien dupliquer. Décision du 2026-09-14.
- **Une fiche par campus** dans ce dossier, `<code>.md`, ouverte depuis le
  [modèle du kit](kit-d-adaptation.md#le-modèle-de-fiche), qui garde ce qui a été mesuré, ce qui a été
  écrit, et ce qui reste.
- **La moitié publique d'abord** — l'emploi du temps, les bâtiments, les bibliothèques, les restaurants, les
  liens des services —, qui se collecte sans compte et sans code ; puis la moitié authentifiée, sur le
  compte prêté.
- **Le code d'un campus se choisit une fois** : il partitionne le trousseau, les réglages et les favoris des
  étudiants, et le changer ensuite les déconnecterait tous.

## Comment se nomme un campus

> **Tranché le 2026-09-16**, au relevé public du lot 1 de
> [7-B](../phase-7/7-b-nouveaux-campus.md). La règle existe parce que son absence coûte cher : deux
> des neuf premières demandes de campus portaient sur un campus **déjà servi**, que son libellé
> rendait méconnaissable ([adaptation-campus.md](../adaptation-campus.md#ce-que-la-mesure-du-2026-09-06-a-établi)).

Le **libellé** d'une ligne de catalogue suit la nature de ce qu'elle décrit :

| Ce que la ligne décrit | Le nom | Exemple |
|---|---|---|
| une université ou une école à part | son **nom officiel court** | Bordeaux Montaigne |
| une composante d'une université | son **nom officiel** | IUT de Bordeaux |
| un **site** entier, qui porte plusieurs composantes | **« Campus »** suivi du lieu | Campus Victoire |

Et trois règles qui vont avec :

- **Les mots que tapent les étudiants vont dans `alias`**, jamais dans le nom : « la Vic », « Bordeaux
  3 », « fac de sciences ». Le nom reste celui de l'établissement, la recherche s'occupe du reste.
- **Le `nom_court` tient sur un bouton** — quinze caractères au plus. C'est lui qui s'affiche là où la
  place manque, et un nom tronqué y devient méconnaissable.
- **Le code, lui, ne se choisit qu'une fois** : il partitionne le trousseau, les réglages et les
  favoris, et le changer déconnecterait les étudiants de ce campus.

**Le cas Victoire est tranché, et il méritait de l'être.** La spécification laissait ouvert le choix
entre le nom d'un collège — si son emploi du temps suivait le Collège Sciences de l'Homme — et un nom
de site. Le relevé a montré qu'**aucun collège ne s'y réduit** : la place de la Victoire porte des
formations de psychologie, de sociologie, d'anthropologie, de STAPS et de santé, et **aucune** n'est
dans le Celcat de l'université. La ligne décrit donc **un lieu**, pas un collège : `Campus Victoire`.

## Ce qui exige une release

- **Un nouveau type de source d'emploi du temps** — ni Celcat, ni export iCalendar : le moteur sait jouer
  les deux, l'application sait afficher les deux, et un troisième demande du code.
- **Un campus embarqué dans le binaire** — son socle et les Blueprints de `BUNDLED` —, à la release qui suit
  sa publication, comme l'étape 9 d'[adaptation-campus.md](../adaptation-campus.md#9-à-la-release-suivante)
  le demande.

Tout le reste se publie.

## Qui fait quoi

| Geste | Qui |
|---|---|
| recruter un volontaire, lui faire lire la [page d'engagement](https://ukit-bordeaux.fr/engagement.html) | l'équipe |
| collecter la moitié publique, remplir la fiche | l'équipe, avec le [kit d'adaptation](kit-d-adaptation.md) |
| recevoir les identifiants prêtés | **le développeur seul**, jamais par un canal partagé |
| écrire et vérifier les Blueprints, publier, sonder, créditer | le développeur |

Jusqu'à l'arrivée de l'équipe, en janvier 2027, la collecte de la moitié publique se fait par le relevé
public et par le lot de chaque campus, dans le jalon [7-B](../phase-7/7-b-nouveaux-campus.md).
