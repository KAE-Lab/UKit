import { afterEach, describe, expect, it } from 'vitest';
import type { Blueprint } from '@aetherius/engine';

import {
    REFROIDISSEMENTS_MS,
    SEUIL_ECHECS,
    apresEchec,
    estOuvert,
    etatDesHotes,
    hoteDe,
    hoteDuRun,
    hoteOuvert,
    noterEchec,
    noterSucces,
    rearmer,
    refroidissementLisible,
} from './disjoncteur';

const T0 = 1_000_000;

function blueprint(partiel: Partial<Blueprint>): Blueprint {
    return { aetherius: '1', name: 'ukit.test', act: 'vector', ...partiel } as Blueprint;
}

afterEach(() => rearmer());

describe('hoteDe', () => {
    it('extrait l hote en minuscules, port compris, sans chemin ni requete', () => {
        expect(hoteDe('https://Celcat.u-bordeaux.fr/calendar?x=1#f')).toBe('celcat.u-bordeaux.fr');
        expect(hoteDe('http://127.0.0.1:1/Home')).toBe('127.0.0.1:1');
    });

    it('rend null pour un gabarit, une adresse non http ou une non-chaine', () => {
        expect(hoteDe('{{ inputs.domaine }}/Home/GetCalendarData')).toBeNull();
        expect(hoteDe('mailto:contact@kaelab.dev')).toBeNull();
        expect(hoteDe(42)).toBeNull();
        expect(hoteDe(undefined)).toBeNull();
    });
});

describe('hoteDuRun', () => {
    it('prefere inputs.domaine, puis inputs.lien, puis vars.domaine, puis vars.api', () => {
        const bp = blueprint({ vars: { domaine: 'https://vars.example', api: 'https://api.example' } });
        expect(hoteDuRun(bp, { domaine: 'https://celcat.u-bordeaux.fr/calendar' }, 'n')).toBe('celcat.u-bordeaux.fr');
        expect(hoteDuRun(bp, { lien: 'https://flaubert2.u-bordeaux-montaigne.fr/Telechargements/ical/secret' }, 'n')).toBe('flaubert2.u-bordeaux-montaigne.fr');
        expect(hoteDuRun(bp, {}, 'n')).toBe('vars.example');
        expect(hoteDuRun(blueprint({ vars: { api: 'https://api.affluences.com' } }), undefined, 'n')).toBe('api.affluences.com');
    });

    it('lit l adresse litterale du premier pas, et ignore un pas en gabarit', () => {
        const bp = blueprint({ steps: [{ action: 'http.request', url: '{{ vars.x }}/a' }, { action: 'http.request', url: 'https://api.croustillant.menu/v1' }] });
        expect(hoteDuRun(bp, {}, 'n')).toBe('api.croustillant.menu');
    });

    it('retombe sur le nom du Blueprint', () => {
        expect(hoteDuRun(blueprint({}), {}, 'ukit.portail.bordeaux.dossier')).toBe('ukit.portail.bordeaux.dossier');
        expect(hoteDuRun(undefined, undefined, 'ukit.x')).toBe('ukit.x');
    });
});

describe('apresEchec et estOuvert', () => {
    it('n ouvre qu au troisieme echec consecutif', () => {
        const un = apresEchec(undefined, 'h', T0);
        const deux = apresEchec(un.etat, 'h', T0);
        expect(un.ouverture).toBe(false);
        expect(deux.ouverture).toBe(false);
        expect(estOuvert(deux.etat, T0)).toBe(false);
        const trois = apresEchec(deux.etat, 'h', T0);
        expect(trois.ouverture).toBe(true);
        expect(trois.etat.echecs).toBe(SEUIL_ECHECS);
        expect(trois.etat.palier).toBe(0);
        expect(estOuvert(trois.etat, T0 + REFROIDISSEMENTS_MS[0] - 1)).toBe(true);
        expect(estOuvert(trois.etat, T0 + REFROIDISSEMENTS_MS[0])).toBe(false);
    });

    it('monte d un palier a chaque echec apres un refroidissement ecoule, et plafonne', () => {
        let verdict = apresEchec(undefined, 'h', T0);
        verdict = apresEchec(verdict.etat, 'h', T0);
        verdict = apresEchec(verdict.etat, 'h', T0);
        const t1 = T0 + REFROIDISSEMENTS_MS[0] + 5;
        verdict = apresEchec(verdict.etat, 'h', t1);
        expect(verdict.ouverture).toBe(true);
        expect(verdict.etat.palier).toBe(1);
        expect(verdict.etat.ouvertJusqua).toBe(t1 + REFROIDISSEMENTS_MS[1]);
        const t2 = t1 + REFROIDISSEMENTS_MS[1];
        verdict = apresEchec(verdict.etat, 'h', t2);
        expect(verdict.etat.palier).toBe(2);
        verdict = apresEchec(verdict.etat, 'h', t2 + REFROIDISSEMENTS_MS[2]);
        expect(verdict.etat.palier).toBe(2);
        expect(verdict.etat.ouvertJusqua).toBe(t2 + 2 * REFROIDISSEMENTS_MS[2]);
    });

    it('un echec pendant le refroidissement rearme la fenetre sans monter ni rejournaliser', () => {
        // Les dix-sept runs paralleles d'une fiche de batiment : un seul palier, pas dix-sept.
        let verdict = apresEchec(undefined, 'h', T0);
        verdict = apresEchec(verdict.etat, 'h', T0);
        verdict = apresEchec(verdict.etat, 'h', T0);
        for (let i = 0; i < 14; i += 1) verdict = apresEchec(verdict.etat, 'h', T0);
        expect(verdict.ouverture).toBe(false);
        expect(verdict.etat.echecs).toBe(17);
        expect(verdict.etat.palier).toBe(0);
        // Un geste qui echoue a mi-fenetre repousse la fin de la fenetre, au meme palier.
        verdict = apresEchec(verdict.etat, 'h', T0 + 20_000);
        expect(verdict.etat.palier).toBe(0);
        expect(verdict.etat.ouvertJusqua).toBe(T0 + 20_000 + REFROIDISSEMENTS_MS[0]);
    });
});

describe('le registre', () => {
    it('ouvre un hote, le referme au succes, et tient les hotes a part', () => {
        noterEchec('a', T0);
        noterEchec('a', T0);
        const verdict = noterEchec('a', T0);
        expect(verdict.ouverture).toBe(true);
        expect(hoteOuvert('a', T0 + 1)).toBe(true);
        expect(hoteOuvert('b', T0 + 1)).toBe(false);
        expect(etatDesHotes().map((etat) => etat.hote)).toEqual(['a']);
        expect(noterSucces('a')).toBe(true);
        expect(hoteOuvert('a', T0 + 1)).toBe(false);
        expect(etatDesHotes()).toEqual([]);
    });

    it('un succes sur un hote seulement en echec ne signale pas de fermeture', () => {
        noterEchec('a', T0);
        expect(noterSucces('a')).toBe(false);
        expect(noterSucces('inconnu')).toBe(false);
    });

    it('rearmer efface tout', () => {
        for (let i = 0; i < 3; i += 1) noterEchec('a', T0);
        rearmer();
        expect(hoteOuvert('a', T0)).toBe(false);
    });
});

describe('refroidissementLisible', () => {
    it('nomme les trois paliers, et borne un index hors table', () => {
        expect(refroidissementLisible(0)).toBe('30 s');
        expect(refroidissementLisible(1)).toBe('2 min');
        expect(refroidissementLisible(2)).toBe('10 min');
        expect(refroidissementLisible(-1)).toBe('30 s');
        expect(refroidissementLisible(9)).toBe('10 min');
    });
});
