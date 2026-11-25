-- La base communautaire (phase 8, lot 1 de la 7.0) : ce que les etudiants ecrivent depuis
-- l'application, signalements sur des lieux et votes, et l'identite d'appareil qui les borne
-- (docs/phase-8/1-base-communautaire.md).
--
-- Cinq tables : le vocabulaire ferme des sujets, les appareils (leur cle serveur, leur attestation,
-- leur reputation, leur blocage), les signalements, les votes, et l'empreinte salee des adresses IP,
-- comptee par jour. Une sixieme, dans `private`, porte les plafonds, les seuils et les poids : leurs
-- valeurs ne sont pas dans le depot, elles se posent a part (supabase/README.md). Une tache horaire
-- de pg_cron tient les durees de conservation.
--
-- **Aucune ecriture par `anon`**, a l'inverse de `compter` : les trois portes, `admettre`,
-- `enregistrer_appareil` et `contribuer`, sont reservees au `service_role`, que seule la fonction
-- `communaute` detient, apres avoir verifie l'attestation de l'appareil. Une porte ouverte a `anon`
-- contournerait l'attestation. La lecture publique se borne aux signalements encore valables
-- aujourd'hui, **sans la cle de l'appareil** qui les a ecrits, par un privilege de colonne.
--
-- La base garde la confiance — plafonds, reputation, poids d'une voix — parce que l'appareil ne peut
-- pas se l'accorder lui-meme ; elle ne calcule pas l'etat d'un lieu, que l'application tire des
-- signalements du jour (src/shared/communaute/etat.ts).
--
-- Pas de declencheur `journal` : le journal trace ce que l'equipe publie, pas ce que le parc ecrit.

-- -----------------------------------------------------------------------------
-- Le vocabulaire
-- -----------------------------------------------------------------------------
--
-- Un sujet est un type de contribution que l'application propose, jamais un texte libre. Les lots qui
-- suivent y ajoutent leurs lignes par migration — les signalements des restaurants, des bibliotheques
-- et des batiments, les sondages, la boite a idees —, sans toucher au reste. `domaine` dit ce que
-- designe la `cible` d'une contribution (un restaurant par son code Croustillant, un batiment par
-- `<etablissement>/<code>`, une annonce par son id) ; `famille` dit combien de temps un signalement
-- vaut (jour : jusqu'au soir ; date : jusqu'a sa `fin` ; correction : jusqu'a la console ou au plafond
-- de duree ; direct : quelques minutes) ; un vote n'en a pas. Une valeur est prise dans `valeurs`, ou,
-- pour un choix dans une liste que l'application lit ailleurs (un plat du menu du jour), conforme a
-- `forme`. Un sujet retire passe `actif = false` : sa ligne reste tant que des signalements la citent.
create table if not exists public.sujets (
    sujet       text    primary key check (sujet ~ '^[a-z]+(\.[a-z_]+)+$' and char_length(sujet) <= 48),
    nature      text    not null check (nature in ('signalement', 'vote')),
    domaine     text    not null check (domaine ~ '^[a-z_]{1,24}$'),
    famille     text    check (famille in ('jour', 'date', 'correction', 'direct')),
    valeurs     text[]  check (cardinality(valeurs) between 1 and 32),
    forme       text    check (char_length(forme) <= 200),
    description text,
    actif       boolean not null default true,
    check ((nature = 'vote') = (famille is null)),
    check ((valeurs is null) <> (forme is null))
);

-- -----------------------------------------------------------------------------
-- Les appareils
-- -----------------------------------------------------------------------------
--
-- La cle serveur d'un appareil, jamais son identifiant d'installation (PRIVACY.md, 4 ter) : sur iOS,
-- l'identifiant de la cle App Attest (l'empreinte SHA-256 de sa cle publique, `nature = app_attest`) ;
-- ailleurs — Android, et un iPhone sans App Attest —, l'empreinte SHA-256 d'un secret tire sur
-- l'appareil et envoye avec chaque contribution (`nature = secret`). La base ne garde jamais le secret
-- lui-meme. Une reinstallation fait une autre cle : la reputation repart de zero.
--
-- `compteur` est celui des assertions App Attest : il ne fait que monter, et une assertion rejouee
-- est refusee. `atteste_le` : le jour de la derniere contribution attestee. `bloque_le` : la
-- moderation (lot 2). Les trois dates d'un appareil ne disent que le jour : une heure exacte, egale a
-- celle d'un signalement ou d'un vote ecrit dans la meme transaction, les relierait a lui.
create table if not exists public.appareils (
    cle           bytea       primary key check (octet_length(cle) = 32),
    nature        text        not null check (nature in ('app_attest', 'secret')),
    plateforme    text        not null check (plateforme in ('ios', 'android')),
    -- App Attest : le point P-256 non compresse de la cle attestee, de quoi verifier ses assertions.
    cle_publique  bytea       check (octet_length(cle_publique) = 65),
    environnement text        check (environnement in ('production', 'developpement')),
    compteur      bigint      not null default 0 check (compteur >= 0),
    reputation    integer     not null default 0 check (reputation >= 0),
    atteste_le    timestamptz,
    bloque_le     timestamptz,
    cree_le       timestamptz not null default date_trunc('day', now()),
    vu_le         timestamptz not null default date_trunc('day', now()),
    check ((nature = 'app_attest') = (cle_publique is not null)),
    check ((nature = 'app_attest') = (environnement is not null)),
    check (nature = 'secret' or plateforme = 'ios')
);

create index if not exists appareils_vu_le on public.appareils (vu_le);

-- -----------------------------------------------------------------------------
-- Les signalements
-- -----------------------------------------------------------------------------
--
-- Une voix sur un lieu : un sujet, une cible, une valeur. `poids` est fixe a l'ecriture : 0 pour une
-- contribution non attestee, qui s'affiche en retrait sans jamais compter ; 1 pour une voix ; 2 pour
-- la voix d'un appareil fiable. `expire_le` borne ce qu'un signalement peut valoir, selon sa famille ;
-- l'application en tire la duree qu'elle affiche, jamais plus. Un appareil n'a qu'une voix vivante
-- par sujet et par cible : la suivante passe la precedente en `remplacee`. `masquee` : la moderation.
-- `maj_le` bouge quand le statut bouge — c'est le curseur de la lecture incrementale de l'application.
create table if not exists public.signalements (
    id          uuid        primary key default gen_random_uuid(),
    sujet       text        not null references public.sujets (sujet),
    cible       text        not null check (cible ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$'),
    valeur      text        not null check (char_length(valeur) between 1 and 120),
    fin         date,
    poids       smallint    not null check (poids between 0 and 2),
    statut      text        not null default 'active' check (statut in ('active', 'remplacee', 'masquee')),
    cree_le     timestamptz not null default now(),
    expire_le   timestamptz not null,
    maj_le      timestamptz not null default now(),
    appareil    bytea       not null references public.appareils (cle),
    -- La premiere confirmation par un autre appareil, qui a credite l'auteur d'un point de reputation.
    confirme_le timestamptz,
    check (expire_le > cree_le)
);

create index if not exists signalements_maj_le on public.signalements (maj_le);
create index if not exists signalements_expire_le on public.signalements (expire_le);
create index if not exists signalements_appareil on public.signalements (appareil, cree_le);
create index if not exists signalements_cible on public.signalements (sujet, cible) where statut = 'active';
-- Le plafond du non atteste compte les voix de poids nul du jour, pour tout le parc.
create index if not exists signalements_non_attestes on public.signalements (cree_le) where poids = 0;

-- -----------------------------------------------------------------------------
-- Les votes
-- -----------------------------------------------------------------------------
--
-- Un bulletin par appareil et par cible : une option de sondage, un « moi aussi » sur une idee ou un
-- probleme connu (lot 4). **Aucun vote ne porte d'identifiant** (docs/phase-8/README.md, vie privee) :
-- `jeton` est un HMAC de la cle de l'appareil, du sujet et de la cible, calcule par la fonction
-- `communaute` avec une cle qui n'est qu'a elle. Il suffit a refuser un second bulletin sur la meme
-- cible, et ne relie ni deux votes du meme appareil, ni un vote a un appareil, pas meme pour qui lit
-- toute la base sans le secret de la fonction. `cree_le` ne dit que le jour de Paris, pour la meme
-- raison. Aucune lecture publique dans ce lot : le lot qui les montre la pose.
create table if not exists public.votes (
    sujet   text        not null references public.sujets (sujet),
    cible   text        not null check (cible ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$'),
    jeton   bytea       not null check (octet_length(jeton) = 32),
    valeur  text        not null check (char_length(valeur) between 1 and 120),
    poids   smallint    not null check (poids between 0 and 1),
    cree_le timestamptz not null default now(),
    primary key (sujet, cible, jeton)
);

create index if not exists votes_non_attestes on public.votes (cree_le) where poids = 0;

-- -----------------------------------------------------------------------------
-- Les adresses IP, en empreinte
-- -----------------------------------------------------------------------------
--
-- Trois compteurs par empreinte et par jour de Paris : les demandes, pour le plafond haut par adresse
-- (un amphi entier sort par la meme) ; les verdicts Play Integrity demandes a Google, dont le quota
-- est celui de tout le parc ; les contributions non attestees, pour qu'une seule adresse ne vide pas
-- le plafond du parc. L'empreinte est un HMAC de l'adresse sous une cle du jour, tiree par la fonction
-- `communaute` d'un secret qui n'est qu'a elle : l'adresse n'entre jamais dans la base, et l'empreinte
-- d'un jour ne se relie a celle d'aucun autre. La tache horaire efface les jours passes. Rien ne
-- relie une empreinte a un appareil ni a une contribution.
create table if not exists public.empreintes_ip (
    jour         date    not null,
    empreinte    bytea   not null check (octet_length(empreinte) = 32),
    n            integer not null default 0 check (n >= 0),
    verdicts     integer not null default 0 check (verdicts >= 0),
    non_attestes integer not null default 0 check (non_attestes >= 0),
    primary key (jour, empreinte)
);

-- -----------------------------------------------------------------------------
-- La configuration
-- -----------------------------------------------------------------------------
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

revoke execute on function public.admettre(jsonb) from public, anon, authenticated;
revoke execute on function public.enregistrer_appareil(jsonb) from public, anon, authenticated;
revoke execute on function public.contribuer(jsonb) from public, anon, authenticated;
grant execute on function public.admettre(jsonb) to service_role;
grant execute on function public.enregistrer_appareil(jsonb) to service_role;
grant execute on function public.contribuer(jsonb) to service_role;

-- -----------------------------------------------------------------------------
-- Les politiques
-- -----------------------------------------------------------------------------
--
-- `revoke` d'abord : une table nouvelle nait avec tous les privileges accordes a `anon` et
-- `authenticated` (les privileges par defaut du projet). Puis la lecture publique des signalements,
-- colonne par colonne — ni `appareil`, ni `confirme_le` — et ligne par ligne : ce qui vaut encore
-- aujourd'hui, a l'heure de Paris, statuts compris, pour que la lecture incrementale apprenne qu'une
-- voix a ete remplacee ou masquee. Un `select *` de la cle publiable est refuse : l'application
-- nomme ses colonnes. Les editeurs lisent les memes colonnes sur toutes les lignes ; un admin compte
-- les appareils sans lire leur cle. `empreintes_ip` ne se lit par aucun compte.
alter table public.sujets        enable row level security;
alter table public.appareils     enable row level security;
alter table public.signalements  enable row level security;
alter table public.votes         enable row level security;
alter table public.empreintes_ip enable row level security;
alter table private.reglages_communaute enable row level security;

revoke all on public.sujets, public.appareils, public.signalements, public.votes, public.empreintes_ip
    from anon, authenticated;
revoke all on private.reglages_communaute from anon, authenticated;

grant select (id, sujet, cible, valeur, fin, poids, statut, cree_le, expire_le, maj_le)
    on public.signalements to anon, authenticated;

drop policy if exists "signalements du jour lisibles" on public.signalements;
create policy "signalements du jour lisibles"
    on public.signalements for select
    to anon, authenticated
    using (expire_le > date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris');

drop policy if exists "signalements lisibles par les editeurs" on public.signalements;
create policy "signalements lisibles par les editeurs"
    on public.signalements for select
    to authenticated
    using (private.est_editeur());

grant select on public.sujets to authenticated;
drop policy if exists "sujets lisibles par les editeurs" on public.sujets;
create policy "sujets lisibles par les editeurs"
    on public.sujets for select
    to authenticated
    using (private.est_editeur());

grant select (sujet, cible, valeur, poids, cree_le) on public.votes to authenticated;
drop policy if exists "votes lisibles par les editeurs" on public.votes;
create policy "votes lisibles par les editeurs"
    on public.votes for select
    to authenticated
    using (private.est_editeur());

grant select (nature, plateforme, environnement, reputation, atteste_le, bloque_le, cree_le, vu_le)
    on public.appareils to authenticated;
drop policy if exists "appareils comptes par les admins" on public.appareils;
create policy "appareils comptes par les admins"
    on public.appareils for select
    to authenticated
    using (private.est_admin());
