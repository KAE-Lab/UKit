# Inventaire visuel

État mesuré du dépôt au **2026-08-16**, avant toute modification du jalon
[6-K](phase-6/6-k-socle-visuel.md). Ce document **compte**, il ne juge pas : les tokens à créer sont
exactement ceux qui remplacent les littéraux relevés ici, et les composants à sortir sont exactement
les motifs recopiés plusieurs fois. Rien ne se décide « au cas où ».

C'est un **point d'arrêt** : il se lit avant que la suite commence.

> **Une mesure, pas une intuition.** Le jalon 6-D a montré ce que coûtent des points de balayage
> choisis sans mesure. Un socle visuel déduit d'une impression serait la même erreur. Toutes les
> commandes de relevé sont données pour être rejouées.

## Périmètre de la mesure

Compté : `src/**/*.ts` et `src/**/*.tsx`. **Exclus** : `src/shared/theme/Theme.ts` — c'est la source
des tokens, ses littéraux sont sa raison d'être — et les fichiers `*.test.ts`.

## 1. Les littéraux de style

### 1.1 Couleurs en dur — 53 occurrences, 23 fichiers

```bash
grep -rnE "['\"]#[0-9a-fA-F]{3,8}['\"]" src --include="*.tsx" --include="*.ts" \
  | grep -v "^src/shared/theme/Theme.ts" | grep -v "\.test\.ts" | wc -l
```

| Fichier | Nb | Zone |
|---|---:|---|
| [`shared/ui/ModMenu.tsx`](../src/shared/ui/ModMenu.tsx) | 10 | outil |
| [`shared/ui/ModMenuBlueprints.tsx`](../src/shared/ui/ModMenuBlueprints.tsx) | 5 | outil |
| [`Scolarite/screens/CredentialsSettingsScreen.tsx`](../src/features/Scolarite/screens/CredentialsSettingsScreen.tsx) | 5 | à refaire |
| [`Settings/components/SettingsModals.tsx`](../src/features/Settings/components/SettingsModals.tsx) | 4 | à refaire |
| [`Campus/services/LibraryService.ts`](../src/features/Campus/services/LibraryService.ts) | 4 | **référence** |
| `shared/ui/Button.tsx`, `shared/services/NotificationService.ts`, `shared/services/CalendarSyncHelpers.ts`, `shared/navigation/NavHelpers.tsx`, `shared/navigation/MainTabNavigator.tsx` | 2 chacun | socle |
| `Scolarite/components/WebBrowserComponents.tsx`, `Scolarite/components/ScolariteLoginView.tsx` | 2 chacun | à refaire |
| 11 autres fichiers | 1 chacun | — |

Valeurs distinctes, par fréquence :

| Valeur | Nb | Ce qu'elle veut dire | Zone la plus exposée |
|---|---:|---|---|
| `#fff` / `#FFFFFF` / `#ffffff` / `#FFF` | 14 | texte sur fond coloré — la clé `lightFont` existe | partout |
| `#4caf50` | 5 | « valide », « actif », « peu fréquenté » | **référence** (BU, Crous) |
| `#000` / `#000000` | 6 | ombre, barre de statut | socle |
| `#4ade80` / `#f87171` / `#ef4444` / `#fbbf24` | 10 | palette Tailwind du menu de développement | outil |
| `#009ee0` | 4 | couleur de marque — `colors.brand` existe déjà | socle |
| `#EF5350` / `#E53935` | 4 | destructif — la clé `accentFont` existe | à refaire |
| `#ff9800` | 1 | « chargé » | **référence** (BU) |
| `#f44336` | 1 | « fermé » | **référence** (BU) |
| `#ff4436` | 1 | « saturé » — voir la divergence 3.6 | **référence** (BU) |
| `#43A047` | 1 | « synchronisé » | à refaire |
| `#006F9F` | 1 | fond de barre de statut | socle |

### 1.2 Valeurs numériques — 142 occurrences dans les trois familles qui ont une échelle

```bash
grep -rnE "(padding|padding[A-Z][a-z]+|margin|margin[A-Z][a-z]+|gap|rowGap|columnGap|borderRadius|fontSize)\s*:\s*-?[0-9]+" \
  src --include="*.tsx" --include="*.ts" | grep -v "^src/shared/theme/Theme.ts" | grep -v "\.test\.ts" | wc -l
```

| Famille | Nb | Échelle existante |
|---|---:|---|
| espacement (`padding*`, `margin*`, `gap*`) | 117 | `tokens.space` |
| rayon (`borderRadius`) | 13 | `tokens.radius` |
| taille de texte (`fontSize`) | 14 | `tokens.fontSize` |

En comptant **toutes** les propriétés dimensionnelles (`width`, `height`, `top`, `size`,
`lineHeight`, `elevation`…), le total monte à **330**. Le jalon n'en retient que 142 : les autres
n'ont **aucune échelle** dans le dépôt, et en inventer une dépasserait le mandat « extraire, pas
inventer » (voir 3.7 et 3.8).

#### Distribution des espacements

| Valeur | Nb | Token existant |
|---:|---:|---|
| 0 | 11 | — (neutralisation de mise en page, légitime) |
| 1 | 1 | — |
| **2** | **26** | **aucun** |
| 3 | 1 | — |
| **4** | **46** | `space.xs` |
| 5 | 1 | — |
| **6** | **9** | **aucun** |
| **8** | **11** | `space.sm` |
| 10 | 4 | — |
| 12 | 2 | — |
| 13, 14, 15 | 4 | — |
| **16** | **2** | `space.md` |
| 20, 30, 40, 80, 100, 140 | 8 | — (dimensions, pas des marges) |

**85 des 117 espacements ont un token exact ou attendent le pas manquant `2`.**

#### Distribution des rayons

| Valeur | Nb | Où |
|---:|---:|---|
| 3 | 5 | jauges d'affluence et carrousel — `height / 2` |
| 4 | 3 | jauge de la fiche BU, pastilles |
| 7 | 1 | pastille du menu de développement |
| 8 | 3 | `radius.sm` |
| 20 | 1 | écran de progression Scolarité |

Les rayons `3`, `4` et `7` sont tous des **moitiés de hauteur** — une forme de pilule calculée, pas
un pas d'échelle. Ils n'appellent pas un token, ils appellent un composant (voir 3.4).

#### Distribution des tailles de texte

| Valeur | Nb | Où | Token |
|---:|---:|---|---|
| 10 | 1 | libellé de la barre d'onglets | — |
| 12 | 2 | modale de réglages | `fontSize.xs` |
| **22** | **4** | **les quatre en-têtes de section du tableau de bord** | `fontSize.xl` |
| 24 | 1 | titre d'une annonce | — |
| 32 | 1 | horloge du menu de développement | — |
| **34** | **4** | **le grand titre de page** — Campus, Planning, Scolarité, Réglages | **aucun** |
| 48 | 1 | icône biométrie | — |

**`fontSize.hero: 36` n'est référencé nulle part.** Le grand titre réellement utilisé vaut `34`, dans
quatre écrans dont deux de référence ([`CampusDashboard.tsx:116`](../src/features/Campus/Dashboard/CampusDashboard.tsx#L116),
[`DayViewHeader.tsx:54`](../src/features/Planning/components/DayViewHeader.tsx#L54)).

### 1.3 Répartition par zone

| Zone | Numériques | Couleurs | Statut 6-K |
|---|---:|---:|---|
| `shared/` | 26 | 26 | socle — converti |
| `features/Planning/` | 17 | 2 | **référence** — converti, non restructuré |
| `features/Campus/` (hors `Bde/`) | 56 | 6 | **référence** — converti et extrait |
| `features/Campus/Bde/` | 9 | 0 | à refaire — laissé |
| `features/Onboarding/` | 10 | 1 | **référence** — converti |
| `features/Scolarite/` | 7 | 11 | à refaire — laissé |
| `features/Settings/` | 17 | 7 | à refaire — laissé |

## 2. Ce que `shared/ui/` ne porte pas

Sept fichiers, dont **quatre sont des outils** et aucun n'est un composant de mise en page.

| Fichier | Nature |
|---|---|
| [`AppUI.tsx`](../src/shared/ui/AppUI.tsx) | barre de statut, séparateur, contrôle de version |
| [`Button.tsx`](../src/shared/ui/Button.tsx) | boutons de navigation et lignes de réglage |
| [`Alerts.ts`](../src/shared/ui/Alerts.ts) | messages éphémères |
| `OpenMapButton.tsx` | bouton de carte — **non importé** *(supprimé depuis)* |
| [`ModMenu.tsx`](../src/shared/ui/ModMenu.tsx), [`ModMenuBlueprints.tsx`](../src/shared/ui/ModMenuBlueprints.tsx) | menu de développement |
| [`SourceFailureNotice.tsx`](../src/shared/ui/SourceFailureNotice.tsx) | **le seul composant de rendu partagé** — remonté au jalon 6-E |

Ni carte, ni en-tête de section, ni état vide, ni ligne de liste, ni badge, ni état de chargement.
C'est la cause **mécanique** des divergences relevées ci-dessous : chaque écran réinvente les siens.

## 3. Les divergences mesurées

### 3.1 La surface de carte, écrite 6 fois

`backgroundColor: cardBackground` + `borderRadius: radius.xl` + `...shadow.md` + `overflow: 'hidden'`,
au caractère près :

[`CampusCard.tsx:40`](../src/features/Campus/components/CampusCard.tsx#L40) ·
[`CrousSectionCard.tsx:31`](../src/features/Campus/Dashboard/components/CrousSectionCard.tsx#L31) ·
[`LibrarySectionCard.tsx:39`](../src/features/Campus/Dashboard/components/LibrarySectionCard.tsx#L39) ·
`FreeRoomSectionCard.tsx` · `BdeSectionParts.tsx` · `CourseScreen.tsx`

Quatre d'entre elles portent aussi la même enveloppe `Reanimated` (`entering={FadeIn}`,
`layout={LinearTransition.springify()}`).

### 3.2 L'en-tête de section, écrit 4 fois

Identique au caractère près dans les quatre sections du tableau de bord — `BdeSection`,
`CrousSection`, `FreeRoomSection`, `LibrarySection` :

```tsx
<Text style={{ fontSize: 22, fontWeight: tokens.fontWeight.bold, fontFamily: 'Montserrat_600SemiBold', color: theme.font }}>
<MaterialIcons name="chevron-right" size={26} color={theme.fontSecondary} style={{ marginLeft: 2 }} />
```

Le `ActivityIndicator style={{ margin: tokens.space.xl }}` qui les suit est lui aussi identique
quatre fois.

### 3.3 Le badge de distance, écrit 8 fois

```tsx
backgroundColor: `${theme.primary}15`, paddingHorizontal: tokens.space.sm, paddingVertical: 4, borderRadius: tokens.radius.md
```

`LibraryListItem` · `CrousRestaurantListItem` · `FreeRoomListItem` · `LibrarySectionCard` ·
`CrousSectionCard` · `FreeRoomSectionCard` · `FreeRoomDetailsComponents` · `BdeDetailsScreen`
(deux fois).

L'icône diffère (`directions-walk` ou `walk`) alors que le rendu est le même — deux copies ont
divergé sur un détail.

### 3.4 La jauge d'affluence, écrite 3 fois en 2 hauteurs

| Où | Hauteur | Rayon |
|---|---:|---:|
| [`LibraryListItem.tsx:70`](../src/features/Campus/Library/components/LibraryListItem.tsx#L70) | 6 | 3 |
| [`LibrarySectionCard.tsx:84`](../src/features/Campus/Dashboard/components/LibrarySectionCard.tsx#L84) | 6 | 3 |
| [`LibraryDetailsComponents.tsx:37`](../src/features/Campus/Library/components/LibraryDetailsComponents.tsx#L37) | **8** | **4** |

Le rayon vaut toujours la moitié de la hauteur. Les deux variantes sont **volontaires** (la fiche est
plus grande que la liste) : c'est le calcul qui doit être partagé, pas la valeur.

### 3.5 L'écart icône → texte, tantôt 4 tantôt 6

Trois cartes voisines, même rôle visuel :

| Où | Valeur |
|---|---:|
| `LibraryListItem`, `FreeRoomListItem`, `LibrarySectionCard` | `marginLeft: 4` |
| `CrousRestaurantListItem` (ligne horaires), `CampusCard` (étoile), `CrousSectionCard` (étoile) | `marginLeft: 6` |

**Arbitrage :** aucune unification dans ce jalon. Les deux valeurs vivent dans des écrans de
référence, et les changer romprait le rendu à l'identique pour un gain de 2 px. La divergence est
consignée ici ; une session d'écran pourra la trancher.

### 3.6 `#f44336` contre `#ff4436` — une coquille figée

Dans [`LibraryService.ts:84-88`](../src/features/Campus/services/LibraryService.ts#L84) :

```ts
let statusColor = '#f44336';        // ferme
else statusColor = '#ff4436';       // > 80 % d'occupation
```

Deux rouges presque identiques pour deux états différents, dont l'un est manifestement une frappe
inversée du premier. Personne ne peut le voir à l'œil.

### 3.7 Treize tailles d'icône, aucune échelle

```
14 (×11)  16 (×26)  18 (×6)  20 (×14)  22 (×16)  24 (×22)  26 (×8)
28 (×9)   32 (×7)   36 (×3)  48 (×7)   60 (×1)   64 (×1)   100 (×1)
```

132 occurrences. **Hors périmètre de 6-K** : le dépôt n'a aucune échelle d'icône, et en créer une
serait inventer. Laissé aux sessions d'écran.

### 3.8 Six ombres écrites à la main

`shadowColor` posé directement au lieu d'étaler `tokens.shadow.*` :
`CampusLayoutComponents.tsx:42` · `MainTabNavigator.tsx:293` et `:307` ·
`WebBrowserComponents.tsx:227` · `ModMenu.tsx:344` et `:369`.

Aucune ne correspond exactement à `sm`, `md` ou `lg` : les convertir changerait le rendu. Consignées,
non converties.

### 3.9 `${theme.primary}15` n'est pas `theme.primarySoft`

Le motif `` `${theme.primary}15` `` (8 usages) et la clé `primarySoft` ne rendent **pas** la même
couleur en thème sombre :

| | clair | sombre |
|---|---|---|
| `` `${theme.primary}15` `` | `#007AFF15` | `#5E5CE615` |
| `theme.primarySoft` | `#007AFF15` | `#0A84FF20` |

Piège à ne pas « corriger » : remplacer l'un par l'autre changerait le thème sombre de huit endroits.

### 3.10 La police demandée n'est pas la police chargée

[`App.tsx:36`](../App.tsx#L36) ne charge que `Montserrat_500Medium`. Or le code demande :

| Famille | Occurrences | Chargée ? |
|---|---:|---|
| `Montserrat_500Medium` | 13 | oui |
| `Montserrat_600SemiBold` | **22** | **non** |
| `Montserrat_700Bold` | **1** | **non** |

Les 22 usages non chargés incluent **tous les grands titres de page et tous les en-têtes de section**.
Ils retombent silencieusement sur la police système. C'est un défaut **fonctionnel**, pas esthétique :
il est reporté dans [defauts-fonctionnels.md](defauts-fonctionnels.md), pas corrigé ici — le corriger
changerait le rendu de tous les écrans de référence d'un coup.

## 4. Les manques

### 4.1 États par écran

Relevé de la présence d'un état **vide**, **d'erreur** et **de chargement** distincts :

| Écran | Vide | Erreur | Chargement |
|---|:---:|:---:|:---:|
| Campus — tableau de bord | — | — | par section |
| Campus — restaurants (liste, menu) | oui | oui | oui |
| Campus — bibliothèques (liste, fiche) | oui | oui | oui |
| **Campus — salles libres (liste)** | oui | **non** | oui |
| **Campus — salles libres (fiche)** | — | **non** | oui |
| Campus — annonces (liste) | oui | oui | oui |
| **Campus — annonces (fiche)** | — | **non** | **non** |
| Planning — recherche de groupes | oui | oui | oui |
| Planning — jour / semaine | oui | oui | oui |
| Scolarité — tableau de bord | — | oui | oui |
| Réglages, À propos | — | — | — |

**Le manque le plus net** : les salles libres. [`FreeRoomService.ts`](../src/features/Campus/services/FreeRoomService.ts)
ne produit aucun `UkitFailure`, et [`FreeRoomScreen.tsx:98`](../src/features/Campus/FreeRoom/FreeRoomScreen.tsx#L98)
ne passe ni `failure` ni `onRetry` à `CampusListLayout`. Une source en panne y affiche « Aucun
bâtiment trouvé » — exactement le défaut que la Phase 6 revendique d'avoir supprimé ailleurs.
Reporté dans [defauts-fonctionnels.md](defauts-fonctionnels.md).

### 4.2 Cibles tactiles

`hitSlop` n'apparaît que **5 fois** dans tout le dépôt, et toujours sur la même chose : l'étoile de
favori des cartes Campus (`CampusCard`, les trois `*SectionCard`) et un bouton de
`CredentialsSettingsScreen`.

Les autres zones tactiles sans dimension explicite ni rembourrage — chevrons d'en-tête de section,
croix de fermeture des modales, boutons d'icône du menu de développement — reposent sur la seule
taille de l'icône. À `size={22}`, la cible fait 22 pt, soit **la moitié du minimum de 44 pt**
recommandé par les deux plateformes.

Non corrigé ici : ajouter un `hitSlop` ne change aucun pixel, mais le faire sans mesurer écran par
écran reviendrait à supposer. Laissé aux sessions, avec la recette d'écran de
[theme.md](theme.md#la-recette-décran) qui l'exige.

### 4.3 Chaînes visibles en dur

**52 replis** de la forme `Translator.get('CLE') || 'texte français'`. Ce ne sont pas des chaînes non
traduites au sens strict — la clé existe — mais un texte français s'affiche si elle manque, ce qui
masque l'oubli au lieu de le signaler.

Les plus exposés : `SettingsSections.tsx` (6), `StackNavigator.tsx` (5), `NavHelpers.tsx` (4),
`MainTabNavigator.tsx` (4), `FreeRoomListItem.tsx` (4), `FreeRoomSectionCard.tsx` (4).

S'y ajoutent les libellés du menu de développement (`Dev Menu`, `Reset`, `Apply`, `Valider`,
`Embarque`, `Rafraichir`), **volontairement** hors des dictionnaires
([qualite.md](qualite.md#outillage-de-simulation-temporelle)).

## 5. Ce que l'inventaire décide

Sans opinion ajoutée, les relevés ci-dessus déterminent le contenu du jalon.

| Relevé | Conséquence |
|---|---|
| 1.1 — `#4caf50`, `#ff9800`, `#f44336` recopiés | une échelle **sémantique** dans les deux thèmes |
| 1.2 — 26 espacements à `2`, sous `xs: 4` | `tokens.space.xxs = 2` |
| 1.2 — `fontSize.hero` inutilisé, titre réel à `34` | `hero: 36` → `title: 34` |
| 1.1 — `#006F9F` / `#000000` de la barre de statut | `statusBarBackground` dans les deux thèmes |
| 3.1 — surface de carte ×6 | `shared/ui/Card.tsx` |
| 3.2 — en-tête de section ×4 | `shared/ui/SectionHeader.tsx` |
| 3.2 — indicateur de chargement ×6 | `shared/ui/LoadingState.tsx` |
| 3.3 — badge ×8 | `shared/ui/Badge.tsx` |
| 3.4 — jauge ×3 en 2 hauteurs | `shared/ui/ProgressBar.tsx`, rayon calculé |
| 2 — état vide recopié dans `SourceFailureNotice` | `shared/ui/EmptyState.tsx` |
| ligne « icône + texte » ×9 | `shared/ui/MetaRow.tsx` |
| 1.2 — 142 littéraux, aucune règle | `ukit/no-style-literals` en `warn` |
| 3.10, 4.1 — police non chargée, salles libres sans échec | [defauts-fonctionnels.md](defauts-fonctionnels.md) |
| 3.5, 3.7, 3.8, 3.9, 4.2 | consignés, **non touchés** — arbitrages de session |

## Limites de cet inventaire

- **Il compte des littéraux, pas des proportions.** Une marge peut venir d'un token et être quand
  même mauvaise. Ce document mesure la dérive mécanique, pas la laideur.
- **Les relevés sont textuels.** Un `padding` calculé (`Math.max(tokens.space.sm, insets.bottom - 15)`)
  n'apparaît pas dans les comptes alors qu'il porte un `15` en dur.
- **Les contrastes en thème sombre ne sont pas calculés.** Les vérifier exige un rendu ; ils sont
  couverts par le point 9 du plan de test sur appareil, pas par une mesure statique.
- **La date compte.** Cet inventaire est une photographie du 2026-08-16. Il ne se met pas à jour : la
  liste vivante, elle, est [defauts-fonctionnels.md](defauts-fonctionnels.md).
