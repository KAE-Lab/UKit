# 7-B — Trois nouveaux campus

> **Spécification, ouverte le 2026-09-14, pas encore livrée.** Aucune publication : un campus se publie en
> données, et la publication de l'application qui suit l'embarque. Quatre lots : le relevé public des
> trois campus, puis un lot par campus. La méthode est celle
> d'[adaptation-campus.md](../adaptation-campus.md), qui reste le document de référence ; les fiches des
> campus se rangent dans [campus/](../campus/README.md).
>
> **Décalé le 2026-09-16 :** le lot 1, le relevé public, s'ouvre quand on veut ; **les lots 2 à 4, ceux
> qui publient un campus, passent après la sortie de la 6.3** ([7-K](7-k-sortie-6-3.md)), quand
> l'application sait les accueillir. Les comptes prêtés ne sont pas encore réunis : rien ne presse.

## La direction

Neuf des seize premiers retours du formulaire demandaient un campus
([mise à plat de la 6.2](../phase-6/6-2-mise-a-plat.md#23-les-campus-demandés)). Trois étudiants ont
accepté de prêter leur accès, sur trois campus : l'IUT de Bordeaux, Victoire et Bordeaux Montaigne. C'est
la première demande des utilisateurs, et elle ne demande pas de release tant que l'emploi du temps d'un
campus est un Celcat ou un export iCalendar.

**Un campus à la fois**, au rythme des comptes prêtés : chaque portail universitaire a des défauts que son
voisin n'a pas, et Bordeaux INP en a trouvé huit, sur appareil ([6-G](../phase-6/6-g-etablissements.md)).
**La moitié publique d'abord**, qui se mesure sans compte et pour les trois d'un coup ; la moitié
authentifiée ensuite, sur le compte prêté.

**Et après la 6.3**, pour les lots qui publient. Trois raisons, tranchées le 2026-09-16. L'application ne
sait pas encore montrer un campus : la liste des établissements n'est ni regroupée ni cherchable par
alias avant [7-J](7-j-ecrans.md), et « Talence » y est encore écrit en dur. Un campus de plus, c'est du
trafic de plus sur des sources tierces que [7-A](7-a-bande-passante.md) et
[7-C](7-c-economie-et-socle.md) sont justement en train de ménager. Et [7-D](7-d-la-mesure.md) donnera
des chiffres par campus, donc de quoi juger ce que chaque publication apporte. Les comptes prêtés, eux,
ne sont pas encore tous réunis.

## Les trois campus

| Campus | Ce qu'on sait | Ce qu'il faut mesurer d'abord | Code proposé |
|---|---|---|---|
| **IUT de Bordeaux** | composante de l'Université de Bordeaux : même CAS, portail probablement identique | la source d'emploi du temps — un Celcat distinct, un export iCalendar, un autre logiciel ? —, les sites et leurs bâtiments, les bibliothèques sur Affluences | `bordeaux-iut` |
| **Victoire** | composante de l'Université de Bordeaux, portail déjà écrit ; **absente du Celcat de Bordeaux**, qui ne porte que le collège Sciences et Technologies ([adaptation-campus.md](../adaptation-campus.md#ce-que-la-mesure-du-2026-09-06-a-établi)) | la source d'emploi du temps, les bâtiments, la bibliothèque | `bordeaux-victoire` |
| **Bordeaux Montaigne** | **un établissement distinct** : CAS, ENT, dossier et messagerie à part, Blueprints à écrire de zéro | tout, y compris la génération du dossier en ligne — deux `mondossierweb` différents se cachent parfois sous le même nom | `bordeaux-montaigne` |

**Le code se choisit une fois** : il partitionne le trousseau, les réglages et les favoris des étudiants,
et le changer ensuite les déconnecterait tous. Les codes ci-dessus sont des propositions, confirmées ou
corrigées au lot 1.

## Ce qui est à faire

### Lot 1 — Le relevé public des trois campus

**Sans compte et sans code**, la moitié publique des trois campus d'un coup, avec la grille du
[kit d'adaptation](../campus/kit-d-adaptation.md#ce-quil-faut-collecter) : le logiciel d'emploi du temps et
l'existence d'un export iCalendar public, les bâtiments et la façon dont les salles s'écrivent, les
bibliothèques sur Affluences, la région CROUS, les adresses de l'ENT et sa page de connexion.

**Ce qu'il rend** :

- la fiche de chaque campus, `docs/campus/<code>.md`, ouverte depuis le
  [modèle](../campus/kit-d-adaptation.md#le-modèle-de-fiche), moitié publique remplie ;
- **un verdict par campus** : *sans code* — l'emploi du temps est un Celcat ou un export iCalendar, et tout
  se publie — ou *demande du code*, avec ce qu'il faut écrire ;
- la confirmation, ou la correction, des codes proposés, et ce que chaque campus partage avec la ligne
  `bordeaux` : la même page de connexion, le même dossier en ligne ;
- **la règle de nommage des campus**, tranchée et écrite dans [campus/README.md](../campus/README.md).
  Proposée le 2026-09-15 : le nom officiel court pour une université ou une école à part, comme
  « Bordeaux Montaigne » ; le nom officiel pour une composante de l'Université de Bordeaux, comme « IUT de
  Bordeaux » ; « Campus » suivi du lieu pour un site entier, comme « Campus Victoire » ; les mots que tapent
  les étudiants en alias. Victoire reste un cas ouvert : si son emploi du temps suit le Collège Sciences de
  l'Homme, présent aussi à Pessac et à Bayonne, la ligne prend le nom du collège.

**Pourquoi d'abord** : si un campus demande du code, ce code doit entrer dans la publication suivante,
[7-C](7-c-economie-et-socle.md) si elle n'est pas sortie ; le découvrir pendant le lot de Montaigne le
repousserait à la publication d'après.

**Ce qu'il ne fait pas** : se connecter à un portail, écrire un Blueprint, publier quoi que ce soit.

### Lot 2 — IUT de Bordeaux

La [marche à suivre](../adaptation-campus.md#la-marche-à-suivre), de la mesure à la publication, sur la
fiche ouverte au lot 1. Ce qui est propre au campus : le portail est probablement celui de l'Université de
Bordeaux, et la ligne de catalogue référence alors `ukit.portail.bordeaux.*` sans rien dupliquer ; la
source d'emploi du temps et les sites décident du reste.

### Lot 3 — Victoire

La même marche à suivre. Ce qui est propre au campus : le portail est déjà écrit, mais l'emploi du temps
n'est pas dans le Celcat de Bordeaux, et la géographie — bâtiments, bibliothèque — est entièrement à
mesurer.

### Lot 4 — Bordeaux Montaigne

La même marche à suivre, pour **un établissement entier** : CAS, ENT, dossier et messagerie, Blueprints
écrits de zéro sous le préfixe `ukit.portail.`, et vérifiés sur appareil à chaque étape. Le lot passe
**en dernier** : un établissement entier demande le plus de travail, et il profite de tout ce que les
deux précédents auront appris.

## Décisions et pièges

- **Une ligne de catalogue par campus, même quand le portail est partagé** (décision du 2026-09-14). La
  ligne est l'unité de ciblage, de source d'emploi du temps, de géographie et de trousseau ; les Blueprints
  se référencent par leur nom.
- **Le regroupement, les alias et les crédits sont là quand les lots s'ouvrent.** `credits`, `campus` et
  `alias` d'`etablissements` arrivent en base avec
  [7-C](7-c-economie-et-socle.md#6-les-colonnes-additives), et l'application les lit depuis la 6.3
  ([7-J](7-j-ecrans.md)) : un campus publié après elle arrive regroupé, cherchable par son alias, et son
  prêteur est crédité. Le lot 1, lui, n'a besoin d'aucune colonne.
- **Les identifiants prêtés** passent par le `.env` gitignoré, sous `PORTAIL_<CODE>_USER` et
  `PORTAIL_<CODE>_PASS`, jamais par un canal partagé, et ne servent qu'aux lots 2 à 4.

## Dépendances

- **Lot 1** : aucune.
- **Lots 2 à 4** : le lot 1, la **6.3 en production** ([7-K](7-k-sortie-6-3.md)), et un compte prêté pour
  le campus.
- **Un campus dont le verdict demande du code** attend la publication qui porte ce code.

## Définition de « terminé »

- **Lot 1** : une fiche par campus, moitié publique remplie ; un verdict par campus ; les codes confirmés ;
  la règle de nommage écrite dans [campus/README.md](../campus/README.md).
- **Lots 2 à 4** : les étapes 5 à 8 de la [marche à suivre](../adaptation-campus.md#la-marche-à-suivre)
  déroulées — Blueprints vérifiés sur le compte prêté et sur les deux appareils, publiés dans l'ordre,
  sondés sans identifiants, la personne créditée si elle le veut —, la fiche du campus close, et la ligne
  du lot livrée dans le [README de la phase](README.md#létat).

## Plan de test

- **Lot 1** : chaque verdict s'appuie sur une adresse publique relevée dans la fiche, page Celcat ou export
  iCalendar ; chaque code proposé a été confronté au catalogue publié.
- **Lots 2 à 4** : sur l'iPhone 13 Pro et le Galaxy A8, le parcours d'un étudiant du campus — accueil et
  choix du campus, emploi du temps, salles, bibliothèques, restaurant, Scolarité avec le compte prêté — ;
  puis la sonde du matin, verte sans identifiants.

## Limites écrites

- **Un nouveau type de source d'emploi du temps exige une release**
  ([campus/README.md](../campus/README.md#ce-qui-exige-une-release)).
- **Un compte prêté se révoque à tout moment** : un changement de mot de passe arrête le lot en cours sans
  prévenir ; les sondes sans identifiants gardent la surveillance.
- **Attendre la 6.3 fait attendre ceux qui ont demandé leur campus** : neuf des seize premiers retours.
  L'annonce « Trois campus en route » ne donne pas de date, et c'est voulu ; si l'attente s'allonge, ce
  qu'il faut renouveler est l'annonce, pas la promesse.
