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
import style, { tokens, AppThemeType, ThemeKey } from '../shared/theme/Theme';

const theme = style.Theme[themeName];   // themeName : 'light' | 'dark'
```

| Export | Nature | Usage |
|---|---|---|
| `tokens` | primitives de design | espacements, rayons, tailles, graisses, ombres |
| `style.Theme.light` / `.dark` | palettes complètes | couleurs et styles composés d'un thème |
| `style` (défaut) | styles partagés hors thème | `style.list`, `style.calendarList`, plus `style.Theme` |
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
alignés : `sections[i]` est la version translucide de `sectionsHeaders[i]`. En sombre, l'index 0 a
porté `#5E5CE6` — la valeur du 4 — jusqu'en 6.1-C : cinq teintes au lieu de six, corrigé en `#0A84FF`.

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
| [`LoadingState`](../src/shared/ui/LoadingState.tsx) | l'attente **dans le flux** : un carrousel, une section, une étape d'accueil. Sa phrase reste optionnelle | 6 fois |
| [`ChargementPleinePage`](../src/shared/ui/ChargementPleinePage.tsx) | l'attente **qui occupe l'écran**, sa phrase **obligatoire**, et une seconde ligne après quatre secondes | 5 fois |
| [`ApparitionEnFondu`](../src/shared/ui/ApparitionEnFondu.tsx) | la couture chargement → contenu : 200 ms d'opacité et un léger glissement | 3 fois |
| [`Interrupteur`](../src/shared/ui/Interrupteur.tsx) | l'interrupteur du dépôt, dessiné, identique sur les deux plateformes | 4 fois |
| [`Curseur`](../src/shared/ui/Curseur.tsx) | le curseur du dépôt, dessiné — son arithmétique est [testée à part](../src/shared/ui/echelleDeCurseur.ts) | 1 fois |
| [`ProgressBar`](../src/shared/ui/ProgressBar.tsx) | jauge, **rayon calculé** (`height / 2`) | 3 fois |
| [`Icon`](../src/shared/ui/Icon.tsx) | une icône de l'une ou l'autre famille, typée | — |
| [`SourceFailureNotice`](../src/shared/ui/SourceFailureNotice.tsx) | l'échec d'une source, bâti sur `EmptyState` | — |
| [`ScreenState`](../src/shared/ui/ScreenState.tsx) | **l'hôte** d'un état plein écran : il décide où le bloc se pose, pas de quoi il est fait | 6 fois |
| [`ActionButton`](../src/shared/ui/ActionButton.tsx) | une action hors dialogue : `filled`, `tonal`, `destructive` | 4 fois |
| [`Dialogue`](../src/shared/ui/Dialogue.tsx) | le dialogue informatif : titre, corps, action pleine, sortie secondaire, lien discret — sur le gabarit des popups des Réglages | 3 fois |
| [`ModaleBientot`](../src/shared/ui/ModaleBientot.tsx) | ce que le voile d'un teaser promet : « bientôt », et la porte du service — une composition de `Dialogue` | 2 fois |
| [`ChoixEtablissement`](../src/shared/ui/ChoixEtablissement.tsx) | la liste des universités, puis la confirmation de ce que la bascule effacera | 2 fois |

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
3. **Quatre états, et ils sont différents.** Chargement (`ChargementPleinePage` quand il occupe
   l'écran, `LoadingState` dans le flux), vide (`EmptyState`), erreur
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
- **Un bandeau est une carte flottante en haut, par-dessus le contenu — jamais insérée dans
  l'écran, et jamais permanente.** Décision du jalon 6.1-B pour les messages de service, et elle
  vaut pour tout bandeau à venir : une carte sous la barre d'état, largeur écran moins les marges,
  `radius.md`, `shadow.md`, au gabarit des en-têtes (la hauteur des boutons d'en-tête, le corps `md`
  demi-gras), qui ne déplace aucun écran et laisse passer les touchers autour d'elle
  ([`Bandeau.tsx`](../src/shared/ui/Bandeau.tsx)). Insérer un bandeau sous l'en-tête ferait sauter
  le contenu à l'apparition ; un toast du bas ne se ferme pas et ne dure pas. **Ce qui doit rester
  visible n'est pas un bandeau** : le rappel d'un incident en cours a d'abord été un bandeau
  permanent, et il cachait le grand titre des onglets (retour d'appareil du 2026-09-03). Il est
  devenu la **pastille d'état de service**, au gabarit de `HeaderButton`, posée par chaque en-tête
  d'onglet tout à droite de la rangée du titre, toujours présente — grise quand tout va bien, rouge en
  incident ([`PastilleService.tsx`](../src/shared/messages/PastilleService.tsx)). Un état durable prend
  sa place dans la rangée du titre, il ne flotte pas dessus ; et un indicateur toujours là n'inquiète
  pas, c'est sa couleur qui informe.
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
- **La couleur d'action ne titre pas et ne nomme pas** (2026-08-30). Le violet dit « on peut me
  toucher » : les titres de sous-pages (`NavBarHelper`) sont en `theme.font`, et une catégorie de
  contenu — « Entrées » dans un menu — est un intertitre en petites capitales grises, pas un libellé
  accentué. Les icônes de section, elles, prennent **une couleur par section** via
  `theme.sectionsHeaders` (le motif du Planning et de la grille Scolarité, étendu aux fiches par
  [`CampusSectionHeader`](../src/features/Campus/components/CampusSectionHeader.tsx)) — l'accent y
  était employé partout, ce qui le banalisait.
- **L'identité se pose en filigrane, jamais en ornement qui crie** (2026-08-30). Le logo
  d'établissement de l'en-tête Scolarité — et du formulaire de connexion, en plus grand — est une
  silhouette monochrome sans fond ; les tuiles de la
  grille Scolarité portent leur silhouette — l'enveloppe, le dossier, le livre — à ~6 % d'opacité,
  rognée par le coin bas droit. C'est **le geste de signature** du dépôt, et il a son composant :
  [`GlypheFiligrane`](../src/shared/ui/GlypheFiligrane.tsx), qui fixe l'opacité, le rognage et le
  calque de clip — ses règles d'usage sont dans son en-tête et elles sont strictes : une silhouette
  **pleine** de ce que la surface *représente* (un service, une entité), sur des **surfaces
  uniques** seulement — jamais sur les éléments répétés d'une liste, où il deviendrait du bruit, et
  jamais comme décor sans sens. C'est ce qui le gardera signature au lieu de le laisser mourir par
  la surexposition.
- **Une action qui survole le contenu parle comme la barre de recherche** (2026-08-30). Un **objet
  posé** — surface de carte ou bouton plein, filet et ombre partagée — sur la **fumée de flou**
  (`FondDePiedFlottant`) : un flou plein **masqué par un dégradé** (`MaskedView`), donc le contenu
  transparaît flouté et le flou s'estompe continûment vers le haut, sans jamais avoir de bord — plus
  un léger voile du fond (~35 %) pour l'assise. Cinq formes essayées les 2026-08-30/31 : bande
  opaque (nuage plein), bande floue (frontière), flou par tranches (chaque tranche montrait la
  sienne), voile de teinte seul (pas une fumée — on veut voir le contenu flouté), flou masqué — le
  bon. Android reçoit le flou plein sous le voile, compromis assumé. La barre de recherche Campus,
  les pieds d'action (annonce, réservation de BU) et la **barre d'onglets** partagent le fond **et
  le gabarit** : hauteur 50 (le bouton primaire de référence), marges latérales `md`, et l'assise de
  la barre d'onglets (`inset − 15`, plancher `sm`) — jugée parfaite sur appareil, elle fait loi pour
  tous les flottants. Un **bandeau fixe** — les dates d'une fiche,
  un en-tête — reste **opaque** : il porte du contenu, rien ne doit transparaître. Un essai en
  matériau translucide (flou) sur les pieds d'action a été fait et défait le même jour : il créait
  deux traitements pour un même rôle. Le flou reste réservé au **teaser** des rangées mystérieuses —
  là, c'est le contenu lui-même qu'on voile, pas une séparation.
- **Un choix dans une modale est une option-bouton, jamais un rond à cocher** (2026-08-30). Contour
  neutre au repos, fond teinté, filet d'accent et coche une fois choisie, puis Annuler / Confirmer —
  styles `theme.settings.popup.option*`, posés pour les trois listes des Réglages
  ([settings.md](features/settings.md#les-dialogues-et-pourquoi-ils-vivent-ici)). Toucher prépare,
  Confirmer applique : un choix qui s'applique au premier toucher se valide en essayant.
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
- **Un en-tête de section de tableau de bord et un libellé de groupe de réglages sont deux choses,
  pas deux dialectes.** Le dépôt en portait **trois** : le grand titre de
  [`SectionHeader`](../src/shared/ui/SectionHeader.tsx) — `fontSize.xl`, gras, `theme.font`, chevron
  facultatif — relevé quatre fois sur le tableau de bord Campus ; un petit libellé gris en capitales
  défini localement dans le tableau de bord Scolarité ; et un troisième, plus petit encore, dans
  l'écran du compte.

  **Arbitrage de la session Scolarité du 2026-08-25** : un **tableau de bord** prend
  `shared/ui/SectionHeader`, comme Campus qui fait référence — le dialecte local a été supprimé. Le
  petit libellé en capitales **reste**, mais borné à ce qu'il est : le libellé d'un groupe de
  réglages, dans un écran poussé. La distinction est de nature et non de goût, et c'est elle qui
  empêche la troisième réapparition.
- **Une pile de rangées est un groupe encadré, pas une pile de cartes.** Chaque rangée encadrée pour
  elle-même se lit comme une pile d'objets sans rapport ; un conteneur en `radius.lg` avec un filet
  de 1, dont les lignes sont séparées par un filet fin **indenté sous le texte**, se lit comme une
  liste. Le motif était déjà là trois fois — la rangée de messagerie et les deux groupes de l'écran
  du compte — et il porte maintenant un nom
  ([`LigneScolarite.tsx`](../src/features/Scolarite/components/LigneScolarite.tsx)).

  Deux détails qui décident du rendu : **le filet sépare, il n'encadre pas** — un filet sous la
  dernière ligne double le bord du groupe et se voit ; et **la surface d'icône est un carré arrondi**
  de `radius.md`, jamais un disque.
- **Un état plein écran cesse d'être plein écran dès que la page porte autre chose.** Le tableau de
  bord Scolarité rendait quatre situations en plein écran — pas de portail, pas de compte, échec
  bloquant, parcours froid — et c'était juste tant que l'onglet n'avait rien d'autre à montrer. Le
  jour où il a gagné une section **locale**, qui ne dépend ni d'un portail ni d'un compte, ces écrans
  se sont mis à cacher le seul contenu qui restait valide.

  La règle qui en sort : un état plein écran dit *« il n'y a rien ici »*. S'il reste quelque chose, il
  devient un **encart en tête de page** (`EmptyState` ou `SourceFailureNotice` en `variant="card"`) et
  la page continue dessous. **Une exception, et une seule** : un état **transitoire** — un chargement
  — reste plein écran, parce qu'une page qui se remplit sous un indicateur de progression fait sauter
  le contenu à chaque étape. **Tant que la page n'a rien d'autre à montrer** (2026-09-02) : avec un
  dossier déjà lu, l'actualisation de la Scolarité se pose en encart au-dessus d'une page qui ne
  bouge pas, et le nouveau contenu écrase l'ancien à l'arrivée.
- **Un écran d'attente montre une progression, pas une liste de tâches.** La distinction se décide sur
  une question : *l'utilisateur peut-il agir sur ces étapes ?* Quand il ne peut qu'attendre, nommer
  quatre étapes dont trois sont grisées l'informe sur ce qu'il ne contrôle pas, et laisse la plus
  longue paraître figée. Une barre, un pourcentage et **une seule ligne** répondent à la question
  qu'il se pose vraiment — combien de temps encore.

  Deux règles rendent une barre honnête sans l'empêcher de lisser : **elle ne recule jamais**, et
  **elle n'atteint jamais le palier d'une étape qui n'est pas finie**. Elle anime depuis sa position
  courante et non depuis un plancher — sinon une étape rapide la fait sauter, ce qui se lit comme un
  défaut. Voir [`ProgressBar`](../src/shared/ui/ProgressBar.tsx), qui accepte une `Animated.Value`
  pour avancer à la fréquence de l'écran plutôt qu'à celle des mises à jour d'état.
- **Une ligne de réglage ne laisse jamais sa valeur écraser son libellé.** Le libellé porte
  `flexShrink: 0`, la valeur cède et se tronque. Sans cette borne, une valeur longue comprime le
  libellé jusqu'à une lettre par ligne — « Institution » s'affichait à la verticale. C'est un défaut
  de gabarit et non de donnée : raccourcir la valeur ne fait que déplacer le seuil.
- **Un échec transitoire se dit par un toast, pas par un état d'écran ni par un dialogue.** Un geste
  de fichier qui échoue — ajouter une pièce, la supprimer — n'est pas une source en panne : il se dit
  et s'oublie. [`ErrorAlert`](../src/shared/ui/Alerts.ts) est le mécanisme du dépôt pour ça.
  Détourner une modale de confirmation en porte-message demanderait à l'utilisateur de **confirmer**
  une mauvaise nouvelle.
- **Une tuile ne change pas de taille, quoi qu'il arrive à sa source** (2026-09-02). La grille de la
  Scolarité basculait ses tuiles en rangées sur un échec, pour lui donner la place d'une phrase ; le
  soir de la sortie de la 6.0, une panne de Moodle a transformé la messagerie en rangée aussi, et la
  page changeait de forme sous les yeux de l'utilisateur. Un échec tient en **deux mots** sur la tuile
  — l'icône d'alerte, le mot, pas même la ligne de contexte — et la phrase vit dans une feuille que
  le toucher ouvre. Une surface qui garde sa taille rend une panne lisible ; une page qui se réorganise
  la rend spectaculaire ([features/scolarite.md](features/scolarite.md#une-tuile-en-échec-garde-sa-taille)).
- **Un dialogue informatif a une seule forme** (2026-09-02) : titre, corps, une action pleine, une
  sortie secondaire, et au plus un lien discret — [`Dialogue`](../src/shared/ui/Dialogue.tsx), sur le
  gabarit `theme.settings.popup` des Réglages. Il était recopié entre la modale « Bientôt » de la
  Scolarité et le campus non relié de la barre d'onglets ; la feuille d'échec d'un widget a été son
  troisième hôte, et c'est la règle des deux usages qui l'a fait remonter. Une action ne doit jamais
  être la seule sortie : avec une action, la fermeture passe en bouton secondaire.
- **Un chargement parle** (2026-09-02, généralisé en 6.1-E) : un indicateur seul, quand il dure, se
  lit comme un bug. Deux composants et deux exigences, parce que la même règle ne vaut pas dans les
  deux cas : [`ChargementPleinePage`](../src/shared/ui/ChargementPleinePage.tsx) **exige** sa phrase —
  elle est dans le type, comme le titre d'`EmptyState` — et ajoute une **seconde ligne après quatre
  secondes** (« Le serveur de l'université est lent aujourd'hui… ») ; `LoadingState`, qui se pose dans
  le flux, la garde optionnelle : quatre carrousels de tableau de bord qui annoncent chacun ce qu'ils
  attendent ajouteraient quatre lignes à un écran qui en porte déjà beaucoup.

  **La phrase obligatoire est le cœur du correctif, pas un détail de typage.** Elle existait depuis
  6.1-A, optionnelle — et **aucun** des trois écrans pleine page ne la passait. Une capacité
  facultative dans un socle partagé est une capacité oubliée.

  > **Capture attendue** — `chargement-parlant.png` : un chargement pleine page avec sa phrase, et sa
  > seconde ligne après quatre secondes.
- **Un chargement bref ne montre rien** (6.1-E, retour d'appareil). Aucun indicateur pendant les
  **300 premières millisecondes** d'attente : passer d'un jour à l'autre dans le Planning prend
  quelques dizaines de millisecondes, et l'indicateur y apparaissait puis disparaissait aussitôt — un
  clignotement qui se lit **moins bien que rien**, parce que l'œil enregistre un accroc là où il
  aurait perçu une transition instantanée. Le seuil est mesuré, pas choisi : en deçà d'un dixième de
  seconde une réponse est perçue comme instantanée, et jusqu'à une seconde l'attention reste sur la
  tâche sans qu'un retour soit nécessaire. La règle vaut pour **les deux** composants d'attente et
  vit dans [`indicateurRetarde.ts`](../src/shared/ui/indicateurRetarde.ts).

  **L'autre moitié de cette convention est volontairement écartée**, et c'est la décision qui compte :
  on ne garde **pas** l'indicateur un temps minimum une fois montré. Ce serait retarder l'arrivée du
  contenu — rendre l'application plus lente pour qu'elle en ait l'air moins — alors que
  [6.1-D](phase-6/6-1-d-publication.md) a passé une campagne entière à retirer des secondes
  d'attente. Le clignotement de sortie est traité sans rien ralentir : l'indicateur **apparaît en
  fondu**, donc s'il n'a vécu que cinquante millisecondes il n'aura jamais atteint sa pleine opacité.
  On perçoit une nuance, pas un accroc.
- **Le passage chargement → contenu se fond, une fois** (6.1-E).
  [`ApparitionEnFondu`](../src/shared/ui/ApparitionEnFondu.tsx) : 200 ms d'opacité et un glissement
  de `space.sm`. Il se pose **là où rien ne fond déjà** — les valeurs de widgets, le premier rendu du
  Planning — et **pas** sur les listes ni les sections Campus, dont les cartes passent par
  [`Card`](../src/shared/ui/Card.tsx), qui fond à l'entrée depuis 6-K : deux animations sur les mêmes
  pixels ne valent pas mieux qu'aucune. Et jamais sur un changement **à l'intérieur** du contenu — une
  liste qui se refiltre — sinon l'écran clignote à chaque geste. C'est aussi pourquoi ce n'est pas un
  interrupteur global : `LayoutAnimation`
  ([`transitions.ts`](../src/shared/ui/transitions.ts)) anime tout le commit suivant, et reste
  réservé aux **bascules de structure**.

  **Le fondu accompagne une attente qui s'est vue, et lui seule** — c'est la règle qui unifie les deux
  points précédents, trouvée en vérifiant le Planning sur appareil. Chaque chargement y vide la liste,
  y compris un simple changement de jour : la question n'est donc pas « est-ce la première fois »
  mais **combien de temps l'écran a attendu**, et le seuil est celui de l'indicateur. Sous le seuil,
  rien n'a été montré, donc il n'y a rien à adoucir : le contenu revient sec, ce qui est exact
  puisque l'opération *a été* instantanée — fondre y ajouterait deux cents millisecondes à un
  aller-retour de cinquante, et ferait paraître lent ce qui ne l'était pas. Au-delà, l'indicateur a
  paru, et ce qui le remplace se fond.
- **Nos contrôles sont dessinés, et leur piste est une pilule** (6.1-E). Le `Switch` et le `Slider`
  natifs rendent l'apparence de **chaque** plateforme, et celle d'Android a l'air d'un autre âge à
  côté de celle d'iOS : [`Interrupteur`](../src/shared/ui/Interrupteur.tsx) et
  [`Curseur`](../src/shared/ui/Curseur.tsx) donnent une seule apparence aux deux.

  **L'exception de forme est écrite pour qu'on ne la « corrige » pas** : la règle des carrés arrondis
  vise les **surfaces**, et un contrôle glissant n'en est pas une — il n'héberge aucun contenu, sa
  couleur *est* sa valeur, il est de la famille de [`ProgressBar`](../src/shared/ui/ProgressBar.tsx).
  Piste et poignée prennent donc `hauteur / 2`, **calculé** comme celui d'une jauge. Une piste en
  carré arrondi se lirait comme un bouton à deux états.

  Trois décisions les accompagnent. **Ils sont pilotés** : la poignée suit la prop, jamais l'appui —
  éteindre la synchronisation calendrier ouvre une confirmation, et une poignée qui partirait d'avance
  reviendrait en arrière si l'on annule. **Le retour haptique acquitte le geste**, pas la transition
  de la valeur, sinon la confirmation d'une modale ferait vibrer un interrupteur que personne n'a
  touché. **Un interrupteur s'actionne par un appui, pas par un glissement** : l'écran Réglages
  accepte le glissement entre onglets, et deux gestes horizontaux s'y disputeraient le doigt.

  Un seul jeton a été ajouté, `settings.switchThumb`, partagé par les deux. Le désactivé reste dit par
  la **transparence**, comme partout dans le dépôt.

  **La poignée porte une ombre plus marquée que les tokens**, et c'est une différence de situation, pas
  un cas particulier : `shadow.sm` est calibrée pour une carte posée sur le fond de page, à quatre
  pour cent d'opacité, et une poignée **blanche** sur une piste **gris clair** — l'interrupteur
  éteint, la part non remplie d'un curseur, en thème clair — s'y fondait au point de rendre le
  contrôle peu lisible (retour d'appareil du 2026-09-04). Une carte se détache d'un fond neutre ; une
  poignée doit se détacher d'une **surface colorée qui porte la valeur**, et de la plus claire d'entre
  elles. Le motif est nommé une fois pour les deux contrôles
  ([`controles.ts`](../src/shared/ui/controles.ts)) et sa **couleur** reste celle des tokens.

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
  faute de correspondre à `tokens.shadow` — leur couleur, elle, est `tokens.shadow.*.shadowColor`
  depuis 6.1-C. Ils sont consignés dans
  [inventaire-visuel.md](inventaire-visuel.md#3-les-divergences-mesurées), et chaque site porte une
  désactivation locale de la règle qui dit pourquoi : la base ESLint est à zéro, et le reste.
- **Deux jeux de couleurs hérités subsistent en tête de fichier** : `colors` (encore référencé, dans
  `style.list`, la couleur du calendrier système et le retour de notification — le pouce du `Switch`
  des réglages est sorti avec le contrôle natif en 6.1-E — `StyleWelcome`, son dernier gros consommateur, est sorti du fichier en 6.1-C) et
  `hintColors` (exposé par `style.hintColors`). `colors50` et `colors200`, deux palettes Material
  entières que plus rien ne lisait, ont été **supprimées** le 2026-08-16.
