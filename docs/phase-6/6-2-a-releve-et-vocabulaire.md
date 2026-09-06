# 6.2-A — Le relevé, et le vocabulaire du mouvement

> **Cadre, pas encore spécification.** La direction précise de la 6.2 se tranche sur des captures
> posées côte à côte, et son détail au moment du relevé. Ce document pose la méthode et les
> contraintes ; il se complète avant d'être ouvert.
>
> Le jalon fondateur de la 6.2, sur le modèle de [6-K](6-k-socle-visuel.md) : celui-ci a donné à
> l'application son vocabulaire de **formes**, celui-là lui donne son vocabulaire de **mouvement**.

## La direction

*« Rien n'apparaît sans être annoncé par sa forme. »* La 6.1-E a rendu l'application correcte ; elle
ne l'a pas rendue fluide, et le second travail n'est pas la suite du premier. Squelettes de contenu à
la place des indicateurs, entrées échelonnées, ressorts plutôt que durées fixes, états pressés,
transitions d'écran — et, décision du 2026-09-06, **un fond par écran**.

Trois choses sont prises à la référence, et une ne l'est pas :

| Pris | Laissé |
|---|---|
| **les fonds par écran** | **la rondeur** — [theme.md](../theme.md) garde « aucune forme ronde, tout est carré arrondi » |
| **la mise en scène du contenu** | **la fonte propre** — « une seule police, celle du système » reste la règle |
| **les transitions d'écran** | |

## Ce qui est à faire

### 1. Le relevé de ce qui saute

Écran par écran, sur le modèle de [inventaire-visuel.md](../inventaire-visuel.md) : **une mesure
datée qui ne bouge plus**, et qui servira de liste de contrôle finale. C'est ce relevé qui rend la
version vérifiable — sans lui, on ne saura pas dire quand elle est finie.

### 2. Le vocabulaire partagé

Posé dans [theme.md](../theme.md), section « Les décisions durables » : squelettes, cascade,
ressorts, états pressés, transitions, fond d'écran. Une règle existante **est réécrite** :

> *« Un chargement bref ne montre rien »* (seuil de 300 ms,
> [`indicateurRetarde.ts`](../../src/shared/ui/indicateurRetarde.ts)) — les squelettes de contenu la
> contredisent par construction, et la 6.2 les demande. La réécrire est un geste du jalon, pas une
> entorse commise en passant.

### 3. L'écran fondateur : le tableau de bord Campus

Décision du 2026-09-06. C'est le plus simple à adapter et le plus varié en états — quatre sources
tierces, carrousels, tuiles, chargements indépendants, échecs partiels. **Tout le vocabulaire y passe
en une fois**, et ce qui y est décidé fait règle pour les sessions suivantes.

Fichiers : [`CampusDashboard.tsx`](../../src/features/Campus/Dashboard/CampusDashboard.tsx),
`Dashboard/rafraichissement.tsx`, `Dashboard/components/`, et les sections `Crous`, `Library`,
`FreeRoom`, `Bde`.

## L'état de l'infrastructure, mesuré le 2026-09-06

Ce qu'il y a déjà, et ce qui manque :

- **Reanimated 4 est présent mais n'anime que cinq fichiers** :
  [`Card`](../../src/shared/ui/Card.tsx), `ApparitionEnFondu`, `Interrupteur`, `Curseur`,
  `WebBrowserComponents`. `Card` porte le **seul** `LinearTransition` du dépôt.
- **Les en-têtes fondent au scroll en `Animated` legacy**, avec `useNativeDriver: false`
  ([`NavHelpers.tsx`](../../src/shared/navigation/NavHelpers.tsx)), consommé par une douzaine
  d'écrans. **Deux moteurs d'animation coexistent** — les converger fait partie du jalon.
- **L'haptique n'existe qu'à deux endroits** : `Interrupteur` et `Curseur`.
- **Les transitions d'écran sont celles par défaut** de la pile de navigation, sans aucune
  personnalisation.
- **Il n'existe aucun fond d'écran.** L'identité tient aux aplats de thème, aux ombres, à la
  « fumée » des flottants du bas ([`PiedFlottant.tsx`](../../src/shared/ui/PiedFlottant.tsx)) et au
  filigrane à six pour cent ([`GlypheFiligrane.tsx`](../../src/shared/ui/GlypheFiligrane.tsx)). Le
  fond par écran est donc un **ajout**, et il se raccroche naturellement au vocabulaire du
  filigrane. `PiedFlottant` est le seul consommateur d'`expo-linear-gradient` et de `MaskedView` du
  dépôt : le fond doit s'y accorder, pas le concurrencer.

## À trancher avant ouverture

- **La direction des fonds** : sur captures, côte à côte avec la référence.
- **Les transitions d'écran, et jusqu'où.** Les transitions d'élément partagé sont à **mesurer**
  avant d'être promises : Reanimated 4 a retiré son mécanisme, et la pile de navigation n'en offre
  pas. Ne rien inscrire ici tant que ce n'est pas prouvé sur appareil.
- **Le sort des deux moteurs d'animation** : tout converger, ou seulement ce que les écrans pilotes
  touchent.

## Dépendances

[6.1.1-A](6-1-1-a-montee-du-socle.md) : la boucle d'itération, et le socle sur lequel le mouvement
sera jugé. Écrire des animations avant la montée reviendrait à les rejuger après.

## Limites écrites

- **Ce qui se vérifie devient un jalon, ce qui se juge reste une conversation.** Le relevé, le
  vocabulaire et l'écran fondateur sont ce jalon ; refaire un écran est une session
  ([6.2-B](6-2-b-ecrans.md)).
- **Le tableau de bord Campus est un écran de référence de 6-K.** Le prendre comme écran fondateur
  rouvre ce contrat, et il faut l'assumer explicitement plutôt que le constater après coup.
