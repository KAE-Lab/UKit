# 6.3-B — Les écrans

> **Cadre, pas encore spécification.** Chaque session se spécifie au moment de s'ouvrir, avec le
> relevé de [6.3-A](6-2-a-releve-et-vocabulaire.md) en main.
>
> **Une session par écran, jamais deux.** La règle vient du volet 2 de la phase 6 et n'a pas bougé :
> *« ce qui se vérifie devient un jalon, ce qui se juge reste une conversation »*.

## La consigne d'ouverture, invariable

> Lis `src/shared/theme/` et `src/shared/ui/`, tu n'as droit qu'à ce vocabulaire ; un motif qui
> existe se réutilise, un motif qui apparaît une deuxième fois remonte dans `shared/ui/`.

Puis la **recette d'écran** de [theme.md](../theme.md), déroulée jusqu'au bout. Et la règle qui
protège la session : un défaut fonctionnel rencontré en chemin s'inscrit dans
[defauts-fonctionnels.md](../defauts-fonctionnels.md) et **ne se corrige pas au passage**, sauf s'il
tombe exactement dans le périmètre — sans quoi la session devient invérifiable.

## Les trois sessions

Le tableau de bord Campus n'est pas dans cette liste : il est traité par
[6.3-A](6-2-a-releve-et-vocabulaire.md), comme écran fondateur du vocabulaire.

### S1 — Planning, jour et semaine

Le cœur de l'application, et l'écran le plus vu.
[`DayView.tsx`](../../src/features/Planning/views/DayView.tsx) (382 l.),
[`ScheduleList.tsx`](../../src/features/Planning/components/ScheduleList.tsx) (584 l.),
`DayViewHeader.tsx`, `CourseRow.tsx`.

> **C'est un écran de référence de [6-K](6-k-socle-visuel.md).** Y toucher rouvre un contrat — celui
> qui disait que les écrans de référence rendent à l'identique avant et après. À assumer
> explicitement dans la spécification de la session, pas à découvrir en relisant 6-K.

Deux pièges déjà payés à ne pas rouvrir : le carrousel de cours porte **trois formes essayées puis
défaites**, gravées dans `CourseRow` ; et la vue semaine n'affiche aucune description depuis 6-E,
verrouillé par un test — ce n'est pas un oubli.

### S2 — Scolarité

Le plus riche en attentes longues : parcours froid, widgets qui se remplissent un par un, barre de
progression. C'est là que vit le défaut **déjà rangé pour cette version** par décision du
propriétaire du produit :

> **La barre du parcours froid paraît se figer vers 30 %** ([defauts-fonctionnels.md](../defauts-fonctionnels.md)).
> Le palier « connexion » plafonne à 34 % pour dix-huit secondes annoncées ; depuis
> [6.1-D](6-1-d-publication.md) l'étape en dure vingt-six. *« C'est du rythme, pas du
> comportement. »*

L'écran a déjà eu sa session de formes le 2026-08-25 : son socle est propre, seul le mouvement
manque.

### S3 — Réglages

**Le seul écran que la refonte 6-K n'a jamais eu.** C'est encore une classe React de 491 lignes avec
son `Animated.Value` fait main et son en-tête maison :
[`SettingsScreen.tsx`](../../src/features/Settings/screens/SettingsScreen.tsx),
`SettingsSections.tsx`, `SettingsModals.tsx`.

Deux coups d'une pierre — la session lui donne ses formes et son mouvement en même temps. C'est aussi
l'écran le moins regardé de l'application : à faire en dernier, pour que le vocabulaire soit stable
quand il arrive.

## Ce qui se ramasse en chemin

- **Les dix-huit runs de `ukit.celcat.occupation` du tableau de bord**, un par bâtiment
  (`FreeRoomSection` / `useFreeRoomsData`) : défaut antérieur, relevé en 6.1-C, que la refonte de cet
  écran rencontrera de toute façon.
- Les captures de [screenshots/](../screenshots/) à refaire pour chaque écran repris, plus les deux
  qui manquent déjà au dépôt (`pilotage-bandeau-info.png`, `pilotage-incident.png`).

## Dépendances

[6.3-A](6-2-a-releve-et-vocabulaire.md), entièrement : une session qui invente son vocabulaire au
lieu de l'appliquer produit exactement la dérive que 6-K a mesurée.

## Limites écrites

- **Trois sessions ne font pas une application fluide.** Le relevé dira combien d'écrans restent en
  dehors, et c'est cette liste — pas une impression — qui décidera d'une extension.
- **Le mouvement se juge à l'œil, sur un appareil.** Aucune porte automatique ne le mesure ; c'est la
  raison pour laquelle le relevé initial est la seule liste de contrôle honnête.
