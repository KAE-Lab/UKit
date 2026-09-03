# La console de pilotage

Publier sans requête SQL, avec un compte, en laissant une trace : annonces, messages de service,
testeurs, visuels, établissements, salutations, bâtiments, version publiée — et lire l'état des
sources et le journal. Ce qu'elle est et ce qu'elle n'est pas : [docs/pilotage.md](../docs/pilotage.md).

**Les Blueprints n'y sont pas**, et c'est une décision : ils se versionnent dans le dépôt, se
valident avec le moteur, se rejouent par la parité et se publient par `npm run blueprints:publish`.
Une console qui les éditerait à la main détruirait ces garanties.

## Lancer

Depuis la racine du dépôt, avec `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans le `.env` (les mêmes que
l'application) :

```bash
npm --prefix console install     # une fois
npm run console:dev              # http://localhost:5173/UKit/
npm run console:build            # construit console/dist (typage compris)
```

La console n'embarque que la clé publiable, publique par conception. Ce qui lui permet d'écrire est
la **session** d'un compte dont l'e-mail figure dans la table `editeurs` ; un compte qui n'y est pas
se connecte, lit, et voit chaque écriture refusée — la page Compte le dit.

## Le compte

Pas d'inscription (désactivée dans le projet : *Authentication → Providers → Email → Allow new users
to sign up*, à décocher une fois) et pas de courriel sortant. Le compte se crée et se répare depuis
le poste du publieur, avec la clé de service :

```bash
CONSOLE_MOT_DE_PASSE='…' npm run console:editeur -- --email kylian.mltre@gmail.com
CONSOLE_MOT_DE_PASSE='…' npm run console:editeur -- --email … --mot-de-passe   # mot de passe oublié
CONSOLE_MOT_DE_PASSE='…' npm run console:editeur -- --email … --sans-droits    # pour vérifier le refus
```

Changer son mot de passe se fait ensuite dans la console, page Compte.

## Déployer

[`.github/workflows/console.yml`](../.github/workflows/console.yml) construit et déploie sur GitHub
Pages à chaque poussée sur `master` qui touche `console/`, à l'adresse
`https://kae-lab.github.io/UKit/`. À activer une fois à la main : *Settings → Pages → Source :
GitHub Actions*, et les deux **variables** de dépôt `SUPABASE_URL` et `SUPABASE_ANON_KEY` (*Settings
→ Secrets and variables → Actions → Variables*). Ce sont des valeurs publiques ; la clé de service ne
va nulle part ici.

## Comment elle est faite

Vite, React, `@supabase/supabase-js`, et rien d'autre. Un routeur par fragment d'URL (`#/annonces`,
vingt lignes), une **liste et un formulaire génériques** pilotés par un descripteur par table
([`src/schema/tables.ts`](src/schema/tables.ts)) : les colonnes, leur type de saisie, la clé, les
avertissements qu'il faut lire avant d'écrire. Les conversions entre la saisie et la ligne sont pures
et testées par le `npm test` de la racine ([`src/schema/conversion.ts`](src/schema/conversion.ts)),
comme la règle des visuels — remplacer une image bumpe `?v=N` dans son adresse
([`src/lib/versionnerUrl.ts`](src/lib/versionnerUrl.ts)) — et la clé proposée d'un message.

ESLint de la racine s'applique à `console/src` (mêmes règles, une seule commande) ; le
`tsconfig.json` de la racine exclut `console/`, qui a le sien — et celui-ci exclut les fichiers de
test, qui importent `vitest` depuis la racine : en intégration continue, seule la console est
installée, et c'est le `npm test` de la racine qui les joue.
