# 7-J — Les écrans

> **Cadre, pas encore spécification.** Publication : **6.3**. Trois lots, un par écran : le Planning, la
> Scolarité, les Réglages. Chaque lot se spécifie au moment de s'ouvrir, avec le relevé de
> [7-I](7-i-releve-et-vocabulaire.md) en main.
>
> **Un écran par session, jamais deux.** La règle vient du volet 2 de la phase 6
> ([ce qui n'est pas un jalon](../phase-6/README.md#ce-qui-nest-pas-un-jalon-et-pourquoi)) :
> ce qui se juge se tranche en session, et un lot se coche quand sa session est close.

## La règle d'ouverture, invariable

> On lit `src/shared/theme/` et `src/shared/ui/`, et on n'emploie que ce vocabulaire ; un motif qui
> existe se réutilise, un motif qui apparaît une deuxième fois remonte dans `shared/ui/`.

Puis la **recette d'écran** de [theme.md](../theme.md), déroulée jusqu'au bout. Et la règle qui
protège le lot : un défaut fonctionnel rencontré en chemin s'inscrit dans
[defauts-fonctionnels.md](../defauts-fonctionnels.md) et **ne se corrige pas au passage**, sauf s'il
tombe exactement dans le périmètre — sans quoi le lot devient invérifiable.

## Les trois lots

Le tableau de bord Campus n'est pas dans cette liste : il est traité par
[7-I](7-i-releve-et-vocabulaire.md), comme écran fondateur du vocabulaire.

### Lot 1 — Planning, jour et semaine

Le cœur de l'application, et l'écran le plus vu.
[`DayView.tsx`](../../src/features/Planning/views/DayView.tsx) (382 l.),
[`ScheduleList.tsx`](../../src/features/Planning/components/ScheduleList.tsx) (584 l.),
`DayViewHeader.tsx`, `CourseRow.tsx`.

> **C'est un écran de référence de [6-K](../phase-6/6-k-socle-visuel.md).** Y toucher rouvre un
> contrat — celui qui disait que les écrans de référence rendent à l'identique avant et après. À
> assumer explicitement dans la spécification du lot, pas à découvrir en relisant 6-K.

Deux pièges déjà payés à ne pas rouvrir : le carrousel de cours porte **trois formes essayées puis
défaites**, gravées dans `CourseRow` ; et la vue semaine n'affiche aucune description depuis 6-E,
verrouillé par un test — ce n'est pas un oubli.

**Ajouté le 2026-09-14.** Le lot porte la vraie politique **stale-while-revalidate** du
Planning : le jour demandé s'affiche **depuis le cache tout de suite**, et le réseau rejoue derrière.
La fenêtre de fraîcheur de 60 s posée en 6.2.2 n'en est que la moitié invisible — celle qui empêche
un run automatique de repartir sur une clé relue à l'instant — ; ici se dessine ce que l'écran montre
pendant qu'il relit. Et, si la session le décide, une **visionneuse maison** sur `expo-image` et
gesture-handler : `react-native-image-viewing` reste en 6.2.2, alimentée en URL rendues.

### Lot 2 — Scolarité

Le plus riche en attentes longues : parcours froid, widgets qui se remplissent un par un, barre de
progression. C'est là que vit le défaut **déjà rangé pour cette version** par décision du
propriétaire du produit :

> **La barre du parcours froid paraît se figer vers 30 %** ([defauts-fonctionnels.md](../defauts-fonctionnels.md)).
> Le palier « connexion » plafonne à 34 % pour dix-huit secondes annoncées ; depuis
> [6.1-D](../phase-6/6-1-d-publication.md) l'étape en dure vingt-six. *« C'est du rythme, pas du
> comportement. »*

L'écran a déjà eu sa session de formes le 2026-08-25 : son socle est propre, seul le mouvement
manque.

**Ajouté le 2026-09-14.** La barre du parcours froid est **recalibrée** sur les durées mesurées par
[6.1-D](../phase-6/6-1-d-publication.md), et la connexion universitaire — quatorze à vingt-six secondes
selon le portail — s'occupe : un **mini-jeu au pouce** pendant qu'elle se joue, qui **s'efface à
l'arrivée du dossier**. C'est la touche créative de la version, sur le seul écran où l'attente est longue
par nature.

### Lot 3 — Réglages

**Le seul écran que la refonte 6-K n'a jamais eu.** C'est encore une classe React de 491 lignes avec
son `Animated.Value` fait main et son en-tête maison :
[`SettingsScreen.tsx`](../../src/features/Settings/screens/SettingsScreen.tsx),
`SettingsSections.tsx`, `SettingsModals.tsx`.

Deux coups d'une pierre — le lot lui donne ses formes et son mouvement en même temps. C'est aussi
l'écran le moins regardé de l'application : à faire en dernier, pour que le vocabulaire soit stable
quand il arrive.

**Ajouté le 2026-09-14.** Le lot porte aussi le côté application du multi-campus, que les
colonnes de la 6.2.2 rendent possible : la **liste des établissements regroupée par `campus`**, la
**recherche par `alias`**, et le remplacement des « Talence » codés en dur —
[`CampusApiMapping.ts:148`](../../src/features/Campus/services/CampusApiMapping.ts) dans
`extractBuildingsFromRooms`,
[`FreeRoomSectionCard.tsx:62`](../../src/features/Campus/Dashboard/components/FreeRoomSectionCard.tsx),
[`FreeRoomListItem.tsx:45`](../../src/features/Campus/FreeRoom/components/FreeRoomListItem.tsx) —
par la colonne. Deux entrées de plus : **« Soutenir »**, si `services.soutien` existe dans le
catalogue — le don vit sur le site, ouvert dans le navigateur du système, règle des stores —, et
**« Statistiques anonymes »**, que la 6.2.3 pose dans une section Confidentialité : le lot lui
donne ses formes, il ne la crée pas.

## La passe « voix éditoriale »

Ajoutée le 2026-09-14, transversale aux trois lots et au tableau de bord : les **états vides** et
les **journées libres** parlent avec la voix du projet — sympathique, subtile, **un rebondissement
par écran, jamais plus**. Une phrase qui fait sourire une fois fatigue à la dixième ouverture ; la
passe se juge donc sur la durée, pas à la première lecture.

## Ce qui se ramasse en chemin

- ~~Les dix-huit runs de `ukit.celcat.occupation` du tableau de bord, un par bâtiment~~ — **corrigé
  le 2026-09-14** : ils partent de la **fiche d'un bâtiment**
  ([`FreeRoomDetailsScreen`](../../src/features/Campus/FreeRoom/FreeRoomDetailsScreen.tsx) →
  [`useFreeRoomsData`](../../src/features/Campus/FreeRoom/hooks/useFreeRoomsData.ts), lignes 61-78),
  **un par salle** — dix-huit pour l'A28 — à chaque ouverture ; le tableau de bord (`FreeRoomSection`)
  ne joue que la liste des salles, en cache sept jours. Défaut antérieur, relevé en 6.1-C, **traité en
  6.2.2** par un cache d'occupation par bâtiment et par jour (10 min) ; il ne reste à la 6.3 que la
  **requête groupée** par bâtiment, si la sonde de la 6.2.2 la valide.
- Les captures de [screenshots/](../screenshots/) à refaire pour chaque écran repris, plus les deux
  qui manquent déjà au dépôt (`pilotage-bandeau-info.png`, `pilotage-incident.png`).

## Dépendances

[7-I](7-i-releve-et-vocabulaire.md), entièrement : un lot qui invente son vocabulaire au
lieu de l'appliquer produit exactement la dérive que 6-K a mesurée. Et, depuis le 2026-09-14, ce que
les deux versions courtes déposent avant elle : les colonnes `credits`, `campus`, `alias` et
`expo-image` (6.2.2), l'entrée « Statistiques anonymes » (6.2.3).

## Limites écrites

- **Trois lots ne font pas une application fluide.** Le relevé dira combien d'écrans restent en
  dehors, et c'est cette liste — pas une impression — qui décidera d'une extension.
- **Le mouvement se juge à l'œil, sur un appareil.** Aucune porte automatique ne le mesure ; c'est la
  raison pour laquelle le relevé initial est la seule liste de contrôle honnête.
