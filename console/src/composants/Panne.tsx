/**
 * La page de secours de l'ErrorBoundary : une erreur de rendu ne laisse jamais une page blanche.
 */

import { CircleAlert, RefreshCw } from 'lucide-react';
import type { FallbackProps } from 'react-error-boundary';

import { messageDErreur } from '../lib/erreurs';
import { Bouton } from './ui/Bouton';

export function Panne({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div className="connexion">
            <div className="carte" role="alert" style={{ display: 'grid', gap: 'var(--espace-md)', justifyItems: 'start' }}>
                <CircleAlert className="icone grande" style={{ color: 'var(--danger)' }} aria-hidden="true" />
                <h1>La console s’est arrêtée</h1>
                <p className="secondaire">Une erreur inattendue a interrompu l’affichage. Rien n’a été écrit dans la base par ce geste.</p>
                <code className="petit">{messageDErreur(error)}</code>
                <Bouton variante="plein" onClick={resetErrorBoundary} icone={<RefreshCw className="icone" aria-hidden="true" />}>Réessayer</Bouton>
            </div>
        </div>
    );
}
