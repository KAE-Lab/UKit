-- UKit — les batiments de Bordeaux INP.
--
-- Le referentiel des lieux est migre depuis le jalon 6-D : `assets/locations.json` reste le socle
-- embarque — 73 batiments bordelais — et la table `batiments` est la surcouche, qui **ajoute** les
-- codes qu'il ne connait pas. C'est ce qui permet de couvrir une nouvelle universite sans release,
-- et ce fichier en est le premier usage reel (jalon 6-I).
--
-- Rejouable (`on conflict do update`), comme schema.sql et etablissements.sql.
--
-- ## Ce que la mesure a etabli, et ce qu'elle n'a pas etabli
--
-- Mesure du 2026-08-15 sur l'export ADE, les cinq ecoles balayees : **toutes** ecrivent leurs salles
-- sous la meme forme — deux majuscules, un tiret, la salle — et la premiere lettre nomme l'ecole.
-- Dix codes de batiment couvrent donc tout l'etablissement :
--
--   CA CC CD  ENSC                    EA EB  ENSEIRB-MATMECA
--   PA        ENSCBP                  GA GB  ENSEGID
--   BA BB     ENSTBB
--
-- Les coordonnees sont celles du **site**, relevees sur OpenStreetMap le 2026-08-15 et verifiees une
-- par une. C'est une limite ecrite, pas un oubli : OSM cartographie l'ecole comme un batiment unique
-- et ne nomme pas ses ailes, donc `CA`, `CC` et `CD` partagent le point de l'ENSC. Placer une aile
-- au hasard a cinquante metres serait pire — « un batiment sans coordonnees n'est pas une carte vide,
-- c'est une carte fausse » (src/shared/locations/referentiel.ts). Un etudiant a besoin de trouver
-- **l'ecole** sur un campus de deux kilometres ; la signaletique fait le reste.
--
-- `acces_libre` reste a faux : ce sont des ecoles d'ingenieurs a acces controle, contrairement aux
-- amphitheatres ouverts du campus de Bordeaux.
--
-- Voir docs/features/planning.md, docs/backend.md et docs/phase-6/6-i-planning-universel.md.

insert into public.batiments (code, nom, campus, latitude, longitude, acces_libre) values
    -- ENSC — Ecole Nationale Superieure de Cognitique, 109 avenue Roul, Talence.
    -- OSM : way « Ecole Nationale Superieure de Cognitique ».
    ('CA', 'ENSC — aile A',  'Bordeaux INP — ENSC',            44.806224, -0.597046, false),
    ('CC', 'ENSC — aile C',  'Bordeaux INP — ENSC',            44.806224, -0.597046, false),
    ('CD', 'ENSC — aile D',  'Bordeaux INP — ENSC',            44.806224, -0.597046, false),
    -- ENSEIRB-MATMECA, 1 avenue du Docteur Albert Schweitzer, Talence.
    ('EA', 'ENSEIRB-MATMECA — batiment A', 'Bordeaux INP — ENSEIRB-MATMECA', 44.806011, -0.605018, false),
    ('EB', 'ENSEIRB-MATMECA — batiment B', 'Bordeaux INP — ENSEIRB-MATMECA', 44.806011, -0.605018, false),
    -- ENSCBP, 16 avenue Pey-Berland, Pessac.
    ('PA', 'ENSCBP',         'Bordeaux INP — ENSCBP',          44.801353, -0.610737, false),
    -- ENSEGID, 1 allee Fernand Daguin, Pessac.
    ('GA', 'ENSEGID — batiment A', 'Bordeaux INP — ENSEGID',   44.804560, -0.609292, false),
    ('GB', 'ENSEGID — batiment B', 'Bordeaux INP — ENSEGID',   44.804560, -0.609292, false),
    -- ENSTBB, 146 rue Leo Saignat, Bordeaux — le seul site hors campus de Talence/Pessac.
    ('BA', 'ENSTBB — batiment A', 'Bordeaux INP — ENSTBB',     44.822567, -0.607037, false),
    ('BB', 'ENSTBB — batiment B', 'Bordeaux INP — ENSTBB',     44.822567, -0.607037, false)
on conflict (code) do update set
    nom         = excluded.nom,
    campus      = excluded.campus,
    latitude    = excluded.latitude,
    longitude   = excluded.longitude,
    acces_libre = excluded.acces_libre,
    maj_le      = now();
