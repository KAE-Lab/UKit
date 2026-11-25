-- La recette des sondages et de la boite a idees (docs/phase-8/4-sondages-idees-notation.md, plan de
-- test), jouee **dans une transaction annulee**, sur la production elle-meme, avant de pousser la
-- migration, comme celles des lots 1 a 3. Rien n'y survit : ni la migration, ni les reglages d'essai, ni
-- le compte d'essai, ni les annonces, les idees, les votes, les retours, ni le journal.
--
--     (echo 'begin;'; cat supabase/migrations/20261125070000_sondages_idees.sql supabase/recettes/sondages_idees.sql; echo 'rollback;') \
--       | psql -h aws-0-eu-west-2.pooler.supabase.com -p 5432 -U postgres.<ref> -d postgres -v ON_ERROR_STOP=1 -q
--
-- Une fois la migration en production, elle se rejoue sans elle. Les recettes des lots 1 et 3 se
-- rejouent de meme sur la migration, chacune dans sa transaction : `contribuer` et `deposer_retour`
-- sont reecrites. Chaque cas leve une exception s'il echoue et annonce `ok <n>` sinon. Elle suppose un
-- admin dans `editeurs` ; le lecteur est d'essai.

\set QUIET on
\pset tuples_only on
\o /dev/null
set client_min_messages = notice;

delete from private.reglages_communaute;
insert into private.reglages_communaute (cle, valeur) values
    ('plafond_appareil_atteste', 20), ('plafond_appareil_non_atteste', 5), ('plafond_non_attestes_jour', 100000),
    ('plafond_ip_jour', 100000), ('plafond_verdicts_ip_jour', 50), ('plafond_ip_non_attestes_jour', 100000),
    ('seuil_fiable', 99), ('anciennete_fiable_jours', 0),
    ('duree_direct_minutes', 30), ('duree_correction_jours', 30), ('fin_max_jours', 30),
    ('plafond_retours_appareil', 20), ('plafond_retours_non_atteste', 20), ('plafond_retours_non_attestes_jour', 100000);
insert into public.editeurs (email, role) values ('recette.lecteur@exemple.test', 'lecteur');

create function pg_temp.attendre(n text, r jsonb, statut text, raison text default null)
returns void language plpgsql as $$
begin
    if r ->> 'statut' is distinct from statut or (raison is not null and r ->> 'raison' is distinct from raison) then
        raise exception 'ECHEC % : attendu % %, obtenu %', n, statut, coalesce(raison, ''), r;
    end if;
    raise notice 'ok %', n;
end;
$$;

-- Un vote, comme la fonction `communaute` l'appelle : `cle` est une graine, le jeton en derive.
create function pg_temp.v(cle text, sujet text, cible text, valeur text, atteste boolean default true)
returns jsonb language plpgsql as $$
begin
    perform public.admettre(jsonb_build_object('empreinte_ip', encode(extensions.digest('ip-lot4', 'sha256'), 'hex'), 'verdict', false));
    return public.contribuer(jsonb_build_object(
        'appareil', jsonb_build_object('cle', encode(extensions.digest(cle, 'sha256'), 'hex'), 'nature', 'secret', 'plateforme', 'android', 'atteste', atteste),
        'empreinte_ip', encode(extensions.digest('ip-lot4', 'sha256'), 'hex'),
        'jeton_de_vote', encode(extensions.digest(cle || '|' || sujet || '|' || cible, 'sha256'), 'hex'),
        'contribution', jsonb_build_object('sujet', sujet, 'cible', cible, 'valeur', valeur),
        'essai', false));
end;
$$;

-- Un detail sur une idee, comme la fonction `communaute` le depose.
create function pg_temp.d(cle text, idee text, nature text default 'fonctionnalite')
returns jsonb language plpgsql as $$
begin
    return public.deposer_retour(jsonb_build_object(
        'appareil', jsonb_build_object('cle', encode(extensions.digest(cle, 'sha256'), 'hex'), 'nature', 'secret', 'plateforme', 'android', 'atteste', true),
        'empreinte_ip', encode(extensions.digest('ip-lot4', 'sha256'), 'hex'),
        'jeton', encode(extensions.digest(cle || '|retour', 'sha256'), 'hex'),
        'retour', jsonb_build_object('depot', gen_random_uuid(), 'nature', nature, 'texte', 'Un detail sur l idee', 'idee', idee, 'captures', 0)));
end;
$$;

grant execute on function pg_temp.attendre(text, jsonb, text, text) to service_role;
grant execute on function pg_temp.v(text, text, text, text, boolean) to service_role;
grant execute on function pg_temp.d(text, text, text) to service_role;

select jsonb_build_object('email', email)::text as claims_admin
  from public.editeurs where role = 'admin' order by email limit 1 \gset
\set claims_lecteur '{"email": "recette.lecteur@exemple.test"}'

-- Les annonces d'essai : un sondage ouvert, un clos, une archivee, une sans sondage.
create temporary table essai (nom text primary key, id uuid) on commit drop;
grant select on essai to anon, authenticated, service_role;
with a as (
    insert into public.annonces (titre, emetteur, audience, sondage) values
        ('Recette sondage ouvert', 'Recette', 'testeurs', '{"question": "Quel creneau ?", "choix": [{"id": "a", "libelle": "Midi"}, {"id": "b", "libelle": "Soir"}, {"id": "c", "libelle": "Les deux"}], "clos_le": "2099-01-01T00:00:00Z"}'),
        ('Recette sondage clos', 'Recette', 'testeurs', '{"question": "Quel creneau ?", "choix": [{"id": "a", "libelle": "Midi"}, {"id": "b", "libelle": "Soir"}], "clos_le": "2020-01-01T00:00:00+01:00"}'),
        ('Recette sans sondage', 'Recette', 'testeurs', null)
    returning id, titre
)
insert into essai select case titre when 'Recette sondage ouvert' then 'ouvert' when 'Recette sondage clos' then 'clos' else 'sans' end, id from a;
with a as (
    insert into public.annonces (titre, emetteur, audience, statut, sondage) values
        ('Recette sondage archive', 'Recette', 'testeurs', 'archivee', '{"question": "Quel creneau ?", "choix": [{"id": "a", "libelle": "Midi"}, {"id": "b", "libelle": "Soir"}], "clos_le": "2099-01-01T00:00:00Z"}')
    returning id
)
insert into essai select 'archivee', id from a;
with a as (
    insert into public.annonces (titre, emetteur, audience, publiee_le, expire_le, sondage) values
        ('Recette sondage programme', 'Recette', 'testeurs', now() + interval '1 day', null, '{"question": "Quel creneau ?", "choix": [{"id": "a", "libelle": "Midi"}, {"id": "b", "libelle": "Soir"}], "clos_le": "2099-01-01T00:00:00Z"}'),
        ('Recette sondage expire', 'Recette', 'testeurs', now() - interval '2 days', now() - interval '1 day', '{"question": "Quel creneau ?", "choix": [{"id": "a", "libelle": "Midi"}, {"id": "b", "libelle": "Soir"}], "clos_le": "2099-01-01T00:00:00Z"}')
    returning id, titre
)
insert into essai select case titre when 'Recette sondage programme' then 'programmee' else 'expiree' end, id from a;

-- ---------------------------------------------------------------------------
-- 1. La forme du sondage.
-- ---------------------------------------------------------------------------
do $$
declare
    refuses jsonb[] := array[
        '{"question": "Q?", "choix": [{"id": "a", "libelle": "x"}, {"id": "b", "libelle": "y"}], "clos_le": "2099-01-01T00:00:00Z"}',
        '{"question": "Quel jour ?", "choix": [{"id": "a", "libelle": "x"}], "clos_le": "2099-01-01T00:00:00Z"}',
        '{"question": "Quel jour ?", "choix": [{"id": "a", "libelle": "x"}, {"id": "a", "libelle": "y"}], "clos_le": "2099-01-01T00:00:00Z"}',
        '{"question": "Quel jour ?", "choix": [{"id": "A", "libelle": "x"}, {"id": "b", "libelle": "y"}], "clos_le": "2099-01-01T00:00:00Z"}',
        '{"question": "Quel jour ?", "choix": [{"id": "a", "libelle": " "}, {"id": "b", "libelle": "y"}], "clos_le": "2099-01-01T00:00:00Z"}',
        '{"question": "Quel jour ?", "choix": [{"id": "a", "libelle": "x"}, {"id": "b", "libelle": "y"}]}',
        '{"question": "Quel jour ?", "choix": [{"id": "a", "libelle": "x"}, {"id": "b", "libelle": "y"}], "clos_le": "demain"}',
        '{"question": "Quel jour ?", "choix": [{"id": "a", "libelle": "x"}, {"id": "b", "libelle": "y"}], "clos_le": "2099-01-01T00:00:00Z", "autre": 1}',
        '{"question": "Quel jour ?", "choix": [{"id": "a", "libelle": "1"}, {"id": "b", "libelle": "2"}, {"id": "c", "libelle": "3"}, {"id": "d", "libelle": "4"}, {"id": "e", "libelle": "5"}, {"id": "f", "libelle": "6"}, {"id": "g", "libelle": "7"}], "clos_le": "2099-01-01T00:00:00Z"}',
        '{"question": "Quel jour ?", "choix": [{"id": "a", "libelle": "x"}, {"id": "b", "libelle": "y"}], "clos_le": "2026-02-30T12:00:00Z"}',
        '{"question": "Quel jour ?", "choix": [{"id": "a", "libelle": "x"}, {"id": "b", "libelle": "y"}], "clos_le": "2026-12-01T25:00:00Z"}',
        '{"question": "Quel jour ?", "choix": [{"id": "a", "libelle": "x"}, {"id": "b", "libelle": "y"}], "clos_le": "2026-12-01T12:00:00+99:99"}',
        '["pas un objet"]'
    ]::jsonb[];
    s jsonb;
begin
    foreach s in array refuses loop
        begin
            insert into public.annonces (titre, emetteur, audience, sondage) values ('Recette forme', 'Recette', 'testeurs', s);
            raise exception 'ECHEC 1a : sondage accepte %', s;
        exception when check_violation then null;
        end;
    end loop;
    raise notice 'ok 1a';
end $$;

-- ---------------------------------------------------------------------------
-- 2. Aucune porte d'ecriture pour anon ni pour un compte ; la lecture des resultats pour tous.
-- ---------------------------------------------------------------------------
set local role anon;
do $$ begin perform private.juger_vote('sondage.choix', 'x', 'a'); raise exception 'ECHEC 2a : anon juge un vote';
exception when insufficient_privilege then raise notice 'ok 2a'; end $$;
do $$ begin perform public.contribuer('{}'::jsonb); raise exception 'ECHEC 2b : anon contribue';
exception when insufficient_privilege then raise notice 'ok 2b'; end $$;
do $$ begin insert into public.idees (titre) values ('Une idee d anon'); raise exception 'ECHEC 2c : anon ecrit une idee';
exception when insufficient_privilege then raise notice 'ok 2c'; end $$;
do $$ begin perform public.resultats_sondage((select id from essai where nom = 'ouvert')); raise notice 'ok 2d';
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = :'claims_admin';
do $$ begin perform public.deposer_retour('{}'::jsonb); raise exception 'ECHEC 2e : un admin depose en direct';
exception when insufficient_privilege then raise notice 'ok 2e'; end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 3. Le vote d'un sondage, par la porte de la fonction.
-- ---------------------------------------------------------------------------
set local role service_role;
select pg_temp.attendre('3a', pg_temp.v('lot4-a', 'sondage.choix', (select id::text from essai where nom = 'ouvert'), 'a'), 'acceptee');
select pg_temp.attendre('3b', pg_temp.v('lot4-a', 'sondage.choix', (select id::text from essai where nom = 'ouvert'), 'b'), 'refusee', 'deja_vote');
select pg_temp.attendre('3c', pg_temp.v('lot4-b', 'sondage.choix', (select id::text from essai where nom = 'ouvert'), 'z'), 'refusee', 'valeur_invalide');
select pg_temp.attendre('3d', pg_temp.v('lot4-b', 'sondage.choix', (select id::text from essai where nom = 'ouvert'), 'Pas un choix'), 'refusee', 'valeur_invalide');
select pg_temp.attendre('3e', pg_temp.v('lot4-b', 'sondage.choix', (select id::text from essai where nom = 'clos'), 'a'), 'refusee', 'sondage_clos');
select pg_temp.attendre('3f', pg_temp.v('lot4-b', 'sondage.choix', (select id::text from essai where nom = 'archivee'), 'a'), 'refusee', 'cible_inconnue');
select pg_temp.attendre('3g', pg_temp.v('lot4-b', 'sondage.choix', (select id::text from essai where nom = 'sans'), 'a'), 'refusee', 'cible_inconnue');
select pg_temp.attendre('3h', pg_temp.v('lot4-b', 'sondage.choix', 'restaurant-12', 'a'), 'refusee', 'cible_inconnue');
select pg_temp.attendre('3h2', pg_temp.v('lot4-b', 'sondage.choix', (select id::text from essai where nom = 'programmee'), 'a'), 'refusee', 'cible_inconnue');
select pg_temp.attendre('3h3', pg_temp.v('lot4-b', 'sondage.choix', (select id::text from essai where nom = 'expiree'), 'a'), 'refusee', 'cible_inconnue');
select pg_temp.attendre('3i', pg_temp.v('lot4-c', 'sondage.choix', (select id::text from essai where nom = 'ouvert'), 'c', false), 'acceptee');
do $$ begin
    if (select count(*) from public.votes where sujet = 'sondage.choix') <> 2
       or (select poids from public.votes where sujet = 'sondage.choix' and valeur = 'c') <> 0 then
        raise exception 'ECHEC 3j : les bulletins';
    end if;
    raise notice 'ok 3j';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 4. Les resultats : rien sous cinq voix, « moins de 5 » par choix, le total masque avec une case.
-- ---------------------------------------------------------------------------
create function pg_temp.semer(annonce uuid, valeur text, n integer, poids smallint default 1)
returns void language sql as $$
    insert into public.votes (sujet, cible, jeton, valeur, poids)
    select 'sondage.choix', annonce::text, extensions.gen_random_bytes(32), valeur, poids from generate_series(1, n);
$$;
set local role anon;
do $$ begin
    if public.resultats_sondage((select id from essai where nom = 'ouvert')) <> '{"total": null, "parts": {}}'::jsonb then
        raise exception 'ECHEC 4a : un sondage a une voix attestee a des resultats : %', public.resultats_sondage((select id from essai where nom = 'ouvert'));
    end if;
    raise notice 'ok 4a';
end $$;
reset role;
select pg_temp.semer((select id from essai where nom = 'ouvert'), 'a', 5);
select pg_temp.semer((select id from essai where nom = 'ouvert'), 'b', 3);
select pg_temp.semer((select id from essai where nom = 'ouvert'), 'b', 40, 0::smallint);
set local role anon;
do $$
declare r jsonb := public.resultats_sondage((select id from essai where nom = 'ouvert'));
begin
    -- 6 voix attestees pour a, 3 pour b, 0 pour c, sur 9 : les non attestees ne comptent pas. b et c
    -- masquees ne font que 3 voix, a les rejoint : plus rien ne se montre, sans quoi 67 % pour a dirait
    -- 33 % pour les deux autres.
    if r <> '{"total": null, "parts": {}}'::jsonb then
        raise exception 'ECHEC 4b : %', r;
    end if;
    raise notice 'ok 4b';
end $$;
reset role;
select pg_temp.semer((select id from essai where nom = 'ouvert'), 'c', 6);
set local role anon;
do $$
declare r jsonb := public.resultats_sondage((select id from essai where nom = 'ouvert'));
begin
    -- a 6, b 3, c 6 : b masquee, et a, la plus petite visible, la rejoint ; c se lit seule, sans total.
    if r <> '{"total": null, "parts": {"a": null, "b": null, "c": 40}}'::jsonb then
        raise exception 'ECHEC 4b2 : %', r;
    end if;
    raise notice 'ok 4b2';
end $$;
reset role;
select pg_temp.semer((select id from essai where nom = 'ouvert'), 'b', 2);
set local role anon;
do $$
declare r jsonb := public.resultats_sondage((select id from essai where nom = 'ouvert'));
begin
    if r <> '{"total": 17, "parts": {"a": 35, "b": 29, "c": 35}}'::jsonb then
        raise exception 'ECHEC 4c : %', r;
    end if;
    if public.resultats_sondage((select id from essai where nom = 'archivee')) is not null
       or public.resultats_sondage((select id from essai where nom = 'sans')) is not null then
        raise exception 'ECHEC 4d : une annonce invisible ou sans sondage a des resultats';
    end if;
    raise notice 'ok 4c-4d';
end $$;
do $$ begin perform 1 from public.votes; raise exception 'ECHEC 4e : anon lit les votes';
exception when insufficient_privilege then raise notice 'ok 4e'; end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 5. Les idees : publiees par un admin, lues par anon sans brouillon ni close.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = :'claims_lecteur';
do $$ begin insert into public.idees (titre) values ('Une idee du lecteur'); raise exception 'ECHEC 5a : un lecteur ecrit une idee';
exception when insufficient_privilege then raise notice 'ok 5a'; end $$;
set local request.jwt.claims = :'claims_admin';
insert into public.idees (titre, statut) values
    ('Recette idee proposee', 'proposee'), ('Recette idee en cours', 'en_cours'),
    ('Recette idee brouillon', 'brouillon'), ('Recette idee close', 'close');
insert into public.idees (titre, statut, version_livree) values ('Recette idee livree', 'livree', '7.1.0');
do $$ begin
    insert into public.idees (titre, statut) values ('Recette idee', 'publiee');
    raise exception 'ECHEC 5b : un statut hors liste';
exception when check_violation then raise notice 'ok 5b'; end $$;
do $$ begin
    update public.idees set version_livree = '7.1' where titre = 'Recette idee livree';
    raise exception 'ECHEC 5c : une version hors forme';
exception when check_violation then raise notice 'ok 5c'; end $$;
do $$ begin
    insert into public.idees (titre, statut) values ('Recette idee sans version', 'livree');
    raise exception 'ECHEC 5c2 : une idee livree sans version';
exception when check_violation then raise notice 'ok 5c2'; end $$;
set local request.jwt.claims = :'claims_lecteur';
do $$ begin
    if (select count(*) from public.idees where titre like 'Recette idee%') <> 5 then raise exception 'ECHEC 5d : le lecteur lit toutes les idees'; end if;
    update public.idees set titre = 'Recette modifiee' where titre = 'Recette idee proposee';
    if exists (select 1 from public.idees where titre = 'Recette modifiee') then raise exception 'ECHEC 5d : un lecteur modifie une idee'; end if;
    raise notice 'ok 5d';
end $$;
reset role;
set local role anon;
do $$ begin
    if (select array_agg(statut order by statut) from public.idees where titre like 'Recette idee%') <> array['en_cours', 'livree', 'proposee'] then
        raise exception 'ECHEC 5e : anon lit %', (select array_agg(statut) from public.idees where titre like 'Recette idee%');
    end if;
    raise notice 'ok 5e';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 6. « Moi aussi » et le detail relie.
-- ---------------------------------------------------------------------------
insert into essai select 'idee-' || statut, id from public.idees where titre like 'Recette idee%';
set local role service_role;
select pg_temp.attendre('6a', pg_temp.v('lot4-a', 'idee.moi_aussi', (select id::text from essai where nom = 'idee-proposee'), 'oui'), 'acceptee');
select pg_temp.attendre('6b', pg_temp.v('lot4-a', 'idee.moi_aussi', (select id::text from essai where nom = 'idee-proposee'), 'oui'), 'refusee', 'deja_vote');
select pg_temp.attendre('6c', pg_temp.v('lot4-a', 'idee.moi_aussi', (select id::text from essai where nom = 'idee-en_cours'), 'oui'), 'acceptee');
select pg_temp.attendre('6d', pg_temp.v('lot4-a', 'idee.moi_aussi', (select id::text from essai where nom = 'idee-close'), 'oui'), 'refusee', 'cible_inconnue');
select pg_temp.attendre('6e', pg_temp.v('lot4-a', 'idee.moi_aussi', (select id::text from essai where nom = 'idee-livree'), 'oui'), 'refusee', 'cible_inconnue');
select pg_temp.attendre('6f', pg_temp.v('lot4-b', 'idee.moi_aussi', (select id::text from essai where nom = 'idee-proposee'), 'non'), 'refusee', 'valeur_invalide');
select pg_temp.attendre('6f2', pg_temp.v('lot4-b', 'idee.moi_aussi', 'pas-une-idee', 'oui'), 'refusee', 'cible_inconnue');
-- Les problemes connus passent tels quels : leur vote reste celui du lot 3.
select pg_temp.attendre('6g', pg_temp.v('lot4-a', 'probleme.moi_aussi', '11111111-1111-4111-8111-111111111111', 'android|Pixel 7|Android 15|7.0.0'), 'acceptee');
do $$
declare r jsonb;
begin
    r := pg_temp.d('lot4-detail', (select id::text from essai where nom = 'idee-proposee'));
    if r ->> 'statut' <> 'acceptee' or r ->> 'idee' is distinct from (select id::text from essai where nom = 'idee-proposee')
       or (select idee from public.retours where id = r ->> 'id') is distinct from (select id from essai where nom = 'idee-proposee') then
        raise exception 'ECHEC 6h : le detail relie %', r;
    end if;
    r := pg_temp.d('lot4-detail-2', (select id::text from essai where nom = 'idee-close'));
    if r ->> 'statut' <> 'acceptee' or r ->> 'idee' is not null or (select idee from public.retours where id = r ->> 'id') is not null then
        raise exception 'ECHEC 6i : le detail d une idee close %', r;
    end if;
    r := pg_temp.d('lot4-detail-3', (select id::text from essai where nom = 'idee-proposee'), 'bug');
    if r ->> 'statut' <> 'acceptee' or r ->> 'idee' is not null then
        raise exception 'ECHEC 6i : un bug range sous une idee %', r;
    end if;
    raise notice 'ok 6h-6i';
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = :'claims_lecteur';
do $$ begin
    if not exists (select 1 from public.retours where idee = (select id from essai where nom = 'idee-proposee')) then
        raise exception 'ECHEC 6j : le lecteur ne lit pas le lien';
    end if;
    if (select count(*) from public.votes where sujet = 'idee.moi_aussi' and cible = (select id::text from essai where nom = 'idee-proposee')) <> 1 then
        raise exception 'ECHEC 6j : le lecteur ne compte pas les moi aussi';
    end if;
    raise notice 'ok 6j';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 7. La conservation des votes.
-- ---------------------------------------------------------------------------
insert into public.votes (sujet, cible, jeton, valeur, poids, cree_le)
values ('sondage.choix', (select id::text from essai where nom = 'ouvert'), extensions.gen_random_bytes(32), 'a', 1, now() - interval '13 months');
select private.purger_votes();
do $$ begin
    if exists (select 1 from public.votes where cree_le < now() - interval '12 months') then raise exception 'ECHEC 7a : un vote d il y a treize mois'; end if;
    if (select count(*) from public.votes where sujet = 'sondage.choix') < 50 then raise exception 'ECHEC 7a : la purge efface trop'; end if;
    if not exists (select 1 from cron.job where jobname = 'votes-purge' and command = 'select private.purger_votes()') then
        raise exception 'ECHEC 7b : la tache planifiee';
    end if;
    raise notice 'ok 7a-7b';
end $$;

\echo 'recette terminee'
