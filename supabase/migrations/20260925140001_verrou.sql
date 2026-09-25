-- Le verrou contre l'ecrasement (jalon 7-H). « Le dernier enregistrement gagne » tenait pour un editeur,
-- pas pour deux qui ouvrent la meme annonce. Les deux tables qu'une equipe ecrit a plusieurs gagnent
-- `maj_le`, tenue par un declencheur : la console enregistre avec `where maj_le = <la valeur lue>`, et
-- une modification qui ne touche aucune ligne se dit — « modifiee entre-temps », avec le choix de
-- recharger. Le plus petit mecanisme qui rend la console sure a plusieurs.
--
-- Invisible pour l'application installee : BdeService et les messages de service nomment leurs colonnes.
-- Les lignes existantes recoivent l'heure de la migration.

alter table public.annonces add column if not exists maj_le timestamptz not null default now();
alter table public.service_messages add column if not exists maj_le timestamptz not null default now();

-- Tenue par la base et non par la console : un script, le Studio ou la fonction `notifier` — qui pose
-- `notifie_le` — changent la ligne aussi, et le verrou doit le voir. `before` : la valeur part avec la
-- ligne, et le journal l'enregistre. `clock_timestamp()` et non `now()` : `now()` est l'heure du debut
-- de la transaction, et deux modifications dans la meme transaction garderaient la meme version.
create or replace function private.tenir_maj_le()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.maj_le := clock_timestamp();
    return new;
end;
$$;

drop trigger if exists maj_le on public.annonces;
create trigger maj_le before update on public.annonces
    for each row execute function private.tenir_maj_le();

drop trigger if exists maj_le on public.service_messages;
create trigger maj_le before update on public.service_messages
    for each row execute function private.tenir_maj_le();
