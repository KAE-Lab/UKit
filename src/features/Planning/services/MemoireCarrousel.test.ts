/**
 * Ce que la memoire des carrousels doit tenir : une cle qui ignore l'ordre d'arrivee du serveur,
 * et un souvenir qui distingue deux TD paralleles d'une meme matiere — le cas qui a mordu : par
 * matiere seule, le choix retombait toujours sur le premier des deux.
 */

import { describe, expect, it } from 'vitest';

import { cleDeGroupe, empreinteDeCours, indexDuSouvenir } from './MemoireCarrousel';

const ANGLAIS = { starttime: '08:00', subject: 'Anglais', description: 'Salle 101\nTD A1' };
const PROG = { starttime: '08:00', subject: 'Programmation', description: 'Amphi\nCM' };
const TD1 = { starttime: '14:00', subject: 'Anglais', description: 'TD A1\nDUPONT' };
const TD2 = { starttime: '14:00', subject: 'Anglais', description: 'TD A2\nMARTIN' };

describe('cleDeGroupe', () => {
    it('ignore l ordre d arrivee des cours', () => {
        expect(cleDeGroupe([ANGLAIS, PROG])).toBe(cleDeGroupe([PROG, ANGLAIS]));
    });

    it('distingue deux creneaux et deux compositions', () => {
        expect(cleDeGroupe([ANGLAIS, PROG])).not.toBe(cleDeGroupe([{ ...ANGLAIS, starttime: '10:00' }, { ...PROG, starttime: '10:00' }]));
        expect(cleDeGroupe([ANGLAIS, PROG])).not.toBe(cleDeGroupe([ANGLAIS]));
    });
});

describe('indexDuSouvenir', () => {
    it('retrouve le cours choisi quel que soit son rang', () => {
        const souvenir = empreinteDeCours(PROG);
        expect(indexDuSouvenir([ANGLAIS, PROG], souvenir)).toBe(1);
        expect(indexDuSouvenir([PROG, ANGLAIS], souvenir)).toBe(0);
    });

    it('distingue deux TD paralleles de la meme matiere', () => {
        expect(indexDuSouvenir([TD1, TD2], empreinteDeCours(TD2))).toBe(1);
        expect(indexDuSouvenir([TD1, TD2], empreinteDeCours(TD1))).toBe(0);
    });

    it('replie sur la matiere quand la description a bouge, puis sur le premier cours', () => {
        const souvenirSalleChangee = empreinteDeCours({ ...PROG, description: 'Salle B2\nCM' });
        expect(indexDuSouvenir([ANGLAIS, PROG], souvenirSalleChangee)).toBe(1);
        expect(indexDuSouvenir([ANGLAIS, PROG], undefined)).toBe(0);
        expect(indexDuSouvenir([ANGLAIS, PROG], 'Chimie|TD')).toBe(0);
    });
});
