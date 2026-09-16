# Campus Victoire

> Fiche ouverte le 2026-09-16, par le relevé public du lot 1 de
> [7-B](../phase-7/7-b-nouveaux-campus.md). Compte prêté : annoncé le 2026-09-14, **pas encore reçu**.
> Volontaire crédité : à demander.
>
> **Verdict : indéterminé sans compte.** C'est le seul honnête : le relevé public établit **où
> l'emploi du temps n'est pas**, et aucune source publique ne dit où il est. Hypothèse à vérifier en
> premier au lot 3 : l'**ADE** de l'université, derrière son CAS.

## Identité
- Nom complet : **Campus Victoire** — campus de centre-ville de l'Université de Bordeaux, place de la
  Victoire
- Nom court : **Victoire**
- Commune : **Bordeaux**
- Logo : celui de l'Université de Bordeaux
- Mots des étudiants : *à collecter* — proposés : « Victoire », « la Vic », « centre-ville »
- Code proposé : **`bordeaux-victoire`** — **confirmé**, aucun conflit avec le catalogue publié

## Emploi du temps
- Page publique : **aucune trouvée**
- Logiciel : **indéterminé**
- Export iCalendar public : **non trouvé**

Ce que le relevé a **éliminé**, et qui vaut autant qu'une réponse :

- **Pas dans le Celcat de Bordeaux.** Sur les 2 958 groupes de l'inventaire public, **aucun** préfixe
  de droit, AES, psychologie, sociologie, santé ou odontologie. L'inventaire des 286 salles est celui
  de Talence (`A21`, `A22`, `CREMI`, `IMA`…), avec une seule mention hors campus. La mesure du
  2026-09-06 est confirmée.
- **Pas sur les sites des composantes.** `psychologie`, `sociologie`, `staps`, `droit`, `sante` et
  `anthropologie-sociale` `.u-bordeaux.fr` ne publient **ni lien ni mention** d'emploi du temps.
- **L'université exploite bien un ADE** — `planning.u-bordeaux.fr` et `ade.u-bordeaux.fr`, ADESOFT
  version 6.17 — mais il est **derrière le CAS** (formulaire Apereo, champs `execution`, `_eventId`,
  `deviceFingerprint`, lien vers `idnum.u-bordeaux.fr`) et **sans export anonyme** :
  `anonymous_cal.jsp` rend **0 octet** pour tout `projectId` de 0 à 6.

> **Un piège pour la suite, mesuré** : `planning.u-bordeaux.fr` et `ade.u-bordeaux.fr` servent une
> **chaîne de certificats incomplète** — `curl` échoue en `unable to get local issuer certificate` et
> ne passe qu'avec `-k`. Un navigateur moderne complète la chaîne tout seul ; **un vieil Android ne le
> fait pas forcément**. Le dépôt porte déjà un plugin pour ce genre de cas
> ([`tools/expo/autorites-universitaires.js`](../../tools/expo/autorites-universitaires.js)), et c'est
> exactement le type de défaut que seul le Galaxy A8 révèle.

## Bâtiments

*Non collectés : sans emploi du temps lisible, on ne sait pas comment une salle s'écrit.*

| Code | Nom | Latitude | Longitude | Accès libre | Horaires | Photo |
|---|---|---|---|---|---|---|
| | Campus Victoire (point central) | 44.83128 | -0.57082 | | | |

Trois noms de salle copiés de l'emploi du temps :
- *à relever avec le compte prêté*

## Bibliothèques
- Point central : **44.83128, -0.57082**
- Sur Affluences : **oui** — **BU Station Marne**, identifiant
  `42a99317-117e-4410-b891-56bbb8b3c4c2`, la bibliothèque du secteur. La **BUSVS - Carreire**
  (`74c9cfc7-8d41-4f64-9fc8-48fa67ef1d16`) dessert les formations de santé du même secteur
- Absentes d'Affluences : *à confirmer sur place*

## Restaurants
- Sur Croustillant : **oui**
- Région CROUS : **1 (Bordeaux)**

## Services de l'ENT
- ENT : `https://intranet.u-bordeaux.fr`
- Messagerie : `https://webmel.u-bordeaux.fr`
- Page de connexion : **`https://cas.u-bordeaux.fr`** — **la même que `bordeaux`**
- Moodle : `https://moodle.u-bordeaux.fr`
- Scolarité, notes, examens : `https://apogee.u-bordeaux.fr`

**Le portail est déjà écrit.** La Victoire est une composante de l'Université de Bordeaux et partage
tout le portail décrit par la ligne `bordeaux` : sa ligne de catalogue référencera
`ukit.portail.bordeaux.*` sans rien dupliquer. Il ne lui manque qu'un emploi du temps et une
géographie.

## Ce qui reste (rempli par le développeur)

1. **Chercher d'abord une adresse d'abonnement iCalendar**, une fois connecté — c'est ce qui a réglé
   les deux autres campus. L'ADE d'ADESOFT en propose une, comme PRONOTE : si l'ENT ou l'ADE en donne
   une, le campus est utilisable **aujourd'hui**, par le
   [lien collé](../phase-6/6-j-compte-et-sources-par-etablissement.md), sans une ligne de code ni
   release.
2. **Sinon, identifier la source**, dans cet ordre de probabilité : l'**ADE** derrière le CAS
   (`planning.u-bordeaux.fr`) ; un autre logiciel propre à une composante.
3. Relever les bâtiments de la place de la Victoire et le motif de reconnaissance des salles.
4. Vérifier la chaîne de certificats de l'ADE **sur le Galaxy A8** avant de s'appuyer dessus.
