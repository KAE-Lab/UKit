/**
 * L'etat d'une annonce vu du formulaire : la regle de la base, et la phrase de programmation.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { etatDAnnonce, phraseDeDate } from './etat';

const MAINTENANT = new Date('2026-09-22T10:00:00+02:00');
const PUBLIEE = { statut: 'publiee', active: true, publiee_le: '2026-09-01T10:00:00Z', expire_le: null };

test('le statut passe avant tout : brouillon et archivee ne regardent pas les dates', () => {
    expect(etatDAnnonce({ ...PUBLIEE, statut: 'brouillon' }, MAINTENANT).etat).toBe('brouillon');
    expect(etatDAnnonce({ ...PUBLIEE, statut: 'archivee' }, MAINTENANT).etat).toBe('archivee');
});

test('une annonce decochee est inactive, meme publiee', () => {
    expect(etatDAnnonce({ ...PUBLIEE, active: false }, MAINTENANT).etat).toBe('inactive');
});

test('publiee, active, deja publiee et sans expiration : visible', () => {
    expect(etatDAnnonce(PUBLIEE, MAINTENANT)).toEqual({ etat: 'active', libelle: 'Visible', ton: 'ok', phrase: null });
});

test('une date de publication a venir programme, avec une phrase lisible', () => {
    const etat = etatDAnnonce({ ...PUBLIEE, publiee_le: '2026-10-03T09:00:00Z' }, MAINTENANT);
    expect(etat.etat).toBe('programmee');
    expect(etat.phrase).toBe('Publiée le 3 octobre à 11 h.');
});

test('la saisie locale du formulaire se lit comme une date ISO', () => {
    expect(etatDAnnonce({ ...PUBLIEE, publiee_le: '2026-10-03T11:30' }, MAINTENANT).phrase).toBe('Publiée le 3 octobre à 11 h 30.');
});

test('une expiration passee prime sur la publication', () => {
    expect(etatDAnnonce({ ...PUBLIEE, expire_le: '2026-09-20T10:00:00Z' }, MAINTENANT).etat).toBe('expiree');
    expect(etatDAnnonce({ ...PUBLIEE, expire_le: '2026-12-31T22:59:00Z' }, MAINTENANT).phrase).toBe('Jusqu’au 31 décembre à 23 h 59.');
});

test('la phrase de date porte l annee quand elle n est pas celle du moment', () => {
    expect(phraseDeDate(new Date('2027-01-05T08:00:00+01:00'), MAINTENANT)).toBe('5 janvier 2027 à 8 h');
});
