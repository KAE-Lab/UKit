# Jalon E — Actions custom / mécanisme de plugins

**Statut : livré.** Le registre d'actions est activé (repli des drivers après leur `match`
built-in, via [`core/actions/registry.py`](../../src/aetherius/core/actions/registry.py)), la
découverte par entry-points est en place ([`plugins.py`](../../src/aetherius/plugins.py), groupes
`aetherius.actions` / `aetherius.notify_channels`, chargée au démarrage CLI/daemon/moteur) et un
plugin d'exemple exécutable vit dans [`examples/plugins/`](../../examples/plugins/). Le contrat
d'extension est documenté dans [`docs/plugins.md`](../plugins.md). Décision actée : une action
plugin est **hors capability-table** (act-agnostique, validée dynamiquement). Ce document conserve
la spécification d'origine du jalon.

## Objectif

Ne plus réorganiser le projet à chaque nouveau besoin : ouvrir des **points d'extension propres** pour
des **actions** et des **canaux de notification** tiers, sans forker le cœur.

## Dépendances

Aucune dure, mais à faire **après B et C** pour que la surface d'actions (flux, `notify`) soit
stabilisée avant de la figer en API d'extension.

## Périmètre

**Inclus.** Activer le registre d'actions ; découverte par entry-points ; contrat d'extension
documenté ; dogfood des built-in (`notify` et ses canaux) via ces mêmes seams.
**Exclu.** Un marketplace, un chargement à chaud, une sandbox de sécurité forte (les plugins sont du
code Python de confiance installé par l'utilisateur — le documenter).

## À implémenter

- **Activer le registre** : les drivers consultent `get_handler(action)` en **repli, après** leur
  `match` intégré (built-ins rapides d'abord), avant de lever `ActionError`. Un plugin enregistre son
  handler via `@register("mon.action")`.
- **Spec des actions plugin** : un plugin fournit aussi un `ActionSpec` (voir
  [`core/actions/spec.py`](../../src/aetherius/core/actions/spec.py)) pour rester visible du
  builder/validator. Prévoir un enregistrement dynamique de specs (au-delà des `SPECS` statiques
  agrégées dans `registry.action_specs`), en gardant l'invariant « registre = source, catalogue =
  projection ».
- **Découverte par entry-points** : `importlib.metadata.entry_points` sur deux groupes —
  `aetherius.actions` et `aetherius.notify_channels` — chargés au démarrage (daemon et CLI). Un
  paquet tiers déclare ses points d'entrée dans son `pyproject.toml`.
- **Dogfood** : enregistrer les canaux built-in (`WebhookChannel`, `DiscordChannel`, …) via
  `notify.register_channel`, et éventuellement router `notify` par le registre — les built-in
  deviennent les premières « extensions ».

## Points de conception

- **Les capacités déclarées restent la source de vérité pour les Acts** ; une action plugin
  s'ajoute sans casser la bijection specs↔capabilities gardée par les tests anti-drift — décider si
  une action plugin est hors capability-table (dispatch dynamique) et l'expliciter dans la doc.
- **Isolation des pannes** : un plugin qui lève à l'import ne doit pas empêcher le démarrage ; log +
  skip, avec un message clair.
- **Confiance** : documenter que charger un plugin = exécuter son code ; pas de sandbox.

## Plan de test

- Un **paquet plugin d'exemple** minimal (dans `tests/fixtures/` ou `examples/plugins/`) exposant une
  action et un canal, découvert par entry-point, puis exécuté par un Blueprint de test.
- Isolation : un plugin défaillant est ignoré proprement (test).

## Exemple exécutable à livrer

`examples/plugins/` : un mini-plugin (action custom + canal custom) + un Blueprint qui l'utilise,
avec le `pyproject.toml` d'exemple montrant les entry-points.

## Définition de terminé

Les 6 points de [CONTRIBUTING](../../CONTRIBUTING.md#définition-de--terminé-) ; doc `docs/plugins.md`
(le contrat d'extension : comment écrire une action et un canal, déclarer les entry-points, limites) ;
`make check` vert ; extension réelle chargée et exécutée à la main.

## Critères d'acceptation

Un paquet tiers installé peut ajouter une action et un canal de notification sans modifier le cœur ;
les built-in passent par les mêmes seams ; un plugin défaillant n'empêche pas le démarrage.
