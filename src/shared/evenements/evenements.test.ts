/**
 * Les evenements du campus dans le Planning : l'ajout, le masquage, l'abonnement, la proposition, la
 * lecture qui suit les annonces, ce qui s'affiche un jour donne, ce qui part vers l'agenda.
 *
 *     npm test
 */

import moment from 'moment';
import { describe, expect, test } from 'vitest';

import {
    aRelire,
    ajouter,
    choisirAbonnement,
    doitProposer,
    estVisible,
    ETAT_VIDE,
    evenementsDeLAgenda,
    evenementsParJour,
    FRAICHEUR_MS,
    lireEtat,
    masquer,
    oublierLesAnciens,
    reconcilier,
    suiviDe,
    visibles,
    type EvenementSuivi,
} from './evenements';

const H = 60 * 60 * 1000;
/** Le 3 decembre 2026, 18 h a Paris. */
const DEBUT = Date.parse('2026-12-03T17:00:00Z');
const MAINTENANT = Date.parse('2026-12-01T09:00:00Z');

function suivi(id: string, patch: Partial<EvenementSuivi> = {}): EvenementSuivi {
    return { id, titre: `Conference ${id}`, emetteur: 'BDE Sciences', debut: DEBUT, fin: DEBUT + 2 * H, lieu: 'Amphi A22', ...patch };
}

describe('ce que l’appareil garde d’une annonce', () => {
    test('une annonce d’evenement se garde, son point avec elle', () => {
        const annonce = {
            id: 'a1', title: ' Conference ', issuer_name: 'BDE Sciences ', location: { lat: 44.8, lng: -0.6 },
            evenement: { debut: DEBUT, fin: DEBUT + 2 * H, lieu: 'Amphi A22' },
        };
        expect(suiviDe(annonce)).toEqual({ id: 'a1', titre: 'Conference', emetteur: 'BDE Sciences', debut: DEBUT, fin: DEBUT + 2 * H, lieu: 'Amphi A22', point: { lat: 44.8, lng: -0.6 } });
    });

    test('sans evenement, rien', () => {
        expect(suiviDe({ id: 'a1', title: 'Info', issuer_name: 'UKit' })).toBeNull();
    });

    test('le stockage se relit defensivement : une entree illisible s’ignore, un document illisible repart a vide', () => {
        expect(lireEtat(null)).toEqual(ETAT_VIDE);
        expect(lireEtat('etat')).toEqual(ETAT_VIDE);
        const lu = lireEtat({ ajoutes: [suivi('a'), { id: 'b' }, suivi('a'), { ...suivi('c'), fin: DEBUT }], masques: ['x', 3, 'x'], abonnement: 'oui', propose: true, publies: 'rien', luLe: 12 });
        expect(lu.ajoutes.map((s) => s.id)).toEqual(['a']);
        expect(lu.masques).toEqual(['x']);
        expect(lu.abonnement).toBe(false);
        expect(lu.propose).toBe(true);
        expect(lu.publies).toEqual([]);
        expect(lu.luLe).toBe(12);
    });
});

describe('l’ajout, le masquage, l’abonnement', () => {
    test('l’abonnement est desactive par defaut, et rien ne s’affiche', () => {
        expect(ETAT_VIDE.abonnement).toBe(false);
        expect(visibles({ ...ETAT_VIDE, publies: [suivi('a')] })).toEqual([]);
    });

    test('un ajout s’affiche, une fois, meme ajoute deux fois', () => {
        const etat = ajouter(ajouter(ETAT_VIDE, suivi('a')), suivi('a', { lieu: 'Amphi B' }));
        expect(visibles(etat).map((s) => s.lieu)).toEqual(['Amphi B']);
    });

    test('l’abonnement montre les evenements publies, sans doublon avec les ajouts', () => {
        const etat = choisirAbonnement({ ...ajouter(ETAT_VIDE, suivi('a')), publies: [suivi('a'), suivi('b')] }, true);
        expect(visibles(etat).map((s) => s.id)).toEqual(['a', 'b']);
    });

    test('masquer retire un ajout et un evenement de l’abonnement, un par un', () => {
        let etat = choisirAbonnement({ ...ajouter(ETAT_VIDE, suivi('a')), publies: [suivi('a'), suivi('b'), suivi('c')] }, true);
        etat = masquer(masquer(etat, 'a'), 'b');
        expect(visibles(etat).map((s) => s.id)).toEqual(['c']);
        expect(etat.ajoutes).toEqual([]);
        expect(estVisible(etat, 'a')).toBe(false);
    });

    test('ajouter un evenement masque le rend visible', () => {
        const etat = ajouter(masquer(ETAT_VIDE, 'a'), suivi('a'));
        expect(etat.masques).toEqual([]);
        expect(estVisible(etat, 'a')).toBe(true);
    });

    test('la proposition se fait une fois, et jamais a qui est deja abonne', () => {
        expect(doitProposer(ETAT_VIDE)).toBe(true);
        expect(doitProposer(choisirAbonnement(ETAT_VIDE, false))).toBe(false);
        expect(doitProposer({ ...ETAT_VIDE, abonnement: true })).toBe(false);
    });
});

describe('la lecture qui suit les annonces', () => {
    test('rien a suivre, rien a lire ; un ajout a venir ou l’abonnement se relisent toutes les demi-heures', () => {
        expect(aRelire(ETAT_VIDE, MAINTENANT)).toBe(false);
        expect(aRelire(ajouter(ETAT_VIDE, suivi('a', { debut: MAINTENANT - 3 * H, fin: MAINTENANT - H })), MAINTENANT)).toBe(false);
        const etat = ajouter(ETAT_VIDE, suivi('a'));
        expect(aRelire(etat, MAINTENANT)).toBe(true);
        expect(aRelire({ ...etat, luLe: MAINTENANT - FRAICHEUR_MS + 1 }, MAINTENANT)).toBe(false);
        expect(aRelire({ ...etat, luLe: MAINTENANT - FRAICHEUR_MS }, MAINTENANT)).toBe(true);
        expect(aRelire({ ...ETAT_VIDE, abonnement: true, luLe: MAINTENANT + H }, MAINTENANT)).toBe(true);
    });

    test('un evenement modifie dans la console suit son annonce', () => {
        const etat = reconcilier(ajouter(ETAT_VIDE, suivi('a')), [suivi('a', { debut: DEBUT + H, fin: DEBUT + 3 * H, lieu: 'Amphi B' })], MAINTENANT);
        expect(etat.ajoutes).toEqual([suivi('a', { debut: DEBUT + H, fin: DEBUT + 3 * H, lieu: 'Amphi B' })]);
        expect(etat.luLe).toBe(MAINTENANT);
    });

    test('un evenement a venir absent de la lecture est annule : il quitte le Planning et l’agenda', () => {
        const etat = reconcilier(ajouter(ETAT_VIDE, suivi('a')), [], MAINTENANT);
        expect(visibles(etat)).toEqual([]);
        expect(evenementsDeLAgenda(etat)).toEqual([]);
    });

    test('un evenement fini dont l’annonce a expire reste, puis s’oublie un an apres', () => {
        const passe = suivi('a', { debut: MAINTENANT - 3 * H, fin: MAINTENANT - H });
        expect(reconcilier(ajouter(ETAT_VIDE, passe), [], MAINTENANT).ajoutes).toEqual([passe]);
        expect(reconcilier(ajouter(ETAT_VIDE, passe), [], MAINTENANT + 366 * 24 * H).ajoutes).toEqual([]);
    });

    test('sans aucune lecture, un ajout fini depuis plus d’un an s’oublie aussi', () => {
        const passe = suivi('a', { debut: MAINTENANT - 3 * H, fin: MAINTENANT - H });
        const etat = ajouter(ETAT_VIDE, passe);
        expect(oublierLesAnciens(etat, MAINTENANT)).toBe(etat);
        expect(oublierLesAnciens(etat, MAINTENANT + 366 * 24 * H).ajoutes).toEqual([]);
    });

    test('l’abonnement montre la derniere lecture, et un masque sans evenement publie s’oublie', () => {
        const etat = reconcilier(masquer(masquer({ ...ETAT_VIDE, abonnement: true }, 'b'), 'z'), [suivi('b'), suivi('c')], MAINTENANT);
        expect(visibles(etat).map((s) => s.id)).toEqual(['c']);
        expect(etat.masques).toEqual(['b']);
    });
});

describe('ce qui s’affiche un jour donne', () => {
    const jour = (texte: string) => moment(texte, 'YYYY-MM-DD');

    test('un evenement s’affiche comme un calendrier du telephone : ses heures, son lieu, son organisateur, jamais un cours', () => {
        const parJour = evenementsParJour([suivi('a', { point: { lat: 44.8, lng: -0.6 } })], [jour('2026-12-02'), jour('2026-12-03')], '#009ee0');
        expect([...parJour.keys()]).toEqual(['2026-12-03']);
        const [e] = parJour.get('2026-12-03') ?? [];
        expect(e).toMatchObject({
            source: 'telephone', annonce: 'a', point: { lat: 44.8, lng: -0.6 },
            starttime: moment(DEBUT).format('HH:mm'), endtime: moment(DEBUT + 2 * H).format('HH:mm'),
            subject: 'Conference a', lieu: 'Amphi A22', description: 'BDE Sciences', category: '', color: '#009ee0',
        });
        // Il ne s'ouvre pas dans l'agenda du systeme : il n'y a pas d'evenement du telephone derriere.
        expect(e.idTelephone).toBeUndefined();
    });

    test('une soiree qui passe minuit s’affiche sur ses deux jours, bornee a chacun', () => {
        const soir = moment('2026-12-03T22:00:00').valueOf();
        const parJour = evenementsParJour([suivi('a', { debut: soir, fin: soir + 5 * H })], [jour('2026-12-03'), jour('2026-12-04')], '#009ee0');
        expect(parJour.get('2026-12-03')?.map((e) => `${e.starttime}-${e.endtime}`)).toEqual(['22:00-23:59']);
        expect(parJour.get('2026-12-04')?.map((e) => `${e.starttime}-${e.endtime}`)).toEqual(['00:00-03:00']);
    });

    test('rien a suivre, rien a projeter', () => {
        expect(evenementsParJour([], [jour('2026-12-03')], '#009ee0').size).toBe(0);
    });
});

describe('ce qui part vers l’agenda du telephone', () => {
    test('les ajoutes un par un, pas l’abonnement', () => {
        const etat = choisirAbonnement({ ...ajouter(ETAT_VIDE, suivi('a')), publies: [suivi('a'), suivi('b')] }, true);
        const agenda = evenementsDeLAgenda(etat);
        expect(agenda.map((e) => e.id)).toEqual(['annonce:a']);
        expect(agenda[0]).toMatchObject({
            subject: 'Conference a', lieu: 'Amphi A22', description: 'BDE Sciences',
            date: { start: new Date(DEBUT).toISOString(), end: new Date(DEBUT + 2 * H).toISOString() },
        });
    });

    test('un evenement masque n’y part plus', () => {
        expect(evenementsDeLAgenda(masquer(ajouter(ETAT_VIDE, suivi('a')), 'a'))).toEqual([]);
    });
});
