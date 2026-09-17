-- Les roles des editeurs (jalon 7-C, section 6) : la donnee seulement. `private.est_editeur()` ne
-- change pas, et les politiques qui liront le role relevent de 7-H. Les comptes existants deviennent
-- `admin` par le defaut ; `etablissements` nul veut dire « tous les campus ».

alter table public.editeurs add column if not exists role text not null default 'admin';
alter table public.editeurs drop constraint if exists editeurs_role_check;
alter table public.editeurs add constraint editeurs_role_check
    check (role in ('admin', 'redacteur', 'lecteur'));

alter table public.editeurs add column if not exists etablissements text[];
