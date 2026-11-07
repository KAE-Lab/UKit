import { describe, expect, it } from 'vitest';

import { partiesDuGroupe } from './groupes';

describe('partiesDuGroupe', () => {
    it('separe le code du libelle au premier tiret', () => {
        expect(partiesDuGroupe('31BI701S - M1 Groupe 1')).toEqual({ libelle: 'M1 Groupe 1', code: '31BI701S' });
        expect(partiesDuGroupe('31BI701S - Grpe 2 - Non-Lauréat')).toEqual({ libelle: 'Grpe 2 - Non-Lauréat', code: '31BI701S' });
    });

    it('garde le nom entier sans tiret, ou sans libelle apres lui', () => {
        expect(partiesDuGroupe('31BI701S ')).toEqual({ libelle: '31BI701S', code: null });
        expect(partiesDuGroupe('31BI701S - ')).toEqual({ libelle: '31BI701S -', code: null });
        expect(partiesDuGroupe(' - M1')).toEqual({ libelle: '- M1', code: null });
    });
});
