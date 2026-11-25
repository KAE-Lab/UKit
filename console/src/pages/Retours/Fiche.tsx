/**
 * La fiche d'un retour : les reponses question par question, lisibles, a la place du JSON brut ;
 * l'adresse laissee, pour un admin et au clic (7-H) ; le reste de la ligne en lecture ; et le
 * formulaire reduit a ce que la base laisse ecrire — nature, etat, note, par un admin. Un retour de
 * l'application (phase 8, lot 3) montre son texte, le contexte joint, ses captures et ses reponses.
 */

import { Formulaire } from '../../composants/formulaire/Formulaire';
import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { EtatVide } from '../../composants/ui/EtatVide';
import { SqueletteBloc } from '../../composants/ui/Squelette';
import { useLigne } from '../../requetes/useListe';
import { RETOURS } from '../../schema/tables/retours';
import { ContactDuRetour } from './Contact';
import { CapturesDuRetour, ContexteJoint, ProblemeDuRetour, ReponsesDuRetour } from './Natif';

const HORS_DES_QUESTIONS = new Set(['Timestamp']);
const MASQUES = ['reponses', 'texte', 'id', 'contexte'];

/** Ce qu'un etudiant a ecrit dans l'application : son texte, ou la demande de campus et le volontariat. */
function CeQuiAEteEcrit({ retour }: { readonly retour: Record<string, unknown> }) {
    const rangees = [
        typeof retour.campus === 'string' ? { intitule: 'Campus demandé', valeur: retour.campus } : null,
        typeof retour.texte === 'string' && retour.texte !== '' ? { intitule: retour.nature === 'campus' ? 'Ce qui manque' : 'Texte', valeur: retour.texte } : null,
        retour.volontaire === true ? { intitule: 'Volontaire', valeur: 'prêt·e à prêter un accès' } : null,
        retour.atteste === false ? { intitule: 'Appareil', valeur: 'non attesté : à lire avec prudence' } : null,
    ].filter((r): r is { intitule: string; valeur: string } => r !== null);
    return (
        <div className="questions">
            {rangees.map((r) => <div key={r.intitule} className="question"><span className="intitule">{r.intitule}</span><span className="reponse">{r.valeur}</span></div>)}
        </div>
    );
}

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
    const ligne = requete.data;
    const natif = ligne.source === 'app';
    return (
        <>
            <div className="carte">
                <h2>Ce qui a été dit</h2>
                {natif ? <CeQuiAEteEcrit retour={ligne} /> : <QuestionsReponses reponses={ligne.reponses} />}
                {natif ? <ProblemeDuRetour probleme={ligne.probleme} /> : null}
                {!natif || ligne.volontaire === true ? <ContactDuRetour id={id} /> : null}
            </div>
            {natif ? <ContexteJoint contexte={ligne.contexte} /> : null}
            {natif ? <CapturesDuRetour id={id} annoncees={typeof ligne.captures === 'number' ? ligne.captures : 0} purgeesLe={ligne.captures_purgees_le ?? null} /> : null}
            {natif ? <ReponsesDuRetour id={id} reponsePossible={ligne.reponse_possible === true} /> : null}
            <Formulaire key={id} descripteur={RETOURS} existante={requete.data} masquer={MASQUES} onEnregistre={() => undefined} onSupprime={retour} onAnnule={retour} />
        </>
    );
}
