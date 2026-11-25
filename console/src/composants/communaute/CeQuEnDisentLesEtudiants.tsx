/**
 * Ce que les etudiants disent d'un element publie (phase 8, lots 3 et 4) : ses « moi aussi », dont
 * combien d'appareils attestes, les appareils touches quand le vote les porte (un probleme connu), et
 * les details recus, ranges dessous. Le meme panneau pour les problemes connus et la boite a idees.
 */

import { useQuery } from '@tanstack/react-query';

import { formaterDate } from '../../lib/dates';
import { traduire } from '../../lib/erreurs';
import { compterLesVoix } from '../../pages/Problemes/voix';
import { cles } from '../../requetes/client';
import { lienVers } from '../../routeur';
import { ETATS_DE_RETOUR } from '../../schema/tables/retours';
import { supabase, type Ligne } from '../../supabase';
import { ErreurDeLecture } from '../ui/ErreurDeLecture';
import { SqueletteBloc } from '../ui/Squelette';

export interface SujetSuivi {
    readonly sujet: 'probleme.moi_aussi' | 'idee.moi_aussi';
    /** La colonne de `retours` qui range un detail sous l'element. */
    readonly colonne: 'probleme' | 'idee';
    /** Le vote porte-t-il l'appareil touche ? */
    readonly appareils: boolean;
}

async function lire(suivi: SujetSuivi, id: string) {
    const [votes, details] = await Promise.all([
        supabase.from('votes').select('valeur, poids').eq('sujet', suivi.sujet).eq('cible', id),
        supabase.from('retours').select('id, recu_le, texte, etat').eq(suivi.colonne, id).order('recu_le', { ascending: false }).limit(50),
    ]);
    if (votes.error !== null) throw traduire(votes.error);
    if (details.error !== null) throw traduire(details.error);
    return { voix: compterLesVoix(votes.data ?? []), details: (details.data ?? []) as Ligne[] };
}

export function CeQuEnDisentLesEtudiants({ suivi, id }: { readonly suivi: SujetSuivi; readonly id: string }) {
    const requete = useQuery({ queryKey: [...cles.table('votes'), suivi.colonne, id], queryFn: () => lire(suivi, id) });
    if (requete.isError) return <div className="carte"><ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} enCours={requete.isFetching} /></div>;
    if (requete.data === undefined) return <div className="carte"><SqueletteBloc hauteur={180} /></div>;
    const { voix, details } = requete.data;
    return (
        <div className="pile">
            <section className="carte">
                <h2>« Moi aussi »</h2>
                <p className="chiffre-de-probleme"><strong>{voix.total}</strong> <span className="secondaire">dont {voix.attestes} d’appareils attestés</span></p>
                {suivi.appareils && voix.appareils.length > 0 ? (
                    <table className="tableau-compact"><tbody>
                        {voix.appareils.map((a) => <tr key={`${a.plateforme}|${a.appareil}|${a.systeme}|${a.version}`}><td>{a.appareil}</td><td className="secondaire">{a.systeme}, {a.version}</td><td className="nombre">{a.n}</td></tr>)}
                    </tbody></table>
                ) : null}
            </section>
            <section className="carte">
                <h2>Détails</h2>
                {details.length === 0 ? <p className="secondaire">Aucun détail reçu.</p> : (
                    <div className="questions">
                        {details.map((d) => (
                            <a key={String(d.id)} className="question" href={lienVers(`/retours/${String(d.id)}`)}>
                                <span className="intitule">{formaterDate(d.recu_le)}, {ETATS_DE_RETOUR.find((e) => e.valeur === d.etat)?.libelle ?? String(d.etat)}</span>
                                <span className="reponse">{String(d.texte)}</span>
                            </a>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
