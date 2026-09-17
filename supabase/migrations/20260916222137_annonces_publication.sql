-- La publication des annonces (jalon 7-C, section 6) : le type de carte, ses emplacements, son
-- cadrage, son ordre, son cycle de vie, son placeholder et son partenaire. Tout est additif et
-- invisible pour l'application installee : BdeService nomme ses colonnes, et la console n'ecrit que
-- les champs de son descripteur. La console les expose en 7-F, l'application les rend en 6.3.
--
-- Les contraintes passent par drop/add : `add constraint` n'a pas de `if not exists`.

alter table public.annonces add column if not exists type text not null default 'evenement';
alter table public.annonces drop constraint if exists annonces_type_check;
alter table public.annonces add constraint annonces_type_check
    check (type in ('evenement', 'info', 'bon_plan', 'partenaire'));

alter table public.annonces add column if not exists emplacements text[] not null default '{annonces}';
alter table public.annonces drop constraint if exists annonces_emplacements_check;
alter table public.annonces add constraint annonces_emplacements_check
    check (emplacements <@ array['annonces', 'restaurants', 'bibliotheques', 'salles']::text[]);

-- Les lignes existantes ont ete composees pour la regle d'avant — une affiche jamais recadree — :
-- elles recoivent `contenir` par le defaut au moment de l'ajout, puis le defaut passe a `couvrir`
-- pour toute ligne nouvelle. Pas d'`update` : rien a journaliser, et schema.sql ne porte que le
-- defaut final.
alter table public.annonces add column if not exists ajustement text not null default 'contenir';
alter table public.annonces alter column ajustement set default 'couvrir';
alter table public.annonces drop constraint if exists annonces_ajustement_check;
alter table public.annonces add constraint annonces_ajustement_check
    check (ajustement in ('couvrir', 'contenir'));

-- Le point garde au centre du recadrage, en fractions de l'image.
alter table public.annonces add column if not exists focale jsonb not null default '{"x": 0.5, "y": 0.3}'::jsonb;
alter table public.annonces add column if not exists priorite integer not null default 0;
alter table public.annonces add column if not exists epinglee boolean not null default false;
-- Les plages de mise en avant : [{"jours": [1, 2, 3], "de": "11:00", "a": "14:00"}], en heure de Paris.
alter table public.annonces add column if not exists creneaux jsonb;

-- Le cycle de vie. Une annonce programmee est une annonce `publiee` dont `publiee_le` est a venir,
-- pas un quatrieme statut : c'est la politique de lecture qui la cache jusqu'a son heure.
alter table public.annonces add column if not exists statut text not null default 'publiee';
alter table public.annonces drop constraint if exists annonces_statut_check;
alter table public.annonces add constraint annonces_statut_check
    check (statut in ('brouillon', 'publiee', 'archivee'));

-- Le placeholder, calcule au televersement par la console (7-E) ; jamais saisi.
alter table public.annonces add column if not exists blurhash text;
-- {"nom", "logo_url", "lien"}, pour les cartes de type partenaire ou bon plan.
alter table public.annonces add column if not exists partenaire jsonb;

-- Le 4 duplique le 0 en theme sombre : l'interdit n'existait que dans la console. Verifie avant
-- d'etre pose — une ligne qui le porterait ferait echouer la migration en le nommant.
do $$
begin
    if exists (select 1 from public.annonces where couleur = 4) then
        raise exception 'annonces.couleur = 4 : corriger ces lignes avant de poser la contrainte';
    end if;
end $$;
alter table public.annonces drop constraint if exists annonces_couleur_check;
alter table public.annonces add constraint annonces_couleur_check
    check (couleur is null or couleur <> 4);

-- La politique de lecture filtre enfin le statut et la date de publication : une annonce datee dans
-- le futur etait visible tout de suite. Elle disparait desormais pour tout le parc, versions
-- anciennes comprises, puisque le filtre est dans la base — c'est l'intention : programmer.
drop policy if exists "annonces publiees lisibles" on public.annonces;
create policy "annonces publiees lisibles"
    on public.annonces for select
    to anon
    using (active and statut = 'publiee' and publiee_le <= now()
           and (expire_le is null or expire_le > now()));

create index if not exists annonces_publication_v2_idx
    on public.annonces (statut, active, publiee_le desc);
