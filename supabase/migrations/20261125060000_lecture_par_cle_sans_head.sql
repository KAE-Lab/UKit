-- La lecture d'un retour par sa cle refuse aussi le HEAD (phase 8, lot 3 ; docs/phase-8/3-formulaire.md).
--
-- 20261125050000_lecture_par_cle_en_post.sql refusait le GET ; mesure apres son deploiement, un HEAD
-- sur la meme adresse executait encore la fonction (200, corps vide) : rien ne fuit dans la reponse,
-- mais la cle passe dans l'adresse, donc dans le journal d'acces. Meme signature, memes droits.

-- Ce que l'appareil lit de ses retours : pour chaque cle, dans l'ordre, l'etat, la cloture et les
-- reponses, ou `null` pour une cle inconnue. Ni l'identifiant du retour, ni son texte, ni rien qu'une
-- autre cle ouvrirait. En POST seulement : une cle ne s'ecrit jamais dans une adresse ni dans un journal
-- d'acces. PostgREST pose la methode dans `request.method` ; `volatile` ne suffisait pas, il appelle une
-- telle fonction en GET, et en HEAD, dans une transaction en lecture seule (mesure apres le deploiement).
create or replace function public.lire_mes_retours(p_cles text[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_sortie jsonb := '[]'::jsonb;
    v_cle    text;
    v_octets bytea;
    v_ligne  jsonb;
begin
    if current_setting('request.method', true) in ('GET', 'HEAD') then
        raise exception 'lire_mes_retours : en POST seulement' using errcode = '42501';
    end if;
    if p_cles is null or cardinality(p_cles) > 20 then
        raise exception 'lire_mes_retours : vingt cles au plus' using errcode = '22023';
    end if;
    foreach v_cle in array p_cles loop
        v_ligne := null;
        begin
            v_octets := decode(v_cle, 'base64');
        exception when others then
            v_octets := null;
        end;
        if octet_length(v_octets) = 32 then
            select jsonb_build_object(
                       'etat', r.etat,
                       'clos_le', r.clos_le,
                       'reponses', coalesce((select jsonb_agg(jsonb_build_object('texte', x.texte, 'le', x.cree_le) order by x.cree_le, x.id)
                                               from public.retours_reponses x where x.retour = r.id), '[]'::jsonb))
              into v_ligne
              from public.retours r
             where r.cle_reponse = extensions.digest(v_octets, 'sha256');
        end if;
        v_sortie := v_sortie || jsonb_build_array(v_ligne);
    end loop;
    return v_sortie;
end;
$$;
