/**
 * La fiche d'un retour : les reponses question par question, lisibles, a la place du JSON brut ;
 * le reste de la ligne en lecture ; et le formulaire reduit a ce que la base laisse ecrire —
 * nature, etat, note.
 */

import { Formulaire } from '../../composants/formulaire/Formulaire';
import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { EtatVide } from '../../composants/ui/EtatVide';
import { SqueletteBloc } from '../../composants/ui/Squelette';
import { useLigne } from '../../requetes/useListe';
import { RETOURS } from '../../schema/tables/retours';

const HORS_DES_QUESTIONS = new Set(['Timestamp']);
const MASQUES = ['reponses', 'texte', 'id'];

export function QuestionsReponses({ reponses }: { readonly reponses: unknown }) {
    if (reponses === null || typeof reponses !== 'object') return <span className="secondaire">Aucune réponse lisible.</span>;
    const entrees = Object.entries(reponses as Record<string, unknown>)
        .filter(([question, reponse]) => !HORS_DES_QUESTIONS.has(question) && typeof reponse === 'string' && reponse.trim() !== '');
    if (entrees.length === 0) return <span className="secondaire">Aucune réponse remplie.</span>;
    return (
        <div className="questions">
            {entrees.map(([question, reponse]) => (
                <div key={question} className="question">
                    <span className="intitule">{question}</span>
                    <span className="reponse">{String(reponse)}</span>
                </div>
            ))}
        </div>
    );
}

export function FicheDeRetour({ id, retour }: { readonly id: string; readonly retour: () => void }) {
    const requete = useLigne(RETOURS, { id });
    if (requete.isError) return <div className="carte"><ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} enCours={requete.isFetching} /></div>;
    if (requete.data === undefined) return <div className="carte"><SqueletteBloc hauteur={220} /></div>;
    if (requete.data === null) return <div className="carte"><EtatVide>Ce retour n’existe pas, ou plus.</EtatVide></div>;
    return (
        <>
            <div className="carte">
                <h2>Ce qui a été dit</h2>
                <QuestionsReponses reponses={requete.data.reponses} />
            </div>
            <Formulaire key={id} descripteur={RETOURS} existante={requete.data} masquer={MASQUES} onEnregistre={() => undefined} onSupprime={retour} onAnnule={retour} />
        </>
    );
}
