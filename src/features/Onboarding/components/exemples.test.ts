import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/services/Temps', () => ({ maintenant: () => new Date('2026-11-09T10:35:00') }));

import type { AppThemeType } from '../../../shared/theme/Theme';
import { coursDExemple, MINUTE_D_EXEMPLE } from './exemples';

const theme = { courses: { a: '#111111', b: '#222222', c: '#333333' } } as unknown as AppThemeType;

describe('les cours d exemple', () => {
    it('sont dates du jour, dans l ordre, chacun avec sa salle et son type', () => {
        const cours = coursDExemple(theme);
        expect(cours.map((c) => c.starttime)).toEqual(['11:00', '14:00', '15:30']);
        for (const c of cours) {
            expect(c.date.start.startsWith('2026-11-09T')).toBe(true);
            expect(c.description).not.toBe('');
            expect(c.category).not.toBe('');
        }
    });

    it('montrent le premier cours a venir, dans vingt-cinq minutes', () => {
        expect(11 * 60 - MINUTE_D_EXEMPLE).toBe(25);
    });
});
