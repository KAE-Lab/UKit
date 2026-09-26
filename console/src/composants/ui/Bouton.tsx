import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

export type VarianteDeBouton = 'plein' | 'tonal' | 'destructif' | 'discret';

export interface BoutonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    readonly variante: VarianteDeBouton;
    /** Un geste en cours : le bouton garde sa largeur, son libelle s'efface sous un cercle qui tourne. */
    readonly enAttente?: boolean;
    readonly compact?: boolean;
    readonly icone?: ReactNode;
}

/** Le vocabulaire des boutons de l'application : le libelle porte le sens, jamais le fond seul. */
export function Bouton({ variante, className, type, enAttente, compact, icone, children, disabled, ...reste }: BoutonProps) {
    const classes = ['bouton', variante, compact === true ? 'compact' : '', enAttente === true ? 'attente' : '', children === undefined ? 'icone-seule' : '', className ?? ''];
    return (
        <button type={type ?? 'button'} className={classes.join(' ').trim()} disabled={disabled === true || enAttente === true} aria-busy={enAttente === true} {...reste}>
            <span className="contenu-bouton">{icone}{children}</span>
            {enAttente === true ? <span className="rouage" aria-hidden="true"><LoaderCircle className="icone" /></span> : null}
        </button>
    );
}
