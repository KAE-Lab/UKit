/**
 * Ce que ces cas gardent, ce sont les **deux intervalles qui bouclent**.
 *
 * Une nuit qui commence a 22 h et des vacances qui passent le 31 decembre sont exactement les deux
 * situations ou une comparaison encadree naive rend faux **tous** les jours ou l'on aurait justement
 * voulu dire quelque chose. Le defaut ne se verrait qu'une fois par an, la nuit, chez quelqu'un
 * d'autre.
 */

import { describe, expect, it } from 'vitest';

import { choisirSalutation, regleApplicable, type RegleSalutation } from './regles';
import { SALUTATIONS_SOCLE } from './socle';

const le = (iso: string) => new Date(iso);
const regle = (partial: Partial<RegleSalutation>): RegleSalutation => ({
    id: 'essai', priorite: 0, condition: {}, cle: 'GREETING_DAY', ...partial,
});

describe('regleApplicable', () => {
    it('accepte une regle sans condition, toujours', () => {
        expect(regleApplicable(regle({}), { maintenant: le('2026-08-28T03:00:00') })).toBe(true);
    });

    it('borne les heures, fin exclue', () => {
        const nuit = regle({ condition: { heures: { de: 5, a: 12 } } });
        expect(regleApplicable(nuit, { maintenant: le('2026-08-28T05:00:00') })).toBe(true);
        expect(regleApplicable(nuit, { maintenant: le('2026-08-28T11:59:00') })).toBe(true);
        expect(regleApplicable(nuit, { maintenant: le('2026-08-28T12:00:00') })).toBe(false);
    });

    it('fait passer minuit a un intervalle d heures', () => {
        const nuit = regle({ condition: { heures: { de: 22, a: 5 } } });
        expect(regleApplicable(nuit, { maintenant: le('2026-08-28T23:30:00') })).toBe(true);
        expect(regleApplicable(nuit, { maintenant: le('2026-08-28T02:00:00') })).toBe(true);
        expect(regleApplicable(nuit, { maintenant: le('2026-08-28T12:00:00') })).toBe(false);
    });

    it('fait passer le nouvel an a une plage de dates', () => {
        const noel = regle({ condition: { plage: { du: '12-20', au: '01-05' } } });
        expect(regleApplicable(noel, { maintenant: le('2026-12-25T10:00:00') })).toBe(true);
        expect(regleApplicable(noel, { maintenant: le('2027-01-02T10:00:00') })).toBe(true);
        expect(regleApplicable(noel, { maintenant: le('2026-08-28T10:00:00') })).toBe(false);
    });

    it('borne les jours de la semaine, dimanche a zero', () => {
        const weekend = regle({ condition: { jours: [0, 6] } });
        // 2026-08-29 est un samedi, 2026-08-28 un vendredi.
        expect(regleApplicable(weekend, { maintenant: le('2026-08-29T10:00:00') })).toBe(true);
        expect(regleApplicable(weekend, { maintenant: le('2026-08-28T10:00:00') })).toBe(false);
    });

    it('exige TOUTES les conditions declarees', () => {
        const soirDeSemaine = regle({ condition: { heures: { de: 19, a: 23 }, jours: [1, 2, 3, 4, 5] } });
        expect(regleApplicable(soirDeSemaine, { maintenant: le('2026-08-28T20:00:00') })).toBe(true);
        // Samedi soir : l'heure passe, le jour non.
        expect(regleApplicable(soirDeSemaine, { maintenant: le('2026-08-29T20:00:00') })).toBe(false);
    });

    it('reconnait l anniversaire au format du dossier, quelle que soit l annee', () => {
        const anniversaire = regle({ condition: { anniversaire: true } });
        const contexte = { maintenant: le('2026-08-28T10:00:00'), naissance: '28/08/2003' };
        expect(regleApplicable(anniversaire, contexte)).toBe(true);
    });

    it('refuse plutot que de deviner quand la date de naissance est illisible ou absente', () => {
        const anniversaire = regle({ condition: { anniversaire: true } });
        const jour = le('2026-08-28T10:00:00');
        // Souhaiter un anniversaire le mauvais jour est pire que ne rien souhaiter.
        expect(regleApplicable(anniversaire, { maintenant: jour, naissance: null })).toBe(false);
        expect(regleApplicable(anniversaire, { maintenant: jour, naissance: '2003-08-28' })).toBe(false);
        expect(regleApplicable(anniversaire, { maintenant: jour })).toBe(false);
    });
});

describe('choisirSalutation', () => {
    it('prend la priorite la plus haute parmi celles qui s appliquent', () => {
        const choix = choisirSalutation(
            [regle({ id: 'bas', priorite: 0 }), regle({ id: 'haut', priorite: 50 })],
            { maintenant: le('2026-08-28T10:00:00') },
        );
        expect(choix?.id).toBe('haut');
    });

    it('fait gagner la DERNIERE a priorite egale : le distant est assemble apres le socle', () => {
        const choix = choisirSalutation(
            [regle({ id: 'socle', priorite: 10 }), regle({ id: 'publie', priorite: 10 })],
            { maintenant: le('2026-08-28T10:00:00') },
        );
        expect(choix?.id).toBe('publie');
    });

    it('rend null quand rien ne s applique', () => {
        const impossible = regle({ condition: { jours: [] } });
        expect(choisirSalutation([impossible], { maintenant: le('2026-08-28T10:00:00') })).toBeNull();
    });
});

describe('le socle', () => {
    const contexte = (iso: string, naissance?: string) => ({
        maintenant: le(iso), ...(naissance !== undefined ? { naissance } : {}),
    });

    it('a toujours quelque chose a dire, a n importe quelle heure de n importe quel jour', () => {
        for (let jour = 24; jour <= 30; jour += 1) {
            for (let heure = 0; heure < 24; heure += 1) {
                const iso = `2026-08-${jour} ${`${heure}`.padStart(2, '0')}:00:00`;
                expect(choisirSalutation(SALUTATIONS_SOCLE, { maintenant: new Date(iso) })).not.toBeNull();
            }
        }
    });

    it('dit bonsoir de 19 h a 4 h, minuit compris, et bonjour le reste du temps', () => {
        expect(choisirSalutation(SALUTATIONS_SOCLE, contexte('2026-08-28T20:00:00'))?.cle)
            .toBe('GREETING_EVENING');
        // La soiree passe minuit : a 2 h du matin, on ne dit pas encore bonjour.
        expect(choisirSalutation(SALUTATIONS_SOCLE, contexte('2026-08-28T02:00:00'))?.cle)
            .toBe('GREETING_EVENING');
        expect(choisirSalutation(SALUTATIONS_SOCLE, contexte('2026-08-28T10:00:00'))?.cle)
            .toBe('GREETING_DAY');
        expect(choisirSalutation(SALUTATIONS_SOCLE, contexte('2026-08-28T04:00:00'))?.cle)
            .toBe('GREETING_DAY');
    });

    it('fait passer l anniversaire devant tout le reste', () => {
        expect(choisirSalutation(SALUTATIONS_SOCLE, contexte('2026-08-29T20:00:00', '29/08/2003'))?.cle)
            .toBe('HAPPY_BIRTHDAY');
    });
});
