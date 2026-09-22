/**
 * Un champ du formulaire, selon son type. Le formulaire ne connait aucun type : il delegue ici.
 */

import { TriangleAlert } from 'lucide-react';
import { useId } from 'react';

import { ChampCases, ChampEtablissements } from './Cases';
import { ChampImage } from './Image';
import type { ChampProps } from './types';

/** Un choix dont la valeur n'est pas dans la liste (posee par psql) se montre, marquee, et se remplace. */
function Choix({ champ, id, saisie, onChange, desactive }: ChampProps) {
    const options = champ.type.type === 'choix' ? champ.type.options : [];
    const valeur = typeof saisie === 'string' ? saisie : '';
    const inconnue = valeur !== '' && !options.some((option) => option.valeur === valeur);
    return (
        <select id={id} value={valeur} disabled={desactive} onChange={(e) => onChange(e.target.value)}>
            {champ.obligatoire === true && !inconnue ? null : <option value="">—</option>}
            {inconnue ? <option value={valeur}>{valeur} (valeur inconnue)</option> : null}
            {options.map((option) => <option key={option.valeur} value={option.valeur}>{option.libelle}</option>)}
        </select>
    );
}

function Saisisseur(props: Omit<ChampProps, 'id'> & { readonly id: string }) {
    const { champ, saisie, onChange, id, desactive } = props;
    const texte = typeof saisie === 'string' ? saisie : '';
    switch (champ.type.type) {
        case 'booleen':
            return <label className="case"><input id={id} type="checkbox" checked={saisie === true} disabled={desactive} onChange={(e) => onChange(e.target.checked)} /> {champ.libelle}</label>;
        case 'zone':
            return <textarea id={id} className={champ.type.code === true ? 'code' : undefined} value={texte} disabled={desactive} onChange={(e) => onChange(e.target.value)} />;
        case 'json':
            return <textarea id={id} className="code" value={texte} disabled={desactive} spellCheck={false} onChange={(e) => onChange(e.target.value)} />;
        case 'choix':
            return <Choix {...props} />;
        case 'date':
            return <input id={id} type="datetime-local" value={texte} disabled={desactive} onChange={(e) => onChange(e.target.value)} />;
        case 'nombre':
            return <input id={id} type="number" step="any" value={texte} disabled={desactive} onChange={(e) => onChange(e.target.value)} />;
        case 'image':
            return <ChampImage {...props} />;
        case 'etablissements':
            return <ChampEtablissements {...props} />;
        case 'cases':
            return <ChampCases {...props} />;
        default:
            return <input id={id} type="text" value={texte} disabled={desactive} spellCheck={champ.type.type === 'texte'} onChange={(e) => onChange(e.target.value)} />;
    }
}

export function ChampEditeur(props: Omit<ChampProps, 'id'> & { readonly erreur?: string }) {
    const id = useId();
    const { champ, erreur } = props;
    const libelleAPart = champ.type.type !== 'booleen';
    return (
        <div className={`champ ${erreur === undefined ? '' : 'en-erreur'}`}>
            {libelleAPart ? <label htmlFor={id}>{champ.libelle}{champ.obligatoire === true ? ' *' : ''}</label> : null}
            <Saisisseur {...props} id={id} enErreur={erreur !== undefined} />
            {champ.aide !== undefined ? <span className="aide">{champ.aide}</span> : null}
            {erreur !== undefined ? <span className="erreur" role="alert"><TriangleAlert className="icone" aria-hidden="true" />{erreur}</span> : null}
        </div>
    );
}
