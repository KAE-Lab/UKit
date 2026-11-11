-- UKit — les batiments de l'Universite Bordeaux Montaigne.
--
-- Les memes codes sont embarques dans `assets/locations.json` depuis le lot 3 de la prochaine version :
-- ce fichier les sert aux binaires deja installes, qui lisent la surcouche `batiments` sans release.
-- **A publier apres la ligne de catalogue** `bordeaux-montaigne` : sans elle, aucun etablissement ne
-- produit ces codes, et ils restent inertes.
--
-- Rejouable (`on conflict do update`), comme batiments-bordeaux-inp.sql.
--
-- ## Ce que la mesure a etabli
--
-- Mesure du 2026-11-11 sur l'export PRONOTE du compte prete (143 evenements) : une salle s'ecrit par la
-- lettre de son batiment et un numero a trois chiffres (`G 306`, `F 011`, `E 208 informatique`,
-- `MOD 002`), un amphitheatre par son nom et son code entre parentheses (`Amphi Pina Bausch (C200)`,
-- `Amphi Olympe de Gouges (B400)`), ou par son seul nom (`Amphi CIROT`, `Amphi N°1`). Le motif de la
-- ligne de catalogue en tire le code.
--
-- Les coordonnees sont le centre du batiment sur OpenStreetMap, releve le 2026-11-11 : les ailes
-- `Flora Tristan (bat A)` a `(bat F)`, `G`, `I`, `J`, `K`, `Batiments Modulaires`,
-- `Amphitheatres B200 - B400`, `Amphitheatre C200`, `Amphitheatres Cirot et Renouard`. Deux limites
-- ecrites : **H n'y est pas**, parce que deux batiments d'OSM portent ce nom a deux cents metres l'un de
-- l'autre — une carte au hasard serait une carte fausse ; et `Amphi N°1` n'est rattache a aucun batiment
-- nomme. Leurs cours n'ont pas de carte.
--
-- Les codes sont courts (une lettre) parce que l'export les ecrit ainsi, et ils ne heurtent aucun code
-- du socle bordelais (`A0` a `A40`, `B1` a `B22`, `C1` a `C6`, `IOA`, `R1` a `R8`) ni de l'INP. Le
-- referentiel est commun a tous les etablissements : un prochain campus qui ecrirait aussi `G 306`
-- devra choisir des codes a lui.
--
-- `acces_libre` reste a faux : aucune recherche de salles libres n'existe pour Montaigne.
--
-- Voir docs/campus/bordeaux-montaigne.md et docs/features/planning.md.

insert into public.batiments (code, nom, campus, latitude, longitude, acces_libre) values
    ('A',     'Batiment A',                           'Pessac', 44.79627, -0.61655, false),
    ('B',     'Batiment B',                           'Pessac', 44.79649, -0.61634, false),
    ('C',     'Batiment C',                           'Pessac', 44.79645, -0.61599, false),
    ('D',     'Batiment D',                           'Pessac', 44.79664, -0.61577, false),
    ('E',     'Batiment E',                           'Pessac', 44.79659, -0.61542, false),
    ('F',     'Batiment F',                           'Pessac', 44.79680, -0.61520, false),
    ('G',     'Batiment G',                           'Pessac', 44.79673, -0.61485, false),
    ('I',     'Batiment I',                           'Pessac', 44.79557, -0.61850, false),
    ('J',     'Batiment J',                           'Pessac', 44.79537, -0.61796, false),
    ('K',     'Batiment K',                           'Pessac', 44.79582, -0.61782, false),
    ('MOD',   'Batiments modulaires',                 'Pessac', 44.79609, -0.61478, false),
    ('B400',  'Amphitheatre Olympe de Gouges (B400)', 'Pessac', 44.79628, -0.61557, false),
    ('C200',  'Amphitheatre Pina Bausch (C200)',      'Pessac', 44.79637, -0.61498, false),
    ('CIROT', 'Amphitheatre Cirot',                   'Pessac', 44.79553, -0.61741, false)
on conflict (code) do update set
    nom         = excluded.nom,
    campus      = excluded.campus,
    latitude    = excluded.latitude,
    longitude   = excluded.longitude,
    acces_libre = excluded.acces_libre,
    maj_le      = now();
