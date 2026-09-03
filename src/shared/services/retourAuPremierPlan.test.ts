/**
 * Un retour, c'est `active` apres `background` — pas `active` apres `inactive`, ce qui est la fin
 * d'une invite systeme ou d'un centre de controle tire.
 */

import { describe, expect, it } from 'vitest';

import { DetecteurDeRetour } from './retourAuPremierPlan';

describe('DetecteurDeRetour', () => {
    it('reconnait le retour d\'arriere-plan', () => {
        const detecteur = new DetecteurDeRetour();
        expect(detecteur.transition('background')).toBe(false);
        expect(detecteur.transition('active')).toBe(true);
    });

    it('ignore une interruption qui ne passe que par inactive', () => {
        const detecteur = new DetecteurDeRetour();
        expect(detecteur.transition('inactive')).toBe(false);
        expect(detecteur.transition('active')).toBe(false);
    });

    it('tolere un inactive entre l\'arriere-plan et le retour', () => {
        const detecteur = new DetecteurDeRetour();
        detecteur.transition('inactive');
        detecteur.transition('background');
        detecteur.transition('inactive');
        expect(detecteur.transition('active')).toBe(true);
    });

    it('ne compte chaque retour qu\'une fois', () => {
        const detecteur = new DetecteurDeRetour();
        detecteur.transition('background');
        expect(detecteur.transition('active')).toBe(true);
        expect(detecteur.transition('active')).toBe(false);
        detecteur.transition('background');
        expect(detecteur.transition('active')).toBe(true);
    });
});
