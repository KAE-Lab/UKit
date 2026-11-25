/**
 * Ce qu'un retour de l'application porte de plus qu'une reponse du formulaire (phase 8, lot 3) : le
 * contexte joint, les captures — lues par un admin seul, par une URL signee de dix minutes —, le
 * probleme connu auquel il se range, et les reponses, qu'un admin ecrit et que l'etudiant lit dans
 * « Mes retours » s'il l'a accepte.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageOff, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { estAdmin } from '../../auth/droits';
import { useDroits } from '../../auth/session';
import { Bouton } from '../../composants/ui/Bouton';
import { useConfirmation } from '../../composants/ui/Confirmation';
import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { SqueletteBloc } from '../../composants/ui/Squelette';
import { formaterDate } from '../../lib/dates';
import { messageDErreur, traduire } from '../../lib/erreurs';
import { cles } from '../../requetes/client';
import { lienVers } from '../../routeur';
import { supabase } from '../../supabase';
import { lireReponses, rangeesDuContexte, reponseValide } from './natif';

const ESPACE = 'retours';
const DUREE_DE_LIEN_S = 600;

export function ContexteJoint({ contexte }: { readonly contexte: unknown }) {
    const rangees = rangeesDuContexte(contexte);
    return (
        <div className="carte">
            <h2>Joint au message</h2>
            {rangees.length === 0 ? <p className="secondaire">L’étudiant a tout retiré.</p> : (
                <div className="questions">
                    {rangees.map((r) => <div key={r.intitule} className="question"><span className="intitule">{r.intitule}</span><span className="reponse">{r.valeur}</span></div>)}
                </div>
            )}
        </div>
    );
}

async function lireLesCaptures(id: string): Promise<{ readonly nom: string; readonly url: string }[]> {
    const espace = supabase.storage.from(ESPACE);
    const { data, error } = await espace.list(id);
    if (error !== null) throw error;
    const chemins = (data ?? []).map((f) => `${id}/${f.name}`);
    if (chemins.length === 0) return [];
    const { data: urls, error: erreur } = await espace.createSignedUrls(chemins, DUREE_DE_LIEN_S);
    if (erreur !== null) throw erreur;
    return (urls ?? []).flatMap((u) => (typeof u.signedUrl === 'string' && u.signedUrl !== '' ? [{ nom: u.path ?? '', url: u.signedUrl }] : []));
}

export function CapturesDuRetour({ id, annoncees, purgeesLe }: { readonly id: string; readonly annoncees: number; readonly purgeesLe: unknown }) {
    const droits = useDroits();
    const admin = droits !== undefined && estAdmin(droits);
    const requete = useQuery({ queryKey: ['captures', id], queryFn: () => lireLesCaptures(id), enabled: admin && annoncees > 0 && purgeesLe === null });
    if (annoncees === 0) return null;
    return (
        <div className="carte">
            <h2>Captures</h2>
            {!admin ? <p className="secondaire petit">Les captures ne se lisent que par un admin.</p>
                : purgeesLe !== null ? <p className="secondaire">Effacées le {formaterDate(purgeesLe)}.</p>
                : requete.isError ? <ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} enCours={requete.isFetching} />
                : requete.data === undefined ? <SqueletteBloc hauteur={160} />
                : requete.data.length === 0 ? <p className="secondaire"><ImageOff className="icone" aria-hidden="true" /> {annoncees} annoncée{annoncees > 1 ? 's' : ''}, aucune arrivée.</p>
                : (
                    <div className="vignettes">
                        {requete.data.map((c) => <a key={c.nom} href={c.url} target="_blank" rel="noreferrer"><img src={c.url} alt={`Capture ${c.nom}`} /></a>)}
                    </div>
                )}
        </div>
    );
}

export function ProblemeDuRetour({ probleme }: { readonly probleme: unknown }) {
    if (typeof probleme !== 'string') return null;
    return <p className="secondaire petit">Détail rangé sous un <a href={lienVers(`/problemes/${probleme}`)}>problème connu</a>.</p>;
}

async function lireLesReponses(id: string) {
    const { data, error } = await supabase.from('retours_reponses').select('id, texte, cree_le').eq('retour', id);
    if (error !== null) throw traduire(error);
    return lireReponses(data);
}

export function ReponsesDuRetour({ id, reponsePossible }: { readonly id: string; readonly reponsePossible: boolean }) {
    const droits = useDroits();
    const admin = droits !== undefined && estAdmin(droits);
    const client = useQueryClient();
    const { demander, dialogue } = useConfirmation();
    const [texte, setTexte] = useState('');
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const requete = useQuery({ queryKey: [...cles.table('retours_reponses'), id], queryFn: () => lireLesReponses(id) });

    const relire = () => Promise.all([client.invalidateQueries({ queryKey: cles.table('retours_reponses') }), client.invalidateQueries({ queryKey: cles.table('journal') })]);
    const repondre = async () => {
        setEnvoi(true);
        setErreur(null);
        const { error } = await supabase.from('retours_reponses').insert({ retour: id, texte: texte.trim() });
        setEnvoi(false);
        if (error !== null) {
            setErreur(messageDErreur(traduire(error)));
            return;
        }
        setTexte('');
        await relire();
    };
    const retirer = async (reponse: string) => {
        if (!(await demander({ titre: 'Retirer cette réponse ?', texte: 'Elle disparaît de « Mes retours » à la prochaine lecture de l’appareil ; une notification déjà reçue ne se reprend pas.', confirmer: 'Retirer', destructif: true }))) return;
        const { error } = await supabase.from('retours_reponses').delete().eq('id', reponse);
        if (error !== null) setErreur(messageDErreur(traduire(error)));
        await relire();
    };

    return (
        <div className="carte">
            <h2>Réponses</h2>
            {!reponsePossible ? <p className="secondaire">L’étudiant n’a pas demandé de réponse dans l’application.</p> : null}
            {requete.isError ? <ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} enCours={requete.isFetching} /> : null}
            {(requete.data ?? []).length > 0 ? (
                <div className="questions">
                    {(requete.data ?? []).map((r) => (
                        <div key={r.id} className="question reponse-d-equipe">
                            <span className="intitule">{formaterDate(r.creeLe)}</span>
                            <span className="reponse">{r.texte}</span>
                            {admin ? <Bouton variante="discret" compact icone={<Trash2 className="icone" aria-hidden="true" />} onClick={() => { void retirer(r.id); }} aria-label="Retirer cette réponse" /> : null}
                        </div>
                    ))}
                </div>
            ) : null}
            {reponsePossible && admin ? (
                <div className="champ">
                    <label htmlFor="reponse">Répondre</label>
                    <textarea id="reponse" value={texte} maxLength={2000} onChange={(e) => setTexte(e.target.value)} placeholder="Ce que l’étudiant lira dans « Mes retours »." />
                    {erreur !== null ? <span className="erreur">{erreur}</span> : null}
                    <div className="boutons fin">
                        <Bouton variante="plein" enAttente={envoi} disabled={!reponseValide(texte) || envoi} onClick={() => { void repondre(); }} icone={<Send className="icone" aria-hidden="true" />}>Envoyer la réponse</Bouton>
                    </div>
                </div>
            ) : null}
            {reponsePossible && droits !== undefined && !admin ? <p className="secondaire petit">Répondre est un geste d’admin.</p> : null}
            {dialogue}
        </div>
    );
}
