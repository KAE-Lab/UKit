-- UKit — les deux gardes de la base, qui a le droit d'ecrire et la trace de ce qui a ete ecrit, et
-- ses portes d'ecriture : les fonctions par lesquelles l'application depose un jeton push (6.1.x-E)
-- et ses compteurs anonymes (7-D), sans jamais toucher une table.
--
-- S'applique **entre** schema.sql et policies.sql : les politiques appellent est_editeur(), et les
-- declencheurs visent des tables que le schema doit avoir creees.
--
-- C'est la seule logique que la base porte, et la regle de schema.sql tient toujours : rien ici ne
-- calcule quoi que ce soit que l'application affiche. Les deux fonctions sont des politiques d'acces
-- exprimees en SQL, pas du metier.
--
-- Les deux vivent dans un schema `private`, que PostgREST n'expose pas : dans `public`, une fonction
-- est appelable en RPC par n'importe qui muni de la cle publiable. Elles sont `security definer` —
-- elles s'executent avec les droits de leur proprietaire, pas de l'appelant — et la documentation de
-- Supabase impose pour cela deux precautions, appliquees ici : un `search_path` vide et des noms
-- qualifies, pour qu'un objet homonyme d'un autre schema ne puisse pas se substituer aux notres.
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

-- Les retours : inseres par la cle de service (`par = service_role`), reclasses par un editeur
-- (`par = son e-mail`). Un rejeu de l'import en `on conflict do nothing` ne declenche rien pour une
-- ligne deja presente : il n'ecrit pas une ligne de journal par reponse a chaque passage. Le journal
-- copie la ligne entiere, contact compris — effacer un retour, c'est aussi effacer sa trace
-- (supabase/README.md).
drop trigger if exists journal on public.retours;
create trigger journal after insert or update or delete on public.retours
    for each row execute function private.journaliser('id');

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
