-- Les signalements des lieux (phase 8, lot 2 de la 7.0 ; docs/phase-8/2-signalements.md) : le
-- vocabulaire des restaurants, des bibliotheques et des batiments, les etats officiels publies depuis
-- la console, et les trois portes de la moderation.
--
-- Additive : des lignes dans `sujets`, une table neuve, quatre fonctions neuves. Rien de la base
-- communautaire du lot 1 ne change ; les ecritures des etudiants passent toujours par la seule fonction
-- `communaute` et `public.contribuer`.
--
-- **La moderation est un geste d'admin**, comme tout ce qui n'est pas une annonce (policies.sql) : les
-- portes verifient `private.est_admin()` elles-memes, `security definer` parce qu'un admin ne lit ni
-- n'ecrit les tables de la communaute directement. **La cle d'un appareil ne sort jamais** : un appareil
-- se designe par l'un de ses signalements, et le journal de ces gestes ne la copie pas.

-- -----------------------------------------------------------------------------
-- 1. Le vocabulaire
-- -----------------------------------------------------------------------------
--
-- Une copie de src/shared/communaute/vocabulaire.ts, que vocabulaire.test.ts compare a ce bloc. `oui` et
-- `non` pour un fait (`non` est le lieu tel que sa source le dit, la reponse a « toujours vrai ? ») ;
-- leur echelle pour l'attente et l'ambiance ; une forme pour un plat du menu et pour des horaires
-- corriges, que l'application compare a ce qu'elle lit. Rejouable : un sujet republie remplace le
-- precedent.
insert into public.sujets (sujet, nature, domaine, famille, valeurs, forme, description) values
    ('restaurant.ferme',                'signalement', 'restaurant',   'jour',       '{oui,non}', null, 'ferme aujourd''hui'),
    ('restaurant.self_ferme',           'signalement', 'restaurant',   'jour',       '{oui,non}', null, 'le self ferme'),
    ('restaurant.cafeteria_fermee',     'signalement', 'restaurant',   'jour',       '{oui,non}', null, 'la cafeteria fermee'),
    ('restaurant.menu_faux',            'signalement', 'restaurant',   'jour',       '{oui,non}', null, 'le menu faux ou absent'),
    ('restaurant.ferme_jusqu',          'signalement', 'restaurant',   'date',       '{oui,non}', null, 'ferme jusqu''a sa fin'),
    ('restaurant.horaires',             'signalement', 'restaurant',   'correction', null, '^[0-9a-f]{8}[|](source|(midi|soir|jour)=(([01][0-9]|2[0-3])[0-5][0-9]-([01][0-9]|2[0-3])[0-5][0-9]|ferme)(,(midi|soir|jour)=(([01][0-9]|2[0-3])[0-5][0-9]-([01][0-9]|2[0-3])[0-5][0-9]|ferme)){0,2})$', 'les bons horaires, service par service'),
    ('restaurant.attente',              'signalement', 'restaurant',   'direct',     '{fluide,attente,tres_long}', null, 'l''attente, a trois niveaux'),
    ('restaurant.places',               'signalement', 'restaurant',   'direct',     '{oui,non}', null, 'plus de place assise'),
    ('restaurant.izly',                 'signalement', 'restaurant',   'direct',     '{oui,non}', null, 'Izly en panne'),
    ('restaurant.plat',                 'signalement', 'restaurant',   'jour',       null, '^[^[:cntrl:]]{1,120}$', 'le plat recommande, pris au menu du jour'),
    ('bibliotheque.fermee',             'signalement', 'bibliotheque', 'jour',       '{oui,non}', null, 'fermee aujourd''hui'),
    ('bibliotheque.fermeture_partielle','signalement', 'bibliotheque', 'jour',       '{oui,non}', null, 'un etage ou une salle ferme'),
    ('bibliotheque.fermee_jusqu',       'signalement', 'bibliotheque', 'date',       '{oui,non}', null, 'fermee jusqu''a sa fin'),
    ('bibliotheque.horaires',           'signalement', 'bibliotheque', 'correction', null, '^[0-9a-f]{8}[|](source|(midi|soir|jour)=(([01][0-9]|2[0-3])[0-5][0-9]-([01][0-9]|2[0-3])[0-5][0-9]|ferme)(,(midi|soir|jour)=(([01][0-9]|2[0-3])[0-5][0-9]-([01][0-9]|2[0-3])[0-5][0-9]|ferme)){0,2})$', 'les bons horaires du jour'),
    ('bibliotheque.ambiance',           'signalement', 'bibliotheque', 'direct',     '{calme,papote}', null, 'calme, ou ca papote'),
    ('batiment.acces_bloque',           'signalement', 'batiment',     'jour',       '{oui,non}', null, 'l''acces bloque'),
    ('batiment.ferme',                  'signalement', 'batiment',     'jour',       '{oui,non}', null, 'ferme aujourd''hui'),
    ('batiment.chauffage',              'signalement', 'batiment',     'jour',       '{oui,non}', null, 'le chauffage en panne'),
    ('batiment.wifi',                   'signalement', 'batiment',     'jour',       '{oui,non}', null, 'le Wi-Fi en panne'),
    ('batiment.ferme_jusqu',            'signalement', 'batiment',     'date',       '{oui,non}', null, 'ferme jusqu''a sa fin (travaux)')
on conflict (sujet) do update
    set nature = excluded.nature, domaine = excluded.domaine, famille = excluded.famille, valeurs = excluded.valeurs,
        forme = excluded.forme, description = excluded.description, actif = true;

-- -----------------------------------------------------------------------------
-- 2. Les etats officiels
-- -----------------------------------------------------------------------------
--
-- Ce que l'equipe publie sur un lieu depuis la console : un sujet du vocabulaire, une valeur, et le
-- dernier jour ou il vaut (`fin`). Il passe devant l'etat de la communaute, qui reste calcule a cote
-- (src/shared/communaute/etat.ts). C'est aussi la validation d'une correction d'horaires. `expire_le` se
-- tire de `fin` — le soir de ce jour, a Paris — par le declencheur, qui juge aussi le vocabulaire :
-- une valeur que l'application ne saurait pas dire ne s'ecrit pas. Retirer un etat officiel, c'est le
-- supprimer : l'application relit tous les etats valables a chaque fois, une suppression lui parvient.
create table if not exists public.etats_officiels (
    id        uuid        primary key default gen_random_uuid(),
    sujet     text        not null references public.sujets (sujet),
    cible     text        not null check (cible ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$'),
    valeur    text        not null check (char_length(valeur) between 1 and 120),
    fin       date        not null,
    cree_le   timestamptz not null default now(),
    expire_le timestamptz not null,
    maj_le    timestamptz not null default now(),
    check (expire_le > cree_le)
);

create index if not exists etats_officiels_expire_le on public.etats_officiels (expire_le);

create or replace function private.valider_etat_officiel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_jour  date := (now() at time zone 'Europe/Paris')::date;
    v_sujet public.sujets%rowtype;
begin
    select * into v_sujet from public.sujets where sujet = new.sujet;
    if not found or v_sujet.nature <> 'signalement' or not v_sujet.actif then
        raise exception 'Ce sujet n’est pas un signalement du vocabulaire.';
    end if;
    if (v_sujet.valeurs is not null and not (new.valeur = any (v_sujet.valeurs)))
       or (v_sujet.forme is not null and new.valeur !~ v_sujet.forme) then
        raise exception 'Cette valeur n’est pas dans le vocabulaire de ce sujet.';
    end if;
    if new.fin < v_jour or new.fin > v_jour + 120 then
        raise exception 'Un état officiel vaut d’aujourd’hui à cent vingt jours au plus.';
    end if;
    new.expire_le := (new.fin + 1)::timestamp at time zone 'Europe/Paris';
    return new;
end;
$$;

drop trigger if exists valider on public.etats_officiels;
create trigger valider before insert or update on public.etats_officiels
    for each row execute function private.valider_etat_officiel();

drop trigger if exists maj_le on public.etats_officiels;
create trigger maj_le before update on public.etats_officiels
    for each row execute function private.tenir_maj_le();

drop trigger if exists journal on public.etats_officiels;
create trigger journal after insert or update or delete on public.etats_officiels
    for each row execute function private.journaliser('id');

revoke execute on function private.valider_etat_officiel() from public, anon, authenticated;

alter table public.etats_officiels enable row level security;
revoke all on public.etats_officiels from anon, authenticated;
-- Rien n'y est secret : l'application lit ce qui vaut encore, l'equipe lit tout, un admin ecrit.
grant select on public.etats_officiels to anon, authenticated;
grant insert, update, delete on public.etats_officiels to authenticated;

drop policy if exists "etats officiels valables lisibles" on public.etats_officiels;
create policy "etats officiels valables lisibles"
    on public.etats_officiels for select
    to anon, authenticated
    using (expire_le > now());

drop policy if exists "etats_officiels lisible par les editeurs" on public.etats_officiels;
create policy "etats_officiels lisible par les editeurs"
    on public.etats_officiels for select
    to authenticated
    using ((select private.est_editeur()));

drop policy if exists "etats_officiels creable par les admins" on public.etats_officiels;
create policy "etats_officiels creable par les admins"
    on public.etats_officiels for insert
    to authenticated
    with check ((select private.est_admin()));

drop policy if exists "etats_officiels modifiable par les admins" on public.etats_officiels;
create policy "etats_officiels modifiable par les admins"
    on public.etats_officiels for update
    to authenticated
    using ((select private.est_admin())) with check ((select private.est_admin()));

drop policy if exists "etats_officiels supprimable par les admins" on public.etats_officiels;
create policy "etats_officiels supprimable par les admins"
    on public.etats_officiels for delete
    to authenticated
    using ((select private.est_admin()));

-- -----------------------------------------------------------------------------
-- 3. La moderation
-- -----------------------------------------------------------------------------
--
-- Trois portes pour la console. La lecture est celle de toute l'equipe, comme les signalements eux-memes
-- (lot 1) ; masquer, retablir et bloquer sont des gestes d'admin. **Masquer est le retrait** : une ligne
-- supprimee ne parviendrait jamais aux appareils, dont la lecture ne redemande que ce qui a bouge
-- (`maj_le`), et resterait affichee jusqu'au soir. Une voix masquee garde sa valeur : l'application ne
-- la montre pas, la console en a besoin pour juger et retablir, et la lecture publique la perd au soir
-- de son jour. Chaque geste s'ecrit au journal a la main, sans la cle de l'appareil : le declencheur
-- `journaliser` copierait la ligne entiere.

-- Les signalements depuis un instant, pour la console : les colonnes que l'equipe lit deja, et, pour
-- chacun, si son auteur est bloque et combien il en a ecrit ce jour-la. Jamais la cle. Trente et un
-- jours au plus : la purge efface le reste.
create or replace function public.signalements_a_moderer(p_depuis timestamptz)
returns table (
    id uuid, sujet text, cible text, valeur text, fin date, poids smallint, statut text,
    cree_le timestamptz, expire_le timestamptz, maj_le timestamptz, auteur_bloque boolean, auteur_du_jour integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
    if not private.est_editeur() then
        raise exception 'La modération se lit par l’équipe de la console.' using errcode = '42501';
    end if;
    return query
    select s.id, s.sujet, s.cible, s.valeur, s.fin, s.poids, s.statut, s.cree_le, s.expire_le, s.maj_le,
           a.bloque_le is not null,
           (count(*) over (partition by s.appareil, (s.cree_le at time zone 'Europe/Paris')::date))::integer
      from public.signalements s
      join public.appareils a on a.cle = s.appareil
     where s.cree_le >= greatest(coalesce(p_depuis, now() - interval '1 day'), now() - interval '31 days')
     order by s.cree_le desc, s.id;
end;
$$;

-- Masquer une voix, ou la retablir. Masquer une voix qui avait valu un point de reputation a son
-- auteur le lui retire ; la retablir ne le lui rend pas. Retablie, une voix redevient active, sauf si son
-- appareil en a ecrit une plus recente, ou en porte une vivante, sur le meme sujet et la meme cible : elle
-- reste alors remplacee, une seule voix vivante par appareil. Celle d'un appareil bloque ne se retablit pas.
create or replace function public.moderer_signalement(p_id uuid, p_geste text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_s       public.signalements%rowtype;
    v_bloque  boolean;
    v_nouveau text;
begin
    if not private.est_admin() then
        raise exception 'Modérer est un geste d’admin.' using errcode = '42501';
    end if;
    if p_geste is null or p_geste not in ('masquer', 'retablir') then
        raise exception 'moderer_signalement : geste inconnu' using errcode = '22023';
    end if;
    select * into v_s from public.signalements where id = p_id for update;
    if not found then
        raise exception 'Ce signalement n’existe plus : la purge l’a peut-être effacé.';
    end if;

    if p_geste = 'masquer' then
        if v_s.statut = 'masquee' then
            return jsonb_build_object('statut', v_s.statut, 'change', false);
        end if;
        v_nouveau := 'masquee';
        if v_s.confirme_le is not null then
            update public.appareils set reputation = greatest(reputation - 1, 0) where cle = v_s.appareil;
        end if;
    else
        if v_s.statut <> 'masquee' then
            return jsonb_build_object('statut', v_s.statut, 'change', false);
        end if;
        select bloque_le is not null into v_bloque from public.appareils where cle = v_s.appareil;
        if v_bloque then
            raise exception 'L’auteur de ce signalement est bloqué : le débloquer d’abord.';
        end if;
        v_nouveau := case when exists (
            select 1 from public.signalements o
             where o.appareil = v_s.appareil and o.sujet = v_s.sujet and o.cible = v_s.cible
               and o.id <> v_s.id and (o.cree_le > v_s.cree_le or o.statut = 'active')
        ) then 'remplacee' else 'active' end;
    end if;

    update public.signalements set statut = v_nouveau where id = p_id;
    insert into public.journal (table_name, operation, ligne_id, avant, apres, par)
    values ('signalements', 'UPDATE', p_id::text,
            jsonb_build_object('statut', v_s.statut),
            jsonb_build_object('statut', v_nouveau, 'geste', p_geste, 'sujet', v_s.sujet, 'cible', v_s.cible, 'valeur', v_s.valeur),
            coalesce(nullif(auth.jwt() ->> 'email', ''), auth.role(), current_user));
    return jsonb_build_object('statut', v_nouveau, 'change', true);
end;
$$;

-- Bloquer l'appareil qui a ecrit un signalement, ou le debloquer. Bloquer remet sa reputation a zero et
-- masque ses voix encore valables : la fonction `communaute` refuse ensuite tout ce qu'il ecrit
-- (`appareil_bloque`). Debloquer ne retablit rien. Le jour seul, comme les autres dates d'un appareil.
create or replace function public.bloquer_auteur(p_id uuid, p_bloque boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_cle    bytea;
    v_avant  boolean;
    v_masque integer := 0;
begin
    if not private.est_admin() then
        raise exception 'Bloquer un appareil est un geste d’admin.' using errcode = '42501';
    end if;
    if p_bloque is null then
        raise exception 'bloquer_auteur : bloquer ou debloquer' using errcode = '22023';
    end if;
    select appareil into v_cle from public.signalements where id = p_id;
    if not found then
        raise exception 'Ce signalement n’existe plus : la purge l’a peut-être effacé.';
    end if;
    select bloque_le is not null into v_avant from public.appareils where cle = v_cle for update;

    if p_bloque then
        update public.appareils set bloque_le = coalesce(bloque_le, date_trunc('day', now())), reputation = 0 where cle = v_cle;
        with masquees as (
            update public.signalements set statut = 'masquee'
             where appareil = v_cle and statut = 'active' and expire_le > now()
            returning 1
        )
        select count(*) into v_masque from masquees;
    else
        update public.appareils set bloque_le = null where cle = v_cle;
    end if;

    insert into public.journal (table_name, operation, ligne_id, avant, apres, par)
    values ('appareils', 'UPDATE', 'signalement ' || p_id::text,
            jsonb_build_object('bloque', v_avant),
            jsonb_build_object('bloque', p_bloque, 'voix_masquees', v_masque),
            coalesce(nullif(auth.jwt() ->> 'email', ''), auth.role(), current_user));
    return jsonb_build_object('bloque', p_bloque, 'voix_masquees', v_masque);
end;
$$;

revoke execute on function public.signalements_a_moderer(timestamptz) from public, anon;
revoke execute on function public.moderer_signalement(uuid, text) from public, anon;
revoke execute on function public.bloquer_auteur(uuid, boolean) from public, anon;
grant execute on function public.signalements_a_moderer(timestamptz) to authenticated;
grant execute on function public.moderer_signalement(uuid, text) to authenticated;
grant execute on function public.bloquer_auteur(uuid, boolean) to authenticated;
