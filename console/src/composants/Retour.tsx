import type { ReactNode } from 'react';

export type TonDeRetour = 'ok' | 'erreur' | 'avert' | 'info';

/** Un encart de retour ou d'avertissement, en ligne : jamais un toast qui disparait avant d'etre lu. */
export function Retour({ ton, children }: { readonly ton: TonDeRetour; readonly children: ReactNode }) {
    return <div className={`encart ${ton}`} role={ton === 'erreur' ? 'alert' : 'status'}>{children}</div>;
}
