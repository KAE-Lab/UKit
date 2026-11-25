/**
 * La page Problemes connus (phase 8, lot 3 ; docs/phase-8/3-formulaire.md) : la liste et le formulaire
 * generiques — publier, reformuler, corriger, clore —, et, a cote d'une ligne, ce qu'en disent les
 * etudiants : les « moi aussi », les appareils touches, et les details recus, rangés dessous.
 */

import { useQuery } from '@tanstack/react-query';

import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { SqueletteBloc } from '../../composants/ui/Squelette';
import { formaterDate } from '../../lib/dates';
import { traduire } from '../../lib/erreurs';
import { cles } from '../../requetes/client';
import { lienVers } from '../../routeur';
import { PROBLEMES } from '../../schema/tables/problemes';
import { ETATS_DE_RETOUR } from '../../schema/tables/retours';
import { supabase, type Ligne } from '../../supabase';
import { NOUVEAU, Ressource } from '../Ressource';
import { compterLesVoix } from './voix';

async function lireCeQuEnDisentLesEtudiants(id: string) {
    const [votes, details] = await Promise.all([
        supabase.from('votes').select('valeur, poids').eq('sujet', 'probleme.moi_aussi').eq('cible', id),
        supabase.from('retours').select('id, recu_le, texte, etat').eq('probleme', id).order('recu_le', { ascending: false }).limit(50),
    ]);
    if (votes.error !== null) throw traduire(votes.error);
    if (details.error !== null) throw traduire(details.error);
    return { voix: compterLesVoix(votes.data ?? []), details: (details.data ?? []) as Ligne[] };
}

function CeQuEnDisentLesEtudiants({ id }: { readonly id: string }) {
    const requete = useQuery({ queryKey: [...cles.table('votes'), 'probleme', id], queryFn: () => lireCeQuEnDisentLesEtudiants(id) });
    if (requete.isError) return <div className="carte"><ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} enCours={requete.isFetching} /></div>;
    if (requete.data === undefined) return <div className="carte"><SqueletteBloc hauteur={180} /></div>;
    const { voix, details } = requete.data;
    return (
        <div className="pile">
            <section className="carte">
                <h2>« Moi aussi »</h2>
                <p className="chiffre-de-probleme"><strong>{voix.total}</strong> <span className="secondaire">dont {voix.attestes} d’appareils attestés</span></p>
                {voix.appareils.length > 0 ? (
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

export function Problemes({ reste }: { readonly reste: string | null }) {
    return (
        <Ressource
            descripteur={PROBLEMES}
            reste={reste}
            // Une ligne neuve n'a encore ni « moi aussi » ni details : le formulaire seul, sur toute la largeur.
            apercu={reste === NOUVEAU ? undefined : (valeurs) => (typeof valeurs.id === 'string' ? <CeQuEnDisentLesEtudiants id={valeurs.id} /> : null)}
        />
    );
}
