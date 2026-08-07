# 6-G — Le multi-établissement

> Ajouter une université devient une ligne en base et un Blueprint publié. C'est le gain produit que
> les six jalons précédents rendent possible.

## Objectif

Le catalogue des établissements vit en base et pilote l'interface. Les Blueprints de portail sont
namespacés par établissement, et le registre sait en **ajouter** à distance — la seule garde
d'Aetherius qu'il faut lever, en opt-in et bornée. Un second portail réel est livré et vérifié.

## Dépendance : le jalon 3-H d'Aetherius

Le registre refuse, par construction, qu'un manifeste distant ajoute un Blueprint absent du binaire.
La raison est bonne : elle garantit un repli hors ligne **pour chaque** Blueprint, et elle empêche un
manifeste compromis d'introduire du comportement que personne n'a relu.

Elle ne tient plus dès qu'on veut étendre plutôt que corriger. Un portail que l'application n'a
jamais livré n'a **pas** de repli hors ligne à préserver — il n'existe pas encore pour l'utilisateur.
La seconde raison, elle, reste entière, et c'est pourquoi la levée est encadrée :

- **opt-in** : l'application demande explicitement cette capacité ;
- **bornée par un préfixe de noms réservé** (`ukit.portail.`) : rien d'autre ne peut apparaître ;
- **bornée par le périmètre de secrets** de l'application : un portail ajouté à distance ne peut
  déclarer que les secrets que l'application sait fournir, c'est-à-dire les identifiants
  universitaires, et rien d'autre ;
- **soumise aux mêmes gardes** que le reste : validation complète, empreinte, `min_engine`, act
  portable.

La spécification vit dans le dépôt voisin : `docs/phase-3/3-h-portails.md`. **Elle doit être livrée
avant de commencer ce jalon** — c'est la seule dépendance inter-dépôt de la phase, et la traiter en
retard ferait attendre tout le jalon.

Ce que cela change au modèle de menace est écrit là-bas, et se résume ici : un publieur compromis
pouvait déjà livrer un Blueprint malveillant sous un nom existant. Pouvoir en ajouter un ne change
pas la nature du risque, seulement le nombre de portes — et le périmètre de secrets reste la vraie
limite du rayon.

## Ce qui est livré

### Le catalogue

La table `etablissements` posée en [6-B](6-b-supabase.md) est remplie et branchée :

| Colonne | Rôle |
|---|---|
| `code` | identifiant court, celui qui compose les noms de Blueprints (`bordeaux`, …) |
| `nom`, `ville`, `logo` | ce que l'écran affiche |
| `actif` | un établissement se retire sans release |
| `portail_dossier`, `portail_messagerie` | les noms des Blueprints à jouer, ou `null` si l'établissement n'a pas ce service |
| `libelles` | les intitulés propres à l'établissement (« numéro étudiant », « INE », …) |
| `celcat_domaine`, `celcat_res_types` | ce qui fait varier les Blueprints d'emploi du temps |

L'écran de sélection lit cette table, avec le socle embarqué en repli — même modèle que partout
ailleurs dans la phase : **au premier lancement, hors ligne, l'établissement historique doit être
sélectionnable.**

### Les Blueprints namespacés

`ukit.scolarite.dossier` devient `ukit.portail.bordeaux.dossier`. Les Blueprints d'emploi du temps
et de campus suivent la même règle **quand ils varient par établissement** ; ceux qui n'en dépendent
pas (Croustillant est national, Affluences aussi) gardent leur nom.

Le préfixe n'est pas cosmétique : c'est lui que le registre autorise à s'étendre, et c'est donc lui
qui définit ce qu'un manifeste peut ajouter.

### Le parcours utilisateur

- **Onboarding** : le choix de l'établissement devient la première étape, avant le thème et la
  langue — il conditionne tout le reste, à commencer par la liste des groupes.
  [`WelcomeScreen`](../../src/features/Onboarding/WelcomeScreen.tsx) gagne un écran.
- **Réglages** : on peut changer d'établissement. Le changement purge les caches liés (groupes,
  bâtiments, planning) et déconnecte la session universitaire — mêler les données de deux facs serait
  pire que de tout redemander.
- **Migration silencieuse** : une installation existante est réputée `bordeaux`. Aucun écran, aucune
  question. Le code de migration vit à côté de celui de `groupName` → `favoriteGroups`, dans
  [`AppCore.tsx`](../../src/shared/services/AppCore.tsx), et il reste tant que des installations
  anciennes peuvent être mises à jour.

### Le second portail

Un établissement réel, choisi pour ce qu'il apprend et pas pour sa facilité, est ajouté **par
publication seule** : une ligne en base, deux Blueprints publiés, aucune release.

C'est la seule preuve que le mécanisme tient. Un multi-établissement vérifié avec un second
établissement fictif ne prouve rien : les portails universitaires se ressemblent en surface et
divergent partout où ça compte.

## Décisions et pièges

- **Ce qui varie par établissement est une donnée, pas une branche.** Aucun `if (etablissement ===
  'bordeaux')` dans le code applicatif. Ce qui diffère vit dans le Blueprint ou dans la ligne de
  catalogue ; si quelque chose ne peut pas y vivre, c'est le signe qu'il manque une colonne, pas
  qu'il faut une condition.
- **Un établissement peut n'avoir qu'une partie des services.** Une fac sans messagerie extractible
  est un cas normal : le champ vaut `null`, l'écran n'affiche pas la carte. Prévoir l'absence dès le
  premier jour coûte moins cher que de la découvrir au second établissement.
- **Les libellés d'écran restent traduits, les libellés de données viennent du catalogue.** « Numéro
  étudiant » est une chaîne de `Translator` ; le fait qu'une fac appelle ça autrement est une donnée
  de catalogue. Confondre les deux ramènerait des chaînes en dur.
- **Les douze points de balayage des bibliothèques** peuvent rejoindre le catalogue ici — ils sont
  aujourd'hui une liste régionale en dur, ce qui est exactement le genre de constante qui devient
  fausse au second établissement.
- **Ne pas ouvrir le préfixe plus que nécessaire.** `ukit.portail.` et rien d'autre. Un préfixe
  généreux (`ukit.`) rendrait toutes les sources de l'application remplaçables à distance, ce qui est
  précisément ce que la garde d'origine évite.

## Définition de « terminé »

1. Le jalon 3-H d'Aetherius est livré, publié, et la version est épinglée dans `package.json`.
2. Le catalogue est rempli, les Blueprints sont namespacés, le registre est configuré en opt-in avec
   son préfixe et son périmètre de secrets.
3. L'écran de sélection existe, à l'onboarding et dans les réglages ; le changement purge ce qu'il
   faut purger.
4. Une installation existante passe la mise à jour **sans rien remarquer**, session comprise.
5. Un second établissement réel fonctionne, ajouté **sans release** — vérifié en installant une
   version antérieure à son ajout et en la voyant le proposer après rafraîchissement.
6. Un Blueprint hors préfixe, publié au manifeste, est **ignoré** — vérifié.
7. `npx tsc --noEmit`, `npx eslint .`, `npm run parity` verts.
8. Documentation : [scolarite.md](../features/scolarite.md), [onboarding.md](../features/onboarding.md),
   [settings.md](../features/settings.md), [backend.md](../backend.md),
   [blueprints.md](../blueprints.md) et le README ; CHANGELOG.

## Plan de test

| Sonde | Attendu |
|---|---|
| Nouvelle installation | choix de l'établissement en première étape, liste depuis la base |
| Nouvelle installation, mode avion | l'établissement historique est proposé depuis le socle |
| Mise à jour d'une installation existante | aucune question, `bordeaux` conservé, session intacte |
| Changement d'établissement | caches purgés, session déconnectée, groupes rechargés |
| Établissement désactivé en base | disparaît de la liste ; un utilisateur qui l'avait choisi garde son socle et est prévenu |
| Second établissement ajouté par publication | apparaît après rafraîchissement, sans réinstaller |
| Blueprint publié **hors** préfixe `ukit.portail.` | ignoré, mentionné dans le diagnostic |
| Blueprint de portail déclarant un secret hors périmètre | refusé avant le cache |
| Établissement sans messagerie | l'écran n'affiche pas la carte, aucun échec |

## Limites écrites

- **Ajouter un établissement reste un travail d'auteur.** Le mécanisme supprime la release, pas
  l'écriture des Blueprints ni leur vérification sur un compte réel de cette université. Sans compte,
  on ne peut pas livrer un portail — et le prétendre serait mentir aux étudiants concernés.
- **Un portail ajouté à distance n'a pas de repli hors ligne** avant d'avoir été résolu une fois.
  C'est la contrepartie assumée de la levée de garde, et elle est sans conséquence : un portail qu'on
  n'a jamais joué n'a rien à quoi retomber.
- **Le périmètre de secrets est le même pour tous les portails.** Un établissement qui exigerait un
  troisième identifiant demanderait une release. C'est voulu : c'est la garde qui empêche un
  manifeste compromis de réclamer le trousseau.
- **Le catalogue ne porte pas de logique.** Un établissement dont le parcours ne rentre pas dans la
  forme prévue demande un Blueprint de plus, pas une colonne de plus.
