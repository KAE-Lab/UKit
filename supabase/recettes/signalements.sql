-- La recette des signalements des lieux (docs/phase-8/2-signalements.md, plan de test), jouee **dans une
-- transaction annulee**, sur la production elle-meme, avant de pousser la migration, comme celle de la
-- communaute. Rien n'y survit : ni la migration, ni les reglages d'essai, ni les comptes d'essai, ni les
-- lignes, ni le journal.
--
--     (echo 'begin;'; cat supabase/migrations/20261125030000_signalements.sql supabase/recettes/signalements.sql; echo 'rollback;') \
--       | psql -h aws-0-eu-west-2.pooler.supabase.com -p 5432 -U postgres.<ref> -d postgres -v ON_ERROR_STOP=1 -q
--
-- Une fois la migration en production, elle se rejoue sans elle. Chaque cas leve une exception s'il
-- echoue et annonce `ok <n>` sinon. Elle suppose un admin dans `editeurs` ; le lecteur est d'essai.

\set QUIET on
\pset tuples_only on
\o /dev/null
set client_min_messages = notice;

delete from private.reglages_communaute;
insert into private.reglages_communaute (cle, valeur) values
    ('plafond_appareil_atteste', 20), ('plafond_appareil_non_atteste', 5), ('plafond_non_attestes_jour', 50),
    ('plafond_ip_jour', 200), ('plafond_verdicts_ip_jour', 50), ('plafond_ip_non_attestes_jour', 50),
    ('seuil_fiable', 99), ('anciennete_fiable_jours', 0),
    ('duree_direct_minutes', 30), ('duree_correction_jours', 30), ('fin_max_jours', 30);
insert into public.editeurs (email, role) values ('recette.lecteur@exemple.test', 'lecteur');

create function pg_temp.c(cle text, sujet text, cible text, valeur text, fin text default null, atteste boolean default true)
returns jsonb language plpgsql as $$
begin
    perform public.admettre(jsonb_build_object('empreinte_ip', encode(extensions.digest('ip-lot2', 'sha256'), 'hex'), 'verdict', false));
    return public.contribuer(jsonb_build_object(
        'appareil', jsonb_build_object('cle', encode(extensions.digest(cle, 'sha256'), 'hex'), 'nature', 'secret', 'plateforme', 'android', 'atteste', atteste),
        'empreinte_ip', encode(extensions.digest('ip-lot2', 'sha256'), 'hex'),
        'jeton_de_vote', encode(extensions.digest(cle || '|' || sujet || '|' || cible, 'sha256'), 'hex'),
        'contribution', jsonb_build_object('sujet', sujet, 'cible', cible, 'valeur', valeur, 'fin', fin),
        'essai', false));
end;
$$;

create function pg_temp.attendre(n text, r jsonb, statut text, raison text default null)
returns void language plpgsql as $$
begin
    if r ->> 'statut' is distinct from statut or (raison is not null and r ->> 'raison' is distinct from raison) then
        raise exception 'ECHEC % : attendu % %, obtenu %', n, statut, coalesce(raison, ''), r;
    end if;
    raise notice 'ok %', n;
end;
$$;

-- Le signalement le plus recent d'un appareil d'essai : `security definer`, parce qu'un compte de la
-- console ne lit pas la colonne `appareil`, et c'est justement ce qu'on eprouve.
create function pg_temp.id_de(p_cle text, p_sujet text, p_cible text) returns uuid
language sql security definer set search_path = '' as $$
    select id from public.signalements
     where appareil = extensions.digest(p_cle, 'sha256') and sujet = p_sujet and cible = p_cible
     order by cree_le desc limit 1;
$$;

grant execute on function pg_temp.c(text, text, text, text, text, boolean) to service_role;
grant execute on function pg_temp.attendre(text, jsonb, text, text) to service_role, authenticated;
grant execute on function pg_temp.id_de(text, text, text) to authenticated;

select jsonb_build_object('email', email)::text as claims_admin
  from public.editeurs where role = 'admin' order by email limit 1 \gset
\set claims_lecteur '{"email": "recette.lecteur@exemple.test"}'
\set claims_dehors '{"email": "recette.dehors@exemple.test"}'

-- ---------------------------------------------------------------------------
-- 1. Le vocabulaire : chaque type par lieu passe, une valeur hors vocabulaire non.
-- ---------------------------------------------------------------------------
set local role service_role;
do $$ begin
    if (select count(*) from public.sujets where sujet ~ '^(restaurant|bibliotheque|batiment)\.' and actif) <> 20 then
        raise exception 'ECHEC 1 : vingt sujets de lieu attendus';
    end if;
    raise notice 'ok 1';
end $$;
select pg_temp.attendre('2a', pg_temp.c('l2-a', 'restaurant.ferme', '921', 'oui'), 'acceptee');
select pg_temp.attendre('2b', pg_temp.c('l2-a', 'restaurant.ferme', '922', 'ferme'), 'refusee', 'valeur_invalide');
select pg_temp.attendre('2c', pg_temp.c('l2-a', 'restaurant.attente', '921', 'tres_long'), 'acceptee');
select pg_temp.attendre('2d', pg_temp.c('l2-a', 'restaurant.horaires', '921', 'a41f09c2|midi=1130-1345,soir=ferme'), 'acceptee');
select pg_temp.attendre('2e', pg_temp.c('l2-a', 'restaurant.horaires', '922', 'a41f09c2|midi=2530-1345'), 'refusee', 'valeur_invalide');
select pg_temp.attendre('2f', pg_temp.c('l2-a', 'restaurant.plat', '921', 'Poulet basquaise, riz'), 'acceptee');
select pg_temp.attendre('2g', pg_temp.c('l2-a', 'restaurant.plat', '922', E'deux\nlignes'), 'refusee', 'valeur_invalide');
select pg_temp.attendre('2h', pg_temp.c('l2-a', 'batiment.ferme_jusqu', 'bordeaux/A28', 'oui',
    ((now() at time zone 'Europe/Paris')::date + 3)::text), 'acceptee');
select pg_temp.attendre('2i', pg_temp.c('l2-a', 'batiment.ferme_jusqu', 'bordeaux/A29', 'oui'), 'refusee', 'fin_invalide');
select pg_temp.attendre('2j', pg_temp.c('l2-a', 'bibliotheque.ambiance', 'bu-1', 'papote'), 'acceptee');
do $$ begin
    if (select expire_le from public.signalements where id = pg_temp.id_de('l2-a', 'restaurant.horaires', '921'))
       < now() + interval '29 days' then
        raise exception 'ECHEC 2k : une correction vaut sa duree';
    end if;
    raise notice 'ok 2k';
end $$;
-- Trois voix sur 921 pour la suite : l2-b confirme l2-a (un point pour l2-a), l2-c dit l'inverse.
select pg_temp.attendre('2l', pg_temp.c('l2-b', 'restaurant.ferme', '921', 'oui'), 'acceptee');
select pg_temp.attendre('2m', pg_temp.c('l2-c', 'restaurant.ferme', '921', 'non'), 'acceptee');
do $$ begin
    if (select reputation from public.appareils where cle = extensions.digest('l2-a', 'sha256')) <> 1 then
        raise exception 'ECHEC 2n : la confirmation devait crediter l2-a';
    end if;
    raise notice 'ok 2n';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 2. Les etats officiels
-- ---------------------------------------------------------------------------
set local role anon;
do $$ begin insert into public.etats_officiels (sujet, cible, valeur, fin) values ('restaurant.ferme', '921', 'oui', current_date);
    raise exception 'ECHEC 3a : anon publie un etat officiel'; exception when insufficient_privilege then raise notice 'ok 3a'; end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = :'claims_lecteur';
do $$ begin insert into public.etats_officiels (sujet, cible, valeur, fin) values ('restaurant.ferme', '921', 'oui', current_date);
    raise exception 'ECHEC 3b : un lecteur publie un etat officiel'; exception when insufficient_privilege then raise notice 'ok 3b'; end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = :'claims_admin';
do $$
declare
    v_jour date := (now() at time zone 'Europe/Paris')::date;
    v_id   uuid;
begin
    insert into public.etats_officiels (sujet, cible, valeur, fin) values ('restaurant.ferme', '921', 'non', v_jour) returning id into v_id;
    if (select expire_le from public.etats_officiels where id = v_id) <> (v_jour + 1)::timestamp at time zone 'Europe/Paris' then
        raise exception 'ECHEC 3c : un etat officiel vaut jusqu au soir de sa fin';
    end if;
    if not exists (select 1 from public.journal where table_name = 'etats_officiels' and ligne_id = v_id::text and operation = 'INSERT') then
        raise exception 'ECHEC 3d : la publication est journalisee';
    end if;
    insert into public.etats_officiels (sujet, cible, valeur, fin) values ('restaurant.horaires', '921', 'a41f09c2|midi=1100-1400', v_jour + 30);
    raise notice 'ok 3c-3d';
end $$;
do $$ begin insert into public.etats_officiels (sujet, cible, valeur, fin) values ('restaurant.ferme', '921', 'ferme', current_date);
    raise exception 'ECHEC 3e'; exception when raise_exception then
    if sqlerrm like 'ECHEC%' then raise; end if; raise notice 'ok 3e (valeur hors vocabulaire)'; end $$;
do $$ begin insert into public.etats_officiels (sujet, cible, valeur, fin) values ('restaurant.ferme', '921', 'oui', current_date - 2);
    raise exception 'ECHEC 3f'; exception when raise_exception then
    if sqlerrm like 'ECHEC%' then raise; end if; raise notice 'ok 3f (fin passee)'; end $$;
do $$ begin insert into public.etats_officiels (sujet, cible, valeur, fin) values ('restaurant.ferme', '921', 'oui', current_date + 200);
    raise exception 'ECHEC 3g'; exception when raise_exception then
    if sqlerrm like 'ECHEC%' then raise; end if; raise notice 'ok 3g (trop loin)'; end $$;
do $$ begin insert into public.etats_officiels (sujet, cible, valeur, fin) values ('recette.inconnu', '921', 'oui', current_date);
    raise exception 'ECHEC 3h'; exception when raise_exception then
    if sqlerrm like 'ECHEC%' then raise; end if; raise notice 'ok 3h (sujet inconnu)'; end $$;
reset role;

-- Un etat passe, ecrit sous le declencheur : anon ne le lit plus, l'equipe si.
alter table public.etats_officiels disable trigger valider;
insert into public.etats_officiels (sujet, cible, valeur, fin, cree_le, expire_le)
values ('restaurant.izly', '921', 'oui', current_date - 1, now() - interval '2 days', now() - interval '1 day');
alter table public.etats_officiels enable trigger valider;

set local role anon;
do $$ begin
    if (select count(*) from public.etats_officiels where cible = '921') <> 2 then
        raise exception 'ECHEC 4a : anon lit les deux etats valables, pas le passe';
    end if;
    raise notice 'ok 4a';
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = :'claims_lecteur';
do $$ begin
    if (select count(*) from public.etats_officiels where cible = '921') <> 3 then raise exception 'ECHEC 4b : l equipe lit tout'; end if;
    raise notice 'ok 4b';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 3. La lecture de la moderation
-- ---------------------------------------------------------------------------
set local role anon;
do $$ begin perform public.signalements_a_moderer(now() - interval '1 day'); raise exception 'ECHEC 5a : anon lit la moderation';
exception when insufficient_privilege then raise notice 'ok 5a'; end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = :'claims_dehors';
do $$ begin perform public.signalements_a_moderer(now() - interval '1 day'); raise exception 'ECHEC 5b : un compte hors de l equipe';
exception when insufficient_privilege then raise notice 'ok 5b'; end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = :'claims_lecteur';
do $$
declare
    r record;
begin
    select * into r from public.signalements_a_moderer(now() - interval '1 hour') where cible = '921' and sujet = 'restaurant.ferme' and valeur = 'oui' limit 1;
    if not found or r.auteur_bloque or r.auteur_du_jour < 1 then
        raise exception 'ECHEC 5c : un editeur lit les signalements, et leur auteur sans la cle : %', r;
    end if;
    if (select auteur_du_jour from public.signalements_a_moderer(now() - interval '1 hour') where id = pg_temp.id_de('l2-a', 'restaurant.ferme', '921')) < 6 then
        raise exception 'ECHEC 5d : l2-a a ecrit six signalements ce jour-la';
    end if;
    raise notice 'ok 5c-5d';
end $$;
-- Le type rendu n'a pas de colonne de cle : la demander echoue.
do $$ begin perform appareil from public.signalements_a_moderer(now()); raise exception 'ECHEC 5e';
exception when undefined_column then raise notice 'ok 5e'; end $$;
-- Un lecteur ne modere pas.
do $$ begin perform public.moderer_signalement(pg_temp.id_de('l2-c', 'restaurant.ferme', '921'), 'masquer'); raise exception 'ECHEC 5f';
exception when insufficient_privilege then raise notice 'ok 5f'; end $$;
do $$ begin perform public.bloquer_auteur(pg_temp.id_de('l2-c', 'restaurant.ferme', '921'), true); raise exception 'ECHEC 5g';
exception when insufficient_privilege then raise notice 'ok 5g'; end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 4. Masquer et retablir
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = :'claims_admin';
do $$
declare
    v_id    uuid := pg_temp.id_de('l2-a', 'restaurant.ferme', '921');
    v_avant timestamptz := (select maj_le from public.signalements_a_moderer(now() - interval '1 hour') where id = pg_temp.id_de('l2-a', 'restaurant.ferme', '921'));
    r       jsonb;
begin
    perform pg_sleep(0.01);
    r := public.moderer_signalement(v_id, 'masquer');
    if r ->> 'statut' <> 'masquee' or not (r ->> 'change')::boolean then raise exception 'ECHEC 6a : %', r; end if;
    if (select statut from public.signalements_a_moderer(now() - interval '1 hour') where id = v_id) <> 'masquee'
       or (select maj_le from public.signalements_a_moderer(now() - interval '1 hour') where id = v_id) <= v_avant then
        raise exception 'ECHEC 6b : masquer fait bouger maj_le, que la lecture des appareils suit';
    end if;
    if (select apres ->> 'geste' from public.journal where table_name = 'signalements' and ligne_id = v_id::text order by id desc limit 1) <> 'masquer'
       or exists (select 1 from public.journal where table_name in ('signalements', 'appareils') and (apres ? 'appareil' or avant ? 'appareil')) then
        raise exception 'ECHEC 6c : le geste est journalise, sans la cle';
    end if;
    r := public.moderer_signalement(v_id, 'masquer');
    if (r ->> 'change')::boolean then raise exception 'ECHEC 6d : masquer deux fois ne change rien'; end if;
    raise notice 'ok 6a-6d';
end $$;
reset role;
do $$ begin
    if (select reputation from public.appareils where cle = extensions.digest('l2-a', 'sha256')) <> 0 then
        raise exception 'ECHEC 6e : masquer une voix confirmee retire son point';
    end if;
    raise notice 'ok 6e';
end $$;
-- La voix masquee reste lisible par anon, statut et valeur compris : la lecture incrementale l'apprend.
set local role anon;
do $$ begin
    if not exists (select 1 from public.signalements where cible = '921' and statut = 'masquee' and valeur = 'oui') then
        raise exception 'ECHEC 6f';
    end if;
    raise notice 'ok 6f';
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = :'claims_admin';
do $$
declare
    r jsonb;
begin
    r := public.moderer_signalement(pg_temp.id_de('l2-a', 'restaurant.ferme', '921'), 'retablir');
    if r ->> 'statut' <> 'active' then raise exception 'ECHEC 7a : retablie, la voix redevient active : %', r; end if;
    begin
        perform public.moderer_signalement(pg_temp.id_de('l2-a', 'restaurant.ferme', '921'), 'effacer');
        raise exception 'ECHEC 7b';
    exception when invalid_parameter_value then null;
    end;
    raise notice 'ok 7a-7b';
end $$;
reset role;
-- Une voix remplacee depuis se retablit remplacee : une seule voix vivante par appareil.
set local role service_role;
select pg_temp.attendre('7c', pg_temp.c('l2-d', 'restaurant.izly', '921', 'oui'), 'acceptee');
reset role;
create temporary table recette_ancienne as select pg_temp.id_de('l2-d', 'restaurant.izly', '921') as id;
grant select on recette_ancienne to authenticated;
set local role service_role;
select pg_temp.attendre('7d', pg_temp.c('l2-d', 'restaurant.izly', '921', 'non'), 'acceptee');
reset role;
set local role authenticated;
set local request.jwt.claims = :'claims_admin';
do $$
declare
    v_id uuid := (select id from recette_ancienne);
begin
    perform public.moderer_signalement(v_id, 'masquer');
    if public.moderer_signalement(v_id, 'retablir') ->> 'statut' <> 'remplacee' then
        raise exception 'ECHEC 7e : une voix devancee se retablit remplacee';
    end if;
    raise notice 'ok 7e';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 5. Bloquer et debloquer
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = :'claims_admin';
do $$
declare
    r jsonb := public.bloquer_auteur(pg_temp.id_de('l2-a', 'restaurant.ferme', '921'), true);
begin
    if not (r ->> 'bloque')::boolean or (r ->> 'voix_masquees')::int < 5 then
        raise exception 'ECHEC 8a : bloquer masque les voix vivantes de l appareil : %', r;
    end if;
    if (select bool_and(statut = 'masquee') from public.signalements_a_moderer(now() - interval '1 hour')
         where auteur_bloque) is not true then
        raise exception 'ECHEC 8b : un auteur bloque n a plus de voix vivante';
    end if;
    begin
        perform public.moderer_signalement(pg_temp.id_de('l2-a', 'restaurant.ferme', '921'), 'retablir');
        raise exception 'ECHEC 8c';
    exception when raise_exception then
        if sqlerrm like 'ECHEC%' then raise; end if;
    end;
    raise notice 'ok 8a-8c';
end $$;
reset role;
do $$ begin
    if (select bloque_le from public.appareils where cle = extensions.digest('l2-a', 'sha256')) <> date_trunc('day', now()) then
        raise exception 'ECHEC 8d : un blocage ne dit que le jour';
    end if;
    raise notice 'ok 8d';
end $$;
set local role service_role;
select pg_temp.attendre('8e', pg_temp.c('l2-a', 'restaurant.places', '921', 'oui'), 'refusee', 'appareil_bloque');
reset role;
set local role authenticated;
set local request.jwt.claims = :'claims_admin';
do $$ begin
    if (public.bloquer_auteur(pg_temp.id_de('l2-a', 'restaurant.ferme', '921'), false) ->> 'bloque')::boolean then
        raise exception 'ECHEC 8f';
    end if;
    raise notice 'ok 8f';
end $$;
reset role;
set local role service_role;
select pg_temp.attendre('8g', pg_temp.c('l2-a', 'restaurant.places', '921', 'oui'), 'acceptee');
reset role;
do $$ begin
    if not exists (select 1 from public.journal where table_name = 'appareils' and ligne_id like 'signalement %' and (apres ->> 'bloque')::boolean)
       or exists (select 1 from public.journal where table_name = 'appareils' and (apres::text like '%\\x%' or ligne_id ~ '[0-9a-f]{64}')) then
        raise exception 'ECHEC 8h : le blocage est journalise par son signalement, jamais par la cle';
    end if;
    raise notice 'ok 8h';
end $$;

\echo 'recette terminee'
