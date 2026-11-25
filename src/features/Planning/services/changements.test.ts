/** Les changements entre deux lectures : l'identite d'un cours, la memoire, les annotations (lot 6). */

import { describe, expect, it } from 'vitest';

import {
    annoter, annoterLaVue, avantEcrit, changementsVisibles, comparer, connus, DUREE_D_UN_CHANGEMENT_MS, empreinteDuCours,
    intituleDe, lectureParJour, lireLaMemoire, noter, type Changement, type EmpreinteDeCours,
} from './changements';
import type { PlanningEvent } from './PlanningAssembly';

const empreinte = (morceaux: Partial<EmpreinteDeCours> = {}): EmpreinteDeCours => ({
    id: 'c:1:1', sujet: 'Algorithmique', type: 'TD', debut: '08:00', fin: '10:00', salle: 'A22/ Salle 105', ...morceaux,
});

const cours = (morceaux: Partial<PlanningEvent> = {}): PlanningEvent => ({
    id: 'c:1:1', style: '', color: '#FFFF00', schedule: '', starttime: '08:00', endtime: '10:00',
    date: { start: '2026-11-25T08:00:00', end: '2026-11-25T10:00:00' },
    subject: 'Algorithmique', description: '', category: 'TD', group: '', lieu: 'A22/ Salle 105', ...morceaux,
});

const genres = (changements: readonly Changement[]) => changements.map((c) => c.genre);

describe('comparer', () => {
    it('ne voit rien entre deux lectures identiques', () => {
        expect(comparer([empreinte()], [empreinte()])).toEqual([]);
    });

    it('ne voit rien quand la source renumerote ses evenements', () => {
        expect(comparer([empreinte({ id: 'c:1:4' })], [empreinte({ id: 'c:1:5' })])).toEqual([]);
        expect(comparer([empreinte({ id: 'UID-A' })], [empreinte({ id: 'UID-B' })])).toEqual([]);
    });

    it('ne voit rien quand la source renomme un cours a la meme heure et dans la meme salle', () => {
        expect(comparer([empreinte({ id: 'a', sujet: 'Algo' })], [empreinte({ id: 'b', sujet: 'Algorithmique' })])).toEqual([]);
    });

    it('voit une salle changee, par l identifiant', () => {
        const [changement] = comparer([empreinte()], [empreinte({ salle: 'A29/ Amphi 1' })]);
        expect(changement).toMatchObject({ genre: 'modifie', salle: true, heure: false, avant: { salle: 'A22/ Salle 105' } });
    });

    it('voit une heure changee, meme sous un autre identifiant', () => {
        const [changement] = comparer([empreinte({ id: 'x' })], [empreinte({ id: 'y', debut: '10:15', fin: '12:15' })]);
        expect(changement).toMatchObject({ genre: 'modifie', heure: true, salle: false, avant: { debut: '08:00', fin: '10:00' } });
    });

    it('voit un cours retire', () => {
        const autre = empreinte({ id: 'c:2:1', sujet: 'Anglais', debut: '10:15', fin: '12:15' });
        expect(genres(comparer([empreinte(), autre], [empreinte()]))).toEqual(['retire']);
    });

    it('ne devine pas lequel de deux cours du meme intitule a bouge', () => {
        const avant = [empreinte({ id: 'a' }), empreinte({ id: 'b', debut: '14:00', fin: '16:00' })];
        const apres = [empreinte({ id: 'c', debut: '09:00', fin: '11:00' }), empreinte({ id: 'd', debut: '15:00', fin: '17:00' })];
        expect(genres(comparer(avant, apres))).toEqual(['retire', 'retire']);
    });

    it('ne compte pas une salle qui apparait la ou la source n en donnait pas', () => {
        expect(comparer([empreinte({ salle: '' })], [empreinte()])).toEqual([]);
    });

    it('ignore la casse et les espaces de la salle', () => {
        expect(comparer([empreinte({ salle: 'a22/  salle 105' })], [empreinte()])).toEqual([]);
    });
});

describe('empreinteDuCours et lectureParJour', () => {
    it('ecarte le telephone et les journees entieres', () => {
        expect(empreinteDuCours(cours({ source: 'telephone' }))).toBeNull();
        expect(empreinteDuCours(cours({ journeeEntiere: true }))).toBeNull();
    });

    it('lit la salle que la carte affiche', () => {
        expect(empreinteDuCours(cours())?.salle).toBe('A22/ Salle 105');
    });

    it('donne une liste vide a un jour lu sans cours', () => {
        const lecture = lectureParJour([cours()], ['2026-11-25', '2026-11-26']);
        expect(lecture.get('2026-11-25')).toHaveLength(1);
        expect(lecture.get('2026-11-26')).toEqual([]);
    });
});

describe('noter', () => {
    const jour = '2026-11-25';
    const t0 = Date.parse('2026-11-25T07:00:00');
    const lire = (liste: EmpreinteDeCours[]) => new Map([[jour, liste]]);

    it('ne voit rien a la premiere lecture d un jour', () => {
        const { changements, memoire } = noter(null, 'ub|L3', lire([empreinte()]), t0, jour);
        expect(changements.size).toBe(0);
        expect(memoire.jours[jour]?.base).toHaveLength(1);
    });

    it('garde un changement vingt-quatre heures, meme a la relecture suivante', () => {
        const premiere = noter(null, 'ub|L3', lire([empreinte()]), t0, jour).memoire;
        const deuxieme = noter(premiere, 'ub|L3', lire([empreinte({ salle: 'A29' })]), t0 + 1000, jour);
        expect(genres(deuxieme.changements.get(jour) ?? [])).toEqual(['modifie']);
        const troisieme = noter(deuxieme.memoire, 'ub|L3', lire([empreinte({ salle: 'A29' })]), t0 + 60_000, jour);
        expect(genres(troisieme.changements.get(jour) ?? [])).toEqual(['modifie']);
        expect(connus(troisieme.memoire, 'ub|L3', [jour], t0 + 60_000).get(jour)).toHaveLength(1);
        const apres = noter(troisieme.memoire, 'ub|L3', lire([empreinte({ salle: 'A29' })]), t0 + 1000 + DUREE_D_UN_CHANGEMENT_MS + 1, jour);
        expect(apres.changements.size).toBe(0);
        expect(connus(apres.memoire, 'ub|L3', [jour], t0 + DUREE_D_UN_CHANGEMENT_MS * 2).size).toBe(0);
    });

    it('dit un second changement vu apres les vingt-quatre heures du premier, et lui seul', () => {
        const premiere = noter(null, 'ub|L3', lire([empreinte(), empreinte({ id: 'b', sujet: 'Anglais', debut: '14:00', fin: '16:00' })]), t0, jour).memoire;
        const salle = noter(premiere, 'ub|L3', lire([empreinte({ salle: 'A29' }), empreinte({ id: 'b', sujet: 'Anglais', debut: '14:00', fin: '16:00' })]), t0 + 1000, jour).memoire;
        const plusTard = t0 + 26 * 3_600_000;
        const heure = noter(salle, 'ub|L3', lire([empreinte({ salle: 'A29' }), empreinte({ id: 'b', sujet: 'Anglais', debut: '15:00', fin: '17:00' })]), plusTard, jour);
        expect(heure.changements.get(jour)).toMatchObject([{ genre: 'modifie', heure: true, salle: false }]);
    });

    it('donne ses vingt-quatre heures a un changement vu tard', () => {
        const premiere = noter(null, 'ub|L3', lire([empreinte(), empreinte({ id: 'b', sujet: 'Anglais', debut: '14:00' })]), t0, jour).memoire;
        const a = noter(premiere, 'ub|L3', lire([empreinte({ salle: 'A29' }), empreinte({ id: 'b', sujet: 'Anglais', debut: '14:00' })]), t0 + 1000, jour).memoire;
        const b = noter(a, 'ub|L3', lire([empreinte({ salle: 'A29' }), empreinte({ id: 'b', sujet: 'Anglais', debut: '15:00' })]), t0 + 23 * 3_600_000, jour).memoire;
        expect(connus(b, 'ub|L3', [jour], t0 + 30 * 3_600_000).get(jour)).toHaveLength(2);
    });

    it('efface un changement quand la source revient a l etat d avant', () => {
        const premiere = noter(null, 'ub|L3', lire([empreinte()]), t0, jour).memoire;
        const deuxieme = noter(premiere, 'ub|L3', lire([empreinte({ salle: 'A29' })]), t0 + 1000, jour).memoire;
        expect(noter(deuxieme, 'ub|L3', lire([empreinte()]), t0 + 2000, jour).changements.size).toBe(0);
    });

    it('repart de zero pour une autre identite', () => {
        const premiere = noter(null, 'ub|L3', lire([empreinte()]), t0, jour).memoire;
        const autre = noter(premiere, 'iut|', lire([]), t0 + 1000, jour);
        expect(autre.changements.size).toBe(0);
        expect(connus(autre.memoire, 'ub|L3', [jour], t0 + 1000).size).toBe(0);
    });

    it('oublie les jours passes et ne note pas une lecture d hier', () => {
        const hier = noter(null, 'ub|L3', new Map([['2026-11-24', [empreinte()]]]), t0, '2026-11-24').memoire;
        const { memoire } = noter(hier, 'ub|L3', new Map([['2026-11-24', []], [jour, [empreinte()]]]), t0 + 86_400_000, jour);
        expect(Object.keys(memoire.jours)).toEqual([jour]);
    });

    it('relit une memoire ecrite, et repart de zero sur un texte casse', () => {
        const { memoire } = noter(null, 'ub|L3', lire([empreinte()]), t0, jour);
        expect(lireLaMemoire(JSON.stringify(memoire))?.identite).toBe('ub|L3');
        expect(lireLaMemoire('{')).toBeNull();
        expect(lireLaMemoire('{"jours":{}}')).toBeNull();
    });
});

describe('les annotations', () => {
    const salle: Changement = { genre: 'modifie', cours: empreinte({ salle: 'A29' }), avant: { debut: '08:00', fin: '10:00', salle: 'A22' }, heure: false, salle: true };
    const heure: Changement = { genre: 'modifie', cours: empreinte({ debut: '10:15' }), avant: { debut: '08:00', fin: '10:00', salle: 'A22' }, heure: true, salle: false };

    it('ecrit l intitule sans le code d UE, comme la carte du cours', () => {
        expect(intituleDe(empreinte({ sujet: '4TIN511U  Algorithmique' }))).toBe('Algorithmique');
        expect(intituleDe(empreinte({ sujet: 'Anglais' }))).toBe('Anglais');
    });

    it('ecrit ce qui etait avant : l heure, la salle, ou les deux', () => {
        expect(avantEcrit(salle)).toBe('A22');
        expect(avantEcrit(heure)).toBe('08:00–10:00');
        expect(avantEcrit({ ...salle, heure: true })).toBe('08:00–10:00, A22');
    });

    it('ne repete pas le debut que l ancienne salle partage avec la nouvelle', () => {
        const long: Changement = { ...salle, cours: empreinte({ salle: 'CREMI - Bât. A28 Salle 204' }), avant: { debut: '08:00', fin: '10:00', salle: 'CREMI - Bât. A22 Salle 105' } };
        expect(avantEcrit(long)).toBe('A22 Salle 105');
        const meme: Changement = { ...salle, cours: empreinte({ salle: 'A22 Salle 105' }), avant: { debut: '08:00', fin: '10:00', salle: 'A22 Salle 105 bis' } };
        expect(avantEcrit(meme)).toBe('A22 Salle 105 bis');
    });

    it('pose l avant sur la carte du cours, par son identifiant et son debut', () => {
        const [annote, autre, telephone] = annoter([cours(), cours({ id: 'c:9:1' }), cours({ source: 'telephone' })], [salle]);
        expect(annote.avant).toBe('A22');
        expect(autre.avant).toBeUndefined();
        expect(telephone.avant).toBeUndefined();
    });

    it('tait un cours que le filtre d UE masque', () => {
        const retire: Changement = { genre: 'retire', cours: empreinte({ sujet: 'Anglais', modules: ['4TTV523U Anglais'] }) };
        const masque = (c: { modules?: string[] }) => (c.modules ?? []).some((m) => m.startsWith('4TTV523U'));
        expect(changementsVisibles([retire, salle], masque)).toEqual([salle]);
    });

    it('annote une semaine jour par jour, et ne rend les changements du jour que pour la vue jour', () => {
        const changements = new Map([['2026-11-25', [salle]]]);
        const semaine = annoterLaVue({ semaine: [{ courses: [cours()] }, { courses: [cours()] }] }, ['2026-11-25', '2026-11-26'], changements, () => false);
        expect(semaine.semaine?.map((j) => j.courses[0].avant)).toEqual(['A22', undefined]);
        expect(semaine.duJour).toEqual([]);
        expect(annoterLaVue({ jour: [cours()] }, ['2026-11-25'], changements, () => false).duJour).toEqual([salle]);
    });
});
