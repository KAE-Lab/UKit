-- Les sondages, la boite a idees (phase 8, lot 4 de la 7.0 ; docs/phase-8/4-sondages-idees-notation.md) :
-- un sondage dans une annonce, une voix par appareil ; les idees que l'equipe retient et publie, avec
-- « moi aussi » et le detail relie.
--
-- Additive : une colonne de `annonces`, une table neuve, deux sujets de vote, une colonne de `retours`,
-- une fonction de lecture publique, une garde, une tache quotidienne. `contribuer` et `deposer_retour`
-- sont reecrites a l'identique hors de deux blocs marques « lot 4 » : la cible d'un vote se juge, un
-- detail se range sous une idee. Aucune ecriture n'est ouverte a `anon` : un vote passe par la fonction
-- `communaute`, comme toute contribution.

-- -----------------------------------------------------------------------------
-- 1. Le sondage d'une annonce
-- -----------------------------------------------------------------------------
--
-- `{ question, choix: [{ id, libelle }], clos_le }` : une question, deux a six choix aux identifiants
-- distincts, une cloture. La colonne vit avec l'annonce — publiee, programmee, ciblee et archivee avec
-- elle —, et une version anterieure de l'application l'ignore. `clos_le` est un instant ISO 8601 avec
-- son fuseau, verifie par sa forme : un `check` ne lit pas l'heure courante.
create or replace function private.sondage_valide(s jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
    -- Pas a pas : un `and` ne garantit pas l'ordre, et `jsonb_object_keys` leve sur ce qui n'est pas un objet.
    if s is null or jsonb_typeof(s) <> 'object' or jsonb_typeof(s -> 'choix') is distinct from 'array'
       or jsonb_typeof(s -> 'question') is distinct from 'string' or jsonb_typeof(s -> 'clos_le') is distinct from 'string' then
        return false;
    end if;
    if exists (select 1 from jsonb_object_keys(s) k where k not in ('question', 'choix', 'clos_le'))
       or char_length(btrim(s ->> 'question')) not between 4 and 140
       or (s ->> 'clos_le') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2}([.][0-9]{1,6})?)?(Z|[+-][0-9]{2}:[0-9]{2})$'
       or jsonb_array_length(s -> 'choix') not between 2 and 6 then
        return false;
    end if;
    if exists (select 1 from jsonb_array_elements(s -> 'choix') c where jsonb_typeof(c) <> 'object') then
        return false;
    end if;
    -- Une date de la bonne forme mais impossible (un 30 fevrier, 25 h) leverait au vote : refusee ici. Le
    -- fuseau est exige par la forme, le resultat ne depend donc pas de celui de la session.
    begin
        perform (s ->> 'clos_le')::timestamptz;
    exception when others then
        return false;
    end;
    return not exists (
               select 1 from jsonb_array_elements(s -> 'choix') c
                where jsonb_typeof(c -> 'id') is distinct from 'string'
                   or (c ->> 'id') !~ '^[a-z0-9]{1,8}$'
                   or jsonb_typeof(c -> 'libelle') is distinct from 'string'
                   or char_length(btrim(c ->> 'libelle')) not between 1 and 60)
       and (select count(distinct c ->> 'id') from jsonb_array_elements(s -> 'choix') c) = jsonb_array_length(s -> 'choix');
end;
$$;

alter table public.annonces add column if not exists sondage jsonb
    constraint annonces_sondage_check check (sondage is null or private.sondage_valide(sondage));

insert into public.sujets (sujet, nature, domaine, famille, valeurs, forme, description) values
    ('sondage.choix', 'vote', 'annonce', null, null, '^[a-z0-9]{1,8}$',
     'un choix dans le sondage d''une annonce : l''identifiant du choix'),
    ('idee.moi_aussi', 'vote', 'idee', null, array['oui'], null,
     'moi aussi sur une idee publiee')
on conflict (sujet) do update
    set nature = excluded.nature, domaine = excluded.domaine, famille = excluded.famille, valeurs = excluded.valeurs,
        forme = excluded.forme, description = excluded.description, actif = true;

-- -----------------------------------------------------------------------------
-- 2. La boite a idees
-- -----------------------------------------------------------------------------
--
-- Les idees que l'equipe retient des retours, reformulees pour etre lues par tous, au gabarit des
-- problemes connus. `brouillon` ne se lit que par l'equipe ; `proposee` et `en_cours` se soutiennent ;
-- `livree` se lit avec sa version, et l'appareil qui l'a soutenue l'annonce ; `close` disparait.
create table if not exists public.idees (
    id             uuid        primary key default gen_random_uuid(),
    titre          text        not null check (char_length(btrim(titre)) between 4 and 140),
    detail         text        check (char_length(detail) <= 600),
    statut         text        not null default 'brouillon'
                               check (statut in ('brouillon', 'proposee', 'en_cours', 'livree', 'close')),
    version_livree text        check (version_livree ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'),
    cree_le        timestamptz not null default now(),
    maj_le         timestamptz not null default now(),
    -- « Livree dans telle version » : l'appareil qui l'a soutenue l'annonce avec elle.
    check (statut <> 'livree' or version_livree is not null)
);

drop trigger if exists maj_le on public.idees;
create trigger maj_le before update on public.idees
    for each row execute function private.tenir_maj_le();

drop trigger if exists journal on public.idees;
create trigger journal after insert or update or delete on public.idees
    for each row execute function private.journaliser('id');

-- « Moi aussi, et j'ajoute un detail » : le retour range sous l'idee, comme sous un probleme connu.
alter table public.retours add column if not exists idee uuid references public.idees (id) on delete set null;
create index if not exists retours_idee on public.retours (idee) where idee is not null;

-- -----------------------------------------------------------------------------
-- 3. La cible d'un vote
-- -----------------------------------------------------------------------------
--
-- Appelee par `contribuer` pour un vote, apres la valeur : la raison d'un refus, ou `null`. Un sondage
-- se vote dans une annonce visible — la politique de lecture d'`anon` —, avant sa cloture, pour l'un de
-- ses choix ; une idee, proposee ou en cours. Les autres sujets passent tels quels.
create or replace function private.juger_vote(p_sujet text, p_cible text, p_valeur text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
    v_sondage jsonb;
begin
    if p_sujet = 'sondage.choix' then
        if p_cible !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
            return 'cible_inconnue';
        end if;
        select a.sondage into v_sondage from public.annonces a
         where a.id = p_cible::uuid and a.active and a.statut = 'publiee' and a.publiee_le <= now()
           and (a.expire_le is null or a.expire_le > now());
        if v_sondage is null then
            return 'cible_inconnue';
        end if;
        if (v_sondage ->> 'clos_le')::timestamptz <= now() then
            return 'sondage_clos';
        end if;
        if not exists (select 1 from jsonb_array_elements(v_sondage -> 'choix') c where c ->> 'id' = p_valeur) then
            return 'valeur_invalide';
        end if;
    elsif p_sujet = 'idee.moi_aussi' then
        if p_cible !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           or not exists (select 1 from public.idees where id = p_cible::uuid and statut in ('proposee', 'en_cours')) then
            return 'cible_inconnue';
        end if;
    end if;
    return null;
end;
$$;

-- Appelee par `contribuer`, `security definer` : elle s'execute avec les droits de son proprietaire.
revoke execute on function private.juger_vote(text, text, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Les portes, reecrites
-- -----------------------------------------------------------------------------
--
-- Le corps des lots 1 et 3, a l'identique, plus les blocs marques « lot 4 ». Les droits ne changent pas :
-- `create or replace` les garde.
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
    v_raison     text;
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
        -- `admettre` a ouvert la ligne du jour ; une demande admise juste avant minuit arrive ici le
        -- lendemain, d'ou l'insertion plutot qu'une mise a jour qui ne trouverait rien.
        insert into public.empreintes_ip (jour, empreinte, non_attestes) values (v_jour, v_empreinte, 1)
        on conflict (jour, empreinte) do update set non_attestes = public.empreintes_ip.non_attestes + 1
        returning non_attestes into v_n;
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
       set vu_le      = date_trunc('day', now()),
           compteur   = coalesce(v_compteur, compteur),
           atteste_le = case when v_atteste then date_trunc('day', now()) else atteste_le end
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

    -- 5b. La cible d'un vote (lot 4) : un sondage ouvert et l'un de ses choix, une idee publiee.
    if v_sujet.nature = 'vote' then
        v_raison := private.juger_vote(v_sujet.sujet, v_cible, v_valeur);
        if v_raison is not null then
            return jsonb_build_object('statut', 'refusee', 'raison', v_raison);
        end if;
    end if;

    -- 6a. Un vote : un bulletin par jeton et par cible, definitif, d'un poids d'une voix au plus — un
    --     sondage compte des appareils, pas des reputations.
    if v_sujet.nature = 'vote' then
        insert into public.votes (sujet, cible, jeton, valeur, poids, cree_le)
        values (v_sujet.sujet, v_cible, v_jeton, v_valeur, least(v_poids, 1), v_debut)
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
             where t.id = c.id and t.confirme_le is null
            returning t.appareil
        )
        update public.appareils a
           set reputation = a.reputation + 1
         where a.cle in (select appareil from confirmes);
    end if;

    return jsonb_build_object('statut', 'acceptee', 'id', v_id, 'poids', v_poids);
end;
$$;

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
    v_idee        uuid;
    v_contexte    jsonb;
    v_captures    integer;
    v_cle_reponse bytea;
    v_depot       uuid;
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

    -- 0. Un depot deja ecrit : sa ligne, sans rien compter de plus. L'appareil le rejoue quand la reponse
    --    s'est perdue ; sans cela, il ecrirait un doublon, ou buterait pour toujours sur sa cle de reponse.
    if (v_r ->> 'depot') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        v_depot := (v_r ->> 'depot')::uuid;
        -- Plus de capture a deposer pour un retour clos ou deja purge : la purge ne la reprendrait pas.
        select id, case when clos_le is null and captures_purgees_le is null then captures else 0 end
          into v_id, v_captures from public.retours where depot = v_depot;
        if v_id is not null then
            return jsonb_build_object('statut', 'acceptee', 'id', v_id, 'captures', v_captures, 'deja', true);
        end if;
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

    -- Une idee close ou retiree depuis : de meme (lot 4). Seulement pour une idee, et jamais avec un probleme.
    if v_type = 'fonctionnalite' and v_probleme is null
       and (v_r ->> 'idee') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select id into v_idee from public.idees
         where id = (v_r ->> 'idee')::uuid and statut in ('proposee', 'en_cours');
    end if;

    -- 5. La ligne. Sa cle, comme celle d'un retour importe, est une empreinte SHA-256 : celle de son
    --    texte, de son instant et d'un sel tire au hasard (7-L).
    v_id := encode(extensions.digest(
        convert_to(v_texte || '|' || coalesce(v_campus, '') || '|' || clock_timestamp()::text, 'UTF8') || extensions.gen_random_bytes(16),
        'sha256'), 'hex');
    insert into public.retours (
        id, recu_le, nature, campus, section, appareil, systeme, version_app, texte, contact, volontaire,
        reponses, source, contexte, captures, probleme, idee, atteste, reponse_possible, cle_reponse, depot)
    values (
        v_id, now(), v_type, v_campus, left(v_contexte ->> 'onglet', 40), left(v_contexte ->> 'appareil', 120),
        left(v_contexte ->> 'systeme', 60), left(v_contexte ->> 'version', 20), v_texte, v_contact, v_volontaire,
        '{}'::jsonb, 'app', v_contexte, v_captures, v_probleme, v_idee, v_atteste, v_cle_reponse is not null, v_cle_reponse, v_depot);
    return jsonb_build_object('statut', 'acceptee', 'id', v_id, 'captures', v_captures, 'probleme', v_probleme, 'idee', v_idee);
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Les resultats d'un sondage
-- -----------------------------------------------------------------------------
--
-- Lisibles par tous, pour l'annonce visible d'`anon` : `{ total, parts: { <choix>: <part> } }`. Seules les
-- voix attestees comptent. Une part est un pourcentage entier ; un choix sous cinq voix rend `null`
-- (docs/mesure.md, les petites cases), et les cases masquees se regroupent : tant que leur somme reste
-- sous cinq, la plus petite case visible les rejoint — sans quoi la case masquee se lirait par
-- soustraction des parts visibles. Si tout se masque, aucune part. `total` ne se rend que si aucune case
-- n'est masquee. `null` pour une annonce sans sondage ou invisible. Le vote ne porte aucun identifiant : la base ne sait pas qui a vote, et ne peut
-- pas reserver les resultats aux votants — l'application ne les montre qu'apres le vote.
create or replace function public.resultats_sondage(p_annonce uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_sondage jsonb;
    v_total   integer;
    v_masque  boolean;
    v_parts   jsonb;
begin
    select a.sondage into v_sondage from public.annonces a
     where a.id = p_annonce and a.active and a.statut = 'publiee' and a.publiee_le <= now()
       and (a.expire_le is null or a.expire_le > now());
    if v_sondage is null then
        return null;
    end if;
    -- Les cases, de la plus petite a la plus grande : les petites (sous cinq) viennent en tete, et le
    -- groupe masque s'etend dans cet ordre jusqu'a compter cinq voix au moins.
    with choix as (
        select c ->> 'id' as id from jsonb_array_elements(v_sondage -> 'choix') c
    ), comptes as (
        select choix.id, count(v.valeur)::integer as n
          from choix
          left join public.votes v
            on v.sujet = 'sondage.choix' and v.cible = p_annonce::text and v.valeur = choix.id and v.poids >= 1
         group by choix.id
    ), rangs as (
        select id, n,
               row_number() over (order by n, id) as rang,
               sum(n) over (order by n, id) as cumul,
               sum(n) over () as tout,
               count(*) filter (where n < 5) over () as petites
          from comptes
    ), borne as (
        -- Le rang de la derniere case masquee : 0 sans petite case, null quand tout se masque.
        select case when max(petites) = 0 then 0
                    else min(rang) filter (where rang >= petites and cumul >= 5 and rang < (select count(*) from rangs)) end as k
          from rangs
    )
    select coalesce(max(r.tout), 0)::integer, max(b.k) is distinct from 0,
           case when bool_and(b.k is not null) then
               jsonb_object_agg(r.id, case when r.rang > b.k then round(100.0 * r.n / nullif(r.tout, 0))::integer end)
           end
      into v_total, v_masque, v_parts
      from rangs r cross join borne b;
    if v_total < 5 or v_parts is null then
        return jsonb_build_object('total', null, 'parts', '{}'::jsonb);
    end if;
    return jsonb_build_object('total', case when v_masque then null else v_total end, 'parts', v_parts);
end;
$$;

revoke execute on function public.resultats_sondage(uuid) from public;
grant execute on function public.resultats_sondage(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. La conservation des votes
-- -----------------------------------------------------------------------------
--
-- Douze mois apres leur jour (lot 1 : « fixee au lot 4 »). Un vote ne porte aucun identifiant ; la duree
-- borne ce que le jeton, que la fonction seule sait recalculer, garde d'un appareil.
create or replace function private.purger_votes()
returns void
language sql
security definer
set search_path = ''
as $$
    delete from public.votes where cree_le < now() - interval '12 months';
$$;

revoke execute on function private.purger_votes() from public, anon, authenticated;
select cron.schedule('votes-purge', '23 3 * * *', 'select private.purger_votes()');

-- -----------------------------------------------------------------------------
-- 7. Les politiques
-- -----------------------------------------------------------------------------
--
-- `idees` : l'application lit ce qui est publie, l'equipe tout, un admin ecrit. `retours.idee` s'ajoute a
-- la lecture de l'equipe. `annonces.sondage` suit les droits de la table, accordes a la table entiere :
-- qui lit ou ecrit une annonce lit ou ecrit son sondage.
grant select (idee) on public.retours to authenticated;

alter table public.idees enable row level security;
revoke all on public.idees from anon, authenticated;
grant select on public.idees to anon, authenticated;
grant insert, update, delete on public.idees to authenticated;

drop policy if exists "idees publiees lisibles" on public.idees;
create policy "idees publiees lisibles"
    on public.idees for select
    to anon, authenticated
    using (statut in ('proposee', 'en_cours', 'livree'));

drop policy if exists "idees lisibles par les editeurs" on public.idees;
create policy "idees lisibles par les editeurs"
    on public.idees for select
    to authenticated
    using ((select private.est_editeur()));

drop policy if exists "idees creables par les admins" on public.idees;
create policy "idees creables par les admins"
    on public.idees for insert
    to authenticated
    with check ((select private.est_admin()));

drop policy if exists "idees modifiables par les admins" on public.idees;
create policy "idees modifiables par les admins"
    on public.idees for update
    to authenticated
    using ((select private.est_admin()))
    with check ((select private.est_admin()));

drop policy if exists "idees supprimables par les admins" on public.idees;
create policy "idees supprimables par les admins"
    on public.idees for delete
    to authenticated
    using ((select private.est_admin()));
