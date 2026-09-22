/**
 * Ce qui se lit sans se saisir : les colonnes en lecture seule d'une ligne existante, en liste de
 * definitions — un champ desactive ferait croire qu'il manque un droit.
 */

import { formaterDate } from '../../lib/dates';
import type { Champ } from '../../schema/descripteurs';

function texteDe(champ: Champ, valeur: unknown): string {
    if (valeur === null || valeur === undefined || valeur === '') return '—';
    switch (champ.type.type) {
        case 'date': return formaterDate(valeur);
        case 'booleen': return valeur === true ? 'oui' : 'non';
        case 'json': return JSON.stringify(valeur, null, 2);
        case 'choix': return champ.type.options.find((o) => o.valeur === String(valeur))?.libelle ?? String(valeur);
        default: return String(valeur);
    }
}

export function Lecture({ champs, ligne }: { readonly champs: readonly Champ[]; readonly ligne: Record<string, unknown> }) {
    if (champs.length === 0) return null;
    return (
        <dl className="lecture">
            {champs.map((champ) => (
                <div key={champ.nom} style={{ display: 'contents' }}>
                    <dt>{champ.libelle}</dt>
                    <dd className={champ.type.type === 'json' ? 'mono' : undefined}>{texteDe(champ, ligne[champ.nom])}</dd>
                </div>
            ))}
        </dl>
    );
}
