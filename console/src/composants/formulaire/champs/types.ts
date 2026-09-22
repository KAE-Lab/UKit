import type { EtablissementConnu } from '../../../lib/base';
import type { Champ } from '../../../schema/descripteurs';
import type { Saisie } from '../../../schema/schemas';
import type { Ligne } from '../../../supabase';

export interface ChampProps {
    readonly champ: Champ;
    readonly id: string;
    readonly saisie: Saisie;
    readonly onChange: (saisie: Saisie) => void;
    /** Pose une autre colonne du formulaire : le blurhash calcule au televersement. */
    readonly poserAutre: (nom: string, saisie: Saisie) => void;
    /** La ligne en cours de saisie, pour ce qui depend d'un autre champ (le dossier d'une image). */
    readonly ligne: Ligne;
    readonly etablissements: readonly EtablissementConnu[];
    readonly codesConnus: readonly string[] | null;
    readonly desactive: boolean;
    readonly enErreur: boolean;
}
