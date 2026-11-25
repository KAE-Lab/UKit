/**
 * Les resultats du sondage d'une annonce enregistree (phase 8, lot 4), sous l'apercu : ce que les voix
 * attestees disent, choix par choix, dans la regle des petites cases ; les voix non attestees a part.
 * Le sondage se relit de la base, pas de la saisie : un choix retire sans enregistrer garde ses voix a
 * l'ecran, comme dans l'application. L'application, elle, ne montre que des parts (`resultats_sondage`).
 */

import { useQuery } from '@tanstack/react-query';

import { lireSondage, type ChoixDeSondage } from '../../../../src/shared/annonces/sondage';
import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { SqueletteBloc } from '../../composants/ui/Squelette';
import { traduire } from '../../lib/erreurs';
import { cles } from '../../requetes/client';
import { libelleDeCase } from '../../stats/cases';
import { supabase } from '../../supabase';
import { compterLeSondage } from './resultats';

async function lireLeSondage(annonce: string): Promise<{ readonly choix: readonly ChoixDeSondage[]; readonly votes: unknown[] } | null> {
    const [ligne, votes] = await Promise.all([
        supabase.from('annonces').select('sondage').eq('id', annonce).maybeSingle(),
        supabase.from('votes').select('valeur, poids').eq('sujet', 'sondage.choix').eq('cible', annonce).limit(10000),
    ]);
    if (ligne.error !== null) throw traduire(ligne.error);
    if (votes.error !== null) throw traduire(votes.error);
    const sondage = lireSondage((ligne.data as { sondage?: unknown } | null)?.sondage);
    return sondage === null ? null : { choix: sondage.choix, votes: votes.data ?? [] };
}

export function ResultatsDuSondage({ annonce }: { readonly annonce: string }) {
    const requete = useQuery({ queryKey: [...cles.table('votes'), 'sondage', annonce], queryFn: () => lireLeSondage(annonce) });
    if (requete.isError) return <div className="carte"><ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} enCours={requete.isFetching} /></div>;
    if (requete.data === undefined) return <div className="carte"><SqueletteBloc hauteur={160} /></div>;
    // Une annonce enregistree sans sondage : rien a montrer.
    if (requete.data === null) return null;
    const r = compterLeSondage(requete.data.votes, requete.data.choix);
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
