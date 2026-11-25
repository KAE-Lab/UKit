# Lot 2 — Les signalements

> **Livré le 2026-11-25** : la migration `20261125030000_signalements.sql` est **en production**,
> recettée en transaction annulée avant et rejouée après ; la page Signalements est **en ligne** sur
> https://kae-lab.github.io/UKit/ depuis `main` ; « Sur place » est sur les trois fiches, joué au banc.
> **Reste** : le chemin attesté sur téléphone (lot 1), et la page des règles, que le lot 7 publie.

> **Ouvert le 2026-11-25**, sur `prochaine-version` pour la 7.0 ; la page de la console sur
> `feat/console-moderation`, fusionnée dans `main`. Les signalements des restaurants, des
> bibliothèques et des bâtiments, l'attente au RU, le plat recommandé, la modération. Le cadre est celui
> du [plan de la phase](README.md#les-signalements-type-par-type) et du [lot 1](1-base-communautaire.md),
> que cette spécification ne rouvre pas.

## La direction

Un étudiant ouvre la fiche d'un lieu pour savoir s'il peut y aller. Ce que les autres ont vu sur place
y tient en une section, « Sur place », au-dessus du menu, des horaires ou des salles : une ligne par
fait, dite comme le plan l'écrit — « Fermé aujourd'hui », puis « selon 4 étudiants, il y a 20 min » —,
avec le point de son ton. Le geste de signaler est la dernière rangée de cette section, toujours là.
Rien n'y est un texte libre : des types proposés par l'application, une date, des heures, un plat pris
au menu. La console lit les mêmes voix et le même calcul ([`etat.ts`](../../src/shared/communaute/etat.ts)),
et l'équipe y modère.

## Ce qui est à faire

### 1. Le vocabulaire

Vingt sujets, en lignes de `sujets` par la migration
[`20261125030000_signalements.sql`](../../supabase/migrations/20261125030000_signalements.sql), copiés
dans [`vocabulaire.ts`](../../src/shared/communaute/vocabulaire.ts) ; un test garde les deux égaux, et la
vue lisible avec eux.

| Lieu | Sujets | Famille | Valeurs |
|---|---|---|---|
| Restaurant | `ferme`, `self_ferme`, `cafeteria_fermee`, `menu_faux` | jour | `oui`, `non` |
| Restaurant | `ferme_jusqu` | date | `oui`, `non`, avec sa fin |
| Restaurant | `horaires` | correction | une forme : l'empreinte des horaires corrigés, puis `midi`, `soir` |
| Restaurant | `attente` | direct | `fluide`, `attente`, `tres_long` |
| Restaurant | `places`, `izly` | direct | `oui`, `non` |
| Restaurant | `plat` | jour, pour le plaisir | une forme : un plat du menu du jour |
| Bibliothèque | `fermee`, `fermeture_partielle` | jour | `oui`, `non` |
| Bibliothèque | `fermee_jusqu` ; `horaires` | date ; correction | `oui`, `non` ; `jour` |
| Bibliothèque | `ambiance` | direct, pour le plaisir | `calme`, `papote` |
| Bâtiment | `acces_bloque`, `ferme`, `chauffage`, `wifi` | jour | `oui`, `non` |
| Bâtiment | `ferme_jusqu` | date | `oui`, `non` |

`non` est la **normale** : le lieu tel que sa source le dit. C'est la réponse « non » à « toujours vrai
? » ; un état établi sur la normale ne s'affiche pas, il éteint le signalement sans en créer un autre.
La cible est celle du lot 1 : le code Croustillant, l'identifiant Affluences, `<établissement>/<code>`.

### 2. Les saisies

- **Fermé jusqu'au…** : le jour de fin, au sélecteur du système, de demain à trente jours ; la base
  borne de son côté (`fin_max_jours`, qui vaut au moins trente en production le 2026-11-25).
- **Les bons horaires**, service par service : midi et soir pour un restaurant, la journée pour une
  bibliothèque, deux heures ou « fermé » chacun ([`horaires.ts`](../../src/shared/communaute/horaires.ts)).
  Les heures proposées au départ se lisent en retrait et ne partent pas : seul un service touché entre
  dans la correction.
  La valeur porte l'**empreinte des horaires que la source affichait** : la correction ne se montre
  plus dès que la source publie autre chose. C'est ainsi que « jusqu'au changement de la source » se
  tient sans que la base connaisse la source ; sa validation dans la console est un état officiel du
  même sujet, de la même valeur. Une correction d'une autre source n'entre pas dans l'état
  ([`lieu.ts`](../../src/shared/communaute/lieu.ts), `empreinteDesHoraires`), officielle comprise : elle
  ne rend pas incertaine la correction de la source affichée.
- **L'attente**, à trois niveaux, chacun son mot et sa couleur (fluide, ça attend, très long). La
  rangée « Ça attend ? » se pose en tête de la section à l'ouverture de la fiche d'un RU **aux heures de
  son service lues dans la source** — celles du self quand la source le nomme, pas la cafétéria ouverte
  tout le jour —, un quart d'heure autour, la portée de jours respectée, à l'heure de l'appareil ; et, si la
  position est accordée, seulement à moins de 400 m, calculé sur l'appareil
  ([`service.ts`](../../src/features/Campus/communaute/service.ts)). Elle attend que la position soit
  lue, pour ne pas apparaître puis disparaître. Hors service, l'attente reste à signaler depuis la
  feuille.
- **Le plat recommandé**, choisi dans le menu du jour : un par appareil, par restaurant et par jour, la
  voix suivante remplace la précédente. Le classement compte les voix, par poids
  ([`lieu.ts`](../../src/shared/communaute/lieu.ts)), et ne retient **que les plats au menu du jour** :
  un texte forgé ne s'affiche jamais.

### 3. L'affichage

[`presentation.ts`](../../src/features/Campus/communaute/presentation.ts), pur, sujet par sujet :

- **établi** : la valeur, « selon N étudiants, il y a X » — les appareils d'accord, la dernière
  confirmation ;
- **incertain** : la valeur et « avis partagés » ; incertain sur la normale, c'est la voix contraire
  qui se montre ;
- **une seule voix** se lit en retrait (texte gris, le point garde son ton), comme l'incertain ;
- **le non attesté** se lit plus en retrait encore, « non vérifié », seul et seulement quand aucune voix
  ne dit rien ;
- **« pas d'info depuis 40 min »** sous « Ça attend ? », quand la dernière attente du jour a fini de
  valoir ;
- **« toujours vrai ? »** sous un état qui dure, vieux d'une heure ou incertain, avec « Oui » (la même
  valeur) et « Non » (la normale, ou la source juste pour une correction, avec la fin de l'état daté) ;
- **l'officiel passe devant**, même sur la normale (« Ouvert aujourd'hui, officiel ») — c'est la réponse
  de l'équipe à un faux signalement —, et compte à côté les voix qui disent autre chose.

La feuille se ferme dès que l'envoi part, sans l'attendre : le toast du résultat ne se dessine pas sous
elle. Une contribution acceptée se dit par un toast (« Merci, c'est signalé. »), une contribution non
attestée aussi (« Envoyé. Cet appareil n'a pas pu être vérifié… »), comme un plafond, un appareil
bloqué ou un échec ([theme.md](../theme.md#les-décisions-durables) : un geste ne se confirme pas par un
dialogue). Le remplissage d'une bibliothèque reste celui d'Affluences.

### 4. Le rappel des règles

Une fois, d'un toucher, à la **première contribution** : « Règles de la communauté », trois lignes,
« Compris » qui envoie, et le lien vers la page. Depuis la feuille, la feuille le montre elle-même ;
depuis un geste de la carte, un `Dialogue`. La marque vit sur l'appareil
([`rappelDesRegles.ts`](../../src/features/Campus/communaute/rappelDesRegles.ts)) ; une réinstallation
la perd avec la clé de l'appareil. **L'adresse de la page** est une constante,
`URL.REGLES_DE_LA_COMMUNAUTE` = `https://ukit-bordeaux.fr/communaute`
([`urls.ts`](../../src/shared/constants/urls.ts)), et non une adresse du catalogue, qui varie d'un
établissement à l'autre : **le lot 7 publie la page à cette adresse**.

### 5. Les états officiels

La table `etats_officiels` : un sujet, une cible, une valeur du vocabulaire, le dernier jour où il vaut.
Un déclencheur juge le vocabulaire et tire `expire_le` de la fin (le soir de ce jour, à Paris, cent vingt
jours au plus) ; un admin écrit, l'équipe lit tout, l'application lit ce qui vaut encore, **en entier à
chaque ouverture de fiche** — un état retiré est supprimé, et seule son absence le dit. Le journal les
trace par son déclencheur.

### 6. La modération

La page **Signalements**, dans la section Suivre de la console : une entrée « Communauté » ne se
justifie pas pour une page ; elle viendra quand le lot 4 apportera les sondages et la boîte à idées.
Période (aujourd'hui, 7 ou 30 jours : ce qui s'est écrit pendant la période, **et tout ce qui vaut
encore**, d'où qu'il date — l'état que l'application montre), lieu, type et état en filtres ; les chiffres de la période ; puis
un lieu par carte, le plus actif d'abord : l'état de chaque sujet tel que l'application le montre, avec
« Rendre officiel » ou « Retirer l'officiel », un état officiel à publier, et les signalements ligne par
ligne — quand, type, valeur, voix, état, l'auteur bloqué ou combien il en a écrit ce jour-là. Un sujet
direct (attente, places, Izly, ambiance) ne se rend pas officiel : il ne vaut que vingt-cinq minutes, et
un officiel le figerait jusqu'au soir.

Trois portes, `security definer`, qui vérifient le rôle elles-mêmes :

| Porte | Qui | Ce qu'elle fait |
|---|---|---|
| `signalements_a_moderer(p_depuis)` | l'équipe | les colonnes que l'équipe lit déjà, plus `auteur_bloque` et `auteur_du_jour` ; trente et un jours au plus ; **jamais la clé** |
| `moderer_signalement(p_id, p_geste)` | un admin | `masquer` (le point de réputation qu'elle avait valu se retire, une fois : sa confirmation s'efface) ou `retablir` (active, ou remplacée si l'appareil a parlé depuis ; jamais pour un appareil bloqué) |
| `bloquer_auteur(p_id, p_bloque)` | un admin | l'appareil **désigné par l'un de ses signalements** : bloqué au jour, réputation à zéro, voix vivantes masquées ; débloquer ne rétablit rien |

Chaque geste s'écrit au journal par la porte, sans la clé : le déclencheur `journaliser` copierait la
ligne entière. Les droits sont ceux de 7-H : tout ce qui n'est pas une annonce est un geste d'admin, et
la page se lit en lecture seule pour les autres rôles.

## Décisions et pièges

- **La valeur d'une voix masquée reste lisible** (la décision que le lot 1 laissait) : l'application ne
  la montre pas, la console en a besoin pour juger et rétablir, et la lecture publique la garde tant
  qu'elle aurait valu, comme toute voix — jusqu'au soir pour le jour et le direct, jusqu'à sa fin pour
  un daté ou une correction. Les valeurs sont un vocabulaire fermé ; la seule qui pourrait porter un
  texte, le plat, ne s'affiche que si elle est au menu du jour, et ne vaut que le jour.
- **Masquer est le retrait.** Supprimer une ligne ne parviendrait à aucun appareil : la lecture ne
  redemande que ce qui a bougé (`maj_le`), et la ligne resterait affichée jusqu'au soir. Il n'y a donc
  pas de geste « supprimer ».
- **Un appareil se désigne par un signalement**, jamais par sa clé, que la console ne lit pas (lot 1) ;
  le journal porte `signalement <id>`.
- **La fonction `communaute` ne change pas** : elle ne connaît pas les sujets, que la base juge seule,
  et un appareil bloqué y était déjà refusé (`appareil_bloque`). Aucun redéploiement.
- **Les mots de l'application** sont des clés calculées (`SIGNAL_<SUJET>_<VALEUR>`), le seul transtypage
  légitime ([i18n.md](../i18n.md)) ; [`cles.test.ts`](../../src/features/Campus/communaute/cles.test.ts)
  vérifie à la place du compilateur que chacune existe dans les trois langues. La console a ses mots,
  en français, et un test pour qu'aucun sujet n'en manque.
- **La console importe `etat.ts`, `lieu.ts`, `vocabulaire.ts` et `horaires.ts`** : `main` reçoit donc
  ces modules purs avec la page, sans que l'application de `main` les lise. `etat.ts` passe à un
  `reduce` pour compiler en mode strict, sans changer de comportement (ses tests).
- **Un état se recalcule à chaque demi-minute** sur la fiche (« il y a 20 min » reste vrai), mais la
  base ne se relit qu'à l'ouverture et après un envoi : le réseau est compté (7-A).
- **Le bâtiment prend l'établissement actif** dans sa cible : deux établissements qui partagent un
  campus séparent leurs voix sur un même bâtiment (limite ci-dessous).

## Définition de « terminé »

- la migration recettée en transaction annulée sur la production, puis appliquée, la recette rejouée ;
- « Sur place » sur les trois fiches, dans les deux thèmes et les trois langues, `tsc`, ESLint à zéro,
  `npm test`, la console construite ;
- la page Signalements en ligne depuis `main`, la recette des droits jouée ;
- le banc joué : la section, la feuille, le rappel, un envoi non attesté en retrait, un état établi semé ;
- les documents : ce fichier, [README](README.md#létat), [supabase/README.md](../../supabase/README.md),
  [donnees-et-persistance.md](../donnees-et-persistance.md), [guide-console.md](../guide-console.md),
  les fiches de [campus-crous.md](../features/campus-crous.md) et de ses voisines.

## Plan de test

1. **En SQL, en transaction annulée sur la production**
   ([`recettes/signalements.sql`](../../supabase/recettes/signalements.sql)) : les vingt sujets ; une
   valeur hors vocabulaire, des horaires impossibles, un plat sur deux lignes, un daté sans fin
   refusés ; la durée d'une correction ; les états officiels — `anon` et un lecteur refusés, un admin
   publie, la fin tirée et journalisée, une valeur hors vocabulaire, une fin passée, trop lointaine, un
   sujet inconnu refusés, `anon` ne lit que ce qui vaut, l'équipe tout ; la lecture de la modération
   refusée à `anon` et hors de l'équipe, sans colonne de clé, l'auteur et son compte du jour ; masquer
   (curseur avancé, journal sans clé, point retiré, valeur encore lisible par `anon`), deux fois sans
   effet, rétablir actif ou remplacé, un geste inconnu ; un lecteur ne modère pas ; bloquer (voix
   masquées, jour seul, contribution suivante refusée, rétablissement refusé), débloquer, et la
   contribution suivante acceptée.
2. **Par `npm test`** : le vocabulaire contre la migration et la vue lisible ; les horaires (empreinte,
   écriture, relecture, refus) ; le lieu (officiel, fin, dernière voix, classement borné au menu) ; la
   présentation règle par règle ; les heures de service et la proximité ; les clés des trois langues ;
   la modération de la console (lecture, lieux, filtres, comptes, fin d'un officiel promu) et ses mots.
3. **Sur le banc** (`ukit`, Android 15), dans les deux thèmes, en français et en espagnol : chaque fiche
   montre « Sur place » ; la feuille propose les types du lieu, la date, les heures, le plat ; le rappel
   à la première contribution ; un envoi part non attesté et se lit « non vérifié » ; un état semé
   attesté se lit établi, incertain, avec « toujours vrai ? » ; un officiel passe devant.
4. **Dans la console locale**, un compte jetable : la page, les filtres, masquer, rétablir, bloquer,
   débloquer, publier et retirer un officiel, à 1 440 et 390 pixels.

*Joué le 2026-11-25.* La recette SQL, quarante-cinq vérifications conformes en transaction annulée avec
la migration, puis sans elle une fois appliquée ; celle du lot 1 rejouée de même, quatre-vingt-six. Par
l'API publique : la lecture des états officiels rend `[]`, leur écriture et les trois portes de la
modération sont refusées à la clé publiable (42501), `sujets` reste illisible. `npm test` : 1 561 tests.

Sur le banc (`ukit`, Android 15, build `ukit-dev-2026-11-25-app-integrity`), avec des voix attestées
semées sur le restaurant 24 par des appareils d'essai — des lignes écrites par `psql`, effacées après,
appareils compris, avec les contributions de l'émulateur et les états officiels d'essai : en sombre et
en français, puis en clair et en espagnol, la section montre l'officiel « Ouvert aujourd'hui » devant
« 1 étudiant signale autre chose », la voix seule en retrait avec « Toujours vrai ? », l'incertain, la
correction d'horaires de la source affichée, Izly établi par deux voix, le plat recommandé ; la feuille
propose les types du lieu, la date, les heures (une première version cassait la ligne à 360 points :
service et « Fermé » dessus, heures dessous), le sélecteur d'heure du système ; le rappel des règles
s'affiche dans la feuille à la première contribution ; l'envoi part non attesté, le toast le dit, la
ligne se lit « non vérifié ». À midi simulé, sans position, « Ça attend ? » se pose avec la valeur de la
communauté choisie ; avec la position du banc, en Californie, elle ne se pose pas. La bibliothèque garde
le remplissage d'Affluences au-dessus de la section ; le bâtiment écrit sa cible `bordeaux/A28`.

Dans la console locale (compte jetable admin, puis lecteur, supprimé après de l'authentification et
d'`editeurs`) : la page, les chiffres, les cartes de lieu ; bloquer l'appareil de l'émulateur par son
signalement (« 3 voix masquées », journal `signalement <id>` sans clé), le débloquer ; masquer, rétablir ;
rendre officiel, publier par le formulaire (lu ensuite par la clé publiable), retirer ; le lecteur en
lecture seule, boutons inertes. La page débordait à 390 pixels (un texte caché de l'en-tête du tableau,
positionné hors de la carte qui défile) : corrigé, 390 pixels de large ensuite.

## Limites écrites

- **Le chemin attesté n'est pas joué au banc** : un émulateur échoue à l'intégrité (lot 1). L'état
  établi s'y juge sur des lignes semées.
- **Un étage ou une salle** se signale sans dire lequel : Affluences ne publie pas la liste des espaces
  d'une bibliothèque, et un nom libre est exclu.
- **Une correction d'horaires de bibliothèque** porte sur une plage, celle du jour ; une journée coupée
  en deux plages se corrige en une seule.
- **Le bâtiment par établissement actif** : un bâtiment partagé par deux établissements a deux cibles.
- **La console nomme un lieu par l'identifiant de sa source** (« Restaurant 2302 »), sans son nom : les
  noms vivent chez Croustillant et Affluences, que la console ne lit pas.
- **La section grandit à la première lecture** quand le lieu a quelque chose à dire : ses rangées
  entrent en fondu, et ce qui suit descend d'autant.
- **Le rappel des règles depuis un geste de la carte** (« Ça attend ? », « toujours vrai ? ») passe par le
  `Dialogue` commun, qui n'a pas été vu au banc : la première contribution y est partie de la feuille.
