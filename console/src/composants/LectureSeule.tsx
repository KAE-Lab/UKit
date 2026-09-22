import { Lock } from 'lucide-react';

import { useDroits } from '../auth/session';

/** En tete de chaque page qui ecrit : un compte sans droits le sait avant d'essayer (defaut 3 du jalon 7-E). */
export function LectureSeule() {
    if (useDroits() !== false) return null;
    return (
        <div className="encart avert" role="status" style={{ marginBottom: 'var(--espace-md)' }}>
            <Lock className="icone" aria-hidden="true" />
            <div><strong>Lecture seule : ce compte n’est pas éditeur.</strong> Il lit ce que la console montre ; chaque écriture lui serait refusée. Les droits se donnent depuis le poste du publieur (<code>npm run console:editeur</code>).</div>
        </div>
    );
}
