-- Trois colonnes de catalogue (jalon 7-C, section 6), pour les campus a venir : `credits`
-- ([{"nom", "role", "lien"}]), `campus` (le libelle qui regroupe, et qui remplacera les « Talence »
-- ecrits en dur) et `alias` (les mots des etudiants, pour la recherche).
--
-- La regle des trois gestes est SCINDEE, et c'est voulu (docs/backend.md) : ici la colonne, puis ses
-- valeurs dans les trois lignes de etablissements.sql — `db push` avant `psql -f` — ; en 6.3
-- seulement ce qui la lit : COLONNES, types.ts, catalogue.ts, socle.ts et la version du cache, une
-- fois que la base porte colonne ET valeurs (piege mesure le 2026-08-29).

alter table public.etablissements add column if not exists credits jsonb;
alter table public.etablissements add column if not exists campus text;
alter table public.etablissements add column if not exists alias text[] not null default '{}';
