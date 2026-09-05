# 6.1-C — La passe de code

> **Jalon livré le 2026-09-03** — code, tests et documentation ; les portes sont vertes (`tsc`, ESLint
> à **zéro**, 550 tests, parité sur quatorze cas, `expo-doctor` 18/18), et **vérifié sur iPhone le
> 2026-09-03** : les quatorze étapes du plan complété en bas, dont trois ont renvoyé une correction
> avant de passer. Les écarts entre ce texte et ce qui a été livré
> sont dans [Écarts constatés](#écarts-constatés) : le texte au-dessus reste tel qu'il a été écrit.
>
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

## Écarts constatés

Ce que la carte du code a corrigé dans le texte ci-dessus, et les décisions prises en chemin — la
plupart le 2026-09-03, avec le propriétaire du produit, avant d'écrire une ligne.

### Ce qui était déjà fait, ou faux

- **`syncCalendar` réinitialisait déjà son drapeau** : le `try/finally` date du 2026-08-30. La limite
  écrite était périmée ; il n'y avait que la documentation à corriger.
- **L'heure de la dernière synchronisation était déjà sous l'interrupteur**, avec sa pastille. Ce qui
  manquait était le toast d'échec, et il n'a de sens que pour le geste « Forcer » — la tâche de fond
  n'a personne à qui parler. `syncCalendar` rend donc son verdict (`false` en échec), et c'est
  l'écran qui décide du retour.
- **Les sections du tableau de bord avaient leur état d'erreur** depuis la passe de finition
  (`SectionEtatVide`). Deux trous restaient, dans la seule section sans hook partagé : les salles
  libres ne proposaient pas « Réessayer », et n'effaçaient jamais leur échec au succès.
- **`getDistanceInKm` n'était plus dupliquée** : une définition, importée quatre fois depuis le
  service des salles libres. Elle a rejoint un module pur, `distance.ts`, testé — une fonction
  géométrique n'appartient pas à un sous-domaine.
- **`StyleWelcome` ne portait plus l'accueil** : le parcours est sur les tokens depuis 6-G, et le seul
  consommateur restant, `WelcomeButton`, n'était monté nulle part. Les deux sont supprimés — 248
  lignes de `Theme.ts` et deux `any` —, et le vocabulaire visuel du parcours vit dans
  `stylesDuParcours.ts`.
- **La coquille de couleur est l'index 0, pas le 4** : en sombre, `sectionsHeaders[0]` portait
  `#5E5CE6`, la valeur du 4, là où sa version translucide `sections[0]` valait déjà `#0A84FF15`. Le
  registre des défauts le disait juste. Les trois palettes qui évitaient le 4 le gardent inemployé :
  redistribuer les teintes n'était pas le sujet.
- **« Les quatre sources gardent leur bouton »** : aucun bouton de rafraîchissement n'existait —
  « Réessayer » n'apparaît qu'à une section vide et en échec. Décision : un **tirer-pour-rafraîchir**
  natif sur le tableau de bord, geste standard, invisible au repos, qui relit les quatre sources sans
  faire clignoter les carrousels (`enCours` à côté de `loading` dans les hooks). Au retour au premier
  plan, seules les annonces se relisent, comme écrit.
- **« Les autres points restant disponibles par le filtre »** : aucun filtre par ville n'existait, la
  recherche ne cherche que dans ce qui est chargé. Décision : deux points et la position de
  l'étudiant, les six sites exclusifs de Pau, La Rochelle, Limoges et Bayonne sortent de la liste par
  défaut — le périmètre est bordelais ([README](../../README.md)), et un étudiant qui s'y trouve les
  garde par sa position. `socle.ts` et `supabase/etablissements.sql` sont alignés ; **la ligne publiée
  reste à rejouer par `psql`** (les trois établissements), sans quoi le parc balaie encore douze points
  — la ligne publiée remplace le socle.
- **`.expo` n'était pas ignoré au sens d'`expo-doctor`** : le `.gitignore` portait `.expo/*`, il veut
  `.expo/`. Et `npx expo install --fix` s'arrête en erreur après avoir écrit `package.json`, parce
  qu'il voudrait ajouter deux greffons facultatifs à `app.config.ts`, dynamique
  ([plateforme.md](../plateforme.md)). Les sept paquets sont bien réalignés ; `expo-updates` reste,
  son retrait est noté pour 6.1-Z.

### Ce que la session a décidé en plus

- **Un signal partagé « retour au premier plan »** (`shared/services/retourAuPremierPlan.ts`, pur et
  testé, et sa couture `premierPlan.ts`). `AppState` émet `active` aussi bien au retour d'arrière-plan
  qu'à la fin d'une interruption — centre de contrôle, invite système, Face ID — qui ne passe que par
  `inactive` ; le conteneur racine rejouait ses six rafraîchissements dans les deux cas, et les widgets
  de la scolarité se rejouaient **une seconde fois** juste après la biométrie, à chaque ouverture de
  l'onglet. Décision du propriétaire du produit : les widgets passent aussi par le signal. Le contexte
  de scolarité garde son propre abonnement, qui distingue déjà `background` et annule une session.
- **Le Planning repose la sélection sur aujourd'hui** quand la date a changé au retour, comme au
  lancement et comme la simulation temporelle — pas seulement le bouton.
- **Les rappels de cours suivent les filtres d'UE dans les deux vues.** La vue jour les filtrait déjà
  avant de programmer, la vue semaine programmait tout : dériver la semaine au chargement a aligné
  les deux.
- **La réinitialisation efface le Campus par une seconde liste** dans `purge.ts`, distincte de celle
  de la bascule d'établissement — deux gestes, deux questions, et la décision de 6-G sur les sources
  nationales ne bouge pas.
- **Les dictionnaires désactivent `max-lines`**, comme `Theme.ts` : 390 clés par langue dépassent la
  limite, et découper un dictionnaire nuirait à sa lecture.
- **La mesure S13 est un instrument, pas un chiffre.** Le code dit que la session ne peut pas
  retarder le premier rendu — `CredentialsProvider` est monté après `SplashScreen.hideAsync()`, et un
  parcours froid ne part que si le trousseau porte des identifiants sans dossier — mais rien ne le
  mesurait. `Chrono.ts` pose des repères sous `__DEV__` (préparation, ressources, premier rendu,
  conteneur monté, décision de la scolarité, premier rafraîchissement des widgets) ; le relevé sur
  appareil fait partie du plan de test ci-dessous, et la limite de `scolarite.md` est réécrite sur ce
  que le code garantit.
- **`SettingsManager.unsubscribe` gardait mal un abonné absent** : `indexOf` sur un tableau disparu
  rendait `undefined`, qui passait la garde `!== -1`, et `splice(undefined, 1)` retirait l'abonné 0.
  Durci au passage, parce que le parcours d'accueil se désabonne désormais.
- **Le spinner du tirer se cachait au-dessus du titre sur iPhone** (retour du 2026-09-03) : `progressViewOffset`
  ne suffit pas sous un en-tête transparent. Sur iOS, l'en-tête est désormais un `contentInset` et non
  un rembourrage — c'est UIKit qui place alors le spinner sous l'en-tête, dans l'espace que le geste
  ouvre — et la valeur animée du défilement part de l'offset au repos. Android garde le rembourrage
  et `progressViewOffset`.
- **La réinitialisation complète perdait les simulations du menu** (retour du 2026-09-03) : elle
  relance le JavaScript, et HORS LIGNE vit en mémoire — la liste des bâtiments se mettait en cache
  pendant la relance, et la sonde des salles libres ne sondait rien. Elle range désormais les
  simulations actives sous une clé écrite après l'effacement, relue puis effacée au démarrage suivant
  (`shared/services/simulations.ts`).
- **Le chrono a trouvé une seconde lecture du trousseau à +40 s** (premier relevé, sans identifiants :
  préparation +146 ms, premier rendu +385 ms, décision de la scolarité +447 ms). L'effet de chargement
  initial dépendait de deux rappels dont l'identité change avec l'état du provider ; il ne joue plus
  qu'au montage, par des références, comme la bascule d'établissement juste au-dessus. Un parcours
  froid aurait pu être relancé par-dessus lui-même.
- **Verdict S13, sur deux états relevés** (sans identifiants ; dossier en cache) : la scolarité décide
  trente à soixante millisecondes après le premier rendu et ne lance rien. Rien n'est différé ; la
  limite de `scolarite.md` est réécrite avec ses chiffres. Le parcours froid au lancement n'a pas été
  relevé — le code garantit l'instant, pas la durée sous le fondu.
- **Le menu de développement rouvre après la réinitialisation complète** (retour du 2026-09-03) : ses
  simulations survivaient à la relance, pas lui — un réglage actif qu'on ne voyait plus.
- **Les points de balayage sont publiés** : les trois lignes de `etablissements` sont à deux points
  depuis le 2026-09-03, par `psql`, journal à l'appui.
- **`Animated.FlatList` perd le générique de la liste** — ses props attendent des valeurs animées —
  et c'est ce qui portait trois `any` dans `CampusListLayout`. Le socle n'anime que le défilement : la
  liste est typée comme une `FlatList` ordinaire.

### Plan de test sur appareil, complété

| # | Geste | Attendu |
|---|---|---|
| 1 | Permission calendrier refusée, ouvrir Réglages | interrupteur inchangé, carte « permission » ; l'accorder dans les réglages du système, revenir : l'interrupteur apparaît, dans l'état d'avant |
| 2 | HORS LIGNE, « Forcer une synchronisation » | toast d'échec, pastille orange ; rétablir, forcer : date à jour |
| 3 | Deux groupes favoris, forcer | les cours des deux dans l'agenda, un cours commun une seule fois |
| 4 | Langue en anglais, mock temporel, un cours à venir | titre de notification traduit |
| 5 | Réinitialiser | favoris et filtres restaurants / BU partis au retour sur Campus |
| 6 | Recherche de groupes HORS LIGNE puis en ligne | toast + liste du cache datée ; puis pas de bandeau |
| 7 | Sombre, recherche de groupes | première section bleue — capture avant/après |
| 8 | Vue semaine, ajouter un filtre d'UE depuis Réglages | les cours disparaissent sans recharger |
| 9 | Publier une annonce depuis la console, app à l'écran d'accueil du téléphone, revenir | l'annonce est là sans relance ; centre de contrôle tiré : aucune ligne de rafraîchissement dans Metro ; ouvrir Scolarité : un seul run de widgets après Face ID |
| 10 | Tirer sur le tableau de bord | spinner, contenus remplacés sans clignoter ; Blueprint des salles cassé : « Réessayer » sur la section |
| 11 | Panneau Blueprints ou Metro | trois runs `ukit.campus.bibliotheques`, les huit BU bordelaises |
| 12 | Réinitialisation complète, HORS LIGNE avant l'étape des groupes | l'étape explique son vide et propose « Réessayer » ; rétablir, réessayer : la liste |
| 13 | Trois lancements par état — sans identifiants ; identifiants et dossier lu ; identifiants sans dossier | les lignes `[chrono]` de Metro, à relever |
| 14 | Planning laissé en arrière-plan jusqu'au lendemain | « Aujourd'hui » juste (facultatif : la simulation temporelle joue le même chemin) |

### Retours d'appareil du 2026-09-03

Les quatorze étapes jouées sur iPhone, en deux passes.

- **Passées du premier coup** : la permission calendrier (la carte, le retour depuis les réglages du
  système, l'interrupteur inchangé), le toast d'échec puis la date après rétablissement, les deux
  groupes favoris fusionnés dans l'agenda iOS, le titre de notification en anglais, le filtre d'UE en
  vue semaine dans les deux sens sans recharger, la recherche de groupes hors ligne avec son bandeau
  daté, les annonces relues à chaque retour d'arrière-plan, le centre de contrôle qui ne relance
  rien, la réinitialisation qui emporte les favoris du Campus.
- **Trois corrections avant de passer** : le spinner du tirer se cachait au-dessus du titre (l'en-tête
  est un inset sur iOS, désormais) ; la réinitialisation complète perdait HORS LIGNE, donc les
  bâtiments se mettaient en cache pendant la relance et les salles libres ne montraient jamais leur
  échec (les simulations survivent, et le menu rouvre) ; et le double run des widgets ne se testait
  pas en changeant d'onglet — le verrou Face ID ne demande qu'une fois par lancement — mais à la
  première ouverture après un `r` : Metro montre un seul `widgets : premier rafraichissement`, à
  +491 ms, et rien après le déverrouillage.
- **Après publication des points**, la recherche « Pau » dans les bibliothèques ne rend plus rien, là
  où l'application de production trouve encore la Bibliothèque de Pau.
- **Le nuage rouge** de l'encart d'échec de l'étape des groupes est la teinte `danger` de la famille
  `unavailable`, comme partout ailleurs — pas un écart.
- **Les captures** `planning-groupes-sombre-avant.png` et `-apres.png` sont prises et intégrées au
  registre des défauts.
