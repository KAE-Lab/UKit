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
--      table editeurs — la console web —, et depuis 7-H **selon son role** : un admin ecrit tout, un
--      redacteur les annonces de ses campus, un lecteur rien. Le Studio Supabase passe par les memes
--      regles et les memes declencheurs (fonctions.sql).
--
-- Le jour ou la partie sociale arrivera, elle ajoutera ses tables et ses politiques adossees a
-- auth.uid(). Rien de ce qui est ecrit ici ne devra etre defait.
--
-- Chaque politique est precedee d'un `drop policy if exists` : Postgres n'a pas de
-- `create policy if not exists`, et un fichier qu'on ne peut rejouer qu'une fois n'est pas
-- reproductible — c'est precisement ce que ce dossier existe pour eviter.
--
-- S'applique **apres** fonctions.sql, qui definit les gardes : private.est_editeur(), et depuis 7-H
-- private.est_admin(), private.role_editeur() et private.peut_publier().
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

-- Une annonce inactive, expiree, en brouillon, archivee ou datee dans le futur ne sort pas de la
-- base. Elle n'est pas filtree cote application : ce qui n'a pas a etre lu n'est pas envoye. Le
-- filtre sur `statut` et `publiee_le` date de 7-C : une annonce datee dans le futur etait visible
-- tout de suite ; programmer une annonce est desormais possible, pour tout le parc.
drop policy if exists "annonces publiees lisibles" on public.annonces;
create policy "annonces publiees lisibles"
    on public.annonces for select
    to anon
    using (active and statut = 'publiee' and publiee_le <= now()
           and (expire_le is null or expire_le > now()));

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
-- trois roles. `authenticated` garde les siens : la console lit la table entiere, et un admin l'ecrit.
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
-- Ecriture, et lecture par les comptes de la console
-- -----------------------------------------------------------------------------
--
-- Jusqu'au jalon 6.1-B, aucune politique d'ecriture n'etait declaree : sous RLS, ce qui n'est pas
-- autorise est refuse, et `service_role` contourne RLS par nature. La console web change cela pour
-- **un** role de la base et **une** table de personnes : un compte authentifie ecrit si son e-mail est
-- dans editeurs — et, depuis le jalon 7-H, selon le role que cette table lui donne (fonctions.sql) :
--
--   admin      tout ce que la console permet, l'equipe comprise
--   redacteur  les annonces des campus de sa borne (private.peut_publier) ; il lit le reste
--   lecteur    lit, et n'ecrit rien
--
-- Les roles vivent ici et non dans la console : masquer un bouton ne protege rien, la cle publiable est
-- publique et une requete faite a la main passe outre l'interface. `anon` n'ecrit toujours rien, et perd
-- meme le privilege au niveau des grants, parce qu'une politique s'oublie ouverte la ou un privilege
-- revoque ne se rouvre pas par accident.
--
-- `blueprints` n'a pas de politique d'ecriture — les Blueprints restent publies par le script, valides
-- par le moteur et rejoues par la parite (docs/blueprints.md) ; ni `journal` (ecrit par le declencheur
-- seul) ni `sondes` (ecrite par les sondes seules). `retours` et `editeurs` ont les leurs, plus bas.
--
-- Les gardes s'ecrivent `(select private.…())`, la forme que Supabase recommande : evaluee une fois par
-- requete, pas une fois par ligne. `peut_publier` fait exception, parce qu'elle lit la ligne.
--
-- La verification se joue plutot qu'elle ne se suppose : une insertion avec la cle `anon` doit
-- **echouer**, une insertion par un compte authentifie absent d'editeurs aussi, et chaque role joue les
-- cas du plan de test de 7-H (docs/phase-7/7-h-console-roles.md).

revoke insert, update, delete on all tables in schema public from anon;
-- Et la lecture de ce qui ne le regarde pas. Sans politique, RLS rendrait une liste vide plutot
-- qu'un refus : le refus dit la verite, la liste vide fait croire a une table vide.
revoke select on public.journal, public.editeurs, public.retours, public.jetons_push from anon;

-- Les politiques de 6.1-B ouvraient l'ecriture a tout editeur. Elles sont permissives : oubliee, l'une
-- d'elles s'additionnerait aux nouvelles et rouvrirait ce qu'elles ferment. Retirees par leur nom.
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
    end loop;
end
$$;

-- La lecture des tables publiables est commune aux trois roles, et voit **toutes** les lignes,
-- inactives et expirees comprises : c'est l'ecran d'edition, pas l'ecran de publication.
do $$
declare
    nom text;
begin
    foreach nom in array array[
        'annonces', 'service_messages', 'etablissements', 'visuels',
        'salutations', 'batiments', 'testeurs', 'app_release'
    ]
    loop
        execute format('drop policy if exists "%s lisible par les editeurs" on public.%I', nom, nom);
        execute format(
            'create policy "%s lisible par les editeurs" on public.%I for select to authenticated using ((select private.est_editeur()))',
            nom, nom
        );
    end loop;
end
$$;

-- Tout ce qui n'est pas une annonce s'ecrit par un admin : les messages de service et leur
-- notification, le catalogue, les visuels des sources, les salutations, les batiments, les testeurs, la
-- version publiee. Une liste, une boucle : une seule ligne dit quelles tables sont reservees.
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

-- Les jetons push (6.1.x-E) : l'application y depose et retire par deux fonctions `security definer`
-- (fonctions.sql), jamais par la table ; `anon` n'y a aucun privilege. Les comptes de la console les
-- comptent — le parc du tableau de bord — et ne les ecrivent pas : c'est la fonction `notifier`, avec la
-- cle de service, qui elague un jeton mort. Depuis 7-H, ils ne lisent plus le jeton lui-meme : le
-- service d'envoi d'Expo accepte une notification vers tout jeton connu, sans autre preuve, et lire un
-- jeton, c'est pouvoir notifier l'appareil. Personne n'en a besoin dans la console, admin compris : le
-- parc se compte sur les cinq autres colonnes. `revoke all` d'abord, parce qu'un privilege de colonne ne
-- retire rien d'un privilege de table.
revoke all on public.jetons_push from authenticated;
grant select (plateforme, etablissement, version, testeur, maj_le) on public.jetons_push to authenticated;

drop policy if exists "jetons lisibles par les editeurs" on public.jetons_push;
create policy "jetons lisibles par les editeurs"
    on public.jetons_push for select
    to authenticated
    using ((select private.est_editeur()));

-- Le journal se consulte et s'exporte depuis la console ; il ne s'ecrit pas (fonctions.sql). Commun aux
-- trois roles, sauf les lignes qui copient un retour — l'adresse laissee, plus bas — ou un membre de
-- l'equipe : celles-la, l'admin seul (7-H).
drop policy if exists "journal lisible par les editeurs" on public.journal;
create policy "journal lisible par les editeurs"
    on public.journal for select
    to authenticated
    using ((select private.est_editeur())
           and (table_name not in ('retours', 'editeurs') or (select private.est_admin())));

-- L'equipe : chacun lit sa propre ligne — de quoi savoir son role —, l'admin les lit toutes et les ecrit
-- (7-H). La fonction `editeurs` (supabase/functions/editeurs/) cree le compte avec la cle de service,
-- puis ecrit la ligne avec la session de l'admin : le journal porte son nom. tools/console/editeur.mjs
-- reste pour reparer un compte admin depuis le poste.
drop policy if exists "editeurs : sa propre ligne" on public.editeurs;
create policy "editeurs : sa propre ligne"
    on public.editeurs for select
    to authenticated
    using (email = nullif(auth.jwt() ->> 'email', ''));

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

-- Les retours se lisent et se reclassent depuis la console ; ils ne s'y creent ni ne s'y suppriment,
-- puisqu'ils sont importes (tools/retours/). Deux politiques, et des privileges de colonne par-dessus :
--   - l'update ne porte que sur ce que l'admin en fait — la nature, l'etat, la note — et la reponse
--     elle-meme reste ce qui a ete dit, meme par erreur de saisie ;
--   - la lecture, commune aux trois roles, se fait **sans l'adresse** depuis 7-H : PRIVACY.md promet
--     qu'elle « n'est transmise a personne ». Un privilege de colonne ne distingue pas deux roles
--     applicatifs qui partagent `authenticated` : la colonne est retiree a tous, et
--     public.contact_du_retour() (fonctions.sql) la rend a l'admin. Corollaire : une colonne ajoutee a
--     `retours` n'est lisible par la console qu'une fois accordee ici.
-- `revoke` d'abord : une table nouvelle nait avec tous les privileges accordes aux trois roles, et
-- retirer un privilege de table retire aussi ses privileges de colonne. `service_role` garde les siens,
-- et l'import passe par lui. Aucune politique pour `anon`, et la lecture lui est revoquee plus haut :
-- sans ca, RLS lui rendrait une liste vide plutot qu'un refus.
revoke select, insert, update, delete on public.retours from authenticated;
grant select (id, recu_le, nature, campus, section, appareil, systeme, version_app, texte, volontaire,
              reponses, etat, note, importe_le)
    on public.retours to authenticated;
grant update (nature, etat, note) on public.retours to authenticated;

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

-- La console televerse les visuels dans `media` seulement ; le bucket des Blueprints reste au script de
-- publication. Depuis 7-H, l'admin y ecrit partout, et le redacteur y cree ce que ses annonces montrent
-- — `annonces/` et `partenaires/` — et rien d'autre. Remplacer ou effacer un objet reste a l'admin, sans
-- quoi un redacteur pourrait ecraser la photo d'un restaurant ou l'affiche d'un autre campus ; la console
-- ne remplace ni n'efface jamais un objet, chaque televersement en cree un a nom unique (7-E). Les
-- politiques de 6.1-B, ouvertes a tout editeur, sont retirees par leur nom.
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
