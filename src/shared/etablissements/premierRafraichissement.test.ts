/**
 * Le signal du premier rafraichissement : une reponse, un plafond, et jamais les deux.
 *
 * Le cas qui compte est le troisieme — une base injoignable repond vite, par un echec, et l'accueil
 * ne doit pas attendre quatre secondes pour afficher un socle qu'il a deja.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { creerPremierRafraichissement } from './premierRafraichissement';

describe('creerPremierRafraichissement', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('rend « repondu » des que le signal arrive, avant le plafond', async () => {
        const premier = creerPremierRafraichissement();
        const attente = premier.attendre(4000);

        premier.signaler();
        await expect(attente).resolves.toBe('repondu');
        expect(premier.repondu()).toBe(true);
    });

    it('rend « plafond » quand rien ne repond a temps', async () => {
        const premier = creerPremierRafraichissement();
        const attente = premier.attendre(4000);

        await vi.advanceTimersByTimeAsync(4000);
        await expect(attente).resolves.toBe('plafond');
        expect(premier.repondu()).toBe(false);
    });

    it('rend « repondu » tout de suite quand le signal a precede l attente', async () => {
        const premier = creerPremierRafraichissement();
        premier.signaler();

        await expect(premier.attendre(4000)).resolves.toBe('repondu');
    });

    it('ne compte que la premiere fois : un second signal ne change rien', async () => {
        const premier = creerPremierRafraichissement();
        premier.signaler();
        premier.signaler();

        expect(premier.repondu()).toBe(true);
        await expect(premier.attendre(10)).resolves.toBe('repondu');
    });
});
