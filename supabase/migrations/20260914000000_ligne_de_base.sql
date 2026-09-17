-- La ligne de base des migrations numerotees (jalon 7-C) : l'etat de la production au 2026-09-14,
-- tel que schema.sql, fonctions.sql et policies.sql l'appliquaient a la main par psql.
--
-- Cette migration est MARQUEE APPLIQUEE SANS ETRE JOUEE sur la base de production
-- (`supabase migration repair --status applied 20260914000000 --linked`) : la base la portait deja.
-- Elle reste jouable telle quelle sur une base neuve — les trois fichiers sont rejouables, dans cet
-- ordre — et c'est ce qui rend `supabase db reset` possible un jour. Les trois fichiers restent la
-- vue lisible de l'etat, mis a jour dans le meme commit que chaque migration (supabase/README.md).
--
-- Concatenation, sans retouche, de :
--   1. schema.sql    — les tables, leurs colonnes additives et leurs index
--   2. fonctions.sql — les fonctions de private et le journal
--   3. policies.sql  — la securite par ligne, la lecture publique, les droits des editeurs

-- =============================================================================================
-- 1. schema.sql
-- =============================================================================================

-- UKit — schema de la base de publication.
--
-- Ce fichier est la source de verite du schema : il s'applique depuis ici, jamais depuis l'interface
-- web, sinon rien n'est reproductible. Les politiques d'acces vivent dans policies.sql.
--
-- Principe directeur : la base porte de la **donnee**, jamais de la logique metier. Pas de fonction
-- qui calcule, pas de vue qui calcule : ce qui se calcule se calcule dans l'application, ou c'est
-- type, relu et verifie. Depuis le jalon 6.1-B elle porte aussi **deux gardes**, et rien d'autre —
-- qui a le droit d'ecrire, et la trace de ce qui a ete ecrit (fonctions.sql). Ce sont des politiques
-- d'acces exprimees en SQL, pas du calcul : aucune des deux ne decide de ce que l'application affiche.
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
    -- Galerie de la fiche : un tableau JSON d'URLs du bucket media, affiche sous la description.
    images      jsonb,
    -- Le lieu de l'evenement : les deux presents, la fiche montre une carte « S'y rendre ».
    lat         double precision,
    lng         double precision,
    -- L'identite visuelle : un index de la palette de sections (0-3, 5 — le 4 duplique le 0 en
    -- sombre). Teinte la pastille d'emetteur et fixe le depart du cycle des sections de la fiche.
    couleur     integer,
    cta_texte   text,
    cta_lien    text,
    publiee_le  timestamptz not null default now(),
    expire_le   timestamptz,
    active      boolean     not null default true,
    creee_le    timestamptz not null default now()
);

-- Migration des bases existantes (le create ci-dessus ne retouche pas une table deja creee).
alter table public.annonces add column if not exists images jsonb;
alter table public.annonces add column if not exists lat double precision;
alter table public.annonces add column if not exists lng double precision;
alter table public.annonces add column if not exists couleur integer;

-- Le ciblage des annonces (jalon 6.1-B) : les memes colonnes que les messages de service, sans la
-- cle — une annonce se lit dans une liste, elle n'a pas de memoire « vu ». Une version anterieure de
-- l'application ignore ces colonnes et voit tout : acceptable, et fini des que le parc a migre.
-- Les contraintes passent par drop/add : `add constraint` n'a pas de `if not exists`.
alter table public.annonces add column if not exists audience text not null default 'tous';
alter table public.annonces drop constraint if exists annonces_audience_check;
alter table public.annonces add constraint annonces_audience_check
    check (audience in ('tous', 'testeurs'));
alter table public.annonces add column if not exists etablissements text[];
alter table public.annonces add column if not exists version_min text;
alter table public.annonces add column if not exists version_max text;
alter table public.annonces drop constraint if exists annonces_versions_check;
alter table public.annonces add constraint annonces_versions_check
    check ((version_min is null or version_min ~ '^\d+\.\d+\.\d+$')
       and (version_max is null or version_max ~ '^\d+\.\d+\.\d+$'));
-- La plateforme (jalon 6.1.x-D) : un defaut qui n'existe que sur Android, ou que sur iOS, merite un
-- contenu qui ne derange pas l'autre moitie du parc. null = les deux ; le `check` borne les valeurs
-- a celles que l'application connait, comme pour l'audience.
alter table public.annonces add column if not exists plateformes text[];
alter table public.annonces drop constraint if exists annonces_plateformes_check;
alter table public.annonces add constraint annonces_plateformes_check
    check (plateformes is null or plateformes <@ array['ios', 'android']::text[]);

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

-- Le ciblage des messages (jalon 6.1-B), ajoute a une table creee vide au 6-B et lue par personne
-- jusque-la. Meme regle que le catalogue, « ajouter avant de retirer » : une version de l'application
-- qui ne connait pas ces colonnes continue de lire les messages, et les voit tous.
--
--   cle             la memoire « vu » de l'appareil. Une cle stable plutot que l'id : republier un
--                   message corrige sous la meme cle ne le refait pas apparaitre, un message
--                   different sous une autre cle reapparait. Le defaut est un UUID, pour qu'une ligne
--                   ecrite depuis le Studio en ait une ; la console propose un slug lisible par-dessus.
--   audience        `tous`, ou `testeurs` : les appareils dont l'identifiant d'installation est dans
--                   la table testeurs. C'est ce qui permet d'essayer un message sur son telephone
--                   avant de l'envoyer a tout le monde.
--   etablissements  les codes du catalogue qui voient le message ; null = tous. Un tableau plutot
--                   qu'une table de jointure : trois etablissements, et une ligne se lit entiere.
--   version_min     la fenetre de versions de l'application, bornes incluses, en `X.Y.Z` strict :
--   version_max     le `check` garantit la forme a la source, ce qui rend le comparateur applicatif
--                   trivial. null = pas de borne. « Mets a jour » est un message a `version_max`.
--   plateformes     `ios` et/ou `android` (6.1.x-D) ; null = les deux. Un defaut qui n'existe que sur
--                   une plateforme se dit a elle seule. Une valeur que l'application ne connait pas
--                   cache, comme une audience inconnue.
alter table public.service_messages add column if not exists cle text default gen_random_uuid()::text;
update public.service_messages set cle = id::text where cle is null;
alter table public.service_messages alter column cle set not null;
create unique index if not exists service_messages_cle_idx on public.service_messages (cle);

alter table public.service_messages add column if not exists audience text not null default 'tous';
alter table public.service_messages drop constraint if exists service_messages_audience_check;
alter table public.service_messages add constraint service_messages_audience_check
    check (audience in ('tous', 'testeurs'));
alter table public.service_messages add column if not exists etablissements text[];
alter table public.service_messages add column if not exists version_min text;
alter table public.service_messages add column if not exists version_max text;
alter table public.service_messages drop constraint if exists service_messages_versions_check;
alter table public.service_messages add constraint service_messages_versions_check
    check ((version_min is null or version_min ~ '^\d+\.\d+\.\d+$')
       and (version_max is null or version_max ~ '^\d+\.\d+\.\d+$'));
alter table public.service_messages add column if not exists plateformes text[];
alter table public.service_messages drop constraint if exists service_messages_plateformes_check;
alter table public.service_messages add constraint service_messages_plateformes_check
    check (plateformes is null or plateformes <@ array['ios', 'android']::text[]);
-- La notification push (jalon 6.1.x-E) : posee par la fonction `notifier` quand un editeur l'a
-- demandee depuis la console. `notifie_le` = envoye une fois, jamais deux ; `notifies` = le nombre
-- d'appareils vises a ce moment-la, une trace, pas une preuve de reception.
alter table public.service_messages add column if not exists notifie_le timestamptz;
alter table public.service_messages add column if not exists notifies integer;

-- =============================================================================
-- Jetons push (jalon 6.1.x-E)
-- =============================================================================
--
-- La seule table que l'application ecrit, et la premiere : un jeton push par appareil, avec ce
-- qu'il faut pour cibler AVANT d'envoyer — le campus, la version, la plateforme, le statut de
-- testeur (auto-declare). Pseudonyme : le jeton n'est pas un identifiant de personne, et il
-- s'efface quand l'utilisateur coupe l'interrupteur. Aucune autre colonne, par decision : la base
-- n'apprend que ce qui sert au ciblage (PRIVACY.md, point 4 quater).
--
-- L'application n'ecrit pas la table : elle appelle deux fonctions (fonctions.sql), la porte etroite.
-- Le `check` sur la forme du jeton borne ce qu'un inconnu muni de la cle publiable peut y deposer.
create table if not exists public.jetons_push (
    jeton         text        primary key check (jeton ~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$'),
    plateforme    text        not null check (plateforme in ('ios', 'android')),
    etablissement text        not null,
    version       text        not null check (version ~ '^\d+\.\d+\.\d+$'),
    testeur       boolean     not null default false,
    maj_le        timestamptz not null default now()
);

-- Le mot du haut de l'onglet Scolarite, quand une regle publiee doit passer devant le socle.
--
-- L'application embarque ses propres salutations — bonjour, bonsoir, bon week-end, joyeux
-- anniversaire — et elles suffisent. Cette table sert a poser un mot **pour tout le monde** sans
-- release : la rentree, une periode d'examens, un jour particulier.
--
-- `condition` porte un vocabulaire **ferme**, et toutes les conditions declarees s'appliquent (un ET).
-- Une condition vide vaut toujours.
--   {"heures": {"de": 22, "a": 5},        -- 0-23, fin exclue ; `de > a` passe minuit
--    "jours":  [0, 6],                    -- 0 = dimanche
--    "plage":  {"du": "12-20", "au": "01-05"},  -- MM-JJ ; `du > au` passe l'an
--    "anniversaire": true}
--
-- `messages` porte une entree par langue — ces textes ne sont pas dans le binaire, donc ils ne
-- passent pas par le traducteur ; le francais sert de repli.
--   {"fr": "Bonne rentree", "en": "Welcome back"}
--
-- **Les garder COURTS.** La salutation tient sur une seule ligne, prenom et date compris, et ce qui
-- depasse est tronque. C'est voulu : c'est un detail sous le titre, pas un bandeau — un message qui
-- pousserait la grille vers le bas ferait exactement ce que cette ligne existe pour eviter.
--
-- `priorite` tranche entre plusieurs regles applicables. Le socle embarque va de 0 a 90, espace de
-- dix pour qu'une regle publiee puisse se glisser entre deux sans release. **A egalite, le publie
-- gagne** : il est assemble apres, et quelqu'un a voulu l'ecrire.
create table if not exists public.salutations (
    id        text primary key,
    priorite  integer     not null default 0,
    condition jsonb       not null default '{}'::jsonb,
    messages  jsonb       not null,
    actif     boolean     not null default true,
    creee_le  timestamptz not null default now()
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
    -- Le nom **court**, pour les endroits ou la place manque : une ligne de reglage, une pastille.
    -- `null` : il n'y en a pas, et le nom complet fait l'affaire. Deux noms plutot qu'un raccourci
    -- partout, parce que « College ST » ne veut rien dire a qui choisit sa fac pour la premiere fois.
    nom_court          text,
    ville              text,
    logo_url           text,
    actif              boolean     not null default true,
    -- Les noms des Blueprints a jouer. Ils vivent sous le prefixe reserve `ukit.portail.`, seul
    -- prefixe qu'un manifeste distant a le droit d'etendre (voir docs/phase-6/6-g-etablissements.md).
    portail_dossier    text,
    portail_messagerie text,
    -- Les Blueprints qui remplissent les **widgets** de l'onglet Scolarite, par point de service :
    --   {"messagerie": {"blueprint": "ukit.portail.<code>.messagerie", "peremption_min": 20},
    --    "moodle":     {"blueprint": "ukit.portail.<code>.moodle",     "peremption_min": 360}}
    -- `peremption_min` est publiable plutot que compilee parce que c'est un compromis entre fraicheur
    -- et runs de moteur, et que le bon reglage se mesure sur des appareils reels ; `null` ou absente
    -- garde celle qu'embarque l'application.
    --
    -- Un point **absent** n'est pas une panne : c'est un widget dont la source n'existe pas encore
    -- ici. Sa rangee reste affichee et ouvre sa porte. C'est ce qui rend vraie la promesse « un widget
    -- de plus = un Blueprint publie + une ligne ici », sans release.
    --
    -- `portail_messagerie` reste **lue en repli** par l'application (catalogue.ts, `widgetPublie`) :
    -- un appareil mis a jour avant que cette colonne ne soit remplie garde son compteur.
    portail_widgets    jsonb       not null default '{}'::jsonb,
    -- Le Blueprint qui rapporte le CERTIFICAT DE SCOLARITE, quand l'etablissement sert ses pieces a
    -- une adresse rejouable. `null` est le cas general et ne signale rien : la plupart des portails
    -- regenerent l'adresse d'un PDF a chaque affichage — consultable, donc, mais pas rapportable
    -- (Bordeaux INP, sonde du 2026-08-25). Le certificat n'est alors simplement pas range d'avance.
    --
    -- Une colonne nommee et non une entree de `portail_widgets`, parce que ce n'en est pas un : un
    -- widget rend un compteur qu'une rangee affiche, celui-ci rend un fichier qu'on ecrit sur
    -- l'appareil.
    portail_documents  text,
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

-- La colonne des widgets (session du 2026-08-28). Meme regle, et elle porte ici un `default` non nul :
-- une version de l'application qui la lit sur une ligne ecrite avant elle doit trouver une table
-- vide, pas un nul — et une table vide veut dire « aucun widget rempli ici », ce qui est la verite.
-- L'application replie en outre la messagerie sur `portail_messagerie`, de sorte qu'un appareil mis a
-- jour avant cette colonne garde son compteur (catalogue.ts, `widgetPublie`).
alter table public.etablissements
    add column if not exists portail_widgets jsonb not null default '{}'::jsonb;

-- La colonne des documents (2026-08-29). Meme regle, et elle reste NULLABLE la ou celle des widgets
-- porte un default : « pas de source de documents ici » est le cas ordinaire et se dit par un nul,
-- alors qu'une table de widgets vide se dit par une table vide.
alter table public.etablissements add column if not exists portail_documents text;

-- Surcouche des visuels de contenu. Elle repond a une question qu'aucune des tables
-- precedentes ne couvre : que fait-on quand une **source tierce** publie une photo fausse, ou n'en
-- publie pas ? Jusqu'ici, rien — l'image venait du fournisseur et il fallait une release pour la
-- changer, ce qui revient a ne jamais la changer.
--
-- Trois particularites, et aucune n'est un detail :
--
--   1. **Aucun socle embarque, et c'est la decision.** Le socle d'un visuel, c'est l'image que la
--      source publie deja. Une table absente, vide ou injoignable laisse donc l'application dans
--      l'etat exact qui est le sien aujourd'hui — ce que la promesse « l'application fonctionne sans
--      jamais joindre la base » exige, et ce qui rend cette table entierement retirable.
--   2. **`image_url` porte trois etats, pas deux.** Une ligne absente (ou une valeur nulle) veut dire
--      « je ne corrige rien » ; une URL remplace le visuel de la source ; la **chaine vide** dit « la
--      photo de la source est fausse, n'en montre aucune » et fait tomber l'ecran sur son visuel de
--      repli embarque. Aplatir le vide et le nul ferait perdre le seul moyen de retirer une image.
--   3. La cle est **celle du contenu chez sa source** — le code Croustillant d'un restaurant, l'id
--      Affluences d'une bibliotheque, le code d'un batiment, l'`id` d'une annonce. Elle n'est donc
--      unique qu'a l'interieur d'un domaine, d'ou la cle primaire composee.
--
-- Le `check` sur `domaine` existe pour attraper la seule faute de publication qui serait autrement
-- **parfaitement silencieuse** : une faute de frappe donnerait une ligne valide, un visuel inchange,
-- et aucune facon de savoir pourquoi. L'ajouter d'un domaine se fait par migration, et l'application
-- installee qui ne le connait pas ignore simplement ses lignes.
create table if not exists public.visuels (
    domaine   text        not null check (domaine in ('crous', 'bibliotheque', 'batiment', 'annonce')),
    cle       text        not null,
    image_url text,
    maj_le    timestamptz not null default now(),
    primary key (domaine, cle)
);

-- =============================================================================
-- Pilotage (jalon 6.1-B)
-- =============================================================================

-- Les appareils qui voient l'audience `testeurs`.
--
-- L'identifiant est celui que l'application genere a sa premiere ouverture et garde dans son
-- trousseau ; il ne sert qu'a ca. **L'appareil ne l'envoie jamais** : il lit la colonne `id` de cette
-- table et compare chez lui — policies.sql n'expose que cette colonne a `anon`, les noms restent
-- prives. Aucun secret dans le binaire, aucun build particulier, et revoquer un testeur est une
-- ligne supprimee.
--
-- `uuid` et non `text` : la console colle un identifiant lu sur un ecran, et le type refuse une
-- coquille la ou du texte l'aurait acceptee en silence. Depuis 6.2.x l'identifiant est **derive** —
-- l'empreinte SHA-256 d'une graine d'appareil, mise en forme d'UUID v8 — et non plus tire au hasard ;
-- la colonne n'a pas change, un UUID v8 en est un (shared/testeur/derivation.ts).
create table if not exists public.testeurs (
    id       uuid        primary key,
    nom      text        not null,
    cree_le  timestamptz not null default now()
);

-- L'etat des sources tierces, mesure chaque matin par les sondes (sondes/, en integration continue).
--
-- Une ligne par source, **remplacee** a chaque mesure : cette table dit ou en est chaque source, pas
-- son histoire — l'historique est dans les issues GitHub que le changement d'etat ouvre et ferme.
-- `change_le` ne bouge que quand `etat` change : c'est le « depuis quand » de la page Sources.
-- `detail` est libre : l'etape qui a echoue, son code, le message du moteur, la duree.
create table if not exists public.sondes (
    source     text        primary key,
    etat       text        not null check (etat in ('ok', 'panne')),
    detail     jsonb,
    mesure_le  timestamptz not null,
    change_le  timestamptz not null
);

-- La trace de tout ce qui s'ecrit dans les tables publiables : avant, apres, qui, quand.
--
-- Ecrite par un declencheur (fonctions.sql), jamais par un client : ni la console, ni un script, ni
-- le Studio ne peuvent la contourner ni la forger. C'est le fichier a remettre quand quelque chose a
-- mal tourne ; la console l'exporte en JSON.
--
-- `par` est l'e-mail de l'editeur authentifie, ou le role du jeton (`service_role` pour un script),
-- ou l'utilisateur SQL (`postgres` pour psql). `ligne_id` est la cle primaire de la ligne, ses
-- colonnes jointes par `/` quand elle est composee (visuels).
--
-- Elle grossit. Une purge apres un an suffit ; elle est ecrite dans supabase/README.md et n'est pas
-- automatisee : ce qui s'efface tout seul ne se relit pas.
create table if not exists public.journal (
    id          bigserial   primary key,
    table_name  text        not null,
    operation   text        not null,
    ligne_id    text,
    avant       jsonb,
    apres       jsonb,
    par         text,
    quand       timestamptz not null default now()
);

create index if not exists journal_quand_idx on public.journal (quand desc);
create index if not exists journal_ligne_idx on public.journal (table_name, ligne_id);

-- Les personnes autorisees a ecrire depuis la console. Une ligne : le proprietaire.
--
-- L'authentification est celle de Supabase (e-mail et mot de passe) ; cette table dit qui, parmi les
-- comptes authentifies, a le droit d'ecrire. Un compte sans ligne ici peut se connecter et ne peut
-- rien ecrire — les politiques le refusent (policies.sql). Les inscriptions libres sont desactivees
-- dans les reglages du projet, et un compte se cree par tools/console/editeur.mjs.
create table if not exists public.editeurs (
    email      text        primary key,
    ajoute_le  timestamptz not null default now()
);

-- =============================================================================
-- Retours (jalon 6.1.x-C)
-- =============================================================================

-- Ce que les utilisateurs ecrivent dans le formulaire (`services.adaptation` du catalogue), importe
-- depuis la feuille de reponses par l'integration continue toutes les 72 heures (tools/retours/,
-- .github/workflows/retours.yml), et reclasse depuis la console.
--
-- La cle primaire EST l'identifiant stable de la reponse : une empreinte de l'instant de reception
-- en UTC et des cellules non vides, calculee par l'importeur. Le formulaire se relit en entier a
-- chaque passage et l'ecriture se fait en `on conflict do nothing` : le dedoublonnage est une
-- propriete du schema, pas une heuristique de script, et une reponse deja rangee garde l'etat que
-- le proprietaire du produit lui a donne. Le corollaire est ecrit : retoucher une cellule dans la
-- feuille recree la ligne — on ne retouche pas la feuille, on reclasse ici.
--
-- Les colonnes normalisees servent a lire et a trier ; `reponses` porte la reponse entiere,
-- question par question, nettoyee — adresses et numeros masques dans les textes libres, jamais dans
-- le contact, qui est fait pour ca et facultatif (PRIVACY.md). Aucune lecture publique : ce sont des
-- textes libres d'utilisateurs, et un contact quand il a ete laisse (policies.sql).
--
-- `nature` est devinee a l'import depuis la case cochee ; `etat` et `note` sont ce que le
-- proprietaire du produit en fait. Ces trois colonnes sont les seules que la console ecrit, par un
-- privilege de colonne (policies.sql) : la reponse elle-meme reste ce qui a ete dit. Les valeurs sont
-- en ASCII et bornees par un `check`, comme partout — une faute de saisie serait sinon une ligne
-- parfaitement valide que rien ne signalerait.
create table if not exists public.retours (
    id          text        primary key check (id ~ '^[0-9a-f]{64}$'),
    recu_le     timestamptz not null,
    nature      text        not null default 'autre'
                            check (nature in ('bug', 'fonctionnalite', 'campus', 'autre')),
    campus      text,
    section     text,
    appareil    text,
    systeme     text,
    version_app text,
    -- L'assemblage lisible des champs libres de la branche cochee ; vide quand rien n'a ete ecrit.
    texte       text        not null,
    contact     text,
    volontaire  boolean     not null default false,
    reponses    jsonb       not null,
    etat        text        not null default 'nouveau'
                            check (etat in ('nouveau', 'en_attente', 'traite', 'refuse')),
    note        text,
    importe_le  timestamptz not null default now()
);

create index if not exists retours_lecture_idx on public.retours (etat, recu_le desc);

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
--   media       visuels publies : annonces, batiments, contenus  — lecture publique
--
-- Crees ici plutot que depuis la console : la regle de ce fichier vaut aussi pour eux, et un bucket
-- cree a la main est un bucket qu'on ne saura pas recreer. `public` autorise la lecture par URL
-- directe ; l'ecriture reste gouvernee par les politiques de policies.sql.
insert into storage.buckets (id, name, public)
values ('blueprints', 'blueprints', true),
       ('media',      'media',      true)
on conflict (id) do update set public = excluded.public;

-- =============================================================================================
-- 2. fonctions.sql
-- =============================================================================================

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

-- Les retours : inseres par la cle de service (`par = service_role`), reclasses par un editeur
-- (`par = son e-mail`). Un rejeu de l'import en `on conflict do nothing` ne declenche rien pour une
-- ligne deja presente : il n'ecrit pas une ligne de journal par reponse a chaque passage. Le journal
-- copie la ligne entiere, contact compris — effacer un retour, c'est aussi effacer sa trace
-- (supabase/README.md).
drop trigger if exists journal on public.retours;
create trigger journal after insert or update or delete on public.retours
    for each row execute function private.journaliser('id');

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

-- =============================================================================================
-- 3. policies.sql
-- =============================================================================================

-- UKit — politiques d'acces.
--
-- La cle `anon` est publique par conception : elle est lisible dans n'importe quel binaire. Ce n'est
-- pas un secret mal garde, c'est un identifiant. **La frontiere de securite, ce sont ces
-- politiques** ; les traiter comme un detail serait l'erreur du jalon.
--
-- RLS est active sur **toutes** les tables, y compris celles qui n'ont rien de sensible : une table
-- sans politique est une table qu'on oubliera de proteger le jour ou elle en aura besoin.
--
-- Quatre regles, sans exception :
--   1. lecture publique restreinte aux lignes **publiees** ;
--   2. aucune ecriture pour `anon` — ni par politique, ni par privilege ;
--   3. ecriture par `service_role` — le script de publication et les sondes, avec la cle secrete ;
--   4. depuis le jalon 6.1-B, ecriture par un compte **authentifie** dont l'e-mail figure dans la
--      table editeurs — la console web. Le Studio Supabase passe par les memes regles et les memes
--      declencheurs (fonctions.sql).
--
-- Le jour ou la partie sociale arrivera, elle ajoutera ses tables et ses politiques adossees a
-- auth.uid(). Rien de ce qui est ecrit ici ne devra etre defait.
--
-- Chaque politique est precedee d'un `drop policy if exists` : Postgres n'a pas de
-- `create policy if not exists`, et un fichier qu'on ne peut rejouer qu'une fois n'est pas
-- reproductible — c'est precisement ce que ce dossier existe pour eviter.
--
-- S'applique **apres** fonctions.sql, qui definit private.est_editeur().
--
-- Voir docs/backend.md.

alter table public.annonces         enable row level security;
alter table public.service_messages enable row level security;
alter table public.batiments        enable row level security;
alter table public.visuels          enable row level security;
alter table public.etablissements   enable row level security;
alter table public.blueprints       enable row level security;
alter table public.app_release      enable row level security;
alter table public.salutations      enable row level security;
alter table public.testeurs         enable row level security;
alter table public.jetons_push      enable row level security;
alter table public.sondes           enable row level security;
alter table public.journal          enable row level security;
alter table public.editeurs         enable row level security;
alter table public.retours          enable row level security;

-- -----------------------------------------------------------------------------
-- Lecture publique
-- -----------------------------------------------------------------------------

-- Une annonce inactive ou expiree ne sort pas de la base. Elle n'est pas filtree cote application :
-- ce qui n'a pas a etre lu n'est pas envoye.
drop policy if exists "annonces publiees lisibles" on public.annonces;
create policy "annonces publiees lisibles"
    on public.annonces for select
    to anon
    using (active and (expire_le is null or expire_le > now()));

drop policy if exists "messages de service actifs lisibles" on public.service_messages;
create policy "messages de service actifs lisibles"
    on public.service_messages for select
    to anon
    using (actif and (expire_le is null or expire_le > now()));

-- Une salutation inactive ne sort pas de la base : ce qui n'a pas a etre lu n'est pas envoye. Le
-- filtre applicatif sur `actif` reste, comme partout — la politique est la frontiere, pas la seule
-- ceinture.
drop policy if exists "salutations actives lisibles" on public.salutations;
create policy "salutations actives lisibles"
    on public.salutations for select
    to anon
    using (actif);

drop policy if exists "batiments lisibles" on public.batiments;
create policy "batiments lisibles"
    on public.batiments for select
    to anon
    using (true);

-- Aucune condition de publication : une ligne de cette table **est** la publication. Il n'y a ni
-- date d'expiration ni drapeau d'activation a filtrer — retirer un visuel se fait en retirant la
-- ligne, ce qui rend a la source la sienne.
drop policy if exists "visuels lisibles" on public.visuels;
create policy "visuels lisibles"
    on public.visuels for select
    to anon
    using (true);

drop policy if exists "etablissements actifs lisibles" on public.etablissements;
create policy "etablissements actifs lisibles"
    on public.etablissements for select
    to anon
    using (actif);

drop policy if exists "app_release lisible" on public.app_release;
create policy "app_release lisible"
    on public.app_release for select
    to anon
    using (true);

-- Les testeurs : l'application lit la liste des identifiants et compare **chez elle** — elle
-- n'envoie jamais le sien. La politique laisse passer toutes les lignes, mais le privilege ne porte
-- que sur la colonne `id` : `select *` est refuse (42501), `select=id` passe, et les noms restent
-- prives. `revoke` d'abord, parce qu'une table nouvelle nait avec tous les privileges accordes aux
-- trois roles. `authenticated` garde les siens : la console lit et ecrit la table entiere.
--
-- Limite ecrite : les identifiants sont enumerables. Ce sont des UUID aleatoires, et l'audience
-- `testeurs` est un filtre d'affichage, pas une confidentialite — usurper un testeur demanderait
-- d'ecrire le trousseau d'un appareil.
revoke select on public.testeurs from anon;
grant select (id) on public.testeurs to anon;

drop policy if exists "testeurs lisibles" on public.testeurs;
create policy "testeurs lisibles"
    on public.testeurs for select
    to anon
    using (true);

-- L'etat des sources : lisible par tous, ecrit par les sondes seules (`service_role`). Rien de
-- personnel — c'est l'etat de services publics — et un jour l'application pourra s'en servir pour
-- dire d'elle-meme qu'un portail est en panne ce matin.
drop policy if exists "sondes lisibles" on public.sondes;
create policy "sondes lisibles"
    on public.sondes for select
    to anon, authenticated
    using (true);

-- L'index de livraison n'est pas lu par l'application : elle lit manifest.json dans le bucket.
-- Aucune politique de lecture pour `anon`, donc — ouvrir un acces dont personne n'a besoin serait
-- une surface offerte pour rien.

-- -----------------------------------------------------------------------------
-- Ecriture
-- -----------------------------------------------------------------------------
--
-- Jusqu'au jalon 6.1-B, aucune politique d'ecriture n'etait declaree : sous RLS, ce qui n'est pas
-- autorise est refuse, et `service_role` contourne RLS par nature. La console web change cela pour
-- **un** role et **une** table de personnes : un compte authentifie ecrit si — et seulement si — son
-- e-mail est dans editeurs (private.est_editeur(), fonctions.sql). Rien d'autre n'a bouge : `anon`
-- n'ecrit toujours rien, et perd meme le privilege au niveau des grants, parce qu'une politique
-- s'oublie ouverte la ou un privilege revoque ne se rouvre pas par accident.
--
-- Les politiques des editeurs sont generees par une boucle plutot qu'ecrites huit fois : une seule
-- liste dit quelles tables la console peut ecrire. `blueprints` n'y est pas — les Blueprints restent
-- publies par le script, valides par le moteur et rejoues par la parite (docs/blueprints.md) ; ni
-- `journal` (ecrit par le declencheur seul) ni `sondes` (ecrite par les sondes seules), ni `retours`,
-- qui a ses propres politiques plus bas : on les lit et on les reclasse, on ne les cree ni ne les
-- supprime depuis la console.
--
-- La verification se joue plutot qu'elle ne se suppose : une insertion avec la cle `anon` doit
-- **echouer**, et une insertion par un compte authentifie absent d'editeurs aussi.

revoke insert, update, delete on all tables in schema public from anon;
-- Et la lecture de ce qui ne le regarde pas. Sans politique, RLS rendrait une liste vide plutot
-- qu'un refus : le refus dit la verite, la liste vide fait croire a une table vide.
revoke select on public.journal, public.editeurs, public.retours, public.jetons_push from anon;

do $$
declare
    nom text;
begin
    foreach nom in array array[
        'annonces', 'service_messages', 'etablissements', 'visuels',
        'salutations', 'batiments', 'testeurs', 'app_release'
    ]
    loop
        -- La lecture des editeurs voit **toutes** les lignes, inactives et expirees comprises : c'est
        -- l'ecran d'edition, pas l'ecran de publication.
        execute format('drop policy if exists "%s lisible par les editeurs" on public.%I', nom, nom);
        execute format(
            'create policy "%s lisible par les editeurs" on public.%I for select to authenticated using (private.est_editeur())',
            nom, nom
        );
        execute format('drop policy if exists "%s creable par les editeurs" on public.%I', nom, nom);
        execute format(
            'create policy "%s creable par les editeurs" on public.%I for insert to authenticated with check (private.est_editeur())',
            nom, nom
        );
        execute format('drop policy if exists "%s modifiable par les editeurs" on public.%I', nom, nom);
        execute format(
            'create policy "%s modifiable par les editeurs" on public.%I for update to authenticated using (private.est_editeur()) with check (private.est_editeur())',
            nom, nom
        );
        execute format('drop policy if exists "%s supprimable par les editeurs" on public.%I', nom, nom);
        execute format(
            'create policy "%s supprimable par les editeurs" on public.%I for delete to authenticated using (private.est_editeur())',
            nom, nom
        );
    end loop;
end
$$;

-- Les jetons push (6.1.x-E) : l'application y depose et retire par deux fonctions `security definer`
-- (fonctions.sql), jamais par la table ; `anon` n'y a aucun privilege. Les editeurs les lisent —
-- de quoi compter le parc dans la console — et ne les ecrivent pas : c'est la fonction `notifier`,
-- avec la cle de service, qui elague un jeton mort.
drop policy if exists "jetons lisibles par les editeurs" on public.jetons_push;
create policy "jetons lisibles par les editeurs"
    on public.jetons_push for select
    to authenticated
    using (private.est_editeur());

-- Le journal se consulte et s'exporte depuis la console ; il ne s'ecrit pas (fonctions.sql).
drop policy if exists "journal lisible par les editeurs" on public.journal;
create policy "journal lisible par les editeurs"
    on public.journal for select
    to authenticated
    using (private.est_editeur());

-- Un compte ne lit que sa propre ligne d'editeurs — de quoi savoir s'il a les droits, rien de plus.
-- La table ne s'ecrit que par le script de creation du compte (tools/console/editeur.mjs).
drop policy if exists "editeurs : sa propre ligne" on public.editeurs;
create policy "editeurs : sa propre ligne"
    on public.editeurs for select
    to authenticated
    using (email = nullif(auth.jwt() ->> 'email', ''));

-- Les retours se lisent et se reclassent depuis la console ; ils ne s'y creent ni ne s'y suppriment,
-- puisqu'ils sont importes (tools/retours/). Deux politiques, et un privilege de colonne par-dessus :
-- l'update n'est possible que sur ce que le proprietaire du produit en fait — la nature, l'etat, la
-- note — et la reponse elle-meme reste ce qui a ete dit, meme par erreur de saisie. `revoke`
-- d'abord, parce qu'une table nouvelle nait avec tous les privileges accordes aux trois roles ;
-- `service_role` garde les siens et l'import passe par lui. Aucune politique pour `anon`, et la
-- lecture lui est revoquee plus haut : sans ca, RLS lui rendrait une liste vide plutot qu'un refus.
revoke insert, update, delete on public.retours from authenticated;
grant update (nature, etat, note) on public.retours to authenticated;

drop policy if exists "retours lisibles par les editeurs" on public.retours;
create policy "retours lisibles par les editeurs"
    on public.retours for select
    to authenticated
    using (private.est_editeur());

drop policy if exists "retours reclassables par les editeurs" on public.retours;
create policy "retours reclassables par les editeurs"
    on public.retours for update
    to authenticated
    using (private.est_editeur())
    with check (private.est_editeur());

-- -----------------------------------------------------------------------------
-- Buckets
-- -----------------------------------------------------------------------------
--
-- `blueprints` et `media` sont publics en lecture. C'est assume : un Blueprint ne contient jamais
-- d'identifiant (il les **declare**, le trousseau les fournit), et l'integrite de ce qui est servi
-- est garantie par l'empreinte SHA-256 du manifeste, revenue a chaque lecture — pas par le secret de
-- l'URL.
--
-- L'ecriture reste reservee a `service_role`. La cle qui la porte est la cle de la production : qui
-- la detient peut publier un Blueprint que tous les appareils joueront.

drop policy if exists "blueprints lisibles" on storage.objects;
create policy "blueprints lisibles"
    on storage.objects for select
    to anon
    using (bucket_id = 'blueprints');

drop policy if exists "media lisible" on storage.objects;
create policy "media lisible"
    on storage.objects for select
    to anon
    using (bucket_id = 'media');

-- Les editeurs televersent les visuels depuis la console, dans `media` seulement. Trois politiques
-- et non une : un televersement avec `upsert` est une **mise a jour** quand l'objet existe deja, et
-- remplacer une image est precisement le geste attendu (l'URL versionnee fait le reste,
-- docs/pilotage.md). Le bucket des Blueprints reste au script de publication.
drop policy if exists "media creable par les editeurs" on storage.objects;
create policy "media creable par les editeurs"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'media' and private.est_editeur());

drop policy if exists "media modifiable par les editeurs" on storage.objects;
create policy "media modifiable par les editeurs"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'media' and private.est_editeur())
    with check (bucket_id = 'media' and private.est_editeur());

drop policy if exists "media supprimable par les editeurs" on storage.objects;
create policy "media supprimable par les editeurs"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'media' and private.est_editeur());
