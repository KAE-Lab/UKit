# Campus — vie étudiante

Annonces éditoriales : événements associatifs, communications de BDE, informations ponctuelles. C'est
le seul contenu de l'application **rédigé par l'équipe** plutôt que récupéré d'un système
universitaire.

Socle commun : [campus.md](campus.md). Source de données : la table `annonces` de notre
[base de publication](../backend.md).

Cette partie a servi deux fois de pilote, et c'est ce qui explique son histoire. Au jalon
[6-A](../phase-6/6-a-socle.md) elle a été la **première source migrée vers un
[Blueprint](../blueprints.md)** — la plus simple du lot, donc celle dont un échec ne pouvait venir
que du socle qu'on posait. Au jalon [6-B](../phase-6/6-b-supabase.md) elle est devenue la **première
fonctionnalité alimentée par la base**, et le **premier écran branché sur le modèle d'erreur**.

## Parcours utilisateur

1. La section du tableau de bord présente les annonces actives en carrousel horizontal — c'est la
   première section, en haut de l'onglet.
2. « Voir tout » ouvre la liste complète.
3. Toucher une annonce ouvre sa fiche : visuel, titre, émetteur, étiquette d'information, description
   longue, et bouton d'action ouvrant un lien externe.

> **Capture attendue** — `annonces-liste.png` : la liste des annonces actives.
>
> **Capture attendue** — `annonce-detail.png` : une fiche complète, avec émetteur, étiquette et bouton
> d'action.

## Flux de données

```text
BdeSection (tableau de bord) / BdeScreen (liste)
  └─ useBdeAnnonces()                     le chargement, l'echec, le nouvel essai
       └─ BdeService.fetchAnnonces()
            ├─ getSupabase()              null si l'application est construite sans cle
            ├─ select(colonnes) sur `annonces`
            │    ├─ la politique de lecture ecarte deja l'inactif et l'expire
            │    └─ order publiee_le desc, puis id asc
            ├─ si erreur → describeSupabaseFailure → { ok: false, failure }
            ├─ projection : colonnes de la table → contrat BdeAnnonce (BdeMapping)
            └─ filtre applicatif : expires_at > maintenant, ou pas d'expiration
  └─ succes → CampusCard → navigation vers BdeDetail
  └─ echec  → message de la famille + bouton Reessayer

BdeDetailsScreen (params : annonce)
  └─ rendu direct de l'objet reçu, aucun appel réseau
  └─ Linking.openURL(cta_link) sur le bouton d'action
```

La fiche ne recharge rien : l'annonce complète transite par les paramètres de navigation. C'est
possible parce que la charge utile est petite et déjà entièrement chargée par la liste.

**Où passe la frontière.** La base porte le contenu et la règle de publication (`active`,
`expire_le`) ; l'application porte la projection sur `BdeAnnonce`, le **filtre d'expiration** et le
tri. Le filtre est volontairement doublé : la politique protège la **donnée** — ce qui n'a pas à être
lu n'est pas envoyé — et le filtre applicatif protégera l'**affichage** le jour où la donnée viendra
d'un cache local. C'est aussi lui qui permettra un jour d'afficher une annonce expirée en grisé
plutôt que de la masquer, ce qu'un filtre côté base interdit.

**Pourquoi pas un Blueprint, alors qu'il en existait un.** Un Blueprint sert à parler à une source
**tierce** dont on ne contrôle ni le format ni la disponibilité, et qu'on veut pouvoir corriger sans
release. Pour notre propre table, l'indirection n'achèterait rien — nous changeons le schéma et
l'application dans le même mouvement — et coûterait un aller-retour de plus à chaque correction.
Le fichier reste dans [`blueprints/`](../../blueprints/) comme témoin du format.

## Contrat

Deux formes, et il faut savoir laquelle est laquelle. La **ligne de base** est en français, comme le
reste du schéma ; le **contrat d'écran** garde les noms anglais d'avant la base — renommer le contrat
en même temps qu'on change de source aurait mélangé deux changements dont un seul a une raison.

| Colonne (`annonces`) | Champ (`BdeAnnonce`) | Note |
|---|---|---|
| `id` | `id` | UUID, sert de clé de liste |
| `active` | `is_active` | filtré par la politique ; lu, plus supposé |
| `expire_le` | `expires_at` | **nullable** — vide veut dire « n'expire pas » |
| `titre` | `title` | |
| `emetteur` | `issuer_name` | association ou service émetteur |
| `image_url` | `image_url` | URL du bucket `media` |
| `accroche` | `info_label` | étiquette courte : date, lieu, tarif |
| `description` | `long_desc` | la description longue de la fiche |
| `cta_texte` | `cta_text` | libellé du bouton d'action |
| `cta_lien` | `cta_link` | URL ouverte au clic |
| `publiee_le` | — | jamais affiché ; c'est le tri |

Un champ nul ou vide en base est **omis** du contrat, jamais rendu chaîne vide : la fiche n'affiche
son bouton que si le libellé et le lien sont tous deux présents, et un libellé vide donnerait un
bouton muet. La conversion est dans
[`BdeMapping.ts`](../../src/features/Campus/services/BdeMapping.ts) et elle est testée.

## Publier une annonce

Depuis la console d'administration de Supabase, table `annonces`. Une entrée ajoutée est visible au
rechargement suivant, **sans publier de nouvelle version de l'application**.

Deux garde-fous, et ils ne font pas la même chose : `active = false` retire une annonce
**maintenant**, `expire_le` la fait disparaître d'elle-même à échéance. Les deux sont appliqués par
la politique de lecture, donc une annonce retirée ne sort pas de la base.

**`expire_le` peut rester vide** : l'annonce n'expire alors jamais.

Les visuels vont dans le bucket `media`, sous `annonces/`, et leur URL publique dans `image_url`.
Procédure complète et clés : [backend.md](../backend.md#publier).

## Décisions de conception

**Le tri est explicite.** Une table n'a pas d'ordre : s'en remettre à celui que la base rend ferait
varier l'affichage sans raison. `publiee_le` décroissant, `id` pour départager à horodatage égal, de
sorte que deux lectures successives donnent la même liste.

**Une annonce sans expiration ne disparaît pas.** `expire_le` est nullable et la politique laisse
passer `expire_le is null`. Le code d'avant la base comparait `new Date('')`, toujours faux, ce qui
aurait masqué une annonce que la base publie. Corrigé au jalon 6-B, et verrouillé par un test. Une
date *illisible*, en revanche, écarte toujours l'annonce : mieux vaut masquer que d'afficher un
contenu dont on ne sait pas s'il est encore d'actualité.

**La fiche est purement présentationnelle.** Aucun état, aucun chargement : elle rend l'objet reçu et
sort tôt (`if (!annonce) return null`) si le paramètre manque.

**Le chargement vit dans un hook, pas dans les écrans.** Le carrousel du tableau de bord et la liste
complète lisent la même source avec la même machinerie — chargement, échec, nouvel essai. L'écrire
une fois, dans [`useBdeAnnonces`](../../src/features/Campus/hooks/useBdeAnnonces.ts), évite qu'ils
divergent.

**Une liste vide et une panne ne produisent pas le même écran**, et c'est le vrai apport du jalon
6-B ici. En cas d'échec, la liste affiche le message de la famille et un bouton Réessayer ; le
carrousel du tableau de bord affiche une ligne discrète au lieu de disparaître. Quand il n'y a
simplement rien à publier, le carrousel disparaît comme avant — une absence d'annonces ne mérite pas
de section.

**Le bouton Réessayer n'apparaît que s'il peut réparer quelque chose.** C'est la table de
[`shared/aetherius/failures.ts`](../../src/shared/aetherius/failures.ts) qui décide, pas l'écran :
une source qui a changé de contrat (`rejected`) redonnera la même réponse, et un bouton qui ne répare
rien est pire qu'aucun bouton.

## Vérifier

```bash
npm test                      # la projection, l'expiration, la table d'erreurs
```

Le harnais de parité n'a plus de cas pour cette source : il comparait le Blueprint à l'ancien chemin
jsDelivr, et les deux ont quitté la production au jalon 6-B.

Sur appareil, le parcours nominal :

- Ouvrir l'onglet Campus : la section annonces doit être en tête et peuplée.
- Ouvrir la liste complète puis une fiche : visuel, émetteur, étiquette et **description longue**
  doivent s'afficher ; le bouton d'action doit ouvrir le lien dans le navigateur système.
- Ouvrir une annonce sans `image_url`, sans `info_label` ou sans `cta_link` : la fiche doit rester
  correcte, les éléments absents simplement omis.

Puis les chemins dégradés, qui doivent produire des écrans **différents** :

| Sonde | Comment | Attendu |
|---|---|---|
| Annonce retirée | `active = false` en base | disparaît au rechargement, sans release |
| Annonce expirée | reculer `expire_le` | absente — et absente **de la réponse**, pas seulement de l'écran |
| Annonce sans échéance | `expire_le = null` | **visible** |
| Base injoignable | `SUPABASE_URL` sur un hôte `.invalid` | « Service indisponible » + Réessayer, et les autres onglets fonctionnent |
| Clé fausse | altérer `SUPABASE_ANON_KEY` | même écran, et l'application démarre |
| Sans base du tout | vider les deux variables | l'application démarre et s'utilise entièrement |
| Rien à publier | passer toutes les annonces à `active = false` | écran vide **sans** message d'erreur |

Les deux dernières lignes sont celles qui comptent : la première prouve que la base est un point de
publication et non un intermédiaire, et le contraste entre les deux prouve que « la source est
morte » et « il n'y a rien aujourd'hui » ne sont plus le même écran.

**Une astuce qui fait gagner deux allers-retours** : les trois sondes de publication se jouent en une
seule recharge, en ajoutant deux annonces de sonde en base — l'une expirée, l'autre sans échéance —
en plus d'une désactivée. Chaque cas a alors une issue distincte et lisible sur le même écran, et il
suffit de relever la réponse REST en parallèle pour prouver que l'écart vient de la politique et non
d'un filtre applicatif.

**Le mode avion n'est pas la bonne sonde** : couper la connexion d'un appareil de développement casse
aussi Metro. Pointer `SUPABASE_URL` sur le TLD réservé `.invalid` (RFC 2606, ne résout sur aucun
réseau) produit exactement la même famille, sans toucher à la connectivité. Après toute bascule de
`.env`, redémarrer avec `npx expo start -c` : `app.config.ts` lit l'environnement au moment de la
configuration, pas à l'exécution.

![La liste des annonces en échec : nuage barré, « Service indisponible », bouton Réessayer](../screenshots/annonces-erreur.png)

*L'écran de la sonde « base injoignable ». C'est ce qui remplace l'ancienne liste vide — et ce qui ne
s'affiche **pas** quand il n'y a simplement rien à publier : dans ce cas la section disparaît, sans
message ni bouton.*

## Limites connues

- **Le message d'état vide s'affiche en majuscules brutes** (`NO_RESULTS`) — voir
  [i18n.md](../i18n.md). Le repli `|| 'Aucune annonce'` qui l'accompagne ne se déclenche jamais.
- **Aucun cache** : l'absence de réseau vide la section. Elle affiche désormais *pourquoi*, ce qui
  est mieux qu'avant, mais des annonces vues juste avant ne réapparaissent pas hors ligne.
- **`expires_at` est comparé en heure locale de l'appareil**, sans fuseau explicite.
- **La fiche n'a pas d'état d'erreur** : un paramètre manquant produit un écran vide. Elle ne charge
  rien, donc elle ne peut pas échouer — mais elle ne peut pas non plus le dire.
- **Le tri se fait sur `publiee_le`**, pas sur un ordre éditorial choisi. Deux annonces publiées à la
  même seconde sont départagées par leur identifiant, ce qui est déterministe mais arbitraire.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`Bde/BdeScreen.tsx`](../../src/features/Campus/Bde/BdeScreen.tsx) | liste complète des annonces actives |
| [`Bde/BdeDetailsScreen.tsx`](../../src/features/Campus/Bde/BdeDetailsScreen.tsx) | fiche d'une annonce : visuel, métadonnées, description, bouton d'action |
| [`hooks/useBdeAnnonces.ts`](../../src/features/Campus/hooks/useBdeAnnonces.ts) | le chargement, l'échec retenu, le nouvel essai — partagé par les deux surfaces |
| [`services/BdeService.ts`](../../src/features/Campus/services/BdeService.ts) | lit la table, rend une liste ou un échec traduit |
| [`services/BdeMapping.ts`](../../src/features/Campus/services/BdeMapping.ts) | le contrat `BdeAnnonce`, la projection depuis la ligne de base, la péremption |
| [`Dashboard/components/BdeSection.tsx`](../../src/features/Campus/Dashboard/components/BdeSection.tsx) | le carrousel du tableau de bord |
| [`Dashboard/components/BdeSectionParts.tsx`](../../src/features/Campus/Dashboard/components/BdeSectionParts.tsx) | la carte d'annonce et la ligne d'échec du carrousel |
| [`blueprints/ukit-campus-annonces.blueprint.json`](../../blueprints/ukit-campus-annonces.blueprint.json) | témoin du format : le pilote du jalon 6-A, plus joué en production |
