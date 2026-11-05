# 7-J, la deuxième passe

> **Ouverte le 2026-11-05**, sur la review du propriétaire du produit après la
> [première passe](7-j-ecrans.md#la-livraison-du-2026-11-05) : « fais comme si tu arrivais de zéro, et
> refais monter toute l'application d'un cran ». Même délégation du jugement de design, même
> [banc](../qualite.md#le-banc-android). Publication : **6.3**.

## La review, en critères de fin

Chaque ligne se coche à la livraison, ou s'écrit en limite.

| | Critère | Où |
|---|---|---|
| R1 | **Un seul en-tête** : fixe, posé sur le fond de la page, sans grand titre qui s'en va ni titre compact ; le contenu passe dessous **en fondu**, jamais en coupe sèche | les onglets, les écrans poussés, les listes |
| R2 | **Les couleurs de l'identité, seulement** : la barre d'onglets à l'accent seul, plus d'arc-en-ciel d'icônes | barre d'onglets, Réglages, et partout où le principe s'applique |
| R3 | **Des icônes premium** | toute l'application |
| R4 | **Chaque écran passe à la refonte**, y compris ceux que la première passe a laissés | l'inventaire ci-dessous |
| R5 | **La Scolarité remaniée à fond** | l'onglet, connecté et non connecté |
| R6 | **Le parcours froid repris**, au-delà du jeu | l'écran de chargement de la Scolarité |
| R7 | **Le jeu** : un personnage et un décor plus soignés ; un appui n'importe où, hors des boutons, fait sauter | le jeu de la connexion |
| R8 | **Le Planning** : l'heure de fin en bas de la carte ; le repère de l'heure sans point lumineux ; la vue semaine refaite | le Planning |
| R9 | **Les trois propositions acceptées** : le carrousel suit la carte étoilée ; les fiches portent leur nom dans la barre ; « Plus tard » quitte l'accueil | Campus, fiches, accueil |
| R10 | **Pas de Fig. 01 dans l'application** : le U du logo à l'accueil | accueil, [identité](../identite.md) |
| R11 | La règle « pas de point lumineux » dans les règles de design | `~/.claude/rules/design.md`, fait le 2026-11-05 |

**Les écrans que la première passe n'a pas touchés**, relevés dans le diff : les listes Restaurants,
Bibliothèques et Salles libres, le compte universitaire, les documents et leur lecteur, le navigateur
de la Scolarité, les filtres, les calendriers du téléphone, le lien d'emploi du temps. Et ceux que seul
7-I avait touchés : les fiches d'un menu, d'une bibliothèque, d'un bâtiment, d'une annonce.

## Les décisions

| Sujet | Décision |
|---|---|
| **L'en-tête** | Fixe, pour tous : le titre ne part plus au défilement. La teinte de la section reste **dans** l'en-tête et s'y fond, à son bas, dans le fond uni de la page ; sous l'en-tête, un fondu de ce même fond uni paraît dès que le contenu passe dessous. Référence : le *scroll edge effect* d'iOS 26, qui fond le contenu sous les barres. Le flou progressif d'iOS demanderait un module natif, donc un build : le fondu, exact parce qu'il part d'une couleur unie, en tient lieu. |
| **Les couleurs** | L'accent seul pour la barre d'onglets et son bouton ; les icônes des Réglages sans carré de couleur. La teinte de chaque section se prend **le long du dégradé du logo**, du bleu au violet, au lieu de quatre couleurs du système : le Planning au bout bleu, la Scolarité au bout violet, Campus entre les deux. Les couleurs sémantiques (ouvert, fermé, erreur) et celles des cours, qui viennent de la source, restent. |
| **Les icônes** | Une famille au trait, la même partout : [Lucide](https://lucide.dev), trait de 1,75, via un composant `Icone` unique. Ce qui faisait « prototype » : le glyphe de Material Design, pensé pour Android, des pleins et des contours mêlés, et des carrés de couleur. Dépendance ajoutée : `lucide-react-native` 1.61.0 (ISC, JavaScript seul sur `react-native-svg`, déjà dans le build), chaque icône importée seule. Un nom venu des données que la table ne connaît pas retombe sur Material Design. |
| **Le repère de l'heure** | Un trait et l'heure en chiffres, sans point ni halo. |
| **Le fond fixe** | Le fond de section ne glisse plus. Confiné à l'en-tête, un bandeau d'une centaine de points, son glissement d'une période par minute ne se percevait plus ; et sa couche tournée de 3 000 points, posée au-dessus d'une liste qui défile, faisait tomber le rendu logiciel de l'émulateur au premier défilement (isolé par élimination le 2026-11-05) : un coût de composition que l'A8 payait aussi. |
| **Le planning d'un groupe** | Sa barre de pile reste transparente (`fondAuDefilement: false`) : il porte son propre en-tête fixe, que le fond de la barre recouvrait. |

## Les lots

| Lot | Contenu |
|---|---|
| **A. L'en-tête et les couleurs** | l'en-tête fixe et son fondu, sur les onglets, les écrans poussés et les en-têtes maison ; la barre d'onglets à l'accent ; les teintes le long du dégradé ; le repère de l'heure |
| **B. Les icônes** | `Icone` et sa table, toute l'application migrée |
| **C. Le Planning** | l'heure de fin en bas, la vue semaine |
| **D. La Scolarité** | l'onglet, le parcours froid, le jeu |
| **E. Les écrans laissés** | les fiches et leur nom dans la barre, les listes, le compte, les documents, les filtres, les calendriers, le lien d'emploi du temps, les modales ; le carrousel qui suit l'étoile ; « Plus tard » ; le U de l'accueil |
| **F. La passe à neuf** | chaque écran revu dans les deux thèmes et aux deux formats, comme un premier regard ; les portes, les captures, la documentation |

## L'avancement

Tenu ici, lot par lot, pour qu'une reprise sache où en est la passe.

- [x] A — l'en-tête fixe et son fondu sur les onglets, le Planning et les écrans poussés ; la barre
  d'onglets à l'accent ; les teintes le long du dégradé ; le repère sans point. La Scolarité et les
  bandeaux fixes des fiches (menu, salles) suivent avec les lots D et E.
- [x] B — `Icon` dessine en Lucide par une table de 133 noms, le trait constant ; plus aucun emploi
  direct de Material ; les Réglages sans carrés de couleur ; la mention de licence suit (ISC).
- [x] C — l'heure de fin en bas de la carte ; la vue semaine en agenda (`AgendaDeLaSemaine`,
  `agenda.ts` testé), les jours repliables et `react-native-collapsible` retirés.
- [x] D — l'onglet (en-tête fixe, salutation en page, instrument à trois chiffres, rangées neutres,
  « Bientôt disponible ») ; le parcours froid (pourcentage en grand, étapes cochées, jeu en grand) ;
  le jeu (le « i » et son corps, décor en parallaxe, quatre obstacles, appui n'importe où). À revoir
  en passe F : le formulaire en session, au format de l'A8.
- [x] E — l'accueil sur le U du logo, sans « Plus tard » (`5b9f574`) ; les fiches Campus (bandeau
  de cases partagé, nom du lieu dans la barre, menu sur une carte par repas, salles par étage,
  intertitres sans couleur, `4655ae6`), et leurs entités HTML décodées (`6bb55ea`) ; le carrousel qui
  suit l'étoile (`b08caf2`), et en chemin la bande morte au-dessus de la barre d'onglets (`6daac3d`) ;
  les intertitres en casse de phrase, d'un seul style (`e3dd7cb`) ; le compte, la recherche de
  groupes, les documents (`eb23a06`) ; les propositions et le navigateur intégré (`e817917`). Non vus
  au banc : le choix des calendriers du téléphone (permission d'agenda), le lien d'emploi du temps
  (absent pour le Collège ST), la visionneuse, la modale « Bientôt » et celle des propositions (code
  relu, menu de développement absent du banc).
- [x] F — revu au banc (`ukit`, Android 15) en clair puis en sombre, police 1,3 : onglets, fiches,
  compte, groupes, documents, navigateur. Portes : `tsc`, ESLint sans avertissement, 116 fichiers et
  1 163 tests, parité 13/13, export Android et iOS. Non refait à cette passe : le format de l'A8
  (360 points), l'anglais et l'espagnol au banc (clés présentes et typées), l'iPhone.

## Ce qui a été tranché sans planche

- **Les deux services « Bientôt disponible » restent deux rangées** : leur nom est tenu secret, mais
  chacune ouvre son propre service en attendant ; les fusionner perdrait ce geste.
- **Les légendes de jour du ruban gardent leurs capitales** (« JEU »), comme un calendrier, et les
  badges posés sur une image aussi : ce ne sont pas des intertitres.
- **La bande morte au-dessus de la barre d'onglets est corrigée hors lot** : elle bloquait le geste du
  lot E3, et c'est un défaut d'interface du périmètre de la passe.
