-- Les evenements des annonces (phase 8, lot 5 de la 7.0 ; docs/phase-8/5-evenements.md) : une annonce
-- d'evenement gagne un debut, une fin et un lieu, que l'application ajoute au Planning de l'etudiant.
--
-- Additive : trois colonnes nullables de `annonces` et leur garde de forme, que toutes les lignes
-- existantes satisfont (les trois nulles). Les droits sont ceux de la table, accordes a la table
-- entiere : qui lit une annonce lit son evenement, qui l'ecrit l'ecrit. Aucune ecriture n'est ouverte a
-- `anon`, et rien de ce que l'etudiant ajoute ou masque n'arrive ici : tout reste sur l'appareil.
--
-- La garde porte la forme, pas le type : comme le partenaire, l'evenement survit a un changement de type
-- dans la console, pour qu'on puisse le retirer, et l'application ne le lit que sur une annonce de type
-- `evenement`.

alter table public.annonces add column if not exists evenement_debut timestamptz;
alter table public.annonces add column if not exists evenement_fin timestamptz;
alter table public.annonces add column if not exists evenement_lieu text;

-- Les trois ensemble ou aucun ; une fin apres le debut, au plus vingt-quatre heures plus tard — une date
-- et deux heures, une soiree pouvant passer minuit ; un lieu de 2 a 120 caracteres.
alter table public.annonces drop constraint if exists annonces_evenement_check;
alter table public.annonces add constraint annonces_evenement_check check (
    (evenement_debut is null and evenement_fin is null and evenement_lieu is null)
    or (evenement_debut is not null and evenement_fin is not null and evenement_lieu is not null
        and evenement_fin > evenement_debut
        and evenement_fin <= evenement_debut + interval '24 hours'
        and char_length(btrim(evenement_lieu)) between 2 and 120)
);
