import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

export type TonDePastille = 'ok' | 'panne' | 'avert' | 'accent' | 'neutre';

export function Pastille({ ton = 'neutre', point, children }: { readonly ton?: TonDePastille; readonly point?: boolean; readonly children: ReactNode }) {
    return (
        <span className={`pastille ${ton === 'neutre' ? '' : ton}`}>
            {point === true ? <span className="point" aria-hidden="true" /> : null}
            {children}
        </span>
    );
}

/** Une valeur que la console ne connait pas — posee hors d'elle — : montree telle quelle, marquee. */
export function ValeurInconnue({ valeur }: { readonly valeur: string }) {
    return (
        <span className="pastille avert" title="Valeur hors de la liste de la console : à corriger dans le formulaire.">
            <TriangleAlert className="icone" aria-hidden="true" />
            {valeur}
        </span>
    );
}
