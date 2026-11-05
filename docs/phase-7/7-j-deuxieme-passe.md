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
- [ ] C
- [ ] D
- [ ] E
- [ ] F
