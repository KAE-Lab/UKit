/**
 * Le compte des seances restantes, sur les formes mesurees le 2026-11-10 (seancesRestantes.ts).
 *
 * Les identifiants, codes et descriptions sont synthetiques ; leur **forme** est celle de Celcat et
 * d'ADE : `<prefixe>:<evenement>:<occurrence>`, des series paralleles au meme instant, les creneaux
 * d'un autre sous-groupe dans le meme planning, un rattrapage ponctuel.
 */

import { describe, expect, it } from 'vitest';

import { semestreDe } from '../../Onboarding/hooks/semestres';
import {
    finDuSemestre,
    phraseDuCompte,
    seancesRestantes,
    type CoursCompte,
    type DemandeDeCompte,
} from './seancesRestantes';

const PREFIXE = '-1000:-2000:7';

/** Un cours Celcat : la serie `evenement`, l'occurrence `semaine`, un lundi d'automne a 14 h. */
function celcat(evenement: number, jour: string, options: Partial<{ heure: string; type: string; modules: string[] }> = {}): CoursCompte {
    const debut = `${jour}T${options.heure ?? '14:00'}:00`;
    return {
        id: `${PREFIXE}:${evenement}:${jour.replace(/-/g, '')}`,
        category: options.type ?? 'TD',
        description: 'Salle 101\nINF000A',
        modules: options.modules ?? ['4TXX501U Algorithmique'],
        date: { start: debut, end: new Date(Date.parse(debut) + 80 * 60 * 1000).toISOString() },
    };
}

/** Les lundis de l'automne 2026, du 7 septembre au 30 novembre. */
const LUNDIS = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'];

const MAINTENANT = Date.parse('2026-11-10T08:00:00');

function demande(cours: CoursCompte, annee: CoursCompte[], autres: Partial<DemandeDeCompte> = {}): DemandeDeCompte {
    return { cours, annee, source: 'celcat', filtres: [], maintenant: MAINTENANT, ...autres };
}

describe('seancesRestantes, sur Celcat', () => {
    const serie = LUNDIS.map((jour) => celcat(100, jour));

    it('compte les occurrences restantes de la serie', () => {
        // Le 16 novembre : restent le 23 et le 30.
        expect(seancesRestantes(demande(serie[9], serie))).toBe(2);
    });

    it('rend 0 pour la derniere seance', () => {
        expect(seancesRestantes(demande(serie[11], serie))).toBe(0);
    });

    it('se tait pour une seance terminee', () => {
        expect(seancesRestantes(demande(serie[7], serie))).toBeNull();
    });

    it('compte une seule fois les series paralleles au meme instant', () => {
        // Trois enseignants le meme lundi a 14 h : une seance pour qui en suit une.
        const paralleles = [...serie, ...LUNDIS.map((jour) => celcat(101, jour)), ...LUNDIS.map((jour) => celcat(102, jour))];
        expect(seancesRestantes(demande(serie[9], paralleles))).toBe(2);
    });

    it('se tait quand un autre sous-groupe a son creneau ailleurs', () => {
        // Le meme TD, le vendredi a 8 h pour « groupe 3 » : on ne sait pas lequel l'etudiant suit.
        const vendredis = ['2026-11-20', '2026-11-27'].map((jour) => celcat(200, jour, { heure: '08:00' }));
        expect(seancesRestantes(demande(serie[9], [...serie, ...vendredis]))).toBeNull();
    });

    it('se tait devant un rattrapage a venir hors de la serie', () => {
        const rattrapage = celcat(300, '2026-11-25', { heure: '11:00' });
        expect(seancesRestantes(demande(serie[9], [...serie, rattrapage]))).toBeNull();
    });

    it('ignore ce qui est passe hors de la serie', () => {
        const rattrapage = celcat(300, '2026-09-09', { heure: '11:00' });
        expect(seancesRestantes(demande(serie[9], [...serie, rattrapage]))).toBe(2);
    });

    it('ne compte ni un autre type ni une autre UE', () => {
        const cm = LUNDIS.map((jour) => celcat(400, jour, { heure: '09:30', type: 'Cours' }));
        const autreUe = LUNDIS.map((jour) => celcat(401, jour, { heure: '16:00', modules: ['4TXX502U Logique'] }));
        expect(seancesRestantes(demande(serie[9], [...serie, ...cm, ...autreUe]))).toBe(2);
    });

    it('distingue un cours a deux UE de l une d elles seule', () => {
        const double = LUNDIS.map((jour) => celcat(500, jour, { heure: '16:00', modules: ['4TXX501U Algorithmique', '4TXX601U Algorithms'] }));
        expect(seancesRestantes(demande(serie[9], [...serie, ...double]))).toBe(2);
    });

    it('se tait quand la seance est masquee par un filtre', () => {
        expect(seancesRestantes(demande(serie[9], serie, { filtres: ['4TXX501U'] }))).toBeNull();
    });

    it('se tait quand la seance n est pas dans l annee lue (autre groupe, autre annee)', () => {
        const ailleurs = celcat(999, '2026-11-16');
        expect(seancesRestantes(demande(ailleurs, serie))).toBeNull();
        expect(seancesRestantes(demande({ ...serie[9], id: undefined } as unknown as CoursCompte, serie))).toBeNull();
    });

    it('se tait sans code d UE, sans type ou sans identifiant de serie lisible', () => {
        const sansCode = LUNDIS.map((jour) => celcat(600, jour, { modules: ['Reunion'] }));
        expect(seancesRestantes(demande(sansCode[9], sansCode))).toBeNull();
        const sansType = LUNDIS.map((jour) => celcat(601, jour, { type: '' }));
        expect(seancesRestantes(demande(sansType[9], sansType))).toBeNull();
        const autreForme = serie.map((cours, rang) => ({ ...cours, id: `evenement-${rang}` }));
        expect(seancesRestantes(demande(autreForme[9], autreForme))).toBeNull();
    });

    it('se tait quand le meme enseignement continue au semestre suivant', () => {
        const fevrier = celcat(100, '2027-02-01');
        expect(seancesRestantes(demande(serie[9], [...serie, fevrier]))).toBeNull();
    });
});

/** Un evenement ADE projete : salle en tete, puis le code de module, les groupes, l'enseignant. */
function ade(uid: string, debut: string, options: Partial<{ salle: string; module: string; groupe: string; enseignant: string; type: string }> = {}): CoursCompte {
    const fin = new Date(Date.parse(debut) + 80 * 60 * 1000).toISOString();
    return {
        id: uid,
        category: options.type ?? 'TD',
        description: [options.salle ?? 'XX-S100', options.module ?? 'ABC7-DEFGH', options.groupe ?? '2A GR1', options.enseignant ?? 'ENSEIGNANT Un'].join('\n'),
        date: { start: new Date(debut).toISOString(), end: fin },
    };
}

describe('seancesRestantes, sur un export iCalendar', () => {
    const mardis = ['2026-11-03', '2026-11-17', '2026-11-24', '2026-12-01'].map((jour, rang) => ade(`uid-${rang}`, `${jour}T09:30:00`, { salle: `XX-S10${rang}` }));

    it('compte la serie que designent le code, les groupes et l enseignant, salle changeante comprise', () => {
        expect(seancesRestantes(demande(mardis[1], mardis, { source: 'ical' }))).toBe(2);
    });

    it('se tait quand un autre groupe suit le meme module a un autre instant', () => {
        const gr2 = ade('uid-gr2', '2026-11-26T14:00:00', { groupe: '2A GR2' });
        expect(seancesRestantes(demande(mardis[1], [...mardis, gr2], { source: 'ical' }))).toBeNull();
    });

    it('se tait sans code de module : un lien d une autre forme', () => {
        const libre = mardis.map((cours) => ({ ...cours, description: 'Salle 3\nM. Personne' }));
        expect(seancesRestantes(demande(libre[1], libre, { source: 'abonnement' }))).toBeNull();
    });

    it('un lien colle ne compte que s il couvre le semestre entier', () => {
        expect(seancesRestantes(demande(mardis[1], mardis, { source: 'abonnement' }))).toBeNull();
        const printemps = ade('uid-printemps', '2027-02-09T09:30:00', { module: 'ABC8-IJKLM' });
        expect(seancesRestantes(demande(mardis[1], [...mardis, printemps], { source: 'abonnement' }))).toBe(2);
    });
});

describe('finDuSemestre', () => {
    it('suit le decoupage de l accueil, mois par mois', () => {
        for (let mois = 0; mois < 12; mois += 1) {
            const instant = new Date(2026, mois, 15, 12).getTime();
            const fin = finDuSemestre(instant);
            expect(semestreDe(new Date(fin - 1)).id).toBe(semestreDe(new Date(instant)).id);
            expect(semestreDe(new Date(fin)).id).not.toBe(semestreDe(new Date(instant)).id);
        }
    });

    it('borne l automne au 1er fevrier et le printemps au 1er aout, a minuit local', () => {
        expect(finDuSemestre(Date.parse('2026-11-16T14:00:00'))).toBe(Date.parse('2027-02-01T00:00:00'));
        expect(finDuSemestre(Date.parse('2027-01-20T14:00:00'))).toBe(Date.parse('2027-02-01T00:00:00'));
        expect(finDuSemestre(Date.parse('2027-03-02T14:00:00'))).toBe(Date.parse('2027-08-01T00:00:00'));
    });
});

describe('phraseDuCompte', () => {
    it('choisit la cle selon le nombre', () => {
        expect(phraseDuCompte(0, 'TD')).toEqual({ cle: 'SESSIONS_LAST', args: ['TD'] });
        expect(phraseDuCompte(1, 'TD')).toEqual({ cle: 'SESSIONS_LEFT_ONE', args: ['TD'] });
        expect(phraseDuCompte(3, 'TD Machine')).toEqual({ cle: 'SESSIONS_LEFT', args: [3, 'TD Machine'] });
    });

    it('elide devant une voyelle ou un h', () => {
        expect(phraseDuCompte(2, 'Examen TD Machine').cle).toBe('SESSIONS_LEFT_ELISION');
        expect(phraseDuCompte(0, 'Oraux').cle).toBe('SESSIONS_LAST_ELISION');
        expect(phraseDuCompte(1, ' Heure de vie de classe').cle).toBe('SESSIONS_LEFT_ONE_ELISION');
        expect(phraseDuCompte(2, 'Cours/TD').cle).toBe('SESSIONS_LEFT');
    });
});
