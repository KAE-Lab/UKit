import { describe, expect, test } from 'vitest';

import { compterLesVoix } from './voix';

describe('les « moi aussi » d\'un probleme', () => {
    test('le total, les attestes, et les appareils touches du plus frequent au plus rare', () => {
        const voix = compterLesVoix([
            { valeur: 'android|Pixel 7|Android 15|7.0.0', poids: 1 },
            { valeur: 'android|Pixel 7|Android 15|7.0.0', poids: 0 },
            { valeur: 'ios|iPhone 15|iOS 18.5|7.0.0', poids: 1 },
            { valeur: 42, poids: 1 },
        ]);
        expect(voix.total).toBe(3);
        expect(voix.attestes).toBe(2);
        expect(voix.appareils[0]).toEqual({ plateforme: 'android', appareil: 'Pixel 7', systeme: 'Android 15', version: '7.0.0', n: 2 });
        expect(voix.appareils).toHaveLength(2);
    });
});
