/**
 * Un champ du formulaire, selon son type. Le formulaire ne connait aucun type : il delegue ici.
 */

import { TriangleAlert } from 'lucide-react';
import { useId, type ComponentType } from 'react';

import { ChampCases, ChampEtablissements } from './Cases';
import { ChampCreneaux } from './Creneaux';
import { ChampDescription } from './Description';
import { ChampFocale } from './Focale';
import { ChampGalerie } from './Galerie';
import { ChampImage } from './Image';
import { ChampLieu } from './Lieu';
import { ChampPartenaire } from './Partenaire';
import { ChampTeinte } from './Teinte';
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

/** Les widgets qui portent leur propre composant : ceux des annonces (7-F), l'image, les cases. */
const WIDGETS: Readonly<Partial<Record<ChampProps['champ']['type']['type'], ComponentType<ChampProps>>>> = {
    description: ChampDescription,
    image: ChampImage,
    focale: ChampFocale,
    galerie: ChampGalerie,
    creneaux: ChampCreneaux,
    partenaire: ChampPartenaire,
    teinte: ChampTeinte,
    lieu: ChampLieu,
    etablissements: ChampEtablissements,
    cases: ChampCases,
};

function Saisisseur(props: Omit<ChampProps, 'id'> & { readonly id: string }) {
    const { champ, saisie, onChange, id, desactive } = props;
    const texte = typeof saisie === 'string' ? saisie : '';
    const Widget = WIDGETS[champ.type.type];
    if (Widget !== undefined) return <Widget {...props} />;
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
        default:
            return <input id={id} type="text" value={texte} disabled={desactive} spellCheck={champ.type.type === 'texte'} onChange={(e) => onChange(e.target.value)} />;
    }
}

export function ChampEditeur(props: Omit<ChampProps, 'id'> & { readonly erreur?: string }) {
    const id = useId();
    const { champ, erreur } = props;
    const libelleAPart = champ.type.type !== 'booleen';
    return (
        // `data-champ` : le formulaire sait quel champ a le focus, et l'apercu montre ce qu'on edite.
        <div className={`champ ${erreur === undefined ? '' : 'en-erreur'}`} data-champ={champ.nom}>
            {libelleAPart ? <label htmlFor={id}>{champ.libelle}{champ.obligatoire === true ? ' *' : ''}</label> : null}
            <Saisisseur {...props} id={id} enErreur={erreur !== undefined} />
            {champ.aide !== undefined ? <span className="aide" id={`${id}-aide`}>{champ.aide}</span> : null}
            {erreur !== undefined ? <span className="erreur" role="alert"><TriangleAlert className="icone" aria-hidden="true" />{erreur}</span> : null}
        </div>
    );
}
