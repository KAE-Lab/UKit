/**
 * Un controle segmente : un choix parmi peu d'options, toujours visibles, comme le choix de
 * l'apparence dans l'application. Un groupe de boutons radio pour un lecteur d'ecran.
 */

import type { LucideIcon } from 'lucide-react';

export interface OptionDeSegment<V extends string> {
    readonly valeur: V;
    readonly libelle: string;
    readonly Icone?: LucideIcon;
    /** Le libelle reste lisible pour un lecteur d'ecran, mais l'icone seule se montre. */
    readonly iconeSeule?: boolean;
}

export interface SegmentsProps<V extends string> {
    readonly valeur: V;
    readonly options: readonly OptionDeSegment<V>[];
    readonly onChange: (valeur: V) => void;
    readonly etiquette: string;
    readonly desactive?: boolean;
    /** Les segments se partagent toute la largeur. */
    readonly plein?: boolean;
}

export function Segments<V extends string>({ valeur, options, onChange, etiquette, desactive = false, plein = false }: SegmentsProps<V>) {
    return (
        <div className={`segments${plein ? ' plein' : ''}`} role="radiogroup" aria-label={etiquette}>
            {options.map(({ valeur: v, libelle, Icone, iconeSeule }) => (
                <button key={v} type="button" role="radio" aria-checked={valeur === v} className="segment" title={iconeSeule === true ? libelle : undefined} disabled={desactive} onClick={() => onChange(v)}>
                    {Icone === undefined ? null : <Icone className="icone" aria-hidden="true" />}
                    <span className={iconeSeule === true ? 'visuellement-cache' : undefined}>{libelle}</span>
                </button>
            ))}
        </div>
    );
}
