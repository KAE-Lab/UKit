# Thème et design tokens

Toute valeur de style de UKit vient de [`src/shared/theme/Theme.ts`](../src/shared/theme/Theme.ts).
**Aucune couleur, aucun espacement, aucun rayon ne doit être écrit en dur** dans un composant : c'est
la règle qui garantit qu'un changement de thème reste cohérent et qu'un nouvel écran se fond dans
l'existant.

> **Cette règle est exécutable depuis le jalon [6-K](phase-6/6-k-socle-visuel.md)** :
> [`ukit/no-style-literals`](../tools/eslint/no-style-literals.mjs) refuse les couleurs hexadécimales
> et les valeurs de marge, de rayon ou de taille hors tokens, et **nomme le token de remplacement**.
> Elle est en `warn`, et ses avertissements restants sont la liste de travail des sessions de refonte
> ([qualite.md](qualite.md#base-de-référence)). Avant elle, la règle n'existait que dans ce document
> et n'a pas tenu — le dépôt portait 53 couleurs et 142 valeurs en dur
> ([inventaire-visuel.md](inventaire-visuel.md)).

## Ce que le fichier exporte

```ts
import style, { tokens, StyleWelcome, AppThemeType, ThemeKey } from '../shared/theme/Theme';

const theme = style.Theme[themeName];   // themeName : 'light' | 'dark'
```

| Export | Nature | Usage |
|---|---|---|
| `tokens` | primitives de design | espacements, rayons, tailles, graisses, ombres |
| `style.Theme.light` / `.dark` | palettes complètes | couleurs et styles composés d'un thème |
| `style` (défaut) | styles partagés hors thème | `style.list`, `style.calendarList`, plus `style.Theme` |
| `StyleWelcome` | styles du parcours d'accueil | uniquement [Onboarding](features/onboarding.md) |
| `AppThemeType` | `typeof Theme.light` | type d'une prop `theme` |
| `ThemeKey` | `'light' \| 'dark'` | type d'un nom de thème |
| `SemanticTone` | `'success' \| 'warning' \| 'danger' \| 'neutral'` | un **état**, tel qu'un service le nomme |
| `toneColor`, `toneSoftColor` | `(theme, tone) => string` | résolvent un ton sur le thème courant |

## Les tokens

```ts
tokens.space      xxs 2 · xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48
tokens.radius     sm 8 · md 12 · lg 16 · xl 24 · pill 999
tokens.fontSize   xs 12 · sm 14 · md 16 · lg 18 · xl 22 · xxl 28 · title 34
tokens.fontWeight regular 400 · medium 500 · semibold 600 · bold 700
tokens.shadow     sm · md · lg   (objet prêt à étaler : ...tokens.shadow.sm)
```

Les ombres sont des objets complets (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`,
`elevation`) couvrant iOS et Android d'un seul coup : les étaler plutôt que redéfinir les cinq
propriétés.

> **`tokens` vit dans son propre fichier**, [`tokens.ts`](../src/shared/theme/tokens.ts), et non par
> commodité : `Theme.ts` importe `react-native` pour une branche `Platform.OS`, ce qui le rend
> injouable sous Node — donc invérifiable. Les tokens isolés sont de la donnée pure, et c'est ce qui
> permet à un test de vérifier que la table de la règle ESLint n'a pas dérivé
> ([qualite.md](qualite.md#les-tests-unitaires)). Ils restent réexportés par `Theme.ts` : tous les
> imports existants continuent de marcher.

Deux pas ont été **nommés** au jalon 6-K, jamais inventés : `space.xxs` valait 2 en dur dans
26 endroits, et le grand titre de page valait 34 dans quatre écrans. Ce dernier a pris la place de
`fontSize.hero: 36`, qui n'était référencé nulle part.

Ce que les tokens ne couvrent **pas**, volontairement : les `width`, `height` et **tailles d'icône**.
Le dépôt en porte treize distinctes, sans échelle, et en inventer une dépasserait le mandat du jalon
— extraire ce qui est là, pas dessiner ce qui manque. C'est aussi pourquoi la règle ESLint ne les
signale pas.

## Les palettes

Chaque thème expose le même jeu de clés — c'est ce qui rend `AppThemeType` fiable. La palette suit
les couleurs système d'Apple, choix assumé pour que l'application paraisse native sur iOS sans
dénoter sur Android.

| Clé | Rôle | Clair |
|---|---|---|
| `primary` | couleur d'action principale | `#007AFF` |
| `primarySoft` | même teinte à 8 % pour les fonds d'état actif | `#007AFF15` |
| `secondary` | accent secondaire | `#5856D6` |
| `accent` | couleur d'accentuation (souvent égale à `primary`) | `#007AFF` |
| `accentFont` | texte d'alerte ou de suppression | `#FF3B30` |
| `success` / `successSoft` | « valide », « ouvert », « peu fréquenté » | `#34C759` / `#34C75915` |
| `warning` / `warningSoft` | « attention », « chargé » | `#FF9500` / `#FF950015` |
| `danger` / `dangerSoft` | « en panne », « fermé », « saturé » | `#FF3B30` / `#FF3B3015` |
| `neutral` / `neutralSoft` | état sans jugement, donnée absente | `#8E8E93` / `#8E8E9315` |
| `statusBarBackground` | fond de la barre de statut | `#006F9F` |
| `font` | texte principal | `#1C1C1E` |
| `fontSecondary` | texte secondaire, libellés, icônes inactives | `#8E8E93` |
| `lightFont` | texte sur fond coloré | `#FFFFFF` |
| `link`, `icon`, `border` | liens, icônes, filets | — |
| `background` | fond d'écran | `#F2F2F7` |
| `cardBackground` | fond de carte, d'en-tête, de barre d'onglets | `#FFFFFF` |
| `greyBackground` | fond de bouton discret, de pastille | `#E5E5EA` |
| `collapsableBackground` | fond de section repliable | `#00000008` |
| `field`, `fieldBorder` | champs de saisie | — |
| `courseBackground` | fond des listes de cours et des listes Campus | `#F2F2F7` |
| `eventBackground`, `eventBorder` | carte d'événement | — |
| `sections` | six teintes de fond à 6 % pour les sections de liste | tableau |
| `sectionsHeaders` | les six mêmes teintes pleines | tableau |
| `calendar` | `selection`, `currentDay`, `sunday` | objet |
| `settings` | sous-arbre de styles composés de l'écran Réglages | objet |

### L'échelle sémantique

Ajoutée au jalon [6-K](phase-6/6-k-socle-visuel.md), et **extraite** : ses teintes sont exactement
celles que `sectionsHeaders` portait déjà. Ce qu'elle remplace, ce sont les `#4caf50`, `#ff9800` et
`#f44336` Material recopiés dans les composants — une seconde palette qui vivait à côté de la
première. Le suffixe `Soft` suit la convention posée par `primarySoft`.

**Un service rend un ton, pas une couleur.** Une couche qui ne sait pas quel thème est actif n'a rien
à faire d'un hexadécimal :

```ts
// dans le service
export function getLibraryStatus(...): { statusTone: SemanticTone, ... }

// dans le composant
const couleur = toneColor(theme, statusTone);
```

C'est ce qui a permis de trouver, en le déplaçant, que `LibraryService` distinguait « fermé »
(`#f44336`) de « saturé » (`#ff4436`) par une frappe inversée que personne ne pouvait voir.

### `sections` et `sectionsHeaders`

Deux tableaux de six couleurs, indexés cycliquement (`index % 6`). Ils colorent les en-têtes de
sections dans la recherche de groupes et servent d'accents ailleurs — par exemple
`theme.sectionsHeaders[5]` pour la ligne de messagerie du dashboard Scolarité. Les deux tableaux sont
alignés : `sections[i]` est la version translucide de `sectionsHeaders[i]`.

### Le sous-arbre `settings`

Contrairement au reste de la palette, `theme.settings` contient des **styles composés** prêts à
appliquer (`button`, `buttonMainText`, `popup.container`, `popup.textHeader`, `separationText`…). Il
a été construit pour que l'écran Réglages et ses modales n'aient aucun style local. Un nouvel élément
dans Réglages réutilise ces styles plutôt que d'en écrire.

## Utiliser le thème dans un composant

```tsx
import { useContext } from 'react';
import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';

function MonEcran() {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    return (
        <View style={{
            backgroundColor: theme.cardBackground,
            padding: tokens.space.md,
            borderRadius: tokens.radius.lg,
            ...tokens.shadow.sm,
        }} />
    );
}
```

Un composant purement présentational reçoit plutôt `theme: AppThemeType` en prop — c'est la convention
majoritaire dans `features/*/components/`.

L'usage `theme.accent ?? theme.primary` se rencontre souvent : `accent` est la clé sémantiquement
correcte, `primary` le repli historique. Le conserver dans le code existant, préférer `theme.accent`
dans le neuf.

## Changer de thème

`SettingsManager` porte trois opérations ([donnees-et-persistance.md](donnees-et-persistance.md)) :

- `setTheme('light' | 'dark')` — bascule explicite, diffuse l'événement `theme` ;
- `switchTheme()` — inverse le thème courant ;
- `setAutomaticTheme()` — aligne sur `Appearance.getColorScheme()` du système.

`RootContainer` réagit à l'événement, republie `themeName` dans `AppContext`, et applique la couleur
de fond au `NavigationContainer` pour éviter un flash blanc pendant les transitions.

Le thème n'est **pas** suivi en continu : `setAutomaticTheme()` lit la préférence système une fois
(au premier lancement, depuis l'onboarding). Un changement de mode système en cours d'exécution ne
bascule pas l'application.

> **Capture attendue** — `theme-clair-sombre.png` : un même écran dans les deux thèmes, côte à côte,
> pour servir de référence visuelle.

## Le vocabulaire partagé

[`shared/ui/`](../src/shared/ui/) porte, depuis le jalon [6-K](phase-6/6-k-socle-visuel.md), les
motifs qui étaient recopiés d'écran en écran. **Aucun n'a été dessiné** : chacun a été relevé à
l'identique dans au moins deux endroits ([inventaire-visuel.md](inventaire-visuel.md#3-les-divergences-mesurées)).

| Composant | Ce qu'il rend | Relevé |
|---|---|---|
| [`Card`](../src/shared/ui/Card.tsx) | la surface d'une carte : fond, rayon `xl`, ombre `md`, apparition animée. **Ni largeur ni marges** — elles arrivent par `style` | 6 fois |
| [`SectionHeader`](../src/shared/ui/SectionHeader.tsx) | titre de section, chevron, destination | 4 fois |
| [`Badge`](../src/shared/ui/Badge.tsx) | pastille icône + libellé, teinte d'action ou `tone` sémantique | 8 fois |
| [`MetaRow`](../src/shared/ui/MetaRow.tsx) | ligne « icône + texte secondaire (+ contenu à droite) » | 9 fois |
| [`EmptyState`](../src/shared/ui/EmptyState.tsx) | icône, message, action facultative — **le même bloc** pour une liste vide et pour une source en panne | 2 fois |
| [`LoadingState`](../src/shared/ui/LoadingState.tsx) | l'attente, en ligne ou plein écran | 6 fois |
| [`ProgressBar`](../src/shared/ui/ProgressBar.tsx) | jauge, **rayon calculé** (`height / 2`) | 3 fois |
| [`Icon`](../src/shared/ui/Icon.tsx) | une icône de l'une ou l'autre famille, typée | — |
| [`SourceFailureNotice`](../src/shared/ui/SourceFailureNotice.tsx) | l'échec d'une source, bâti sur `EmptyState` | — |
| [`ScreenState`](../src/shared/ui/ScreenState.tsx) | **l'hôte** d'un état plein écran : il décide où le bloc se pose, pas de quoi il est fait | 6 fois |
| [`ActionButton`](../src/shared/ui/ActionButton.tsx) | une action hors dialogue : `filled`, `tonal`, `destructive` | 4 fois |

`ScreenState` a été remonté pour une raison que le jalon 6-K n'avait pas vue : le **bloc** était
partagé, son **hôte** ne l'était pas, et c'est l'hôte qui décide de la hauteur. Six écrans calaient le
leur différemment, d'où des états vides qui flottaient tantôt trop haut, tantôt trop bas. Il exporte
aussi `HEADER_OFFSET` et `TAB_BAR_HEIGHT` : les deux seuls endroits du dépôt où ces hauteurs sont
écrites, `NavHelpers` et `MainTabNavigator` les important de là.

**`Icon` existe pour une raison précise** : le dépôt mélange `MaterialIcons` et
`MaterialCommunityIcons`, et les glyphes ne se correspondent pas — la punaise de lieu est
`location-on` chez l'un et n'existe pas chez l'autre. Un composant partagé qui n'aurait connu qu'une
famille aurait obligé ses appelants à **changer de glyphe** pour l'utiliser.

## La recette d'écran

La liste que **toute session de refonte d'écran vérifie**. Elle est le pendant visuel de la
« définition de terminé » du [CONTRIBUTING](../CONTRIBUTING.md#définition-de--terminé-).

1. **En-tête animé.** L'écran passe par `withHeaderAnimation` (s'il défile) ou `withStaticHeader`
   (sinon), tous deux dans [`NavHelpers.tsx`](../src/shared/navigation/NavHelpers.tsx). Ils donnent le
   même `headerPadding` : `paddingTop = insets.top + 70`. Un écran qui calcule le sien dérive.
2. **Marges de page identiques.** Le contenu respire de `tokens.space.md` sur les côtés, les cartes de
   `tokens.space.sm` de plus. Ne pas mélanger `paddingHorizontal` sur le conteneur et `marginHorizontal`
   sur les enfants dans un même écran.
3. **Quatre états, et ils sont différents.** Chargement (`LoadingState`), vide (`EmptyState`), erreur
   (`SourceFailureNotice`), et **couverture partielle** quand la source est interrogée en plusieurs
   points (`CampusPartialNotice`). S'ils se ressemblent, l'écran ment : une liste vide n'est pas une
   panne. C'est la thèse de la [Phase 6](phase-6/README.md) tout entière.

   Les trois premiers se posent dans un [`ScreenState`](../src/shared/ui/ScreenState.tsx) quand ils
   occupent l'écran : **c'est lui qui décide de leur hauteur, jamais l'écran**. Un écran qui calcule
   son propre centrage dérive, et six l'ont fait.
4. **Un état vide propose une action quand il en existe une.** « Colle ton lien », « connecte ton
   compte » — jamais un bouton Réessayer, qui répare une panne et pas une absence.
5. **Cibles tactiles ≥ 44 pt.** Une icône de 22 px est une cible de 22 px : elle prend un `hitSlop` ou
   un rembourrage. Le dépôt n'en porte que cinq, tous sur la même étoile de favori.
6. **Les deux thèmes.** Basculer depuis Réglages et reparcourir l'écran : aucun texte illisible, aucun
   fond resté clair, aucune teinte sémantique éteinte sur fond noir.
7. **Aucune chaîne en dur**, les trois dictionnaires à jour ([i18n.md](i18n.md)).
8. **Aucun littéral de style** : `npx eslint <fichier>` ne doit rien signaler de nouveau.
9. **Aucune forme ronde.** Toute surface est un **carré arrondi** — `radius.md` par défaut,
   `radius.lg` pour un conteneur, `radius.xl` pour une carte. `radius.pill` est réservé aux points
   d'état, aux compteurs et aux jauges, et à rien d'autre. C'est la signature de forme de
   l'application ; voir [les décisions durables](#les-décisions-durables).
10. **Le vocabulaire d'abord.** Avant d'écrire un composant, lire [`shared/theme/`](../src/shared/theme/)
   et [`shared/ui/`](../src/shared/ui/). Un motif qui existe déjà se réutilise ; un motif qui apparaît
   une deuxième fois remonte.
11. **Une capture**, dans [`docs/screenshots/`](screenshots/README.md), et la comparaison avec
    l'ancienne si l'écran en avait une.

## Les décisions durables

> **Section vivante.** Une session de refonte qui aboutit à une décision qui vaut au-delà de son écran
> — « les cartes ont toujours ce rayon », « pas d'ombre sur fond sombre », « un état vide propose
> toujours une action » — la consigne **ici**. Sans ça, la session suivante la défait, et on tourne en
> rond.

Acquises, et qui ont coûté à être trouvées :

- **Les surfaces de UKit sont des carrés arrondis. Rien n'est rond, sauf ce qui compte.**
  C'est **la** signature de forme de l'application, et elle se mesure plutôt qu'elle ne s'affirme :
  sur les rayons posés dans `src/`, **`radius.md` (12) en porte les deux tiers** et `radius.lg` (16)
  presque tout le reste ; `radius.xl` (24) est réservé à la surface d'une carte (`Card`).
  `radius.pill` ne survit que **cinq fois**, et les cinq sont des **pastilles ou des compteurs** : deux
  points d'état de 8, un de 14, le compteur de messages non lus, le compteur de cours d'une journée.
  S'y ajoutent les jauges de [`ProgressBar`](../src/shared/ui/ProgressBar.tsx), dont le rayon se
  calcule (`height / 2`).

  | Ce qu'on habille | Rayon |
  |---|---|
  | une carte | `radius.xl` |
  | un conteneur de dialogue, un encart, une surface d'icône (72) | `radius.lg` |
  | **tout le reste** — bouton, champ, pastille rectangulaire, vignette | `radius.md` |
  | un point d'état, un compteur, une jauge | `radius.pill`, ou `height / 2` |

  Les gabarits existants font foi : bouton de retour 40 × 40 en `radius.md`, bouton favori et bouton
  de filtre 45 × 45 en `radius.md`, pastille du tiroir 36 × 36 en `radius.md`, encart d'icône du
  formulaire de lien 72 × 72 en `radius.lg`. **Une nouvelle surface se copie sur l'un d'eux**, elle ne
  s'invente pas — et surtout, elle ne devient pas un cercle ou une pilule parce que ça « fait
  moderne ». Deux éléments ont dû être ramenés à cette règle après coup, la surface d'icône d'un état
  vide et la barre de recherche Campus : c'est le genre d'écart qui coûte un aller-retour à chaque
  fois qu'il est refait.
- **`accentFont` est le rouge destructif** (`#FF3B30`), pas « texte sur fond accent ». Pour un libellé
  sur fond `primary`, c'est **`lightFont`** — blanc dans les deux thèmes. Trouvé au jalon 6-B.
- **Un composant ne remonte dans [`shared/ui/`](../src/shared/ui/) qu'à partir de deux usages.** C'est
  la règle qui a gouverné `SourceFailureNotice`, remonté au jalon 6-E quand un rendu d'échec s'est
  retrouvé recopié — et qui garde un carrousel de cours simultanés chez lui.
- **Une carte, c'est `radius.xl` et `shadow.md`.** Relevé six fois à l'identique avant d'être nommé.
  La carte ne décide **ni de sa largeur ni de ses marges** : une carte de liste occupe la largeur et
  s'espace verticalement, une carte de carrousel a une largeur fixe et s'espace à droite. Les figer
  aurait forcé l'un des deux à contourner le composant, et un composant qu'on contourne ne sert à rien.
- **Un service rend un ton, pas une couleur.** `SemanticTone` et `toneColor` — voir
  [l'échelle sémantique](#léchelle-sémantique). Trouvé au jalon 6-K, en déplaçant `getLibraryStatus`.
- **`` `${theme.primary}15` `` n'est pas `theme.primarySoft`.** En thème sombre le premier vaut
  `#5E5CE615` et le second `#0A84FF20`. Les huit pastilles qui utilisent le premier ne sont **pas**
  à « corriger » vers le second : ce serait changer huit endroits en silence.
- **Un rayon de pilule se calcule, il ne s'écrit pas.** Une jauge de 6 px et une de 8 px prenaient
  `borderRadius: 3` et `4` en dur. `height / 2` rend les deux à l'identique et supprime le littéral.
  Vaut pour toute pastille ronde : `tokens.radius.pill`.
- **Un bouton de confirmation est un bouton plein, pas un texte coloré.** Les popups portaient deux
  boutons **gris identiques** que seule la couleur du texte distinguait — un vocabulaire antérieur à
  la palette actuelle. Depuis le jalon 6-K, `popup.buttonMain` est un bouton plein `primary` à texte
  `lightFont`, exactement celui de Réessayer : une seule façon de dire « action principale » dans
  toute l'application.
- **Une action destructive prend `popup.buttonDestructive`**, plein `danger`. Le distinguo n'est pas
  cosmétique : mettre « Réinitialiser l'application » et « Ajouter au calendrier » dans le même bleu
  plein dit que les deux sont également recommandées. Sont destructives les actions qui **retirent
  quelque chose que l'utilisateur ne peut pas récupérer** — l'extinction de la synchronisation, qui
  efface des cours de son agenda personnel, et la réinitialisation. Changer d'établissement ne l'est
  pas : c'est réversible, et les favoris reviennent (jalon 6-J).
- **La graisse d'un bouton vient du thème.** Trois popups sur cinq forçaient `fontWeight: '600'` en
  surcharge locale, les deux autres non : les mêmes boutons n'avaient pas la même graisse selon
  l'écran. Les surcharges sont retirées.
- **Un état vide a deux dispositions, pas deux dialectes.** `EmptyState` en `card` quand le bloc
  s'inscrit dans une liste qui défile, en `plain` quand il **est** l'écran — une carte posée au milieu
  d'un écran vide flotterait sans rien pour l'ancrer. Le Planning avait sa propre version de `plain`,
  en trois exemplaires et trois tailles d'icône ; elle a convergé au jalon 6-K.
- **Ne jamais concaténer, dans un service, une chaîne traduite et une donnée distante.** Le service
  ne sait pas dans quelle langue on lit. Le statut d'une bibliothèque le faisait — « Closed - Ouvre
  demain à 09:00 », un libellé traduit soudé à une phrase que le fournisseur ne publie qu'en français.
  `getLibraryStatus` rend donc deux champs, `statusText` et `statusNote`, et le composant les rend en
  **deux `Text`**.

  **La séparation reste dans le code, pas dans la couleur.** Le jalon 6-K avait aussi passé la
  précision en gris secondaire pour distinguer visuellement les deux origines ; c'est revenu à la
  couleur du statut, avec un tiret, sur arbitrage du propriétaire du produit. À l'usage, la
  distinction ne se décodait pas — personne ne lit « gris donc ça vient du fournisseur » — et les deux
  moitiés se lisaient comme deux fragments collés. Ce qui comptait dans ce jalon est intact : la
  concaténation a disparu du service, ce qui est la seule moitié qui rendait la chaîne intraduisible
  par construction.
- **Un `?.` sur le thème masque une dépendance au lieu de la déclarer.** `CampusFilterModal` lisait
  `theme.settings?.popup?.*` en doublant chaque style d'un objet écrit inline « au cas où » : un
  troisième dialecte de modale, jamais affiché, qui divergeait à chaque retouche du vrai.
  `settings.popup` fait partie de `AppThemeType` — son absence serait un thème cassé, pas un cas à
  rattraper.
- **L'application n'a qu'une police : celle du système.** San Francisco sur iOS, Roboto sur Android.
  La hiérarchie tient entièrement à l'échelle de tailles (`title` 34 → `xs` 12) et aux graisses
  (400 → 700), exactement comme iOS la construit. **Ne pas réintroduire de `fontFamily`.**

  Montserrat a vécu ici jusqu'au 2026-08-16, et son retrait vaut d'être expliqué : elle n'était
  appliquée qu'aux titres, aux en-têtes de section et à la Scolarité — jamais au contenu, ni les
  cartes de cours, ni les listes Campus. Ce n'était donc pas un système « police de titrage + police
  d'interface », c'était un résidu, et il se voyait. S'y ajoutent deux raisons de fond : la palette
  suit délibérément les couleurs système d'Apple *pour que l'application paraisse native*, et la
  typographie doit suivre la même logique ; et Montserrat est une **géométrique de titrage**, large
  et ronde, là où les listes de cours portent cinq lignes de métadonnées chacune.

  Une identité typographique reste possible — mais alors partout, corps compris, et en vérifiant la
  lisibilité des listes denses. Le mélange, lui, est tranché.
- **Un état plein écran s'ancre en haut, jamais au centre.** Il se pose à une distance fixe
  (`space.xxl`) sous l'en-tête, la même sur les huit écrans qui en portent un. C'est le rôle de
  [`ScreenState`](../src/shared/ui/ScreenState.tsx), et **aucun écran ne calcule plus le sien**.

  Le centrage a été essayé et abandonné, ce qui vaut d'être écrit pour qu'on ne le retente pas :
  centrer demande de connaître ce qui occupe le **bas** de chaque écran, et ce n'est pas la même chose
  partout — la barre d'onglets sur les quatre onglets, la barre de recherche flottante sur les listes
  Campus, rien du tout sur un écran poussé. Deux tentatives ont échoué : un rembourrage symétrique,
  qui recentre sur l'écran entier au lieu de la surface libre, puis un rembourrage correct en haut
  mais aveugle aux 80 points de la barre de recherche, qu'aucun `insets` ne déclare. Le bloc tombait
  « légèrement en dessous du milieu » — la pire position, ni centrée ni ancrée, et illisible comme
  intention. L'ancrage haut **supprime la classe de défaut** au lieu de la re-régler.

  Deux dispositions à distinguer : un en-tête transparent sous lequel le contenu glisse (cas par
  défaut) et un en-tête rendu dans le flux (`topOffset={0}`, le Planning et son `DayViewHeader`).
- **La surface d'icône d'un état porte son ton, et c'est ce qui rend la sévérité lisible avant les
  mots.** Une source en panne et un établissement qui ne publie pas d'emploi du temps portaient le
  **même carré gris** : la distinction que la [Phase 6](phase-6/README.md) a passé sept jalons à
  établir — ce qui est cassé contre ce qui est absent — n'existait qu'en toutes lettres. Le ton vit
  dans la table de [`failures.ts`](../src/shared/aetherius/failures.ts), à côté du titre et du
  message, parce que c'est la même décision : **la famille décide**. Les familles qui veulent dire
  « quelque chose est cassé » sont `danger` ; `config` et `cancelled`, qui veulent dire « il manque
  un geste » ou « tu es parti », restent `neutral`. Peindre en rouge une université qui n'a pas
  d'emploi du temps dirait qu'elle est en panne.

  **`neutral` ne passe pas par `neutralSoft`** : ce gris à 8 % se composite à un point du fond de page
  et la surface disparaîtrait. Il prend `greyBackground` — celui du bouton de retour et du bouton de
  filtre en en-tête, la surface grise établie — plus un filet `border`, parce qu'à 72 points un aplat
  à quatre pour cent d'écart du fond se lit comme une tache et non comme un objet. Les tons
  sémantiques n'ont pas de filet : leur teinte les détache déjà.
- **Une confirmation se réserve aux gestes coûteux, et le coût n'est pas toujours une destruction.**
  La règle posée par la synchronisation calendrier — « l'extinction passe par une confirmation,
  l'allumage non » — se lisait comme « on confirme ce qui détruit ». Elle est plus large :
  « Actualiser mon dossier » ne détruit rien, mais **rejoue une connexion complète**, prend l'écran
  plusieurs secondes et ne s'annule pas une fois lancé. Il a donc sa confirmation, et elle porte
  l'explication du geste — au moment de décider, plutôt qu'en ligne d'aide sous le bouton, que
  personne ne lit et qui cassait le rythme des trois actions de l'écran.
- **Un état vide a une masse, pas seulement un message.** Un glyphe dans un **disque** de 72, un
  **titre obligatoire** en `theme.font`, un message en `fontSecondary` à mesure courte (300), puis
  l'action. Avant, c'était un glyphe gris de 48 et une ligne unique étirée sur la largeur : ce n'est
  pas l'espace qui donnait à ces écrans leur air de vide bizarre, c'est l'absence de hiérarchie. Le
  titre est **obligatoire dans le type** — c'est le compilateur qui garantit qu'aucun écran n'en
  oublie un, pas une ligne de liste à cocher.
- **Un échec porte un titre et un message, et ils viennent de la même table.** `titleKey` dit ce qui
  s'est passé (« Service indisponible »), `messageKey` ce qu'on peut y faire (« Vérifie ta connexion,
  puis réessaie »). Les deux se décident ensemble ou pas du tout : un titre de famille au-dessus d'un
  message de code dirait deux choses différentes du même échec. Les deux seuls endroits qui les
  précisent sont ceux qui précisaient déjà le message — `serviceAbsent` et la table de codes de la
  scolarité.
- **Une action hors dialogue a trois formes, et c'est le libellé qui porte le sens, jamais le fond.**
  `filled` (fond `primary`, libellé `lightFont`) pour l'action principale — le même bouton que
  Réessayer. `tonal` et `destructive` partagent **le même fond gris** `greyBackground` et ne diffèrent
  que par la couleur du libellé, `primary` ou `danger`. Le modèle est le bouton « Réserver » de la
  fiche d'une bibliothèque, qui pose depuis toujours un libellé `primary` gras sur `greyBackground`.

  Une version intermédiaire teintait le fond destructif en `dangerSoft` — du rouge à 8 % sous un
  libellé rouge : le contraste s'effondrait et le bouton se fondait, exactement le défaut qu'on venait
  de corriger sur les boutons bordés. **Un fond plein coloré reste réservé à deux cas** : `primary`
  pour l'action principale, et `danger` dans les **dialogues** de confirmation — une confirmation
  assume sa gravité, une entrée de liste l'annonce.

  Ce qui a été supprimé au passage : trois boutons **bordés à fond transparent** dans les réglages du
  compte — ils avaient la couleur du fond de page et disparaissaient — et un lien texte nu en
  `accentFont` pour oublier un lien d'abonnement.
- **L'échelle d'un dialogue.** Conteneur en `radius.lg` et `space.lg` de rembourrage, titre en
  `fontSize.xl`, deux boutons en `flex: 1` de 48 de haut à libellé `fontSize.md` semi-gras. Les
  proportions précédentes — `radius.xl`, `space.md`, boutons de 150 × 52 sous un libellé de 16 —
  ont été recadrées après mesure à l'usage : le bouton lisait comme un bouton géant et le conteneur
  comme une pastille. **L'écart description → boutons reste à 16**, et ne suit pas le rembourrage du
  conteneur : une première version l'avait porté à 32 en même temps, ce qui creusait un trou au milieu
  du dialogue. Et **un titre de dialogue ne se crie pas** : cinq popups sur sept le mettaient en
  majuscules, deux non. Les `.toUpperCase()` sont retirés.
- **L'application tutoie.** Vingt et une chaînes françaises héritées vouvoyaient — réinitialisation,
  favoris, identifiants, biométrie, calendrier — quand tout ce qui a été écrit depuis le jalon 6-G
  tutoyait. Le mélange se voyait dans les popups et les états vides. `en` et `es` ne portent pas la
  distinction. Voir [i18n.md](i18n.md).
- **Les cartes de toutes les sections ont la même hauteur, et c'est au contenu de s'y plier.** Le
  tableau de bord Campus empile quatre carrousels ; si l'un d'eux est plus haut d'une ligne, l'écran
  entier perd son rythme. Une donnée qui vient d'une source est une **phrase libre** — les horaires
  d'un restaurant en sont une, parfois longue — et elle se coupe donc à `numberOfLines`, sans état
  d'âme. Ce qui a été tronqué se retrouve **en entier sur l'écran de détail**, qui a la place.

  Le corollaire, appris en cherchant où poser ce texte complet : **une information se lit, elle ne se
  déclenche pas.** Elle va dans la page, jamais derrière un bouton. Le seul bouton qu'un écran de
  détail porte est une **action** — « Réserver » pour une bibliothèque, la carte pour un restaurant.
- **Un composant d'un seul écran reste chez lui**, et un composant de domaine ne monte pas dans le
  socle. La distance à pied et l'affluence d'une bibliothèque vivent dans
  [`CampusCardParts.tsx`](../src/features/Campus/components/CampusCardParts.tsx), pas dans
  `shared/ui/` : le socle n'a aucune raison de connaître les bibliothèques.

## Vérifier

- Basculer clair / sombre depuis Réglages et parcourir les quatre onglets : aucun texte illisible,
  aucun fond resté clair.
- Vérifier les surfaces qui ne passent pas par la palette : la carte (HTML généré), les modales, la
  barre de statut.
- Sur un écran modifié, **jouer `npx eslint <fichier>`** plutôt que chercher les littéraux à l'œil :
  c'est exactement ce que la règle fait, et elle nomme le token de remplacement.
- Dérouler la [recette d'écran](#la-recette-décran) — en particulier les quatre états, qui sont ce
  qu'une relecture de code ne voit jamais.

## Limites connues

- **Le fichier fait plus de 1 100 lignes** et désactive explicitement `max-lines`. C'est assumé : il
  s'agit de données de style, dont le découpage nuirait à la lisibilité et à la comparaison clair /
  sombre. Seuls les `tokens` en ont été sortis, et pour une raison technique — les rendre testables.
- **`StyleWelcome` est un jeu de styles séparé**, hérité du parcours d'accueil, qui ne suit pas la
  structure des deux thèmes.
- **`androidStatusBar` reste en dur dans [`app.config.ts`](../app.config.ts)**, comme la couleur de
  l'écran de démarrage : Expo les lit avant que l'application — donc le thème — existe. C'est pourquoi
  ce fichier est exempté de la règle ESLint. Côté application, la barre de statut est passée par
  `statusBarBackground` au jalon 6-K, à valeur inchangée.
- **La règle ESLint ne juge pas du goût.** Elle empêche une valeur en dur, pas une mauvaise
  proportion. Et elle ne couvre ni les dimensions ni les tailles d'icône, faute d'échelle à leur
  opposer — treize tailles d'icône distinctes cohabitent, mesurées et laissées aux sessions.
- **Extraire depuis l'existant fige aussi ses défauts.** Deux écarts relevés au jalon 6-K sont
  **volontairement conservés** parce que les corriger déplacerait des pixels dans des écrans de
  référence : l'écart icône → texte vaut tantôt 4 tantôt 6, et six ombres restent écrites à la main
  faute de correspondre à `tokens.shadow`. Ils sont consignés dans
  [inventaire-visuel.md](inventaire-visuel.md#3-les-divergences-mesurées).
- **Deux jeux de couleurs hérités subsistent en tête de fichier** : `colors` (encore référencé, dans
  `StyleWelcome`, `style.list`, la couleur du calendrier système et le retour de notification) et
  `hintColors` (exposé par `style.hintColors`). `colors50` et `colors200`, deux palettes Material
  entières que plus rien ne lisait, ont été **supprimées** le 2026-08-16.
