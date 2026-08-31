# 6-K — Le socle visuel

> **Jalon livré le 2026-08-16.** Les écarts entre ce texte et ce qui a été fait sont consignés en fin
> de document, sous [« Ce que la réalité a corrigé »](#ce-que-la-réalité-a-corrigé).

> **Ouvre le volet 2 de la phase.** Le vocabulaire visuel de l'application est **extrait** des écrans
> qui font déjà référence — il n'est pas inventé. Ce jalon ne refait aucun écran : il rend possible de
> les refaire sans qu'ils divergent.

## Pourquoi ce jalon existe

La majorité de l'application a déjà le visuel qu'on veut. Trois zones ne l'ont pas — les annonces, la
scolarité, les réglages — et elles vont être reprises **en sessions**, écran par écran, avec de
l'assistance. C'est là qu'est le risque, et il n'est pas celui qu'on croit.

Le risque n'est pas qu'une session rate un écran : c'est que **trois sessions produisent trois
dialectes**. Chacune inventera ses marges, ses rayons, ses états vides, ses couleurs d'alerte — et
l'application finira cohérente nulle part. Ce n'est pas une question de talent : sans vocabulaire
partagé et **applicable**, la dérive est mécanique.

Le constat qui le rend concret, mesuré le 2026-08-13 :

- [`eslint.config.mjs`](../../eslint.config.mjs) porte **cinq règles** — lignes, lignes par fonction,
  profondeur, complexité, `any`. **Aucune** ne concerne le style. La règle « aucune valeur de style en
  dur » du [README](../../README.md) et de [CONTRIBUTING.md](../../CONTRIBUTING.md) n'est appliquée par
  rien, et le code en porte déjà : `#4caf50` dans les modales de réglages, `'#ffffff'` sur les boutons,
  `width: 24, height: 8` dans la pagination d'accueil. Le jalon 6-G en a ajouté ;
- [`shared/ui/`](../../src/shared/ui/) contient sept fichiers, dont quatre sont des **outils** (menu de
  développement, alertes, bouton de carte). Il n'existe **ni carte, ni en-tête de section, ni état
  vide, ni ligne de liste** partagés. Chaque écran réinvente les siens ;
- les tokens couvrent espacements, rayons, tailles, graisses et ombres — mais **aucune couleur
  sémantique**. D'où les hexadécimaux en dur dès qu'un écran veut dire « valide », « attention » ou
  « fermé ».

## Ce qui fait référence, et ce qui ne fait pas

C'est la décision qui structure tout le jalon, et elle vient du propriétaire du produit.

| Statut | Écrans |
|---|---|
| **Référence — à extraire, intouchables** | Planning (jour et semaine, fiche de cours), la barre d'onglets et les en-têtes animés, le tableau de bord Campus, les listes CROUS et bibliothèques et leurs détails, les salles libres, le parcours d'accueil |
| **À refaire — hors de ce jalon** | les annonces de vie étudiante, la page Scolarité *(sauf son titre et le message de bienvenue, qui font référence)*, les réglages |

**Conséquence directe : le socle se lit dans les écrans de référence.** On n'invente pas une échelle,
on nomme celle qui est déjà là. Si deux écrans de référence divergent, c'est un arbitrage à consigner
dans ce document — pas une occasion de tout redessiner.

**Conséquence sur l'acceptation** : les écrans de référence doivent rendre **à l'identique** avant et
après. Sans ce critère, « extraire le système » redessine tout en silence, et le travail déjà fait est
perdu.

## Ce qui est livré, en trois temps

### 1. L'inventaire — mesuré, lu, puis décidé

Un document, `docs/inventaire-visuel.md`, produit **avant** toute modification. Il ne contient aucune
opinion : il compte.

- toutes les valeurs de style en dur, par fichier et par ligne, groupées par nature (couleur, marge,
  rayon, taille) ;
- les **divergences** : combien de rembourrages de carte différents existent, combien de hauteurs de
  ligne de liste, combien d'états vides — et lesquels se ressemblent ;
- les **manques** : quels écrans n'ont pas d'état vide, pas d'état d'erreur, pas d'état de chargement ;
- les cibles tactiles sous 44 pt et les contrastes douteux en thème sombre ;
- les chaînes visibles en dur — le README en admet déjà treize côté Campus.

C'est un **point d'arrêt** : ce document se lit avant que la suite commence. Les tokens à créer sont
exactement ceux qui remplaceront les littéraux trouvés ; les composants à sortir sont exactement les
motifs recopiés trois fois. Rien ne se décide « au cas où ».

> La culture du dépôt s'applique ici comme ailleurs : **mesuré, pas supposé.** Un socle visuel déduit
> d'une intuition serait la même erreur que des points de balayage choisis sans mesure — et le jalon
> 6-D a montré ce que ça coûte.

### 2. L'extraction

- **Les tokens complétés**, et d'abord ce qui manque : une échelle de **couleurs sémantiques**
  (succès, avertissement, danger, neutre) déclinée dans les deux thèmes. C'est elle qui supprime les
  `#4caf50` et `#FF9500` dispersés. Attention au piège déjà consigné : `accentFont` **est** le rouge
  destructif, pas « texte sur fond accent » — pour un libellé sur fond `primary`, c'est `lightFont`
  ([theme.md](../theme.md)).
- **Les composants partagés**, sortis des écrans de référence et non écrits de zéro : carte, en-tête de
  section, ligne de liste, état vide, état de chargement, badge. L'état d'erreur existe déjà
  ([`SourceFailureNotice`](../../src/shared/ui/SourceFailureNotice.tsx)) et sert de modèle — il est né
  au jalon 6-E de la même façon, en remontant un rendu recopié.
- **La règle qui rend la dérive impossible** : une règle ESLint refusant les littéraux de style —
  couleurs hexadécimales et valeurs numériques de marge, rayon ou taille hors tokens. C'est le seul
  mécanisme qui tienne quand plusieurs sessions travaillent en parallèle ; une règle écrite dans un
  document ne tient pas, celle-ci a déjà été écrite et n'a pas tenu.

  Elle arrive **en `warn`**, comme les cinq autres, et la base de référence de
  [qualite.md](../qualite.md) est mise à jour en conséquence. Passer en `error` d'emblée bloquerait
  tout sur du code qu'on n'a pas encore repris.
- **La recette d'écran**, écrite dans [theme.md](../theme.md) : tout écran a un en-tête animé, des
  marges de page identiques, un état vide, un état d'erreur, un état de chargement. C'est la liste que
  chaque session vérifiera.

### 3. Les défauts fonctionnels, listés à part

L'inventaire les rencontre ; ils ne sont **pas** du goût, et ne doivent pas se retrouver mélangés à
l'esthétique dans une session — sinon on ne peut plus dire quand elle est finie, et c'est la moitié
facile qui se fait.

Deux sont déjà connus, tous deux sur la scolarité :

- **un mot de passe changé à l'université mène à une impasse.** `LOGIN_FAILED` est marqué non
  réessayable et l'écran de connexion n'apparaît que si le trousseau est vide : l'utilisateur voit une
  erreur définitive et doit deviner qu'il faut passer par les réglages pour se déconnecter. Il faut que
  cet échec **propose de ressaisir** ;
- **on ne peut pas relancer un parcours froid.** Le mode se déduit de la présence des données froides
  (`coldData === null ? 'cold' : 'hot'`), sans moyen de forcer. Rafraîchir une identité périmée oblige
  à se déconnecter.

Ils se corrigent, se testent et se cochent. La liste complète sort de l'inventaire.

## Ce que ce jalon ne fait pas

- **Il ne refait aucun écran.** Les annonces, la scolarité et les réglages se reprennent **après**, en
  sessions, une par écran.
- **Il ne décide pas ce que la page Scolarité doit montrer.** Elle est vide parce que la question n'a
  jamais été tranchée, et aucun travail visuel n'y répondra : le dossier lit déjà numéro étudiant, INE,
  adresse et date de naissance — affichés seulement dans l'écran des identifiants — et **Apogée n'est
  pas extrait**, il n'est qu'un lien dans le navigateur intégré. Les notes sont probablement ce qu'un
  étudiant vient chercher, et c'est un Blueprint de plus, donc une décision produit.
- **Il n'invente pas de thème.** Le thème clair et le thème sombre existent et sont complets.

## Mener les sessions d'écran, après ce jalon

Trois règles, tirées de ce qui a marché et de ce qui a coûté cher pendant le volet 1 :

1. **Un écran à la fois, jamais deux.** Une session qui touche deux écrans fait des compromis
   silencieux entre eux.
2. **Une référence visuelle, pas une description.** `docs/screenshots/` porte dix-sept captures, dont
   `planning-jour.png`, `bu-liste.png` et `crous-liste.png` : « comme la liste des BU » est une
   consigne exécutable, « plus aéré » n'en est pas une.
3. **Ouvrir par la contrainte** : « lis `shared/theme` et `shared/ui`, tu n'as droit qu'à ça ». Sans
   cette phrase, le vocabulaire est réinventé.

Et une règle de trace : une session qui aboutit à une décision durable — « les cartes ont toujours ce
rayon », « pas d'ombre sur fond sombre » — la remonte dans [theme.md](../theme.md). Sinon la session
suivante la défait.

## Définition de « terminé »

1. `docs/inventaire-visuel.md` existe, il compte au lieu de juger, et il a été lu.
2. Les tokens portent une échelle de couleurs sémantiques, déclinée dans les deux thèmes.
3. Les composants partagés existent dans `shared/ui/` et sont **utilisés par les écrans de référence**
   — extraits, donc, et pas seulement ajoutés à côté.
4. La règle ESLint est en place, et [qualite.md](../qualite.md) porte la nouvelle base de référence.
5. La recette d'écran est écrite dans [theme.md](../theme.md).
6. La liste des défauts fonctionnels existe, séparée du visuel.
7. **Les écrans de référence rendent à l'identique** : capture avant / capture après, pour Planning
   jour, la liste des BU et le tableau de bord Campus au minimum.
8. `npx tsc --noEmit`, `npx eslint .` sans nouvelle erreur, `npm test` et `npm run parity` verts.

## Limites écrites

- **Une règle ESLint ne juge pas du goût.** Elle empêche une valeur en dur, pas une mauvaise
  proportion. Ce jalon supprime la dérive mécanique, pas la laideur.
- **Extraire depuis l'existant fige aussi ses défauts.** Si les écrans de référence portent une
  incohérence, elle devient le standard. C'est le prix de ne pas tout redessiner, et c'est un prix
  choisi : le travail déjà fait vaut plus qu'une cohérence théorique.
- **Le socle ne couvre pas les composants d'un seul écran.** Un carrousel de cours simultanés reste
  chez lui ; ne remonter dans `shared/ui/` que ce qui sert **deux fois au moins** — la règle qui a
  gouverné `SourceFailureNotice`.

## Ce que la réalité a corrigé

Six écarts entre le texte ci-dessus et le jalon livré. Aucun n'a changé la thèse ; tous viennent de
la mesure, qui est arrivée avant les décisions comme prévu.

### 1. Le compte de « 330 littéraux » recouvrait deux choses

L'inventaire en distingue **142** — marges, rayons, tailles de texte, les trois familles qui ont une
échelle — des 330 que donne un relevé de toutes les propriétés dimensionnelles. Les 188 autres sont
des `width`, `height` et tailles d'icône, **pour lesquels le dépôt n'a aucune échelle**. La règle
ESLint ne les couvre donc pas : leur en opposer une aurait été inventer, ce que ce jalon s'interdit.
Treize tailles d'icône distinctes sont mesurées et laissées aux sessions.

### 2. Les couleurs sémantiques changent bien quelque chose à l'écran

Le document supposait implicitement que nommer les couleurs serait neutre. Ça ne l'était pas :
`#4caf50` et `#ff9800` vivent dans des écrans de **référence** — l'affluence des bibliothèques,
l'icône « végétarien » du Crous. **Arbitrage du propriétaire du produit** : l'échelle prend les
teintes Apple que `sectionsHeaders` portait déjà (`#34C759` / `#FF9500` / `#FF3B30`, et leurs
variantes sombres), au prix d'un léger décalage de teinte sur ces pastilles. Geler le Material aurait
figé deux palettes dans le socle pour toujours — exactement la limite « extraire fige aussi ses
défauts », mais choisie dans le mauvais sens.

C'est le seul écart au critère « les écrans de référence rendent à l'identique ». Il est délibéré,
borné à la teinte de trois états, et vérifié capture à l'appui.

### 3. Deux tokens ont été **nommés**, pas seulement ajoutés

Prévu : compléter les tokens de ce qui manque. Trouvé : `fontSize.hero: 36` n'était **référencé nulle
part**, alors que le grand titre de page valait `34` dans quatre écrans. Il a pris sa place plutôt que
de devenir un huitième pas. Et `space.xxs: 2` couvre 26 valeurs en dur qui vivaient sous le `xs` de 4.

### 4. Les tokens ont dû sortir de `Theme.ts`

Non prévu, et rendu nécessaire par la règle elle-même : elle porte une **copie** des échelles — ESLint
ne lit pas de TypeScript applicatif — et une copie dérive. Le test qui l'en empêche doit importer les
tokens sous Node, or `Theme.ts` importe `react-native`. Les tokens vivent donc dans
[`tokens.ts`](../../src/shared/theme/tokens.ts), réexportés par `Theme.ts` : aucun import existant n'a
changé. C'est la règle du dépôt appliquée à la lettre — le code testable se sépare du code de
plateforme.

### 5. Un composant de plus, et il n'est pas décoratif

La liste prévoyait carte, en-tête de section, ligne de liste, état vide, état de chargement, badge.
Il a fallu y ajouter [`Icon`](../../src/shared/ui/Icon.tsx) : le dépôt mélange `MaterialIcons` et
`MaterialCommunityIcons`, et les glyphes ne se correspondent pas — `location-on` n'existe que chez le
premier, le piéton s'appelle `walk` chez l'un et `directions-walk` chez l'autre. Un composant partagé
qui n'aurait connu qu'une famille aurait obligé ses appelants à **changer de glyphe** pour l'utiliser,
c'est-à-dire à modifier le rendu d'écrans de référence pour un gain de façade.

Et une frontière que le texte n'anticipait pas : la distance à pied et l'affluence d'une bibliothèque
sont du **domaine Campus**, pas du vocabulaire visuel. Elles sont partagées entre deux écrans, donc
extraites — mais dans [`CampusCardParts.tsx`](../../src/features/Campus/components/CampusCardParts.tsx),
pas dans `shared/ui/`. Le socle n'a aucune raison de connaître les bibliothèques.

### 6. La liste des défauts fonctionnels est plus longue que prévu

Deux étaient connus, tous deux sur la scolarité. La mesure en a levé **deux autres**, et le second est
le plus gênant :

- **les salles libres n'ont aucun état d'erreur** — `FreeRoomService` ne produit pas de `UkitFailure`,
  et une source en panne y affiche « Aucun bâtiment trouvé ». C'est précisément le défaut que la
  Phase 6 revendique d'avoir supprimé partout ailleurs, resté dans le seul écran Campus qui n'a pas
  été migré ;
- **la police des titres n'est jamais chargée.** `Montserrat_600SemiBold` est demandée 22 fois — tous
  les titres de page, tous les en-têtes de section — et [`App.tsx`](../../App.tsx) ne charge que
  `Montserrat_500Medium`. La typographie qui s'affiche n'est pas celle que le code décrit.

  **Épilogue.** Le correctif a été appliqué, puis inversé : charger les graisses manquantes a montré
  que la police ne vivait que dans les titres, jamais dans le contenu — un résidu, pas un système.
  Montserrat a été retirée entièrement et l'application est en police système
  ([theme.md](../theme.md#les-décisions-durables)). C'est exactement pourquoi le jalon ne l'avait pas
  traité en passant : il fallait le **voir** pour le trancher.

Les quatre sont dans [defauts-fonctionnels.md](../defauts-fonctionnels.md) et **aucun n'est corrigé
ici** : le quatrième change le rendu de tous les écrans de référence d'un coup, ce qui est une
décision et non un effet de bord d'un jalon d'extraction. C'est une bonne illustration de la raison
d'être de ce document séparé.

### 7. Une passe de cohérence a suivi la livraison

Le jalon extrait le vocabulaire ; il ne prétendait pas que tout l'existant s'y conformait. Une revue
menée juste après, sur demande du propriétaire du produit, en a corrigé six écarts — tous du même
genre : **le même rôle habillé de plusieurs façons.**

| Écart | Ce qui a été fait |
|---|---|
| Les popups portaient deux boutons **gris identiques**, distingués par la seule couleur du texte | `buttonMain` devient un bouton plein `primary` — celui de Réessayer — et un `buttonDestructive` plein `danger` apparaît pour les deux actions qui suppriment vraiment quelque chose |
| Huit libellés s'affichaient **en clé brute** à l'écran | les treize clés Campus traduites, les transtypages retirés, les 38 replis `\|\| 'texte'` morts supprimés |
| Le Planning avait **trois états vides** à lui, en trois tailles d'icône | tout converge sur `EmptyState`, qui gagne une variante `plain` et un titre facultatif |
| `CampusFilterModal` portait un **troisième dialecte de modale** en repli `?.` jamais affiché | supprimé, la modale prend `theme.settings.popup` |
| `#009ee0` servait de repli à une pastille — dont la couleur de texte était un **bleu à 8 % d'opacité**, quasi illisible | la teinte pleine du thème, et le repli mort retiré |
| « Scolarity » n'est pas un mot anglais ; deux titres de section étaient au singulier au-dessus d'un carrousel | « Academics », et les pluriels rétablis |

La leçon vaut d'être écrite : **un repli qui ne se déclenche jamais masque le défaut qu'il prétend
couvrir.** Les trois cas trouvés ici — le cast de clé, le `|| 'texte'`, le `?.` sur le thème — ont
chacun caché un vrai problème pendant des mois. Une session d'écran qui en croise un doit le retirer,
pas le contourner.

### Base de référence, après

| Porte | Avant | Après |
|---|---|---|
| `npx tsc --noEmit` | 3 erreurs | **verte** — les trois `TS2612` historiques corrigées |
| `npx eslint .` | 0 erreur, 11 warnings | **0 erreur, 79 warnings** — 11 `no-explicit-any` et 68 `no-style-literals` |
| `npm test` | 262 tests | **267 tests**, tous verts |
| `npm run parity` | vert | **vert** (aucun Blueprint touché) |

Les 68 avertissements de style ne sont pas une dette introduite : ils étaient là et n'étaient mesurés
par rien. 41 sont dans les trois écrans que les sessions vont réécrire, 27 sont des valeurs hors
échelle assumées et consignées. Détail dans [qualite.md](../qualite.md#base-de-référence).
