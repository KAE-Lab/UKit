/** La langue proposee au premier lancement, depuis les locales que le systeme annonce. */

import { describe, expect, it } from 'vitest';

import { langueDesLocales } from './langues';

describe('langueDesLocales', () => {
    it('prend la premiere locale lisible', () => {
        // Le defaut du banc : la lecture historique rendait `undefined`, getConstants() la locale.
        expect(langueDesLocales([undefined, 'fr_FR', 'en-US'])).toBe('fr');
        expect(langueDesLocales(['', null, 'es-ES'])).toBe('es');
    });

    it('reconnait les formes avec tiret et soulignement, en toute casse', () => {
        expect(langueDesLocales(['FR-be'])).toBe('fr');
        expect(langueDesLocales(['es_MX'])).toBe('es');
    });

    it('retombe sur l anglais pour une langue que l application ne parle pas, ou rien', () => {
        expect(langueDesLocales(['de-DE'])).toBe('en');
        expect(langueDesLocales([undefined, undefined])).toBe('en');
    });
});
