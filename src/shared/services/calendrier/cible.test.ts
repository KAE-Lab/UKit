import { describe, expect, it } from 'vitest';

import { calendriersChoisissables, causeDeLaSource, lireCause, resoudreCible, type CalendrierConnu } from './cible';

const PERSONNEL: CalendrierConnu = { id: '3', title: 'Personnel', allowsModifications: true };
const FERIES: CalendrierConnu = { id: '5', title: 'Jours fériés', allowsModifications: false };
const UKIT: CalendrierConnu = { id: '9', title: 'UKit', allowsModifications: true };

describe('resoudreCible', () => {
    it('refuse un calendrier en lecture seule avant toute ecriture', () => {
        expect(resoudreCible('5', [PERSONNEL, FERIES])).toEqual({ kind: 'refus', cause: 'calendrier-lecture-seule' });
    });

    it('refuse un calendrier qui n existe plus sur le telephone', () => {
        expect(resoudreCible('42', [PERSONNEL])).toEqual({ kind: 'refus', cause: 'calendrier-introuvable' });
    });

    it('ecrit dans un calendrier ecrivable, identifiant numerique ou textuel', () => {
        expect(resoudreCible(3, [PERSONNEL])).toEqual({ kind: 'ecrire', id: '3', ukit: false });
        expect(resoudreCible('3', [PERSONNEL])).toEqual({ kind: 'ecrire', id: '3', ukit: false });
    });

    it('le calendrier UKit reste le repli : retrouve, ou a recreer s il a ete supprime', () => {
        expect(resoudreCible('UKit', [PERSONNEL, UKIT])).toEqual({ kind: 'ecrire', id: '9', ukit: true });
        expect(resoudreCible('UKit', [PERSONNEL])).toEqual({ kind: 'creer-ukit' });
    });

    it('un calendrier UKit devenu lecture seule ne sert pas : on en recree un', () => {
        expect(resoudreCible('UKit', [{ ...UKIT, allowsModifications: false }])).toEqual({ kind: 'creer-ukit' });
    });

    it('reconnait l identifiant resolu du calendrier UKit, celui des anciennes installations', () => {
        expect(resoudreCible('9', [UKIT])).toEqual({ kind: 'ecrire', id: '9', ukit: true });
    });
});

describe('calendriersChoisissables', () => {
    it('ne propose ni les calendriers en lecture seule, ni UKit, propose a part', () => {
        expect(calendriersChoisissables([PERSONNEL, FERIES, UKIT])).toEqual([PERSONNEL]);
    });
});

describe('les causes', () => {
    it('distingue une source injoignable des autres echecs de la source', () => {
        expect(causeDeLaSource('unavailable')).toBe('source-injoignable');
        expect(causeDeLaSource('rejected')).toBe('source-autre');
        expect(causeDeLaSource('engine')).toBe('source-autre');
    });

    it('relit une cause connue, et rien d autre', () => {
        expect(lireCause('ecriture')).toBe('ecriture');
        expect(lireCause('inconnue')).toBeUndefined();
        expect(lireCause(3)).toBeUndefined();
    });
});
