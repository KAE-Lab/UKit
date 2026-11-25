-- La recette des evenements des annonces (docs/phase-8/5-evenements.md, plan de test), jouee **dans une
-- transaction annulee**, sur la production elle-meme, avant de pousser la migration, comme celles des
-- lots 1 a 4. Rien n'y survit : ni la migration, ni le compte d'essai, ni les annonces, ni le journal.
--
--     (echo 'begin;'; cat supabase/migrations/20261125080000_evenements.sql supabase/recettes/evenements.sql; echo 'rollback;') \
--       | psql -h aws-0-eu-west-2.pooler.supabase.com -p 5432 -U postgres.<ref> -d postgres -v ON_ERROR_STOP=1 -q
--
-- Une fois la migration en production, elle se rejoue sans elle. Chaque cas leve une exception s'il
-- echoue et annonce `ok <n>` sinon. Elle suppose un admin dans `editeurs` ; le lecteur est d'essai.

\set QUIET on
\pset tuples_only on
\o /dev/null
set client_min_messages = notice;

insert into public.editeurs (email, role) values ('recette.lecteur@exemple.test', 'lecteur');

select jsonb_build_object('email', email)::text as claims_admin
  from public.editeurs where role = 'admin' order by email limit 1 \gset
\set claims_lecteur '{"email": "recette.lecteur@exemple.test"}'

create temporary table essai (nom text primary key, id uuid) on commit drop;
grant select on essai to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. La forme : les trois ensemble ou aucun, une fin apres le debut et dans les 24 h, un lieu borne.
-- ---------------------------------------------------------------------------
do $$
declare
    -- debut, fin, lieu
    refuses text[][] := array[
        array['2026-12-03T18:00:00+01:00', null, 'Amphi A'],
        array[null, '2026-12-03T20:00:00+01:00', 'Amphi A'],
        array['2026-12-03T18:00:00+01:00', '2026-12-03T20:00:00+01:00', null],
        array[null, null, 'Amphi A'],
        array['2026-12-03T18:00:00+01:00', '2026-12-03T18:00:00+01:00', 'Amphi A'],
        array['2026-12-03T18:00:00+01:00', '2026-12-03T17:00:00+01:00', 'Amphi A'],
        array['2026-12-03T18:00:00+01:00', '2026-12-04T18:00:01+01:00', 'Amphi A'],
        array['2026-12-03T18:00:00+01:00', '2026-12-03T20:00:00+01:00', ' A '],
        array['2026-12-03T18:00:00+01:00', '2026-12-03T20:00:00+01:00', repeat('x', 121)]
    ];
    i int;
begin
    for i in 1 .. array_length(refuses, 1) loop
        begin
            insert into public.annonces (titre, emetteur, audience, evenement_debut, evenement_fin, evenement_lieu)
                values ('Recette forme', 'Recette', 'testeurs', refuses[i][1]::timestamptz, refuses[i][2]::timestamptz, refuses[i][3]);
            raise exception 'ECHEC 1a : evenement accepte %', refuses[i:i];
        exception when check_violation then null;
        end;
    end loop;
    raise notice 'ok 1a';
end $$;

-- Acceptes : sans evenement, une soiree qui passe minuit, vingt-quatre heures pile, un lieu de 120.
with a as (
    insert into public.annonces (titre, emetteur, audience, type, evenement_debut, evenement_fin, evenement_lieu) values
        ('Recette sans evenement', 'Recette', 'testeurs', 'evenement', null, null, null),
        ('Recette soiree', 'Recette', 'testeurs', 'evenement', '2026-12-03T22:00:00+01:00', '2026-12-04T03:00:00+01:00', 'Le Rocher de Palmer'),
        ('Recette journee', 'Recette', 'testeurs', 'evenement', '2026-12-05T08:00:00+01:00', '2026-12-06T08:00:00+01:00', repeat('x', 120)),
        -- L'evenement survit a un changement de type : la garde porte la forme, pas le type.
        ('Recette info datee', 'Recette', 'testeurs', 'info', '2026-12-07T12:00:00+01:00', '2026-12-07T13:00:00+01:00', 'Hall B')
    returning id, titre
)
insert into essai select titre, id from a;
do $$ begin
    if (select count(*) from essai) <> 4 then raise exception 'ECHEC 1b : % lignes acceptees', (select count(*) from essai); end if;
    raise notice 'ok 1b';
end $$;

-- Une annonce brouillon datee : anon ne la lit pas.
with a as (
    insert into public.annonces (titre, emetteur, audience, statut, evenement_debut, evenement_fin, evenement_lieu)
        values ('Recette brouillon', 'Recette', 'testeurs', 'brouillon', '2026-12-03T18:00:00+01:00', '2026-12-03T20:00:00+01:00', 'Amphi A')
    returning id, titre
)
insert into essai select titre, id from a;

-- ---------------------------------------------------------------------------
-- 2. anon lit l'evenement d'une annonce publiee, jamais d'un brouillon, et n'ecrit rien.
-- ---------------------------------------------------------------------------
set local role anon;
do $$ begin
    if (select evenement_lieu from public.annonces where id = (select id from essai where nom = 'Recette soiree')) is distinct from 'Le Rocher de Palmer' then
        raise exception 'ECHEC 2a : anon ne lit pas l evenement';
    end if;
    raise notice 'ok 2a';
end $$;
do $$ begin
    if exists (select 1 from public.annonces where id = (select id from essai where nom = 'Recette brouillon')) then
        raise exception 'ECHEC 2b : anon lit un brouillon';
    end if;
    raise notice 'ok 2b';
end $$;
do $$ begin
    insert into public.annonces (titre, emetteur, evenement_debut, evenement_fin, evenement_lieu)
        values ('Recette anon', 'Recette', now(), now() + interval '1 hour', 'Amphi A');
    raise exception 'ECHEC 2c : anon cree une annonce datee';
exception when insufficient_privilege then raise notice 'ok 2c';
end $$;
do $$
declare n int;
begin
    update public.annonces set evenement_lieu = 'Ailleurs' where id = (select id from essai where nom = 'Recette soiree');
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'ECHEC 2d : anon modifie un evenement'; end if;
    raise notice 'ok 2d';
exception when insufficient_privilege then raise notice 'ok 2d';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 3. Un admin date une annonce, la deplace, l'annule ; un lecteur ne le peut pas.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = :'claims_lecteur';
do $$
declare n int;
begin
    update public.annonces set evenement_lieu = 'Ailleurs' where id = (select id from essai where nom = 'Recette soiree');
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'ECHEC 3a : un lecteur modifie un evenement'; end if;
    raise notice 'ok 3a';
exception when insufficient_privilege then raise notice 'ok 3a';
end $$;

set local request.jwt.claims = :'claims_admin';
do $$
declare n int;
begin
    update public.annonces
       set evenement_debut = '2026-12-10T18:00:00+01:00', evenement_fin = '2026-12-10T20:00:00+01:00', evenement_lieu = 'Amphi B'
     where id = (select id from essai where nom = 'Recette sans evenement');
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'ECHEC 3b : un admin ne date pas une annonce'; end if;
    update public.annonces set evenement_debut = null, evenement_fin = null, evenement_lieu = null
     where id = (select id from essai where nom = 'Recette soiree');
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'ECHEC 3c : un admin ne retire pas un evenement'; end if;
    raise notice 'ok 3b';
end $$;
do $$ begin
    update public.annonces set evenement_fin = evenement_debut where id = (select id from essai where nom = 'Recette journee');
    raise exception 'ECHEC 3d : un admin ecrit une fin egale au debut';
exception when check_violation then raise notice 'ok 3d';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 4. Chaque ecriture laisse sa ligne au journal, comme toute ecriture d'annonce.
-- ---------------------------------------------------------------------------
do $$ begin
    if not exists (select 1 from public.journal where table_name = 'annonces' and ligne_id = (select id::text from essai where nom = 'Recette soiree') and operation = 'UPDATE' and apres ->> 'evenement_lieu' is null) then
        raise exception 'ECHEC 4a : la modification n est pas au journal';
    end if;
    raise notice 'ok 4a';
end $$;
