import type { LucideIcon } from 'lucide-react';

/** Une icone lucide au gabarit de la console : 16 px, calee sur la ligne, decorative par defaut. */
export function Icone({ de: De, grande, titre }: { readonly de: LucideIcon; readonly grande?: boolean; readonly titre?: string }) {
    return <De className={grande === true ? 'icone grande' : 'icone'} aria-hidden={titre === undefined} aria-label={titre} />;
}
