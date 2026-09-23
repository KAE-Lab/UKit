/**
 * La barre d'enregistrement : collee au bas de la fenetre tant que le formulaire defile — il fallait
 * descendre au bout d'une annonce pour l'enregistrer. Elle dit l'etat de la saisie a sa place
 * reservee, sur deux lignes au plus : non enregistree, enregistree, a corriger, refusee ; le texte
 * entier reste dans l'infobulle. Et elle rappelle le raccourci clavier.
 */

import { CircleAlert, CircleCheck, CircleDot, Info, Save, Undo2, type LucideIcon } from 'lucide-react';

import { Bouton } from '../ui/Bouton';
import type { RetourDeGeste, TonDEncart } from '../ui/Encart';

const ICONES: Readonly<Record<TonDEncart, LucideIcon>> = { ok: CircleCheck, erreur: CircleAlert, avert: CircleDot, info: Info };

export interface BarreProps {
    readonly statut: RetourDeGeste | null;
    readonly enregistrementEnCours: boolean;
    readonly occupe: boolean;
    readonly lectureSeule: boolean;
    /** Le raccourci tel qu'il s'ecrit sur ce poste, ou `null` quand rien ne s'enregistre. */
    readonly raccourci: string | null;
    readonly annuler: () => void;
}

export function BarreDEnregistrement({ statut, enregistrementEnCours, occupe, lectureSeule, raccourci, annuler }: BarreProps) {
    const Icone = statut === null ? null : ICONES[statut.ton];
    return (
        <div className="barre-formulaire">
            <Bouton variante="plein" type="submit" enAttente={enregistrementEnCours} disabled={occupe || lectureSeule} title={raccourci === null ? undefined : `Enregistrer (${raccourci})`} icone={<Save className="icone" aria-hidden="true" />}>Enregistrer</Bouton>
            <Bouton variante="discret" onClick={annuler} disabled={occupe} icone={<Undo2 className="icone" aria-hidden="true" />}>Retour à la liste</Bouton>
            <p className="etat-formulaire" aria-live="polite" title={statut?.texte}>
                {statut !== null && Icone !== null ? (
                    <span className={`statut ${statut.ton}`} role={statut.ton === 'erreur' ? 'alert' : undefined}>
                        <Icone className="icone" aria-hidden="true" />
                        <span className="texte">{statut.texte}</span>
                    </span>
                ) : null}
            </p>
            {raccourci !== null ? <kbd className="raccourci" title="Enregistrer au clavier">{raccourci}</kbd> : null}
        </div>
    );
}
