# 7-J — Les écrans, et la refonte de l'interface

> **Livré le 2026-11-05 sur `v6.3`**, vérifié sur le banc Android ; reste le passage sur l'iPhone
> ([la livraison](#la-livraison-du-2026-11-05)). Ouvert le même jour. Publication : **6.3**. Ce document était un cadre de trois
> lots (le Planning, la Scolarité, les Réglages), chacun à mener en session avec le propriétaire du
> produit. Le 2026-11-05, celui-ci a élargi le jalon à **toute l'interface** (« la hisser au rang des
> meilleures ») et **délégué le jugement de design** : pas de planche ni de labo, les décisions se
> prennent sur le [banc Android](../qualite.md#le-banc-android) et s'écrivent ici, avec leur raison.
> La règle « un écran par session » tombe avec cette délégation ; celle qui protège un lot reste : un
> défaut fonctionnel rencontré en chemin s'inscrit dans
> [defauts-fonctionnels.md](../defauts-fonctionnels.md) et ne se corrige pas au passage, sauf s'il tombe
> dans le périmètre.

## Ce que le relevé du 2026-11-05 a montré

Parcouru sur `ukit-a8` (Android 9, 360 × 740 dp), installation neuve, dans les deux thèmes, avant
tout changement. L'application est propre et cohérente, mais elle pourrait être celle de n'importe
qui : la palette par défaut d'iOS, une accentuation qui change de couleur d'un thème à l'autre
(`#007AFF` en clair, `#5E5CE6` en sombre), des cartes au même rayon et à la même ombre partout.

| Constat | Où |
|---|---|
| Le contenu passe sous la barre d'état, sans voile : « 11:25 » s'écrit sur « Restaurants » | Campus, Scolarité, Réglages au défilement |
| Les libellés se coupent à 360 dp : « Paramèt… », « Se conne… », « Non con… » | barre d'onglets, bouton d'action, Réglages |
| Le bouton « Suivant » de l'accueil chevauche la carte de connexion | accueil, étape du compte |
| Une carte par réglage : la pile que [theme.md](../theme.md#les-décisions-durables) interdit | Réglages |
| Une seule carte géante visible par section | Campus |
| La salle d'un cours, ce qu'on cherche en premier, est la quatrième ligne sur six, au même poids que le code d'UE | Planning |
| L'ombre d'une carte n'existe pas sur iPhone : `Card` cumule `overflow: hidden` et l'ombre native d'iOS, que React Native coupe avec le masque (lu dans `RCTViewComponentView.mm`) | toutes les cartes |

Les captures sont dans [screenshots/](../screenshots/README.md), suffixées `-avant-android`.

## La direction : l'heure juste

Un étudiant ouvre UKit pour savoir **où** et **quand** : sa salle et son prochain cours, ce qui est
ouvert, ce qui est libre, à quelle distance. Chaque écran répond à cette question d'un regard, en
chiffres plutôt qu'en phrases. L'interface reste native (la police du système, les gestes et les
gabarits des Human Interface Guidelines, le carré arrondi) ; ce qui la distingue, c'est la précision
avec laquelle elle donne l'heure des choses.

Le lien avec l'[Épure](../identite.md) est direct : « une trace dit une vérité ». Dans l'application,
une trace n'est jamais un décor ; elle porte une mesure. Une pause entre deux cours est une **cote**
de la journée, et c'est la seule trace qui entre sur un écran de travail.

Ce qui est pris aux références du moodboard, et ce qui ne l'est pas :

| Référence | Pris | Laissé |
|---|---|---|
| Flighty | les heures en grand et en chiffres tabulaires, l'état en couleur, le compte à rebours (« dans 25 min ») | la carte du monde, le verre |
| Structured | la frise du jour, la durée d'un créneau, les jours marqués dans le ruban | les capsules rondes, les pictogrammes |
| Réglages d'iOS, Bourse | le groupe encadré, la rangée dense, l'icône dans un carré teinté | rien |
| Apple Météo | le fond qui dit la section (déjà là, [7-I](7-i-releve-et-vocabulaire.md)) | le fond animé plein écran |

## Les décisions du 2026-11-05

| Sujet | Décision |
|---|---|
| **L'accentuation** | **Une seule teinte**, celle du milieu du logo (le bleu-indigo de l'Épure, `#456BF2`, teinte 268° en OKLCH), réglée par thème pour le contraste : `#3B5FE5` en clair (5,3:1 sur blanc, 4,8:1 sur le fond), `#6381F8` en sombre (5,2:1 sur la carte). Le bleu d'iOS faisait « bouton par défaut », et deux accents pour une même application ne se justifiaient par rien. |
| **Le « cran au-dessus »** | Celui retenu le 2026-11-04 sur les maquettes du labo, posé tel quel : le noir teinté `#0B0B12` et ses cartes `#15151E`, le texte secondaire `#BCBCCB` en sombre et `#6C6C70` en clair, les icônes des Réglages dans un carré teinté. Les teintes sombres du fond des onglets restent celles du labo, qui étaient déjà vues sur `#0B0B12`. |
| **Les ombres** | `boxShadow` **sur les deux plateformes**, en deux couches (un contact net, une portée douce). React Native 0.86 dessine `boxShadow` hors du masque d'une vue en `overflow: hidden` ; l'ombre native d'iOS, elle, y est coupée. La carte regagne son ombre sur iPhone, et les deux plateformes reçoivent la même. En sombre, une ombre ne se voit pas : la carte s'y détache par sa teinte et par un filet de 6 %. |
| **La typographie** | La police du système reste. S'ajoutent ce qui la rend précise : une approche resserrée sur les grands titres, les **chiffres tabulaires** pour toute heure, durée ou distance, et des styles de texte composés (`tokens.texte`) plutôt que des tailles recomposées à chaque écran. |
| **L'en-tête d'onglet** | Le grand titre défile avec le contenu ; à sa disparition, un voile du fond protège la barre d'état et un titre compact paraît au centre. Plus rien ne s'écrit sous l'heure du téléphone. |
| **La barre d'onglets** | Les libellés courts tiennent à 320 dp dans les trois langues (« Réglages », « Compte ») ; l'onglet actif prend la **teinte de sa section**, celle de son fond. |
| **Le Planning** | Une **frise** : les heures dans une gouttière à gauche, hors des cartes ; entre deux cours, la pause cotée (« 1 h 10 ») ; aujourd'hui, le repère de l'heure et, sur le cours en cours ou suivant, son compte à rebours. Dans la carte, la **salle** monte sous le titre, et le reste se range par importance. |
| **Les Réglages** | Des groupes encadrés, une rangée de 52, l'icône dans un carré de la teinte de sa section. |
| **Le mini-jeu** | Original, au trait de l'Épure : le point du « i » du logo saute les traces de construction qui défilent sur l'horizon. Un pouce, aucun écran de fin, le record gardé sur l'appareil. Il occupe l'attente de la connexion universitaire et s'efface à l'arrivée du dossier. Ce n'est la copie d'aucun jeu existant : ni personnage, ni décor, ni nom repris. |
| **Les touches** | Dosées par la règle de la passe « voix éditoriale » : un rebondissement par écran, jamais plus. Une journée libre et un week-end parlent ; l'accueil montre la figure en écho ; le retour haptique acquitte le choix d'un jour. |

## Les lots

Dans l'ordre, chacun vérifié sur le banc dans les deux thèmes, au format de l'A8 puis du Pixel, avant
le suivant.

| Lot | Contenu |
|---|---|
| **0. Le socle** | palettes, accent, ombres, `tokens.texte`, `Card`, l'en-tête d'onglet et son voile, la barre d'onglets |
| **1. Le Planning** | la frise du jour, l'en-tête et le ruban, la vue semaine, le fond de l'onglet ; la convergence de l'en-tête en Reanimated |
| **2. La Scolarité** | la barre du parcours froid recalibrée sur les durées de [6.1-D](../phase-6/6-1-d-publication.md), le mini-jeu, les tuiles |
| **3. Les Réglages** | les groupes, la classe reprise en fonction, la liste des établissements regroupée par `campus`, la recherche par `alias`, « Soutenir » si `services.soutien` existe |
| **4. Campus** | les cartes au nouveau socle, l'état et la distance en chiffres, la section qui laisse voir sa voisine |
| **5. Les moments** | l'accueil, les journées libres, les états vides dans la voix du projet |

## Définition de « terminé »

1. Chaque constat du relevé du 2026-11-05 est corrigé ou écrit en limite.
2. Les portes : `npx tsc --noEmit`, `npx eslint . --max-warnings=0`, `npm test`, `npm run parity`,
   `npx expo export` sur les deux plateformes.
3. Chaque écran repris passe la [recette d'écran](../theme.md#la-recette-décran) sur le banc, dans les
   deux thèmes, à 360 dp et avec une police à 1,3.
4. « Réduire les animations » du système fige le mini-jeu, le repère de l'heure et le fond.
5. Les captures après, sous la convention de [screenshots/](../screenshots/README.md).
6. La documentation dans le même changement : [theme.md](../theme.md) (palettes, ombres, texte, les
   décisions durables), les documents de partie, le CHANGELOG, l'état du
   [README de la phase](README.md#létat).

## Plan de test, sur le banc

1. **Le socle** : chaque onglet défilé jusqu'en bas ; rien ne s'écrit sous la barre d'état ; aucun
   libellé coupé dans la barre d'onglets, en français, en anglais et en espagnol, à 360 dp.
2. **Le Planning, aujourd'hui** : le repère de l'heure entre les bons cours, le compte à rebours juste
   (simulation temporelle du menu de développement), les pauses cotées ; un jour libre ; un week-end ;
   la vue semaine ; un groupe cherché.
3. **La Scolarité** : la connexion sur `ukit` (la WebView de `ukit-a8` date de 2018), la barre qui ne
   se fige plus vers 30 %, le jeu jouable puis effacé à l'arrivée du dossier ; hors ligne.
4. **Les Réglages** : chaque rangée, chaque dialogue ; la liste des établissements regroupée, la
   recherche par alias.
5. **Campus** : le plan de test de [7-I](7-i-releve-et-vocabulaire.md#plan-de-test), rejoué sur le
   nouveau socle.
6. **L'accueil**, installation neuve (`pm clear`), dans les deux thèmes.

## Limites écrites

- **iOS n'est pas sur le banc.** Ce qui en dépend se relit dans le diff (les ombres, les zones sûres,
  le flou) et se juge sur l'iPhone avant la publication.
- **Le mouvement et le jeu se jugent à l'œil** ; seuls leur arithmétique (collisions, compte à rebours,
  pauses) se teste.
- **Les captures des stores** se refont avec l'équipe ([7-K](7-k-sortie-6-3.md)).

## La livraison du 2026-11-05

**Le relevé, ligne à ligne** (définition de « terminé », point 1) :

| Constat | Issue |
|---|---|
| Le contenu passe sous la barre d'état | corrigé : `EnTeteDOnglet` sur les onglets ; sur les onze écrans poussés, une barre qui prend son fond et son filet au défilement (`NavBarHelper`) |
| Les libellés se coupent à 360 dp | corrigé, vérifié en français, en anglais et en espagnol ; à police 1,3, les libellés d'onglets plafonnent leur croissance à 1,15 |
| « Suivant » chevauche la carte de connexion | corrigé : le dégagement du parcours compte la marge système du bas (`useDegagementDuPied`) |
| Une carte par réglage | corrigé : les groupes encadrés, aussi sur « À propos » |
| Une carte géante par section | corrigé : la carte voisine se laisse voir |
| La salle en quatrième ligne | corrigé : sous le titre, en demi-gras, l'enseignant et le groupe ensuite |
| L'ombre absente sur iPhone | corrigé dans le code (`boxShadow`) ; **à voir sur l'iPhone** |

**Les écarts à ce document.** Ajoutés en chemin, parce que le banc les a montrés : la barre des
écrans poussés et l'écran « À propos » au gabarit des Réglages ; la fin de l'accueil, un cercle et une
coche qui se tracent dans le dégradé du logo, en réponse à Fig. 01 ; la gouttière des heures, le mois
et les libellés d'onglets à police 1,3 ; la barre de statut au premier lancement en sombre, dont la
cause était la racine qui manquait le thème posé par l'accueil. Laissés : la convergence en Reanimated
des en-têtes poussés (ils gardent `Animated`, sur le fil JavaScript), les écrans des filtres et des
calendriers du téléphone, encore sur l'ancien bouton, et la classe des Réglages, restée une classe.

**Le plan de test**, joué sur `ukit` et `ukit-a8` : le socle, les onglets défilés dans les deux
thèmes ; le Planning, avec la frise, ses pauses cotées, le temps restant d'un cours en cours, le repère
de fin de journée, une journée libre, un groupe cherché — le repère de l'heure **entre** deux cours,
par la simulation temporelle, n'a pas été vu ; la Scolarité, connexion réelle sur `ukit` en une
vingtaine de secondes, la barre continue, le jeu jouable (saut, chute, record) ; les Réglages, le
dialogue de langue et le mode sombre ; Campus, le plan de
[7-I](7-i-releve-et-vocabulaire.md#le-plan-de-test-joué-le-2026-11-05) ; l'accueil, installation
neuve dans les deux thèmes, sur les deux émulateurs. Les captures « après »
(`-apres-android`, `-apres-android-dark`) sont dans [screenshots/](../screenshots/README.md).

**Ce qui reste, hors du banc :**

- **l'iPhone** : les ombres, les zones sûres, la barre d'état, le jeu et le tracé de l'accueil ;
- **trois propositions**, à trancher : une carte étoilée rejoint la tête de son carrousel et sort du
  champ, quand le carrousel pourrait la suivre ; les fiches poussées titrent « Détails » au-dessus du
  nom qu'elles montrent, quand la barre pourrait porter ce nom ; à l'accueil, « Plus tard » double
  « Suivant » ;
- la barre de navigation d'Android 9, claire sous l'application sombre, consignée dans les
  [défauts](../defauts-fonctionnels.md) : sa couleur se règle en natif, donc au prochain build.

## Ce qui reste de l'ancien cadre

Les pièges déjà payés tiennent : le carrousel des cours superposés porte trois formes essayées puis
défaites (`CourseRow`), et la vue semaine n'affiche aucune description depuis 6-E, verrouillé par un
test. Le Planning porte la politique **stale-while-revalidate** : le jour demandé s'affiche depuis le
cache, le réseau rejoue derrière. La barre du parcours froid paraît se figer vers 30 % : le palier
« connexion » plafonne à 34 % pour dix-huit secondes annoncées, l'étape en dure vingt-six depuis
[6.1-D](../phase-6/6-1-d-publication.md) ([defauts-fonctionnels.md](../defauts-fonctionnels.md)). Les
Réglages remplacent les « Talence » codés en dur par la colonne `campus` là où il en reste, et donnent
leurs formes à l'entrée « Statistiques anonymes » posée par [7-D](7-d-la-mesure.md).
