# La base, côté dépôt

Ce dossier porte le schéma et les politiques d'accès du projet Supabase de UKit. Ce que la base est,
ce qu'elle n'est pas, et comment on publie : [docs/backend.md](../docs/backend.md).

| Fichier | Contenu |
|---|---|
| [`schema.sql`](schema.sql) | tables, index, contraintes, **et les deux buckets** |
| [`policies.sql`](policies.sql) | RLS : lecture publique restreinte, écriture réservée |

**Tout s'applique depuis ces fichiers, jamais depuis l'interface web.** Ce qui est fait à la main
n'est pas reproductible, ne se relit pas en revue, et se perd le jour où il faut recréer le projet.
C'est aussi pourquoi les buckets sont créés en SQL plutôt qu'en trois clics : un bucket créé à la
main est un bucket qu'on ne saura pas recréer.

**Les deux fichiers sont rejouables.** `create table if not exists` d'un côté, `drop policy if
exists` avant chaque `create policy` de l'autre — Postgres n'ayant pas de `create policy if not
exists`. Un fichier qu'on ne peut appliquer qu'une fois n'est pas reproductible.

## Créer le projet

Joué au jalon [6-B](../docs/phase-6/6-b-supabase.md), le 2026-08-08. Le projet est en région
européenne — les utilisateurs sont en France.

1. Créer le projet (plan gratuit, région européenne).
2. Relever l'URL du projet et la clé publiable, les poser dans `.env` (`SUPABASE_URL`,
   `SUPABASE_ANON_KEY`) puis dans les variables EAS, sur les trois environnements :

   ```bash
   npx eas-cli env:set --scope project --name SUPABASE_URL --value "$SUPABASE_URL" \
     --visibility plaintext \
     --environment production --environment preview --environment development
   # puis la meme chose pour SUPABASE_ANON_KEY
   ```

   `plaintext` est volontaire : la clé publiable est publique par conception, et la ranger en secret
   contredirait ce que dit [backend.md](../docs/backend.md). `eas secret:create`, qu'on trouve encore
   dans d'anciennes documentations, est **déprécié** au profit de `eas env:set`.
3. Appliquer `schema.sql` puis `policies.sql`, **dans cet ordre** — les politiques référencent les
   tables :

   ```bash
   # Le mot de passe est celui de la base (Project Settings > Database), jamais une cle d API.
   export PGPASSWORD="$SUPABASE_DB_PASSWORD"
   HOTE="db.<reference-du-projet>.supabase.co"

   psql -h "$HOTE" -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/schema.sql
   psql -h "$HOTE" -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/policies.sql
   ```

   > **La connexion directe est en IPv6 seule** sur le plan gratuit. Depuis un réseau qui n'en a pas,
   > passer par le *session pooler* (`aws-0-<region>.pooler.supabase.com`, utilisateur
   > `postgres.<reference>`), qui répond en IPv4.

4. Ranger la clé `service_role` là où vivent les secrets de publication — **jamais** dans le dépôt,
   jamais dans `app.config.ts`, jamais dans un fichier versionné.
5. Migrer le contenu : `npm run content:import`
   ([`tools/import-ukit-data.mjs`](../tools/import-ukit-data.mjs)).
6. Vérifier, en le jouant plutôt qu'en le supposant : une insertion avec la clé publiable doit
   **échouer**.

   ```bash
   curl -s -X POST "$SUPABASE_URL/rest/v1/annonces" \
     -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
     -d '{"titre":"intrusion","emetteur":"anon"}'
   # attendu : {"code":"42501", ... "violates row-level security policy" ...}
   ```

## Migrations

Le schéma évolue par fichiers versionnés, appliqués dans l'ordre, nommés
`NNN-description.sql` (`001-annonces-ordre.sql`).

Une règle qui n'a l'air de rien : **ajouter avant de retirer, toujours.** Le parc d'applications
installées ne se vide pas d'un coup — une colonne supprimée trop tôt casse des installations qu'on
n'a pas comptées, et elles ne peuvent pas se mettre à jour toutes seules.

Les types applicatifs ([`src/shared/supabase/types.ts`](../src/shared/supabase/types.ts)) sont écrits
à la main et relus dans le même commit que le schéma. Pour vérifier ponctuellement qu'ils sont
toujours d'accord avec la base, sans ajouter la CLI Supabase aux dépendances du projet :

```bash
npx --yes supabase gen types typescript --db-url "postgresql://postgres:$SUPABASE_DB_PASSWORD@$HOTE:5432/postgres"
```

## Ce qui n'a pas sa place ici

Pas de fonction métier, pas de déclencheur, pas de vue qui calcule. La base porte de la donnée ; ce
qui se calcule se calcule dans l'application, où c'est typé, relu et vérifié.
