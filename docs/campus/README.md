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
