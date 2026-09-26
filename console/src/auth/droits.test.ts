/**
 * La copie des droits dit ce que la base decide : les cas du plan de test de 7-H, joues contre la base
 * par l'API et dans une transaction annulee, rejoues ici contre la copie de la console.
 *
 *     npm test   (a la racine du depot)
 */

import { describe, expect, it } from 'vitest';

import {
    borneDe, estAdmin, libelleDesDroits, lireDroits, peutEcrire, peutModifierLigne, peutPublier, peutSupprimer, phraseDesDroits, raisonDeLectureSeule,
    type Droits,
} from './droits';

const ADMIN: Droits = { role: 'admin', etablissements: null };
const REDACTEUR_BORDEAUX: Droits = { role: 'redacteur', etablissements: ['bordeaux'] };
const REDACTEUR_LIBRE: Droits = { role: 'redacteur', etablissements: null };
const LECTEUR: Droits = { role: 'lecteur', etablissements: null };

describe('lireDroits', () => {
    it('lit un role connu, et la borne d un redacteur seulement', () => {
        expect(lireDroits({ role: 'redacteur', etablissements: ['bordeaux', ''] })).toEqual({ role: 'redacteur', etablissements: ['bordeaux'] });
        expect(lireDroits({ role: 'admin', etablissements: ['bordeaux'] })).toEqual({ role: 'admin', etablissements: null });
        expect(lireDroits({ role: 'redacteur', etablissements: [] })).toEqual({ role: 'redacteur', etablissements: null });
    });

    it('ne donne aucun droit a une ligne absente ou a un role inconnu', () => {
        expect(lireDroits(null)).toBeNull();
        expect(lireDroits({ role: 'proprietaire' })).toBeNull();
        expect(lireDroits({})).toBeNull();
    });
});

describe('peutPublier, la copie de private.peut_publier', () => {
    const CAS: readonly [string, Droits | null, unknown, boolean][] = [
        ['1a redacteur borne, {bordeaux}', REDACTEUR_BORDEAUX, ['bordeaux'], true],
        ['1b redacteur borne, {bordeaux-inp}', REDACTEUR_BORDEAUX, ['bordeaux-inp'], false],
        ['1c redacteur borne, tous (nul)', REDACTEUR_BORDEAUX, null, false],
        ['1d redacteur borne, {}', REDACTEUR_BORDEAUX, [], false],
        ['1e redacteur borne, {bordeaux,bordeaux-inp}', REDACTEUR_BORDEAUX, ['bordeaux', 'bordeaux-inp'], false],
        ['1f redacteur sans borne, tous', REDACTEUR_LIBRE, null, true],
        ['redacteur sans borne, {bordeaux-inp}', REDACTEUR_LIBRE, ['bordeaux-inp'], true],
        ['admin, tous', ADMIN, null, true],
        ['3b lecteur, {bordeaux}', LECTEUR, ['bordeaux'], false],
        ['3f sans droits, {bordeaux}', null, ['bordeaux'], false],
    ];
    it.each(CAS)('%s', (_cas, droits, cibles, attendu) => {
        expect(peutPublier(droits, cibles)).toBe(attendu);
    });

    it('ne se prononce pas tant que les droits ne sont pas lus', () => {
        expect(peutPublier(undefined, ['bordeaux'])).toBe(false);
    });
});

describe('peutEcrire et peutModifierLigne', () => {
    it('l admin ecrit partout, le redacteur les annonces, le lecteur nulle part', () => {
        for (const table of ['annonces', 'service_messages', 'etablissements', 'visuels', 'testeurs', 'retours', 'editeurs']) {
            expect(peutEcrire(ADMIN, table), table).toBe(true);
            expect(peutEcrire(LECTEUR, table), table).toBe(false);
            expect(peutEcrire(null, table), table).toBe(false);
            expect(peutEcrire(REDACTEUR_BORDEAUX, table), table).toBe(table === 'annonces');
        }
    });

    it('2a et 2e : une annonce hors de la borne, ou pour tous, ne se modifie pas', () => {
        expect(peutModifierLigne(REDACTEUR_BORDEAUX, 'annonces', { etablissements: ['bordeaux-inp'] })).toBe(false);
        expect(peutModifierLigne(REDACTEUR_BORDEAUX, 'annonces', { etablissements: null })).toBe(false);
        expect(peutModifierLigne(REDACTEUR_BORDEAUX, 'annonces', { etablissements: ['bordeaux'] })).toBe(true);
    });

    it('3a et 4k : un message et un retour ne se modifient que par un admin', () => {
        expect(peutModifierLigne(REDACTEUR_LIBRE, 'service_messages', {})).toBe(false);
        expect(peutModifierLigne(REDACTEUR_LIBRE, 'retours', {})).toBe(false);
        expect(peutModifierLigne(ADMIN, 'retours', {})).toBe(true);
    });

    it('2f et 3h : supprimer est un geste d admin', () => {
        expect(peutSupprimer(REDACTEUR_LIBRE)).toBe(false);
        expect(peutSupprimer(LECTEUR)).toBe(false);
        expect(peutSupprimer(ADMIN)).toBe(true);
        expect(estAdmin(undefined)).toBe(false);
    });

    it('seule la borne d un redacteur s impose a un formulaire', () => {
        expect(borneDe(REDACTEUR_BORDEAUX)).toEqual(['bordeaux']);
        expect(borneDe(REDACTEUR_LIBRE)).toBeNull();
        expect(borneDe(ADMIN)).toBeNull();
        expect(borneDe(undefined)).toBeNull();
    });
});

describe('ce que la console dit des droits', () => {
    const nomDe = (code: string) => ({ bordeaux: 'Collège ST', 'bordeaux-inp': 'Bordeaux INP' }[code] ?? code);

    it('nomme le role et les campus d un redacteur', () => {
        expect(libelleDesDroits(REDACTEUR_BORDEAUX, nomDe)).toBe('Rédacteur pour Collège ST');
        expect(libelleDesDroits({ role: 'redacteur', etablissements: ['bordeaux', 'bordeaux-inp'] }, nomDe)).toBe('Rédacteur pour Collège ST et Bordeaux INP');
        expect(libelleDesDroits(REDACTEUR_LIBRE, nomDe)).toBe('Rédacteur, tous les campus');
        expect(libelleDesDroits(ADMIN, nomDe)).toBe('Admin');
    });

    it('dit ce que chaque role permet, et rien tant que les droits ne sont pas lus', () => {
        expect(phraseDesDroits(undefined, nomDe)).toBe('');
        expect(phraseDesDroits(REDACTEUR_BORDEAUX, nomDe)).toContain('Collège ST');
        expect(phraseDesDroits(LECTEUR, nomDe)).toContain('n’y écris rien');
        expect(phraseDesDroits(null, nomDe)).toContain('pas dans l’équipe');
    });

    it('dit pourquoi une page est en lecture seule, et se tait quand le compte y ecrit', () => {
        expect(raisonDeLectureSeule(REDACTEUR_BORDEAUX, 'annonces')).toBeNull();
        expect(raisonDeLectureSeule(REDACTEUR_BORDEAUX, 'service_messages')).toContain('admin');
        expect(raisonDeLectureSeule(LECTEUR, 'annonces')).toContain('lecteur');
        expect(raisonDeLectureSeule(null, 'annonces')).toContain('pas dans l’équipe');
        expect(raisonDeLectureSeule(undefined, 'annonces')).toBeNull();
        expect(raisonDeLectureSeule(ADMIN, 'editeurs')).toBeNull();
    });
});
