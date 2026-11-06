# 7-J, la troisième passe

Ouverte le 2026-11-06 sur la review de la deuxième passe ([7-j-deuxieme-passe.md](7-j-deuxieme-passe.md)).
Le propriétaire juge les titres, le défilement et les icônes « parfaits » ; il demande ce qui reste
en dessous du nouveau niveau de l'application.

## Les critères de fin

| | Critère |
|---|---|
| T1 | L'accueil des Réglages ne porte ni interrupteur ni texte d'aide : chaque préférence a sa page, qui explique et qui bascule |
| T2 | Les contrôles au niveau du reste : l'interrupteur, les boutons d'action (« Réserver »), les barres de progression ; le curseur des Réglages disparaît avec la page Notifications |
| T3 | Le repère de l'heure du Planning comble la place laissée par le point ; plus de point sous aujourd'hui dans le ruban |
| T4 | Sur un écran poussé, le fondu commence sous le titre de la barre, comme sous un grand titre |
| T5 | Un menu de restaurant se lit d'un coup d'œil, sans couleur décorative ni icône devinée |
| T6 | Les cartes Campus revues : ce qui n'est pas au niveau (l'horaire brut tronqué) est repris |
| T7 | Le jeu : pas de copie du jeu du dinosaure de Chrome (personnage et graphismes d'un jeu existant) ; des options au propriétaire |

« Les barres » de la review s'entendent comme les barres de progression : affluence d'une BU,
parcours froid, chargements.

## L'avancement

- [x] T1 — `166df3a` : l'accueil en rangées, cinq pages (notifications, apparence, agenda,
  confidentialité, démarrage) servies par l'écran des Réglages, le délai en liste cochée, le curseur
  retiré. Consigné en chemin : « Ouvrir sur le groupe favori » n'a aucun effet.
- [x] T2 — les boutons d'action (ressort, haptique, matière d'une teinte, `accentProfond`),
  l'interrupteur (poignée étirée, ressort), les jauges (remplissage animé, dégradé du logo pour le
  parcours froid). Vérifié sur `ukit` après rechargement complet : un rafraîchissement à chaud ne
  propage pas une couleur ajoutée à la palette.
- [x] T3 — l'heure dans une pastille pleine d'où part le trait ; le point sous aujourd'hui retiré du
  ruban (et des bandeaux des fiches, qui partagent la case). Vérifié sur `ukit` à 12 h 40 simulées,
  pendant une pause : « 12:40 », puis « prochain cours dans 50 min ». Le menu de développement remet
  l'heure réelle à sa fermeture : pour garder une heure simulée, on le réduit.
- [x] T4 — le conteneur du fond de la barre poussée descend de la hauteur du fondu
  (`headerBackgroundContainerStyle`) : fond plein sur toute la barre, fondu dessous, le dégradé
  toujours dans les bords de son parent. Vérifié sur `ukit`, liste des restaurants : la photo se fond
  sous les boutons, le titre reste entier.
- [x] T5 — la catégorie en demi-gras couleur du texte, les plats derrière une puce (retour à la ligne
  aligné sur le texte), les sous-titres de la source en gris. Vérifié en sombre et en clair ; capture
  de la doc remplacée.
- [x] T6 — les cartes revues : leur structure (photo, nom, étoile, lieu, distance, état) tient ; ce
  qui ne tenait pas, c'était l'horaire brut tronqué d'un restaurant, désormais résumé
  (`resumeDHoraires`, testé), et la distance en pastille d'accent sur chaque carte, passée au ton
  neutre.
- [ ] T7 — en attente du propriétaire : la copie du jeu du dinosaure de Chrome n'est pas faite (le
  personnage, le décor et les graphismes appartiennent à un jeu existant de Google). Trois options
  lui sont proposées : un coureur en pixel art avec nos propres personnage et décor, la mécanique
  restant la même ; le jeu actuel poli ; ou plus de jeu, une attente sobre.

## Les retouches après la review du 2026-11-06

Décisions du propriétaire : le jeu en pixel art (option A de la passe), « Ouvrir sur le groupe
favori » retiré, la barre d'Android 9 laissée au prochain build natif, le U en trait fin gardé pour
le site, les deux défauts consignés corrigés, trois règles ajoutées à `~/.claude/rules/design.md`.

- [x] le réglage mort retiré (`e90259b`) ; « Invalid date » corrigé (`89d8c1d`) ; la réinitialisation
  passe par la déconnexion (`fde2460`), vérifiée au banc
- [x] de l'air sous la barre des écrans poussés (`b26fffb`)
- [x] le glissement entre onglets depuis la page, les listes gardant la main (`8afda2f`), vérifié sur
  Android ; reste à juger sur iPhone
- [x] le petit jeu jouable au fond de « À propos », même record (`8295656`)
- [x] le jeu en pixel art : planche de trois directions montrée, **Encre** choisie (« plus beau que
  la planche… une version améliorée du jeu du dino, pas une version éco+ »). Un renard à l'écharpe
  bleue, trois plans de décor, la nuit en sombre, la secousse et « Nouveau record » ; la scène
  s'agrandit avec le plateau, bornée pour qu'un obstacle mette plus d'une seconde à traverser.
  Vérifié au banc en clair et en sombre, en attente, en course, en saut et à la chute ; non vus :
  « Nouveau record » (une partie au doigt), le plateau de 150 points de la connexion (dossier en
  cache), l'iPhone
- [x] le délai des rappels au pas, « − 15 min + » (`fef2625`) ; les barres flottantes de l'iPhone
  décollées du bord (`46f139a`)

Portes de la passe : `tsc`, ESLint sans avertissement, 1 158 tests, parité 13/13, export Android et
iOS. Non refait à cette passe : le format de l'A8, l'anglais et l'espagnol au banc, l'iPhone.

## Ce qui a été tranché sans planche

- **Les pages des Réglages sont servies par l'écran des Réglages** plutôt que par cinq écrans neufs :
  ses gestes (permissions, confirmations, relecture) restent écrits une fois.
- **Le délai des rappels au pas, « − 15 min + »**, après une liste cochée de sept valeurs que le
  propriétaire trouvait trop chargée : une rangée, la valeur au milieu, et un ancien délai hors pas
  calé sur le voisin.
- **La scène d'Encre s'agrandit d'un bloc** (une échelle sur la vue) plutôt que de redessiner chaque
  sprite à la taille du plateau : la physique compte en points de scène et ne change pas. Sur iPhone,
  l'agrandissement d'une vue peut adoucir les bords des pixels : à regarder au passage iPhone.
- **La matière du bouton plein est d'une seule teinte** (l'accent vers `accentProfond`) : le dégradé
  violet-bleu reste un tic ; celui-ci donne de la profondeur sans seconde couleur.
- **« Les barres » s'entendent comme les barres de progression.**
