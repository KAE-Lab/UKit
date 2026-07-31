# Jalon 2-D — Composition multi-Act & self-healing

**Statut : livré.** Doc définitive : [docs/composition.md](../composition.md). Fait tomber la
contrainte « un Act par Blueprint ». Deux capacités liées : (a) **`act` par step** — mélanger
Continuum, Oracle et Phantom dans un même run ; (b) **self-healing** — quand un sélecteur lâche,
rejouer l'intention du step sur l'Act supérieur.

## Objectif

Couvrir bien plus de cas d'usage réels : scripter les parties fiables (Continuum), déléguer les
parties fragiles à la vision (Oracle) et les parties non scriptées à l'agent (Phantom), **dans un
seul run et un seul navigateur**. Et rendre un Blueprint **résilient** : un site qui change un
sélecteur ne casse plus le run si un fallback vision est déclaré.

## Dépendances

Requiert **2-B** (Oracle) et **2-C** (Phantom) : il faut au moins deux Acts navigateur pour switcher
et pour que le fallback ait une cible.

## Interfaces et fichiers

À créer / brancher (les **leviers** confirmés par l'audit du runtime) :

- **`act` par step** : [`StepModel`](../../src/aetherius/core/blueprint/models.py) est
  `extra="allow"` → un champ `act` par step passe **sans changement de schéma**. Le formaliser
  (documenter le champ, le lire dans l'exécuteur).
- **Gestionnaire de drivers par run** : généraliser
  [`_make_driver`](../../src/aetherius/core/runtime/engine.py) en un petit gestionnaire qui
  instancie/`setup` un driver **à la demande** (au premier step qui le réclame) et `teardown` tous les
  drivers en fin de run. Les Acts navigateur (II/III/IV) **partagent une seule `BrowserSession`**
  (créée au premier step navigateur, réutilisée) — sinon on ouvrirait plusieurs navigateurs. Vector
  (sans navigateur) reste indépendant.
- **Validation par-step** : `validate_for_act` devient « chaque step contre l'act **effectif** du
  step » (aujourd'hui : tout l'arbre contre un act unique). Descente récursive inchangée.
- **Fallback / self-healing** : interception au **point de sortie unique** de l'exécuteur
  ([`steps.py`](../../src/aetherius/core/runtime/steps.py), le bloc `except AetheriusError`). Sur
  échec d'un step, si un Act supérieur est configuré, rejouer le **même** step via ce driver avant de
  propager `StepFailed`. Politique déclarative : `options.fallback: ["oracle", "phantom"]` (chaîne
  d'escalade) et/ou `on_failure` par step. Un step peut porter un `describe`/`vision` (indice langage
  naturel) consommé par l'Act supérieur quand son `selector` échoue.

## Contrat

`contracts/blueprint.schema.json` : documenter `step.act`, `options.fallback`, `step.describe` (champs
additionnels, **structure inchangée**). Garder `tests/contracts/` verts.

## Points de conception

- **Un seul navigateur partagé** est l'invariant central : c'est lui qui rend le mélange II/III/IV
  cohérent (même page, mêmes cookies, même session) et le fallback naturel (rejouer sur la même page).
- **Cycle de vie des drivers** : `setup` paresseux, `teardown` groupé en fin de run. Le
  `BrowserSession` appartient au premier Act navigateur et est passé aux suivants (composition, pas
  ré-instanciation).
- **Intention portée par le step** : pour que le fallback marche, un step doit porter assez
  d'intention pour l'Act supérieur (un `click` avec `selector` **et** `describe`). Sans `describe`,
  l'escalade vers Oracle/Phantom peut aussi inférer depuis le label/texte — à cadrer ici.
- **Vector ↔ navigateur** : franchir la frontière HTTP↔navigateur en cours de run démarre un
  navigateur (pas d'état à partager) — honnête et documenté ; le cas courant reste le mélange entre
  Acts navigateur.
- **Zéro régression mono-Act** : un Blueprint sans `act` par step ni `fallback` se comporte
  exactement comme aujourd'hui (un seul driver, bind unique).

## Plan de test

- Routage par step : un run avec un step `continuum` puis un step `act: oracle` partage **un seul**
  navigateur (driver factice + compteur d'instances).
- Validation par-step : un step `act: oracle` avec une action Oracle-only passe ; la même action sur
  un step `continuum` échoue à la validation, avec le hint.
- Self-healing : un step au `selector` volontairement cassé + `fallback: ["oracle"]` est rejoué sur
  Oracle (provider mocké) et réussit ; sans fallback, il échoue comme avant.
- Non-régression : les Blueprints mono-Act existants produisent des runs identiques.

## Exemple exécutable à livrer

Deux exemples zéro config : (1) un run **Continuum** dont le dernier step bascule en `act: oracle`
pour une extraction sémantique (`read`) ; (2) un run **self-healing** avec un `selector` fragile et un
`fallback` vision qui le rattrape. Doc transverse mise à jour
([`docs/blueprint-schema.md`](../blueprint-schema.md) pour `act`/`fallback`/`describe`).

## Définition de terminé

Les 6 points de [CONTRIBUTING](../../CONTRIBUTING.md#définition-de--terminé-) ; un run mixte vérifié à
la main **partageant un seul navigateur** ; un fallback déclenché réellement quand un sélecteur casse ;
`make check` vert ; non-régression des Blueprints mono-Act.

## Critères d'acceptation

Un Blueprint peut déclarer un `act` par step et une chaîne `options.fallback` ; un run mixte n'ouvre
qu'un navigateur ; un sélecteur cassé est rattrapé par l'Act supérieur au lieu d'avorter le run ; les
Blueprints existants sont inchangés.
