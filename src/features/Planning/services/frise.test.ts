/** La frise d'une journee : l'etat des creneaux, les pauses cotees, le repere de l'heure. */

import { describe, expect, it } from 'vitest';

import { construireFrise, etatDuCours, formaterDuree, formaterHeure, minutesDe, PAUSE_MINIMALE, type ElementDeFrise } from './frise';

const cours = (starttime: string, endtime: string) => ({ starttime, endtime });
// Une journee type : 08:00-09:20, 09:30-10:50 (dix minutes apres), 14:00-16:00 (apres le dejeuner).
const journee = [[cours('08:00', '09:20')], [cours('09:30', '10:50')], [cours('14:00', '16:00')]];

const genres = (frise: ElementDeFrise<unknown>[]) => frise.map((e) => e.genre);
const h = (heure: string) => minutesDe(heure) as number;

describe('minutesDe', () => {
    it('lit une heure HH:mm', () => {
        expect(minutesDe('09:30')).toBe(570);
        expect(minutesDe(' 8:05 ')).toBe(485);
    });

    it('refuse ce qui n est pas une heure', () => {
        expect(minutesDe('')).toBeNull();
        expect(minutesDe('25:00')).toBeNull();
        expect(minutesDe('9h30')).toBeNull();
    });
});

describe('construireFrise, un autre jour', () => {
    const frise = construireFrise(journee, null);

    it('ne pose aucun repere', () => {
        expect(genres(frise)).toEqual(['groupe', 'groupe', 'pause', 'groupe']);
    });

    it('cote la pause du dejeuner, pas les dix minutes entre deux cours', () => {
        expect(frise[2]).toEqual({ genre: 'pause', minutes: h('14:00') - h('10:50') });
        expect(h('09:30') - h('09:20')).toBeLessThan(PAUSE_MINIMALE);
    });
});

describe('construireFrise, aujourd hui', () => {
    it('pose le repere avant le premier cours, avec le temps qui reste', () => {
        const frise = construireFrise(journee, h('07:15'));
        expect(frise[0]).toEqual({ genre: 'maintenant', minutes: h('07:15'), prochainDans: 45, avantLePremier: true });
        expect(genres(frise)).toEqual(['maintenant', 'groupe', 'groupe', 'pause', 'groupe']);
    });

    it('ne pose pas de repere pendant un cours : la carte porte le temps qui reste', () => {
        expect(genres(construireFrise(journee, h('10:10')))).not.toContain('maintenant');
    });

    it('remplace la pause ou il tombe', () => {
        const frise = construireFrise(journee, h('12:00'));
        expect(genres(frise)).toEqual(['groupe', 'groupe', 'maintenant', 'groupe']);
        expect(frise[2]).toEqual({ genre: 'maintenant', minutes: h('12:00'), prochainDans: 120, avantLePremier: false });
    });

    it('se pose apres le dernier cours, sans prochain', () => {
        const frise = construireFrise(journee, h('17:00'));
        expect(frise[frise.length - 1]).toEqual({ genre: 'maintenant', minutes: h('17:00'), prochainDans: null, avantLePremier: false });
    });

    it('se pose a la fin exacte d un cours, avant le suivant', () => {
        const frise = construireFrise(journee, h('09:20'));
        expect(frise[1]).toEqual({ genre: 'maintenant', minutes: h('09:20'), prochainDans: 10, avantLePremier: false });
    });

    it('tient un groupe superpose pour en cours jusqu a sa derniere fin', () => {
        const superpose = [[cours('10:00', '11:00'), cours('10:30', '12:00')], [cours('14:00', '15:00')]];
        expect(genres(construireFrise(superpose, h('11:30')))).toEqual(['groupe', 'pause', 'groupe']);
    });

    it('laisse a sa place un groupe a l heure illisible, sans cote autour', () => {
        const frise = construireFrise([[cours('08:00', '09:00')], [cours('?', '10:00')], [cours('14:00', '15:00')]], null);
        expect(genres(frise)).toEqual(['groupe', 'groupe', 'groupe']);
    });

    it('ne pose rien sur une journee sans cours', () => {
        expect(construireFrise([], h('10:00'))).toEqual([]);
    });
});

describe('formaterDuree et formaterHeure', () => {
    it('ecrit la forme la plus courte, aux espaces insecables', () => {
        expect(formaterDuree(45)).toBe('45 min');
        expect(formaterDuree(120)).toBe('2 h');
        expect(formaterDuree(65)).toBe('1 h 05');
        expect(formaterDuree(-3)).toBe('0 min');
    });

    it('ecrit une heure sur deux chiffres', () => {
        expect(formaterHeure(h('07:05'))).toBe('07:05');
    });
});

describe('etatDuCours', () => {
    it('dit le temps qui reste et la part ecoulee d un cours en cours', () => {
        expect(etatDuCours(cours('09:30', '10:50'), h('10:10'))).toEqual({ etat: 'en-cours', progression: 0.5, resteMinutes: 40 });
    });

    it('tient le debut pour en cours et la fin pour passee', () => {
        expect(etatDuCours(cours('09:30', '10:50'), h('09:30')).etat).toBe('en-cours');
        expect(etatDuCours(cours('09:30', '10:50'), h('10:50')).etat).toBe('passe');
    });

    it('juge chaque cours d un groupe superpose a ses propres heures', () => {
        // Le defaut du banc : la carte 11:00-13:00 annoncait le reste du cours voisin, fini a 13:50.
        expect(etatDuCours(cours('11:00', '13:00'), h('11:58')).resteMinutes).toBe(62);
        expect(etatDuCours(cours('11:00', '13:50'), h('11:58')).resteMinutes).toBe(112);
        expect(etatDuCours(cours('11:00', '13:00'), h('13:10')).etat).toBe('passe');
    });

    it('rend a venir sans instant, ou sur une heure illisible', () => {
        expect(etatDuCours(cours('09:30', '10:50'), null).etat).toBe('a-venir');
        expect(etatDuCours(cours('?', '10:50'), h('10:00')).etat).toBe('a-venir');
    });
});
