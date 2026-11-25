/**
 * Les resultats du sondage d'une annonce enregistree (phase 8, lot 4), sous l'apercu : ce que les voix
 * attestees disent, choix par choix, dans la regle des petites cases ; les voix non attestees a part.
 * L'application, elle, ne montre que des parts (`resultats_sondage`).
 */

import { useQuery } from '@tanstack/react-query';

import type { ChoixDeSondage } from '../../../../src/shared/annonces/sondage';
import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { SqueletteBloc } from '../../composants/ui/Squelette';
import { traduire } from '../../lib/erreurs';
import { cles } from '../../requetes/client';
import { libelleDeCase } from '../../stats/cases';
import { supabase } from '../../supabase';
import { compterLeSondage } from './resultats';

async function lireLesVotes(annonce: string): Promise<unknown[]> {
    const { data, error } = await supabase.from('votes').select('valeur, poids').eq('sujet', 'sondage.choix').eq('cible', annonce).limit(10000);
    if (error !== null) throw traduire(error);
    return data ?? [];
}

export function ResultatsDuSondage({ annonce, choix }: { readonly annonce: string; readonly choix: readonly ChoixDeSondage[] }) {
    const requete = useQuery({ queryKey: [...cles.table('votes'), 'sondage', annonce], queryFn: () => lireLesVotes(annonce) });
    if (requete.isError) return <div className="carte"><ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} enCours={requete.isFetching} /></div>;
    if (requete.data === undefined) return <div className="carte"><SqueletteBloc hauteur={160} /></div>;
    const r = compterLeSondage(requete.data, choix);
    return (
        <section className="carte resultats-du-sondage">
            <h2>Résultats du sondage</h2>
            <p className="chiffre-de-probleme">
                <strong>{r.attestees === null ? libelleDeCase(null) : libelleDeCase(r.attestees)}</strong>{' '}
                <span className="secondaire">voix attestées, et {libelleDeCase(r.nonAttestees)} non attestées, qui ne comptent pas</span>
            </p>
            <table className="tableau-compact"><tbody>
                {r.choix.map((c) => <tr key={c.id}><td>{c.libelle}</td><td className="nombre">{libelleDeCase(c.voix)}</td></tr>)}
            </tbody></table>
        </section>
    );
}
