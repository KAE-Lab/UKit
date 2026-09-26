import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EtatVide({ children }: { readonly children: ReactNode }) {
    return (
        <div className="vide">
            <Inbox className="icone" aria-hidden="true" />
            <div>{children}</div>
        </div>
    );
}
