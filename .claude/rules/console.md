---
paths:
  - "console/**"
  - "tools/console/**"
  - "supabase/functions/**"
  - ".github/workflows/console.yml"
---
# Console de pilotage

Page statique React (Vite) déployée sur GitHub Pages depuis `main` à chaque poussée touchant `console/`, avec la seule clé publiable (variables de dépôt `SUPABASE_URL`, `SUPABASE_ANON_KEY`).

- Les droits vivent dans la base (politiques) ; `auth/droits.ts` n'en est qu'une copie pour LE DIRE avant d'essayer. Ne rien protéger par l'interface : la clé publiable est publique. Les Blueprints ne s'éditent jamais depuis la console (versionnés, validés, rejoués par la parité).
- Un descripteur par table pilote liste, formulaire (zod dérivé) et test de cohérence : une table = un descripteur, pas une page. Listes en mode serveur (`.order/.eq/.ilike/.range`, `count:'exact'` à revoir au-delà de quelques dizaines de milliers de lignes), l'état dans l'URL, jamais tout charger (le plafond de lignes de l'API tronque en silence).
- Un chargement ou une erreur ne déplace jamais la mise en page : squelette à hauteur de ligne, erreur à la place du contenu, place réservée, bouton à largeur fixe.
- Une seule politique de reprise : TanStack Query (`retry: 1`) ; client Supabase avec `db: { retry: false }` (sinon une base coupée se dit après 15 s).
- Filtre global par campus : seulement ce qui porte un code (annonces, messages, jetons) ; pas `retours.campus` (le campus demandé, pas celui de l'auteur) ni `batiments.campus` (un libellé).
- Verrou d'écrasement : annonces et messages seulement, posé sur la version chargée par le formulaire (pas la dernière relecture) ; une écriture qui ne touche aucune ligne se relit pour dire devancée, supprimée ou refusée (la politique filtre sans lever).
- Une recette ne publie qu'en audience `testeurs` (trois recettes en `tous` ont exposé des annonces au parc pendant environ une minute) ; les changements d'audience se font sur un brouillon. Pas de courriel sortant (2 par heure côté Supabase) : pas d'invitation par lien ni de mot de passe oublié, mot de passe provisoire montré une fois.
- Modules partagés avec l'app (`src/shared/annonces/*`, ciblage, rendu, tokens) : importés par chemin relatif, purs ET compilables en `strict` + `noUncheckedIndexedAccess` (la console est en `strict`, la racine non) ; `vite.config.ts` désigne son `tsconfig` et `server.fs.allow`. Aucun import React Native.
- Téléversement par le pipeline de la console (compression navigateur WebP q75, nom unique `<dossier>/<id>-<slug>.webp`, `cacheControl` 31536000, échec de compression : original envoyé). Les tables de largeur (1080 affiche, 1200 photo, 400 logo partenaire) de `compression.ts` et de `tools/media/plan.mjs` changent ensemble.
- `tools/console/editeur.mjs` ne répare qu'un compte admin, mot de passe par l'environnement, jamais en argument. Une action qui change la ligne (Notifier) rend la ligne relue.
- Guide de l'équipe (non technique) : `docs/guide-console.md`, à ne pas charger pour du code.
