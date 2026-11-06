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
- [ ] T7
