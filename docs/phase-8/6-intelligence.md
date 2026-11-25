# Lot 6 — L'intelligence

> **Ouvert le 2026-11-25**, sur `prochaine-version` pour la 7.0. Trois liens entre des flux que
> l'application lit déjà — l'emploi du temps, les restaurants et leurs menus, ce que la communauté
> signale — calculés sur le téléphone : la journée en une carte, où manger entre deux cours, les
> changements de l'emploi du temps. Le cadre est celui du [plan de la phase](README.md#les-décisions)
> (« L'intelligence », « Signalements sur les cours ») et du [lot 2](2-signalements.md), dont l'état d'un
> lieu et l'attente au RU sont repris tels quels ; cette spécification ne les rouvre pas. Le reste de
> l'intelligence (le trajet serré, où travailler, les échéances, une fermeture face aux cours) est en 7.2.

## La direction

Le Planning répond déjà à « où et quand » cours par cours. La carte du jour répond à la question
d'avant : à quoi ressemble ma journée. Elle se pose en tête du Planning, le jour même, et dit en
chiffres ce que la frise met plusieurs écrans à dérouler : l'heure du premier cours et celle du
dernier, la forme de la journée sur une jauge, ses trous, où manger dans celui de midi, et ce qui a
changé depuis la dernière lecture. C'est un instrument, dans la langue de [7-J](../phase-7/7-j-ecrans.md) :
les heures en chiffres tabulaires, la jauge comme la frise en plus court, aucune phrase qui explique,
aucun point lumineux — l'heure s'y marque d'un trait, comme le repère de la frise. **Elle se tait quand
elle n'a rien à dire** : un autre jour qu'aujourd'hui, un jour sans cours, une journée finie, et une
journée sans trou où rien n'a changé — la frise dit déjà tout de celle-là, juste dessous.

Rien ne part de plus vers la base, et rien ne se compte de plus dans la mesure : tout se calcule sur
l'appareil, à partir de lectures qui existent déjà (l'emploi du temps, les restaurants, les menus, les
signalements du jour, le référentiel des bâtiments).

## Ce qui est à faire

### 1. La journée en une carte

[`CarteDuJour`](../../src/features/Planning/components/CarteDuJour.tsx), composée par
[`carteDuJour.ts`](../../src/features/Planning/services/carteDuJour.ts) (pur) :

- **La jauge** : du premier début au dernier fin de la journée, les cours en segments de leur couleur,
  les trous en creux, l'heure d'un trait de l'accentuation ; au-dessus, l'heure du premier cours en
  grand et celle de la fin ; dessous, le nombre de cours et les trous (« 2 trous, 3 h 10 »). Une
  seule teinte, celle du Planning, les cours superposés fondus et le passé estompé : les couleurs des
  cours y faisaient un rouge et un vert qui se lisaient comme un état (banc du 2026-11-25). Elle se
  montre à partir de deux éléments.
- **Midi**, quand un trou de midi existe et n'est pas passé (section 2).
- **Les changements** du jour (section 3) : une rangée par cours, son intitulé et son heure, puis ce qui
  a changé. Un changement garde la carte, même la journée finie : c'est le seul endroit du jour où un
  cours retiré se lit, les bandeaux le taisent sous elle.
- Les événements du téléphone et du campus occupent la journée comme des cours (ils font les trous),
  mais **le nombre ne compte que les cours** — la règle de la vue semaine (lot 5).

Un **trou** est un écart de 45 minutes ou plus entre deux éléments de la journée ; en dessous, c'est
une pause, que la frise cote déjà. La carte vit dans l'en-tête de la frise, au-dessus des journées
entières : elle défile avec la journée.

### 2. Où manger

[`ouManger.ts`](../../src/features/Planning/services/ouManger.ts) (pur), lu par
[`useOuManger`](../../src/features/Planning/hooks/useOuManger.ts) :

- **Le trou de midi** : un écart entre deux éléments de la journée dont la part comprise entre 11 h 30
  et 14 h dure 45 minutes ou plus. La fenêtre proposée est cette part.
- **Le lieu de référence** est le bâtiment du cours qui suit le trou, résolu comme la fiche de cours le
  résout ([`lieuxDuCours`](../../src/shared/locations/salles.ts), sorti de `CourseScreen` pour ce
  second usage) et placé par le référentiel. Sans bâtiment placé, la rangée dit la fenêtre seule.
- **Un restaurant est proposé** s'il est à moins d'un kilomètre de ce bâtiment (Haversine, aucun
  service d'itinéraire), si ses horaires lus dans la source ([`creneauxDeService`](../../src/features/Campus/communaute/service.ts),
  la lecture du lot 2) ont un créneau qui recouvre la fenêtre d'au moins trente minutes un jour qu'il
  sert, et si la communauté ou l'équipe ne le disent pas fermé aujourd'hui (`ferme`, `ferme_jusqu`,
  établis ou officiels). Deux au plus, **du plus proche au plus lointain** : la distance s'affiche, c'est
  la raison du rang.
- **Chaque proposition dit pourquoi** : son nom, sa distance au bâtiment, le plat recommandé du jour
  s'il y en a un (le classement du lot 2, borné au menu), sinon le premier plat principal du menu ; et
  le créneau du service, ou, quand la communauté en signale une, l'attente à sa place, avec son mot et
  son ton, comme sur la fiche — à midi, l'attente décide plus que l'heure de fermeture, qui reste à un
  toucher : la fiche du restaurant.
- **Pendant le trou, ce qui en reste** : la fenêtre du choix commence à l'heure, au pas de dix minutes,
  pour qu'un service qui ferme dans cinq minutes ne se propose plus ; l'en-tête garde le trou entier.
- **Le coût** : une lecture de la liste des restaurants, les signalements du jour et les états
  officiels (relus par curseur, comme la fiche), puis le menu des deux proposés ; gardés en mémoire
  une demi-heure (la liste avec sa région CROUS), partis seulement le jour même, quand un trou de midi
  est à venir ou en cours, et en automatique : aucun geste ne les demande, et le disjoncteur les retient
  quand l'hôte est en panne (7-C).

### 3. Les changements détectés

[`changements.ts`](../../src/features/Planning/services/changements.ts) (pur) et
[`lectures.ts`](../../src/features/Planning/services/lectures.ts) (le magasin) :

- **Deux lectures se comparent jour par jour.** Chaque lecture fraîche de la vue des favoris — jour ou
  semaine, toutes sources confondues — garde l'empreinte de ses cours : intitulé et type, heures,
  salle telle que la carte l'affiche, identifiant. La suivante se compare à la base gardée.
- **L'identité d'un cours ne repose pas sur l'identifiant de la source**, qui se renumérote (l'occurrence
  Celcat, l'UID d'un export iCalendar). Un cours se retrouve, dans l'ordre : identique en tout ; même
  identifiant ; mêmes heures et même salle (un intitulé renommé) ; même intitulé et même type, quand il
  n'y en a qu'un de chaque côté. Ce qui reste de l'ancienne lecture est **retiré** ; ce qui reste de la
  nouvelle est un ajout, qui ne se signale pas dans ce lot.
- **Trois changements se disent** : la salle, l'heure, le cours retiré. Un cours changé porte sur sa
  carte, jour et semaine, une ligne au ton d'avertissement sous sa salle : « Avant : 10:00–12:00, A22 Salle
  105 » — l'ancienne salle sans les mots sans chiffre qu'elle partage avec la nouvelle (« CREMI - Bât. »).
  Un cours retiré se dit dans la carte du jour, aujourd'hui, et en bandeau au-dessus de la journée les
  autres jours (« Retiré : Algorithmique, 10:00–12:00 »). Un cours masqué par un filtre d'UE ne se
  signale pas.
- **Un changement se voit vingt-quatre heures** après sa détection ; ensuite la lecture qui le portait
  devient la base, et seul ce qui bouge depuis se dit. Une différence qui change — un second changement —
  relance les vingt-quatre heures. Un retour à l'état d'avant efface aussitôt. Les jours passés
  s'oublient.
- **Une lecture à laquelle des favoris manquent ne se compare pas** (`manquants`, un référentiel ADE qui
  ne résout plus un groupe) : leurs cours n'ont pas été retirés, l'application ne sait plus les lire.
- **La base se remet à zéro** quand ce qu'elle compare n'est plus le même emploi du temps : un autre
  établissement, d'autres favoris, un lien d'abonnement rangé (`EVENEMENT_LIEN_EDT`), la purge d'un
  établissement ou des caches de planning, la réinitialisation.
- **La détection se fait à la lecture** : à l'ouverture de l'application, au retour sur l'onglet, à la
  relecture. Aucune lecture en arrière-plan (limite écrite).

## Décisions et pièges

- **La carte ne répète pas la frise.** Le premier cours y est une heure, pas une carte ; le compte à
  rebours reste au repère de la frise. Ce qu'elle ajoute est ce que la frise ne montre pas d'un regard :
  la forme entière de la journée, midi, ce qui a changé.
- **La distance part du bâtiment, pas de l'étudiant** : c'est là qu'il sera à midi, et la position n'est
  ni demandée ni lue par le Planning.
- **Le premier plat principal** est celui de la catégorie dont le nom dit « plat » (« Plats », « Plat
  du jour »), à défaut la première catégorie du midi : une entrée ne dit pas ce qu'on mange.
- **L'empreinte se prend sur la lecture brute**, avant `preparerPourAffichage`, qui mute l'intitulé pour
  en tirer l'UE : deux lectures se comparent toujours sous la même forme.
- **La salle comparée est celle que la carte affiche** (`lignesDuCreneau`), pas une ligne de description
  à un rang : c'est la même pour le jour et la semaine, et un changement est ce que l'étudiant verrait.
- **Une identité par établissement et par favoris** (`<établissement>|<groupes>`) : un abonnement n'a pas
  de groupe, et deux campus à abonnement compareraient sinon l'emploi du temps de l'un à celui de l'autre.
- **Les attentes et les fermetures sont celles du lot 2** (`lireLeLieu`, `lignesSurPlace`) : la carte ne
  calcule pas d'état à sa façon.

## Ce que le banc a corrigé

- **La jauge prenait la couleur des cours** : un rouge et un vert côte à côte se lisaient comme une
  alerte et un feu vert. Une seule teinte, celle du Planning, les cours superposés fondus en une plage,
  le passé estompé comme sa carte dans la frise.
- **La rangée d'un changement écrasait l'intitulé** : une salle s'écrit longue (« CREMI - Bât. A28
  Salle 204 »). Deux lignes, l'intitulé et l'heure, puis ce qui a changé ; et l'ancienne salle perd le
  début qu'elle partage avec la nouvelle.
- **« Avant » passait au-dessus de la nouvelle salle** sur la carte du cours : il vient dessous.
- **Une journée sans trou montrait une carte** qui ne disait que l'heure du premier cours, juste
  au-dessus du repère de la frise qui la dit déjà : elle se tait.

## Ce que la relecture a corrigé

Une relecture du diff complet, sans bloquant ; quatre défauts importants, corrigés et testés :

- **Un cours retiré pouvait ne se dire nulle part** : la carte se taisait une fois les cours restants
  finis, et les bandeaux se taisaient sous elle. Un changement garde désormais la carte.
- **Un second changement pouvait ne jamais se voir** : la détection gardait l'heure de la première, et
  passé vingt-quatre heures la base avançait sans regarder la nouvelle différence.
- **Un favori qu'ADE ne résout plus faisait « Retiré »** sur chacun de ses cours : une lecture partielle
  ne se compare plus.
- **Un restaurant qui fermait dans cinq minutes restait proposé** pendant le trou : la fenêtre suit
  l'heure.

Et des mineurs : « Avant » cède le coin à l'indicateur du carrousel quand il est la dernière ligne ;
une salle retirée seule se dit « Avant : A22 » et non « , avant A22 » ; la liste des restaurants se
garde avec sa région ; les lectures de la carte partent en automatique ; le cadre d'une lecture
(établissement, favoris, jours) se fige avant le réseau ; deux erreurs du magasin se journalisent ; le
rayon du texte « aucun restaurant » vient de la constante.

## Définition de « terminé »

- les trois services purs testés (le trou, le choix des restaurants, la distance, le diff, la carte) ;
- la carte, midi et les changements dans le Planning, en trois langues et deux thèmes ; `tsc`, ESLint à
  zéro, `npm test`, la console construite (`src/shared` bouge) ;
- le banc joué (`ukit`, Android 15) : un matin avec cours, un trou à midi près d'un restaurant ouvert,
  un jour sans trou, un week-end, un changement de salle simulé entre deux lectures, hors ligne ; en
  français et dans une autre langue, dans les deux thèmes ;
- les documents : ce fichier, l'[état](README.md#létat), [planning.md](../features/planning.md).

## Plan de test

1. **Par `npm test`** : le trou de midi (bornes, 45 minutes, sans cours suivant) ; un restaurant ouvert
   pendant la fenêtre, fermé un jour hors portée, illisible ; le rayon, l'ordre, la fermeture signalée ;
   le plat ; le diff (identique, renuméroté, renommé, salle, heure, retiré, deux cours du même
   intitulé) ; la mémoire (première lecture, changement gardé vingt-quatre heures, retour à l'état
   d'avant, identité qui change, jours passés) ; la carte (silencieuse, un cours, la jauge, l'heure).
2. **Sur le banc** : l'horloge simulée du menu de développement pour un matin de cours et midi ; un
   changement de salle par le cache du magasin modifié entre deux lectures ; le réseau coupé.

*Joué le 2026-11-25.* `npm test` : 1 727 tests après la relecture ; la console construite. Sur le banc (`ukit`, Android 15,
build `ukit-dev-2026-11-25-store-review`, pas de dépendance native), le groupe `INF501A1` en favori le
temps des essais, l'horloge de l'émulateur réglée à la main : un matin de cours (09:19, en clair et en
français), la carte, la jauge, « Midi 12:20–14:00 » et deux restaurants à 110 et 340 m du bâtiment A28,
leur plat et leur service ; midi en cours (12:10 puis 12:30, en sombre et en espagnol), le trait de
l'heure, le matin estompé ; hors ligne, le cache daté et la fenêtre de midi seule ; un jeudi sans trou,
la carte tue ; un changement de salle et un cours retiré, puis une heure changée, semés dans la base du
magasin entre deux lectures, marqués sur la carte du cours, dans la vue semaine et dans la carte du
jour ; une lecture du jour puis de la semaine du même jour, sans faux changement. Le banc rendu à son
état d'avant (réglages, heure automatique), les clés d'essai effacées.

**Non joué au banc** : le week-end. Passé le 27 novembre, l'horloge de l'émulateur déplacée à la main a
fait échouer la validation TLS de Celcat (`Chain validation failed`), puis l'a gardée en échec après
retour en arrière ; la chaîne se vérifie pourtant à cette date sur le poste. Un week-end n'a ni cours ni
carte, et c'est vérifié par les tests (`composerLaCarte` sans élément) et par la garde de la carte, qui
ne paraît que sur une journée qui a quelque chose à montrer.

## Limites écrites

- **Aucune lecture en arrière-plan** : un changement se voit quand l'application lit l'emploi du temps,
  pas avant, et aucune notification ne le dit.
- **Un changement ne se voit que sur un jour déjà lu une fois** depuis la vue des favoris, jour ou
  semaine : la première lecture d'un jour est sa base.
- **Un ajout ne se signale pas** (un rattrapage) ; un cours qui change de jour se lit retiré du premier.
- **Les horaires corrigés par la communauté** (lot 2) ne décident pas de l'ouverture : seule la source
  compte, et une ligne d'horaires illisible écarte le restaurant.
- **Sans bâtiment placé** pour le cours suivant (un établissement sans référentiel de lieux, une salle
  inconnue), midi ne propose aucun restaurant.
- **Midi suppose un cours après le trou** : une journée qui finit à midi n'a pas de trou de midi.
- **Un cours retiré ne se dit pas dans la vue semaine** : il n'y a plus de rangée où le marquer ; la vue
  jour le dit.
- **Midi grandit à l'arrivée des restaurants** : la carte paraît avec la fenêtre, et les deux rangées
  s'ajoutent quand la liste et les menus ont répondu ; la frise descend d'autant.
- **Le compte des cours est celui de la source** : deux séries parallèles au même instant (un TD en
  deux salles) comptent pour deux, comme dans la vue semaine.
