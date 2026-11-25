/**
 * La boite a idees (lot 4) : les idees publiees, rangees par statut, et les soutiens de cet appareil.
 * `null` tant que la premiere lecture n'est pas revenue ; une base injoignable rend la derniere liste lue.
 */

import { useEffect, useState } from 'react';

import { ideesAMontrer, type Idee } from '../../shared/retours/donnees';
import { lireLesIdees, lireLesSoutiens } from '../../shared/retours/idees';
import { maintenantMs } from '../../shared/services/Temps';

export interface BoiteAIdees {
    readonly enCours: readonly Idee[];
    readonly proposees: readonly Idee[];
    readonly livrees: readonly Idee[];
}

export function useBoiteAIdees() {
    const [boite, setBoite] = useState<BoiteAIdees | null>(null);
    const [soutiens, setSoutiens] = useState<string[]>([]);

    useEffect(() => {
        let monte = true;
        void Promise.all([lireLesIdees(), lireLesSoutiens()]).then(([idees, lus]) => {
            if (!monte) return;
            const montrees = ideesAMontrer(idees, maintenantMs());
            setBoite({
                enCours: montrees.filter((i) => i.statut === 'en_cours'),
                proposees: montrees.filter((i) => i.statut === 'proposee'),
                livrees: montrees.filter((i) => i.statut === 'livree'),
            });
            setSoutiens(lus);
        });
        return () => { monte = false; };
    }, []);

    return { boite, soutiens, aSoutenu: (id: string) => setSoutiens((avant) => [...avant, id]) };
}
