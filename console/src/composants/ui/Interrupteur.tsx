/**
 * L'interrupteur de la console, pour un reglage qui s'allume ou s'eteint (« Active », « Épinglée ») :
 * celui de l'application (src/shared/ui/Interrupteur.tsx) — une piste en pilule qui porte la valeur,
 * l'accent allume, une poignee blanche —, a la place de la case du navigateur. Base UI pour le
 * comportement : le clavier, le lecteur d'ecran, l'etiquette qui l'enveloppe.
 */

import { Switch } from '@base-ui/react/switch';

export function Interrupteur({ id, valeur, onChange, desactive = false }: {
    readonly id?: string;
    readonly valeur: boolean;
    readonly onChange: (valeur: boolean) => void;
    readonly desactive?: boolean;
}) {
    return (
        <Switch.Root id={id} className="interrupteur" checked={valeur} disabled={desactive} onCheckedChange={(coche) => onChange(coche)}>
            <Switch.Thumb className="poignee" />
        </Switch.Root>
    );
}
