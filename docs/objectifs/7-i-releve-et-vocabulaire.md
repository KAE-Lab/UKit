# Objectif : 7-I, le relevé et le vocabulaire du mouvement (jalon OUVERT)

Publication 6.3, branche `v6.3`, ouvert le 2026-09-26. La majeure partie du code est déjà commitée (`git log --oneline 131ae8c..HEAD`) : vérifier chaque critère dans le code avant de planifier, et ne planifier que le reste. Fichier jetable, supprimé à la clôture.

## But
Donner à l'application son vocabulaire de MOUVEMENT, comme 6-K a donné celui des formes : squelettes qui annoncent la forme du contenu, entrées en cascade, ressort unique, états pressés, fond par écran, cartes d'erreur au gabarit ; l'écran fondateur est le tableau de bord Campus, et ce qui s'y décide fait règle pour les lots de 7-J. S'y ajoutent la carte d'annonce v2 et l'ordre des annonces côté application, la lecture des colonnes `credits`, `campus`, `alias` du catalogue, et l'occupation d'un bâtiment en un seul run.

## Critères de clôture
1. Le relevé initial de ce qui saute (`git show doc-v1:docs/inventaire-mouvement.md`, daté du 2026-09-26) reste la liste de contrôle finale : le relever de nouveau avec les mêmes commandes à la clôture (relevé final contre relevé initial, repris par 7-K). Ses décisions sont dans `docs/decisions.md` (`mouvement-6-3`) et la règle `ui-theme`.
2. Captures et vidéos « avant » prises sur iPhone 13 Pro et Galaxy A8, deux thèmes, avant le premier changement (trois captures « avant » existent dans `docs/screenshots/` : `campus-dashboard-avant.png`, `campus-dashboard-avant-dark.png`, `annonces-liste-avant.png`) ; captures « après » sous la convention de la règle `captures`.
3. `tokens.mouvement` existe et est lu par les composants qui animaient déjà ; `Squelette`, `CarteEnPanne` livrés (fait dans le code, à vérifier sur appareil) ; `FondDEcran` à livrer (Campus seul : image statique pré-estompée, un fond par thème, s'efface au défilement). La règle « un chargement bref ne montre rien » est réécrite en « un chargement annonce sa forme » (fait dans la règle `ui-theme`).
4. Tableau de bord Campus : aucune section ne change de hauteur entre squelette, contenu et panne ; contenu en cascade ; aucun reflux au premier rendu ; fond posé et effacé au défilement ; deux thèmes, deux appareils.
5. Carte v2 identique à l'aperçu de la console (cadre, focale, contenir, badge, partenaire, blurhash) par un module pur partagé ; `BdeService` lit les colonnes et applique `ordonner()` ; une carte spéciale paraît en tête du carrousel de son emplacement, au gabarit de l'hôte, et compte une impression (module `src/shared/annonces/carte.ts` et `ordonner()` faits dans le code, à vérifier sur appareil).
6. Le catalogue lit `credits`, `campus`, `alias` ; le socle les embarque (test) ; clé de cache en `etablissements@5`, incrémentée après vérification des valeurs en production ; plus aucun « Talence » de repli dans le mapping des bâtiments ni les cartes de salles (fait dans le code, clé `etablissements@5` posée ; reste le repli de position GPS `REPLI_TALENCE` de `useCampusLocation.ts`, hors mapping ; valeurs de production à vérifier).
7. Occupation d'un bâtiment en UN run : règle d'attribution pure et testée, fermeture par vacances, cas de parité groupé vert, Blueprint en version 4 (règle `attributionOccupation.ts` et Blueprint 4 faits dans le code ; parité à rejouer).
8. Le réglage système « réduire les animations » coupe cascades et pulsations (fait dans le code, `src/shared/ui/mouvement.ts` et `Squelette.tsx`, à vérifier sur appareil).
9. Portes : `npx tsc --noEmit`, `npx eslint . --max-warnings=0`, `npm test`, `npm run parity`, `npx expo export` ios et android ; CI verte sur `v6.3`.

## Protocole de test sur téléphone (Kylian, iPhone 13 Pro et Galaxy A8, deux thèmes, Metro lu depuis le poste)
Pour chaque étape, donner la marche à suivre et le résultat attendu :
1. Ouverture à froid de Campus : quatre squelettes tout de suite, à la hauteur des cartes ; cascade ; aucun changement de hauteur de section ; aucun reflux avec des favoris.
2. Fond derrière le titre : s'efface au défilement et revient ; ne concurrence pas la fumée de la barre d'onglets.
3. Panne par section : interrupteur HORS LIGNE du menu flottant pour les trois sources tierces ; `SUPABASE_URL` sur `.invalid` puis `expo start -c` pour les annonces. Chaque section montre sa carte en panne à la hauteur d'une carte, Réessayer ou Voir tout selon la famille.
4. Un filtre qui masque tout : « Tout afficher » repeuple immédiatement, inchangé.
5. Carte v2 : une annonce re-téléversée par la console, en audience `testeurs`, montre son blurhash puis l'image cadrée comme l'aperçu ; une ancienne en « contenir » garde son rendu ; un événement n'a pas de badge, un bon plan en a un.
6. Carte spéciale : un bon plan en emplacement « restaurants » paraît en tête du carrousel au gabarit des voisines ; toucher ouvre la fiche ; le bloc Mesure du menu de développement compte une impression.
7. Ordre : deux annonces épinglées ou prioritaires dans l'ordre du panneau « ordre vu à telle heure » de la console ; l'heure de Paris sous Hermes se lit dans le journal.
8. Étoile de favori : haptique, un reflux animé ; un retour sur l'onglet ne fait plus rien bouger.
9. Mouvement réduit activé dans le système : ni pulsation ni cascade, tout reste lisible.
10. Tirer : spinner du système, contenu gardé pendant la relecture.
11. Occupation : la fiche de l'A28 écrit UNE ligne `[chrono] ukit.celcat.occupation` au lieu de dix-sept ; créneaux libres = ceux de la veille ; une journée de vacances (simulation temporelle) ferme le bâtiment.

## Hors périmètre et limites
- Refaire un écran est un lot de 7-J ; `NavHelpers` et ses treize écrans convergent là, pas ici (les toucher casserait tous les en-têtes pour rien). Pas de blurhash des lieux. Le tableau de bord Campus est un écran de référence de 6-K : assumer le contrat rouvert, les captures « avant » disent ce qui a bougé.
- Aucune porte automatique pour le mouvement (aucun test ne monte un composant) ; ce qui peut être pur est testé. Les durées échappent à `ukit/no-style-literals` : `tokens.mouvement` est une convention.
- Un run d'occupation groupé en échec vide tout le bâtiment pour cette ouverture. Un tableau de bord resté ouvert garde l'ordre de l'heure où il a lu.
