-- La mesure (jalon 7-D) : des compteurs anonymes, la seconde ecriture de l'application vers la base
-- apres le jeton push (6.1.x-E). Deux tables — le vocabulaire ferme des evenements, et les compteurs
-- agreges par jour ou par heure, campus, version, plateforme et statut de testeur —, une seule porte
-- d'ecriture, `compter`, et aucune lecture pour `anon`. Aucun identifiant, aucun contenu saisi, aucun
-- horodatage plus fin que l'heure : la base apprend combien, jamais qui (docs/mesure.md, PRIVACY.md
-- point 4 quinquies). Les editeurs lisent les deux tables depuis la console (7-G).
--
-- Pas de declencheur `journal` : le journal trace ce que l'equipe publie, pas ce que le parc compte,
-- et le volume le noierait. La purge a treize mois est ecrite dans supabase/README.md.

create table if not exists public.evenements_connus (
    evenement   text primary key,
    description text
);

create table if not exists public.mesures (
    jour       date        not null,
    -- -1 : le jour entier ; 0 a 23 : l'heure locale de l'appareil, pour les seuls evenements qui la portent.
    heure      smallint    not null default -1 check (heure between -1 and 23),
    evenement  text        not null references public.evenements_connus (evenement),
    cle        text        not null default '' check (char_length(cle) <= 64),
    campus     text        not null default '' check (char_length(campus) <= 32),
    version    text        not null check (version ~ '^\d+\.\d+\.\d+$'),
    plateforme text        not null check (plateforme in ('ios', 'android')),
    -- Auto-declare par l'appareil, comme pour le jeton : de quoi retirer le bruit de l'equipe.
    testeur    boolean     not null default false,
    n          integer     not null default 0 check (n >= 0),
    maj_le     timestamptz not null default now(),
    primary key (jour, heure, evenement, cle, campus, version, plateforme, testeur)
);

-- Le vocabulaire v1 (docs/mesure.md). Un tuple par ligne : src/shared/mesure/migration.test.ts lit
-- les migrations et verifie que chaque evenement de l'application y figure. Un evenement retire du
-- vocabulaire de l'application garde sa ligne tant que des versions installees l'envoient.
insert into public.evenements_connus (evenement, description) values
    ('session',               'une ouverture, ou un vrai retour au premier plan'),
    ('onglet.vu',             'l onglet affiche : planning, campus, scolarite, reglages'),
    ('annonce.impression',    'la carte d une annonce visible a moitie pendant une seconde, une fois par session'),
    ('annonce.ouverture',     'la fiche d une annonce ouverte'),
    ('annonce.action',        'le bouton d action d une annonce touche'),
    ('resto.ouverture',       'la fiche d un restaurant ouverte, par code Croustillant'),
    ('bu.ouverture',          'la fiche d une bibliotheque ouverte, par identifiant Affluences'),
    ('salles.ouverture',      'la fiche des salles libres d un batiment ouverte, par code'),
    ('planning.jour',         'la vue jour du Planning affichee'),
    ('planning.semaine',      'la vue semaine du Planning affichee'),
    ('scolarite.connexion',   'une connexion universitaire aboutie (ok) ou refusee (echec)'),
    ('source.echec',          'une source qui n a pas repondu, par hote et famille d echec'),
    ('reglage.theme',         'le theme, compte une fois par session : light, dark'),
    ('reglage.langue',        'la langue, une fois par session : fr, en, es'),
    ('reglage.synchro',       'la synchronisation du calendrier, une fois par session : on, off'),
    ('reglage.notifications', 'les deux interrupteurs de notification, une fois par session : rappels:on|off, messages:on|off')
on conflict (evenement) do update set description = excluded.description;

-- La porte d'ecriture. `security definer` pour que `anon` n'ait aucun privilege sur les tables ; un
-- `search_path` vide et des noms qualifies, comme les autres fonctions (fonctions.sql).
--
-- Le lot entier est refuse s'il n'est pas un tableau ou s'il depasse 200 elements. Chaque element est
-- ensuite juge seul, dans son propre sous-bloc : un element qui ne passe pas — evenement inconnu, `n`
-- hors de [1, 1000], jour hors de [aujourd'hui - 14, demain], cle ou campus trop longs, forme fausse —
-- est ignore et compte dans `rejetes`, et le lot continue. Ignorer plutot que rejeter : un vieux client
-- qui porterait un evenement retire du vocabulaire doit pouvoir vider sa file, sinon il la renverrait
-- pour toujours.
--
-- `demain` et non `aujourd'hui` comme borne haute : le jour est celui de l'appareil, en heure locale,
-- et la base est en UTC — minuit passe a Paris, la base est encore la veille.
create or replace function public.compter(p_lots jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    element      jsonb;
    comptes      integer := 0;
    rejetes      integer := 0;
    v_jour       date;
    v_heure      smallint;
    v_evenement  text;
    v_cle        text;
    v_campus     text;
    v_version    text;
    v_plateforme text;
    v_testeur    boolean;
    v_n          integer;
begin
    if p_lots is null or jsonb_typeof(p_lots) <> 'array' then
        raise exception 'compter : un tableau est attendu' using errcode = '22023';
    end if;
    if jsonb_array_length(p_lots) > 200 then
        raise exception 'compter : 200 elements au plus par lot' using errcode = '22023';
    end if;

    for element in select value from jsonb_array_elements(p_lots) loop
        begin
            if jsonb_typeof(element) <> 'object' then
                raise exception 'un objet est attendu';
            end if;
            v_jour       := (element ->> 'jour')::date;
            v_heure      := coalesce((element ->> 'heure')::smallint, -1);
            v_evenement  := element ->> 'evenement';
            v_cle        := coalesce(element ->> 'cle', '');
            v_campus     := coalesce(element ->> 'campus', '');
            v_version    := element ->> 'version';
            v_plateforme := element ->> 'plateforme';
            v_testeur    := coalesce((element ->> 'testeur')::boolean, false);
            v_n          := (element ->> 'n')::integer;

            if v_n is null or v_n < 1 or v_n > 1000 then
                raise exception 'n hors de [1, 1000]';
            end if;
            if v_jour is null or v_jour < current_date - 14 or v_jour > current_date + 1 then
                raise exception 'jour hors fenetre';
            end if;
            if v_heure < -1 or v_heure > 23 then
                raise exception 'heure hors de [-1, 23]';
            end if;
            if not exists (select 1 from public.evenements_connus where evenement = v_evenement) then
                raise exception 'evenement inconnu';
            end if;
            if char_length(v_cle) > 64 or char_length(v_campus) > 32 then
                raise exception 'cle ou campus trop long';
            end if;
            if v_version is null or v_version !~ '^\d+\.\d+\.\d+$' then
                raise exception 'version illisible';
            end if;
            if v_plateforme is null or v_plateforme not in ('ios', 'android') then
                raise exception 'plateforme inconnue';
            end if;

            insert into public.mesures (jour, heure, evenement, cle, campus, version, plateforme, testeur, n)
            values (v_jour, v_heure, v_evenement, v_cle, v_campus, v_version, v_plateforme, v_testeur, v_n)
            on conflict (jour, heure, evenement, cle, campus, version, plateforme, testeur)
            do update set n = public.mesures.n + excluded.n, maj_le = now();
            comptes := comptes + 1;
        exception when others then
            rejetes := rejetes + 1;
        end;
    end loop;

    return jsonb_build_object('comptes', comptes, 'rejetes', rejetes);
end;
$$;

revoke execute on function public.compter(jsonb) from public;
grant execute on function public.compter(jsonb) to anon, authenticated;

-- Aucun privilege pour `anon` : ni lecture — les compteurs ne se lisent pas depuis l'application, et
-- une lecture refusee dit la verite la ou une liste vide ferait croire a une table vide —, ni
-- ecriture — la fonction est la seule porte. `authenticated` garde la lecture pour la console et perd
-- l'ecriture. `revoke` d'abord, parce qu'une table nouvelle nait avec tous les privileges accordes aux
-- trois roles (policies.sql).
alter table public.evenements_connus enable row level security;
alter table public.mesures           enable row level security;

revoke all on public.evenements_connus, public.mesures from anon;
revoke insert, update, delete on public.evenements_connus, public.mesures from authenticated;

drop policy if exists "evenements connus lisibles par les editeurs" on public.evenements_connus;
create policy "evenements connus lisibles par les editeurs"
    on public.evenements_connus for select
    to authenticated
    using (private.est_editeur());

drop policy if exists "mesures lisibles par les editeurs" on public.mesures;
create policy "mesures lisibles par les editeurs"
    on public.mesures for select
    to authenticated
    using (private.est_editeur());
