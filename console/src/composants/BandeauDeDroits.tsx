/**
 * En tete de chaque page qui ecrit : ce que le role du compte y permet, avant qu'il n'essaie (defaut 3
 * du jalon 7-E, roles du jalon 7-H). En lecture seule, la raison ; pour un redacteur borne, sur les
 * annonces, ses campus — les autres annonces se lisent sans se modifier.
 */

import { Lock, MapPin } from 'lucide-react';

import { borneDe, raisonDeLectureSeule } from '../auth/droits';
import { useDroits } from '../auth/session';
import { useEtablissements } from '../requetes/useEtablissements';

export function BandeauDeDroits({ table }: { readonly table: string }) {
    const droits = useDroits();
    const { etablissements } = useEtablissements();
    const raison = raisonDeLectureSeule(droits, table);
    if (raison !== null) {
        return (
            <div className="encart avert bandeau-de-droits" role="status">
                <Lock className="icone" aria-hidden="true" />
                <div>{raison}</div>
            </div>
        );
    }
    const borne = borneDe(droits);
    if (table !== 'annonces' || borne === null) return null;
    const noms = borne.map((code) => etablissements.find((e) => e.code === code)?.nom ?? code);
    return (
        <div className="encart info bandeau-de-droits" role="status">
            <MapPin className="icone" aria-hidden="true" />
            <div>
                <strong>Tu publies pour {noms.join(', ')}.</strong> Les annonces des autres campus se lisent ici sans se
                modifier, et une annonce pour tous les campus est un geste d’admin.
            </div>
        </div>
    );
}
