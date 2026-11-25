-- La recette des retours natifs (docs/phase-8/3-formulaire.md, plan de test), jouee **dans une
-- transaction annulee**, sur la production elle-meme, avant de pousser la migration, comme celles des
-- lots 1 et 2. Rien n'y survit : ni la migration, ni les reglages d'essai, ni les comptes d'essai, ni les
-- retours, les reponses, les problemes, les votes, ni le journal.
--
--     (echo 'begin;'; cat supabase/migrations/20261125040000_retours_natifs.sql supabase/recettes/retours.sql; echo 'rollback;') \
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
    ('plafond_ip_jour', 200), ('plafond_verdicts_ip_jour', 50), ('plafond_ip_non_attestes_jour', 2),
    ('seuil_fiable', 99), ('anciennete_fiable_jours', 0),
    ('duree_direct_minutes', 30), ('duree_correction_jours', 30), ('fin_max_jours', 30),
    ('plafond_retours_appareil', 2), ('plafond_retours_non_atteste', 1), ('plafond_retours_non_attestes_jour', 3);
insert into public.editeurs (email, role) values ('recette.lecteur@exemple.test', 'lecteur');

-- Un depot d'essai, comme la fonction `communaute` l'appelle : `cle` et `ip` sont des graines, le jeton
-- du jour en derive.
create function pg_temp.d(cle text, retour jsonb, atteste boolean default true, ip text default 'ip-lot3',
                          nature text default 'secret', compteur bigint default null)
returns jsonb language plpgsql as $$
begin
    return public.deposer_retour(jsonb_build_object(
        'appareil', jsonb_strip_nulls(jsonb_build_object(
            'cle', encode(extensions.digest(cle, 'sha256'), 'hex'), 'nature', nature,
            'plateforme', case when nature = 'app_attest' then 'ios' else 'android' end,
            'atteste', atteste, 'compteur', compteur)),
        'empreinte_ip', encode(extensions.digest(ip, 'sha256'), 'hex'),
        'jeton', encode(extensions.digest(cle || '|retour', 'sha256'), 'hex'),
        'retour', retour));
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

-- La cle de reponse d'essai : 32 octets, en base64 pour l'appareil, son empreinte en hexadecimal pour le depot.
create function pg_temp.cle(graine text) returns text language sql as $$ select encode(extensions.digest(graine, 'sha256'), 'base64') $$;
create function pg_temp.empreinte(graine text) returns text language sql as $$
    select encode(extensions.digest(extensions.digest(graine, 'sha256'), 'sha256'), 'hex') $$;

grant execute on function pg_temp.d(text, jsonb, boolean, text, text, bigint) to service_role;
grant execute on function pg_temp.attendre(text, jsonb, text, text) to service_role;
grant execute on function pg_temp.cle(text) to anon, authenticated, service_role;
grant execute on function pg_temp.empreinte(text) to service_role;

select jsonb_build_object('email', email)::text as claims_admin
  from public.editeurs where role = 'admin' order by email limit 1 \gset
\set claims_lecteur '{"email": "recette.lecteur@exemple.test"}'

-- ---------------------------------------------------------------------------
-- 1. Aucune ecriture pour anon ni pour un compte, ni par les portes, ni par les tables.
-- ---------------------------------------------------------------------------
set local role anon;
do $$ begin perform public.deposer_retour('{}'::jsonb); raise exception 'ECHEC 1a : anon depose';
exception when insufficient_privilege then raise notice 'ok 1a'; end $$;
do $$ begin perform public.captures_a_purger(); raise exception 'ECHEC 1b : anon liste la purge';
exception when insufficient_privilege then raise notice 'ok 1b'; end $$;
do $$ begin perform public.captures_purgees('{}'); raise exception 'ECHEC 1c : anon marque la purge';
exception when insufficient_privilege then raise notice 'ok 1c'; end $$;
do $$ begin insert into public.retours (id, recu_le, texte, reponses) values (repeat('a', 64), now(), 'x', '{}'); raise exception 'ECHEC 1d : anon ecrit un retour';
exception when insufficient_privilege then raise notice 'ok 1d'; end $$;
do $$ begin insert into public.problemes_connus (titre) values ('essai'); raise exception 'ECHEC 1e : anon publie un probleme';
exception when insufficient_privilege then raise notice 'ok 1e'; end $$;
do $$ begin perform 1 from public.retours_reponses; raise exception 'ECHEC 1f : anon lit les reponses';
exception when insufficient_privilege then raise notice 'ok 1f'; end $$;
do $$ begin perform 1 from private.retours_par_appareil; raise exception 'ECHEC 1g : anon lit les jetons';
exception when insufficient_privilege then raise notice 'ok 1g'; end $$;
do $$ begin perform 1 from public.retours; raise exception 'ECHEC 1h : anon lit les retours';
exception when insufficient_privilege then raise notice 'ok 1h'; end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = :'claims_admin';
do $$ begin perform public.deposer_retour('{}'::jsonb); raise exception 'ECHEC 1i : un admin depose en direct';
exception when insufficient_privilege then raise notice 'ok 1i'; end $$;
do $$ begin insert into public.retours (id, recu_le, texte, reponses) values (repeat('a', 64), now(), 'x', '{}'); raise exception 'ECHEC 1j : un admin cree un retour';
exception when insufficient_privilege then raise notice 'ok 1j'; end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 2. Le depot : la forme, les plafonds, l'appareil, la ligne.
-- ---------------------------------------------------------------------------
set local role service_role;
do $$ begin perform public.deposer_retour('{"appareil": {}, "retour": {}}'::jsonb); raise exception 'ECHEC 2a : une forme fausse passe';
exception when sqlstate '22023' then raise notice 'ok 2a'; end $$;

do $$
declare
    r jsonb;
    l public.retours%rowtype;
begin
    r := pg_temp.d('lot3-a', jsonb_build_object('nature', 'bug', 'texte', 'Le menu ne s affiche plus', 'captures', 2,
        'cle_reponse', pg_temp.empreinte('reponse-a'),
        'contexte', jsonb_build_object('version', '7.0.0', 'appareil', 'Pixel 7', 'systeme', 'Android 15', 'onglet', 'Campus',
                                       'reseau', 'wifi', 'parcours', jsonb_build_array('CampusTab', 'CrousMenu'),
                                       'erreur', jsonb_build_object('hote', 'api.croustillant.menu', 'famille', 'network'))));
    perform pg_temp.attendre('2b', r, 'acceptee');
    select * into l from public.retours where id = r ->> 'id';
    if l.source <> 'app' or not l.atteste or l.captures <> 2 or not l.reponse_possible or l.appareil <> 'Pixel 7'
       or l.systeme <> 'Android 15' or l.version_app <> '7.0.0' or l.section <> 'Campus' or l.etat <> 'nouveau'
       or l.reponses <> '{}'::jsonb or l.contact is not null or l.id !~ '^[0-9a-f]{64}$' then
        raise exception 'ECHEC 2c : la ligne deposee %', to_jsonb(l);
    end if;
    raise notice 'ok 2c';
end $$;

-- Un depot rejoue retrouve sa ligne, sans rien compter : ni doublon, ni le plafond de l'appareil.
do $$
declare
    premier jsonb;
    second  jsonb;
begin
    premier := pg_temp.d('lot3-rejeu', jsonb_build_object('depot', '7d1f2e3a-4b5c-4d6e-8f70-112233445566', 'nature', 'bug',
        'texte', 'Rejoue apres une reponse perdue', 'captures', 1, 'cle_reponse', pg_temp.empreinte('reponse-rejeu')));
    second := pg_temp.d('lot3-rejeu', jsonb_build_object('depot', '7d1f2e3a-4b5c-4d6e-8f70-112233445566', 'nature', 'bug',
        'texte', 'Rejoue apres une reponse perdue', 'captures', 1, 'cle_reponse', pg_temp.empreinte('reponse-rejeu')));
    if premier ->> 'statut' <> 'acceptee' or second ->> 'statut' <> 'acceptee' or (second ->> 'deja')::boolean is distinct from true
       or premier ->> 'id' <> second ->> 'id' or (second ->> 'captures')::integer <> 1
       or (select count(*) from public.retours where texte = 'Rejoue apres une reponse perdue') <> 1 then
        raise exception 'ECHEC 2w : un depot rejoue % puis %', premier, second;
    end if;
    raise notice 'ok 2w';
end $$;

-- Le plafond du jour de l'appareil atteste (2), puis le non atteste (1).
select pg_temp.attendre('2d', pg_temp.d('lot3-a', '{"nature": "fonctionnalite", "texte": "Une idee de plus"}'), 'acceptee');
select pg_temp.attendre('2e', pg_temp.d('lot3-a', '{"nature": "fonctionnalite", "texte": "Une troisieme"}'), 'refusee', 'plafond_appareil');
select pg_temp.attendre('2f', pg_temp.d('lot3-b', '{"nature": "bug", "texte": "Non atteste"}', false), 'acceptee');
do $$ begin
    if (select atteste from public.retours where texte = 'Non atteste') is distinct from false then
        raise exception 'ECHEC 2g : un retour non atteste doit le dire';
    end if;
    raise notice 'ok 2g';
end $$;
select pg_temp.attendre('2h', pg_temp.d('lot3-b', '{"nature": "bug", "texte": "Encore"}', false), 'refusee', 'plafond_appareil');
-- Le parc non atteste (3 par jour) : deux de plus passent, le quatrieme est refuse.
select pg_temp.attendre('2i', pg_temp.d('lot3-c', '{"nature": "bug", "texte": "Non atteste 2"}', false, 'ip-lot3-c'), 'acceptee');
select pg_temp.attendre('2j', pg_temp.d('lot3-d', '{"nature": "bug", "texte": "Non atteste 3"}', false, 'ip-lot3-d'), 'acceptee');
select pg_temp.attendre('2k', pg_temp.d('lot3-e', '{"nature": "bug", "texte": "Non atteste 4"}', false, 'ip-lot3-e'), 'refusee', 'plafond_non_attestes');
-- Le plafond non atteste de l'adresse (2, partage avec les contributions) : deja deux sur ip-lot3.
select pg_temp.attendre('2l', pg_temp.d('lot3-f', '{"nature": "bug", "texte": "Meme adresse"}', false), 'refusee', 'plafond_ip');

-- L'appareil : bloque, App Attest inconnu, compteur rejoue.
insert into public.appareils (cle, nature, plateforme, bloque_le) values (extensions.digest('lot3-bloque', 'sha256'), 'secret', 'android', now());
select pg_temp.attendre('2m', pg_temp.d('lot3-bloque', '{"nature": "bug", "texte": "Bloque"}'), 'refusee', 'appareil_bloque');
select pg_temp.attendre('2n', pg_temp.d('lot3-inconnu', '{"nature": "bug", "texte": "Inconnu"}', true, 'ip-lot3', 'app_attest', 5), 'refusee', 'appareil_inconnu');
insert into public.appareils (cle, nature, plateforme, cle_publique, environnement, compteur)
values (extensions.digest('lot3-ios', 'sha256'), 'app_attest', 'ios', extensions.digest('p', 'sha256') || extensions.digest('q', 'sha256') || '\x04'::bytea, 'production', 7);
select pg_temp.attendre('2o', pg_temp.d('lot3-ios', '{"nature": "bug", "texte": "Rejoue"}', true, 'ip-lot3', 'app_attest', 7), 'refusee', 'compteur_rejoue');
select pg_temp.attendre('2p', pg_temp.d('lot3-ios', '{"nature": "bug", "texte": "iPhone"}', true, 'ip-lot3', 'app_attest', 8), 'acceptee');
do $$ begin
    if (select compteur from public.appareils where cle = extensions.digest('lot3-ios', 'sha256')) <> 8 then
        raise exception 'ECHEC 2q : le compteur App Attest doit monter';
    end if;
    raise notice 'ok 2q';
end $$;

-- Le contenu, case par case : chaque refus avec un appareil neuf, sous le plafond.
do $$
declare
    cas jsonb;
    i integer := 0;
begin
    foreach cas in array array[
        '{"nature": "autre", "texte": "Nature hors liste"}',
        '{"nature": "bug", "texte": "ab"}',
        jsonb_build_object('nature', 'bug', 'texte', repeat('x', 2001)),
        '{"nature": "campus", "texte": ""}',
        '{"nature": "bug", "texte": "Un campus sur un bug", "campus": "Agen"}',
        '{"nature": "campus", "campus": "Agen", "volontaire": true}',
        '{"nature": "campus", "campus": "Agen", "contact": "a@b.fr"}',
        '{"nature": "campus", "campus": "Agen", "volontaire": true, "contact": "pas une adresse"}',
        '{"nature": "bug", "texte": "Quatre captures", "captures": 4}',
        '{"nature": "bug", "texte": "Contexte inconnu", "contexte": {"position": "44.8,-0.6"}}',
        jsonb_build_object('nature', 'bug', 'texte', 'Contexte trop gros', 'contexte', jsonb_build_object('parcours', repeat('x', 9000))),
        '{"nature": "bug", "texte": "Cle trop courte", "cle_reponse": "abcd"}'
    ]::jsonb[] loop
        i := i + 1;
        perform pg_temp.attendre('2r' || i, pg_temp.d('lot3-contenu-' || i, cas), 'refusee', 'retour_invalide');
    end loop;
end $$;

-- La demande de campus du volontaire, son adresse dans sa colonne ; un probleme inconnu ne lie rien.
select pg_temp.attendre('2s', pg_temp.d('lot3-g', '{"nature": "campus", "campus": "IUT de Perigueux", "texte": "", "volontaire": true, "contact": "volontaire@exemple.test"}'), 'acceptee');
do $$ begin
    if (select contact from public.retours where campus = 'IUT de Perigueux') <> 'volontaire@exemple.test'
       or not (select volontaire from public.retours where campus = 'IUT de Perigueux') then
        raise exception 'ECHEC 2t : le volontaire et son adresse';
    end if;
    raise notice 'ok 2t';
end $$;
select pg_temp.attendre('2u', pg_temp.d('lot3-h', '{"nature": "bug", "texte": "Un detail", "probleme": "00000000-0000-4000-8000-000000000000"}'), 'acceptee');
do $$ begin
    if (select probleme from public.retours where texte = 'Un detail') is not null then
        raise exception 'ECHEC 2v : un probleme inconnu ne se lie pas';
    end if;
    raise notice 'ok 2v';
end $$;
reset role;
do $$ begin
    if (select n from private.retours_par_appareil where jeton = extensions.digest('lot3-rejeu|retour', 'sha256')) <> 1 then
        raise exception 'ECHEC 2x : un depot rejoue compte au plafond de l appareil';
    end if;
    raise notice 'ok 2x';
end $$;
-- Rejoue apres la cloture : plus de capture a deposer, la purge ne la reprendrait pas.
update public.retours set etat = 'traite' where texte = 'Rejoue apres une reponse perdue';
set local role service_role;
do $$ begin
    if (pg_temp.d('lot3-rejeu', jsonb_build_object('depot', '7d1f2e3a-4b5c-4d6e-8f70-112233445566', 'nature', 'bug',
            'texte', 'Rejoue apres une reponse perdue', 'captures', 1)) ->> 'captures')::integer <> 0 then
        raise exception 'ECHEC 2y : un depot rejoue apres la cloture rouvre ses captures';
    end if;
    raise notice 'ok 2y';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 3. Les problemes connus, et le detail qui s'y range.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = :'claims_lecteur';
do $$ begin insert into public.problemes_connus (titre) values ('Un lecteur publie'); raise exception 'ECHEC 3a : un lecteur publie un probleme';
exception when insufficient_privilege then raise notice 'ok 3a'; end $$;
set local request.jwt.claims = :'claims_admin';
insert into public.problemes_connus (id, titre, detail, statut, plateformes)
values ('11111111-1111-4111-8111-111111111111', 'Le menu du RU reste vide', 'Depuis la 7.0.0, sur Android.', 'publie', '{android}'),
       ('22222222-2222-4222-8222-222222222222', 'Un brouillon', null, 'brouillon', null);
do $$
declare
    v_avant timestamptz := (select maj_le from public.problemes_connus where id = '11111111-1111-4111-8111-111111111111');
begin
    update public.problemes_connus set titre = 'Le menu du RU reste vide sur Android' where id = '11111111-1111-4111-8111-111111111111';
    if (select maj_le from public.problemes_connus where id = '11111111-1111-4111-8111-111111111111') <= v_avant then
        raise exception 'ECHEC 3b : maj_le doit avancer';
    end if;
    if not exists (select 1 from public.journal where table_name = 'problemes_connus' and ligne_id = '11111111-1111-4111-8111-111111111111') then
        raise exception 'ECHEC 3c : la publication doit se journaliser';
    end if;
    raise notice 'ok 3b-3c';
end $$;
do $$ begin
    insert into public.problemes_connus (titre, plateformes) values ('Plateforme inconnue', '{web}');
    raise exception 'ECHEC 3d : une plateforme hors liste passe';
exception when check_violation then raise notice 'ok 3d'; end $$;
reset role;

set local role anon;
do $$ begin
    if not exists (select 1 from public.problemes_connus where id = '11111111-1111-4111-8111-111111111111')
       or exists (select 1 from public.problemes_connus where id = '22222222-2222-4222-8222-222222222222') then
        raise exception 'ECHEC 3e : anon lit les publies, jamais un brouillon';
    end if;
    raise notice 'ok 3e';
end $$;
reset role;

set local role service_role;
select pg_temp.attendre('3f', pg_temp.d('lot3-i', '{"nature": "bug", "texte": "Pareil chez moi", "probleme": "11111111-1111-4111-8111-111111111111"}'), 'acceptee');
select pg_temp.attendre('3g', pg_temp.d('lot3-j', '{"nature": "bug", "texte": "Sur un brouillon", "probleme": "22222222-2222-4222-8222-222222222222"}'), 'acceptee');
do $$ begin
    if (select probleme from public.retours where texte = 'Pareil chez moi') <> '11111111-1111-4111-8111-111111111111'
       or (select probleme from public.retours where texte = 'Sur un brouillon') is not null then
        raise exception 'ECHEC 3h : le detail se range sous un probleme publie, jamais sous un brouillon';
    end if;
    raise notice 'ok 3h';
end $$;

-- « Moi aussi » : un vote du lot 1, la forme du contexte, un seul par appareil.
create function pg_temp.v(cle text, valeur text) returns jsonb language plpgsql as $$
begin
    perform public.admettre(jsonb_build_object('empreinte_ip', encode(extensions.digest('ip-lot3-vote', 'sha256'), 'hex'), 'verdict', false));
    return public.contribuer(jsonb_build_object(
        'appareil', jsonb_build_object('cle', encode(extensions.digest(cle, 'sha256'), 'hex'), 'nature', 'secret', 'plateforme', 'android', 'atteste', true),
        'empreinte_ip', encode(extensions.digest('ip-lot3-vote', 'sha256'), 'hex'),
        'jeton_de_vote', encode(extensions.digest(cle || '|probleme.moi_aussi|11111111-1111-4111-8111-111111111111', 'sha256'), 'hex'),
        'contribution', jsonb_build_object('sujet', 'probleme.moi_aussi', 'cible', '11111111-1111-4111-8111-111111111111', 'valeur', valeur),
        'essai', false));
end;
$$;
select pg_temp.attendre('3i', pg_temp.v('lot3-vote', 'android|Pixel 7|Android 15|7.0.0'), 'acceptee');
select pg_temp.attendre('3j', pg_temp.v('lot3-vote', 'android|Pixel 7|Android 15|7.0.0'), 'refusee', 'deja_vote');
select pg_temp.attendre('3k', pg_temp.v('lot3-vote-2', 'un texte libre'), 'refusee', 'valeur_invalide');
select pg_temp.attendre('3l', pg_temp.v('lot3-vote-3', 'web|Pixel|Android 15|7.0.0'), 'refusee', 'valeur_invalide');
reset role;

-- ---------------------------------------------------------------------------
-- 4. La lecture de l'equipe : les colonnes neuves, jamais la cle ni l'adresse.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = :'claims_lecteur';
do $$ begin
    if not exists (select source, contexte, captures, probleme, atteste, reponse_possible, clos_le, captures_purgees_le
                     from public.retours where source = 'app') then
        raise exception 'ECHEC 4a : un lecteur lit les retours natifs';
    end if;
    raise notice 'ok 4a';
end $$;
do $$ begin perform cle_reponse from public.retours; raise exception 'ECHEC 4b : la cle de reponse se lit';
exception when insufficient_privilege then raise notice 'ok 4b'; end $$;
do $$ begin perform contact from public.retours; raise exception 'ECHEC 4c : l adresse se lit hors de sa porte';
exception when insufficient_privilege then raise notice 'ok 4c'; end $$;
do $$ begin perform public.contact_du_retour((select id from public.retours where campus = 'IUT de Perigueux')); raise exception 'ECHEC 4d : un lecteur lit l adresse';
exception when insufficient_privilege then raise notice 'ok 4d'; end $$;
set local request.jwt.claims = :'claims_admin';
do $$ begin
    if public.contact_du_retour((select id from public.retours where campus = 'IUT de Perigueux')) <> 'volontaire@exemple.test' then
        raise exception 'ECHEC 4e : un admin lit l adresse du volontaire';
    end if;
    raise notice 'ok 4e';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 5. La reponse : un admin repond a qui l'accepte, l'appareil la lit par sa cle.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = :'claims_lecteur';
do $$ begin
    insert into public.retours_reponses (retour, texte) select id, 'Un lecteur repond' from public.retours where texte = 'Le menu ne s affiche plus';
    raise exception 'ECHEC 5a : un lecteur repond';
exception when insufficient_privilege then raise notice 'ok 5a'; end $$;
set local request.jwt.claims = :'claims_admin';
do $$ begin
    insert into public.retours_reponses (retour, texte) select id, 'Sans accord' from public.retours where texte = 'Une idee de plus';
    raise exception 'ECHEC 5b : une reponse a un retour qui ne l accepte pas';
exception when insufficient_privilege then raise notice 'ok 5b'; end $$;
insert into public.retours_reponses (retour, texte) select id, 'Corrige dans la 7.0.1, merci.' from public.retours where texte = 'Le menu ne s affiche plus';
update public.retours set etat = 'traite' where texte = 'Le menu ne s affiche plus';
do $$ begin
    if (select clos_le from public.retours where texte = 'Le menu ne s affiche plus') is null then
        raise exception 'ECHEC 5c : la cloture doit se dater';
    end if;
    raise notice 'ok 5c';
end $$;
reset role;

set local role anon;
do $$
declare
    r jsonb := public.lire_mes_retours(array[pg_temp.cle('reponse-a'), pg_temp.cle('inconnue'), 'pas du base64 !']);
begin
    if jsonb_array_length(r) <> 3 or r -> 0 ->> 'etat' <> 'traite' or r -> 0 -> 'clos_le' = 'null'::jsonb
       or r -> 0 -> 'reponses' -> 0 ->> 'texte' <> 'Corrige dans la 7.0.1, merci.'
       or r -> 1 <> 'null'::jsonb or r -> 2 <> 'null'::jsonb or r -> 0 ? 'id' or r -> 0 ? 'texte' then
        raise exception 'ECHEC 5d : la lecture par cle %', r;
    end if;
    raise notice 'ok 5d';
end $$;
do $$ begin perform public.lire_mes_retours(array_fill('x'::text, array[21])); raise exception 'ECHEC 5e : vingt et une cles';
exception when sqlstate '22023' then raise notice 'ok 5e'; end $$;
do $$ begin
    if (select provolatile from pg_proc where oid = 'public.lire_mes_retours(text[])'::regprocedure) <> 'v' then
        raise exception 'ECHEC 5f : la lecture doit rester volatile (POST seulement)';
    end if;
    raise notice 'ok 5f';
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = :'claims_admin';
update public.retours set etat = 'en_attente' where texte = 'Le menu ne s affiche plus';
do $$ begin
    if (select clos_le from public.retours where texte = 'Le menu ne s affiche plus') is not null then
        raise exception 'ECHEC 5g : un retour rouvert perd sa cloture';
    end if;
    raise notice 'ok 5g';
end $$;
do $$ begin
    update public.retours set texte = 'reecrit' where texte = 'Le menu ne s affiche plus';
    raise exception 'ECHEC 5h : un admin reecrit le texte';
exception when insufficient_privilege then raise notice 'ok 5h'; end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 6. La purge des captures et des jetons.
-- ---------------------------------------------------------------------------
update public.retours set etat = 'traite' where texte = 'Le menu ne s affiche plus';
update public.retours set clos_le = now() - interval '31 days' where texte = 'Le menu ne s affiche plus';
set local role service_role;
do $$
declare
    ids text[] := public.captures_a_purger();
    l_id text := (select id from public.retours where texte = 'Le menu ne s affiche plus');
begin
    if not (l_id = any (ids)) then
        raise exception 'ECHEC 6a : une capture close depuis trente et un jours est due';
    end if;
    if (select id from public.retours where texte = 'Une idee de plus') = any (ids) then
        raise exception 'ECHEC 6b : un retour sans capture n est pas du';
    end if;
    if public.captures_purgees(array[l_id]) <> 1 then
        raise exception 'ECHEC 6c : marquer une capture due';
    end if;
    if public.captures_purgees(array[l_id]) <> 0 or l_id = any (public.captures_a_purger()) then
        raise exception 'ECHEC 6c : une fois marquee, elle n est plus due';
    end if;
    raise notice 'ok 6a-6c';
end $$;
reset role;
insert into private.retours_par_appareil (jour, jeton, n) values ((now() at time zone 'Europe/Paris')::date - 1, extensions.digest('hier', 'sha256'), 3);
select private.purger_retours();
do $$ begin
    if exists (select 1 from private.retours_par_appareil where jour < (now() at time zone 'Europe/Paris')::date)
       or not exists (select 1 from private.retours_par_appareil where jour = (now() at time zone 'Europe/Paris')::date) then
        raise exception 'ECHEC 6d : la purge efface hier et garde aujourd hui';
    end if;
    if not exists (select 1 from cron.job where jobname = 'retours-purge' and command = 'select private.purger_retours()') then
        raise exception 'ECHEC 6e : la tache horaire';
    end if;
    raise notice 'ok 6d-6e';
end $$;

-- ---------------------------------------------------------------------------
-- 7. L'espace des captures : prive, lu par un admin seul.
-- ---------------------------------------------------------------------------
do $$ begin
    if (select public from storage.buckets where id = 'retours') or (select file_size_limit from storage.buckets where id = 'retours') > 1048576
       or (select allowed_mime_types from storage.buckets where id = 'retours') <> array['image/jpeg'] then
        raise exception 'ECHEC 7a : l espace des captures';
    end if;
    raise notice 'ok 7a';
end $$;
insert into storage.objects (bucket_id, name) values ('retours', 'recette/1.jpg');
set local role anon;
do $$ begin
    if exists (select 1 from storage.objects where bucket_id = 'retours') then raise exception 'ECHEC 7b : anon voit une capture'; end if;
    raise notice 'ok 7b';
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims = :'claims_lecteur';
do $$ begin
    if exists (select 1 from storage.objects where bucket_id = 'retours') then raise exception 'ECHEC 7c : un lecteur voit une capture'; end if;
    raise notice 'ok 7c';
end $$;
set local request.jwt.claims = :'claims_admin';
do $$ begin
    if not exists (select 1 from storage.objects where bucket_id = 'retours' and name = 'recette/1.jpg') then raise exception 'ECHEC 7d : un admin voit les captures'; end if;
    raise notice 'ok 7d';
end $$;
do $$ begin
    insert into storage.objects (bucket_id, name) values ('retours', 'recette/2.jpg');
    raise exception 'ECHEC 7e : un admin televerse en direct';
exception when insufficient_privilege then raise notice 'ok 7e'; end $$;
reset role;

\echo 'recette terminee'
