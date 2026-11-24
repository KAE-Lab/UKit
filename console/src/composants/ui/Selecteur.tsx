/**
 * Le selecteur de la console, a la place du `<select>` du navigateur, qui denotait dans les deux
 * themes (lot 0 de la phase 8). Base UI pour le comportement — clavier, lecteur d'ecran, position —,
 * la peau dans `styles/surfaces.css`. Une option de valeur `null` sert de choix « tous ».
 */

import { Select } from '@base-ui/react/select';
import { Check, ChevronsUpDown, type LucideIcon } from 'lucide-react';

export interface OptionDeSelecteur<V extends string | null> {
    readonly valeur: V;
    readonly libelle: string;
}

export interface SelecteurProps<V extends string | null> {
    readonly valeur: V;
    readonly options: readonly OptionDeSelecteur<V>[];
    readonly onChange: (valeur: V) => void;
    /** Le nom du controle pour un lecteur d'ecran, quand aucune etiquette visible ne le porte. */
    readonly etiquette: string;
    readonly Icone?: LucideIcon;
    readonly id?: string;
    readonly desactive?: boolean;
    readonly compact?: boolean;
}

export function Selecteur<V extends string | null>({ valeur, options, onChange, etiquette, Icone, id, desactive = false, compact = false }: SelecteurProps<V>) {
    const items = options.map((o) => ({ value: o.valeur, label: o.libelle }));
    return (
        <Select.Root items={items} value={valeur} onValueChange={(v) => onChange(v as V)} disabled={desactive}>
            <Select.Trigger id={id} className={`selecteur${compact ? ' compact' : ''}`} aria-label={etiquette}>
                {Icone === undefined ? null : <Icone className="icone" aria-hidden="true" />}
                <Select.Value className="valeur" />
                <Select.Icon className="chevron"><ChevronsUpDown className="icone" aria-hidden="true" /></Select.Icon>
            </Select.Trigger>
            <Select.Portal>
                <Select.Positioner className="selecteur-positionneur" sideOffset={6} alignItemWithTrigger={false}>
                    <Select.Popup className="menu-popup selecteur-popup">
                        <Select.List className="selecteur-liste">
                            {items.map((item) => (
                                <Select.Item key={item.value ?? ''} value={item.value} className="menu-item selecteur-item">
                                    <Select.ItemText>{item.label}</Select.ItemText>
                                    <Select.ItemIndicator className="coche"><Check className="icone" aria-hidden="true" /></Select.ItemIndicator>
                                </Select.Item>
                            ))}
                        </Select.List>
                    </Select.Popup>
                </Select.Positioner>
            </Select.Portal>
        </Select.Root>
    );
}
