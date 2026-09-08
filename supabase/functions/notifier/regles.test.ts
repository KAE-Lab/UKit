/**
 * La copie Deno du ciblage rend la meme reponse que l'original de l'application, sur une matrice
 * de lignes et d'appareils. C'est la seule garantie qu'un push n'atteint pas un telephone ou le
 * message ne s'afficherait pas — ou l'inverse.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { estCible as estCibleAppareil, projeterCiblage as projeterAppareil, type ContexteDeCiblage } from '../../../src/shared/ciblage/ciblage';
import { estCible, projeterCiblage } from './regles';

const LIGNES: Record<string, unknown>[] = [
    {},
    { audience: 'tous', etablissements: null, version_min: null, version_max: null, plateformes: null },
    { audience: 'testeurs' },
    { audience: 'internes' },
    { etablissements: ['bordeaux-inp'] },
    { etablissements: [] },
    { etablissements: ['bordeaux', 42, ''] },
    { version_min: '6.1.0' },
    { version_max: '6.0.0' },
    { version_min: '6.0.0', version_max: '6.2.0' },
    { version_min: '' },
    { plateformes: ['android'] },
    { plateformes: [] },
    { plateformes: ['ios', 'tv'] },
    { plateformes: ['tv'] },
    { audience: 'testeurs', etablissements: ['bordeaux'], plateformes: ['ios'], version_max: '6.1.0' },
];

const APPAREILS: ContexteDeCiblage[] = [
    { testeur: false, etablissement: 'bordeaux', version: '6.1.0', plateforme: 'ios' },
    { testeur: true, etablissement: 'bordeaux', version: '6.1.0', plateforme: 'ios' },
    { testeur: false, etablissement: 'bordeaux-inp', version: '6.0.0', plateforme: 'android' },
    { testeur: true, etablissement: 'bordeaux-inp', version: '6.2.0', plateforme: 'android' },
    { testeur: false, etablissement: 'bordeaux', version: null, plateforme: 'inconnue' },
    { testeur: false, etablissement: 'autre', version: 'x', plateforme: 'ios' },
];

test('la copie Deno et l original rendent la meme reponse sur toute la matrice', () => {
    for (const ligne of LIGNES) {
        expect(projeterCiblage(ligne)).toEqual(projeterAppareil(ligne));
        for (const appareil of APPAREILS) {
            expect(estCible(projeterCiblage(ligne), appareil)).toBe(estCibleAppareil(projeterAppareil(ligne), appareil));
        }
    }
});
