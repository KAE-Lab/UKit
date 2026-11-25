/** Ou manger : le trou de midi, l'ouverture lue dans la source, le rayon, l'ordre, le plat (lot 6). */

import { describe, expect, it } from 'vitest';

import { choisirLesRestaurants, MIDI, platPrincipal, serviceDuMidi, SUGGESTIONS, trouDeMidi } from './ouManger';
import { minutesDe } from './frise';

const h = (heure: string) => minutesDe(heure) as number;
const el = (starttime: string, endtime: string, source?: 'telephone') => ({ starttime, endtime, ...(source !== undefined ? { source } : {}) });

describe('trouDeMidi', () => {
    it('trouve un trou de midi et le cours qui le suit', () => {
        const apres = el('13:30', '15:30');
        const trou = trouDeMidi([el('08:00', '12:00'), apres]);
        expect(trou?.fenetre).toEqual({ debut: h('12:00'), fin: h('13:30') });
        expect(trou?.coursSuivant).toBe(apres);
    });

    it('borne la fenetre a 11 h 30 et 14 h', () => {
        expect(trouDeMidi([el('08:00', '10:00'), el('16:00', '18:00')])?.fenetre).toEqual(MIDI);
    });

    it('refuse une part de midi de moins de 45 minutes', () => {
        expect(trouDeMidi([el('08:00', '11:00'), el('12:00', '14:00')])).toBeNull();
        expect(trouDeMidi([el('08:00', '12:30'), el('13:14', '15:00')])).toBeNull();
        expect(trouDeMidi([el('08:00', '12:30'), el('13:15', '15:00')])).not.toBeNull();
    });

    it('ne fait pas d une journee finie a midi un trou', () => {
        expect(trouDeMidi([el('08:00', '12:00')])).toBeNull();
    });

    it('compte un rendez-vous du telephone comme occupe, mais cherche le batiment au cours suivant', () => {
        expect(trouDeMidi([el('08:00', '12:00'), el('12:00', '13:00', 'telephone'), el('13:30', '15:00')])).toBeNull();
        const cours = el('14:30', '16:00');
        const trou = trouDeMidi([el('08:00', '11:30'), el('13:30', '14:00', 'telephone'), cours]);
        expect(trou?.fenetre).toEqual({ debut: h('11:30'), fin: h('13:30') });
        expect(trou?.coursSuivant).toBe(cours);
    });

    it('fond les cours superposes avant de chercher le trou', () => {
        expect(trouDeMidi([el('08:00', '12:00'), el('09:00', '13:00'), el('14:00', '16:00')])?.fenetre).toEqual({ debut: h('13:00'), fin: h('14:00') });
    });
});

describe('serviceDuMidi', () => {
    const fenetre = { debut: h('12:00'), fin: h('13:30') };
    const lignes = ['du lundi au vendredi', 'SELF : 11h30 - 13h45'];

    it('rend le creneau qui recouvre la fenetre, un jour de service', () => {
        expect(serviceDuMidi(lignes, 3, fenetre)).toEqual({ debut: h('11:30'), fin: h('13:45') });
    });

    it('refuse un jour hors de la portee lue', () => {
        expect(serviceDuMidi(lignes, 6, fenetre)).toBeNull();
    });

    it('refuse un service qui ne laisse pas le temps d un repas', () => {
        expect(serviceDuMidi(['11h00 - 12h20'], 3, fenetre)).toBeNull();
        expect(serviceDuMidi(['11h00 - 12h30'], 3, fenetre)).toEqual({ debut: h('11:00'), fin: h('12:30') });
    });

    it('refuse des horaires illisibles', () => {
        expect(serviceDuMidi(['Horaires non spécifiés'], 3, fenetre)).toBeNull();
    });
});

describe('choisirLesRestaurants', () => {
    const fenetre = { debut: h('12:00'), fin: h('13:30') };
    // Le batiment A28, a Talence, et des restaurants a quelques centaines de metres (un millieme de
    // degre de latitude vaut 111 m).
    const lieu = { lat: 44.8048, lng: -0.5954 };
    const resto = (id: string, dLat: number, openingLines = ['11h30 - 13h45']) => ({ id, lat: lieu.lat + dLat, lon: lieu.lng, openingLines });

    it('range du plus proche au plus lointain, et en garde deux', () => {
        const choix = choisirLesRestaurants([resto('loin', 0.007), resto('pres', 0.002), resto('moyen', 0.004)], { fenetre, lieu, jourDeLaSemaine: 3, fermes: new Set() });
        expect(choix.map((c) => c.restaurant.id)).toEqual(['pres', 'moyen']);
        expect(choix).toHaveLength(SUGGESTIONS);
        expect(choix[0].distanceKm).toBeCloseTo(0.222, 2);
    });

    it('ecarte ce qui est au-dela d un kilometre, ferme a cette heure, ou dit ferme aujourd hui', () => {
        const choix = choisirLesRestaurants(
            [resto('trop-loin', 0.012), resto('soir', 0.001, ['18h30 - 20h00']), resto('ferme', 0.001), resto('ouvert', 0.003)],
            { fenetre, lieu, jourDeLaSemaine: 3, fermes: new Set(['ferme']) },
        );
        expect(choix.map((c) => c.restaurant.id)).toEqual(['ouvert']);
    });

    it('ecarte un restaurant sans coordonnees', () => {
        expect(choisirLesRestaurants([{ id: 'x', lat: Number.NaN, lon: 0, openingLines: ['11h30 - 13h45'] }], { fenetre, lieu, jourDeLaSemaine: 3, fermes: new Set() })).toEqual([]);
    });
});

describe('platPrincipal', () => {
    it('prend le premier plat de la categorie des plats, pas une entree', () => {
        const menu = { date: '2026-11-25', soir: [], midi: [
            { name: 'Entrées', dishes: ['Carottes râpées'] },
            { name: 'Plats', dishes: ['Autre plat :', 'Poulet  basquaise', 'Riz'] },
        ] };
        expect(platPrincipal(menu)).toBe('Poulet basquaise');
    });

    it('retombe sur la premiere categorie, et rend null sans menu', () => {
        expect(platPrincipal({ date: null, soir: [], midi: [{ name: 'Menu', dishes: ['', 'Lasagnes'] }] })).toBe('Lasagnes');
        expect(platPrincipal(undefined)).toBeNull();
        expect(platPrincipal({ date: null, soir: [], midi: [] })).toBeNull();
    });
});
