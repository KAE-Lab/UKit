/**
 * Un bouton sans peau, pour ce qui se manipule sans en avoir l'air : l'en-tete d'une colonne qui
 * trie, un compteur qui pose un filtre, le repere d'une focale. La peau vient de la classe de celui
 * qui l'emploie ; ici, la remise a zero et le type `button`.
 */

import type { ComponentProps } from 'react';

export function BoutonNu({ className, type, ...reste }: ComponentProps<'button'>) {
    return <button type={type ?? 'button'} className={`bouton-nu${className === undefined ? '' : ` ${className}`}`} {...reste} />;
}
