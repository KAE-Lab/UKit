# Université Bordeaux Montaigne

> Fiche ouverte le 2026-09-16, par le relevé public du lot 1 de
> [7-B](../phase-7/7-b-nouveaux-campus.md). Compte prêté : annoncé le 2026-09-14, **pas encore reçu**.
> Volontaire crédité : à demander.
>
> **Verdict : sans code pour l'emploi du temps — vérifié de bout en bout le 2026-09-16.** L'adresse
> d'abonnement iCalendar de PRONOTE Campus, collée dans « Mon université n'est pas dans la liste »
> ([6-J](../phase-6/6-j-compte-et-sources-par-etablissement.md)), **affiche les cours dans le
> Planning**, sur l'appareil. Aucune release, aucune ligne de code. Le **portail** (dossier,
> messagerie), lui, reste à écrire de zéro : c'est le seul **établissement entier** des trois.

## Identité
- Nom complet : **Université Bordeaux Montaigne**
- Nom court : **Montaigne**
- Commune : **Pessac** (Domaine universitaire, 19 esplanade des Antilles)
- Logo : à demander au service communication
- Mots des étudiants : *à collecter* — proposés : « Montaigne », « Bordeaux 3 », « UBM », « lettres »
- Code proposé : **`bordeaux-montaigne`** — **confirmé**, aucun conflit avec le catalogue publié

## Emploi du temps
- Page publique : **aucune**
- Logiciel : **PRONOTE Campus** (Index Éducation) — servi par l'hôte
  `flaubert2.u-bordeaux-montaigne.fr`, qui s'annonce « Université Bordeaux Montaigne - PRONOTE
  Campus » sur sa propre page d'erreur
- Adresse d'entrée : `https://hyperplanning.u-bordeaux-montaigne.fr` — **un CNAME vers `flaubert2`**,
  résidu d'un changement de logiciel, exactement comme côté [IUT](bordeaux-iut.md). Le nom de l'hôte
  ne dit donc **pas** le produit : seule la page le dit
- Export iCalendar public : **non** — mais **l'export existe pour l'étudiant connecté**, voir plus bas

**Tout est derrière le CAS, y compris l'espace invité.** Mesuré : la racine **et** `/invite`
redirigent l'une comme l'autre vers
`https://sso.u-bordeaux-montaigne.fr/cas/login?service=…` — page « Authentification - Université
Bordeaux Montaigne ». Les chemins d'export rendent une page d'erreur constante de 2 359 octets tant
qu'on n'est pas connecté : **aucune surface publique**.

### L'export iCalendar existe, et il change le verdict

**Vérifié le 2026-09-16 sur le compte prêté.** La connexion au CAS aboutit sur l'espace étudiant
`…/etudiant?identifiant=<16 caractères>`, titre « PRONOTE Campus - Université Bordeaux Montaigne ».
PRONOTE y propose une boîte **« Export au format iCal »** offrant deux choses :

- un **téléchargement ponctuel** de l'emploi du temps, non mis à jour ;
- une **adresse d'abonnement** — « Synchroniser l'emploi du temps avec le gestionnaire d'agenda »,
  *« l'emploi du temps sera mis à jour en temps réel »* — de la forme
  `https://flaubert2.u-bordeaux-montaigne.fr/Telechargements/ical/<jeton>`, copiable et doublée d'un
  QR Code.

C'est exactement ce que l'application sait déjà jouer : le **lien d'abonnement collé**
([6-J](../phase-6/6-j-compte-et-sources-par-etablissement.md)), un seul Blueprint embarqué, aucune
écriture par établissement.

**Et ça a été joué, pas seulement supposé.** Le 2026-09-16, l'adresse collée dans « Mon université
n'est pas dans la liste » rend le Planning **rempli et correct** sur l'appareil.

> **Une réserve, relevée à cette occasion et volontairement non corrigée ici** : certains **intitulés
> de cours s'affichent bizarrement**. PRONOTE n'écrit pas son `SUMMARY` comme l'export ADE de Bordeaux
> INP, sur lequel la projection a été réglée ([6-I](../phase-6/6-i-planning-universel.md)). Ce n'est
> pas un défaut du campus mais de l'**adaptation d'un nouvel émetteur d'iCalendar** : il s'inscrit au
> [registre des défauts](../defauts-fonctionnels.md) et se traite à part, avec des exemples réels sous
> les yeux — pas au passage d'un relevé.

> **L'adresse d'abonnement est un secret personnel.** Elle donne l'emploi du temps de son porteur à
> quiconque la détient, sans authentification — c'est la règle que le
> [kit d'adaptation](kit-d-adaptation.md#les-règles-avant-tout) énonce déjà. Elle ne s'écrit donc
> **jamais** dans ce dépôt, ni dans une capture : seule sa **forme** est documentée ci-dessus.

## Bâtiments

*Non collectés : sans emploi du temps lisible, on ne sait pas comment une salle s'écrit.*

| Code | Nom | Latitude | Longitude | Accès libre | Horaires | Photo |
|---|---|---|---|---|---|---|
| | Campus (point central) | 44.79494 | -0.61737 | | | |

Trois noms de salle copiés de l'emploi du temps :
- *à relever avec le compte prêté*

## Bibliothèques
- Point central : **44.79494, -0.61737**
- Sur Affluences : **oui** — **Bibliothèque Rigoberta Menchú**, déclarée « Université Bordeaux
  Montaigne », identifiant `e86a556a-b808-4b9c-ab78-b49487c63fef`. La **BU Droit-Lettres**
  (`9e418833-a68a-42d7-8447-133761a8ca48`), sur le même domaine universitaire de Pessac, y figure
  aussi
- Absentes d'Affluences : *à confirmer sur place*

## Restaurants
- Sur Croustillant : **oui**
- Région CROUS : **1 (Bordeaux)**

## Services de l'ENT
- ENT : `https://intranet.u-bordeaux-montaigne.fr` (hôte `durthang`), et le portail étudiant
  **`https://etu.u-bordeaux-montaigne.fr`**
- Messagerie : **`https://carbonio.u-bordeaux-montaigne.fr`** — un **Carbonio**, pas un webmail
  d'Université de Bordeaux
- Page de connexion : **`https://sso.u-bordeaux-montaigne.fr/cas`** (hôte `utumno`) — **un CAS
  distinct** de celui de l'Université de Bordeaux
- Moodle : **aucun sous-domaine `moodle.` ne résout** ; la plateforme pédagogique est à identifier
  depuis l'ENT
- Scolarité, notes, examens : à identifier depuis l'ENT
- Offre de formation : `https://formations.u-bordeaux-montaigne.fr`

**Rien n'est partagé avec `bordeaux`** : CAS, ENT, messagerie et emploi du temps sont tous propres à
l'établissement. C'est ce qui en fait le lot le plus lourd des trois, et ce qui justifie qu'il passe
en dernier.

## Ce qui reste (rempli par le développeur)

1. **Trancher la voie**, comme pour l'IUT : l'adresse ICS personnelle qu'HyperPlanning donne à un
   étudiant rendrait le campus utilisable par le **lien collé** déjà livré
   ([6-J](../phase-6/6-j-compte-et-sources-par-etablissement.md)), sans une ligne de code. Sinon,
   HyperPlanning est un troisième type de source et exige une release
   ([README](README.md#ce-qui-exige-une-release)).
2. Écrire les Blueprints du portail **de zéro**, sous le préfixe `ukit.portail.`, et les vérifier sur
   le compte prêté **et sur les deux appareils** — c'est là que Bordeaux INP avait trouvé ses huit
   défauts.
3. Identifier la plateforme pédagogique et les services de scolarité depuis l'ENT.
4. Relever les bâtiments, leurs codes et le motif de reconnaissance des salles.
