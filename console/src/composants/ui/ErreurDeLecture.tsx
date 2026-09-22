import { CircleAlert, RefreshCw } from 'lucide-react';

import { estHorsLigne, messageDErreur } from '../../lib/erreurs';
import { Bouton } from './Bouton';

/** L'erreur d'une lecture prend la place de ce qu'elle remplace, avec le geste qui relit. */
export function ErreurDeLecture({ erreur, reessayer, enCours }: { readonly erreur: unknown; readonly reessayer: () => void; readonly enCours?: boolean }) {
    const horsLigne = estHorsLigne(erreur);
    return (
        <div className="erreur-lecture" role="alert">
            <CircleAlert className="icone" aria-hidden="true" />
            <strong>{horsLigne ? 'La base ne répond pas.' : 'La lecture a échoué.'}</strong>
            <span className="petit">{horsLigne ? 'Vérifie la connexion, puis réessaie.' : messageDErreur(erreur)}</span>
            <Bouton variante="tonal" compact icone={<RefreshCw className="icone" aria-hidden="true" />} onClick={reessayer} enAttente={enCours}>Réessayer</Bouton>
        </div>
    );
}
