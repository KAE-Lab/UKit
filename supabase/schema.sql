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
-- Un champ nul est un cas **normal**, pas un trou a combler : une fac sans messagerie extractible
-- existe (Bordeaux INP, dont le webmail passe par SAML et non par le CAS), une fac sans serveur
-- d'emploi du temps interrogeable aussi. Prevoir l'absence des le premier jour coute moins cher que
-- de la decouvrir au second etablissement.
--
-- Ce qui varie d'un etablissement a l'autre vit **ici ou dans un Blueprint**, jamais dans une
-- condition applicative : `if (etablissement === 'bordeaux')` est le defaut que ce jalon existe pour
-- ne pas ecrire. Voir docs/phase-6/6-g-etablissements.md.
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
    -- Ce qui fait varier les Blueprints d'emploi du temps d'un etablissement a l'autre. `null` veut
    -- dire « cet etablissement ne publie pas son emploi du temps ici », ce que l'ecran **dit** au
    -- lieu d'echouer. `celcat_res_types` projette les roles sur les codes de la source
    -- ({"groupes": "103", "salles": "102"}) : ils sont conventionnels, pas garantis.
    celcat_domaine     text,
    celcat_res_types   jsonb,
    -- L'emploi du temps par export iCalendar, pour les universites qui ne sont pas sur un Celcat
    -- ouvert — c'est-a-dire presque toutes (jalon 6-I). Le catalogue dit **ce qui existe** : les deux
    -- Blueprints a jouer, les parametres propres a l'annee, et le referentiel des groupes. Le
    -- *quoi faire* reste dans le Blueprint.
    --   {"blueprint": "ukit.portail.<code>.edt",
    --    "blueprint_annee": "ukit.portail.<code>.edt.annee",
    --    "params": {"projet": "1"},
    --    "groupes": [{"nom": "…", "ressource": "…"}, …]}
    -- `null` : cet etablissement n'a pas d'export iCalendar. Un etablissement dont `celcat_domaine`
    -- **et** `edt` sont nuls n'a pas d'emploi du temps du tout, ce que l'onglet Planning dit au lieu
    -- d'echouer.
    edt                jsonb,
    -- Comment lire un code de batiment dans un libelle de salle, chez cet etablissement.
    --   {"separateurs": [" | ", "/"], "motif": "([A-Z][0-9]+)", "depuis": 2}
    -- Le premier separateur **enumere**, les suivants **tronquent** ; `motif` capture le code en
    -- premier groupe ; `depuis` est le rang de la premiere ligne de description ou chercher une
    -- salle. Une colonne nulle vaut le comportement historique de Celcat, ce qui rend la migration
    -- invisible. C'etait du code bordelais jusqu'au jalon 6-I (src/shared/locations/salles.ts).
    salles             jsonb,
    -- Le serveur d'inventaire des salles libres, quand ce n'est **pas** celui de l'etablissement :
    --   {"domaine": "https://celcat.u-bordeaux.fr/calendar", "res_type": "102"}
    -- `null` : celui de l'etablissement fait l'affaire. Une valeur veut dire qu'il **emprunte**
    -- l'inventaire d'un autre serveur, parce que ses etudiants sont physiquement sur le meme campus.
    -- L'emprunt ne concerne que les salles : l'emploi du temps garde sa propre source.
    salles_libres      jsonb,
    -- Les points de balayage des bibliotheques : [{"lat": …, "lng": …}, …]. Ce sont des decisions
    -- produit — quelles villes on couvre — et non une propriete de la source, donc de la donnee de
    -- catalogue. Ils etaient une liste en dur jusqu'au jalon 6-G, c'est-a-dire exactement le genre de
    -- constante qui devient fausse au second etablissement.
    bibliotheques_points jsonb,
    -- Les adresses des services ouverts dans le navigateur integre ({"ent": …, "email": …, "cas": …,
    -- "apogee": …}). Ce ne sont pas des sources — l'utilisateur pilote ces pages — mais elles sont
    -- propres a l'etablissement, et les laisser en dur enverrait un etudiant d'une fac chez une autre.
    services           jsonb,
    -- Les intitules propres a l'etablissement (« numero etudiant », « INE », …). Les libelles
    -- d'ecran, eux, restent traduits par Translator : confondre les deux ramenerait des chaines en dur.
    libelles           jsonb,
    -- La region CROUS, telle que Croustillant la numerote. Elle etait une `vars` du Blueprint jusqu'au
    -- jalon 6-J, avec un commentaire qui l'assumait — « l'application vise une seule region ». C'est
    -- vrai, et le perimetre du produit reste le secteur bordelais (voir le README) ; c'est aussi
    -- exactement la forme que prend une constante bordelaise avant de devenir fausse, et le jalon 6-G
    -- en a corrige onze du meme genre. `null` fait **disparaitre** la section des restaurants, comme
    -- une colonne `salles_libres` absente fait disparaitre celle des salles libres.
    crous_region       text,
    ordre              integer     not null default 0
);

-- Les trois colonnes du jalon 6-G, pour une base deja creee au 6-B. « Ajouter avant de retirer,
-- toujours » : le parc installe ne se vide pas d'un coup (supabase/README.md).
alter table public.etablissements add column if not exists celcat_res_types     jsonb;
alter table public.etablissements add column if not exists bibliotheques_points jsonb;
alter table public.etablissements add column if not exists services             jsonb;

-- Les deux colonnes du jalon 6-I. Meme regle : elles s'ajoutent a une base existante, et une version
-- de l'application qui ne les connait pas continue de tourner — elle ne les lit simplement pas.
alter table public.etablissements add column if not exists edt           jsonb;
alter table public.etablissements add column if not exists salles        jsonb;
alter table public.etablissements add column if not exists salles_libres jsonb;

-- La colonne du jalon 6-J. Meme regle encore : « ajouter avant de retirer, toujours ». Une version de
-- l'application qui ne la connait pas continue de tourner — son Blueprint garde son entree par
-- defaut, celle du secteur bordelais.
alter table public.etablissements add column if not exists crous_region  text;

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
-- Crees ici plutot que depuis la console : la regle de ce fichier vaut aussi pour eux, et un bucket
-- cree a la main est un bucket qu'on ne saura pas recreer. `public` autorise la lecture par URL
-- directe ; l'ecriture reste gouvernee par les politiques de policies.sql.
insert into storage.buckets (id, name, public)
values ('blueprints', 'blueprints', true),
       ('media',      'media',      true)
on conflict (id) do update set public = excluded.public;
