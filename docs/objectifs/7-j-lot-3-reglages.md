# Objectif : 7-J, lot 3, les Réglages

Publication 6.3, branche `v6.3`. Un seul lot ouvert à la fois, un écran par session, jamais deux ; ce lot passe en dernier des trois, pour que le vocabulaire du mouvement soit stable. Fichier jetable : supprimé à la livraison, l'historique est dans les commits.

## But
Réglages est le seul écran que la refonte 6-K n'a jamais repris : un composant à classe, son `Animated.Value` fait main, un en-tête d'onglet maison recopié (+ 60), un indicateur dans une rangée sans seuil, des toasts en erreur, une section Calendrier qui change de forme après le montage, une `LayoutAnimation` sur un seul commit. Le lot lui donne ses formes (`shared/theme`, `shared/ui`) et son mouvement (`tokens.mouvement`) en même temps, et lui fait porter le côté application du multi-campus.
Règle d'ouverture : lire `src/shared/theme/` et `src/shared/ui/`, n'employer que ce vocabulaire ; un motif qui existe se réutilise, un motif qui apparaît une deuxième fois remonte dans `shared/ui/`.

## Prérequis
7-I clos (voir `docs/objectifs/7-i-releve-et-vocabulaire.md`) : `tokens.mouvement`, `Squelette`, `CarteEnPanne`, colonnes `credits`, `campus`, `alias` lues par le catalogue. S'il ne l'est pas, le dire en tête du plan.

## Critères d'acceptation (à rendre exécutables dans le plan)
1. Le moteur d'animation maison de l'écran est remplacé par le moteur partagé (en-tête, défilement) : `grep -n "Animated.Value" src/features/Settings` vide, ou chaque occurrence justifiée.
2. La liste des établissements est regroupée par `campus` et la recherche trouve par `alias` ; les crédits (`credits`) s'affichent à l'écran.
3. Plus aucun « Talence » de repli codé en dur dans le mapping des bâtiments ni les cartes de salles : 7-I s'en est chargé, VÉRIFIER avant de planifier (`grep -rn Talence src` ne doit rendre que des données de catalogue, des commentaires, des tests et le repli de position GPS de `useCampusLocation.ts`).
4. Entrée « Soutenir » seulement si `services.soutien` existe dans le catalogue ; elle s'ouvre dans le navigateur du système, jamais dans la vue intégrée (règle des stores : le don se collecte hors de l'application, Apple 3.2.2 iv) ; aucune autre surface.
5. Entrée « Statistiques anonymes » (section Confidentialité posée par 7-D) : lui donner ses formes sans toucher à son comportement (actif par défaut, couper vide la file).
6. États vides et textes à la voix éditoriale : sympathique, subtile, un rebondissement par écran, jamais plus ; trois langues.
7. Aucune hauteur qui change entre chargement, contenu et panne (la section Calendrier en particulier) ; entrée en cascade ; « réduire les animations » coupe cascades et pulsations.
8. Recette d'écran jusqu'au bout (règle `ui-theme`) : deux thèmes, iPhone 13 Pro et Galaxy A8, aucune valeur de style littérale, carrés arrondis.
9. Portes vertes : `npx tsc --noEmit`, `npx eslint . --max-warnings=0`, `npm test`, `npx expo export --platform ios` et `--platform android`.
10. Captures « avant » (prises avant le premier changement de code) et « après » dans `docs/screenshots/`, deux thèmes.

## Hors périmètre
- Planning et Scolarité (autres lots de 7-J, voir `docs/objectifs/7-j-lots-1-2.md`), tableau de bord Campus (7-I).
- Aucune porte automatique pour le mouvement : il se juge à l'œil sur appareil.

## Points ouverts (à lister en fin de plan)
- Réécrire la classe en composant fonction ? (règle : tout nouveau composant est une fonction, une classe existante ne se réécrit pas sans raison ; ici la refonte en est une.)
- `services.soutien` n'existe ni dans le code ni dans le catalogue : livrer l'entrée dormante (masquée sans la clé) ou attendre 7-N ?
- Protocole de test sur téléphone à écrire dans le plan : marche à suivre et résultat attendu, par appareil et par thème.
- Les chiffres de l'ancienne spécification (taille des fichiers, numéros de ligne) sont périmés : tout vérifier dans le code.
