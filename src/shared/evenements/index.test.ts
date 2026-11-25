/**
 * Le magasin des evenements : les gestes se suivent sans s'effacer, la lecture des annonces reconcilie,
 * un echec ne retire rien, l'agenda n'est prevenu que quand il change. Le stockage, la base et le theme
 * sont remplaces : rien ne touche le disque ni le reseau.
 *
 *     npm test
 */

import moment from 'moment';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { BdeAnnonce } from '../../features/Campus/services/BdeService';

const stockage = new Map<string, string>();
const lecture = vi.fn();
const MAINTENANT = Date.parse('2026-12-01T09:00:00Z');

vi.mock('@react-native-async-storage/async-storage', () => ({
    default: {
        getItem: async (cle: string) => stockage.get(cle) ?? null,
        setItem: async (cle: string, valeur: string) => { stockage.set(cle, valeur); },
        removeItem: async (cle: string) => { stockage.delete(cle); },
    },
}));
vi.mock('../../features/Campus/services/BdeService', () => ({ default: { fetchEvenements: () => lecture() } }));
vi.mock('../theme/Theme', () => ({ default: { colors: { brand: '#009ee0' } } }));
vi.mock('../services/Temps', () => ({ maintenantMs: () => MAINTENANT }));

const H = 60 * 60 * 1000;
const DEBUT = Date.parse('2026-12-03T17:00:00Z');

function annonce(id: string, lieu = 'Amphi A22'): BdeAnnonce {
    return { id, title: `Conference ${id}`, issuer_name: 'BDE Sciences', evenement: { debut: DEBUT, fin: DEBUT + 2 * H, lieu } } as BdeAnnonce;
}

/** Un module neuf a chaque test : l'etat en memoire repart du stockage. */
async function magasin() {
    vi.resetModules();
    return import('./index');
}

beforeEach(() => {
    stockage.clear();
    lecture.mockReset();
});

describe('le magasin des evenements', () => {
    test('deux gestes a la suite s’ajoutent, et le second ne rejoue pas l’etat du premier chargement', async () => {
        const m = await magasin();
        await m.masquerDuPlanning('x');
        await m.choisirLAbonnement(false);
        await m.masquerDuPlanning('y');
        const garde = JSON.parse(stockage.get('evenements-planning@1') ?? '{}') as { masques: string[]; propose: boolean };
        expect(garde.masques).toEqual(['x', 'y']);
        expect(garde.propose).toBe(true);
    });

    test('deux gestes lances ensemble, avant meme la lecture du stockage, s’ajoutent aussi', async () => {
        const m = await magasin();
        await Promise.all([m.masquerDuPlanning('x'), m.masquerDuPlanning('y')]);
        const garde = JSON.parse(stockage.get('evenements-planning@1') ?? '{}') as { masques: string[] };
        expect([...garde.masques].sort()).toEqual(['x', 'y']);
    });

    test('l’etat survit a un redemarrage, et la reinitialisation l’efface', async () => {
        lecture.mockResolvedValue({ ok: true, annonces: [annonce('a')] });
        let m = await magasin();
        await m.choisirLAbonnement(true);
        m = await magasin();
        const jours = [moment('2026-12-03', 'YYYY-MM-DD')];
        expect((await m.evenementsDuCampus(jours)).get('2026-12-03')?.map((e) => e.annonce)).toEqual(['a']);
        await m.oublierLesEvenements();
        expect((await m.evenementsDuCampus(jours)).size).toBe(0);
        expect(stockage.has('evenements-planning@1')).toBe(false);
    });

    test('une lecture reussie reconcilie, un echec ne retire rien', async () => {
        lecture.mockResolvedValueOnce({ ok: true, annonces: [annonce('a')] });
        const m = await magasin();
        await m.choisirLAbonnement(true);
        lecture.mockResolvedValueOnce({ ok: false, failure: { kind: 'network' } });
        await m.rafraichirLesEvenements(true);
        expect((await m.evenementsASynchroniser())).toEqual([]);
        const jours = [moment('2026-12-03', 'YYYY-MM-DD')];
        expect((await m.evenementsDuCampus(jours)).get('2026-12-03')).toHaveLength(1);
        lecture.mockResolvedValueOnce({ ok: true, annonces: [] });
        await m.rafraichirLesEvenements(true);
        expect((await m.evenementsDuCampus(jours)).size).toBe(0);
    });

    test('l’ajout entre dans le Planning et l’agenda, et la proposition ne vient qu’une fois', async () => {
        const m = await magasin();
        const agenda = vi.fn();
        m.abonnerALAgenda(agenda);
        expect(await m.ajouterAuPlanning(annonce('a'))).toEqual({ proposer: true });
        expect(agenda).toHaveBeenCalledTimes(1);
        expect((await m.evenementsASynchroniser()).map((e) => e.id)).toEqual(['annonce:a']);
        await m.choisirLAbonnement(false);
        expect(await m.ajouterAuPlanning(annonce('b'))).toEqual({ proposer: false });
        await m.masquerDuPlanning('a');
        expect((await m.evenementsASynchroniser()).map((e) => e.id)).toEqual(['annonce:b']);
        expect(agenda).toHaveBeenCalledTimes(3);
    });

    test('un evenement ajoute suit son annonce deplacee, et l’agenda l’apprend', async () => {
        const m = await magasin();
        await m.ajouterAuPlanning(annonce('a'));
        const agenda = vi.fn();
        m.abonnerALAgenda(agenda);
        lecture.mockResolvedValueOnce({ ok: true, annonces: [annonce('a', 'Amphi B')] });
        await m.rafraichirLesEvenements();
        expect((await m.evenementsASynchroniser())[0]?.lieu).toBe('Amphi B');
        expect(agenda).toHaveBeenCalledTimes(1);
        // Relue sans changement, une demi-heure plus tard ou de force : l'agenda n'est pas reprevenu.
        lecture.mockResolvedValueOnce({ ok: true, annonces: [annonce('a', 'Amphi B')] });
        await m.rafraichirLesEvenements(true);
        expect(agenda).toHaveBeenCalledTimes(1);
    });

    test('rien a suivre, rien a lire', async () => {
        const m = await magasin();
        await m.rafraichirLesEvenements();
        expect(lecture).not.toHaveBeenCalled();
    });

    test('l’agenda n’est prevenu que quand ce qu’il porte change', async () => {
        lecture.mockResolvedValue({ ok: true, annonces: [annonce('a')] });
        const m = await magasin();
        const agenda = vi.fn();
        m.abonnerALAgenda(agenda);
        await m.choisirLAbonnement(true);
        // L'abonnement ne part pas vers l'agenda : rien a resynchroniser.
        expect(agenda).not.toHaveBeenCalled();
        await m.masquerDuPlanning('a');
        expect(agenda).not.toHaveBeenCalled();
    });
});
