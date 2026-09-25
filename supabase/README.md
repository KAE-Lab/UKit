# La base, côté dépôt

Ce dossier porte le schéma et les politiques d'accès du projet Supabase de UKit. Ce que la base est,
ce qu'elle n'est pas, et comment on publie : [docs/backend.md](../docs/backend.md).

| Fichier | Contenu |
|---|---|
| [`schema.sql`](schema.sql) | tables, index, contraintes, **et les deux buckets** |
| [`fonctions.sql`](fonctions.sql) | les gardes : qui est éditeur, et depuis 7-H qui peut quoi et où ; le journal par déclencheurs ; la version d'une ligne contre l'écrasement ; la porte de l'adresse d'un retour — dans un schéma `private` que l'API n'expose pas, sauf cette porte |
| [`policies.sql`](policies.sql) | RLS : lecture publique restreinte, écriture selon le rôle de l'éditeur authentifié (7-H) et par la clé de service |
| [`functions/`](functions/) | les deux fonctions de la base : `notifier` (un message en notification push) et `editeurs` (l'équipe : inviter, mot de passe provisoire, révoquer), et ce qu'elles partagent (`_shared/`) |
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
   Le second est rejouable à volonté ; rejoué à vide, il ne change rien. Les retours du formulaire
   s'importent par `npm run retours:import` ([docs/pilotage.md](../docs/pilotage.md#les-retours)),
   rejouable de la même façon.
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

## La console et son équipe

La [console web](../docs/pilotage.md) écrit avec un compte Supabase Auth (e-mail et mot de passe)
dont l'e-mail figure dans la table `editeurs`, **selon le rôle que la table lui donne** depuis le jalon
[7-H](../docs/phase-7/7-h-console-roles.md) : `admin`, `redacteur` — borné ou non à des campus — ou
`lecteur`. Il n'y a pas d'inscription libre — elle est désactivée dans *Authentication → Providers →
Email* du projet — et pas de courriel sortant tant que le projet n'a pas de serveur d'envoi à lui.

**Un compte naît dans la console.** Un admin l'invite depuis la page Équipe : la fonction `editeurs`
écrit la ligne avec la session de l'admin — le journal porte son nom —, puis crée le compte avec un
**mot de passe provisoire** qu'elle ne rend qu'une fois, à transmettre de vive voix ; la console exige
de le changer à la première connexion. La même page change un rôle ou des campus, donne un nouveau mot
de passe provisoire à qui a oublié le sien, et **révoque** : la ligne supprimée, les droits sont coupés
à la requête suivante, puis le compte est supprimé. La base garde toujours au moins un admin
([`fonctions.sql`](fonctions.sql)).

L'authentification du projet impose **douze caractères** et **refuse un mot de passe connu des
fuites** (vérification *HaveIBeenPwned* du plan Pro), réglés le 2026-09-25 par l'API de gestion ;
l'inscription reste fermée, la confirmation d'un changement d'adresse reste double.

**Le script du poste reste**, pour le jour où plus aucun admin ne peut se connecter : il ne connaît que
le rôle d'admin, et le pose.

```bash
# Creer un compte admin, ou rendre le role d'admin a un compte retrograde. Le mot de passe vient de
# l'environnement, jamais d'un argument : il resterait sinon dans l'historique du terminal.
CONSOLE_MOT_DE_PASSE='…' node tools/console/editeur.mjs --email kylian.mltre@gmail.com

# Mot de passe oublie par le dernier admin : le meme script le remplace.
CONSOLE_MOT_DE_PASSE='…' node tools/console/editeur.mjs --email kylian.mltre@gmail.com --mot-de-passe

# Un compte SANS droits, pour verifier que les politiques refusent bien un authentifie ordinaire.
CONSOLE_MOT_DE_PASSE='…' node tools/console/editeur.mjs --email quelqu.un@exemple.test --sans-droits
```

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

## Effacer un retour

La table `retours` porte ce que les utilisateurs écrivent dans le formulaire, et parfois une adresse
laissée volontairement ([PRIVACY.md](../PRIVACY.md), point 5 bis). Depuis le jalon 7-H, l'adresse ne
vit que dans la colonne `contact`, que seul un admin lit : `reponses` ne porte plus la question qui la
demande, et les lignes du journal qui copient un retour ne se lisent que par un admin. Une demande
d'effacement se traite quand même en trois endroits, parce que le journal copie la ligne entière — et
la suppression elle-même en laisse une trace, avec l'avant :

```sql
delete from public.retours where id = '<id>';
delete from public.journal where table_name = 'retours' and ligne_id = '<id>';
```

Puis la réponse dans la feuille Google, à la main — sinon l'import suivant la ramène. Retirer la
seule adresse ne se fait pas en retouchant la cellule : la clé d'un retour est l'empreinte de ses
cellules, adresse comprise, et la réponse reviendrait sous une autre clé. Effacer, donc, plutôt que
retoucher.

## Migrations

Depuis le jalon [7-C](../docs/phase-7/7-c-economie-et-socle.md#5-le-socle-du-dépôt), le schéma évolue
par les **migrations numérotées** du CLI de Supabase, par `npx --yes supabase@2.117.0` — jamais en
dépendance du projet. **La source de vérité est [`migrations/`](migrations/)** : c'est le registre de
ce que la production porte, et la base le prouve par sa table d'historique
(`supabase_migrations.schema_migrations`). `schema.sql`, `fonctions.sql` et `policies.sql` restent la
**vue lisible** de l'état, mise à jour dans le même commit que chaque migration ; `etablissements.sql`
reste un fichier de **donnée**, rejoué par `psql` après la migration qui crée ses colonnes.

La **ligne de base**, `20260914000000_ligne_de_base.sql`, est la concaténation commentée des trois
fichiers, **marquée appliquée sans être jouée** le 2026-09-17 — la base la portait déjà :

```bash
set -a && source .env && set +a           # SUPABASE_ACCESS_TOKEN et SUPABASE_DB_PASSWORD
REF=owiksddeqcyyifnmpyqm
npx --yes supabase@2.117.0 migration repair --status applied 20260914000000 --project-ref $REF -p "$SUPABASE_DB_PASSWORD"
npx --yes supabase@2.117.0 migration list --project-ref $REF -p "$SUPABASE_DB_PASSWORD"
```

Ensuite, à chaque évolution :

```bash
npx --yes supabase@2.117.0 migration new <nom>            # supabase/migrations/<horodatage>_<nom>.sql, a remplir
npx --yes supabase@2.117.0 db push --project-ref $REF --dry-run -p "$SUPABASE_DB_PASSWORD"   # ce qui partirait
npx --yes supabase@2.117.0 db push --project-ref $REF -p "$SUPABASE_DB_PASSWORD"             # chaque migration dans sa transaction
psql -h aws-0-eu-west-2.pooler.supabase.com -p 5432 -U postgres.$REF -d postgres -v ON_ERROR_STOP=1 -f supabase/etablissements.sql   # si des valeurs de catalogue suivent
```

Ce qui a été mesuré en le faisant :

- `--project-ref` et non `--linked` : le lien posé en septembre (`supabase/.temp/linked-project.json`)
  n'est plus la forme que le CLI attend (`LegacyProjectNotLinkedError : Cannot find project ref`), et
  la référence vaut mieux qu'un `supabase link` de plus ;
- le CLI joint la base par le *session pooler*, donc en IPv4 ; `psql`, lui, doit viser le pooler de la
  **région du projet, `eu-west-2`**, depuis un poste sans IPv6 (la connexion directe
  `db.<référence>.supabase.co` n'a qu'une adresse IPv6) ;
- `db pull` et `db diff` passent par un conteneur Docker ; le dépôt n'en dépend pas, et la ligne de
  base n'en a pas eu besoin, les trois fichiers étant déjà rejouables ;
- une migration ne s'écrit **jamais** avec un `update` que `schema.sql` recopierait : la migration
  d'`annonces` pose `ajustement` avec le défaut `contenir` puis change le défaut, au lieu de mettre à
  jour les lignes — rien à journaliser, et la vue lisible ne porte que le défaut final. Un nettoyage de
  donnée qui accompagne un changement de droits, lui, y a sa place, et `schema.sql` ne le recopie pas :
  la migration des rôles retire l'adresse de `reponses` dans la même transaction que les privilèges
  qui la ferment (7-H) ;
- **une migration s'essaie sur la production elle-même, dans une transaction annulée**, avant
  `--dry-run` : `begin`, la migration, puis chaque cas du plan de test joué comme un compte le jouerait
  — `set local role authenticated` et `request.jwt.claims` posés à la main —, puis `rollback`. C'est
  ainsi que les politiques de 7-H ont été éprouvées, cinquante-six cas, avant d'être poussées ; et
  l'état obtenu par les migrations s'est comparé à celui des trois fichiers de la vue lisible, rejoués
  de la même façon — une empreinte des politiques, des privilèges, des contraintes, des déclencheurs et
  des fonctions, identique des deux côtés.

**Deux branches, une base.** Une publication se prépare sur sa branche de version (`v6.3`) pendant que
la console vit sur `main`, et toutes deux migrent la même base. Quand la production porte une migration
que la branche courante n'a pas encore — `mesures`, de `v6.3`, vue depuis `main` le 2026-09-25 —,
`db push` refuse, puisque l'historique distant n'est pas un préfixe du local. On ne répare pas
l'historique : on pousse depuis un dossier de travail temporaire qui porte l'**union** des migrations,
celles de la branche plus celles que la production porte déjà, et le CLI n'applique que les nouvelles.

```bash
TMP=$(mktemp -d) && mkdir -p $TMP/supabase/migrations
cp supabase/config.toml $TMP/supabase/
cp supabase/migrations/*.sql $TMP/supabase/migrations/
git show v6.3:supabase/migrations/20260921233000_mesures.sql > $TMP/supabase/migrations/20260921233000_mesures.sql
npx --yes supabase@2.117.0 migration list --project-ref $REF --workdir $TMP -p "$SUPABASE_DB_PASSWORD"
npx --yes supabase@2.117.0 db push --project-ref $REF --workdir $TMP --dry-run -p "$SUPABASE_DB_PASSWORD"
```

La fusion de `main` dans la branche de version remet ensuite les deux registres d'accord, et les
conflits des trois fichiers de la vue lisible se résolvent en gardant les deux côtés.

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

1. Téléverser l'image dans le bucket `media`, sous `restaurants/`, `bibliotheques/`, `batiments/`,
   `etablissements/` ou `annonces/`, **avec un `cache-control` d'un an** (`max-age=31536000`), et
   copier son URL publique. La console le fait d'elle-même et compresse l'image au passage ; depuis le
   Studio, c'est un champ à remplir. Sans cet en-tête, l'objet recrée le gaspillage d'egress que le
   jalon [7-A](../docs/phase-7/7-a-bande-passante.md) a corrigé — et `npm run media:compresser`
   rattrape ce qui aurait été posé sans lui.
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

## Les fonctions

[`functions/`](functions/) porte les deux fonctions du projet, qui partagent
[`_shared/`](functions/_shared/) — les en-têtes, la réponse, et **qui appelle** : le compte de la
session, vérifié auprès du service d'authentification, et son rôle lu dans `editeurs`. Chacune est
réservée aux admins depuis le jalon [7-H](../docs/phase-7/7-h-console-roles.md), et répond 403 sinon.

- [`notifier/`](functions/notifier/) ([6.1.x-E](../docs/phase-6/6-1-x-e-notifications-push.md))
  envoie un message de service en notification push, avec la clé de service : aucun compte de la
  console ne lit les jetons, elle seule. Après un changement de `regles.ts`, le test `regles.test.ts`
  de la racine doit rester vert **avant** de redéployer : c'est lui qui garantit que la fonction cible
  comme l'appareil.
- [`editeurs/`](functions/editeurs/) (7-H) gère l'équipe : **inviter** — la ligne d'`editeurs` écrite
  avec la session de l'admin, puis le compte créé avec un mot de passe provisoire, rendu une seule
  fois —, donner un **nouveau mot de passe provisoire**, **révoquer** — la ligne, puis le compte. Les
  règles d'une demande et la forme du mot de passe sont pures, dans `regles.ts`, jouées par
  `regles.test.ts` à la racine.

Elles se déploient par la CLI, sans l'ajouter aux dépendances ; `SUPABASE_ACCESS_TOKEN`, dans le
`.env`, tient lieu de `supabase login` :

```bash
set -a && source .env && set +a
npx --yes supabase@2.117.0 functions deploy notifier --project-ref owiksddeqcyyifnmpyqm --use-api
npx --yes supabase@2.117.0 functions deploy editeurs --project-ref owiksddeqcyyifnmpyqm --use-api
```

`--use-api` évite Docker : le bundle est construit par la plateforme, qui embarque `_shared/` dans
chaque fonction qui l'importe. La clé de service et l'URL du projet leur sont fournies par la
plateforme (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`), rien à configurer. [`config.toml`](config.toml)
ne porte que l'identifiant du projet et la vérification du JWT. Leur typage se vérifie avec Deno, lui
aussi sans dépendance : `npx --yes deno check --no-config supabase/functions/*/index.ts`.

Se vérifient depuis la console : un message, « Notifier », la réponse en clair ; une invitation, le
mot de passe provisoire dans son dialogue. Un refus 403 veut dire que la session n'est pas celle d'un
admin ; un 409, que le message est inactif, expiré ou déjà notifié — ou que la personne invitée est
déjà dans l'équipe, ou que la révocation retirerait le dernier admin.

## Ce qui n'a pas sa place ici

Pas de fonction métier, pas de vue qui calcule. La base porte de la donnée ; ce qui se calcule se
calcule dans l'application, où c'est typé, relu et vérifié.

Elle porte **des gardes**, depuis le jalon [6.1-B](../docs/phase-6/6-1-b-pilotage-a-distance.md), et
la phrase ci-dessus tient toujours : `private.est_editeur()` dit qui a le droit d'écrire — et depuis
7-H, `private.role_editeur()`, `private.est_admin()` et `private.peut_publier()` disent quoi et où —,
le déclencheur `journal` trace ce qui a été écrit, `maj_le` tient la version d'une ligne contre
l'écrasement, `contact_du_retour()` ne rend une adresse qu'à un admin, et un déclencheur garde toujours
un admin. Ce sont des politiques d'accès et d'intégrité exprimées en SQL — aucune ne décide de ce que
l'application affiche. Une fonction qui calculerait quelque chose pour l'écran serait la première
entorse, et elle se refuse.


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
