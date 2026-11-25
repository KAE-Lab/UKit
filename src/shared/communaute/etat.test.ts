/**
 * Le modele d'etat d'un lieu, regle par regle : la premiere voix, la voix contraire, la deuxieme, la
 * voix d'un appareil fiable, le plus recent qui l'emporte, la confirmation, les durees par famille, la
 * confiance qui baisse, « toujours vrai ? », l'officiel qui prime, le non atteste en retrait.
 */

import { describe, expect, test } from 'vitest';

import type { Poids, Signalement } from './donnees';
import { etatDUnLieu, finDeValidite, REGLAGES } from './etat';

const T0 = Date.parse('2026-11-25T11:00:00Z');
const MINUTE = 60_000;
const FIN_DU_JOUR = Date.parse('2026-11-25T23:00:00Z');

let suivant = 0;
function voix(valeur: string, minutes: number, poids: Poids = 1, autres: Partial<Signalement> = {}): Signalement {
    suivant += 1;
    return {
        id: `s-${String(suivant).padStart(3, '0')}`,
        sujet: 'restaurant.ferme', cible: '21', valeur, fin: null, poids, statut: 'active',
        creeLe: T0 + minutes * MINUTE, expireLe: FIN_DU_JOUR, majLe: T0 + minutes * MINUTE,
        ...autres,
    };
}

const etat = (signalements: Signalement[], minutes: number, famille: 'jour' | 'direct' | 'date' | 'correction' = 'jour', officiel: string | null = null) =>
    etatDUnLieu(signalements, 'restaurant.ferme', '21', famille, T0 + minutes * MINUTE, { officiel });

describe('les voix', () => {
    test('sans signalement, pas d info, et rien ne prime', () => {
        expect(etat([], 0)).toEqual({ communaute: { nature: 'sans_info' }, enRetrait: [], officiel: null, prime: 'rien' });
    });

    test('la premiere voix etablit l etat', () => {
        const e = etat([voix('ferme', 0)], 5).communaute;
        expect(e).toMatchObject({ nature: 'etabli', valeur: 'ferme', contraire: null, voix: 1, aConfirmer: false });
    });

    test('une voix contraire rend l etat incertain, la deuxieme le fait basculer', () => {
        const a = voix('ferme', 0);
        const b = voix('ouvert', 10);
        expect(etat([a, b], 15).communaute).toMatchObject({ nature: 'incertain', valeur: 'ferme', contraire: 'ouvert' });
        const c = voix('ouvert', 20);
        expect(etat([a, b, c], 25).communaute).toMatchObject({ nature: 'etabli', valeur: 'ouvert', depuis: c.creeLe });
    });

    test('une seule voix d un appareil fiable suffit a basculer', () => {
        expect(etat([voix('ferme', 0), voix('ouvert', 10, 2)], 15).communaute).toMatchObject({ nature: 'etabli', valeur: 'ouvert' });
    });

    test('entre deux voix contraires qui ne s accordent pas, la plus recente l emporte', () => {
        const e = etat([voix('fluide', 0), voix('attend', 5), voix('tres_long', 8)], 10).communaute;
        expect(e).toMatchObject({ nature: 'etabli', valeur: 'tres_long' });
    });

    test('le plus recent l emporte, pas le plus vote', () => {
        const toutes = [voix('ferme', 0), voix('ferme', 1), voix('ferme', 2), voix('ouvert', 10), voix('ouvert', 11)];
        expect(etat(toutes, 15).communaute).toMatchObject({ nature: 'etabli', valeur: 'ouvert' });
    });

    test('une confirmation remet le compte des voix contraires a zero', () => {
        const toutes = [voix('ferme', 0), voix('ouvert', 10), voix('ferme', 20), voix('ouvert', 30)];
        expect(etat(toutes, 35).communaute).toMatchObject({ nature: 'incertain', valeur: 'ferme', confirmeLe: T0 + 20 * MINUTE });
    });

    test('l ordre du tableau ne change rien, deux voix du meme instant se rangent par identifiant', () => {
        const toutes = [voix('ferme', 0), voix('ouvert', 10), voix('ouvert', 10), voix('ferme', 30)];
        const attendu = etat(toutes, 40);
        expect(etat([...toutes].reverse(), 40)).toEqual(attendu);
        expect(etat([toutes[2], toutes[0], toutes[3], toutes[1]], 40)).toEqual(attendu);
    });

    test('les autres sujets et les autres cibles ne comptent pas', () => {
        const ailleurs = [voix('ouvert', 5, 2, { cible: '22' }), voix('ouvert', 6, 2, { sujet: 'restaurant.attente' })];
        expect(etat([voix('ferme', 0), ...ailleurs], 10).communaute).toMatchObject({ nature: 'etabli', valeur: 'ferme', voix: 1 });
    });
});

describe('ce qui ne compte pas', () => {
    test('une contribution non attestee s affiche en retrait, sans peser ni etablir', () => {
        const e = etat([voix('ferme', 0, 0), voix('ouvert', 5, 0)], 10);
        expect(e.communaute).toEqual({ nature: 'sans_info' });
        expect(e.enRetrait.map((s) => s.valeur)).toEqual(['ouvert', 'ferme']);
        expect(e.prime).toBe('rien');
    });

    test('une voix non attestee ne fait pas basculer un etat etabli', () => {
        expect(etat([voix('ferme', 0), voix('ouvert', 5, 0), voix('ouvert', 6, 0)], 10).communaute).toMatchObject({ nature: 'etabli', valeur: 'ferme' });
    });

    test('une voix remplacee ou masquee n existe plus', () => {
        const e = etat([voix('ferme', 0, 1, { statut: 'remplacee' }), voix('ferme', 1, 2, { statut: 'masquee' }), voix('ouvert', 5)], 10);
        expect(e.communaute).toMatchObject({ nature: 'etabli', valeur: 'ouvert', voix: 1 });
    });
});

describe('les durees par famille', () => {
    test('un signalement du jour vaut jusqu au soir, puis pas d info', () => {
        const a = voix('ferme', 0);
        expect(etatDUnLieu([a], 'restaurant.ferme', '21', 'jour', FIN_DU_JOUR - 1).communaute.nature).toBe('etabli');
        expect(etatDUnLieu([a], 'restaurant.ferme', '21', 'jour', FIN_DU_JOUR).communaute.nature).toBe('sans_info');
    });

    test('un signalement direct vaut la duree de l ecran, jamais plus que sa borne en base', () => {
        const a = voix('attend', 0, 1, { expireLe: T0 + 30 * MINUTE });
        expect(finDeValidite(a, 'direct')).toBe(T0 + REGLAGES.dureeDirectMinutes * MINUTE);
        expect(etat([a], REGLAGES.dureeDirectMinutes - 1, 'direct').communaute.nature).toBe('etabli');
        expect(etat([a], REGLAGES.dureeDirectMinutes, 'direct').communaute.nature).toBe('sans_info');
        const court = voix('attend', 0, 1, { expireLe: T0 + 10 * MINUTE });
        expect(etat([court], 11, 'direct').communaute.nature).toBe('sans_info');
    });

    test('quand la voix etablie expire, la contraire encore valable prend sa place', () => {
        const a = voix('tres_long', 0, 1, { expireLe: T0 + 30 * MINUTE });
        const b = voix('fluide', 10, 1, { expireLe: T0 + 40 * MINUTE });
        expect(etat([a, b], 15, 'direct').communaute).toMatchObject({ nature: 'incertain', valeur: 'tres_long' });
        expect(etat([a, b], 26, 'direct').communaute).toMatchObject({ nature: 'etabli', valeur: 'fluide' });
    });
});

describe('la confiance et « toujours vrai ? »', () => {
    test('la confiance est entiere a la derniere voix d accord, et de moitie une demi-vie plus tard', () => {
        const a = voix('ferme', 0);
        expect(etat([a], 0).communaute).toMatchObject({ confiance: 1 });
        const demiVie = REGLAGES.demiVieMinutes.jour;
        const e = etat([a], demiVie).communaute;
        expect(e.nature !== 'sans_info' && e.confiance).toBeCloseTo(0.5, 10);
    });

    test('un etat qui dure, vieux d une heure, se reconfirme ; une voix d accord rajeunit la question', () => {
        const a = voix('ferme', 0);
        expect(etat([a], REGLAGES.questionApresMinutes - 1).communaute).toMatchObject({ aConfirmer: false });
        expect(etat([a], REGLAGES.questionApresMinutes).communaute).toMatchObject({ aConfirmer: true });
        expect(etat([a, voix('ferme', 50)], REGLAGES.questionApresMinutes + 5).communaute).toMatchObject({ aConfirmer: false });
    });

    test('un etat incertain se reconfirme tout de suite, sauf en direct ou la question vient des heures du service', () => {
        const toutes = [voix('ferme', 0), voix('ouvert', 1)];
        expect(etat(toutes, 2).communaute).toMatchObject({ nature: 'incertain', aConfirmer: true });
        expect(etat(toutes, 2, 'direct').communaute).toMatchObject({ nature: 'incertain', aConfirmer: false });
    });
});

describe('l officiel', () => {
    test('un message officiel passe devant, et l etat de la communaute reste calcule a cote', () => {
        const e = etat([voix('ouvert', 0)], 5, 'jour', 'Fermeture exceptionnelle');
        expect(e.prime).toBe('officiel');
        expect(e.officiel).toBe('Fermeture exceptionnelle');
        expect(e.communaute).toMatchObject({ nature: 'etabli', valeur: 'ouvert' });
        expect(etat([], 5, 'jour', 'Fermeture exceptionnelle').prime).toBe('officiel');
        expect(etat([voix('ouvert', 0)], 5).prime).toBe('communaute');
    });
});
