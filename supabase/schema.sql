-- UKit — schema de la base de publication.
--
-- Ce fichier est la source de verite du schema : il s'applique depuis ici, jamais depuis l'interface
-- web, sinon rien n'est reproductible. Les politiques d'acces vivent dans policies.sql.
--
-- Principe directeur : la base porte de la **donnee**, jamais de la logique. Pas de fonction metier,
-- pas de declencheur, pas de vue qui calcule. Ce qui se calcule se calcule dans l'application, ou
-- c'est type, relu et verifie.
--
-- Chaque table publiee a un **socle embarque** dans le binaire (un fichier JSON, un referentiel, une
-- valeur par defaut) : l'application doit fonctionner au premier lancement, hors ligne, sans avoir
-- jamais joint cette base.
--
-- Voir docs/backend.md et docs/phase-6/6-b-supabase.md.

-- =============================================================================
-- Contenu editorial
-- =============================================================================

-- Annonces de vie etudiante. Remplace ukit-data/annonces.json servi par jsDelivr.
-- La peremption est filtree ici (par la politique de lecture) **et** dans l'application : la
-- politique protege la donnee, le filtre applicatif protege l'affichage quand la donnee vient du
-- cache local.
create table if not exists public.annonces (
    id          uuid primary key default gen_random_uuid(),
    titre       text        not null,
    emetteur    text        not null,
    accroche    text,
    description text,
    image_url   text,
    cta_texte   text,
    cta_lien    text,
    publiee_le  timestamptz not null default now(),
    expire_le   timestamptz,
    active      boolean     not null default true,
    creee_le    timestamptz not null default now()
);

create index if not exists annonces_publication_idx
    on public.annonces (active, expire_le desc);

-- Bandeau de service : maintenance, incident, information datee.
create table if not exists public.service_messages (
    id         uuid primary key default gen_random_uuid(),
    niveau     text        not null check (niveau in ('info', 'avertissement', 'incident')),
    titre      text        not null,
    corps      text,
    actif      boolean     not null default true,
    publie_le  timestamptz not null default now(),
    expire_le  timestamptz
);

-- =============================================================================
-- Referentiels
-- =============================================================================

-- Referentiel des lieux. Surcouche de assets/locations.json, qui reste le socle hors ligne.
-- `horaires` est volontairement libre : la forme est celle du fichier embarque, et la figer en
-- colonnes obligerait a migrer la base chaque fois qu'un batiment a un cas particulier.
create table if not exists public.batiments (
    code        text primary key,
    nom         text        not null,
    campus      text,
    latitude    double precision,
    longitude   double precision,
    acces_libre boolean     not null default false,
    horaires    jsonb,
    image_url   text,
    maj_le      timestamptz not null default now()
);

-- Catalogue des universites et de leurs portails.
-- Un champ de portail a null est un cas normal : une fac sans messagerie extractible existe, et
-- l'ecran n'affiche alors pas la carte.
create table if not exists public.etablissements (
    code               text primary key,
    nom                text        not null,
    ville              text,
    logo_url           text,
    actif              boolean     not null default true,
    -- Les noms des Blueprints a jouer. Ils vivent sous le prefixe reserve `ukit.portail.`, seul
    -- prefixe qu'un manifeste distant a le droit d'etendre (voir docs/phase-6/6-g-etablissements.md).
    portail_dossier    text,
    portail_messagerie text,
    -- Ce qui fait varier les Blueprints d'emploi du temps d'un etablissement a l'autre.
    celcat_domaine     text,
    -- Les intitules propres a l'etablissement (« numero etudiant », « INE », …). Les libelles
    -- d'ecran, eux, restent traduits par Translator : confondre les deux ramenerait des chaines en dur.
    libelles           jsonb,
    ordre              integer     not null default 0
);

-- =============================================================================
-- Livraison
-- =============================================================================

-- L'index de livraison des Blueprints : la surface d'edition dont manifest.json est la projection.
-- Le manifeste est un **artefact genere**, jamais un fichier qu'on edite — une empreinte ecrite a la
-- main est perimee des la premiere correction, et un manifeste dont l'empreinte ment est exactement
-- ce que l'appareil rejette.
create table if not exists public.blueprints (
    nom        text primary key,
    version    text        not null,
    chemin     text        not null,
    sha256     text        not null check (sha256 ~ '^[0-9a-f]{64}$'),
    min_engine text,
    desactive  boolean     not null default false,
    publie_le  timestamptz not null default now()
);

-- Version courante et minimale par plateforme. Remplace la lecture du fichier VERSION sur GitHub raw.
create table if not exists public.app_release (
    plateforme       text primary key check (plateforme in ('ios', 'android')),
    version_courante text        not null,
    version_minimale text        not null,
    lien_store       text        not null,
    message          text,
    maj_le           timestamptz not null default now()
);

-- =============================================================================
-- Buckets
-- =============================================================================
--
--   blueprints  les fichiers d'instructions et manifest.json  — lecture publique
--   media       visuels des annonces et des batiments         — lecture publique
--
-- Les deux se creent depuis la console ou la CLI ; leurs politiques sont dans policies.sql.
