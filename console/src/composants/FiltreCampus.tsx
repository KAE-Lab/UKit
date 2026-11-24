/**
 * Le filtre global par campus, dans la barre : retenu d'une page a l'autre, il filtre toute
 * ressource qui porte un ciblage d'etablissement ou un code de campus (docs/phase-7/7-e-console-socle.md).
 */

import { Funnel } from 'lucide-react';
import { useContext } from 'react';

import { useEtablissements } from '../requetes/useEtablissements';
import { CampusContexte } from './campus';
import { Selecteur, type OptionDeSelecteur } from './ui/Selecteur';

export function FiltreCampus() {
    const { code, choisir } = useContext(CampusContexte);
    const { etablissements } = useEtablissements();
    const options: OptionDeSelecteur<string | null>[] = [
        { valeur: null, libelle: 'Tous les campus' },
        ...etablissements.map((e) => ({ valeur: e.code, libelle: e.nom })),
    ];
    // Un campus retenu que le catalogue ne connait plus reste choisi, sous son code.
    if (code !== null && !etablissements.some((e) => e.code === code)) options.push({ valeur: code, libelle: code });
    return <Selecteur valeur={code} options={options} onChange={choisir} etiquette="Filtrer par campus" Icone={Funnel} />;
}
