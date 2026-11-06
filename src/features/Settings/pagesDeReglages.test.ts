import { describe, expect, it } from 'vitest';

import { delaisAProposer, DELAIS_PROPOSES } from './pagesDeReglages';

describe('delaisAProposer', () => {
    it('propose les delais usuels quand le delai en cours en fait partie', () => {
        expect(delaisAProposer(15)).toEqual([...DELAIS_PROPOSES]);
    });

    it('garde un delai regle au curseur, a sa place dans l ordre', () => {
        expect(delaisAProposer(25)).toEqual([5, 10, 15, 20, 25, 30, 45, 60]);
    });

    it('ignore un delai illisible', () => {
        expect(delaisAProposer(Number.NaN)).toEqual([...DELAIS_PROPOSES]);
        expect(delaisAProposer(0)).toEqual([...DELAIS_PROPOSES]);
    });
});
