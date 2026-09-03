-- UKit — politiques d'acces.
--
-- La cle `anon` est publique par conception : elle est lisible dans n'importe quel binaire. Ce n'est
-- pas un secret mal garde, c'est un identifiant. **La frontiere de securite, ce sont ces
-- politiques** ; les traiter comme un detail serait l'erreur du jalon.
--
-- RLS est active sur **toutes** les tables, y compris celles qui n'ont rien de sensible : une table
-- sans politique est une table qu'on oubliera de proteger le jour ou elle en aura besoin.
--
-- Quatre regles, sans exception :
--   1. lecture publique restreinte aux lignes **publiees** ;
--   2. aucune ecriture pour `anon` — ni par politique, ni par privilege ;
--   3. ecriture par `service_role` — le script de publication et les sondes, avec la cle secrete ;
--   4. depuis le jalon 6.1-B, ecriture par un compte **authentifie** dont l'e-mail figure dans la
--      table editeurs — la console web. Le Studio Supabase passe par les memes regles et les memes
--      declencheurs (fonctions.sql).
--
-- Le jour ou la partie sociale arrivera, elle ajoutera ses tables et ses politiques adossees a
-- auth.uid(). Rien de ce qui est ecrit ici ne devra etre defait.
--
-- Chaque politique est precedee d'un `drop policy if exists` : Postgres n'a pas de
-- `create policy if not exists`, et un fichier qu'on ne peut rejouer qu'une fois n'est pas
-- reproductible — c'est precisement ce que ce dossier existe pour eviter.
--
-- S'applique **apres** fonctions.sql, qui definit private.est_editeur().
--
-- Voir docs/backend.md.

alter table public.annonces         enable row level security;
alter table public.service_messages enable row level security;
alter table public.batiments        enable row level security;
alter table public.visuels          enable row level security;
alter table public.etablissements   enable row level security;
alter table public.blueprints       enable row level security;
alter table public.app_release      enable row level security;
alter table public.salutations      enable row level security;
alter table public.testeurs         enable row level security;
alter table public.sondes           enable row level security;
alter table public.journal          enable row level security;
alter table public.editeurs         enable row level security;

-- -----------------------------------------------------------------------------
-- Lecture publique
-- -----------------------------------------------------------------------------

-- Une annonce inactive ou expiree ne sort pas de la base. Elle n'est pas filtree cote application :
-- ce qui n'a pas a etre lu n'est pas envoye.
drop policy if exists "annonces publiees lisibles" on public.annonces;
create policy "annonces publiees lisibles"
    on public.annonces for select
    to anon
    using (active and (expire_le is null or expire_le > now()));

drop policy if exists "messages de service actifs lisibles" on public.service_messages;
create policy "messages de service actifs lisibles"
    on public.service_messages for select
    to anon
    using (actif and (expire_le is null or expire_le > now()));

-- Une salutation inactive ne sort pas de la base : ce qui n'a pas a etre lu n'est pas envoye. Le
-- filtre applicatif sur `actif` reste, comme partout — la politique est la frontiere, pas la seule
-- ceinture.
drop policy if exists "salutations actives lisibles" on public.salutations;
create policy "salutations actives lisibles"
    on public.salutations for select
    to anon
    using (actif);

drop policy if exists "batiments lisibles" on public.batiments;
create policy "batiments lisibles"
    on public.batiments for select
    to anon
    using (true);

-- Aucune condition de publication : une ligne de cette table **est** la publication. Il n'y a ni
-- date d'expiration ni drapeau d'activation a filtrer — retirer un visuel se fait en retirant la
-- ligne, ce qui rend a la source la sienne.
drop policy if exists "visuels lisibles" on public.visuels;
create policy "visuels lisibles"
    on public.visuels for select
    to anon
    using (true);

drop policy if exists "etablissements actifs lisibles" on public.etablissements;
create policy "etablissements actifs lisibles"
    on public.etablissements for select
    to anon
    using (actif);

drop policy if exists "app_release lisible" on public.app_release;
create policy "app_release lisible"
    on public.app_release for select
    to anon
    using (true);

-- Les testeurs : l'application lit la liste des identifiants et compare **chez elle** — elle
-- n'envoie jamais le sien. La politique laisse passer toutes les lignes, mais le privilege ne porte
-- que sur la colonne `id` : `select *` est refuse (42501), `select=id` passe, et les noms restent
-- prives. `revoke` d'abord, parce qu'une table nouvelle nait avec tous les privileges accordes aux
-- trois roles. `authenticated` garde les siens : la console lit et ecrit la table entiere.
--
-- Limite ecrite : les identifiants sont enumerables. Ce sont des UUID aleatoires, et l'audience
-- `testeurs` est un filtre d'affichage, pas une confidentialite — usurper un testeur demanderait
-- d'ecrire le trousseau d'un appareil.
revoke select on public.testeurs from anon;
grant select (id) on public.testeurs to anon;

drop policy if exists "testeurs lisibles" on public.testeurs;
create policy "testeurs lisibles"
    on public.testeurs for select
    to anon
    using (true);

-- L'etat des sources : lisible par tous, ecrit par les sondes seules (`service_role`). Rien de
-- personnel — c'est l'etat de services publics — et un jour l'application pourra s'en servir pour
-- dire d'elle-meme qu'un portail est en panne ce matin.
drop policy if exists "sondes lisibles" on public.sondes;
create policy "sondes lisibles"
    on public.sondes for select
    to anon, authenticated
    using (true);

-- L'index de livraison n'est pas lu par l'application : elle lit manifest.json dans le bucket.
-- Aucune politique de lecture pour `anon`, donc — ouvrir un acces dont personne n'a besoin serait
-- une surface offerte pour rien.

-- -----------------------------------------------------------------------------
-- Ecriture
-- -----------------------------------------------------------------------------
--
-- Jusqu'au jalon 6.1-B, aucune politique d'ecriture n'etait declaree : sous RLS, ce qui n'est pas
-- autorise est refuse, et `service_role` contourne RLS par nature. La console web change cela pour
-- **un** role et **une** table de personnes : un compte authentifie ecrit si — et seulement si — son
-- e-mail est dans editeurs (private.est_editeur(), fonctions.sql). Rien d'autre n'a bouge : `anon`
-- n'ecrit toujours rien, et perd meme le privilege au niveau des grants, parce qu'une politique
-- s'oublie ouverte la ou un privilege revoque ne se rouvre pas par accident.
--
-- Les politiques des editeurs sont generees par une boucle plutot qu'ecrites huit fois : une seule
-- liste dit quelles tables la console peut ecrire. `blueprints` n'y est pas — les Blueprints restent
-- publies par le script, valides par le moteur et rejoues par la parite (docs/blueprints.md) ; ni
-- `journal` (ecrit par le declencheur seul) ni `sondes` (ecrite par les sondes seules).
--
-- La verification se joue plutot qu'elle ne se suppose : une insertion avec la cle `anon` doit
-- **echouer**, et une insertion par un compte authentifie absent d'editeurs aussi.

revoke insert, update, delete on all tables in schema public from anon;
-- Et la lecture de ce qui ne le regarde pas. Sans politique, RLS rendrait une liste vide plutot
-- qu'un refus : le refus dit la verite, la liste vide fait croire a une table vide.
revoke select on public.journal, public.editeurs from anon;

do $$
declare
    nom text;
begin
    foreach nom in array array[
        'annonces', 'service_messages', 'etablissements', 'visuels',
        'salutations', 'batiments', 'testeurs', 'app_release'
    ]
    loop
        -- La lecture des editeurs voit **toutes** les lignes, inactives et expirees comprises : c'est
        -- l'ecran d'edition, pas l'ecran de publication.
        execute format('drop policy if exists "%s lisible par les editeurs" on public.%I', nom, nom);
        execute format(
            'create policy "%s lisible par les editeurs" on public.%I for select to authenticated using (private.est_editeur())',
            nom, nom
        );
        execute format('drop policy if exists "%s creable par les editeurs" on public.%I', nom, nom);
        execute format(
            'create policy "%s creable par les editeurs" on public.%I for insert to authenticated with check (private.est_editeur())',
            nom, nom
        );
        execute format('drop policy if exists "%s modifiable par les editeurs" on public.%I', nom, nom);
        execute format(
            'create policy "%s modifiable par les editeurs" on public.%I for update to authenticated using (private.est_editeur()) with check (private.est_editeur())',
            nom, nom
        );
        execute format('drop policy if exists "%s supprimable par les editeurs" on public.%I', nom, nom);
        execute format(
            'create policy "%s supprimable par les editeurs" on public.%I for delete to authenticated using (private.est_editeur())',
            nom, nom
        );
    end loop;
end
$$;

-- Le journal se consulte et s'exporte depuis la console ; il ne s'ecrit pas (fonctions.sql).
drop policy if exists "journal lisible par les editeurs" on public.journal;
create policy "journal lisible par les editeurs"
    on public.journal for select
    to authenticated
    using (private.est_editeur());

-- Un compte ne lit que sa propre ligne d'editeurs — de quoi savoir s'il a les droits, rien de plus.
-- La table ne s'ecrit que par le script de creation du compte (tools/console/editeur.mjs).
drop policy if exists "editeurs : sa propre ligne" on public.editeurs;
create policy "editeurs : sa propre ligne"
    on public.editeurs for select
    to authenticated
    using (email = nullif(auth.jwt() ->> 'email', ''));

-- -----------------------------------------------------------------------------
-- Buckets
-- -----------------------------------------------------------------------------
--
-- `blueprints` et `media` sont publics en lecture. C'est assume : un Blueprint ne contient jamais
-- d'identifiant (il les **declare**, le trousseau les fournit), et l'integrite de ce qui est servi
-- est garantie par l'empreinte SHA-256 du manifeste, revenue a chaque lecture — pas par le secret de
-- l'URL.
--
-- L'ecriture reste reservee a `service_role`. La cle qui la porte est la cle de la production : qui
-- la detient peut publier un Blueprint que tous les appareils joueront.

drop policy if exists "blueprints lisibles" on storage.objects;
create policy "blueprints lisibles"
    on storage.objects for select
    to anon
    using (bucket_id = 'blueprints');

drop policy if exists "media lisible" on storage.objects;
create policy "media lisible"
    on storage.objects for select
    to anon
    using (bucket_id = 'media');

-- Les editeurs televersent les visuels depuis la console, dans `media` seulement. Trois politiques
-- et non une : un televersement avec `upsert` est une **mise a jour** quand l'objet existe deja, et
-- remplacer une image est precisement le geste attendu (l'URL versionnee fait le reste,
-- docs/pilotage.md). Le bucket des Blueprints reste au script de publication.
drop policy if exists "media creable par les editeurs" on storage.objects;
create policy "media creable par les editeurs"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'media' and private.est_editeur());

drop policy if exists "media modifiable par les editeurs" on storage.objects;
create policy "media modifiable par les editeurs"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'media' and private.est_editeur())
    with check (bucket_id = 'media' and private.est_editeur());

drop policy if exists "media supprimable par les editeurs" on storage.objects;
create policy "media supprimable par les editeurs"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'media' and private.est_editeur());
