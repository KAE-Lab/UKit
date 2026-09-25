/**
 * Les cases d'une liste fermee (les plateformes) et celles du catalogue (les campus). Une valeur
 * hors liste — posee par psql, ou un code sorti du catalogue — se montre cochee et marquee : la
 * decocher est le geste qui la corrige (defauts 5 et 6 du jalon 7-E). Pour un redacteur borne (7-H),
 * les campus qui ne sont pas les siens se voient, grises : il sait qu'ils existent, et qu'ils ne sont
 * pas a lui.
 */

import type { Option } from '../../../schema/descripteurs';
import type { ChampProps } from './types';

function Coches({ options, coches, inconnues, desactive, horsBorne, onChange }: {
    readonly options: readonly Option[];
    readonly coches: readonly string[];
    readonly inconnues: readonly string[];
    readonly desactive: boolean;
    /** Les valeurs qui se voient sans se cocher : les campus qui ne sont pas ceux d'un redacteur borne. */
    readonly horsBorne?: (valeur: string) => boolean;
    readonly onChange: (valeurs: readonly string[]) => void;
}) {
    const basculer = (valeur: string) => onChange(coches.includes(valeur) ? coches.filter((c) => c !== valeur) : [...coches, valeur]);
    return (
        <div className="ligne-cases">
            {options.map((option) => {
                // Une case hors borne deja cochee reste decochable : c'est le geste qui corrige la cible.
                const bornee = horsBorne?.(option.valeur) === true && !coches.includes(option.valeur);
                return (
                    <label key={option.valeur} className={`case ${bornee ? 'hors-borne' : ''}`} title={bornee ? 'Pas un de tes campus.' : undefined}>
                        <input type="checkbox" checked={coches.includes(option.valeur)} disabled={desactive || bornee} onChange={() => basculer(option.valeur)} />
                        {option.libelle}
                    </label>
                );
            })}
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

export function ChampEtablissements({ saisie, onChange, etablissements, codesConnus, borne, desactive }: ChampProps) {
    const coches = Array.isArray(saisie) ? saisie : [];
    if (etablissements.length === 0 && codesConnus === null) {
        return <span className="secondaire">Le catalogue ne répond pas ; le ciblage par campus est indisponible.</span>;
    }
    const options = etablissements.map((e) => ({ valeur: e.code, libelle: `${e.nom} (${e.code})` }));
    const inconnues = coches.filter((code) => !etablissements.some((e) => e.code === code));
    const horsBorne = borne === null || borne === undefined ? undefined : (code: string) => !borne.includes(code);
    return <Coches options={options} coches={coches} inconnues={inconnues} desactive={desactive} horsBorne={horsBorne} onChange={onChange} />;
}
