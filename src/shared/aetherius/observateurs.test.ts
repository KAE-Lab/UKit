import { describe, expect, it, vi } from 'vitest';

import { onEchecDeRun, signalerEchec, type EchecDeRun } from './observateurs';

const ECHEC: EchecDeRun = { nom: 'ukit.celcat.jour', hote: 'celcat.u-bordeaux.fr', famille: 'unavailable', origine: 'automatique' };

describe('observateurs', () => {
    it('livre chaque echec aux abonnes, et plus rien apres le desabonnement', () => {
        const recu: EchecDeRun[] = [];
        const desabonner = onEchecDeRun((echec) => recu.push(echec));
        signalerEchec(ECHEC);
        desabonner();
        signalerEchec(ECHEC);
        expect(recu).toEqual([ECHEC]);
    });

    it('un abonne qui leve n empeche pas le suivant', () => {
        const avertir = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const recu: EchecDeRun[] = [];
        const un = onEchecDeRun(() => { throw new Error('boum'); });
        const deux = onEchecDeRun((echec) => recu.push(echec));
        signalerEchec(ECHEC);
        un();
        deux();
        expect(recu).toEqual([ECHEC]);
        expect(avertir).toHaveBeenCalledTimes(1);
        avertir.mockRestore();
    });

    it('ne fait rien sans abonne', () => {
        expect(() => signalerEchec(ECHEC)).not.toThrow();
    });
});
