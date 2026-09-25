-- UKit — les deux gardes de la base : qui a le droit d'ecrire, et la trace de ce qui a ete ecrit.
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
