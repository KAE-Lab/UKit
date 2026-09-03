# La base, côté dépôt

Ce dossier porte le schéma et les politiques d'accès du projet Supabase de UKit. Ce que la base est,
ce qu'elle n'est pas, et comment on publie : [docs/backend.md](../docs/backend.md).

| Fichier | Contenu |
|---|---|
| [`schema.sql`](schema.sql) | tables, index, contraintes, **et les deux buckets** |
| [`fonctions.sql`](fonctions.sql) | les deux gardes : qui est éditeur, et le journal par déclencheurs — dans un schéma `private` que l'API n'expose pas |
| [`policies.sql`](policies.sql) | RLS : lecture publique restreinte, écriture réservée aux éditeurs authentifiés et à la clé de service |
| [`etablissements.sql`](etablissements.sql) | le catalogue des universités : une ligne par établissement, `on conflict do update` |
| [`batiments-bordeaux-inp.sql`](batiments-bordeaux-inp.sql) | les dix bâtiments de Bordeaux INP, relevés sur OpenStreetMap — la surcouche de `assets/locations.json` pour une université que le binaire n'embarque pas |

**Tout s'applique depuis ces fichiers, jamais depuis l'interface web.** Ce qui est fait à la main
n'est pas reproductible, ne se relit pas en revue, et se perd le jour où il faut recréer le projet.
C'est aussi pourquoi les buckets sont créés en SQL plutôt qu'en trois clics : un bucket créé à la
main est un bucket qu'on ne saura pas recréer.

**Les trois fichiers sont rejouables.** `create table if not exists` et `add column if not exists`
d'un côté, `create or replace function` et `drop trigger if exists` au milieu, `drop policy if
exists` avant chaque `create policy` de l'autre — Postgres n'ayant pas de `create policy if not
exists`. Un fichier qu'on ne peut appliquer qu'une fois n'est pas reproductible. Avant d'appliquer
pour de vrai, les trois se jouent **à blanc** dans une transaction annulée :

```bash
(echo 'begin;'; cat supabase/schema.sql supabase/fonctions.sql supabase/policies.sql; echo 'rollback;') \
  | psql -h "$HOTE" -U postgres -d postgres -v ON_ERROR_STOP=1 -q
```

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
3. Appliquer `schema.sql`, `fonctions.sql` puis `policies.sql`, **dans cet ordre** — les
   déclencheurs visent des tables, et les politiques appellent `private.est_editeur()` :

   ```bash
   # Le mot de passe est celui de la base (Project Settings > Database), jamais une cle d API.
   export PGPASSWORD="$SUPABASE_DB_PASSWORD"
   HOTE="db.<reference-du-projet>.supabase.co"

   psql -h "$HOTE" -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/schema.sql
   psql -h "$HOTE" -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/fonctions.sql
   psql -h "$HOTE" -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/policies.sql
   psql -h "$HOTE" -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/etablissements.sql
   psql -h "$HOTE" -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/batiments-bordeaux-inp.sql
   ```

   > **La connexion directe fonctionne depuis un poste en NAT64** — mesuré le 2026-08-10, là où les
   > *poolers* régionaux répondent `tenant/user not found` quand on se trompe de région. Essayer
   > `db.<reference>.supabase.co` d'abord coûte une seconde et évite de chercher la bonne région.

   **Les Blueprints d'un portail se publient avant la ligne de catalogue qui les nomme.** Une ligne
   qui désigne un Blueprint non publié ferait échouer le parcours d'un étudiant sur une erreur que
   personne ne sait lire — même règle que le manifeste, écrit en dernier.

   > **La connexion directe est en IPv6 seule** sur le plan gratuit. Depuis un réseau qui n'en a pas,
   > passer par le *session pooler* (`aws-0-<region>.pooler.supabase.com`, utilisateur
   > `postgres.<reference>`), qui répond en IPv4.

4. Ranger la clé `service_role` là où vivent les secrets de publication — **jamais** dans le dépôt,
   jamais dans `app.config.ts`, jamais dans un fichier versionné.
5. Migrer le contenu : `npm run content:import`
   ([`tools/import-ukit-data.mjs`](../tools/import-ukit-data.mjs)), puis publier les Blueprints :
   `npm run blueprints:publish` ([`tools/publish-blueprints.mjs`](../tools/publish-blueprints.mjs)).
   Le second est rejouable à volonté ; rejoué à vide, il ne change rien.
6. Vérifier, en le jouant plutôt qu'en le supposant : une insertion avec la clé publiable doit
   **échouer**.

   ```bash
   curl -s -X POST "$SUPABASE_URL/rest/v1/annonces" \
     -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
     -d '{"titre":"intrusion","emetteur":"anon"}'
   # attendu : {"code":"42501", ... "violates row-level security policy" ...}

   # Les testeurs : la colonne `id` seule est lisible, la table entiere ne l'est pas.
   curl -s "$SUPABASE_URL/rest/v1/testeurs?select=id" -H "apikey: $SUPABASE_ANON_KEY"   # attendu : []
   curl -s "$SUPABASE_URL/rest/v1/testeurs"           -H "apikey: $SUPABASE_ANON_KEY"   # attendu : 42501
   ```

   Et la même chose pour un compte **authentifié sans ligne dans `editeurs`** (créé par
   `node tools/console/editeur.mjs --sans-droits`) : il se connecte à la console et chaque écriture
   lui est refusée.

## La console et son compte

La [console web](../docs/pilotage.md) écrit avec un compte Supabase Auth (e-mail et mot de passe)
dont l'e-mail figure dans la table `editeurs`. Il n'y a pas d'inscription libre — elle est désactivée
dans *Authentication → Providers → Email* du projet — et pas de courriel sortant : le compte se crée
et se répare depuis le poste du publieur, avec la clé de service.

```bash
# Creer le compte et lui donner les droits. Le mot de passe vient de l'environnement, jamais d'un
# argument : il resterait sinon dans l'historique du terminal.
CONSOLE_MOT_DE_PASSE='…' node tools/console/editeur.mjs --email kylian.mltre@gmail.com

# Mot de passe oublie : le meme script le remplace.
CONSOLE_MOT_DE_PASSE='…' node tools/console/editeur.mjs --email kylian.mltre@gmail.com --mot-de-passe

# Un compte SANS droits, pour verifier que les politiques refusent bien un authentifie ordinaire.
CONSOLE_MOT_DE_PASSE='…' node tools/console/editeur.mjs --email quelqu.un@exemple.test --sans-droits
```

Révoquer un éditeur est une ligne supprimée dans `editeurs` ; son compte survit et ne peut plus rien
écrire.

## Le journal

Chaque écriture dans une table publiable — depuis la console, un script, le Studio ou `psql` — laisse
une ligne dans `journal` : la table, l'opération, la clé de la ligne, l'avant, l'après, qui, quand.
C'est un déclencheur qui l'écrit ([`fonctions.sql`](fonctions.sql)), aucun client ne peut l'éviter ni
le forger, et la console l'exporte en JSON.

Il grossit, lentement. La purge est écrite ici et **n'est pas automatisée** — ce qui s'efface tout
seul ne se relit pas :

```sql
delete from public.journal where quand < now() - interval '1 year';
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

## Publier un visuel

La table `visuels` remplace la photo d'un contenu servi par une **source tierce** — un restaurant
CROUS, une bibliothèque, un bâtiment, une annonce. Elle n'a aucun socle embarqué : sans ligne, la
photo reste celle de la source, exactement comme avant qu'elle n'existe.

1. Téléverser l'image dans le bucket `media`, sous `restaurants/`, `bibliotheques/`, `batiments/` ou
   `annonces/`, et copier son URL publique.
2. Écrire la ligne. La clé est l'identifiant du contenu **chez sa source**, et elle ne se devine pas
   de la même façon selon le domaine :

| Domaine | La clé | Où la lire |
|---|---|---|
| `crous` | le code Croustillant | dans l'URL de l'image actuelle du restaurant : `.../restaurants/**21**/preview` |
| `batiment` | le code du bâtiment | tel qu'il s'affiche : `A28` |
| `annonce` | l'`id` de la ligne | `select id, titre from public.annonces;` |
| `bibliotheque` | l'identifiant Affluences (un UUID) | **pas dans l'URL de l'image**, qui porte un hachage sans rapport — voir la commande ci-dessous |

```bash
# Les bibliothèques autour d'un point de balayage, avec leur identifiant.
curl -s -X POST https://api.affluences.com/app/v3/sites/map \
  -H 'Content-Type: application/json' -H 'Accept-Language: fr' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' \
  -d '{"latitude":44.7963,"longitude":-0.6277}' \
| python3 -c "import json,sys; [print(s['id'], s['primary_name']) for s in json.load(sys.stdin)['data']['results'] if any(c['id'] in (1,20) for c in s['categories'])]"
```

```sql
insert into public.visuels (domaine, cle, image_url)
values ('crous', '21', 'https://<projet>.supabase.co/storage/v1/object/public/media/restaurants/amazone.jpg')
on conflict (domaine, cle) do update set image_url = excluded.image_url, maj_le = now();
```

Trois écritures, trois effets à ne pas confondre :

| Ce qu'on écrit | Ce que l'appareil fait |
|---|---|
| une URL | elle remplace la photo de la source, pour tout le monde |
| la chaîne vide `''` | aucune image : l'écran reprend son visuel de repli embarqué |
| `delete from public.visuels …` | la photo de la source revient |

Le changement arrive au **prochain retour au premier plan**, sans release et sans redémarrage. Le
domaine est contraint par un `check` : une faute de frappe serait sinon une ligne parfaitement valide
qui ne corrige rien, et rien à l'écran ne le dirait.

## Ce qui n'a pas sa place ici

Pas de fonction métier, pas de vue qui calcule. La base porte de la donnée ; ce qui se calcule se
calcule dans l'application, où c'est typé, relu et vérifié.

Elle porte **deux gardes**, depuis le jalon [6.1-B](../docs/phase-6/6-1-b-pilotage-a-distance.md), et
la phrase ci-dessus tient toujours : `private.est_editeur()` dit qui a le droit d'écrire, et le
déclencheur `journal` trace ce qui a été écrit. Ce sont des politiques d'accès exprimées en SQL —
aucune des deux ne décide de ce que l'application affiche. Une troisième fonction qui calculerait
quelque chose pour l'écran serait la première entorse, et elle se refuse.


## La colonne du jalon 6-J

`etablissements.crous_region` porte la région CROUS de Croustillant, qui était une `vars` du Blueprint
`ukit.campus.restaurants`. La valeur ne change pas — le périmètre du produit est le secteur bordelais
([README](../README.md)), donc `1` — mais sa **nature** si : elle se corrige désormais sans release, et
un établissement qui ne la déclare pas ne se voit **pas** servir les restaurants d'une autre ville, la
section disparaît.

Le même jalon ajoute une ligne qui n'est pas une université : **`autre`**, « Mon université n'est pas
dans la liste ». Elle ne déclare aucun portail et aucun serveur d'emploi du temps, seulement
`edt.abonnement` — l'étudiant colle le lien que sa fac lui donne, et un Blueprint unique et embarqué le
joue. Ses trois colonnes de campus (région CROUS, points de balayage, salles libres empruntées) sont
celles de l'Université de Bordeaux, ce qui est **exact tant que le périmètre du produit est
bordelais** ; le jour où il ne l'est plus, ces colonnes existent déjà pour porter la vérité.

`salles` y vaut `{"reconnaissance": false}` : on ne connaît pas le format de ses libellés de salle, et
appliquer celui de Bordeaux capturerait un code qui existe chez nous (`A28` est le CREMI) pour afficher
le mauvais bâtiment. *Une carte fausse est pire qu'une carte vide.*
