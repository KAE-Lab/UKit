# Les Blueprints embarqués

Les fichiers d'instructions joués par le moteur Aetherius. C'est la **source de vérité** : ils sont
relus en revue, versionnés avec le code qui les consomme, importés dans le binaire par
[`index.ts`](index.ts), et publiés vers la base par `npm run blueprints:publish`.

| Fichier | Rôle |
|---|---|
| `*.blueprint.json` | les documents eux-mêmes |
| [`index.ts`](index.ts) | le socle embarqué : les noms, la table `BUNDLED`, le périmètre des secrets |
| [`versions.json`](versions.json) | la **version** de chaque document, et son `min_engine` s'il en a un |

`versions.json` existe parce que le script de publication est un module Node : il ne sait pas lire
`index.ts`. Les deux côtés lisent donc le même fichier de données, et une version recopiée à la main
ne peut pas diverger de celle qui est embarquée.

Ce que ces fichiers portent, comment on en écrit un et comment on publie une correction :
[docs/blueprints.md](../docs/blueprints.md).

## Provenance

Les six fichiers présents aujourd'hui viennent du jalon 3-G d'Aetherius, où ils ont été écrits contre
nos vraies sources, joués sur les deux moteurs et vérifiés sur un téléphone. Leurs descriptions y font
encore référence pour la plupart : c'est volontaire. Ce sont des fichiers **mesurés**, et les
retoucher sans raison mesurée reviendrait à perdre ce qui les rend fiables.

La règle est donc : **on ne les retouche pas par confort, on les corrige quand le branchement révèle
un manque** — et la correction s'accompagne d'une montée de version. C'est arrivé une fois :

| Fichier | Correction | Version | Jalon |
|---|---|---|---|
| `ukit-campus-annonces` | extraction de `long_desc`, que la fiche affiche et que le fichier oubliait ; `assert` sur la présence du tableau `annonces` | 1 → **2** | [6-A](../docs/phase-6/6-a-socle.md) |

Le second ajout mérite d'être connu avant d'écrire le suivant : sans lui, une réponse valide dont la
clé attendue a disparu rend un **succès à liste vide**, indistinguable d'une liste légitimement vide.
Voir [docs/blueprints.md](../docs/blueprints.md#affirmer-la-forme-pour-que--rien-trouvé--ne-se-confonde-pas-avec--rien-à-trouver-).

Ils sont un point de départ démontré, pas le jeu final :

| Fichier repris | Ce qu'il deviendra | Jalon |
|---|---|---|
| `ukit-campus-annonces` | **plus joué** ; conservé comme témoin du format — la source est passée en base | [6-A](../docs/phase-6/6-a-socle.md), [6-B](../docs/phase-6/6-b-supabase.md) |
| `ukit-campus-restaurants` | découpé en `restaurants` et `restaurant-menu` | [6-D](../docs/phase-6/6-d-campus.md) |
| `ukit-campus-affluence` | découpé en `bibliotheques`, `bibliotheque-affluence`, `bibliotheque-horaires` | [6-D](../docs/phase-6/6-d-campus.md) |
| `ukit-celcat-semaine` | découpé en `groupes`, `jour`, `semaine`, `annee`, `salles`, `occupation` | [6-E](../docs/phase-6/6-e-planning.md) |
| `ukit-scolarite-sso` | renommé `ukit.portail.<code>.dossier` | [6-F](../docs/phase-6/6-f-scolarite.md), [6-G](../docs/phase-6/6-g-etablissements.md) |
| `ukit-scolarite-messagerie` | renommé `ukit.portail.<code>.messagerie` | [6-F](../docs/phase-6/6-f-scolarite.md), [6-G](../docs/phase-6/6-g-etablissements.md) |

La règle qui explique ce tableau : **un Blueprint par appel réellement joué par l'application**, pas
un par source. Les fichiers d'origine regroupent plusieurs requêtes parce qu'ils devaient démontrer
une chaîne en une exécution ; l'application, elle, les appelle à des moments différents, pour des
écrans différents.

## Convention de nommage

`<domaine>.<tache>`, en minuscules, sans accent :

```
ukit.campus.restaurants
ukit.campus.bibliotheque-affluence
ukit.celcat.semaine
ukit.portail.bordeaux.dossier
```

Le préfixe `ukit.portail.` est **réservé** : c'est le seul sous lequel un manifeste distant peut
ajouter un Blueprint que l'application n'embarque pas ([6-G](../docs/phase-6/6-g-etablissements.md)).
Ne pas l'utiliser pour autre chose.

Le nom du fichier reprend le nom du Blueprint, points remplacés par des tirets, suivi de
`.blueprint.json`.

## Deux règles qui ne se négocient pas

- **Aucun identifiant dans un fichier.** Les secrets sont **déclarés** (`secrets`) et fournis au
  runtime par le trousseau de l'appareil. Un fichier de ce dossier est publié sur un CDN public.
- **La version s'incrémente dans [`versions.json`](versions.json) à chaque correction publiée.** Le
  distant ne gagne que s'il est strictement plus récent que l'embarqué ; une correction publiée sans
  montée de version n'atteint jamais un appareil, et le panneau de diagnostic du menu de
  développement est le seul endroit où ça se voit.
