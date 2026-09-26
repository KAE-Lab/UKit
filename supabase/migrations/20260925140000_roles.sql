-- Les roles de la console (jalon 7-H) : qui peut quoi, et ou. La donnee — `editeurs.role` et
-- `editeurs.etablissements` — est en base depuis 7-C ; cette migration pose ce qui la lit.
--
-- Les roles vivent dans la base, pas dans la console : masquer un bouton ne protege rien, la cle
-- publiable est publique et une requete faite a la main passe outre l'interface. Seules les politiques
-- decident ; la console ne fait que refleter.
--
--   admin      tout ce que la console permet, l'equipe comprise
--   redacteur  les annonces des campus qui lui sont confies ; il lit le reste
--   lecteur    lit, et n'ecrit rien
--
-- Trois fermetures accompagnent les roles, parce qu'une equipe qui lit la console peut aussi lire, par
-- l'API, ce que la console ne montre pas :
--   - l'adresse laissee dans un retour n'est lue que par un admin : la colonne, sa copie dans
--     `reponses`, et les lignes du journal qui copient le retour entier (section 4) ;
--   - le jeton d'un appareil n'est lu par aucun compte de la console : qui le lit peut notifier
--     l'appareil sans passer par elle (section 5) ;
--   - « tous les campus » n'a plus qu'une ecriture, `null` : un tableau vide la vaut aussi pour
--     l'application, et `'{}' <@ borne` est vrai en SQL (section 3).

-- -----------------------------------------------------------------------------
-- 1. Les gardes
-- -----------------------------------------------------------------------------
--
-- La forme de private.est_editeur() (fonctions.sql) : `security definer` pour lire editeurs sans la
-- politique, `search_path` vide et noms qualifies, `stable`. est_editeur() ne change pas : elle reste
-- vraie pour les trois roles, parce que la lecture leur est commune.

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
-- pour l'application (src/shared/ciblage/ciblage.ts).
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

-- -----------------------------------------------------------------------------
-- 2. L'equipe
-- -----------------------------------------------------------------------------

-- Une borne n'a de sens que pour un redacteur, et n'est jamais vide : un tableau vide ne dirait ni
-- « aucun campus » ni « tous ». « Tous » s'ecrit `null`, comme pour le ciblage.
alter table public.editeurs drop constraint if exists editeurs_borne_check;
alter table public.editeurs add constraint editeurs_borne_check
    check (etablissements is null or (role = 'redacteur' and cardinality(etablissements) > 0));

-- Le dernier mot de passe provisoire donne par la console (fonction `editeurs`). Ecrit avec la session
-- de l'admin qui l'a donne, il laisse au journal la trace d'un geste qui, sans lui, ne toucherait que
-- l'authentification. Un fait date, pas un etat : la base ne sait pas quand le mot de passe est change.
alter table public.editeurs add column if not exists provisoire_le timestamptz;

-- Qui a donne quel role a qui : la table s'ecrit desormais depuis la console, elle entre au journal.
drop trigger if exists journal on public.editeurs;
create trigger journal after insert or update or delete on public.editeurs
    for each row execute function private.journaliser('email');

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
-- 3. « Tous les campus » s'ecrit `null`, et seulement ainsi
-- -----------------------------------------------------------------------------
--
-- L'application lit un tableau vide, ou fait de chaines vides, comme « tous » (ciblage.ts) : trois
-- ecritures pour un meme sens, dont deux qu'une inclusion SQL prendrait pour une cible bornee. Aucune
-- ligne ne portait `'{}'` le 2026-09-25 ; la console ecrit `null` quand aucune case n'est cochee.
alter table public.annonces drop constraint if exists annonces_etablissements_check;
alter table public.annonces add constraint annonces_etablissements_check
    check (etablissements is null
           or (cardinality(etablissements) > 0
               and array_position(etablissements, null) is null
               and array_position(etablissements, '') is null));

alter table public.service_messages drop constraint if exists service_messages_etablissements_check;
alter table public.service_messages add constraint service_messages_etablissements_check
    check (etablissements is null
           or (cardinality(etablissements) > 0
               and array_position(etablissements, null) is null
               and array_position(etablissements, '') is null));

-- -----------------------------------------------------------------------------
-- 4. L'adresse d'un retour : l'admin seul
-- -----------------------------------------------------------------------------
--
-- PRIVACY.md promet que l'adresse « n'est transmise a personne » ; une equipe qui grandit rend la
-- promesse plus exigeante, pas moins. Un privilege de colonne ne distingue pas deux roles applicatifs
-- qui partagent le role `authenticated` : la colonne est retiree a tous, et contact_du_retour() la rend
-- a l'admin. Et un `revoke` de colonne ne retire rien d'un privilege de table : la lecture de la table
-- est retiree, puis accordee colonne par colonne — le geste deja fait pour `testeurs` et `anon`.
-- Corollaire : une colonne ajoutee a `retours` n'est lisible par la console qu'une fois accordee ici.
revoke select on public.retours from authenticated;
grant select (id, recu_le, nature, campus, section, appareil, systeme, version_app, texte, volontaire,
              reponses, etat, note, importe_le)
    on public.retours to authenticated;

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

-- La copie de l'adresse dans `reponses` : l'importeur la rangeait en clair sous la question de contact
-- (tools/retours/projection.mjs, corrige par ce jalon), et la fiche d'un retour l'affichait. Les deux
-- libelles de la question commencent par « Ton adresse e-mail ». Un nettoyage, pas un etat du schema :
-- schema.sql ne le recopie pas. Le journal garde l'avant, lisible par l'admin seul (section 6), et
-- l'empreinte d'un retour ne depend pas de `reponses` : rien ne se recree a l'import suivant.
update public.retours
   set reponses = (select coalesce(jsonb_object_agg(question, reponse), '{}'::jsonb)
                     from jsonb_each(reponses) as r(question, reponse)
                    where question not like 'Ton adresse e-mail%')
 where exists (select 1
                 from jsonb_object_keys(reponses) as q(question)
                where question like 'Ton adresse e-mail%');

-- -----------------------------------------------------------------------------
-- 5. Le jeton d'un appareil : aucun compte de la console
-- -----------------------------------------------------------------------------
--
-- Le service d'envoi d'Expo accepte une notification vers tout jeton connu, sans autre preuve (sa
-- securite renforcee n'est pas activee) : lire un jeton, c'est pouvoir notifier l'appareil. La console
-- n'en a pas besoin — le parc se compte sur les cinq autres colonnes, et la fonction `notifier` lit les
-- jetons avec la cle de service —, donc aucun de ses comptes ne les lit, admin compris. L'ecriture leur
-- etait deja refusee faute de politique ; elle l'est aussi par le privilege.
revoke all on public.jetons_push from authenticated;
grant select (plateforme, etablissement, version, testeur, maj_le) on public.jetons_push to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Les politiques, par role
-- -----------------------------------------------------------------------------
--
-- Les politiques de 6.1-B ouvraient l'ecriture a tout editeur. Elles sont permissives : oubliee, l'une
-- d'elles s'additionnerait aux nouvelles et rouvrirait ce qu'elles ferment. Chacune est donc retiree
-- par son nom avant que les nouvelles ne soient posees.
do $$
declare
    nom text;
begin
    foreach nom in array array[
        'annonces', 'service_messages', 'etablissements', 'visuels',
        'salutations', 'batiments', 'testeurs', 'app_release'
    ]
    loop
        execute format('drop policy if exists "%s creable par les editeurs" on public.%I', nom, nom);
        execute format('drop policy if exists "%s modifiable par les editeurs" on public.%I', nom, nom);
        execute format('drop policy if exists "%s supprimable par les editeurs" on public.%I', nom, nom);

        -- La lecture reste commune aux trois roles. Sous la forme `(select …)` que Supabase recommande :
        -- la garde s'evalue une fois par requete, pas une fois par ligne.
        execute format('drop policy if exists "%s lisible par les editeurs" on public.%I', nom, nom);
        execute format(
            'create policy "%s lisible par les editeurs" on public.%I for select to authenticated using ((select private.est_editeur()))',
            nom, nom
        );
    end loop;
end
$$;

-- Tout ce qui n'est pas une annonce s'ecrit par un admin : les messages de service et leur
-- notification, le catalogue, les visuels des sources, les salutations, les batiments, les testeurs,
-- la version publiee.
do $$
declare
    nom text;
begin
    foreach nom in array array[
        'service_messages', 'etablissements', 'visuels', 'salutations', 'batiments', 'testeurs', 'app_release'
    ]
    loop
        execute format('drop policy if exists "%s creable par les admins" on public.%I', nom, nom);
        execute format(
            'create policy "%s creable par les admins" on public.%I for insert to authenticated with check ((select private.est_admin()))',
            nom, nom
        );
        execute format('drop policy if exists "%s modifiable par les admins" on public.%I', nom, nom);
        execute format(
            'create policy "%s modifiable par les admins" on public.%I for update to authenticated using ((select private.est_admin())) with check ((select private.est_admin()))',
            nom, nom
        );
        execute format('drop policy if exists "%s supprimable par les admins" on public.%I', nom, nom);
        execute format(
            'create policy "%s supprimable par les admins" on public.%I for delete to authenticated using ((select private.est_admin()))',
            nom, nom
        );
    end loop;
end
$$;

-- Les annonces : un redacteur ecrit celles de ses campus. `using` ET `with check` a la modification —
-- l'ancienne ligne comme la nouvelle —, sans quoi un redacteur pourrait deplacer vers son campus une
-- annonce qui n'est pas la sienne, ou la sienne vers un campus qui ne l'est pas. La suppression reste a
-- l'admin : une annonce s'archive, et l'archive garde sa trace et ses chiffres.
drop policy if exists "annonces creables dans ses campus" on public.annonces;
create policy "annonces creables dans ses campus"
    on public.annonces for insert
    to authenticated
    with check (private.peut_publier(etablissements));

drop policy if exists "annonces modifiables dans ses campus" on public.annonces;
create policy "annonces modifiables dans ses campus"
    on public.annonces for update
    to authenticated
    using (private.peut_publier(etablissements))
    with check (private.peut_publier(etablissements));

drop policy if exists "annonces supprimables par les admins" on public.annonces;
create policy "annonces supprimables par les admins"
    on public.annonces for delete
    to authenticated
    using ((select private.est_admin()));

-- Les retours se lisent par les trois roles, sans l'adresse (section 4), et se reclassent par un admin.
-- Le privilege de colonne — nature, etat, note — reste la seconde garde.
drop policy if exists "retours lisibles par les editeurs" on public.retours;
create policy "retours lisibles par les editeurs"
    on public.retours for select
    to authenticated
    using ((select private.est_editeur()));

drop policy if exists "retours reclassables par les editeurs" on public.retours;
drop policy if exists "retours reclassables par les admins" on public.retours;
create policy "retours reclassables par les admins"
    on public.retours for update
    to authenticated
    using ((select private.est_admin()))
    with check ((select private.est_admin()));

-- L'equipe : chacun lit sa ligne — de quoi savoir son role —, l'admin les lit toutes et les ecrit. La
-- fonction `editeurs` cree le compte avec la cle de service, puis ecrit la ligne avec la session de
-- l'admin : le journal porte son nom.
drop policy if exists "editeurs lisibles par les admins" on public.editeurs;
create policy "editeurs lisibles par les admins"
    on public.editeurs for select
    to authenticated
    using ((select private.est_admin()));

drop policy if exists "editeurs creables par les admins" on public.editeurs;
create policy "editeurs creables par les admins"
    on public.editeurs for insert
    to authenticated
    with check ((select private.est_admin()));

drop policy if exists "editeurs modifiables par les admins" on public.editeurs;
create policy "editeurs modifiables par les admins"
    on public.editeurs for update
    to authenticated
    using ((select private.est_admin()))
    with check ((select private.est_admin()));

drop policy if exists "editeurs supprimables par les admins" on public.editeurs;
create policy "editeurs supprimables par les admins"
    on public.editeurs for delete
    to authenticated
    using ((select private.est_admin()));

-- Le journal : commun aux trois roles, sauf les lignes qui copient un retour — l'adresse, section 4 —
-- ou un membre de l'equipe : celles-la, l'admin seul.
drop policy if exists "journal lisible par les editeurs" on public.journal;
create policy "journal lisible par les editeurs"
    on public.journal for select
    to authenticated
    using ((select private.est_editeur())
           and (table_name not in ('retours', 'editeurs') or (select private.est_admin())));

drop policy if exists "jetons lisibles par les editeurs" on public.jetons_push;
create policy "jetons lisibles par les editeurs"
    on public.jetons_push for select
    to authenticated
    using ((select private.est_editeur()));

-- -----------------------------------------------------------------------------
-- 7. Le bucket media
-- -----------------------------------------------------------------------------
--
-- L'admin y ecrit partout. Le redacteur y cree ce que ses annonces montrent — `annonces/` et
-- `partenaires/` — et rien d'autre. Remplacer ou effacer un objet reste a l'admin, sans quoi un
-- redacteur pourrait ecraser la photo d'un restaurant ou l'affiche d'un autre campus ; la console ne
-- remplace ni n'efface jamais un objet, chaque televersement en cree un a nom unique (7-E).
drop policy if exists "media creable par les editeurs" on storage.objects;
drop policy if exists "media modifiable par les editeurs" on storage.objects;
drop policy if exists "media supprimable par les editeurs" on storage.objects;

drop policy if exists "media creable par les admins et les redacteurs" on storage.objects;
create policy "media creable par les admins et les redacteurs"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'media'
                and ((select private.est_admin())
                     or ((select private.role_editeur()) = 'redacteur'
                         and (storage.foldername(name))[1] in ('annonces', 'partenaires'))));

drop policy if exists "media modifiable par les admins" on storage.objects;
create policy "media modifiable par les admins"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'media' and (select private.est_admin()))
    with check (bucket_id = 'media' and (select private.est_admin()));

drop policy if exists "media supprimable par les admins" on storage.objects;
create policy "media supprimable par les admins"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'media' and (select private.est_admin()));
