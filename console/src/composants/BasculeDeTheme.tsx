/**
 * La bascule de theme : celui du systeme par defaut, ou un theme fixe retenu sur ce poste (lot 0 de
 * la phase 8). Un controle segmente, comme le choix de l'apparence dans l'application.
 */

import { Monitor, Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';

import { abonnerAuTheme, choisirTheme, choixDeTheme, type ChoixDeTheme } from '../lib/theme';
import { Segments, type OptionDeSegment } from './ui/Segments';

const CHOIX: readonly OptionDeSegment<ChoixDeTheme>[] = [
    { valeur: 'systeme', libelle: 'Thème du système', Icone: Monitor, iconeSeule: true },
    { valeur: 'clair', libelle: 'Thème clair', Icone: Sun, iconeSeule: true },
    { valeur: 'sombre', libelle: 'Thème sombre', Icone: Moon, iconeSeule: true },
];

export function BasculeDeTheme() {
    const choix = useSyncExternalStore(abonnerAuTheme, choixDeTheme);
    return <Segments valeur={choix} options={CHOIX} onChange={choisirTheme} etiquette="Thème" plein />;
}
