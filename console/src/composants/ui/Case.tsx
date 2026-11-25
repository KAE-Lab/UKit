/**
 * La case a cocher de la console, pour choisir plusieurs valeurs d'une liste (les campus, les
 * plateformes) : Base UI pour le comportement, la peau du theme a la place de celle du navigateur.
 */

import { Checkbox } from '@base-ui/react/checkbox';
import { Check } from 'lucide-react';

export function Case({ valeur, onChange, desactive = false }: {
    readonly valeur: boolean;
    readonly onChange: (valeur: boolean) => void;
    readonly desactive?: boolean;
}) {
    return (
        <Checkbox.Root className="coche" checked={valeur} disabled={desactive} onCheckedChange={(coche) => onChange(coche)}>
            <Checkbox.Indicator className="coche-indicateur"><Check className="icone" aria-hidden="true" /></Checkbox.Indicator>
        </Checkbox.Root>
    );
}
