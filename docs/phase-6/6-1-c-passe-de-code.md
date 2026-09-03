# 6.1-C — La passe de code

> **Le jalon qui éponge ce que la documentation portait comme limites connues.** Rien de neuf ici :
> chaque ligne existait déjà, écrite dans une section « Limites connues » ou dans le registre des
> défauts. Une version de consolidation est le moment de les fermer, ou de décider qu'elles
> restent — mais pas de les laisser en suspens. Références G1…G11 de la
> [mise à plat](6-1-mise-a-plat.md).

## Ce qui se corrige

### Réglages (G1, G2)

- Ouvrir l'écran sans permission calendrier **ne bascule plus** la synchronisation : la permission
  est demandée, l'état reste celui qu'il était.
- `syncCalendar` réinitialise toujours son drapeau, y compris quand la source rend vide ;
  l'indicateur ne tourne plus jusqu'au redémarrage.
- Un échec de synchronisation **se dit** : toast d'échec (les toasts fonctionnent depuis le
  2026-08-29), et l'heure de la dernière synchronisation réussie affichée sous l'interrupteur.
- Les titres de notification passent par `Translator` (clé `NOTIFICATION_COURSE_IN`), dans les
  trois dictionnaires.
- **Décisions écrites** : « Réinitialiser » efface aussi les favoris et filtres Campus — quelqu'un
  qui efface tout s'attend à ce que tout parte, et l'argument du changement d'établissement ne
  s'applique pas ici ; le plafond de vingt notifications reste, et la phrase des Réglages le dit.

### Planning (G3, G4)

- **La synchronisation porte le planning agrégé**, pas le premier favori seul. C'était un
  comportement d'origine jamais interrogé ; un étudiant qui agrège deux groupes attend les deux
  dans son calendrier.
- Les deux caches de la liste des groupes (`groups`, `groupList`) sont **réconciliés en un seul**
  chemin d'écriture.
- `computeScheduleWeek` est mémorisé sur ses entrées ; il ne se rejoue plus à chaque rendu.
- La coquille de `sectionsHeaders` (index 4 identique à l'index 0 en sombre) est corrigée en
  `#0A84FF` — avec une capture avant/après du Planning, puisque c'est un rendu qui change.

### Campus (G5, G6)

- **Les écrans qui lisent notre base se relisent au retour au premier plan**, et le Planning
  recalcule son « Aujourd'hui » — le défaut « le contenu publié n'atteint les écrans déjà montés
  qu'au lancement suivant », inscrit au registre le 2026-09-03 pendant la vérification de
  [6.1-B](6-1-b-pilotage-a-distance.md) ([defauts-fonctionnels.md](../defauts-fonctionnels.md)). Une
  politique par écran, décidée ici : les annonces (une requête légère vers notre base) et le jour
  courant se relisent à chaque retour ; les quatre sources tierces du tableau de bord ne se rejouent
  pas à chaque retour, elles gardent leur cache et leur bouton.

- Les sections du tableau de bord ont un **état d'erreur distinct** de l'état vide, comme les
  listes complètes depuis 6-K. C'est le dernier endroit où une source morte ressemblait à une
  liste vide.
- La position est résolue une fois et partagée ; `getDistanceInKm` vit à un seul endroit.
- Les bibliothèques ne balaient plus douze points : **deux** pour Bordeaux (les mesures du
  2026-08-08 montrent que Bordeaux Centre et Talence/Pessac rendent les huit BU, sans exclusive
  ailleurs), les autres points restant disponibles par le filtre. C'est un changement de produit,
  décidé sur mesures.

### Accueil (G7)

- Une installation hors ligne voit, à l'étape des groupes, **pourquoi la liste est vide** et un
  bouton pour réessayer, au lieu d'une étape muette.
- Les abonnements du parcours sont résiliés au démontage.
- `StyleWelcome` disparaît : le parcours prend les jetons et les composants du socle 6-K.

### Scolarité (S13)

- Le coût de la session au lancement est **mesuré** (temps jusqu'au premier rendu, avec et sans
  identifiants). Si elle retarde le premier rendu, elle part après lui ; sinon la limite reste
  écrite avec sa mesure.

### Outillage (G10)

- `npx expo install --fix` : les sept paquets en retard rejoignent la version attendue par le SDK.
- `setup-java@v5` dans le workflow de release.
- **Zéro avertissement ESLint** : les 35 de la base sont traités un par un — corrigés, ou
  désactivés avec une justification écrite là où la règle est fausse.

## Ce qui reste écrit, et pourquoi

- **Les styles composés de `Theme.ts` ne sont pas typés (G8).** Retyper 1 100 lignes de données
  est une session à part entière ; le transtypage unique documenté reste, et la session est
  nommée pour la 6.2.
- **La `filterSeason` de l'accueil dépend d'une nomenclature observée.** Rien à corriger sans
  changement côté université ; « Autre » reste le contournement.
- **Le cache Planning est par vue, pas par jour.** Cohérent avec le bandeau de date ; laissé tel
  quel, écrit tel quel.

## Plan de test

Le harnais existant en entier — `tsc`, ESLint à zéro, la suite unitaire, la parité — plus, sur
appareil : un refus de permission calendrier laissant l'interrupteur inchangé ; un échec de
synchronisation visible ; deux groupes favoris synchronisés dans l'agenda ; une installation hors
ligne expliquant son étape vide ; le tableau de bord Campus avec une source coupée.

## Limites écrites

- Cette passe **ne touche pas au rendu** hors de la coquille de couleur et de l'accueil sur le
  socle. Les finitions visuelles sont le jalon [6.1-E](6-1-e-finitions-interface.md).
- Réconcilier les caches de groupes est le geste le plus risqué du jalon : il passe par un test
  qui fige le comportement actuel avant de le changer.
