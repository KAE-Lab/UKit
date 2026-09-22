/**
 * Les outils au-dessus d'une liste : la recherche, les filtres declares par le descripteur, le total.
 * Des `select` natifs, styles : accessibles au clavier sans rien ajouter.
 */

import { Search } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import type { EtatDeTable } from '../../lib/requete';
import { champDe, type Descripteur, type Option } from '../../schema/descripteurs';

const DELAI_DE_SAISIE_MS = 300;

const OUI_NON: readonly Option[] = [{ valeur: 'true', libelle: 'Oui' }, { valeur: 'false', libelle: 'Non' }];

function Recherche({ valeur, onChange, placeholder }: { readonly valeur: string; readonly onChange: (v: string) => void; readonly placeholder: string }) {
    const [texte, setTexte] = useState(valeur);
    useEffect(() => setTexte(valeur), [valeur]);
    useEffect(() => {
        if (texte === valeur) return undefined;
        const minuterie = window.setTimeout(() => onChange(texte), DELAI_DE_SAISIE_MS);
        return () => window.clearTimeout(minuterie);
    }, [texte, valeur, onChange]);
    return (
        <div className="recherche">
            <Search className="icone" aria-hidden="true" />
            <input type="search" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={placeholder} aria-label="Rechercher" />
        </div>
    );
}

export interface FiltresProps {
    readonly descripteur: Descripteur;
    readonly etat: EtatDeTable;
    readonly poser: (etat: EtatDeTable) => void;
    readonly total: number | null;
    /** Des filtres en plus, propres a une page (le campus des retours). */
    readonly complements?: readonly { readonly id: string; readonly libelle: string; readonly options: readonly Option[] }[];
    /** Des options en plus sur un filtre existant : « Ouverts » pour l'etat des retours, une liste de valeurs. */
    readonly optionsEnPlus?: Readonly<Record<string, readonly Option[]>>;
}

export function Filtres({ descripteur, etat, poser, total, complements = [], optionsEnPlus = {} }: FiltresProps) {
    const idBase = useId();
    const filtres = [
        ...(descripteur.filtres ?? []).map((nom) => {
            const champ = champDe(descripteur, nom);
            const options = champ?.type.type === 'choix' ? champ.type.options : OUI_NON;
            return { id: nom, libelle: champ?.libelle ?? nom, options: [...(optionsEnPlus[nom] ?? []), ...options] };
        }),
        ...complements,
    ];
    const valeurDe = (id: string) => {
        const valeur = etat.columnFilters.find((f) => f.id === id)?.value;
        return Array.isArray(valeur) ? `liste:${valeur.join(',')}` : (typeof valeur === 'string' ? valeur : '');
    };
    const changerFiltre = (id: string, valeur: string) => {
        const autres = etat.columnFilters.filter((f) => f.id !== id);
        const suivants = valeur === '' ? autres : [...autres, { id, value: valeur.startsWith('liste:') ? valeur.slice(6).split(',') : valeur }];
        poser({ ...etat, columnFilters: suivants, pagination: { ...etat.pagination, pageIndex: 0 } });
    };
    const chercher = (texte: string) => poser({ ...etat, globalFilter: texte, pagination: { ...etat.pagination, pageIndex: 0 } });
    const colonnesCherchees = (descripteur.recherche ?? []).map((nom) => champDe(descripteur, nom)?.libelle.toLowerCase() ?? nom);

    return (
        <div className="outils-liste">
            {descripteur.recherche !== undefined && descripteur.recherche.length > 0 ? (
                <Recherche valeur={etat.globalFilter} onChange={chercher} placeholder={`Chercher dans ${colonnesCherchees.join(', ')}`} />
            ) : null}
            {filtres.map((filtre, index) => {
                const courante = valeurDe(filtre.id);
                const optionsAffichees = courante.startsWith('liste:') && !filtre.options.some((o) => o.valeur === courante)
                    ? [...filtre.options, { valeur: courante, libelle: 'Plusieurs' }]
                    : filtre.options;
                return (
                    <div className="filtre" key={filtre.id}>
                        <label htmlFor={`${idBase}-${index}`}>{filtre.libelle}</label>
                        <select id={`${idBase}-${index}`} value={courante} onChange={(e) => changerFiltre(filtre.id, e.target.value)}>
                            <option value="">Tous</option>
                            {optionsAffichees.map((option) => <option key={option.valeur} value={option.valeur}>{option.libelle}</option>)}
                        </select>
                    </div>
                );
            })}
            <span className="espace" />
            <span className="total" aria-live="polite">{total === null ? '' : `${total} ligne${total > 1 ? 's' : ''}`}</span>
        </div>
    );
}
