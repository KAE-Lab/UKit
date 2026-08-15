# 6-J — Le compte d'abord, et des sources qui varient par établissement

> **Spécification ouverte.** Écrite à la livraison de [6-G](6-g-etablissements.md), à partir de ce que
> le second établissement a montré sur un vrai téléphone. Rien n'est implémenté ici.

## Ce que le second établissement a appris

6-G a rendu le multi-établissement possible : le catalogue pilote l'interface, un portail s'ajoute
sans release. Mais il a aussi montré que **l'application n'a qu'une forme**, celle de l'Université de
Bordeaux, et que cette forme ne convient pas à tout le monde.

Constaté en jouant Bordeaux INP sur appareil :

- l'onglet **Planning** est le premier écran de l'application, et il n'a rien à montrer pour un
  établissement dont on n'a pas porté l'emploi du temps. 6-G le dit proprement au lieu d'échouer,
  mais « proprement » veut dire ici une phrase d'excuse à l'ouverture ;
- le **compte universitaire** est présenté comme une fonctionnalité parmi quatre, alors qu'il est la
  seule porte vers les données personnelles — et, pour beaucoup d'établissements, la seule porte vers
  l'emploi du temps ;
- **ce qui existe varie d'une fac à l'autre**, et pas seulement en présence ou en absence : chez l'une
  l'emploi du temps est public et le compte optionnel, chez l'autre il n'y a d'emploi du temps que
  derrière une authentification ou un lien d'abonnement personnel.

La conclusion n'est pas un correctif : c'est que **la place du compte dans le parcours dépend de
l'établissement**, et que l'application ne sait pas encore exprimer ça.

## La direction

**Proposer la connexion au compte pendant l'accueil, juste après le choix de l'établissement** — sans
la rendre bloquante. Puis, dans l'application, traiter l'absence de compte comme 6-G traite déjà
l'absence de service : les parties qui en dépendent se **disent** indisponibles au lieu d'échouer, avec
un chemin de sortie clair.

Pour l'emploi du temps, deux voies selon ce que l'établissement publie, et **le catalogue en décide** :

| L'établissement publie | Ce que l'accueil propose | Ce que l'application joue |
|---|---|---|
| un serveur interrogeable sans compte (Bordeaux) | le choix des groupes, comme aujourd'hui | les Blueprints d'emploi du temps |
| un export d'abonnement (ADE, Hyperplanning) | « colle ton lien iCal », ou la connexion au compte pour l'y retrouver | l'iCal ([6-I](6-i-planning-universel.md)) |
| rien d'extractible | rien — et l'onglet le dit | — |

Le lien collé à la main est le **repli universel** : il marche partout où l'établissement offre un
export, sans que nous ayons rien à porter. Il coûte un geste que personne n'a envie de faire, donc il
n'est pas le chemin principal — il est celui qui existe toujours.

## Les questions à trancher avant d'écrire du code

1. **Le compte à l'accueil est-il une étape ou une invitation ?** Une étape allonge un parcours que
   6-G vient déjà d'allonger d'un écran. Une invitation se saute et ne revient jamais. Il faut
   probablement une troisième forme : une étape **sautable et rappelée** là où elle manque.
2. **Un lien iCal est-il un réglage ou un secret ?** Un lien d'abonnement personnel vaut un
   identifiant : il ouvre un emploi du temps nominatif. Il ne peut pas vivre en clair dans les
   réglages, il doit aller dans le trousseau — ce qui change l'écran qui le saisit.
3. **Que devient l'onglet Planning quand il n'a rien ?** Aujourd'hui il affiche une phrase. Faut-il
   plutôt qu'il propose l'action qui le remplirait — se connecter, coller un lien — voire que
   l'application ouvre sur un autre onglet ? C'est une décision de produit, pas de technique.
4. **Jusqu'où le catalogue décrit-il un parcours ?** 6-G a posé une règle nette : *le catalogue ne
   porte pas de logique*. Une colonne « comment obtenir l'emploi du temps » la frôle. La ligne à ne
   pas franchir est celle-ci : le catalogue peut dire **ce qui existe**, jamais **quoi faire** — le
   quoi-faire reste un Blueprint ou du code relu.

## Ce que 6-G a déjà posé, et qui reste valable

- un service absent se **dit** au lieu d'échouer, avec son propre message (`serviceAbsent`) ;
- l'accueil sait déjà **omettre une étape** selon l'établissement — le mécanisme existe, il ne demande
  qu'à porter d'autres cas ;
- les écrans qui dépendent d'un service disparaissent au lieu de rester en erreur permanente : la
  ligne de messagerie, la section des salles libres ;
- le portail d'un établissement est un fichier publiable, donc ajouter une université reste une
  publication.

Ce jalon ne défait rien de tout ça. Il déplace une décision de produit — *quand demande-t-on le
compte* — que 6-G a rendue visible sans avoir à la trancher.

## Dépendances

[6-I](6-i-planning-universel.md) pour la voie iCal. Ce jalon se **coupe donc en deux**, et il vaut
mieux le savoir avant de le lancer :

- **« proposer le compte universitaire à l'accueil »** ne dépend de rien et peut être livré seul ;
- **« colle ton lien iCal »** n'a aucun sens tant que l'application ne sait pas lire un iCal.

C'est aussi la raison pour laquelle ce jalon vient **après** 6-I dans l'ordre de la phase, alors que sa
première moitié pourrait techniquement passer avant.

## Une précision de vocabulaire, parce qu'elle prête à confusion

Le « compte » de ce jalon est le **compte universitaire** — les identifiants CAS que l'application
détient déjà et garde dans le trousseau. Ce n'est **pas** un compte UKit : aucun serveur, aucune
inscription, rien de nouveau qui transite, et la politique de confidentialité ne bouge pas.

Un compte UKit — pour une partie sociale — est un sujet distinct, hors de la phase 6, et il n'est pas
spécifié. Deux choses valent d'être écrites ici pour le jour où il le sera, parce qu'elles ne coûtent
rien maintenant et qu'elles coûteraient un refactor plus tard :

- **la preuve d'être étudiant est locale, donc non vérifiable par un serveur.** Le portail se joue sur
  l'appareil et n'en rapporte aucun artefact signé ; annoncer un numéro étudiant à la base serait
  trivialement falsifiable, la clé publiable étant publique par conception. La réponse vérifiable est
  l'**adresse institutionnelle** — que le portail lit déjà — confirmée par un code envoyé par courriel ;
- **faire vérifier les identifiants CAS par le serveur est exclu**, quelle que soit la commodité : ça
  détruirait la promesse qui justifie que le moteur soit embarqué plutôt qu'hébergé
  ([PRIVACY.md](../../PRIVACY.md)).

Ce jalon, lui, ne fait ni l'un ni l'autre : il déplace seulement le moment où l'on demande les
identifiants universitaires.
