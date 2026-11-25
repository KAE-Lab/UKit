-- La recette de la base communautaire (docs/phase-8/1-base-communautaire.md, plan de test), jouee
-- **dans une transaction annulee**, sur la production elle-meme, avant de pousser la migration — la
-- methode de 7-H (supabase/README.md#migrations). Rien n'y survit : ni la migration, ni les reglages
-- d'essai, ni les sujets d'essai, ni les lignes.
--
--     (echo 'begin;'; cat supabase/migrations/20261125020000_communaute.sql supabase/recettes/communaute.sql; echo 'rollback;') \
--       | psql -h aws-0-eu-west-2.pooler.supabase.com -p 5432 -U postgres.<ref> -d postgres -v ON_ERROR_STOP=1 -q
--
-- Une fois la migration en production, la recette se rejoue sans elle (le `cat` de la recette seule) :
-- elle ne suppose que les tables et les fonctions. Chaque cas leve une exception s'il echoue — la
-- transaction s'arrete la — et annonce `ok <n>` sinon. Les reglages et les sujets sont ceux de la
-- recette, pas ceux de la production.

\set QUIET on
\pset tuples_only on
-- Les resultats des requetes ne disent rien : chaque cas parle par ses `notice`, sur la sortie d'erreur.
\o /dev/null
set client_min_messages = notice;

-- Les reglages et le vocabulaire d'essai, dans la transaction seulement.
delete from private.reglages_communaute;
insert into private.reglages_communaute (cle, valeur) values
    ('plafond_appareil_atteste', 3), ('plafond_appareil_non_atteste', 1), ('plafond_non_attestes_jour', 2),
    ('plafond_ip_jour', 40), ('seuil_fiable', 1), ('anciennete_fiable_jours', 0),
    ('duree_direct_minutes', 30), ('duree_correction_jours', 30), ('fin_max_jours', 30);
insert into public.sujets (sujet, nature, domaine, famille, valeurs, forme) values
    ('recette.ferme',   'signalement', 'restaurant', 'jour',   '{ferme,ouvert}', null),
    ('recette.attente', 'signalement', 'restaurant', 'direct', '{fluide,attend,tres_long}', null),
    ('recette.jusqu',   'signalement', 'batiment',   'date',   '{ferme}', null),
    ('recette.plat',    'signalement', 'restaurant', 'jour',   null, '^[a-z0-9 -]{1,60}$'),
    ('recette.sondage', 'vote',        'annonce',    null,     '{a,b}', null);

-- Une contribution d'essai, construite a partir d'octets lisibles : `cle` et `ip` sont des graines.
create function pg_temp.c(cle text, nature text, atteste boolean, sujet text, cible text, valeur text,
                          ip text default 'ip-a', compteur bigint default null, fin text default null,
                          essai boolean default false)
returns jsonb language sql as $$
    select public.contribuer(jsonb_build_object(
        'appareil', jsonb_strip_nulls(jsonb_build_object(
            'cle', encode(extensions.digest(cle, 'sha256'), 'hex'), 'nature', nature,
            'plateforme', case when nature = 'app_attest' then 'ios' else 'android' end,
            'atteste', atteste, 'compteur', compteur)),
        'empreinte_ip', encode(extensions.digest(ip, 'sha256'), 'hex'),
        'contribution', jsonb_build_object('sujet', sujet, 'cible', cible, 'valeur', valeur, 'fin', fin),
        'essai', essai));
$$;

create function pg_temp.attendre(n integer, r jsonb, statut text, raison text default null)
returns void language plpgsql as $$
begin
    if r ->> 'statut' is distinct from statut or (raison is not null and r ->> 'raison' is distinct from raison) then
        raise exception 'ECHEC % : attendu % %, obtenu %', n, statut, coalesce(raison, ''), r;
    end if;
    raise notice 'ok %', n;
end;
$$;

grant execute on function pg_temp.c(text, text, boolean, text, text, text, text, bigint, text, boolean) to service_role;
grant execute on function pg_temp.attendre(integer, jsonb, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 1. Aucune ecriture pour anon ni pour un compte authentifie, ni par les portes, ni par les tables.
-- ---------------------------------------------------------------------------
set local role anon;
do $$ begin perform public.contribuer('{}'::jsonb); raise exception 'ECHEC 1a : anon appelle contribuer';
exception when insufficient_privilege then raise notice 'ok 1a'; end $$;
do $$ begin perform public.enregistrer_appareil('{}'::jsonb); raise exception 'ECHEC 1b : anon appelle enregistrer_appareil';
exception when insufficient_privilege then raise notice 'ok 1b'; end $$;
do $$ begin insert into public.signalements (sujet, cible, valeur, poids, expire_le, appareil)
    values ('recette.ferme', 'x', 'ferme', 2, now() + interval '1 hour', '\x00'); raise exception 'ECHEC 1c';
exception when insufficient_privilege then raise notice 'ok 1c'; end $$;
do $$ begin insert into public.appareils (cle, nature, plateforme) values (extensions.digest('z', 'sha256'), 'secret', 'android');
    raise exception 'ECHEC 1d'; exception when insufficient_privilege then raise notice 'ok 1d'; end $$;
do $$ begin insert into public.votes (sujet, cible, appareil, valeur, poids) values ('recette.sondage', 'x', '\x00', 'a', 2);
    raise exception 'ECHEC 1e'; exception when insufficient_privilege then raise notice 'ok 1e'; end $$;
do $$ begin insert into public.empreintes_ip (jour, empreinte) values (current_date, extensions.digest('z', 'sha256'));
    raise exception 'ECHEC 1f'; exception when insufficient_privilege then raise notice 'ok 1f'; end $$;
do $$ begin insert into public.sujets (sujet, nature, domaine, famille, valeurs) values ('recette.intrus', 'vote', 'x', null, '{a}');
    raise exception 'ECHEC 1g'; exception when insufficient_privilege then raise notice 'ok 1g'; end $$;
do $$ begin update public.signalements set poids = 2; raise exception 'ECHEC 1h';
exception when insufficient_privilege then raise notice 'ok 1h'; end $$;
do $$ begin delete from public.signalements; raise exception 'ECHEC 1i';
exception when insufficient_privilege then raise notice 'ok 1i'; end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"email": "recette.sans.droits@exemple.test"}';
do $$ begin perform public.contribuer('{}'::jsonb); raise exception 'ECHEC 1j : authenticated appelle contribuer';
exception when insufficient_privilege then raise notice 'ok 1j'; end $$;
do $$ begin perform public.enregistrer_appareil('{}'::jsonb); raise exception 'ECHEC 1k';
exception when insufficient_privilege then raise notice 'ok 1k'; end $$;
do $$ begin insert into public.signalements (sujet, cible, valeur, poids, expire_le, appareil)
    values ('recette.ferme', 'x', 'ferme', 2, now() + interval '1 hour', '\x00'); raise exception 'ECHEC 1l';
exception when insufficient_privilege then raise notice 'ok 1l'; end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 2. Les contributions, par le service_role.
-- ---------------------------------------------------------------------------
set local role service_role;

-- Une forme fausse leve : elle aurait du etre filtree avant.
do $$ begin perform public.contribuer('{}'::jsonb); raise exception 'ECHEC 2a';
exception when invalid_parameter_value then raise notice 'ok 2a'; end $$;
do $$ begin perform public.contribuer('{"appareil": {"cle": "zz"}, "contribution": {}}'::jsonb); raise exception 'ECHEC 2b';
exception when invalid_parameter_value then raise notice 'ok 2b'; end $$;

-- Non atteste : une voix de poids 0, puis le plafond bas de l'appareil.
select pg_temp.attendre(3, pg_temp.c('na-1', 'secret', false, 'recette.ferme', '21', 'ferme'), 'acceptee');
do $$ begin if (select poids from public.signalements where appareil = extensions.digest('na-1', 'sha256')) <> 0
    then raise exception 'ECHEC 4 : une voix non attestee compte'; end if; raise notice 'ok 4'; end $$;
select pg_temp.attendre(5, pg_temp.c('na-1', 'secret', false, 'recette.ferme', '22', 'ferme'), 'refusee', 'plafond_appareil');
-- Le plafond de tout le parc pour le non atteste : deux au plus ce jour-la, d'ou qu'ils viennent.
select pg_temp.attendre(6, pg_temp.c('na-2', 'secret', false, 'recette.ferme', '21', 'ferme', 'ip-b'), 'acceptee');
select pg_temp.attendre(7, pg_temp.c('na-3', 'secret', false, 'recette.ferme', '21', 'ferme', 'ip-c'), 'refusee', 'plafond_non_attestes');

-- Atteste : une voix de poids 1 ; un second appareil la confirme, l'auteur gagne un point, et sa voix
-- suivante pese deux (seuil d'essai a 1, anciennete a 0).
select pg_temp.attendre(8, pg_temp.c('at-1', 'secret', true, 'recette.ferme', '30', 'ferme'), 'acceptee');
do $$ begin if (select poids from public.signalements where appareil = extensions.digest('at-1', 'sha256')) <> 1
    then raise exception 'ECHEC 9 : poids d une voix attestee'; end if; raise notice 'ok 9'; end $$;
select pg_temp.attendre(10, pg_temp.c('at-2', 'secret', true, 'recette.ferme', '30', 'ferme'), 'acceptee');
do $$ begin
    if (select reputation from public.appareils where cle = extensions.digest('at-1', 'sha256')) <> 1
       or (select reputation from public.appareils where cle = extensions.digest('at-2', 'sha256')) <> 0
       or (select confirme_le from public.signalements where appareil = extensions.digest('at-1', 'sha256')) is null then
        raise exception 'ECHEC 11 : la confirmation ne credite pas l auteur';
    end if;
    raise notice 'ok 11';
end $$;
-- Une voix non attestee ne confirme rien, et n'est confirmee par rien : na-2 disait comme na-1.
do $$ begin
    if (select reputation from public.appareils where cle = extensions.digest('na-1', 'sha256')) <> 0
       or (select confirme_le from public.signalements where appareil = extensions.digest('na-1', 'sha256')) is not null then
        raise exception 'ECHEC 12 : une voix non attestee a confirme';
    end if;
    raise notice 'ok 12';
end $$;

-- Une seule voix vivante par appareil, sujet et cible : la suivante remplace la precedente, et le
-- curseur de lecture bouge pour elle seule.
do $$
declare
    v_avant timestamptz;
    r jsonb;
begin
    select maj_le into v_avant from public.signalements where appareil = extensions.digest('at-1', 'sha256');
    perform pg_sleep(0.01);
    r := pg_temp.c('at-1', 'secret', true, 'recette.ferme', '30', 'ouvert');
    if r ->> 'statut' <> 'acceptee' or (r ->> 'poids')::int <> 2 then
        raise exception 'ECHEC 13 : la voix d un appareil fiable devait peser deux : %', r;
    end if;
    if (select count(*) from public.signalements where appareil = extensions.digest('at-1', 'sha256') and statut = 'active') <> 1
       or (select maj_le from public.signalements where appareil = extensions.digest('at-1', 'sha256') and statut = 'remplacee') <= v_avant then
        raise exception 'ECHEC 13 : remplacement ou curseur';
    end if;
    raise notice 'ok 13';
end $$;
-- Le plafond atteste (3 d'essai) : la quatrieme du jour est refusee.
select pg_temp.attendre(14, pg_temp.c('at-1', 'secret', true, 'recette.attente', '30', 'fluide'), 'acceptee');
select pg_temp.attendre(15, pg_temp.c('at-1', 'secret', true, 'recette.attente', '31', 'fluide'), 'refusee', 'plafond_appareil');

-- App Attest : l'enregistrement, puis le compteur qui ne fait que monter.
do $$
declare
    r jsonb;
    v jsonb := jsonb_build_object('cle', encode(extensions.digest('aa-1', 'sha256'), 'hex'),
        'cle_publique', encode('\x04'::bytea || extensions.digest('x', 'sha256') || extensions.digest('y', 'sha256'), 'hex'),
        'environnement', 'developpement', 'empreinte_ip', encode(extensions.digest('ip-e', 'sha256'), 'hex'));
begin
    r := public.enregistrer_appareil(v);
    perform pg_temp.attendre(16, r, 'enregistre');
    r := public.enregistrer_appareil(v);
    perform pg_temp.attendre(17, r, 'deja_enregistre');
    r := public.enregistrer_appareil(jsonb_set(v, '{cle_publique}', to_jsonb(encode('\x04'::bytea || extensions.digest('autre', 'sha256') || extensions.digest('y', 'sha256'), 'hex'))));
    perform pg_temp.attendre(18, r, 'refusee', 'cle_differente');
end $$;
select pg_temp.attendre(19, pg_temp.c('aa-1', 'app_attest', true, 'recette.ferme', '50', 'ferme', 'ip-e', 1), 'acceptee');
select pg_temp.attendre(20, pg_temp.c('aa-1', 'app_attest', true, 'recette.ferme', '51', 'ferme', 'ip-e', 1), 'refusee', 'compteur_rejoue');
select pg_temp.attendre(21, pg_temp.c('aa-1', 'app_attest', true, 'recette.ferme', '51', 'ferme', 'ip-e', 3), 'acceptee');
select pg_temp.attendre(22, pg_temp.c('aa-inconnu', 'app_attest', true, 'recette.ferme', '50', 'ferme', 'ip-e', 1), 'refusee', 'appareil_inconnu');
-- Une cle a secret ne se fait pas passer pour une cle App Attest, ni l'inverse.
select pg_temp.attendre(23, pg_temp.c('aa-1', 'secret', true, 'recette.ferme', '52', 'ferme', 'ip-e'), 'refusee', 'appareil_inconnu');
do $$ begin perform pg_temp.c('aa-2', 'app_attest', false, 'recette.ferme', '50', 'ferme', 'ip-e', 1); raise exception 'ECHEC 24';
exception when invalid_parameter_value then raise notice 'ok 24'; end $$;

-- Le vocabulaire : sujet, valeur, forme, fin.
select pg_temp.attendre(25, pg_temp.c('at-3', 'secret', true, 'recette.inconnu', '60', 'ferme'), 'refusee', 'sujet_inconnu');
select pg_temp.attendre(26, pg_temp.c('at-3', 'secret', true, 'recette.ferme', '60', 'peut-etre'), 'refusee', 'valeur_invalide');
select pg_temp.attendre(27, pg_temp.c('at-3', 'secret', true, 'recette.plat', '60', 'Pas de <script>'), 'refusee', 'valeur_invalide');
select pg_temp.attendre(28, pg_temp.c('at-3', 'secret', true, 'recette.ferme', 'pas une cible !', 'ferme'), 'refusee', 'cible_invalide');
select pg_temp.attendre(29, pg_temp.c('at-3', 'secret', true, 'recette.jusqu', 'bordeaux/A28', 'ferme'), 'refusee', 'fin_invalide');
select pg_temp.attendre(30, pg_temp.c('at-3', 'secret', true, 'recette.jusqu', 'bordeaux/A28', 'ferme', 'ip-a', null,
    ((now() at time zone 'Europe/Paris')::date + 31)::text), 'refusee', 'fin_invalide');
select pg_temp.attendre(31, pg_temp.c('at-3', 'secret', true, 'recette.ferme', '60', 'ferme', 'ip-a', null, '2030-01-01'), 'refusee', 'fin_invalide');
-- Les refus ne comptent pas dans le plafond de l'appareil : trois contributions passent encore.
select pg_temp.attendre(32, pg_temp.c('at-3', 'secret', true, 'recette.plat', '60', 'poulet basquaise'), 'acceptee');
select pg_temp.attendre(33, pg_temp.c('at-3', 'secret', true, 'recette.jusqu', 'bordeaux/A28', 'ferme', 'ip-a', null,
    ((now() at time zone 'Europe/Paris')::date + 3)::text), 'acceptee');
do $$ begin
    if (select expire_le from public.signalements where appareil = extensions.digest('at-3', 'sha256') and sujet = 'recette.jusqu')
       <> ((now() at time zone 'Europe/Paris')::date + 4)::timestamp at time zone 'Europe/Paris' then
        raise exception 'ECHEC 34 : un signalement date vaut jusqu au soir de sa fin';
    end if;
    if (select expire_le from public.signalements where appareil = extensions.digest('at-3', 'sha256') and sujet = 'recette.plat')
       <> ((now() at time zone 'Europe/Paris')::date + 1)::timestamp at time zone 'Europe/Paris' then
        raise exception 'ECHEC 34 : un signalement du jour vaut jusqu a minuit, heure de Paris';
    end if;
    if (select expire_le from public.signalements where appareil = extensions.digest('at-1', 'sha256') and sujet = 'recette.attente')
       <> now() + interval '30 minutes' then
        raise exception 'ECHEC 34 : un signalement direct vaut duree_direct_minutes';
    end if;
    raise notice 'ok 34';
end $$;

-- Un vote : un bulletin par appareil et par cible.
select pg_temp.attendre(35, pg_temp.c('at-4', 'secret', true, 'recette.sondage', 'annonce-1', 'a'), 'acceptee');
select pg_temp.attendre(36, pg_temp.c('at-4', 'secret', true, 'recette.sondage', 'annonce-1', 'b'), 'refusee', 'deja_vote');
select pg_temp.attendre(37, pg_temp.c('at-4', 'secret', true, 'recette.sondage', 'annonce-1', 'c'), 'refusee', 'valeur_invalide');

-- L'essai joue l'appareil et ses plafonds, sans rien ecrire.
do $$
declare
    r jsonb;
    v_avant bigint := (select count(*) from public.signalements);
begin
    r := pg_temp.c('at-5', 'secret', true, 'essai.essai', 'essai', 'essai', 'ip-a', null, null, true);
    perform pg_temp.attendre(38, r, 'essai');
    if (r ->> 'poids')::int <> 1 or (select count(*) from public.signalements) <> v_avant
       or not exists (select 1 from public.appareils where cle = extensions.digest('at-5', 'sha256')) then
        raise exception 'ECHEC 39 : l essai a ecrit, ou n a pas joue l appareil : %', r;
    end if;
    raise notice 'ok 39';
end $$;

-- Un appareil bloque n'ecrit plus.
reset role;
update public.appareils set bloque_le = now() where cle = extensions.digest('at-4', 'sha256');
set local role service_role;
select pg_temp.attendre(40, pg_temp.c('at-4', 'secret', true, 'recette.ferme', '70', 'ferme'), 'refusee', 'appareil_bloque');

-- Le plafond par adresse.
reset role;
update private.reglages_communaute set valeur = 2 where cle = 'plafond_ip_jour';
set local role service_role;
select pg_temp.attendre(41, pg_temp.c('at-6', 'secret', true, 'recette.ferme', '80', 'ferme', 'ip-z'), 'acceptee');
select pg_temp.attendre(42, pg_temp.c('at-7', 'secret', true, 'recette.ferme', '80', 'ferme', 'ip-z'), 'acceptee');
select pg_temp.attendre(43, pg_temp.c('at-8', 'secret', true, 'recette.ferme', '80', 'ferme', 'ip-z'), 'refusee', 'plafond_ip');

-- L'empreinte d'un jour passe s'efface a la premiere ecriture du jour.
reset role;
insert into public.empreintes_ip (jour, empreinte, n) values (current_date - 2, extensions.digest('ip-hier', 'sha256'), 5);
set local role service_role;
do $$ begin perform pg_temp.c('at-9', 'secret', true, 'recette.ferme', '81', 'ferme', 'ip-y'); end $$;
reset role;
do $$ begin if exists (select 1 from public.empreintes_ip where jour < (now() at time zone 'Europe/Paris')::date) then
    raise exception 'ECHEC 44 : une empreinte d un jour passe survit'; end if; raise notice 'ok 44'; end $$;

-- Un reglage absent fait echouer l'ecriture, jamais passer sans borne.
delete from private.reglages_communaute where cle = 'plafond_ip_jour';
set local role service_role;
do $$ begin perform pg_temp.c('at-10', 'secret', true, 'recette.ferme', '82', 'ferme', 'ip-x'); raise exception 'ECHEC 45';
exception when no_data_found then raise notice 'ok 45'; end $$;
reset role;
insert into private.reglages_communaute (cle, valeur) values ('plafond_ip_jour', 40);

-- ---------------------------------------------------------------------------
-- 3. La lecture : la cle publiable lit les signalements du jour, sans l'appareil.
-- ---------------------------------------------------------------------------
-- Une ligne d'hier, une masquee : la premiere ne sort pas, la seconde sort avec son statut.
insert into public.signalements (sujet, cible, valeur, poids, cree_le, expire_le, appareil)
values ('recette.ferme', '90', 'ferme', 1, now() - interval '3 days', now() - interval '2 days', extensions.digest('at-1', 'sha256'));
update public.signalements set statut = 'masquee' where appareil = extensions.digest('at-3', 'sha256') and sujet = 'recette.plat';

set local role anon;
do $$ begin perform appareil from public.signalements; raise exception 'ECHEC 46 : anon lit la cle d un appareil';
exception when insufficient_privilege then raise notice 'ok 46'; end $$;
do $$ begin perform * from public.signalements; raise exception 'ECHEC 47 : select * passe';
exception when insufficient_privilege then raise notice 'ok 47'; end $$;
do $$ begin perform confirme_le from public.signalements; raise exception 'ECHEC 48';
exception when insufficient_privilege then raise notice 'ok 48'; end $$;
do $$ begin perform 1 from public.appareils; raise exception 'ECHEC 49';
exception when insufficient_privilege then raise notice 'ok 49'; end $$;
do $$ begin perform 1 from public.votes; raise exception 'ECHEC 50';
exception when insufficient_privilege then raise notice 'ok 50'; end $$;
do $$ begin perform 1 from public.empreintes_ip; raise exception 'ECHEC 51';
exception when insufficient_privilege then raise notice 'ok 51'; end $$;
do $$ begin perform 1 from public.sujets; raise exception 'ECHEC 52';
exception when insufficient_privilege then raise notice 'ok 52'; end $$;
do $$ begin
    if exists (select 1 from public.signalements where cible = '90') then
        raise exception 'ECHEC 53 : anon lit un signalement d hier';
    end if;
    if not exists (select 1 from public.signalements where statut = 'masquee')
       or not exists (select 1 from public.signalements where statut = 'remplacee')
       or (select count(*) from public.signalements where sujet like 'recette.%') < 8 then
        raise exception 'ECHEC 53 : la lecture du jour est incomplete';
    end if;
    raise notice 'ok 53';
end $$;
reset role;

-- Un compte authentifie hors de l'equipe lit comme anon ; un editeur lit tout.
set local role authenticated;
set local request.jwt.claims = '{"email": "recette.sans.droits@exemple.test"}';
do $$ begin
    if exists (select 1 from public.signalements where cible = '90') then raise exception 'ECHEC 54'; end if;
    raise notice 'ok 54';
end $$;
do $$ begin perform 1 from public.appareils; raise notice 'ok 55 (aucune ligne visible)';
exception when insufficient_privilege then raise exception 'ECHEC 55 : la lecture des comptes devait passer par la politique'; end $$;
do $$ begin if exists (select 1 from public.appareils) then raise exception 'ECHEC 56 : un non-admin compte les appareils'; end if;
    raise notice 'ok 56'; end $$;
reset role;

select jsonb_build_object('email', email)::text as claims_admin
  from public.editeurs where role = 'admin' order by email limit 1 \gset
set local role authenticated;
set local request.jwt.claims = :'claims_admin';
do $$ begin
    if not exists (select 1 from public.signalements where cible = '90') then
        raise exception 'ECHEC 57 : un editeur doit lire toutes les lignes';
    end if;
    if not exists (select reputation from public.appareils) then
        raise exception 'ECHEC 58 : un admin compte les appareils';
    end if;
    raise notice 'ok 57-58';
end $$;
do $$ begin perform cle from public.appareils; raise exception 'ECHEC 59 : un admin lit la cle d un appareil';
exception when insufficient_privilege then raise notice 'ok 59'; end $$;
reset role;

-- ---------------------------------------------------------------------------
-- 4. La confirmation ne renvoie pas la ligne au parc : maj_le ne bouge qu'avec le statut.
-- ---------------------------------------------------------------------------
do $$
declare
    v_avant timestamptz := (select maj_le from public.signalements where appareil = extensions.digest('at-2', 'sha256'));
begin
    update public.signalements set confirme_le = now() where appareil = extensions.digest('at-2', 'sha256');
    if (select maj_le from public.signalements where appareil = extensions.digest('at-2', 'sha256')) <> v_avant then
        raise exception 'ECHEC 60 : maj_le bouge sans changement de statut';
    end if;
    raise notice 'ok 60';
end $$;

\echo 'recette terminee'
