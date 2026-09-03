import type { ReactNode } from 'react';

export function EtatVide({ children }: { readonly children: ReactNode }) {
    return <div className="vide">{children}</div>;
}
