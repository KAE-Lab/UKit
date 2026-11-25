/**
 * La moderation sans ecran : la ligne de la base lue sans cle, les lieux ranges et filtres, l'etat d'un
 * lieu calcule sur tous ses signalements meme filtres, les comptes, la fin d'un etat promu officiel.
 */

import { describe, expect, test } from 'vitest';

import type { EtatOfficiel } from '../../../../src/shared/communaute/lieu';
import { compter, finDeLOfficiel, lieux, lireSignalementModere, SANS_FILTRE, type SignalementModere } from './moderation';

const T0 = Date.parse('2026-11-25T11:00:00Z');
const MINUTE = 60_000;
const SOIR = Date.parse('2026-11-25T23:00:00Z');

let n = 0;
function s(sujet: string, cible: string, valeur: string, minutes: number, autres: Partial<SignalementModere> = {}): SignalementModere {
    n += 1;
    return {
        id: `s-${n}`, sujet, cible, valeur, fin: null, poids: 1, statut: 'active', creeLe: T0 + minutes * MINUTE, expireLe: SOIR,
        majLe: T0 + minutes * MINUTE, auteurBloque: false, auteurDuJour: 1, ...autres,
    };
}

describe('une ligne de la base', () => {
    test('lue avec son auteur, jamais sa cle', () => {
        const ligne = {
            id: 'a', sujet: 'restaurant.ferme', cible: '21', valeur: 'oui', fin: null, poids: 1, statut: 'active',
            cree_le: '2026-11-25T11:00:00Z', expire_le: '2026-11-25T23:00:00Z', maj_le: '2026-11-25T11:00:00Z', auteur_bloque: true, auteur_du_jour: 4,
        };
        expect(lireSignalementModere(ligne)).toMatchObject({ id: 'a', auteurBloque: true, auteurDuJour: 4 });
        expect(lireSignalementModere({ ...ligne, poids: 7 })).toBeNull();
    });
});

describe('les lieux', () => {
    const tous = [
        s('restaurant.ferme', '21', 'oui', 0), s('restaurant.ferme', '21', 'oui', 5), s('restaurant.izly', '21', 'oui', 6, { poids: 0 }),
        s('batiment.wifi', 'bordeaux/A28', 'oui', 20, { statut: 'masquee' }), s('inconnu.sujet', '9', 'x', 30),
    ];

    test('ranges par lieu, le plus actif d abord, sans les sujets inconnus', () => {
        const l = lieux(tous, [], SANS_FILTRE, T0 + 40 * MINUTE);
        expect(l.map((x) => `${x.domaine}|${x.cible}`)).toEqual(['batiment|bordeaux/A28', 'restaurant|21']);
        expect(l[1]!.signalements.map((x) => x.id)).toEqual([tous[2]!.id, tous[1]!.id, tous[0]!.id]);
        expect(l[1]!.etats.find((e) => e.sujet.sujet === 'restaurant.ferme')!.etat.communaute).toMatchObject({ nature: 'etabli', voix: 2 });
    });

    test('un filtre choisit ce qu on regarde, pas l etat du lieu', () => {
        const l = lieux(tous, [], { domaine: 'restaurant', sujet: null, statut: 'non_verifie' }, T0 + 40 * MINUTE);
        expect(l).toHaveLength(1);
        expect(l[0]!.signalements.map((x) => x.sujet)).toEqual(['restaurant.izly']);
        expect(l[0]!.etats.find((e) => e.sujet.sujet === 'restaurant.ferme')!.etat.communaute.nature).toBe('etabli');
        expect(lieux(tous, [], { ...SANS_FILTRE, statut: 'masquee' }, T0).map((x) => x.cible)).toEqual(['bordeaux/A28']);
    });

    test('un lieu sans signalement mais avec un officiel valable se montre', () => {
        const o: EtatOfficiel = { id: 'o', sujet: 'bibliotheque.fermee', cible: 'bu-1', valeur: 'oui', fin: '2026-11-25', creeLe: T0, expireLe: SOIR };
        const l = lieux([], [o], SANS_FILTRE, T0 + MINUTE);
        expect(l.map((x) => x.cible)).toEqual(['bu-1']);
        expect(l[0]!.etats.find((e) => e.sujet.sujet === 'bibliotheque.fermee')!.etat.prime).toBe('officiel');
        expect(lieux([], [{ ...o, expireLe: T0 }], SANS_FILTRE, T0 + MINUTE)).toEqual([]);
    });

    test('les comptes', () => {
        expect(compter(tous, SANS_FILTRE)).toEqual({ signalements: 4, voix: 2, nonVerifies: 1, masques: 1, lieux: 2 });
    });
});

describe('la fin d un etat promu officiel', () => {
    test('ce soir, sa date, ou un mois pour une correction', () => {
        const [lieu] = lieux([s('restaurant.ferme_jusqu', '21', 'oui', 0, { fin: '2026-11-28' }), s('restaurant.horaires', '21', 'a41f09c2|midi=1130-1400', 1), s('restaurant.ferme', '21', 'oui', 2)], [], SANS_FILTRE, T0 + 5 * MINUTE);
        const fin = (sujet: string) => finDeLOfficiel(lieu!.etats.find((e) => e.sujet.sujet === sujet)!, '2026-11-25');
        expect(fin('restaurant.ferme_jusqu')).toBe('2026-11-28');
        expect(fin('restaurant.horaires')).toBe('2026-12-25');
        expect(fin('restaurant.ferme')).toBe('2026-11-25');
    });
});
