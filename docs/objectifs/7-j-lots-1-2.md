# Objectif : 7-J, lots 1 et 2 (Planning, Scolarité), à ouvrir un par session

Publication 6.3. Un seul lot ouvert à la fois ; chaque lot se spécifie à son ouverture, avec le relevé de 7-I en main (`git show doc-v1:docs/inventaire-mouvement.md`). Règle d'ouverture et défauts : voir `docs/objectifs/7-j-lot-3-reglages.md` (même règle, mêmes limites). Fichier jetable : supprimé quand les deux lots sont livrés.

## Lot 1 : Planning, jour et semaine (le cœur de l'application, l'écran le plus vu)
- Fichiers : `src/features/Planning/views/DayView.tsx`, `components/ScheduleList.tsx`, `DayViewHeader.tsx`, `CourseRow.tsx`.
- Écran de référence de 6-K : y toucher rouvre le contrat « les écrans de référence rendent à l'identique avant et après ». L'assumer explicitement dans la spécification du lot, pas le découvrir en relisant.
- Pièges déjà payés, à ne pas rouvrir : le carrousel de cours porte trois formes essayées puis défaites, gravées dans `CourseRow` ; la vue semaine n'affiche aucune description, verrouillé par un test.
- Politique stale-while-revalidate : le jour demandé s'affiche depuis le cache tout de suite, le réseau rejoue derrière. La fenêtre de fraîcheur de 60 s n'en est que la moitié invisible ; reste à dessiner ce que l'écran montre pendant qu'il relit.
- Si la session le décide : visionneuse d'images maison sur `expo-image` et gesture-handler (`react-native-image-viewing` reste en 6.2.2, alimentée en URL rendues).
- À trancher dans ce lot : `background` et `courseBackground` sont identiques dans les deux thèmes (deux clés pour un même fond).

## Lot 2 : Scolarité (le plus riche en attentes longues)
- Parcours froid, widgets qui se remplissent un par un, barre de progression. Le socle de l'écran est propre (session de formes du 2026-08-25), seul le mouvement manque.
- Défaut déjà rangé pour cette version par décision du propriétaire du produit : la barre du parcours froid paraît se figer vers 30 % (palier « connexion » à 34 % pour 18 s annoncées, le froid dure 14 à 25 s). La recalibrer sur les durées mesurées ; « c'est du rythme, pas du comportement ».
- La connexion universitaire (14 à 26 s selon le portail) s'occupe : un mini-jeu au pouce pendant qu'elle se joue, qui s'efface à l'arrivée du dossier. C'est la touche créative de la version, sur le seul écran où l'attente est longue par nature.
- Voir aussi `docs/defauts-fonctionnels.md` (parcours froid INP lent, emploi du temps personnel INP muet).

## Transversal aux lots 1 à 3
- Passe « voix éditoriale » : états vides et journées libres, sympathique, subtile, un rebondissement par écran, jamais plus (une phrase qui fait sourire une fois fatigue à la dixième ouverture : se juge sur la durée).
- Captures « avant » et « après » à refaire pour chaque écran repris, plus deux qui manquent (`pilotage-bandeau-info.png`, `pilotage-incident.png`).
- Limites : trois lots ne font pas une application fluide ; le relevé dit combien d'écrans restent en dehors (listes et fiches Campus, accueil, modales, splash, barre d'onglets…) et c'est cette liste qui décidera d'une extension. Le mouvement se juge à l'œil sur un appareil.
- Dépendance : 7-I entièrement (un lot qui invente son vocabulaire reproduit la dérive mesurée en 6-K).
