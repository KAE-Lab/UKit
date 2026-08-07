# Aetherius — documentation

Aetherius est le moteur d'automatisation web qui alimente UKit : un interprète qui joue des
fichiers d'instructions déclaratifs (les Blueprints). Sa documentation n'est pas dupliquée ici :
elle est maintenue sur son propre dépôt.

**→ https://github.com/kln-mltre/Aetherius**

| Point d'entrée | Lien |
|---|---|
| Vision, les 4 Acts, architecture du dépôt | [README.md](https://github.com/kln-mltre/Aetherius/blob/HEAD/README.md) |
| Format des Blueprints | [docs/blueprint-schema.md](https://github.com/kln-mltre/Aetherius/blob/HEAD/docs/blueprint-schema.md) |
| Moteur embarqué pour React Native | [docs/embedded.md](https://github.com/kln-mltre/Aetherius/blob/HEAD/docs/embedded.md) |
| Act I — Vector (HTTP/API) | [docs/acts/vector.md](https://github.com/kln-mltre/Aetherius/blob/HEAD/docs/acts/vector.md) |
| Act II — Continuum (navigateur) | [docs/acts/continuum.md](https://github.com/kln-mltre/Aetherius/blob/HEAD/docs/acts/continuum.md) |
| Porter un service ou une WebView en Blueprints | [docs/mobile-migration.md](https://github.com/kln-mltre/Aetherius/blob/HEAD/docs/mobile-migration.md) |
| Workflow et sondes réalistes | [CONTRIBUTING.md](https://github.com/kln-mltre/Aetherius/blob/HEAD/CONTRIBUTING.md) |

Le guide de migration a été écrit **contre nos sources** : le jalon 3-G d'Aetherius a porté six
d'entre elles en Blueprints et les a jouées sur un vrai téléphone. Ces fichiers sont le point de
départ de notre [`blueprints/`](../blueprints/README.md), et le guide dit ce qui descend dans un
Blueprint et ce qui n'y descend pas.

Un seul jalon d'Aetherius reste ouvert pour nous, et notre jalon 6-G en dépend :
[3-h-portails.md](https://github.com/kln-mltre/Aetherius/blob/HEAD/docs/phase-3/3-h-portails.md) —
autoriser un manifeste à *ajouter* un Blueprint sous un préfixe réservé, ce qui est ce qui permettra
d'ajouter le portail d'une faculté sans publier sur les stores.

Ce dossier ne contient volontairement aucune copie : la version qui vivait ici était déjà périmée
(antérieure à la Phase 3 et au moteur embarqué).

En local, les deux dépôts s'ouvrent ensemble via `aetherius-ukit.code-workspace` ; l'indexation de
l'éditeur donne accès aux fichiers d'Aetherius sans rien recopier ici.
