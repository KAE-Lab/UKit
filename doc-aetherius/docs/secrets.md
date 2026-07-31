# Secrets

Un Blueprint ne stocke **jamais** de valeur de secret, seulement son nom (`secrets: ["cas_pass"]`).
La valeur est fournie au runtime et référencée par interpolation (`{{ secrets.cas_pass }}`). Résolution
dans [`config/secrets.py`](../src/aetherius/config/secrets.py), appelée par le moteur pour chaque run.

## Résolution

Pour chaque secret déclaré, par ordre de priorité :

1. une valeur passée explicitement à l'appel (`Aetherius().run(..., secrets=...)`, `--secret k=v`,
   ou le formulaire de la Console) ;
2. la variable d'environnement `AETHERIUS_SECRET_<NOM>` (le nom du secret, en majuscules — ex.
   `cas_pass` → `AETHERIUS_SECRET_CAS_PASS`).

Un fichier **`.env`** à la racine du dépôt est chargé automatiquement dans l'environnement
(python-dotenv, `override=False` — les variables déjà présentes gagnent, donc la CI et la production
restent maîtres). Un secret jamais résolu est simplement omis ; le moteur de templates lève une
erreur claire si un step le référence réellement.

## Fichier `.env`

`.env` est **git-ignoré** et ne doit jamais être commité. [`.env.example`](../.env.example) est le
gabarit versionné : le copier et remplir les valeurs.

```bash
cp .env.example .env      # puis remplir AETHERIUS_SECRET_*
```

Entourer de guillemets simples les valeurs contenant `#`, `!`, `$` ou des espaces. Lancer les runs
depuis la racine du dépôt pour que `.env` soit trouvé (sinon exporter les variables, ou passer
`--secret`).

Le `.env` peut aussi porter des **clés du moteur** — variables sans préfixe `AETHERIUS_SECRET_*`,
jamais référencées dans un Blueprint. Cas actuel : `ANTHROPIC_API_KEY` pour le fournisseur de
cognition Claude (Acts III/IV), voir [docs/cognition.md](cognition.md).

## Console

Dans l'écran Runs, un secret déjà résolvable depuis l'environnement est affiché « loaded from .env »
et peut être laissé vide ; une valeur saisie l'emporte. Le formulaire masque toujours les secrets.

## Règle de contribution

Ne jamais committer d'identifiants réels ni les inscrire dans un Blueprint, un test, une fixture ou
un log. Les creds de test vivent dans `.env` (local) ; le dépôt ne contient que `.env.example` avec
des valeurs factices.
