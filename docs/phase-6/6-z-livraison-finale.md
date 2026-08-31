# 6-Z — Retrait du legacy et livraison

> Retirer les replis, éteindre ce qui n'a plus de raison d'être, clore la documentation, publier.
> Le jalon qui empêche la phase de laisser deux implémentations derrière elle.

> **Anciennement `6-H`.** Renommé en `Z` à la clôture du volet 1 : ce jalon ferme la phase, il doit
> donc rester le dernier quel que soit le nombre de jalons ajoutés entre-temps — et un dossier trié
> par nom de fichier se lit alors dans l'ordre d'exécution. Les références anciennes à « 6-H »
> désignent ce document.

> **Il sort la version 6**, refonte visuelle comprise : chez UKit une phase correspond à une version,
> et rien ne part sur les stores avant que le volet 2 soit fini. Ce jalon vient donc **après**
> [6-K](6-k-socle-visuel.md) et les sessions d'écran qui le suivent, pas après 6-J.
>
> **Amendé le 2026-08-30 : il sort la v6.0, pas toute la v6.** La version part en deux publications
> — le pourquoi et le contenu de chacune sont écrits dans le
> [README de phase](README.md#la-v6-part-en-deux-temps). Ce que ce jalon vérifie ne change pas :
> plus aucune source à deux chemins, le legacy retiré, la documentation close. La v6.1 qui suivra
> est une version **mineure** — elle ajoute des capacités sur l'architecture que ce jalon a figée,
> elle ne rouvre ni les replis ni la migration.

## Objectif

Aucune source n'a plus deux chemins. Les dépendances devenues inutiles sortent du projet. La
documentation dit ce que l'application fait réellement. La version part sur les deux stores.

## Pourquoi ça mérite un jalon

Parce qu'un repli qu'on ne retire jamais devient **deux implémentations à maintenir**, et qu'aucun
jalon de migration ne se sent responsable de nettoyer ce qu'il a laissé en sécurité. Le nommer, c'est
garantir qu'il arrive.

Et parce que la fin d'une migration est le moment où la documentation ment le plus : chaque jalon a
mis à jour ce qu'il touchait, personne n'a relu l'ensemble.

## Ce qui est livré

### Les replis sont retirés

Un par un, dans l'ordre où ils ont été posés, et **seulement quand sa parité est verte depuis assez
longtemps pour compter** : annonces, restaurants, bibliothèques, bâtiments, groupes, planning,
salles, session universitaire.

Le critère n'est pas « ça marche chez moi » mais : la source a été jouée en production, sur des
appareils réels, à travers au moins un incident (une source qui a répondu bizarrement, un réseau
mauvais) et le modèle d'erreur a dit la vérité.

### Le code mort sort

| Ce qui sort | Pourquoi |
|---|---|
| `axios`, `qs` | plus aucun appelant — à vérifier par recherche, pas de mémoire. **Vérifié le 2026-08-31, avec une anomalie** : `axios` est sorti (son dernier appelant, le contrôle de mise à jour, lisait le fichier VERSION sur GitHub raw — remplacé par `app_release`, voir plus bas) ; `qs`, lui, reste en **dépendance de développement** : l'outillage de parité (`tools/parity/commun.mjs`) s'en sert pour reproduire l'encodage httpx, et c'est la recherche prescrite ici qui l'a montré. Hors du bundle de l'application, sa raison d'être est celle de l'outillage |
| `ScolariteWebSession.tsx` | déjà supprimé en [6-F](6-f-scolarite.md), vérifier qu'il ne reste rien de sa machine à états |
| Les chemins de repli des services | leur raison d'être a disparu |
| La lecture du fichier `VERSION` sur GitHub raw | remplacée par la table `app_release` en [6-B](6-b-supabase.md) |
| `WebApiURL` dans [`urls.ts`](../../src/shared/constants/urls.ts) | les points d'entrée Celcat sont des `vars` de Blueprint |

`moment` **ne sort pas** : il sert au formatage et au calcul de dates dans les vues, ce qui reste
applicatif. Sa dette éventuelle est un sujet séparé.

### Le relais Celcat s'éteint

`ukit.kbdev.io` a été contourné en [6-E](6-e-planning.md) mais laissé allumé, le temps d'observer.
Il s'éteint ici, et pas avant deux conditions :

1. les versions publiées qui en dépendent sont sorties du parc — c'est la table `app_release` qui le
   dit, pas une intuition ;
2. la bascule directe a passé une période de charge réelle (une semaine de rentrée, idéalement).

Un serveur qu'on éteint trop tôt casse les installations qu'on n'a pas comptées.

### La documentation est close

- [`sources-externes.md`](../sources-externes.md) : chaque source dit quel Blueprint la porte, ce qui
  est resté applicatif, et sa fragilité **réévaluée** — plusieurs ont changé de nature, pas seulement
  de forme ;
- [`architecture.md`](../architecture.md) : la couche réseau n'existe plus sous cette forme ;
  l'invariant « les services échouent en silence utile » est **remplacé**, c'est le changement le plus
  structurant de la phase ;
- [`README.md`](../../README.md) : la vision (le principe « aucun serveur » reformulé, voir
  [6-B](6-b-supabase.md)), la section « État des lieux », le tableau des sources ;
- [`PRIVACY.md`](../../PRIVACY.md) : la base apparaît, avec ce qu'elle contient et ce qu'elle ne
  contient pas ;
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) : « Ajouter une source de données » décrit le chemin
  réel, c'est-à-dire écrire un Blueprint ;
- [`CHANGELOG.md`](../../CHANGELOG.md) : la version, avec ce qui change pour l'utilisateur — et pour
  lui, l'essentiel tient en une ligne : **les pannes deviennent lisibles et les corrections
  arrivent sans mise à jour.**

### La release

Cohérence de `package.json`, `app.config.ts` et `VERSION` avant de poser le tag — le workflow ne met
pas tout à jour automatiquement ([plateforme.md](../plateforme.md)). Version majeure : la phase change
l'architecture, pas seulement des écrans.

## Dépendances

Ce jalon fige les versions des paquets Aetherius consommées par la release. La discipline qui vaut
pour toute la phase :

- **une version épinglée**, pas une plage ouverte, au moment de publier ;
- une montée de version du moteur est un **changement à part entière** : elle se teste, elle passe la
  parité, elle a sa ligne de changelog. Un moteur qui bouge sous une application qui ne bouge pas est
  la meilleure façon de perdre une soirée ;
- si un défaut du moteur est trouvé pendant la phase, il se corrige **chez Aetherius**, avec sa
  spécification et son cas de conformance. Un contournement ici serait une divergence qu'on paierait
  deux fois.

## Définition de « terminé »

1. Plus aucun repli : une recherche sur les noms des anciennes fonctions ne rend rien.
2. `axios` et `qs` ne sont plus des dépendances ; `npm ls` le confirme.
3. La documentation est relue **en entier**, pas seulement amendée par endroits.
4. Le relais est éteint, ou sa date d'extinction est écrite et justifiée.
5. La parité complète est verte, et elle est jouée une dernière fois avant le tag.
6. Vérification manuelle intégrale sur appareil : les quatre onglets, les chemins dégradés, une
   installation neuve et une mise à jour depuis la version précédente.
7. `npx tsc --noEmit` et `npx eslint .` — et l'occasion de **réduire** la base de référence de
   [qualite.md](../qualite.md) plutôt que de la maintenir, puisqu'on passe partout.
8. Captures d'écran mises à jour pour ce qui a changé visuellement (les états d'erreur, la sélection
   d'établissement).

## Plan de test

Le plan de test de ce jalon est **la somme des précédents**, rejouée d'un bloc sur un appareil neuf
et sur un appareil mis à jour. Plus trois sondes qui ne se jouent qu'ici :

| Sonde | Attendu |
|---|---|
| Installation neuve, **jamais de réseau** | l'application démarre, s'utilise sur son socle, n'affiche aucune erreur qui ne soit pas vraie |
| Mise à jour depuis la version précédente | réglages, favoris, session et caches conservés ; établissement `bordeaux` implicite |
| Base et bucket volontairement injoignables | tout fonctionne sur le socle embarqué, y compris la session universitaire |

La dernière est la plus importante de toute la phase. Elle vérifie la promesse qu'on a faite en
introduisant une base : **elle est un point de publication, pas un intermédiaire.** Si l'application
en dépend pour fonctionner, la phase a échoué son objectif principal, quel que soit le reste.

## Limites écrites

- **Le parc ne se vide pas d'un coup.** Des versions antérieures continueront d'interroger jsDelivr
  et le relais pendant des mois. Ce qui est retiré du code n'est pas retiré du monde.
- **La phase ne rend pas les sources fiables.** Elle rend leurs pannes lisibles et leurs corrections
  rapides. C'est une différence de nature, et il faut la dire ainsi dans le changelog plutôt que de
  promettre une robustesse qu'on n'a pas.
- **Ce qui reste fragile reste écrit** : les sélecteurs positionnels, les API privées sans contrat,
  les constantes observées. La documentation de chaque source les nomme — c'est la seule façon de ne
  pas les redécouvrir en urgence.
