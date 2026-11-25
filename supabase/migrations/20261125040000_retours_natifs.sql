-- Le formulaire de retour natif (phase 8, lot 3 de la 7.0 ; docs/phase-8/3-formulaire.md) : un bug, une
-- idee ou une demande de campus ecrits dans l'application, leur contexte, leurs captures, la reponse que
-- l'etudiant lit sur son appareil, et les problemes connus que l'equipe publie.
--
-- Additive : des colonnes neuves dans `retours`, dont les lignes importees du formulaire Google restent
-- telles quelles (`source = 'formulaire'`) ; trois tables neuves ; un sujet de vote ; un espace prive de
-- stockage ; cinq fonctions et une tache horaire. Rien de la base communautaire ne change.
--
-- **L'ecriture passe par la fonction `communaute`**, apres l'attestation de l'appareil, comme une
-- contribution : `deposer_retour` est reservee au `service_role`. L'adresse d'un retour reste lisible par
-- les seuls admins (`contact_du_retour`). **Un retour ne porte pas la cle de l'appareil** : la relier a
-- une adresse laissee relierait aussi ses signalements a une personne. Le plafond par appareil se compte
-- sur un jeton du jour, dans une table que la tache horaire vide le lendemain.
--
-- **La reponse se lit par une cle secrete** tiree sur l'appareil, dont la base ne garde que l'empreinte :
-- `lire_mes_retours` la recoit en POST seulement (fonction `volatile`), jamais dans une adresse.

-- -----------------------------------------------------------------------------
-- 1. Les problemes connus
-- -----------------------------------------------------------------------------
--
-- Ce que l'equipe sait deja casse, reformule pour etre lu par tous : l'application les montre avant
-- d'envoyer un bug, avec « moi aussi » (un vote par appareil, sujet `probleme.moi_aussi`) et « moi aussi,
-- et j'ajoute un detail » (un retour relie, `retours.probleme`). `brouillon` ne se lit que par l'equipe ;
-- `corrige` se lit encore, avec la version qui corrige ; `clos` disparait de l'application.
-- `plateformes` : null = les deux, comme pour les messages de service.
create table if not exists public.problemes_connus (
    id               uuid        primary key default gen_random_uuid(),
    titre            text        not null check (char_length(btrim(titre)) between 4 and 140),
    detail           text        check (char_length(detail) <= 600),
    statut           text        not null default 'brouillon'
                                 check (statut in ('brouillon', 'publie', 'corrige', 'clos')),
    plateformes      text[]      check (cardinality(plateformes) between 1 and 2 and plateformes <@ array['ios', 'android']),
    version_corrigee text        check (version_corrigee ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'),
    cree_le          timestamptz not null default now(),
    maj_le           timestamptz not null default now()
);

drop trigger if exists maj_le on public.problemes_connus;
create trigger maj_le before update on public.problemes_connus
    for each row execute function private.tenir_maj_le();

drop trigger if exists journal on public.problemes_connus;
create trigger journal after insert or update or delete on public.problemes_connus
    for each row execute function private.journaliser('id');

-- « Moi aussi » : un bulletin par appareil et par probleme (`votes`, lot 1), qui dit quels appareils sont
-- touches — la plateforme, le modele, le systeme et la version, rien d'autre, et aucun identifiant.
insert into public.sujets (sujet, nature, domaine, famille, valeurs, forme, description) values
    ('probleme.moi_aussi', 'vote', 'probleme', null, null,
     '^(ios|android)[|][^|[:cntrl:]]{1,48}[|][^|[:cntrl:]]{1,24}[|][0-9]{1,3}([.][0-9]{1,3}){1,3}$',
     'moi aussi sur un probleme connu : plateforme|appareil|systeme|version')
on conflict (sujet) do update
    set nature = excluded.nature, domaine = excluded.domaine, famille = excluded.famille, valeurs = excluded.valeurs,
        forme = excluded.forme, description = excluded.description, actif = true;

-- -----------------------------------------------------------------------------
-- 2. Les retours natifs
-- -----------------------------------------------------------------------------
--
--   source              `formulaire` pour l'import du formulaire Google, `app` pour l'ecran natif
--   contexte            les blocs que l'etudiant a laisses joints : version, appareil, systeme,
--                       etablissement, langue, theme, onglet de depart, reseau, derniers echecs de
--                       source (hote et famille), parcours recent (des noms d'ecran), l'erreur de la
--                       carte d'ou il vient. Les colonnes `appareil`, `systeme`, `version_app` et
--                       `section` en recopient la valeur, pour lire et trier comme avant
--   captures            le nombre de captures annoncees, rangees dans l'espace `retours` sous `<id>/`
--   probleme            le probleme connu auquel l'etudiant ajoute un detail
--   atteste             l'appareil a-t-il ete atteste ; un retour non atteste se lit en retrait
--   reponse_possible    l'etudiant a accepte la reponse dans l'application
--   cle_reponse         l'empreinte SHA-256 de la cle secrete de l'appareil ; aucun compte ne la lit
--   clos_le             le passage a `traite` ou `refuse`, tenu par un declencheur : il fixe la duree
--                       des captures
--   captures_purgees_le leurs fichiers effaces
-- Les contraintes vivent sur leur colonne : `add column if not exists` les saute avec elle, et la vue
-- lisible (schema.sql) se rejoue sans erreur.
alter table public.retours add column if not exists source text not null default 'formulaire'
    check (source in ('formulaire', 'app'));
alter table public.retours add column if not exists contexte jsonb
    check (contexte is null or (jsonb_typeof(contexte) = 'object' and octet_length(contexte::text) <= 8192));
alter table public.retours add column if not exists captures smallint not null default 0 check (captures between 0 and 3);
alter table public.retours add column if not exists probleme uuid references public.problemes_connus (id) on delete set null;
alter table public.retours add column if not exists atteste boolean
    constraint retours_atteste_check check ((source = 'app') = (atteste is not null));
alter table public.retours add column if not exists cle_reponse bytea unique check (octet_length(cle_reponse) = 32);
alter table public.retours add column if not exists reponse_possible boolean not null default false
    constraint retours_reponse_possible_check check (reponse_possible = (cle_reponse is not null));
alter table public.retours add column if not exists clos_le timestamptz;
alter table public.retours add column if not exists captures_purgees_le timestamptz;

-- Le plafond du parc non atteste compte les retours natifs non attestes du jour.
create index if not exists retours_non_attestes on public.retours (recu_le) where source = 'app' and not atteste;
-- La purge des captures.
create index if not exists retours_captures on public.retours (clos_le) where captures > 0 and captures_purgees_le is null;

-- `clos_le` suit l'etat : pose au passage a un etat clos, retire si le retour se rouvre.
create or replace function private.tenir_clos_le()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.etat in ('traite', 'refuse') then
        if old.etat not in ('traite', 'refuse') or new.clos_le is null then
            new.clos_le := now();
        end if;
    else
        new.clos_le := null;
    end if;
    return new;
end;
$$;

drop trigger if exists clos_le on public.retours;
create trigger clos_le before update of etat on public.retours
    for each row execute function private.tenir_clos_le();

revoke execute on function private.tenir_clos_le() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Les reponses
-- -----------------------------------------------------------------------------
--
-- Ce qu'un admin repond, depuis la console, a un retour dont l'etudiant a accepte la reponse dans
-- l'application. L'appareil la lit par sa cle (`lire_mes_retours`) ; l'equipe la lit dans la console.
create table if not exists public.retours_reponses (
    id      uuid        primary key default gen_random_uuid(),
    retour  text        not null references public.retours (id) on delete cascade,
    texte   text        not null check (char_length(btrim(texte)) between 1 and 2000),
    cree_le timestamptz not null default now()
);

create index if not exists retours_reponses_retour on public.retours_reponses (retour, cree_le);

drop trigger if exists journal on public.retours_reponses;
create trigger journal after insert or update or delete on public.retours_reponses
    for each row execute function private.journaliser('id');

-- -----------------------------------------------------------------------------
-- 4. Le plafond par appareil
-- -----------------------------------------------------------------------------
--
-- Un jeton par appareil et par jour de Paris — un HMAC de sa cle, calcule par la fonction `communaute`
-- sous une cle qui n'est qu'a elle — et le nombre de retours deposes. Rien ne le relie a un retour ; la
-- tache horaire efface les jours passes. Dans `private`, que l'API n'expose pas.
create table if not exists private.retours_par_appareil (
    jour  date    not null,
    jeton bytea   not null check (octet_length(jeton) = 32),
    n     integer not null default 0 check (n >= 0),
    primary key (jour, jeton)
);

-- -----------------------------------------------------------------------------
-- 5. Les portes
-- -----------------------------------------------------------------------------
--
-- `deposer_retour`, apres `admettre` et la preuve de l'appareil. `p` : `{ appareil: { cle, nature,
-- plateforme, atteste, compteur? }, empreinte_ip, jeton, retour: { nature, texte, campus?, volontaire?,
-- contact?, probleme?, contexte?, captures, cle_reponse? } }`, les octets en hexadecimal. Les refus
-- attendus rendent `{"statut": "refusee", "raison": ...}` et la transaction se valide, comme
-- `contribuer` : les comptes avancent meme quand le retour est refuse. Une forme fausse leve (22023).
-- La fonction `communaute` a deja borne chaque champ et masque les adresses et les numeros du texte.
-- Les reglages : plafond_retours_appareil, plafond_retours_non_atteste, plafond_retours_non_attestes_jour.
create or replace function public.deposer_retour(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_jour        date        := (now() at time zone 'Europe/Paris')::date;
    v_debut       timestamptz := (now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris';
    v_dispositif  jsonb       := p -> 'appareil';
    v_r           jsonb       := p -> 'retour';
    v_cle         bytea;
    v_nature      text;
    v_atteste     boolean;
    v_compteur    bigint;
    v_empreinte   bytea;
    v_jeton       bytea;
    v_appareil    public.appareils%rowtype;
    v_n           integer;
    v_type        text;
    v_texte       text;
    v_campus      text;
    v_contact     text;
    v_volontaire  boolean;
    v_probleme    uuid;
    v_contexte    jsonb;
    v_captures    integer;
    v_cle_reponse bytea;
    v_id          text;
begin
    if p is null or jsonb_typeof(p) <> 'object' or jsonb_typeof(v_dispositif) is distinct from 'object'
       or jsonb_typeof(v_r) is distinct from 'object' then
        raise exception 'deposer_retour : forme inattendue' using errcode = '22023';
    end if;
    v_cle       := decode(v_dispositif ->> 'cle', 'hex');
    v_nature    := v_dispositif ->> 'nature';
    v_atteste   := (v_dispositif ->> 'atteste')::boolean;
    v_compteur  := (v_dispositif ->> 'compteur')::bigint;
    v_empreinte := decode(p ->> 'empreinte_ip', 'hex');
    v_jeton     := decode(p ->> 'jeton', 'hex');
    if octet_length(v_cle) is distinct from 32 or octet_length(v_empreinte) is distinct from 32
       or octet_length(v_jeton) is distinct from 32
       or v_nature is null or v_nature not in ('app_attest', 'secret')
       or v_atteste is null or (v_nature = 'app_attest' and (not v_atteste or v_compteur is null)) then
        raise exception 'deposer_retour : appareil inattendu' using errcode = '22023';
    end if;

    -- 1. Le non atteste, borne avant tout : par adresse (le compteur des contributions, partage), puis
    --    pour tout le parc.
    if not v_atteste then
        insert into public.empreintes_ip (jour, empreinte, non_attestes) values (v_jour, v_empreinte, 1)
        on conflict (jour, empreinte) do update set non_attestes = public.empreintes_ip.non_attestes + 1
        returning non_attestes into v_n;
        if v_n > private.reglage_communaute('plafond_ip_non_attestes_jour') then
            return jsonb_build_object('statut', 'refusee', 'raison', 'plafond_ip');
        end if;
        v_n := (select count(*) from public.retours where source = 'app' and not atteste and recu_le >= v_debut);
        if v_n >= private.reglage_communaute('plafond_retours_non_attestes_jour') then
            return jsonb_build_object('statut', 'refusee', 'raison', 'plafond_non_attestes');
        end if;
    end if;

    -- 2. L'appareil : une cle App Attest connue, son compteur qui monte sous verrou ; le blocage de la
    --    moderation, quelle que soit sa nature. Aucun appareil ne se cree ici.
    if v_nature = 'app_attest' then
        select * into v_appareil from public.appareils where cle = v_cle for update;
        if not found or v_appareil.nature <> 'app_attest' then
            return jsonb_build_object('statut', 'refusee', 'raison', 'appareil_inconnu');
        end if;
        if v_compteur <= v_appareil.compteur then
            return jsonb_build_object('statut', 'refusee', 'raison', 'compteur_rejoue');
        end if;
        update public.appareils
           set compteur = v_compteur, vu_le = date_trunc('day', now()), atteste_le = date_trunc('day', now())
         where cle = v_cle;
    else
        select * into v_appareil from public.appareils where cle = v_cle;
    end if;
    if v_appareil.bloque_le is not null then
        return jsonb_build_object('statut', 'refusee', 'raison', 'appareil_bloque');
    end if;

    -- 3. Le plafond du jour de l'appareil, par son jeton du jour.
    insert into private.retours_par_appareil (jour, jeton, n) values (v_jour, v_jeton, 1)
    on conflict (jour, jeton) do update set n = private.retours_par_appareil.n + 1
    returning n into v_n;
    if v_n > private.reglage_communaute(case when v_atteste then 'plafond_retours_appareil' else 'plafond_retours_non_atteste' end) then
        return jsonb_build_object('statut', 'refusee', 'raison', 'plafond_appareil');
    end if;

    -- 4. Le retour lui-meme : sa nature, ses longueurs, la branche du campus et du volontariat.
    v_type        := v_r ->> 'nature';
    v_texte       := coalesce(v_r ->> 'texte', '');
    v_campus      := nullif(btrim(coalesce(v_r ->> 'campus', '')), '');
    v_contact     := nullif(btrim(coalesce(v_r ->> 'contact', '')), '');
    v_volontaire  := coalesce((v_r ->> 'volontaire')::boolean, false);
    v_contexte    := v_r -> 'contexte';
    v_captures    := coalesce((v_r ->> 'captures')::integer, 0);
    v_cle_reponse := decode(v_r ->> 'cle_reponse', 'hex');
    if jsonb_typeof(v_contexte) = 'null' then
        v_contexte := null;
    end if;
    if v_type is null or v_type not in ('bug', 'fonctionnalite', 'campus')
       or char_length(v_texte) > 2000
       or (v_type <> 'campus' and char_length(btrim(v_texte)) < 3)
       or (v_type = 'campus' and (v_campus is null or char_length(v_campus) > 120))
       or (v_type <> 'campus' and (v_campus is not null or v_volontaire))
       or (v_volontaire and v_contact is null)
       or (v_contact is not null and (not v_volontaire or char_length(v_contact) > 254
           or v_contact !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'))
       or v_captures not between 0 and 3
       or (v_cle_reponse is not null and octet_length(v_cle_reponse) <> 32)
       or (v_contexte is not null and (jsonb_typeof(v_contexte) <> 'object' or octet_length(v_contexte::text) > 8192
           or exists (select 1 from jsonb_object_keys(v_contexte) k
                       where k not in ('version', 'appareil', 'systeme', 'etablissement', 'langue', 'theme',
                                       'onglet', 'reseau', 'echecs', 'parcours', 'erreur')))) then
        return jsonb_build_object('statut', 'refusee', 'raison', 'retour_invalide');
    end if;
    -- Un probleme inconnu ou retire depuis : le detail arrive quand meme, sans lien.
    if (v_r ->> 'probleme') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select id into v_probleme from public.problemes_connus
         where id = (v_r ->> 'probleme')::uuid and statut in ('publie', 'corrige');
    end if;

    -- 5. La ligne. Sa cle, comme celle d'un retour importe, est une empreinte SHA-256 : celle de son
    --    texte, de son instant et d'un sel tire au hasard (7-L).
    v_id := encode(extensions.digest(
        convert_to(v_texte || '|' || coalesce(v_campus, '') || '|' || clock_timestamp()::text, 'UTF8') || extensions.gen_random_bytes(16),
        'sha256'), 'hex');
    insert into public.retours (
        id, recu_le, nature, campus, section, appareil, systeme, version_app, texte, contact, volontaire,
        reponses, source, contexte, captures, probleme, atteste, reponse_possible, cle_reponse)
    values (
        v_id, now(), v_type, v_campus, left(v_contexte ->> 'onglet', 40), left(v_contexte ->> 'appareil', 120),
        left(v_contexte ->> 'systeme', 60), left(v_contexte ->> 'version', 20), v_texte, v_contact, v_volontaire,
        '{}'::jsonb, 'app', v_contexte, v_captures, v_probleme, v_atteste, v_cle_reponse is not null, v_cle_reponse);
    return jsonb_build_object('statut', 'acceptee', 'id', v_id, 'captures', v_captures, 'probleme', v_probleme);
end;
$$;

-- Ce que l'appareil lit de ses retours : pour chaque cle, dans l'ordre, l'etat, la cloture et les
-- reponses, ou `null` pour une cle inconnue. Ni l'identifiant du retour, ni son texte, ni rien qu'une
-- autre cle ouvrirait. `volatile` : PostgREST ne l'appelle qu'en POST, une cle ne s'ecrit jamais dans une
-- adresse ni dans un journal d'acces.
create or replace function public.lire_mes_retours(p_cles text[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_sortie jsonb := '[]'::jsonb;
    v_cle    text;
    v_octets bytea;
    v_ligne  jsonb;
begin
    if p_cles is null or cardinality(p_cles) > 20 then
        raise exception 'lire_mes_retours : vingt cles au plus' using errcode = '22023';
    end if;
    foreach v_cle in array p_cles loop
        v_ligne := null;
        begin
            v_octets := decode(v_cle, 'base64');
        exception when others then
            v_octets := null;
        end;
        if octet_length(v_octets) = 32 then
            select jsonb_build_object(
                       'etat', r.etat,
                       'clos_le', r.clos_le,
                       'reponses', coalesce((select jsonb_agg(jsonb_build_object('texte', x.texte, 'le', x.cree_le) order by x.cree_le, x.id)
                                               from public.retours_reponses x where x.retour = r.id), '[]'::jsonb))
              into v_ligne
              from public.retours r
             where r.cle_reponse = extensions.digest(v_octets, 'sha256');
        end if;
        v_sortie := v_sortie || jsonb_build_array(v_ligne);
    end loop;
    return v_sortie;
end;
$$;

-- La purge des captures : la fonction `communaute` efface les fichiers par l'API de stockage — une
-- suppression directe dans `storage.objects` est refusee et laisserait les fichiers —, puis marque les
-- retours. Trente jours apres la cloture, et au plus tard un an apres l'envoi pour un retour jamais clos.
create or replace function public.captures_a_purger()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(array_agg(id), '{}')
      from (select id from public.retours
             where source = 'app' and captures > 0 and captures_purgees_le is null
               and ((clos_le is not null and clos_le < now() - interval '30 days') or recu_le < now() - interval '12 months')
             order by recu_le
             limit 100) a_purger;
$$;

create or replace function public.captures_purgees(p_ids text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_n integer;
begin
    update public.retours set captures_purgees_le = now()
     where id = any (p_ids) and captures > 0 and captures_purgees_le is null;
    get diagnostics v_n = row_count;
    return v_n;
end;
$$;

revoke execute on function public.deposer_retour(jsonb) from public, anon, authenticated;
revoke execute on function public.captures_a_purger() from public, anon, authenticated;
revoke execute on function public.captures_purgees(text[]) from public, anon, authenticated;
grant execute on function public.deposer_retour(jsonb) to service_role;
grant execute on function public.captures_a_purger() to service_role;
grant execute on function public.captures_purgees(text[]) to service_role;
revoke execute on function public.lire_mes_retours(text[]) from public;
grant execute on function public.lire_mes_retours(text[]) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. La tache horaire
-- -----------------------------------------------------------------------------
--
-- Les jetons des jours passes, effaces dans l'heure qui suit minuit ; et, quand des captures sont dues,
-- l'appel de la fonction `communaute` qui les efface (pg_net : une requete sortante, sans attendre sa
-- reponse). L'action `purger` n'efface que ce que la base designe : l'appeler plus souvent n'avance rien.
create extension if not exists pg_net with schema extensions;

create or replace function private.purger_retours()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    delete from private.retours_par_appareil where jour < (now() at time zone 'Europe/Paris')::date;
    if cardinality(public.captures_a_purger()) > 0 then
        perform net.http_post(
            url := 'https://owiksddeqcyyifnmpyqm.supabase.co/functions/v1/communaute',
            body := jsonb_build_object('action', 'purger'),
            headers := jsonb_build_object('Content-Type', 'application/json'));
    end if;
end;
$$;

revoke execute on function private.purger_retours() from public, anon, authenticated;
select cron.schedule('retours-purge', '17 * * * *', 'select private.purger_retours()');

-- -----------------------------------------------------------------------------
-- 7. Les captures
-- -----------------------------------------------------------------------------
--
-- Un espace prive : aucune lecture publique, aucune ecriture par un compte. L'appareil televerse par
-- une URL signee que la fonction `communaute` cree pour chaque capture annoncee, `<id>/<n>.jpg` ; un admin
-- les lit, par une URL signee de la console. Un JPEG d'un mega au plus : l'application les compresse.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('retours', 'retours', false, 1048576, array['image/jpeg'])
on conflict (id) do update
    set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "captures lisibles par les admins" on storage.objects;
create policy "captures lisibles par les admins"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'retours' and (select private.est_admin()));

-- -----------------------------------------------------------------------------
-- 8. Les politiques
-- -----------------------------------------------------------------------------
--
-- `retours` : les colonnes neuves s'ajoutent a la lecture de l'equipe, sauf `cle_reponse` ; l'ecriture
-- reste la nature, l'etat et la note, par un admin. `problemes_connus` : l'application lit ce qui est
-- publie, l'equipe tout, un admin ecrit. `retours_reponses` : l'equipe lit, un admin repond a un retour
-- qui l'accepte, et peut retirer une reponse. `retours_par_appareil` : aucun compte.
grant select (source, contexte, captures, probleme, atteste, reponse_possible, clos_le, captures_purgees_le)
    on public.retours to authenticated;

alter table public.problemes_connus enable row level security;
alter table public.retours_reponses enable row level security;
alter table private.retours_par_appareil enable row level security;

revoke all on public.problemes_connus, public.retours_reponses from anon, authenticated;
revoke all on private.retours_par_appareil from anon, authenticated;

grant select on public.problemes_connus to anon, authenticated;
grant insert, update, delete on public.problemes_connus to authenticated;

drop policy if exists "problemes publies lisibles" on public.problemes_connus;
create policy "problemes publies lisibles"
    on public.problemes_connus for select
    to anon, authenticated
    using (statut in ('publie', 'corrige'));

drop policy if exists "problemes lisibles par les editeurs" on public.problemes_connus;
create policy "problemes lisibles par les editeurs"
    on public.problemes_connus for select
    to authenticated
    using ((select private.est_editeur()));

drop policy if exists "problemes creables par les admins" on public.problemes_connus;
create policy "problemes creables par les admins"
    on public.problemes_connus for insert
    to authenticated
    with check ((select private.est_admin()));

drop policy if exists "problemes modifiables par les admins" on public.problemes_connus;
create policy "problemes modifiables par les admins"
    on public.problemes_connus for update
    to authenticated
    using ((select private.est_admin()))
    with check ((select private.est_admin()));

drop policy if exists "problemes supprimables par les admins" on public.problemes_connus;
create policy "problemes supprimables par les admins"
    on public.problemes_connus for delete
    to authenticated
    using ((select private.est_admin()));

grant select, delete on public.retours_reponses to authenticated;
grant insert (retour, texte) on public.retours_reponses to authenticated;

drop policy if exists "reponses lisibles par les editeurs" on public.retours_reponses;
create policy "reponses lisibles par les editeurs"
    on public.retours_reponses for select
    to authenticated
    using ((select private.est_editeur()));

drop policy if exists "reponses ecrites par les admins" on public.retours_reponses;
create policy "reponses ecrites par les admins"
    on public.retours_reponses for insert
    to authenticated
    with check ((select private.est_admin())
                and exists (select 1 from public.retours r where r.id = retour and r.reponse_possible));

drop policy if exists "reponses retirees par les admins" on public.retours_reponses;
create policy "reponses retirees par les admins"
    on public.retours_reponses for delete
    to authenticated
    using ((select private.est_admin()));
