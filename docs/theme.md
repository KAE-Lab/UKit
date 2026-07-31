# Thème et design tokens

Toute valeur de style de UKit vient de [`src/shared/theme/Theme.ts`](../src/shared/theme/Theme.ts).
**Aucune couleur, aucun espacement, aucun rayon ne doit être écrit en dur** dans un composant : c'est
la règle qui garantit qu'un changement de thème reste cohérent et qu'un nouvel écran se fond dans
l'existant.

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

## Les tokens

```ts
tokens.space      xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48
tokens.radius     sm 8 · md 12 · lg 16 · xl 24 · pill 999
tokens.fontSize   xs 12 · sm 14 · md 16 · lg 18 · xl 22 · xxl 28 · hero 36
tokens.fontWeight regular 400 · medium 500 · semibold 600 · bold 700
tokens.shadow     sm · md · lg   (objet prêt à étaler : ...tokens.shadow.sm)
```

Les ombres sont des objets complets (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`,
`elevation`) couvrant iOS et Android d'un seul coup : les étaler plutôt que redéfinir les cinq
propriétés.

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

## Vérifier

- Basculer clair / sombre depuis Réglages et parcourir les quatre onglets : aucun texte illisible,
  aucun fond resté clair.
- Vérifier les surfaces qui ne passent pas par la palette : la carte (HTML généré), les modales, la
  barre de statut.
- Sur un écran modifié, chercher les valeurs littérales (`#`, nombres de padding) : elles doivent
  toutes venir des tokens.

## Limites connues

- **Le fichier fait 1 185 lignes** et désactive explicitement `max-lines`. C'est assumé : il s'agit
  de données de style, dont le découpage nuirait à la lisibilité et à la comparaison clair / sombre.
- **`StyleWelcome` est un jeu de styles séparé**, hérité du parcours d'accueil, qui ne suit pas la
  structure des deux thèmes.
- **La barre de statut a ses couleurs en dur** dans [`AppUI.tsx`](../src/shared/ui/AppUI.tsx)
  (`#006F9F` et `#000000`), tout comme `androidStatusBar` dans
  [`app.config.ts`](../app.config.ts) : ces valeurs sont antérieures à la palette actuelle et n'en
  font pas partie.
- **Quatre jeux de couleurs hérités subsistent en tête de fichier** : `colors` (encore référencé cinq
  fois, dans `StyleWelcome` et `style.list`), ainsi que `colors50`, `colors200` et `hintColors` qui ne
  sont **plus référencés nulle part**. Ces trois derniers sont du code mort conservé par prudence.
