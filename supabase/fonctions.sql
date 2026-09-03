-- UKit — les deux gardes de la base : qui a le droit d'ecrire, et la trace de ce qui a ete ecrit.
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
