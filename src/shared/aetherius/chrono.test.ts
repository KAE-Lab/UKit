import { describe, expect, it } from 'vitest';

import { plusLongueNavigation } from './chrono';

const step = (action: string, duration_ms: number) => ({ action, duration_ms });

describe('plusLongueNavigation', () => {
    it('rend la plus longue des navigations, et ignore les autres steps', () => {
        expect(plusLongueNavigation({ step_results: [step('navigate', 1200), step('wait', 6000), step('navigate', 12000), step('wait_for', 2000)] })).toBe(12000);
    });

    it('rend 0 sans resultat ni navigation', () => {
        expect(plusLongueNavigation(undefined)).toBe(0);
        expect(plusLongueNavigation({ step_results: [step('wait', 4000)] })).toBe(0);
    });
});
