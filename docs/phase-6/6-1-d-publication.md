# 6.1-D — Publication : ce qui se fait sans attendre la release

> **Jalon livré le 2026-09-04** — les neuf Blueprints de portail sont resserrés sur des chiffres
> relevés, rejoués au poste avec les identifiants réels des deux établissements (mêmes sorties, champ
> pour champ), **vérifiés sur appareil** puis **publiés**. Les portes sont vertes (`tsc`, ESLint à
> zéro, 550 tests, parité 13/13), et l'intégrité de la publication est contrôlée : manifeste, fichiers
> servis et dépôt concordent, empreinte comprise.
>
> **Le parcours froid passe de 43,0 s à 14,1 s à Bordeaux et de 48,2 s à 25,3 s à Bordeaux INP ; un
> widget de 24-29 s à 4,4-9,8 s ; un mot de passe faux de ~20 s à 7,2 s.** Les deux objectifs écrits
> plus bas sont tenus.
>
> **La passe appareil a corrigé deux décisions**, et c'est elle qui a rendu le jalon juste : le poste
> validait une attente d'ouverture qu'un Android a démentie en un run. Voir
> [Écarts constatés](#écarts-constatés) — le texte au-dessus reste tel qu'il a été écrit.
>
> **Le jalon parallèle.** Il ne dépend d'aucun build et commence dès que les mesures existent. Ses
> livrables sont des publications — Blueprints et lignes de catalogue — et une règle de procédure.
> Références S7 et P4 de la [mise à plat](6-1-mise-a-plat.md).

## La direction

La lenteur perçue des widgets (une minute au lancement) et du parcours froid (46 s à Bordeaux)
vient des **attentes fixes** des Blueprints, calées sur le portail le plus lent : 6 s pour laisser
une cascade se décider, 15 s après une soumission, 5 s avant de lire une chronologie. Elles ont
été justes le jour où elles ont été mesurées, et elles paient le pire cas à chaque run.

Un `wait_for` fait ce que le propriétaire du produit a décrit comme « rapide d'abord, lent en
repli » : il attend l'état réel de la page, pas plus, avec un plafond. C'est le même run, sans
double tentative.

## Ce qui est livré

### Des mesures avant des chiffres

Pour chaque établissement et chaque Blueprint de portail, un parcours froid et un parcours chaud
chronométrés **sur appareil, en cellulaire**, avec le temps réel de chaque cascade : arrivée sur le
CAS, retour vers le service, rendu de la page utile. Les chiffres s'écrivent dans
[`sources-externes.md`](../sources-externes.md), à côté des conditions déjà mesurées.

### Les Blueprints resserrés

Dans `ukit.portail.bordeaux.moodle`, `.messagerie`, `.dossier` et leurs pendants INP : chaque
`wait` fixe qui précède une lecture devient un `wait_for` sur un sélecteur de la page attendue,
avec un plafond au double de la mesure la plus lente. Les attentes qui suivent une soumission —
là où le moteur perd une opération émise pendant une cascade (limite écrite en 6-F) — gardent une
pause courte **puis** un `wait_for` : la pause protège l'opération, l'attente conditionnelle rend le
temps.

Chaque fichier est rejoué au poste (`aetherius run`, identifiants du `.env`) avant publication,
puis confirmé sur un appareil des deux établissements. Objectif écrit : un widget en **12 à 15 s**
à froid, un parcours froid Bordeaux **sous 30 s**.

### La règle des visuels (P4)

Remplacer une image publiée exige de changer son URL (`?v=N`) : les appareils mettent les images
en cache par adresse. La règle s'écrit dans [`campus-vie-etudiante.md`](../features/campus-vie-etudiante.md)
§ Publier ; la console de [6.1-B](6-1-b-pilotage-a-distance.md) l'applique d'elle-même.

## Décisions et pièges

- **Un plafond trop bas coûte plus qu'une attente trop longue.** Un `wait_for` qui expire fait
  échouer le run ; une pause de trop ne coûte que des secondes. Les plafonds sont larges, et les
  mesures sont là pour qu'ils le soient sans excès.
- **Une publication se fait à une heure creuse**, et l'ancienne version reste dans l'historique du
  bucket : revenir en arrière est une republication.

## Écarts constatés

**Le périmètre est passé de six fichiers à neuf.** Le texte nomme `moodle`, `messagerie`, `dossier`
et leurs pendants INP ; l'inventaire en a trouvé trois de plus qui portent exactement les mêmes
attentes — `documents` des deux côtés, `verification` et `deconnexion`. `verification` seul portait
8 s en tête de **chaque** parcours froid : le laisser aurait voulu dire mesurer un parcours qu'on ne
corrige pas.

**P4 était déjà livrée**, avec le jalon [6.1-B](6-1-b-pilotage-a-distance.md). La règle est écrite
dans [`campus-vie-etudiante.md`](../features/campus-vie-etudiante.md) § Publier et la console
l'applique d'elle-même au téléversement (`console/src/lib/versionnerUrl.ts`). Rien n'a été réécrit
ici : ce jalon la constate.

**L'attente d'ouverture a été traitée, alors que le texte ne la nommait pas.** Il ne parlait que des
attentes qui suivent une soumission. Or la pause de 6 s posée après le `navigate` est celle que
**chaque** lancement paie, session ouverte comprise — c'est-à-dire le cas courant d'un widget. Elle
est devenue un `wait_for` sur l'**union** `"#username, <cible>"` : « le formulaire, ou la page
utile ». C'est le gain principal du jalon, et il est aussi un gain de robustesse — l'attente dit
l'état réel de la page au lieu de le supposer, et un portail muet échoue en 20 s au lieu de 36.

**Deux attentes n'ont pas bougé, et c'est une décision.** Les vues *Parcours* et *arbre ADE* de
l'INP rendent en 2,3 s et 2,8 s au poste : 6 s ne laissent que 2,6 fois la mesure, et un téléphone en
cellulaire la mange. Les descendre a été **essayé** le même jour — à 500 ms, `formation_libelle` et
`edt_ressource` revenaient vides **et le run se déclarait réussi**. Une lecture bonus perdue ne fait
aucun bruit, par construction : c'est ce qui la rend dangereuse à resserrer, et ce qui a fait ajouter
la comparaison des sorties à la procédure.

**Un instrument a été construit**, que le texte ne demandait pas mais que « chronométré sur appareil »
supposait. Le poste sait mesurer depuis toujours (`aetherius run` rend une table de durées) ;
l'appareil ne savait pas. [`shared/aetherius/chrono.ts`](../../src/shared/aetherius/chrono.ts) écrit
une ligne par step sous `__DEV__`, pour **tout** run qui passe par `runBlueprint` — portails compris.
La durée totale remonte en plus sur `BlueprintRun.dureeMs` jusqu'au panneau *Blueprints* du menu,
mais **seulement pour les Blueprints que ce panneau accepte de jouer** : il refuse ceux qui déclarent
des secrets, pour ne pas engager le compte de quelqu'un depuis un écran de diagnostic. Un portail se
mesure donc par les parcours de l'application, chrono à l'appui. Une trentaine de lignes, coût nul en
production ([qualite.md](../qualite.md#lire-un-run-plutôt-que-le-supposer)).

**Les objectifs chiffrés sont tenus.** Le texte visait un widget en 12 à 15 s et un parcours froid
Bordeaux sous 30 s. Sur appareil : widgets entre **4,4 et 9,8 s**, parcours froid Bordeaux à
**14,1 s** et Bordeaux INP à **25,3 s**.

**Deux décisions ont été corrigées par l'appareil, et le poste ne pouvait pas les trouver.**

La première : l'attente d'ouverture avait été posée **sans pause**, le `wait_for` partant juste après
le `navigate`. Impeccable au poste, démentie au premier parcours froid sur Android —
`ukit.portail.bordeaux.dossier` a échoué en **31 990 ms**, c'est-à-dire l'échéance de *l'appelant* et
non le plafond de 20 000 ms qui était écrit : l'opération s'était **perdue**. La comparaison avec
`ukit.portail.verification`, joué trente secondes plus tôt dans le même parcours et réussi, a donné la
cause en une ligne : lui vise le CAS en propre et atterrit sur son document final ; le dossier vise un
**service qui rebondit**, l'agent s'installe sur un document intermédiaire, et la redirection le
remplace sans que la vue le signale. D'où une règle plus fine que celle qui était écrite — **une
opération injectée n'est sûre après un `navigate` que si celui-ci atterrit sur son document final** —
et une pause de 4 000 ms rétablie devant les sept fichiers concernés. Elle n'est pas prudentielle :
c'est la valeur qui venait de prouver, sur le même appareil, qu'elle couvre la cascade
d'authentification complète, plus longue qu'une redirection de service.

La seconde : l'union de `ukit.portail.bordeaux-inp.messagerie` n'énumérait que **deux** issues alors
que ce portail en a **trois**. Il passe par SAML, qui interpose une page de consentement entre le CAS
et Zimbra — un état où ni le formulaire ni la boîte n'existent. L'attente a brûlé ses 20 000 ms sur
une page pourtant présente, et là encore le chiffre le disait : `20 014 ms`, *son* plafond, donc une
opération bien jouée et un sélecteur incomplet. Seul des neuf fichiers dans ce cas.

Ces deux corrections partagent leur enseignement, et il est écrit dans
[`blueprints.md`](../blueprints.md#attendre--quatre-cas-et-un-seul-reste-une-pause) : **la durée d'un
échec dit lequel des deux échecs c'est.** Un plafond atteint est une page qui n'a pas montré ce qu'on
cherchait ; `plafond + 2 s + 50 %` est une opération perdue. Les deux se ressemblent à l'écran et se
distinguent d'un coup d'œil au chrono — lequel n'existait pas avant ce jalon.

## Ce que la campagne a appris, et qui vaut au-delà de ces fichiers

Les trois pièges ci-dessous ont coûté une sonde ratée chacune. Ils sont écrits dans
[`blueprints.md`](../blueprints.md#attendre--quatre-cas-et-un-seul-reste-une-pause), avec la règle
d'attente en quatre cas qu'ils ont produite.

- **`wait_for` attend `visible` par défaut.** L'annuaire de Bordeaux vit dans un accordéon replié :
  une sonde en `visible` a expiré à 25 s sur des éléments présents. En `attached`, 23 ms. C'est aussi
  ce qui **interdit** d'y mettre un `wait_for` livrable.
- **`detached` est vrai pour un sélecteur qui ne matche rien.** Sonder le gabarit d'attente de Moodle
  par sa classe répondait en 10 ms et ne prouvait rien : c'est une valeur de `data-region`. Le
  corollaire est utile — `state: "hidden"` sur un marqueur optionnel est une attente qui se désarme
  toute seule si la source cesse de le servir.
- **Une lecture bonus perdue ne fait aucun bruit.** Une pause raccourcie devant une lecture bonus se
  valide en **comparant les sorties**, jamais au seul statut du run.

## Vérifier sur appareil — ce qui a été joué le 2026-09-04

**Conditions réelles** : Android, Expo Go sur le dépôt, **wifi eduroam sur le campus**, comptes réels
des deux établissements. Pas de données cellulaires, contrairement à ce que demande le texte
ci-dessous.

> **Vérifier sur une seule plateforme a coûté une régression en production, et c'est l'enseignement
> le plus cher de ce jalon.** Tous les jalons précédents ont été vérifiés sur iPhone ; celui-ci est le
> premier à ne l'avoir été que sur Android. Une pause raccourcie y passait sans broncher et cassait le
> parcours froid de Bordeaux INP sur iOS — voir la régression au
> [registre des défauts](../defauts-fonctionnels.md). Les deux moteurs de WebView ne signalent pas la
> fin d'un chargement de la même façon, et **c'est précisément ce que ces pauses protègent** : un
> jalon qui touche aux attentes ne peut pas se vérifier sur une seule plateforme. La correction a
> demandé une publication de plus, le jour même.

| Ce qui a été joué | Résultat |
|---|---|
| Parcours froid Bordeaux, installation neuve | **14,1 s** |
| Les quatre widgets Bordeaux | 4,4 à 5,8 s, formation et annuaire remontés |
| Parcours chaud (relance de l'app) | cache servi en 691 ms, aucun run rejoué |
| Mot de passe faux | **7,2 s**, `LOGIN_FAILED`, écran « Identifiants incorrects » |
| Source injoignable (`vars` pointée sur `127.0.0.1:1`) | **24 s**, « Portail injoignable » **avec bouton de reprise**, et les autres tuiles intactes |
| Parcours froid Bordeaux INP | **25,3 s**, INE et formation remplis, proposition d'emploi du temps déclenchée |
| Les trois widgets INP | 6,8 à 9,8 s |
| **iOS**, après publication : parcours froid Bordeaux et widgets, sur la 6.0 des stores | rapides, conformes à Android |

Deux choses valident au passage des décisions d'autres jalons : une source morte **n'emporte pas** les
autres tuiles ([6.1-A](6-1-a-robustesse-scolarite.md)), et le code `CAS_INDISPONIBLE` — dont la
famille moteur est `blocked`, *non réessayable* — s'est bien présenté comme un service injoignable
**réessayable**, par la règle `_INDISPONIBLE` et non par une table. Elle n'avait jamais rencontré ce
code-là.

**Deux chemins n'ont pas pu être joués**, et ils sont écrits comme tels dans les limites :
`ukit.portail.deconnexion`, et la **branche froide** des six fichiers de widget.

Le protocole, pour la prochaine fois. Il est dans [`scolarite.md`](../features/scolarite.md), section
« Vérifier » ; ce que ce jalon y ajoute, à jouer **en données cellulaires** sur les deux
établissements :

1. Réinitialisation complète depuis le menu de développement, puis accueil et connexion au compte :
   **chronométrer le parcours froid**, écran de progression à l'appui.
2. Onglet Scolarité : **chronométrer le remplissage des widgets**, et vérifier que la **formation**
   s'affiche — c'est la lecture bonus dont la perte serait silencieuse.
3. Fermer et rouvrir : **parcours chaud**, celui que chaque lancement paie.
4. **Mot de passe volontairement faux** : doit rendre « Identifiants incorrects », vite, et non
   « service injoignable ». C'est la régression la plus probable de ce jalon.
5. **Mode avion** : doit rendre « service injoignable », réessayable. Deux écrans différents pour
   deux causes différentes.
6. Bascule sur Bordeaux INP, et les cinq mêmes gestes — en vérifiant en plus que la proposition
   d'**emploi du temps personnel** apparaît, puisqu'elle vient de l'arbre ADE.

Le chrono écrit chaque step dans la console de Metro, et le panneau *Blueprints* donne le total : un
`wait_for` qui consomme tout son plafond alors que la page était là veut dire **opération perdue**,
donc pause trop courte. Le repli est alors la pause d'avant, republiée en une commande.

## Limites écrites

- **Les mesures datent.** Un portail qui ralentit à la rentrée suivante rend les plafonds faux ;
  les sondes de 6.1-B voient une panne, pas une lenteur. Une re-mesure par rentrée est le prix.
- **Le parcours froid ne descendra pas sous la somme de ses cascades.** Trois authentifications
  successives restent trois authentifications.
- **La pause d'après-soumission est un contournement, pas une façon d'attendre.** Elle existe parce
  qu'une opération émise pendant une cascade de navigations se perd en silence sur un appareil : le
  host n'apprend pas tous les remplacements de document, et la génération étant **assignée par lui**,
  un document qu'il n'a pas vu se réannonce sous le même numéro — rien ne distingue la perte. Elle
  disparaîtra le jour où le moteur invalidera les opérations en vol sur une génération nouvelle.
  C'est une release d'Aetherius, pas une publication : la piste est nommée ici pour qu'on ne la
  redécouvre pas.
- **L'attente d'ouverture repose sur une hypothèse mesurée** : que la vue signale les sauts de la
  chaîne qui suit un `navigate`, donc que l'opération soit **rejouée** plutôt que perdue
  (`BridgedHost.throughNavigations`). C'est vrai au poste et cohérent avec ce que le moteur écrit,
  mais l'appareil est le seul juge. Si un portail dément la mesure plus tard, le repli est la pause
  fixe d'avant, republiée en une commande.
- **Aucun cas de parité ne couvre les portails** : ils demandent des identifiants. Le rejeu au poste
  avec comparaison des sorties et la vérification sur appareil sont les deux seules portes, et elles
  ne sont pas rejouables en intégration continue.
- **La branche froide des six fichiers de widget n'a pas été jouée sur appareil.** `verification`
  s'exécute en premier et ouvre la session CAS : les autres ne voient donc jamais de formulaire, et
  leur pause d'après-soumission est restée `skipped` sur les dix-huit runs. Elle ne se produit que si
  la session CAS a expiré entre deux lancements, ce qu'on ne sait pas forcer. L'argument de report est
  écrit ici plutôt que supposé : la branche **chaude**, elle, a été mesurée et enchaîne *plus* de sauts
  (service → CAS → retour → page) que la froide (CAS → service → page) ; et `verification` a bien joué
  sa propre branche froide, avec la même pause de 4 s, sur le même CAS et le même appareil.
- **`ukit.portail.deconnexion` n'a été joué nulle part.** Il ne part que du bouton « Se déconnecter »
  de la fiche du compte, et la vérification a fini sans l'emprunter. Sa pause est passée de 2 500 à
  1 000 ms ; c'est une marge, pas une condition — le serveur a invalidé le ticket au moment où la
  réponse est arrivée —, donc une valeur trop courte ne casserait rien de visible. À jouer à la
  prochaine occasion.
- **iOS n'a été vérifié qu'après coup, et il a rapporté un échec non élucidé.** La campagne de mesure
  est passée par un Android ; iOS a été contrôlé **après la publication**, sur un iPhone portant la 6.0
  des stores. Bordeaux y est passé sans réserve ; **Bordeaux INP a échoué**, à 97 % du parcours froid,
  en `unavailable` — donc sur une navigation qui n'a jamais abouti. Une pause du jalon a été restaurée
  à sa valeur d'origine dans la foulée, parce qu'elle était **mal justifiée** (dimensionnée sur un
  temps de lecture alors qu'un `navigate` suivait), mais **le lien de cause n'est pas établi** : le
  réseau du campus était instable au même moment, et le compte de test était utilisé en parallèle par
  son propriétaire — constaté à la messagerie, dont le compteur de non-lus a bougé entre deux runs.
  Le parcours froid INP a ensuite réussi **deux fois d'affilée** sur ce même iPhone, ce qui laisse le
  compte partagé comme explication la plus probable. Le détail est au
  [registre](../defauts-fonctionnels.md).

  **La leçon est de méthode, et elle est le vrai coût de ce jalon** : tous les précédents ont été
  vérifiés sur iPhone, celui-ci est le premier à ne l'avoir été que sur Android — et c'est précisément
  un jalon qui touche aux **attentes**, c'est-à-dire à ce que les deux moteurs de WebView font
  différemment. Vérifier sur une seule plateforme revenait ici à ne pas vérifier. S'y ajoute une
  seconde règle, apprise le même jour : **on ne mesure pas sur un réseau dont on n'a pas d'abord
  vérifié qu'il est sain**, et **on ne mesure pas sur un compte qu'un tiers utilise en même temps**.
- **Aucune mesure chiffrée n'a été prise sur iOS.** Le chrono par step n'existe que sous `__DEV__`, et
  la vérification iOS s'est faite sur un build du store : on y a lu des écrans et des durées perçues,
  pas des cascades. C'est ce qui a rendu le diagnostic de la régression long — trois hypothèses
  successives avant la bonne, là où Android l'aurait donnée en une ligne de journal. Un build de
  développement pour iOS lèverait cette asymétrie ; il est sur la table.
- **Le retour arrière reste une commande** (`npm run blueprints:publish -- --desactiver <nom>`), à une
  réserve près qu'il faut connaître : la 6.0 **n'embarque pas** les Blueprints de Bordeaux INP, arrivés
  par publication après la release. Les désactiver ne les ramène pas à une version antérieure, ça les
  fait **disparaître** — le repli d'un fichier INP est donc une republication de son ancien contenu,
  jamais un `--desactiver`.
