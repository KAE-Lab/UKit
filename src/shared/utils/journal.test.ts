import { describe, expect, it } from 'vitest';

import { sansAdresses } from './journal';

describe('sansAdresses', () => {
    it('reduit un lien d abonnement a son origine, dans le detail d un echec', () => {
        const detail = 'Expected HTTP 200, got 400 — https://ade.exemple.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?resources=3&projectId=1';
        expect(sansAdresses(detail)).toBe('Expected HTTP 200, got 400 — https://ade.exemple.fr/…');
    });

    it('retire un ticket CAS de la requete, et un chemin qui porte un jeton', () => {
        expect(sansAdresses('ouvert : https://ent.exemple.fr/uPortal/Login?ticket=ST-123-abc')).toBe('ouvert : https://ent.exemple.fr/…');
        expect(sansAdresses('https://calendar.exemple.com/calendar/ical/x/private-0123/basic.ics')).toBe('https://calendar.exemple.com/…');
    });

    it('laisse une origine nue, plusieurs adresses, et un texte sans adresse', () => {
        expect(sansAdresses('https://celcat.exemple.fr')).toBe('https://celcat.exemple.fr');
        expect(sansAdresses('de https://a.fr/x vers file:///data/doc.pdf')).toBe('de https://a.fr/… vers file:///…');
        expect(sansAdresses('page vide')).toBe('page vide');
    });
});
