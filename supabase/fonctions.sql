-- UKit — les deux gardes de la base, qui a le droit d'ecrire et la trace de ce qui a ete ecrit, et
-- ses portes d'ecriture : les fonctions par lesquelles l'application depose un jeton push (6.1.x-E)
-- et ses compteurs anonymes (7-D), sans jamais toucher une table.
--
-- S'applique **entre** schema.sql et policies.sql : les politiques appellent est_editeur(), et les
-- declencheurs visent des tables que le schema doit avoir creees.
--
-- C'est la seule logique que la base porte, et la regle de schema.sql tient toujours : rien ici ne
-- calcule quoi que ce soit que l'application affiche. Les deux fonctions sont des politiques d'acces
-- exprimees en SQL, pas du metier. Depuis le jalon 7-H, la premiere garde dit aussi quoi et ou — les
-- roles de la console —, et une troisieme tient la version d'une ligne contre l'ecrasement : des gardes
-- encore, aucune ne decide de ce que l'application affiche.
--
-- Les deux vivent dans un schema `private`, que PostgREST n'expose pas : dans `public`, une fonction
-- est appelable en RPC par n'importe qui muni de la cle publiable. Elles sont `security definer` —
-- elles s'executent avec les droits de leur proprietaire, pas de l'appelant — et la documentation de
-- Supabase impose pour cela deux precautions, appliquees ici : un `search_path` vide et des noms
-- qualifies, pour qu'un objet homonyme d'un autre schema ne puisse pas se substituer aux notres.
--
-- Une seule fonction, en fin de fichier, lit une table pour `anon` : `parc_actif_arrondi()`, le parc
-- actif en centaines pour le site de Kylian, l'exception consignee dans docs/backend.md.
--
-- Voir docs/backend.md et docs/pilotage.md.

create schema if not exists private;

-- -----------------------------------------------------------------------------
-- Qui est editeur
-- -----------------------------------------------------------------------------
--
-- L'e-mail vient du jeton de session (`auth.jwt()`), la reponse de la table editeurs. `security
-- definer` parce que l'appelant — un compte authentifie quelconque — n'a pas le droit de lire
-- editeurs en entier, et n'a pas a l'avoir : une reponse oui/non sur lui-meme suffit. `stable` : la
-- reponse ne change pas au sein d'une requete, le planificateur peut ne l'evaluer qu'une fois.
create or replace function private.est_editeur()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
          from public.editeurs
         where email = nullif(auth.jwt() ->> 'email', '')
    );
$$;

revoke execute on function private.est_editeur() from public, anon;
grant execute on function private.est_editeur() to authenticated;

-- -----------------------------------------------------------------------------
-- Qui peut quoi, et ou (jalon 7-H)
-- -----------------------------------------------------------------------------
--
-- La meme forme qu'est_editeur(), qui ne change pas : elle reste vraie pour les trois roles, parce que
-- la lecture leur est commune. Les roles vivent ici et non dans la console — masquer un bouton ne
-- protege rien, la cle publiable est publique et une requete faite a la main passe outre l'interface.
create or replace function private.role_editeur()
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select role
      from public.editeurs
     where email = nullif(auth.jwt() ->> 'email', '');
$$;

create or replace function private.est_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(private.role_editeur() = 'admin', false);
$$;

-- Publier une annonce qui cible `cibles` : un admin, toujours ; un redacteur sans borne, toujours ; un
-- redacteur borne, si la cible est non vide et incluse dans sa borne. « Tous les campus » (`null`) reste
-- le fait d'un admin ou d'un redacteur sans borne : publier a tout le parc est un geste large.
-- `cardinality` en plus de l'inclusion : `'{}' <@ borne` est vrai, et un tableau vide vaut « tous »
-- pour l'application (src/shared/ciblage/ciblage.ts). La console en tient une copie pour le dire avant
-- d'essayer (console/src/auth/droits.ts) ; celle-ci decide.
create or replace function private.peut_publier(cibles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
          from public.editeurs
         where email = nullif(auth.jwt() ->> 'email', '')
           and (role = 'admin'
                or (role = 'redacteur'
                    and (etablissements is null
                         or (cardinality(cibles) > 0 and cibles <@ etablissements))))
    );
$$;

revoke execute on function private.role_editeur() from public, anon;
revoke execute on function private.est_admin() from public, anon;
revoke execute on function private.peut_publier(text[]) from public, anon;
grant execute on function private.role_editeur() to authenticated;
grant execute on function private.est_admin() to authenticated;
grant execute on function private.peut_publier(text[]) to authenticated;

-- La console garde toujours au moins un admin : sans lui, plus personne ne peut inviter ni reparer,
-- sinon depuis le poste du publieur. Un declencheur d'instruction, apres coup : c'est l'etat final de la
-- table qui compte, pas chaque ligne. `security definer` : il compte les admins meme quand la session
-- qui ecrit n'en voit qu'une partie. Il vaut aussi pour la cle de service.
create or replace function private.garder_un_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not exists (select 1 from public.editeurs where role = 'admin') then
        raise exception 'La console garde toujours au moins un admin : nomme d’abord un autre admin.';
    end if;
    return null;
end;
$$;

drop trigger if exists un_admin_au_moins on public.editeurs;
create trigger un_admin_au_moins after update or delete on public.editeurs
    for each statement execute function private.garder_un_admin();

-- -----------------------------------------------------------------------------
-- Le journal
-- -----------------------------------------------------------------------------
--
-- Un declencheur s'execute avec les droits de celui qui ecrit. Sans `security definer`, l'editeur —
-- qui n'a aucune politique d'ecriture sur journal, et ne doit pas en avoir, sinon le journal serait
-- forgeable — verrait chaque ecriture d'annonce refusee sur la trace qui la suit.
--
-- Les arguments du declencheur nomment la ou les colonnes de la cle primaire : `('id')`,
-- `('domaine', 'cle')`. La fonction les lit dans la ligne, dans l'ordre, et les joint par `/`.
--
-- `par` a trois lectures, dans l'ordre : l'e-mail du jeton (un editeur dans la console), le role du
-- jeton (`service_role` pour un script ou une sonde), l'utilisateur SQL (`postgres` pour psql). Les
-- trois chemins d'ecriture sont donc traces, et distingues.
create or replace function private.journaliser()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    ligne  jsonb;
    cle    text;
begin
    ligne := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

    select string_agg(ligne ->> colonne, '/' order by rang)
      into cle
      from unnest(tg_argv) with ordinality as t(colonne, rang);

    insert into public.journal (table_name, operation, ligne_id, avant, apres, par)
    values (
        tg_table_name,
        tg_op,
        cle,
        case when tg_op = 'INSERT' then null else to_jsonb(old) end,
        case when tg_op = 'DELETE' then null else to_jsonb(new) end,
        coalesce(nullif(auth.jwt() ->> 'email', ''), auth.role(), current_user)
    );

    return null;
end;
$$;

-- Le journal n'est ecrit que par le declencheur. Les roles des clients perdent l'ecriture au niveau
-- des privileges, pas seulement des politiques : une politique s'oublie ouverte, un privilege revoque
-- ne se rouvre pas par accident.
revoke insert, update, delete on public.journal from anon, authenticated;

-- Un declencheur par table publiable, rejouable. `after` : la ligne est deja ecrite quand on la trace,
-- et un journal qui echoue annule l'ecriture — c'est le comportement voulu, un geste sans trace vaut
-- moins qu'un geste refuse. Les Blueprints n'y sont pas : leur trace est la table blueprints
-- elle-meme, ecrite par le seul script de publication.
drop trigger if exists journal on public.annonces;
create trigger journal after insert or update or delete on public.annonces
    for each row execute function private.journaliser('id');

drop trigger if exists journal on public.service_messages;
create trigger journal after insert or update or delete on public.service_messages
    for each row execute function private.journaliser('id');

drop trigger if exists journal on public.etablissements;
create trigger journal after insert or update or delete on public.etablissements
    for each row execute function private.journaliser('code');

drop trigger if exists journal on public.visuels;
create trigger journal after insert or update or delete on public.visuels
    for each row execute function private.journaliser('domaine', 'cle');

drop trigger if exists journal on public.salutations;
create trigger journal after insert or update or delete on public.salutations
    for each row execute function private.journaliser('id');

drop trigger if exists journal on public.batiments;
create trigger journal after insert or update or delete on public.batiments
    for each row execute function private.journaliser('code');

drop trigger if exists journal on public.testeurs;
create trigger journal after insert or update or delete on public.testeurs
    for each row execute function private.journaliser('id');

drop trigger if exists journal on public.app_release;
create trigger journal after insert or update or delete on public.app_release
    for each row execute function private.journaliser('plateforme');

-- Les retours : inseres par la cle de service (`par = service_role`), reclasses par un admin
-- (`par = son e-mail`). Un rejeu de l'import en `on conflict do nothing` ne declenche rien pour une
-- ligne deja presente : il n'ecrit pas une ligne de journal par reponse a chaque passage. Le journal
-- copie la ligne entiere, contact compris — ces lignes-la ne se lisent que par un admin (policies.sql),
-- et effacer un retour, c'est aussi effacer sa trace (supabase/README.md).
drop trigger if exists journal on public.retours;
create trigger journal after insert or update or delete on public.retours
    for each row execute function private.journaliser('id');

-- L'equipe (jalon 7-H) : qui a donne quel role a qui. La table s'ecrit depuis la page Equipe de la
-- console, avec la session d'un admin ; ses lignes de journal ne se lisent que par un admin.
drop trigger if exists journal on public.editeurs;
create trigger journal after insert or update or delete on public.editeurs
    for each row execute function private.journaliser('email');

-- -----------------------------------------------------------------------------
-- Le verrou contre l'ecrasement (jalon 7-H)
-- -----------------------------------------------------------------------------
--
-- « Le dernier enregistrement gagne » tenait pour un editeur, pas pour deux qui ouvrent la meme annonce.
-- Les deux tables qu'une equipe ecrit a plusieurs portent `maj_le`, la version de la ligne : la console
-- enregistre avec `where maj_le = <la valeur lue>`, et une modification qui ne touche aucune ligne a ete
-- devancee. Tenue ici et non par la console : un script, le Studio ou la fonction `notifier` — qui pose
-- `notifie_le` — changent la ligne aussi, et le verrou doit le voir. `clock_timestamp()` et non `now()` :
-- `now()` est l'heure du debut de la transaction, et deux modifications dans la meme transaction
-- garderaient la meme version.
create or replace function private.tenir_maj_le()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.maj_le := clock_timestamp();
    return new;
end;
$$;

drop trigger if exists maj_le on public.annonces;
create trigger maj_le before update on public.annonces
    for each row execute function private.tenir_maj_le();

drop trigger if exists maj_le on public.service_messages;
create trigger maj_le before update on public.service_messages
    for each row execute function private.tenir_maj_le();

-- -----------------------------------------------------------------------------
-- L'adresse d'un retour (jalon 7-H)
-- -----------------------------------------------------------------------------
--
-- PRIVACY.md promet que l'adresse laissee dans le formulaire « n'est transmise a personne » ; une equipe
-- qui grandit rend la promesse plus exigeante, pas moins. Un privilege de colonne ne distingue pas deux
-- roles applicatifs qui partagent le role `authenticated` : la colonne `contact` est retiree a tous
-- (policies.sql), et cette porte la rend a un admin seul. Dans `public` parce qu'elle s'appelle en RPC
-- depuis la console ; `anon` n'a pas le droit de l'appeler.
create or replace function public.contact_du_retour(p_id text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if not private.est_admin() then
        raise exception 'L’adresse d’un retour est réservée aux admins.' using errcode = '42501';
    end if;
    return (select contact from public.retours where id = p_id);
end;
$$;

revoke execute on function public.contact_du_retour(text) from public, anon;
grant execute on function public.contact_du_retour(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Les jetons push (jalon 6.1.x-E)
-- -----------------------------------------------------------------------------
--
-- L'application ne touche pas la table : elle depose et retire par ces deux fonctions, `security
-- definer` pour que le role `anon` n'ait aucun privilege sur jetons_push — ni lecture (les jetons
-- ne s'enumerent pas), ni ecriture directe. Un depot est un `upsert` sur le jeton : le meme appareil
-- qui change de campus ou de version reecrit sa ligne, jamais une seconde.
create or replace function public.deposer_jeton(
    p_jeton text, p_plateforme text, p_etablissement text, p_version text, p_testeur boolean
)
returns void
language sql
security definer
set search_path = ''
as $$
    insert into public.jetons_push (jeton, plateforme, etablissement, version, testeur, maj_le)
    values (p_jeton, p_plateforme, p_etablissement, p_version, coalesce(p_testeur, false), now())
    on conflict (jeton) do update
        set plateforme = excluded.plateforme,
            etablissement = excluded.etablissement,
            version = excluded.version,
            testeur = excluded.testeur,
            maj_le = now();
$$;

create or replace function public.retirer_jeton(p_jeton text)
returns void
language sql
security definer
set search_path = ''
as $$
    delete from public.jetons_push where jeton = p_jeton;
$$;

revoke execute on function public.deposer_jeton(text, text, text, text, boolean) from public;
revoke execute on function public.retirer_jeton(text) from public;
grant execute on function public.deposer_jeton(text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.retirer_jeton(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- La mesure (jalon 7-D)
-- -----------------------------------------------------------------------------
--
-- La porte d'ecriture des compteurs anonymes (schema.sql, docs/mesure.md). `security definer` pour
-- que `anon` n'ait aucun privilege sur `mesures` — ni lecture, ni ecriture directe — ; un
-- `search_path` vide et des noms qualifies, comme au-dessus.
--
-- Le lot entier est refuse s'il n'est pas un tableau ou s'il depasse 200 elements. Chaque element est
-- ensuite juge seul, dans son propre sous-bloc : un element qui ne passe pas — evenement inconnu, `n`
-- hors de [1, 1000], jour hors de [aujourd'hui - 14, demain], cle ou campus trop longs, forme fausse —
-- est ignore et compte dans `rejetes`, et le lot continue. Ignorer plutot que rejeter : un vieux client
-- qui porterait un evenement retire du vocabulaire doit pouvoir vider sa file, sinon il la renverrait
-- pour toujours. La reponse dit ce qui a ete compte et rejete : `{"comptes": k, "rejetes": r}`.
--
-- `demain` et non `aujourd'hui` comme borne haute : le jour est celui de l'appareil, en heure locale,
-- et la base est en UTC — minuit passe a Paris, la base est encore la veille.
create or replace function public.compter(p_lots jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    element      jsonb;
    comptes      integer := 0;
    rejetes      integer := 0;
    v_jour       date;
    v_heure      smallint;
    v_evenement  text;
    v_cle        text;
    v_campus     text;
    v_version    text;
    v_plateforme text;
    v_testeur    boolean;
    v_n          integer;
begin
    if p_lots is null or jsonb_typeof(p_lots) <> 'array' then
        raise exception 'compter : un tableau est attendu' using errcode = '22023';
    end if;
    if jsonb_array_length(p_lots) > 200 then
        raise exception 'compter : 200 elements au plus par lot' using errcode = '22023';
    end if;

    for element in select value from jsonb_array_elements(p_lots) loop
        begin
            if jsonb_typeof(element) <> 'object' then
                raise exception 'un objet est attendu';
            end if;
            v_jour       := (element ->> 'jour')::date;
            v_heure      := coalesce((element ->> 'heure')::smallint, -1);
            v_evenement  := element ->> 'evenement';
            v_cle        := coalesce(element ->> 'cle', '');
            v_campus     := coalesce(element ->> 'campus', '');
            v_version    := element ->> 'version';
            v_plateforme := element ->> 'plateforme';
            v_testeur    := coalesce((element ->> 'testeur')::boolean, false);
            v_n          := (element ->> 'n')::integer;

            if v_n is null or v_n < 1 or v_n > 1000 then
                raise exception 'n hors de [1, 1000]';
            end if;
            if v_jour is null or v_jour < current_date - 14 or v_jour > current_date + 1 then
                raise exception 'jour hors fenetre';
            end if;
            if v_heure < -1 or v_heure > 23 then
                raise exception 'heure hors de [-1, 23]';
            end if;
            if not exists (select 1 from public.evenements_connus where evenement = v_evenement) then
                raise exception 'evenement inconnu';
            end if;
            if char_length(v_cle) > 64 or char_length(v_campus) > 32 then
                raise exception 'cle ou campus trop long';
            end if;
            if v_version is null or v_version !~ '^\d+\.\d+\.\d+$' then
                raise exception 'version illisible';
            end if;
            if v_plateforme is null or v_plateforme not in ('ios', 'android') then
                raise exception 'plateforme inconnue';
            end if;

            insert into public.mesures (jour, heure, evenement, cle, campus, version, plateforme, testeur, n)
            values (v_jour, v_heure, v_evenement, v_cle, v_campus, v_version, v_plateforme, v_testeur, v_n)
            on conflict (jour, heure, evenement, cle, campus, version, plateforme, testeur)
            do update set n = public.mesures.n + excluded.n, maj_le = now();
            comptes := comptes + 1;
        exception when others then
            rejetes := rejetes + 1;
        end;
    end loop;

    return jsonb_build_object('comptes', comptes, 'rejetes', rejetes);
end;
$$;

revoke execute on function public.compter(jsonb) from public;
grant execute on function public.compter(jsonb) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Le parc actif, en centaines (migration 20261115200000)
-- -----------------------------------------------------------------------------
--
-- La seule lecture que `anon` peut faire de `jetons_push` : la requete de reference de
-- docs/mesure.md, arrondie a la centaine inferieure dans la base. kylianmalartre.com l'affiche en
-- direct (« 2,100+ active users ») avec la cle publiable, sans la cle service_role, qui ne circule
-- pas (docs/backend.md). Aucune ligne ni aucun decoupage ne sort.
create or replace function public.parc_actif_arrondi()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select (floor(count(*) / 100.0) * 100)::integer
      from public.jetons_push
     where maj_le > now() - interval '14 days'
       and not testeur;
$$;

revoke execute on function public.parc_actif_arrondi() from public;
grant execute on function public.parc_actif_arrondi() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- La communaute (phase 8, lot 1 ; migration 20261125020000_communaute.sql)
-- -----------------------------------------------------------------------------
--
-- La configuration des plafonds, la purge horaire, et les trois portes de la fonction `communaute`,
-- reservees au service_role : la base y garde la confiance — plafonds, reputation, poids d'une voix —,
-- jamais l'etat d'un lieu, que l'application calcule.

-- La configuration.
--
-- Les plafonds, les seuils et les poids, hors de la documentation publique : la table vit dans
-- `private`, que l'API n'expose pas, et ses valeurs ne sont pas dans le depot. Une cle absente fait
-- echouer l'ecriture plutot que de la laisser passer sans borne. Les cles : plafond_appareil_atteste,
-- plafond_appareil_non_atteste, plafond_non_attestes_jour, plafond_ip_jour, plafond_verdicts_ip_jour,
-- plafond_ip_non_attestes_jour, seuil_fiable, anciennete_fiable_jours, duree_direct_minutes,
-- duree_correction_jours, fin_max_jours.
create table if not exists private.reglages_communaute (
    cle         text    primary key,
    valeur      integer not null check (valeur >= 0),
    description text
);

create or replace function private.reglage_communaute(p_cle text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_valeur integer;
begin
    select valeur into v_valeur from private.reglages_communaute where cle = p_cle;
    if v_valeur is null then
        raise exception 'reglage communautaire absent : %', p_cle using errcode = 'P0002';
    end if;
    return v_valeur;
end;
$$;

-- Les durees de conservation (docs/phase-8/1-base-communautaire.md), tenues par une tache horaire et
-- non par les ecritures : sans ecriture pendant une semaine de vacances, rien ne s'effacerait. Les
-- empreintes d'un jour passe, des la premiere heure du lendemain ; un signalement trente jours apres sa
-- fin ; un appareil douze mois apres sa derniere contribution, s'il ne porte plus rien.
create or replace function private.purger_communaute()
returns void
language sql
security definer
set search_path = ''
as $$
    delete from public.empreintes_ip where jour < (now() at time zone 'Europe/Paris')::date;
    delete from public.signalements where expire_le < now() - interval '30 days';
    delete from public.appareils a
     where a.vu_le < now() - interval '12 months'
       and not exists (select 1 from public.signalements s where s.appareil = a.cle);
$$;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('communaute-purge', '7 * * * *', 'select private.purger_communaute()');

revoke execute on function private.reglage_communaute(text) from public, anon, authenticated;
revoke execute on function private.purger_communaute() from public, anon, authenticated;

-- `maj_le` des signalements ne bouge que si le statut bouge : une confirmation, qui ne change rien de
-- ce que l'application lit, ne renvoie pas la ligne a tout le parc.
drop trigger if exists maj_le on public.signalements;
create trigger maj_le before update on public.signalements
    for each row when (old.statut is distinct from new.statut)
    execute function private.tenir_maj_le();

-- -----------------------------------------------------------------------------
-- Les trois portes, reservees au service_role
-- -----------------------------------------------------------------------------
--
-- Les refus attendus — un plafond, un appareil bloque, une assertion rejouee, un sujet inconnu —
-- rendent `{"statut": "refusee", "raison": ...}` et la transaction se valide : les comptes de
-- l'adresse et le compteur d'assertions avancent meme quand la contribution est refusee, sans quoi un
-- refus se rejouerait a l'infini. Une forme fausse leve (22023) : la fonction `communaute` l'a deja
-- filtree, et ce qui arrive malgre tout ici est un defaut, pas un refus.

-- L'admission d'une demande, avant tout le reste et avant Google : l'adresse comptee, et, quand la
-- fonction veut faire dechiffrer un jeton Play Integrity, le verdict compte a part — le quota de
-- Google est celui de tout le parc, et un script ne doit pas l'epuiser d'une seule adresse.
create or replace function public.admettre(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_jour      date := (now() at time zone 'Europe/Paris')::date;
    v_empreinte bytea;
    v_verdict   boolean;
    v_ligne     public.empreintes_ip%rowtype;
begin
    if p is null or jsonb_typeof(p) <> 'object' then
        raise exception 'admettre : un objet est attendu' using errcode = '22023';
    end if;
    v_empreinte := decode(p ->> 'empreinte_ip', 'hex');
    v_verdict   := (p ->> 'verdict')::boolean;
    if octet_length(v_empreinte) is distinct from 32 or v_verdict is null then
        raise exception 'admettre : forme inattendue' using errcode = '22023';
    end if;
    insert into public.empreintes_ip (jour, empreinte, n, verdicts) values (v_jour, v_empreinte, 1, v_verdict::integer)
    on conflict (jour, empreinte) do update
        set n = public.empreintes_ip.n + 1, verdicts = public.empreintes_ip.verdicts + excluded.verdicts
    returning * into v_ligne;
    return jsonb_build_object(
        'admis', v_ligne.n <= private.reglage_communaute('plafond_ip_jour'),
        'verdict', v_verdict and v_ligne.verdicts <= private.reglage_communaute('plafond_verdicts_ip_jour'));
end;
$$;

-- L'enregistrement d'une cle App Attest, apres la verification de son attestation par la fonction
-- `communaute` : la cle publique et l'environnement, un compteur a zero. Une cle deja connue reste
-- telle quelle.
create or replace function public.enregistrer_appareil(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_cle          bytea;
    v_cle_publique bytea;
    v_env          text;
begin
    if p is null or jsonb_typeof(p) <> 'object' then
        raise exception 'enregistrer_appareil : un objet est attendu' using errcode = '22023';
    end if;
    v_cle          := decode(p ->> 'cle', 'hex');
    v_cle_publique := decode(p ->> 'cle_publique', 'hex');
    v_env          := p ->> 'environnement';
    if octet_length(v_cle) is distinct from 32 or octet_length(v_cle_publique) is distinct from 65
       or v_env is null or v_env not in ('production', 'developpement') then
        raise exception 'enregistrer_appareil : forme inattendue' using errcode = '22023';
    end if;

    insert into public.appareils (cle, nature, plateforme, cle_publique, environnement)
    values (v_cle, 'app_attest', 'ios', v_cle_publique, v_env)
    on conflict (cle) do nothing;
    if found then
        return jsonb_build_object('statut', 'enregistre');
    end if;
    if exists (select 1 from public.appareils where cle = v_cle and cle_publique = v_cle_publique) then
        return jsonb_build_object('statut', 'deja_enregistre');
    end if;
    return jsonb_build_object('statut', 'refusee', 'raison', 'cle_differente');
end;
$$;

-- Une contribution. `p` : `{ appareil: { cle, nature, plateforme, atteste, compteur? }, empreinte_ip,
-- jeton_de_vote, contribution: { sujet, cible, valeur, fin? }, essai }`, les octets en hexadecimal,
-- apres `admettre`. `atteste` vient de la fonction `communaute`, qui a verifie l'assertion App Attest
-- ou le verdict Play Integrity ; `jeton_de_vote` est le HMAC qui tient lieu d'appareil dans un vote ;
-- `essai` joue tout jusqu'au poids sans rien ecrire, pour le menu de developpement et le protocole
-- sur telephone — un appareil connu y fait seulement monter son compteur.
create or replace function public.contribuer(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_jour       date        := (now() at time zone 'Europe/Paris')::date;
    v_debut      timestamptz := (now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris';
    v_dispositif jsonb       := p -> 'appareil';
    v_apport     jsonb       := p -> 'contribution';
    v_cle        bytea;
    v_nature     text;
    v_plateforme text;
    v_atteste    boolean;
    v_compteur   bigint;
    v_empreinte  bytea;
    v_jeton      bytea;
    v_essai      boolean;
    v_appareil   public.appareils%rowtype;
    v_sujet      public.sujets%rowtype;
    v_cible      text;
    v_valeur     text;
    v_fin        date;
    v_poids      smallint;
    v_n          integer;
    v_expire     timestamptz;
    v_id         uuid;
begin
    if p is null or jsonb_typeof(p) <> 'object' or jsonb_typeof(v_dispositif) is distinct from 'object'
       or jsonb_typeof(v_apport) is distinct from 'object' then
        raise exception 'contribuer : forme inattendue' using errcode = '22023';
    end if;
    v_cle        := decode(v_dispositif ->> 'cle', 'hex');
    v_nature     := v_dispositif ->> 'nature';
    v_plateforme := v_dispositif ->> 'plateforme';
    v_atteste    := (v_dispositif ->> 'atteste')::boolean;
    v_compteur   := (v_dispositif ->> 'compteur')::bigint;
    v_empreinte  := decode(p ->> 'empreinte_ip', 'hex');
    v_jeton      := decode(p ->> 'jeton_de_vote', 'hex');
    v_essai      := coalesce((p ->> 'essai')::boolean, false);
    v_cible      := v_apport ->> 'cible';
    v_valeur     := v_apport ->> 'valeur';
    -- Chaque champ est exige : `x not in (...)` vaut NULL pour un champ absent, et ne leverait rien.
    if octet_length(v_cle) is distinct from 32 or octet_length(v_empreinte) is distinct from 32
       or octet_length(v_jeton) is distinct from 32
       or v_nature is null or v_nature not in ('app_attest', 'secret')
       or v_plateforme is null or v_plateforme not in ('ios', 'android')
       or v_atteste is null or (v_nature = 'app_attest' and (not v_atteste or v_compteur is null)) then
        raise exception 'contribuer : appareil inattendu' using errcode = '22023';
    end if;

    -- 1. Le non atteste, borne avant de creer quoi que ce soit : par adresse, pour qu'une seule ne
    --    vide pas le plafond du parc ; puis pour tout le parc. Un flot de secrets tires au hasard ne
    --    remplit pas `appareils`.
    if not v_atteste and not v_essai then
        update public.empreintes_ip set non_attestes = non_attestes + 1
         where jour = v_jour and empreinte = v_empreinte
        returning non_attestes into v_n;
        if not found then
            raise exception 'contribuer : adresse non admise' using errcode = '22023';
        end if;
        if v_n > private.reglage_communaute('plafond_ip_non_attestes_jour') then
            return jsonb_build_object('statut', 'refusee', 'raison', 'plafond_ip');
        end if;
        v_n := (select count(*) from public.signalements where poids = 0 and cree_le >= v_debut)
             + (select count(*) from public.votes where poids = 0 and cree_le >= v_debut);
        if v_n >= private.reglage_communaute('plafond_non_attestes_jour') then
            return jsonb_build_object('statut', 'refusee', 'raison', 'plafond_non_attestes');
        end if;
    end if;

    -- 2. L'appareil, verrouille le temps de la transaction : deux contributions simultanees du meme
    --    appareil se jugent l'une apres l'autre, plafonds et compteur compris. Un essai ne cree pas
    --    d'appareil : un appareil inconnu y vaut un appareil neuf, sans reputation ni blocage.
    if v_nature = 'secret' and not v_essai then
        insert into public.appareils (cle, nature, plateforme) values (v_cle, 'secret', v_plateforme)
        on conflict (cle) do nothing;
    end if;
    select * into v_appareil from public.appareils where cle = v_cle for update;
    if not found and v_nature = 'secret' and v_essai then
        return jsonb_build_object('statut', 'essai', 'poids', case when v_atteste then 1 else 0 end, 'atteste', v_atteste);
    end if;
    if not found or v_appareil.nature <> v_nature then
        return jsonb_build_object('statut', 'refusee', 'raison', 'appareil_inconnu');
    end if;
    if v_nature = 'app_attest' and v_compteur <= v_appareil.compteur then
        return jsonb_build_object('statut', 'refusee', 'raison', 'compteur_rejoue');
    end if;
    update public.appareils
       set vu_le      = now(),
           compteur   = coalesce(v_compteur, compteur),
           atteste_le = case when v_atteste then now() else atteste_le end
     where cle = v_cle;
    if v_appareil.bloque_le is not null then
        return jsonb_build_object('statut', 'refusee', 'raison', 'appareil_bloque');
    end if;

    -- 3. Le plafond du jour de l'appareil, bas pour qui n'est pas atteste. Les votes n'y entrent pas :
    --    rien ne les relie a un appareil, et chacun est deja unique par cible.
    v_n := (select count(*) from public.signalements where appareil = v_cle and cree_le >= v_debut);
    if v_n >= private.reglage_communaute(case when v_atteste then 'plafond_appareil_atteste'
                                              else 'plafond_appareil_non_atteste' end) then
        return jsonb_build_object('statut', 'refusee', 'raison', 'plafond_appareil');
    end if;

    -- 4. Le poids : jamais une voix sans attestation ; deux pour un appareil fiable, confirme assez de
    --    jours et assez ancien pour qu'une reputation ne se fabrique pas en un jour.
    v_poids := case
        when not v_atteste then 0
        when v_appareil.reputation >= private.reglage_communaute('seuil_fiable')
             and v_appareil.cree_le <= now() - make_interval(days => private.reglage_communaute('anciennete_fiable_jours')) then 2
        else 1
    end;
    if v_essai then
        return jsonb_build_object('statut', 'essai', 'poids', v_poids, 'atteste', v_atteste);
    end if;

    -- 5. Le sujet, la cible, la valeur et la fin.
    select * into v_sujet from public.sujets where sujet = v_apport ->> 'sujet' and actif;
    if not found then
        return jsonb_build_object('statut', 'refusee', 'raison', 'sujet_inconnu');
    end if;
    if v_cible is null or v_cible !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$' then
        return jsonb_build_object('statut', 'refusee', 'raison', 'cible_invalide');
    end if;
    if v_valeur is null or char_length(v_valeur) not between 1 and 120
       or (v_sujet.valeurs is not null and not (v_valeur = any (v_sujet.valeurs)))
       or (v_sujet.forme is not null and v_valeur !~ v_sujet.forme) then
        return jsonb_build_object('statut', 'refusee', 'raison', 'valeur_invalide');
    end if;
    if v_sujet.famille = 'date' then
        begin
            v_fin := (v_apport ->> 'fin')::date;
        exception when others then
            v_fin := null;
        end;
        if v_fin is null or v_fin < v_jour or v_fin > v_jour + private.reglage_communaute('fin_max_jours') then
            return jsonb_build_object('statut', 'refusee', 'raison', 'fin_invalide');
        end if;
    elsif v_apport ? 'fin' and jsonb_typeof(v_apport -> 'fin') <> 'null' then
        return jsonb_build_object('statut', 'refusee', 'raison', 'fin_invalide');
    end if;

    -- 6a. Un vote : un bulletin par jeton et par cible, definitif, d'un poids d'une voix au plus — un
    --     sondage compte des appareils, pas des reputations.
    if v_sujet.nature = 'vote' then
        insert into public.votes (sujet, cible, jeton, valeur, poids)
        values (v_sujet.sujet, v_cible, v_jeton, v_valeur, least(v_poids, 1))
        on conflict (sujet, cible, jeton) do nothing;
        if not found then
            return jsonb_build_object('statut', 'refusee', 'raison', 'deja_vote');
        end if;
        return jsonb_build_object('statut', 'acceptee', 'poids', least(v_poids, 1));
    end if;

    -- 6b. Un signalement : sa borne de validite selon sa famille, la voix precedente du meme
    --     appareil remplacee, puis le credit de reputation des voix concordantes d'autres appareils.
    v_expire := case v_sujet.famille
        when 'jour'       then (v_jour + 1)::timestamp at time zone 'Europe/Paris'
        when 'date'       then (v_fin + 1)::timestamp at time zone 'Europe/Paris'
        when 'direct'     then now() + make_interval(mins => private.reglage_communaute('duree_direct_minutes'))
        when 'correction' then now() + make_interval(days => private.reglage_communaute('duree_correction_jours'))
    end;

    update public.signalements
       set statut = 'remplacee'
     where appareil = v_cle and sujet = v_sujet.sujet and cible = v_cible
       and statut = 'active' and expire_le > now();

    insert into public.signalements (sujet, cible, valeur, fin, poids, expire_le, appareil)
    values (v_sujet.sujet, v_cible, v_valeur, v_fin, v_poids, v_expire, v_cle)
    returning id into v_id;

    -- Un point au plus par auteur et par jour de Paris : republier ne remet pas un compteur a zero, et
    -- deux appareils qui se confirment l'un l'autre en boucle ne gagnent qu'un point par jour chacun.
    -- « Souvent confirme » veut dire confirme des jours differents.
    if v_poids >= 1 then
        with candidats as (
            select distinct on (s.appareil) s.id, s.appareil
              from public.signalements s
             where s.sujet = v_sujet.sujet and s.cible = v_cible and s.valeur = v_valeur
               and s.statut = 'active' and s.poids >= 1 and s.confirme_le is null
               and s.expire_le > now() and s.appareil <> v_cle and s.id <> v_id
               and not exists (select 1 from public.signalements c
                                where c.appareil = s.appareil and c.confirme_le >= v_debut)
             order by s.appareil, s.cree_le
        ), confirmes as (
            update public.signalements t
               set confirme_le = now()
              from candidats c
             where t.id = c.id
            returning t.appareil
        )
        update public.appareils a
           set reputation = a.reputation + 1
         where a.cle in (select appareil from confirmes);
    end if;

    return jsonb_build_object('statut', 'acceptee', 'id', v_id, 'poids', v_poids);
end;
$$;

revoke execute on function public.admettre(jsonb) from public, anon, authenticated;
revoke execute on function public.enregistrer_appareil(jsonb) from public, anon, authenticated;
revoke execute on function public.contribuer(jsonb) from public, anon, authenticated;
grant execute on function public.admettre(jsonb) to service_role;
grant execute on function public.enregistrer_appareil(jsonb) to service_role;
grant execute on function public.contribuer(jsonb) to service_role;
