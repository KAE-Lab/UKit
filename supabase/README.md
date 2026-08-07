# La base, côté dépôt

Ce dossier porte le schéma et les politiques d'accès du projet Supabase de UKit. Ce que la base est,
ce qu'elle n'est pas, et comment on publie : [docs/backend.md](../docs/backend.md).

| Fichier | Contenu |
|---|---|
| [`schema.sql`](schema.sql) | tables, index, contraintes |
| [`policies.sql`](policies.sql) | RLS : lecture publique restreinte, écriture réservée |

**Tout s'applique depuis ces fichiers, jamais depuis l'interface web.** Ce qui est fait à la main
n'est pas reproductible, ne se relit pas en revue, et se perd le jour où il faut recréer le projet.

## Créer le projet

> Jalon [6-B](../docs/phase-6/6-b-supabase.md). Cette section est la procédure attendue ; elle sera
> complétée des valeurs réelles au moment de la création.

1. Créer le projet (plan gratuit, région européenne — les utilisateurs sont en France).
2. Appliquer `schema.sql` puis `policies.sql`, dans cet ordre.
3. Créer les deux buckets, en lecture publique : `blueprints`, `media`.
4. Relever l'URL du projet et la clé `anon`, les poser dans `.env` puis dans les secrets EAS.
5. Ranger la clé `service_role` là où vivent les secrets de publication — **jamais** dans le dépôt,
   jamais dans `app.config.ts`, jamais dans un fichier versionné.
6. Vérifier, en le jouant : une insertion avec la clé `anon` doit **échouer**.

## Migrations

Le schéma évolue par fichiers versionnés, appliqués dans l'ordre, nommés
`NNN-description.sql` (`001-annonces-ordre.sql`).

Une règle qui n'a l'air de rien : **ajouter avant de retirer, toujours.** Le parc d'applications
installées ne se vide pas d'un coup — une colonne supprimée trop tôt casse des installations qu'on
n'a pas comptées, et elles ne peuvent pas se mettre à jour toutes seules.

## Ce qui n'a pas sa place ici

Pas de fonction métier, pas de déclencheur, pas de vue qui calcule. La base porte de la donnée ; ce
qui se calcule se calcule dans l'application, où c'est typé, relu et vérifié.
