/**
 * Les cases d'une liste fermee (les plateformes) et celles du catalogue (les campus). Une valeur
 * hors liste — posee par psql, ou un code sorti du catalogue — se montre cochee et marquee : la
 * decocher est le geste qui la corrige (defauts 5 et 6 du jalon 7-E).
 */

import type { Option } from '../../../schema/descripteurs';
import type { ChampProps } from './types';

function Coches({ options, coches, inconnues, desactive, onChange }: {
    readonly options: readonly Option[];
    readonly coches: readonly string[];
    readonly inconnues: readonly string[];
    readonly desactive: boolean;
    readonly onChange: (valeurs: readonly string[]) => void;
}) {
    const basculer = (valeur: string) => onChange(coches.includes(valeur) ? coches.filter((c) => c !== valeur) : [...coches, valeur]);
    return (
        <div className="ligne-cases">
            {options.map((option) => (
                <label key={option.valeur} className="case">
                    <input type="checkbox" checked={coches.includes(option.valeur)} disabled={desactive} onChange={() => basculer(option.valeur)} />
                    {option.libelle}
                </label>
            ))}
            {inconnues.map((valeur) => (
                <label key={valeur} className="case inconnue" title="Valeur hors liste : décoche-la pour pouvoir enregistrer.">
                    <input type="checkbox" checked disabled={desactive} onChange={() => basculer(valeur)} />
                    {valeur} (inconnue)
                </label>
            ))}
        </div>
    );
}

export function ChampCases({ champ, saisie, onChange, desactive }: ChampProps) {
    const options = champ.type.type === 'cases' ? champ.type.options : [];
    const coches = Array.isArray(saisie) ? saisie : [];
    const inconnues = coches.filter((valeur) => !options.some((option) => option.valeur === valeur));
    return <Coches options={options} coches={coches} inconnues={inconnues} desactive={desactive} onChange={onChange} />;
}

export function ChampEtablissements({ saisie, onChange, etablissements, codesConnus, desactive }: ChampProps) {
    const coches = Array.isArray(saisie) ? saisie : [];
    if (etablissements.length === 0 && codesConnus === null) {
        return <span className="secondaire">Le catalogue ne répond pas ; le ciblage par campus est indisponible.</span>;
    }
    const options = etablissements.map((e) => ({ valeur: e.code, libelle: `${e.nom} (${e.code})` }));
    const inconnues = coches.filter((code) => !etablissements.some((e) => e.code === code));
    return <Coches options={options} coches={coches} inconnues={inconnues} desactive={desactive} onChange={onChange} />;
}
