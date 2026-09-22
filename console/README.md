# La console de pilotage

Publier sans requête SQL, avec un compte, en laissant une trace : annonces, messages de service,
testeurs, visuels, établissements, salutations, bâtiments, version publiée — et lire l'état des
sources, le journal, **les retours du formulaire** et, depuis le jalon
[7-E](../docs/phase-7/7-e-console-socle.md), un **tableau de bord** d'arrivée : le parc actif, les
sources, les retours ouverts, les annonces actives et programmées. Depuis
[7-F](../docs/phase-7/7-f-console-annonces.md), **une annonce se compose en voyant ce qu'elle
donnera sur un téléphone** : l'aperçu de la carte et de la fiche dans les deux thèmes, le point focal
choisi sur l'image, la galerie réordonnée, et un panneau « ordre du carrousel » qui rend l'ordre
qu'un téléphone montre à l'heure dite. Ce qu'elle est et ce qu'elle n'est pas :
[docs/pilotage.md](../docs/pilotage.md).

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
se connecte, lit ce que la console montre, voit **« Lecture seule »** en tête de chaque page qui
écrit, et ses boutons d'écriture désactivés.

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
Pages à chaque poussée sur `main` qui touche `console/`, à l'adresse
`https://kae-lab.github.io/UKit/`. À activer une fois à la main : *Settings → Pages → Source :
GitHub Actions*, et les deux **variables** de dépôt `SUPABASE_URL` et `SUPABASE_ANON_KEY` (*Settings
→ Secrets and variables → Actions → Variables*). Ce sont des valeurs publiques ; la clé de service ne
va nulle part ici.

## Comment elle est faite

Vite, React, `@supabase/supabase-js`, et — depuis 7-E — un socle standard, chaque bibliothèque pour
un problème que la console avait :

| Bibliothèque | Ce qu'elle porte |
|---|---|
| **TanStack Query** | toute lecture et toute écriture ([`src/requetes/`](src/requetes/)) : les états de chargement et d'erreur, le cache, l'invalidation d'une table et du journal après une écriture |
| **TanStack Table v9** | les listes, en **mode serveur** : l'état (tri, filtres, recherche, page) est traduit en requête — `.order`, `.eq`, `.in`, `.or(ilike)`, `.range` avec `count: 'exact'` — par un module pur ([`src/lib/requete.ts`](src/lib/requete.ts)) ; la base trie et pagine, jamais le navigateur |
| **react-hook-form** et **zod** | l'état et la validation des formulaires : le schéma se **dérive du descripteur** ([`src/schema/schemas.ts`](src/schema/schemas.ts)) — le vide qui devient nul sauf là où il est une valeur, une date locale qui redevient UTC, une version ou un JSON hors forme qui ne partent pas, une valeur hors liste qui ne repart pas en nommant ce qu'il faut corriger |
| **Base UI** | les primitives sans style : le dialogue de confirmation, le menu de navigation sous 800 px |
| **lucide-react** | la seule famille d'icônes |
| **browser-image-compression** et **blurhash** | le pipeline de téléversement : réduction et re-encodage en WebP dans le navigateur, un nom d'objet unique, un cache d'un an, le placeholder ([`src/lib/televerser.ts`](src/lib/televerser.ts)) |
| **@dnd-kit** | la galerie d'une annonce réordonnée par glisser-déposer, à la souris comme au clavier (7-F) |
| **@mdi/font** | la police MaterialCommunityIcons de l'application, à la même version (7.4.47), pour les têtes de section de l'aperçu — chargée avec l'aperçu, jamais avant |
| **react-error-boundary** | une erreur de rendu ne laisse jamais une page blanche |

**La règle transverse** : un chargement ou une erreur ne déplace jamais la mise en page. Une liste qui
charge montre des lignes squelettes à la hauteur des lignes attendues, une erreur prend leur place avec
« Réessayer », un bouton en attente garde sa largeur, un encart a sa place réservée sous l'en-tête, et
la coque paraît dès la vérification de session. La CSS est maison, structurée en **tokens** nommés
comme ceux de l'application ([`src/styles/tokens.css`](src/styles/tokens.css)), avec un focus visible
partout.

**Le descripteur par table** reste l'idée directrice ([`src/schema/tables/`](src/schema/tables/)) : les
colonnes, leur type de saisie, la clé, celles qui se filtrent, se cherchent et se trient, le ciblage
par campus, les avertissements qu'il faut lire avant d'écrire, les actions hors écriture (« Notifier »).
Un test de cohérence vérifie que chaque nom cité désigne un champ réel. La liste et le formulaire sont
génériques ; les pages qui méritent mieux ont la leur — le tableau de bord, les retours (compteurs par
état, nature, campus et semaine ; les réponses question par question), le journal, les sources — ou
la **complètent** : les annonces ([`src/pages/Annonces/`](src/pages/Annonces/)) ajoutent à la page
générique un aperçu à côté du formulaire, un encart au-dessus d'une ligne en audience « testeurs »,
et le panneau d'ordre. Le formulaire range ses champs par **groupe**, tient ses actions inertes tant
qu'une saisie n'est pas enregistrée, et suit la ligne qu'une action rend (la copie de « Dupliquer »).

**L'aperçu d'une annonce** ([`src/pages/Annonces/apercu/`](src/pages/Annonces/apercu/)) dessine la
carte v2 — celle que la 6.3 rend — et la fiche avec les modules **purs partagés avec l'application**,
importés par chemin relatif : la grammaire de la description
([`src/shared/annonces/grammaire.ts`](../src/shared/annonces/grammaire.ts)), l'ordre
([`ordre.ts`](../src/shared/annonces/ordre.ts)), le ciblage, les adresses de rendu, les tokens et
les palettes du thème. Vite remonte à la racine du dépôt pour les servir (`server.fs.allow`), et la
console les compile en `strict` : ce que la console importe de l'application doit être pur **et**
strict.

**L'URL porte l'état** : `#/annonces/<clé>` ouvre une ligne, `#/annonces/nouveau` une ligne neuve,
`#/annonces?q=…&page=2&tri=titre.desc&f.audience=testeurs` retient la recherche, la page, le tri et
les filtres ([`src/routeur.ts`](src/routeur.ts)). Le **filtre global par campus** de la barre se
retient sur le poste (`localStorage`) et s'applique à ce qui porte un code : annonces, messages,
jetons push.

**Une seule politique de reprise**, celle de TanStack Query (une fois, après une seconde) : celle de
`postgrest-js` est coupée (`db.retry: false`), sans quoi une base coupée mettait quinze secondes à se
dire.

ESLint de la racine s'applique à `console/src` (mêmes règles, une seule commande) ; le
`tsconfig.json` de la racine exclut `console/`, qui a le sien — et celui-ci exclut les fichiers de
test, qui importent `vitest` depuis la racine : c'est le `npm test` de la racine qui les joue, et
l'intégration continue installe la console dans le même job pour que ses modules purs trouvent leurs
dépendances. Les modules purs et testés : la traduction des erreurs, la requête d'une liste, l'état
d'une liste dans l'URL, les schémas, la cohérence des descripteurs, les tables journalisées, le nom
d'objet unique, les dimensions de compression, les compteurs des retours, le parc actif et l'état des
annonces — et, depuis 7-F, les schémas des saisies structurées (focale, créneaux, galerie,
partenaire), leurs résumés, l'état d'une annonce et sa phrase de programmation, le modèle de
l'aperçu, l'ordre vu à une heure, l'insertion d'un marqueur, le pas du clavier sur la focale, le
bilan d'un lot d'images.

## Vérifier

La recette du jalon 7-E s'est jouée sur la console locale par un navigateur piloté (Playwright, dans
les deux thèmes, avec deux comptes jetables créés par `console:editeur`), puis sur la console
déployée : les états réseau, le compte sans droits, les listes, la valeur inconnue, le téléversement,
le clavier. Le détail et les mesures sont dans la
[spécification](../docs/phase-7/7-e-console-socle.md#plan-de-test) ; les captures dans
[`docs/screenshots/console/`](../docs/screenshots/console/). La recette du jalon 7-F s'est jouée de
la même façon : trente-trois points sur l'éditeur, la focale, la galerie, la programmation, les gestes
et le panneau d'ordre ([spécification](../docs/phase-7/7-f-console-annonces.md#plan-de-test)) ; ce
qui touche le téléphone se joue en audience « testeurs » sur les deux appareils.
