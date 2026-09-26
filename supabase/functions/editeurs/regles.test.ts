/**
 * Les regles de la fonction `editeurs` : une demande de la page Equipe se lit ou se refuse en le disant,
 * et le mot de passe provisoire a la forme qui se dicte.
 *
 *     npm test
 */

import { describe, expect, it } from 'vitest';

import { lireDemande, motDePasseProvisoire, normaliserEmail, OCTETS_DU_MOT_DE_PASSE } from './regles';

const CATALOGUE = ['bordeaux', 'bordeaux-inp', 'autre'];

describe('normaliserEmail', () => {
    it('range une adresse comme l authentification : sans espaces, en minuscules', () => {
        expect(normaliserEmail('  Camille.Dupont@U-Bordeaux.fr ')).toBe('camille.dupont@u-bordeaux.fr');
    });

    it('refuse ce qui n est pas une adresse', () => {
        for (const valeur of ['', 'camille', 'camille@', '@u-bordeaux.fr', 'camille dupont@u-bordeaux.fr', 42, null]) {
            expect(normaliserEmail(valeur), String(valeur)).toBeNull();
        }
    });
});

describe('lireDemande', () => {
    it('lit une invitation de redacteur borne, sans doublon', () => {
        expect(lireDemande({ action: 'inviter', email: 'R@exemple.fr', role: 'redacteur', etablissements: ['bordeaux', 'bordeaux'] }, CATALOGUE))
            .toEqual({ action: 'inviter', email: 'r@exemple.fr', role: 'redacteur', etablissements: ['bordeaux'] });
    });

    it('lit un redacteur sans borne, un admin et un lecteur : leur borne est nulle', () => {
        for (const role of ['redacteur', 'admin', 'lecteur']) {
            expect(lireDemande({ action: 'inviter', email: 'x@exemple.fr', role, etablissements: null }, CATALOGUE))
                .toEqual({ action: 'inviter', email: 'x@exemple.fr', role, etablissements: null });
        }
        expect(lireDemande({ action: 'inviter', email: 'x@exemple.fr', role: 'lecteur' }, CATALOGUE)).toMatchObject({ etablissements: null });
    });

    it('refuse une borne vide : « tous » s ecrit nul', () => {
        expect(lireDemande({ action: 'inviter', email: 'x@exemple.fr', role: 'redacteur', etablissements: [] }, CATALOGUE)).toHaveProperty('erreur');
    });

    it('refuse une borne pour un autre role qu un redacteur', () => {
        expect(lireDemande({ action: 'inviter', email: 'x@exemple.fr', role: 'admin', etablissements: ['bordeaux'] }, CATALOGUE)).toHaveProperty('erreur');
    });

    it('refuse un campus absent du catalogue en le nommant', () => {
        const refus = lireDemande({ action: 'inviter', email: 'x@exemple.fr', role: 'redacteur', etablissements: ['bordeaux', 'montaigne'] }, CATALOGUE);
        expect(refus).toEqual({ erreur: 'Campus inconnu du catalogue : montaigne.' });
    });

    it('refuse une borne qui n est pas une liste de codes', () => {
        for (const etablissements of ['bordeaux', [42], {}]) {
            expect(lireDemande({ action: 'inviter', email: 'x@exemple.fr', role: 'redacteur', etablissements }, CATALOGUE)).toHaveProperty('erreur');
        }
    });

    it('refuse un role inconnu, une action inconnue, une adresse invalide, un corps illisible', () => {
        expect(lireDemande({ action: 'inviter', email: 'x@exemple.fr', role: 'proprietaire' }, CATALOGUE)).toHaveProperty('erreur');
        expect(lireDemande({ action: 'promouvoir', email: 'x@exemple.fr' }, CATALOGUE)).toHaveProperty('erreur');
        expect(lireDemande({ action: 'revoquer', email: 'x' }, CATALOGUE)).toEqual({ erreur: 'Adresse e-mail invalide.' });
        expect(lireDemande(null, CATALOGUE)).toEqual({ erreur: 'Demande illisible.' });
        expect(lireDemande('inviter', CATALOGUE)).toEqual({ erreur: 'Demande illisible.' });
    });

    it('lit une reinitialisation et une revocation par la seule adresse', () => {
        expect(lireDemande({ action: 'reinitialiser', email: 'X@exemple.fr', role: 'admin' }, CATALOGUE)).toEqual({ action: 'reinitialiser', email: 'x@exemple.fr' });
        expect(lireDemande({ action: 'revoquer', email: 'x@exemple.fr' }, CATALOGUE)).toEqual({ action: 'revoquer', email: 'x@exemple.fr' });
    });
});

describe('motDePasseProvisoire', () => {
    const FORME = /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/;

    it('rend quatre groupes de quatre signes sans ambiguite', () => {
        const octets = new Uint8Array(OCTETS_DU_MOT_DE_PASSE).map((_, i) => i * 17);
        const motDePasse = motDePasseProvisoire(octets);
        expect(motDePasse).toMatch(FORME);
        expect(motDePasse).toHaveLength(19);
    });

    it('ne favorise aucun signe : chaque octet tombe sur son signe modulo 32', () => {
        const octets = new Uint8Array([0, 31, 32, 255, 1, 8, 24, 25, 0, 0, 0, 0, 0, 0, 0, 0]);
        expect(motDePasseProvisoire(octets)).toBe('A9A9-BJ23-AAAA-AAAA');
    });

    it('n utilise ni I, ni O, ni 0, ni 1, sur toutes les valeurs d un octet', () => {
        const signes = new Set<string>();
        for (let octet = 0; octet < 256; octet += 16) {
            const octets = new Uint8Array(OCTETS_DU_MOT_DE_PASSE).map((_, i) => octet + i);
            for (const signe of motDePasseProvisoire(octets).replace(/-/g, '')) signes.add(signe);
        }
        expect(signes.size).toBe(32);
        for (const ambigu of ['I', 'O', '0', '1']) expect(signes.has(ambigu), ambigu).toBe(false);
    });

    it('exige seize octets', () => {
        expect(() => motDePasseProvisoire(new Uint8Array(8))).toThrow();
    });
});
