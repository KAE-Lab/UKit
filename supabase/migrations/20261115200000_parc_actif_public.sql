-- Le parc actif, en centaines, pour qui le demande : le chiffre que kylianmalartre.com affiche
-- (« 2,100+ active users ») et lit en direct depuis le 2026-11-15. C'est la requete de reference de
-- docs/mesure.md (jetons redeposes sur quatorze jours, testeurs exclus), arrondie a la centaine
-- inferieure dans la base : aucune ligne, aucune colonne, aucun decoupage par campus, version ou
-- plateforme ne sort, seulement un entier que le site publie deja.
--
-- Une porte de lecture dans `public`, donc appelable en RPC avec la cle publiable : c'est voulu. Sans
-- elle, le site devait lire `jetons_push` avec la cle service_role, qui ne circule pas
-- (docs/backend.md). `security definer` parce que `anon` ne lit pas `jetons_push` ; les deux
-- precautions de fonctions.sql s'appliquent : `search_path` vide et noms qualifies.

create or replace function public.parc_actif_arrondi()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select (floor(count(*) / 100.0) * 100)::integer
      from public.jetons_push
     where maj_le > now() - interval '14 days'
       and not testeur;
$$;

revoke execute on function public.parc_actif_arrondi() from public;
grant execute on function public.parc_actif_arrondi() to anon, authenticated;
