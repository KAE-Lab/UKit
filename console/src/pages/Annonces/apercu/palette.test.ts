import { describe, expect, it } from 'vitest';

import { tokens } from '../../../../../src/shared/theme/tokens';
import { variablesDApercu } from './palette';

describe("l'ombre de l'apercu", () => {
    it('reprend chaque couche de l ombre du telephone, sans valeur illisible', () => {
        const css = (variablesDApercu('light') as Record<string, string>)['--app-ombre'];
        const couches = Array.isArray(tokens.ombres.md) ? tokens.ombres.md.length : 1;
        expect(css.split('rgba(').length - 1).toBe(couches);
        expect(css).not.toMatch(/undefined|NaN/);
    });
});
