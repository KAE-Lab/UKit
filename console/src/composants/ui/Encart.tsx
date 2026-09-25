import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

import type { Secret } from '../../schema/descripteurs';

export type TonDEncart = 'ok' | 'erreur' | 'avert' | 'info';

const ICONES = { ok: CircleCheck, erreur: CircleAlert, avert: TriangleAlert, info: Info } as const;

/** Un encart de retour ou d'avertissement, en ligne : jamais un toast qui disparait avant d'etre lu. */
export function Encart({ ton, children }: { readonly ton: TonDEncart; readonly children: ReactNode }) {
    const Icone = ICONES[ton];
    return (
        <div className={`encart ${ton}`} role={ton === 'erreur' ? 'alert' : 'status'}>
            <Icone className="icone" aria-hidden="true" />
            <div>{children}</div>
        </div>
    );
}

export interface RetourDeGeste {
    readonly ton: TonDEncart;
    readonly texte: string;
    /**
     * Le secret que le geste rend, a montrer une seule fois (7-H) : il voyage avec la phrase quand le
     * geste change l'adresse — une invitation ouvre la ligne neuve —, et ne s'affiche jamais dans l'encart.
     */
    readonly secret?: Secret;
}

/**
 * La place reservee d'un encart : sous l'en-tete, toujours la, meme vide — un retour ou une erreur
 * y prend sa place sans rien pousser (regle transverse du jalon 7-E).
 */
export function PlaceDEncart({ retour, children }: { readonly retour?: RetourDeGeste | null; readonly children?: ReactNode }) {
    return (
        <div className="place-encart" aria-live="polite">
            {retour !== null && retour !== undefined ? <Encart ton={retour.ton}>{retour.texte}</Encart> : children}
        </div>
    );
}
