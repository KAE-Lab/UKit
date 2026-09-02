-- UKit — le catalogue des etablissements.
--
-- C'est la « ligne en base » du jalon 6-G : ajouter une universite, c'est ajouter un `insert` ici et
-- publier ses Blueprints de portail. Aucune release, aucune revue de store.
--
-- Le fichier est **rejouable** (`on conflict do update`), comme schema.sql et policies.sql : un
-- catalogue qu'on ne peut appliquer qu'une fois n'est pas reproductible.
--
-- Deux regles que la relecture doit tenir :
--
--   1. **Une ligne s'ecrit entiere.** Un nul y est une decision — « cet etablissement n'a pas ce
--      service » — et non une omission. L'application remplace l'entree par la ligne, elle ne fusionne
--      pas champ par champ (c'est l'inverse de `batiments`, ou un nul veut dire « je ne corrige pas ce
--      champ »). Voir src/shared/etablissements/catalogue.ts.
--   2. **Les Blueprints d'abord, la ligne ensuite.** Une ligne qui nomme un Blueprint non publie
--      ferait echouer le parcours d'un etudiant sur une erreur que personne ne sait lire. Meme regle
--      que le manifeste, ecrit en dernier (tools/publish-blueprints.mjs).
--
-- Voir docs/backend.md et docs/phase-6/6-g-etablissements.md.

-- =============================================================================
-- Universite de Bordeaux — l'etablissement historique, aussi embarque dans le binaire
-- =============================================================================
--
-- L'etablissement historique du socle (src/shared/etablissements/socle.ts) : c'est lui qui doit
-- rester selectionnable au premier lancement, hors ligne, sans avoir jamais joint cette base. Sa
-- presence ici n'est donc pas redondante — elle permet de le **corriger** sans release, comme
-- n'importe quelle autre ligne. Depuis la 6.1, le socle embarque **toutes** les lignes de ce fichier
-- a la date de la release, et un test le verifie.
insert into public.etablissements (
    code, nom, nom_court, ville, logo_url, actif,
    portail_dossier, portail_messagerie, portail_widgets, portail_documents,
    celcat_domaine, celcat_res_types, edt, salles, salles_libres,
    bibliotheques_points, services, libelles, crous_region, ordre
) values (
    'bordeaux',
    'Collège Sciences et Technologies',
    'Collège ST',
    -- La commune du campus, pas la metropole : le college ST est a Talence. Le socle le disait deja,
    -- cette ligne disait « Bordeaux », et une ligne publiee REMPLACE le socle — le test de
    -- divergence (src/shared/etablissements/socle.test.ts) exige desormais qu'ils coincident.
    'Talence',
    -- **Le logo valait `null` ici alors que le socle en portait un**, et une ligne publiee REMPLACE le
    -- socle : le logo etait donc efface au premier rafraichissement du catalogue, et l'ecran de
    -- connexion montrait l'icone de repli depuis le jour de sa publication. Le fichier, lui, existait
    -- bien dans le bucket. C'est le piege propre a « une ligne remplace, elle ne corrige pas » :
    -- oublier une colonne ne laisse pas la valeur d'avant, il la supprime.
    'https://owiksddeqcyyifnmpyqm.supabase.co/storage/v1/object/public/media/etablissements/bordeaux.webp',
    true,
    'ukit.portail.bordeaux.dossier',
    'ukit.portail.bordeaux.messagerie',
    -- Les widgets remplis. `notes` et `examens` n'y sont PAS, et ce n'est pas un oubli : leur donnee
    -- n'existe pas encore — les resultats tombent en bloc en fin de semestre, il n'y a pas de
    -- calendrier d'epreuves avant la rentree. Leurs rangees s'affichent quand meme et ouvrent leur
    -- porte (`services.notes` / `services.examens`). Le jour ou la source existe, elle s'ajoute ici.
    '{"messagerie": {"blueprint": "ukit.portail.bordeaux.messagerie"},
      "moodle":     {"blueprint": "ukit.portail.bordeaux.moodle"}}'::jsonb,
    -- ReNARD, mesure le 2026-08-29. C'est le SEUL des trois etablissements a en declarer un, et la
    -- raison est technique et non contractuelle : l'adresse d'une piece y est deterministe
    -- (/document/<base64 du fournisseur et de l'annee>/lang), donc rejouable, la ou celles de l'INP
    -- sont regenerees a chaque affichage. L'identite vient du cookie, pas de l'adresse.
    'ukit.portail.bordeaux.documents',
    'https://celcat.u-bordeaux.fr/calendar',
    '{"groupes": "103", "salles": "102"}'::jsonb,
    -- Pas d'export iCalendar : cette universite publie son Celcat, et c'est l'exception francaise.
    null,
    -- La reconnaissance de salle, telle qu'elle vivait en dur dans AppCore jusqu'au jalon 6-I. Le
    -- premier separateur ENUMERE (« A22/Amphi | A29/Salle » nomme deux batiments), le second TRONQUE
    -- (« A22/Amphitheatre Charles DARWIN » n'en nomme qu'un). `depuis` a 2 parce qu'une description
    -- Celcat porte le groupe et l'enseignant avant la salle. Ecrire ces valeurs plutot que de les
    -- laisser au defaut n'ajoute rien au comportement : ca le rend relisible et corrigeable.
    '{"separateurs": [" | ", "/"], "motif": "([A-Z][0-9]+)", "depuis": 2}'::jsonb,
    -- Pas d'emprunt : cette universite est proprietaire de l'inventaire que les autres empruntent.
    null,
    -- Les onze points de balayage des bibliotheques. Mesure du 2026-08-08 : ils rendent 14 sites,
    -- cinq points n'en rendent aucun, et quatre seulement portent des sites exclusifs. Reduire la
    -- liste serait un changement de comportement produit, pas un nettoyage — la mesure complete est
    -- dans src/shared/etablissements/catalogue.ts.
    '[{"lat": 44.8377, "lng": -0.5791},
      {"lat": 44.7963, "lng": -0.6277},
      {"lat": 43.2951, "lng": -0.3707},
      {"lat": 46.1603, "lng": -1.1511},
      {"lat": 45.8336, "lng": 1.2611},
      {"lat": 46.5802, "lng": 0.3403},
      {"lat": 43.4929, "lng": -1.4748},
      {"lat": 45.1920, "lng": 0.7194},
      {"lat": 44.2031, "lng": 0.6163},
      {"lat": 45.6483, "lng": 0.1562},
      {"lat": 46.3237, "lng": -0.4647}]'::jsonb,
    -- Les portes du navigateur integre. Ajouter ou retirer une porte est une ligne ici, jamais une
    -- release.
    --
    -- `moodle` visait `/login/index.php` (mesure du 2026-08-29 : la racine est une page d'accueil
    -- PUBLIQUE, on y arrivait deconnecte). Le soir de la sortie de la 6.0, la cascade WAYF de ce
    -- chemin a tue la WebView d'un Android — ENT et Chrome passaient, seul ce chemin cassait. La porte
    -- vise depuis le **SSO initie par l'IdP** (Unsolicited SSO), SANS page de choix d'etablissement,
    -- avec un `target` sur /auth/shibboleth/index.php qui cree la session Moodle — sans lui on est
    -- authentifie cote SP et deconnecte cote Moodle. Publie a chaud le 2026-08-31, recopie ici le
    -- 2026-09-02 pour que ce fichier redise ce que la base porte. C'est LE chemin sans WAYF pour tout
    -- service Shibboleth de Bordeaux.
    --
    -- `ent` visait `ent.u-bordeaux.fr`, qui **ne resout plus** — mesure le 2026-08-25, et le symptome
    -- etait un `NSURLErrorDomain -1003` a chaque ouverture, y compris en production. Le portail vit
    -- sur `intranet`, qui rebondit sur le CAS avec son parametre `service`.
    --
    -- `idp_shibboleth` n'est **pas une porte** : rien ne s'ouvre a cette adresse. C'est l'identite
    -- que la page de choix d'etablissement de Moodle attend qu'on lui designe, dans une liste de 56
    -- (voir `getPortalInjectedScript`). Elle vit ici parce qu'elle est propre a l'etablissement, et
    -- que la corriger doit rester une publication.
    --
    -- `notes` et `examens` sont les deux services d'Apogee que l'intranet nomme lui-meme, releves le
    -- 2026-08-28 : « Resultats d'examens et 2de Session » (RE01) et « Calendrier des examens »
    -- (RE02). La racine nue obligeait a les chercher dans un portail ; ces adresses ouvrent la vue.
    --
    -- `adaptation` n'est pas une porte non plus : c'est le formulaire de demande, et il sert d'action
    -- a une rangee que l'etablissement ne porte pas. Un etat vide offre une action, jamais un bouton
    -- Reessayer qui n'aurait rien a rejouer.
    '{"ent":     "https://intranet.u-bordeaux.fr",
      "email":   "https://webmel.u-bordeaux.fr",
      "cas":     "https://cas.u-bordeaux.fr",
      "apogee":  "https://apogee.u-bordeaux.fr",
      "moodle":  "https://idp-ubx.u-bordeaux.fr/idp/profile/SAML2/Unsolicited/SSO?providerId=https%3A%2F%2Fmoodle.u-bordeaux.fr%2Fauth%2Fshibboleth&target=https%3A%2F%2Fmoodle.u-bordeaux.fr%2Fauth%2Fshibboleth%2Findex.php",
      "notes":   "https://apogee.u-bordeaux.fr/index.php?srv=RE01",
      "examens": "https://apogee.u-bordeaux.fr/index.php?srv=RE02",
      "adaptation": "https://forms.gle/c8vpwBu1QpowkAKC8",
      "idp_shibboleth": "https://idp-ubx.u-bordeaux.fr/idp/shibboleth"}'::jsonb,
    '{}'::jsonb,
    -- La region CROUS de Croustillant. C'etait une constante du Blueprint jusqu'au jalon 6-J ; la
    -- valeur ne change pas, sa nature si — elle est desormais corrigeable sans release, et un
    -- etablissement peut ne pas en avoir.
    '1',
    0
) on conflict (code) do update set
    nom                  = excluded.nom,
    nom_court            = excluded.nom_court,
    ville                = excluded.ville,
    logo_url             = excluded.logo_url,
    actif                = excluded.actif,
    portail_dossier      = excluded.portail_dossier,
    portail_messagerie   = excluded.portail_messagerie,
    portail_widgets      = excluded.portail_widgets,
    portail_documents    = excluded.portail_documents,
    celcat_domaine       = excluded.celcat_domaine,
    celcat_res_types     = excluded.celcat_res_types,
    edt                  = excluded.edt,
    salles               = excluded.salles,
    salles_libres        = excluded.salles_libres,
    bibliotheques_points = excluded.bibliotheques_points,
    services             = excluded.services,
    libelles             = excluded.libelles,
    crous_region         = excluded.crous_region,
    ordre                = excluded.ordre;

-- =============================================================================
-- Bordeaux INP — le second etablissement, ajoute SANS release
-- =============================================================================
--
-- C'est la preuve du jalon, et elle ne vaut que parce que l'etablissement est reel : son portail a
-- ete ecrit contre un compte etudiant veritable, pas contre une maquette. Deux universites se
-- ressemblent en surface et divergent partout ou ca compte — ici, le CAS est le meme produit Apereo
-- mais son bouton d'envoi est un `<button>` et non un `<input>`, et le dossier est la generation
-- Vaadin de PC-Scol au lieu du GWT d'Apogee (blueprints/portails/).
--
-- Deux `null` qui sont des **decisions**, pas des trous :
--
--   * `celcat_domaine` — l'INP est sur ADE, pas sur Celcat. La colonne reste nulle **apres** le jalon
--     6-I : elle nomme un serveur Celcat, pas « un emploi du temps ». L'emploi du temps arrive par
--     `edt`, et la recherche de salles libres par `salles_libres`.
--   * `celcat_res_types` — sans serveur Celcat propre, les codes d'inventaire n'ont pas d'objet : le
--     serveur emprunte porte le sien.
--
-- `bibliotheques_points` reprend ceux de Bordeaux : les deux etablissements sont dans la meme ville,
-- et le fournisseur d'affluence est national. C'est une donnee de catalogue precisement pour que ce
-- genre de choix se relise.
insert into public.etablissements (
    code, nom, nom_court, ville, logo_url, actif,
    portail_dossier, portail_messagerie, portail_widgets, portail_documents,
    celcat_domaine, celcat_res_types, edt, salles, salles_libres,
    bibliotheques_points, services, libelles, crous_region, ordre
) values (
    'bordeaux-inp',
    'Bordeaux INP',
    null,
    -- Les ecoles de l'INP sont sur le campus de Talence, comme le College ST.
    'Talence',
    -- Meme correction que pour Bordeaux : le fichier etait publie, la colonne restait nulle.
    'https://owiksddeqcyyifnmpyqm.supabase.co/storage/v1/object/public/media/etablissements/bordeaux-inp.webp',
    true,
    'ukit.portail.bordeaux-inp.dossier',
    -- **La messagerie de l'INP est extractible**, contrairement a ce que cette ligne affirmait en
    -- valant `null`. Sonde du 2026-08-28 : partage.bordeaux-inp.fr redirige vers SON PROPRE CAS
    -- (cas.bordeaux-inp.fr/login?service=sso.../idp/Authn/External) — un SP SAML dont l'IdP delegue
    -- au CAS, exactement comme Moodle a Bordeaux. Et Partage est le MEME Zimbra que webmel : le
    -- selecteur de la boite est identique au caractere pres. Une etape de plus, la page de
    -- consentement Shibboleth, et elle ne parait qu'une fois.
    'ukit.portail.bordeaux-inp.messagerie',
    -- Un seul widget rempli. `moodle` n'y est pas : le parcours devrait fonctionner — l'INP n'a pas
    -- de page de decouverte et sa session persistee suffit — mais il n'a **pas ete joue** contre un
    -- compte reel, et le compte de sonde est prete. On ne publie pas une source qu'on n'a pas vue
    -- rendre ; la rangee affiche « bientot » et ouvre Moodle en attendant.
    '{"messagerie": {"blueprint": "ukit.portail.bordeaux-inp.messagerie"}}'::jsonb,
    -- Le certificat de scolarite, rapporte depuis /inscriptions de mondossierweb. La sonde du
    -- 2026-08-25 avait declare ces pieces non rapportables parce que leur adresse est regeneree a
    -- chaque rendu — c'etait confondre l'adresse et l'acces : la technique ReNARD lit le lien FRAIS
    -- dans le DOM et telecharge depuis la page, donc l'instabilite de l'adresse est sans objet.
    -- Re-mesure le 2026-08-29 : fetch depuis la page = 200, application/pdf, 112 Ko, %PDF.
    'ukit.portail.bordeaux-inp.documents',
    null,
    null,
    -- L'emploi du temps par export iCalendar (jalon 6-I). Releve le 2026-08-15 avec
    -- `node tools/releve-ade.mjs --projet 1`, sur trois semaines de l'annee 2025-2026.
    --
    -- `params.projet` designe un PROJET ADE, et il en existe plusieurs simultanement : le projet
    -- vivant est le 1 (3156 evenements sur l'annee), la ou le 2 est une quasi-coquille vide (54). Les
    -- UID les nomment en clair — « 2025-2026 », « NEPASTOUCHER2526_SAUV », « 2526_POUR_ESUP »,
    -- « TMP2526 ». **Il change a chaque rentree**, et c'est pourquoi il vit ici, a cote du
    -- referentiel : une rentree est alors UNE publication, pas deux.
    --
    -- `groupes` nomme des **index positionnels** dans l'arbre des ressources du projet, pas des
    -- identifiants ADE : `resources=1` rend la racine, c'est-a-dire tout l'etablissement, et
    -- l'identifiant interne lu dans un UID ne rend rien. Un index est stable a l'interieur d'un
    -- projet, et se re-releve a la rentree suivante.
    --
    -- Les treize entrees ci-dessous sont celles que le releve a nommees **sans ambiguite** : l'ecole
    -- vient du prefixe du code de module (COG, GID, BIO, EEL/EIN/EMM/ETE/ESE/EMU), le libelle vient
    -- des evenements eux-memes, et chacune a ete confrontee a trois semaines ecartees dans l'annee.
    -- Un index qui melange plusieurs promotions n'est PAS publie : ce serait proposer a un etudiant
    -- un planning qui n'est pas le sien. La liste s'etend par publication, sans release.
    '{"blueprint": "ukit.portail.bordeaux-inp.edt",
      "blueprint_annee": "ukit.portail.bordeaux-inp.edt.annee",
      "params": {"projet": "1"},
      "groupes": [{"nom": "ENSC 1A",       "ressource": "2"},
                  {"nom": "ENSC 2A",       "ressource": "3"},
                  {"nom": "ENSC 2A GR1",   "ressource": "7"},
                  {"nom": "ENSC 3A",       "ressource": "4"},
                  {"nom": "ENSEGID 2A",    "ressource": "140"},
                  {"nom": "ENSEGID 3A",    "ressource": "183"},
                  {"nom": "ENSTBB",        "ressource": "112"},
                  {"nom": "ENSEIRB E2",    "ressource": "200"},
                  {"nom": "ENSEIRB S2",    "ressource": "36"},
                  {"nom": "ENSEIRB T2",    "ressource": "61"},
                  {"nom": "ENSEIRB TSI",   "ressource": "201"},
                  {"nom": "ENSEIRB R3",    "ressource": "123"},
                  {"nom": "ENSEIRB SRT",   "ressource": "38"}]}'::jsonb,
    -- La reconnaissance de salle. Mesure du 2026-08-15 sur les cinq ecoles : **toutes** ecrivent
    -- leurs salles sous la meme forme, deux majuscules et un tiret, et la premiere lettre nomme
    -- l'ecole — CA/CC/CD a l'ENSC, EA/EB a l'ENSEIRB-MATMECA, PA a l'ENSCBP, GA/GB a l'ENSEGID,
    -- BA/BB a l'ENSTBB. Un seul motif couvre donc tout l'etablissement. Le motif est ancre en debut
    -- de segment, ce qui laisse passer les annotations (« EA-S110/S111 (TD08) », « GB-O-111 Reservee
    -- ISA-BTP ») sans qu'aucune troncature soit necessaire. `depuis` a 0 parce que la salle vient
    -- d'un champ separe (LOCATION) que IcsMapping remet en tete de la description.
    '{"separateurs": [","], "motif": "^([A-Z]{2})-", "depuis": 0}'::jsonb,
    -- La recherche de salles libres, **empruntee** au serveur de l'Universite de Bordeaux. Decision
    -- produit du 2026-08-15, prise en jouant le jalon sur appareil : les ecoles de l'INP sont sur le
    -- campus de Talence, celui-la meme dont cette recherche liste les batiments en acces libre. Leur
    -- refuser la fonctionnalite parce que leur emploi du temps vient d'ADE les priverait d'un service
    -- qui leur sert reellement — un etudiant de l'ENSC qui cherche une salle pour travailler la
    -- trouvera dans un batiment de l'UB, a deux cents metres.
    --
    -- L'emprunt ne concerne **que** les salles : `edt` reste la source de l'emploi du temps, et les
    -- batiments proposes restent ceux de l'UB. Adapter la recherche aux batiments de l'INP est un
    -- sujet distinct, et il n'est pas ouvert.
    '{"domaine": "https://celcat.u-bordeaux.fr/calendar", "res_type": "102"}'::jsonb,
    '[{"lat": 44.8377, "lng": -0.5791},
      {"lat": 44.7963, "lng": -0.6277},
      {"lat": 43.2951, "lng": -0.3707},
      {"lat": 46.1603, "lng": -1.1511},
      {"lat": 45.8336, "lng": 1.2611},
      {"lat": 46.5802, "lng": 0.3403},
      {"lat": 43.4929, "lng": -1.4748},
      {"lat": 45.1920, "lng": 0.7194},
      {"lat": 44.2031, "lng": 0.6163},
      {"lat": 45.6483, "lng": 0.1562},
      {"lat": 46.3237, "lng": -0.4647}]'::jsonb,
    -- Le navigateur integre ouvre ces pages ; l'utilisateur les pilote, elles ne sont pas extraites.
    -- `moodle` verifie le 2026-08-13 (« Moodle Bordeaux INP »). Une porte absente ne s'affiche pas.
    --
    -- `email` EXISTE, contre ce que cette ligne disait : c'est Partage, l'adresse relevee le
    -- 2026-08-28. Pas d'`apogee` : l'INP est sur PC-Scol.
    --
    -- `moodle` vise la RACINE ici, contrairement a Bordeaux : ce Moodle n'a pas de page de decouverte
    -- et tente le SSO silencieux (`gateway=true`) des l'accueil. Le pointer sur /login/index.php
    -- n'apporterait rien et n'a pas ete mesure contre un compte reel — le compte de sonde est prete.
    --
    -- **Ni `notes` ni `examens`**, et c'est mesure, pas suppose : le dossier de l'INP n'a que quatre
    -- onglets — Etat-civil, Coordonnees, Acces, Parcours. `/notes`, `/resultats` et `/examens` rendent
    -- tous la vue par defaut. Ces deux services vivent ailleurs chez eux, et on ne sait pas encore ou.
    -- Leurs rangees le disent au lieu de promettre une porte qui n'existe pas.
    '{"ent":    "https://ent.bordeaux-inp.fr",
      "email":  "https://partage.bordeaux-inp.fr/mail",
      "cas":    "https://cas.bordeaux-inp.fr",
      "moodle": "https://moodle.bordeaux-inp.fr",
      "adaptation": "https://forms.gle/c8vpwBu1QpowkAKC8",
      "idp_shibboleth": "https://sso.bordeaux-inp.fr/idp/shibboleth"}'::jsonb,
    -- Le nom de l'instance Moodle de cet etablissement, releve sur la page elle-meme le 2026-08-13.
    --
    -- Il vit ici et non dans `Translator` parce que ce n'est pas une traduction : « Moodle » est le
    -- nom du produit, « Moodle Bordeaux INP » celui de leur installation. La tuile s'en sert pour sa
    -- ligne de contexte, qui disait sinon « Moodle » sous un grand texte qui disait deja « Moodle »
    -- (signale sur appareil le 2026-08-29). Bordeaux n'en declare pas : la sienne s'appelle
    -- simplement « Moodle », et la tuile retombe alors sur la description du service.
    '{"moodle": "Moodle Bordeaux INP"}'::jsonb,
    -- La meme region que l'Universite de Bordeaux : les deux etablissements sont dans la meme ville,
    -- et le CROUS y est le meme. C'est une donnee de catalogue precisement pour que ce genre de choix
    -- se relise.
    '1',
    1
) on conflict (code) do update set
    nom                  = excluded.nom,
    nom_court            = excluded.nom_court,
    ville                = excluded.ville,
    logo_url             = excluded.logo_url,
    actif                = excluded.actif,
    portail_dossier      = excluded.portail_dossier,
    portail_messagerie   = excluded.portail_messagerie,
    portail_widgets      = excluded.portail_widgets,
    portail_documents    = excluded.portail_documents,
    celcat_domaine       = excluded.celcat_domaine,
    celcat_res_types     = excluded.celcat_res_types,
    edt                  = excluded.edt,
    salles               = excluded.salles,
    salles_libres        = excluded.salles_libres,
    bibliotheques_points = excluded.bibliotheques_points,
    services             = excluded.services,
    libelles             = excluded.libelles,
    crous_region         = excluded.crous_region,
    ordre                = excluded.ordre;

-- =============================================================================
-- « Mon universite n'est pas dans la liste » — l'etablissement ouvert (jalon 6-J)
-- =============================================================================
--
-- Ce n'est pas une universite : c'est **l'absence d'universite portee, rendue utilisable**. Un
-- etudiant dont la fac n'est pas au catalogue colle le lien d'abonnement que son etablissement lui
-- donne, et il a son emploi du temps — sans qu'on ait ecrit une seule ligne pour lui.
--
-- C'est la preuve que le repli universel tient, et elle ne coute rien d'autre que cette ligne : le
-- Blueprint `ukit.edt.abonnement` est unique, embarque, et le meme pour tout le monde. Un fichier par
-- etablissement le rendrait aussi couteux que ce qu'il remplace.
--
-- **Le perimetre du produit est le secteur bordelais** (voir le README), et c'est ce qui rend cette
-- ligne honnete : les trois colonnes de campus ci-dessous sont VRAIES pour une fac bordelaise non
-- portee. Une fac de Lille aurait besoin des siennes, et les colonnes existent pour ca — c'est
-- justement pourquoi la region CROUS a quitte le Blueprint au jalon 6-J.
--
-- Quatre `null` qui sont des decisions :
--
--   * `portail_dossier` / `portail_messagerie` — on ne connait pas son ENT, donc rien a jouer.
--     L'onglet Scolarite le **dit** au lieu d'afficher un formulaire qui ne mene nulle part.
--   * `celcat_domaine` — a fortiori.
--   * `salles` avec `reconnaissance: false` — on ne connait pas la forme de ses salles. Appliquer le
--     motif bordelais capturerait un code qui existe CHEZ NOUS (`A28` est le CREMI) et poserait un
--     marqueur a Talence pour une salle qui n'y est pas. *Un batiment sans coordonnees n'est pas une
--     carte vide, c'est une carte fausse* (jalon 6-I). Le jour ou on porte la fac pour de vrai, on lui
--     ecrit son motif et la carte revient.
--
-- `ordre` a 99 : elle ferme la liste, apres les etablissements reels.
insert into public.etablissements (
    code, nom, nom_court, ville, logo_url, actif,
    portail_dossier, portail_messagerie, portail_widgets, portail_documents,
    celcat_domaine, celcat_res_types, edt, salles, salles_libres,
    bibliotheques_points, services, libelles, crous_region, ordre
) values (
    'autre',
    -- Court, et corrige apres coup sur appareil : « Mon universite n'est pas dans la liste » disait
    -- juste, mais une phrase entiere dans une liste de noms propres se lit mal et deborde. Le nom d'un
    -- etablissement est une **donnee**, donc ce genre de correction est une publication et non une
    -- release — c'est precisement ce que le jalon 6-G a rendu possible. « Autre campus » et non
    -- « Autre universite » : le perimetre du produit est un secteur, pas une liste d'universites.
    'Autre campus',
    'Autre campus',
    null,
    null,
    true,
    null,
    null,
    -- Aucun widget : sans portail, il n'y a aucune source a lire. L'onglet Scolarite dit qu'il n'est
    -- pas pris en charge et propose le formulaire, il n'affiche pas de rangees.
    '{}'::jsonb,
    -- Aucune source de documents non plus, pour la meme raison : on ne sait pas de quelle fac il
    -- s'agit, donc il n'y a nulle part ou aller chercher quoi que ce soit.
    null,
    null,
    null,
    -- Un abonnement, et rien d'autre : le catalogue dit QUE cet etablissement en publie un, jamais
    -- comment le jouer. `aide` est un libelle de donnee — il s'affiche tel quel, comme le nom d'une
    -- universite — et il reste volontairement generique ici, puisqu'on ne sait pas de quelle fac il
    -- s'agit. Une fac portee, elle, nommera son chemin exact.
    '{"abonnement": {"aide": "l''espace emploi du temps de ton ENT, rubrique « exporter » ou « s''abonner »"}}'::jsonb,
    '{"reconnaissance": false}'::jsonb,
    -- Les salles libres de l'Universite de Bordeaux, empruntees comme le fait Bordeaux INP. Meme
    -- argument, et il est geographique : le perimetre du produit est bordelais, donc un etudiant qui
    -- choisit cette ligne est sur le meme campus que les batiments listes.
    '{"domaine": "https://celcat.u-bordeaux.fr/calendar", "res_type": "102"}'::jsonb,
    -- Les memes points de balayage : Affluences est national, mais ces points decident des VILLES
    -- couvertes. La position de l'etudiant est balayee en plus d'eux (LibraryService), donc une
    -- bibliotheque proche de lui remonte de toute facon.
    '[{"lat": 44.8377, "lng": -0.5791},
      {"lat": 44.7963, "lng": -0.6277},
      {"lat": 43.2951, "lng": -0.3707},
      {"lat": 46.1603, "lng": -1.1511},
      {"lat": 45.8336, "lng": 1.2611},
      {"lat": 46.5802, "lng": 0.3403},
      {"lat": 43.4929, "lng": -1.4748},
      {"lat": 45.1920, "lng": 0.7194},
      {"lat": 44.2031, "lng": 0.6163},
      {"lat": 45.6483, "lng": 0.1562},
      {"lat": 46.3237, "lng": -0.4647}]'::jsonb,
    -- Aucune porte universitaire : on ne connait aucune des adresses de cet etablissement, donc le
    -- navigateur integre n'a aucun service a ouvrir.
    --
    -- Une seule cle, et ce n'est pas une porte de service : `adaptation`, l'adresse du formulaire de
    -- demande. L'onglet Scolarite l'affiche en action de son etat vide — « Campus non pris en
    -- charge » — et **la masque tant qu'elle est absente** : mieux vaut dire honnetement « pas
    -- encore » que proposer une porte fermee.
    --
    -- Elle vit ici plutot que dans l'ecran pour la raison qui vaut partout dans cette phase :
    -- remplacer un formulaire, le fermer quand la campagne est finie, ou en ouvrir un par region est
    -- **une publication**, pas une release.
    '{"adaptation": "https://forms.gle/c8vpwBu1QpowkAKC8"}'::jsonb,
    '{}'::jsonb,
    '1',
    99
) on conflict (code) do update set
    nom                  = excluded.nom,
    nom_court            = excluded.nom_court,
    ville                = excluded.ville,
    logo_url             = excluded.logo_url,
    actif                = excluded.actif,
    portail_dossier      = excluded.portail_dossier,
    portail_messagerie   = excluded.portail_messagerie,
    portail_widgets      = excluded.portail_widgets,
    portail_documents    = excluded.portail_documents,
    celcat_domaine       = excluded.celcat_domaine,
    celcat_res_types     = excluded.celcat_res_types,
    edt                  = excluded.edt,
    salles               = excluded.salles,
    salles_libres        = excluded.salles_libres,
    bibliotheques_points = excluded.bibliotheques_points,
    services             = excluded.services,
    libelles             = excluded.libelles,
    crous_region         = excluded.crous_region,
    ordre                = excluded.ordre;
