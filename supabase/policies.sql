-- UKit — politiques d'acces.
--
-- La cle `anon` est publique par conception : elle est lisible dans n'importe quel binaire. Ce n'est
-- pas un secret mal garde, c'est un identifiant. **La frontiere de securite, ce sont ces
-- politiques** ; les traiter comme un detail serait l'erreur du jalon.
--
-- RLS est active sur **toutes** les tables, y compris celles qui n'ont rien de sensible : une table
-- sans politique est une table qu'on oubliera de proteger le jour ou elle en aura besoin.
--
-- Trois regles, sans exception :
--   1. lecture publique restreinte aux lignes **publiees** ;
--   2. aucune ecriture pour `anon` ;
--   3. ecriture par `service_role` uniquement — le script de publication et la console d'admin.
--
-- Le jour ou la partie sociale arrivera, elle ajoutera ses tables et ses politiques adossees a
-- auth.uid(). Rien de ce qui est ecrit ici ne devra etre defait.
--
-- Chaque politique est precedee d'un `drop policy if exists` : Postgres n'a pas de
-- `create policy if not exists`, et un fichier qu'on ne peut rejouer qu'une fois n'est pas
-- reproductible — c'est precisement ce que ce dossier existe pour eviter.
--
-- Voir docs/backend.md.

alter table public.annonces         enable row level security;
alter table public.service_messages enable row level security;
alter table public.batiments        enable row level security;
alter table public.visuels          enable row level security;
alter table public.etablissements   enable row level security;
alter table public.blueprints       enable row level security;
alter table public.app_release      enable row level security;
alter table public.salutations     enable row level security;

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

-- L'index de livraison n'est pas lu par l'application : elle lit manifest.json dans le bucket.
-- Aucune politique de lecture pour `anon`, donc — ouvrir un acces dont personne n'a besoin serait
-- une surface offerte pour rien.

-- -----------------------------------------------------------------------------
-- Ecriture
-- -----------------------------------------------------------------------------
--
-- Aucune politique d'ecriture n'est declaree : sous RLS, ce qui n'est pas autorise est refuse.
-- `service_role` contourne RLS par nature, ce qui suffit au script de publication et a la console.
-- Ecrire une politique d'ecriture « pour plus tard » serait le meilleur moyen de l'oublier ouverte.
--
-- Verification attendue au jalon 6-B, et elle se joue vraiment plutot qu'elle ne se suppose : une
-- tentative d'insertion avec la cle `anon` doit **echouer**.

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
