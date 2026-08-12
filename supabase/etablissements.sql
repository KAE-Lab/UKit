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
-- Le seul du socle (src/shared/etablissements/catalogue.ts) : c'est lui qui doit rester
-- selectionnable au premier lancement, hors ligne, sans avoir jamais joint cette base. Sa presence
-- ici n'est donc pas redondante — elle permet de le **corriger** sans release, comme n'importe quelle
-- autre ligne.
insert into public.etablissements (
    code, nom, ville, logo_url, actif,
    portail_dossier, portail_messagerie,
    celcat_domaine, celcat_res_types,
    bibliotheques_points, services, libelles, ordre
) values (
    'bordeaux',
    'Université de Bordeaux',
    'Bordeaux',
    null,
    true,
    'ukit.portail.bordeaux.dossier',
    'ukit.portail.bordeaux.messagerie',
    'https://celcat.u-bordeaux.fr/calendar',
    '{"groupes": "103", "salles": "102"}'::jsonb,
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
    '{"ent":    "https://ent.u-bordeaux.fr",
      "email":  "https://webmel.u-bordeaux.fr",
      "cas":    "https://cas.u-bordeaux.fr",
      "apogee": "https://apogee.u-bordeaux.fr"}'::jsonb,
    '{}'::jsonb,
    0
) on conflict (code) do update set
    nom                  = excluded.nom,
    ville                = excluded.ville,
    logo_url             = excluded.logo_url,
    actif                = excluded.actif,
    portail_dossier      = excluded.portail_dossier,
    portail_messagerie   = excluded.portail_messagerie,
    celcat_domaine       = excluded.celcat_domaine,
    celcat_res_types     = excluded.celcat_res_types,
    bibliotheques_points = excluded.bibliotheques_points,
    services             = excluded.services,
    libelles             = excluded.libelles,
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
-- Trois `null` qui sont des **decisions**, pas des trous :
--
--   * `portail_messagerie` — le webmail de l'INP passe par SAML et non par le CAS. Il n'est donc pas
--     extractible, et l'ecran de scolarite n'affiche simplement pas la ligne de messagerie.
--   * `celcat_domaine` — l'INP est sur ADE, pas sur Celcat, et son export n'est pas encore porte.
--     L'onglet Planning le **dit** au lieu d'echouer, et l'accueil saute l'etape des groupes.
--   * `celcat_res_types` — sans serveur d'emploi du temps, les codes d'inventaire n'ont pas d'objet.
--
-- `bibliotheques_points` reprend ceux de Bordeaux : les deux etablissements sont dans la meme ville,
-- et le fournisseur d'affluence est national. C'est une donnee de catalogue precisement pour que ce
-- genre de choix se relise.
insert into public.etablissements (
    code, nom, ville, logo_url, actif,
    portail_dossier, portail_messagerie,
    celcat_domaine, celcat_res_types,
    bibliotheques_points, services, libelles, ordre
) values (
    'bordeaux-inp',
    'Bordeaux INP',
    'Bordeaux',
    null,
    true,
    'ukit.portail.bordeaux-inp.dossier',
    null,
    null,
    null,
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
    '{"ent":  "https://ent.bordeaux-inp.fr",
      "cas":  "https://cas.bordeaux-inp.fr"}'::jsonb,
    -- Ce dossier n'expose pas d'INE : le libelle le dit plutot que de laisser une ligne vide sans
    -- explication. « Numero etudiant » reste, lui, une chaine de Translator.
    '{}'::jsonb,
    1
) on conflict (code) do update set
    nom                  = excluded.nom,
    ville                = excluded.ville,
    logo_url             = excluded.logo_url,
    actif                = excluded.actif,
    portail_dossier      = excluded.portail_dossier,
    portail_messagerie   = excluded.portail_messagerie,
    celcat_domaine       = excluded.celcat_domaine,
    celcat_res_types     = excluded.celcat_res_types,
    bibliotheques_points = excluded.bibliotheques_points,
    services             = excluded.services,
    libelles             = excluded.libelles,
    ordre                = excluded.ordre;
