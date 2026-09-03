import type { ButtonHTMLAttributes } from 'react';

export type VarianteDeBouton = 'plein' | 'tonal' | 'destructif' | 'discret';

export interface BoutonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    readonly variante: VarianteDeBouton;
}

/** Le vocabulaire des boutons de l'application : le libelle porte le sens, jamais le fond seul. */
export function Bouton({ variante, className, type, ...reste }: BoutonProps) {
    return <button type={type ?? 'button'} className={`bouton ${variante} ${className ?? ''}`} {...reste} />;
}
