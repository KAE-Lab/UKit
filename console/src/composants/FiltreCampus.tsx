/**
 * Le filtre global par campus, dans la barre : retenu d'une page a l'autre, il filtre toute
 * ressource qui porte un ciblage d'etablissement ou un code de campus (docs/phase-7/7-e-console-socle.md).
 */

import { Funnel } from 'lucide-react';
import { useContext, useId } from 'react';

import { useEtablissements } from '../requetes/useEtablissements';
import { CampusContexte } from './campus';

export function FiltreCampus() {
    const { code, choisir } = useContext(CampusContexte);
    const { etablissements } = useEtablissements();
    const id = useId();
    return (
        <div className="filtre-campus">
            <Funnel className="icone" aria-hidden="true" />
            <label htmlFor={id} className="visuellement-cache">Filtrer par campus</label>
            <select id={id} value={code ?? ''} onChange={(e) => choisir(e.target.value === '' ? null : e.target.value)} title="Filtre par campus, retenu d’une page à l’autre">
                <option value="">Tous les campus</option>
                {etablissements.map((e) => <option key={e.code} value={e.code}>{e.nom}</option>)}
                {code !== null && !etablissements.some((e) => e.code === code) ? <option value={code}>{code}</option> : null}
            </select>
        </div>
    );
}
