/**
 * Le verrou contre l'ecrasement : une ecriture qui n'a touche aucune ligne se lit — supprimee, devancee
 * ou refusee —, et le conflit se dit avec son auteur.
 *
 *     npm test   (a la racine du depot)
 */

import { describe, expect, it } from 'vitest';

import { issueDUneEcritureVide, phraseDuConflit } from './verrou';

const LUE = { id: 'a', titre: 'Soirée', maj_le: '2026-09-25T12:00:00.123456+00:00' };

describe('issueDUneEcritureVide', () => {
    it('une ligne qui n existe plus a ete supprimee', () => {
        expect(issueDUneEcritureVide('maj_le', LUE, null)).toBe('supprimee');
    });

    it('une version qui a bouge a ete devancee', () => {
        expect(issueDUneEcritureVide('maj_le', LUE, { ...LUE, maj_le: '2026-09-25T12:03:10.000001+00:00' })).toBe('devancee');
    });

    it('une version qui n a pas bouge veut dire que la politique a refuse', () => {
        expect(issueDUneEcritureVide('maj_le', LUE, { ...LUE })).toBe('refusee');
    });

    it('sans colonne de verrou, une ligne encore la a ete refusee', () => {
        expect(issueDUneEcritureVide(undefined, LUE, { ...LUE, maj_le: 'autre' })).toBe('refusee');
    });
});

describe('phraseDuConflit', () => {
    it('nomme l auteur et l heure', () => {
        const phrase = phraseDuConflit({ par: 'camille@exemple.fr', quand: '2026-09-25T12:32:00Z' }, 'moi@exemple.fr');
        expect(phrase).toContain('par camille@exemple.fr');
        expect(phrase).toContain('2026');
    });

    it('reconnait un autre onglet du meme compte', () => {
        expect(phraseDuConflit({ par: 'moi@exemple.fr', quand: '2026-09-25T12:32:00Z' }, 'moi@exemple.fr')).toContain('par toi, dans un autre onglet');
    });

    it('se passe d auteur quand le journal ne le dit pas', () => {
        expect(phraseDuConflit(null, 'moi@exemple.fr')).toMatch(/^Modifiée entre-temps : /);
    });
});
