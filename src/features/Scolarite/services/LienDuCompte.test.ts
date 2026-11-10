/**
 * Ce que la lecture du lien sur le compte doit tenir.
 *
 * Deux erreurs silencieuses a fermer. Lire **trop souvent** : un lien deja range se relirait a chaque
 * lancement, un parcours de navigateur sur un portail qui n'est pas a nous, pour une adresse stable.
 * Garder **n'importe quoi** : une valeur absente traverse un gabarit et devient `None` ou `{{ … }}`
 * (le defaut de la region CROUS, catalogue.ts), et se rangerait comme un emploi du temps.
 *
 * Les adresses ci-dessous sont fabriquees : elles ont la forme mesuree sur PRONOTE le 2026-11-10, et
 * aucun jeton reel.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
    ETABLISSEMENT_DEFAUT,
    appliquerCatalogue,
    projeterEtablissement,
    setCodeEtablissementActif,
} from '../../../shared/etablissements/catalogue';
import { appliquerLiensEdt } from '../../../shared/etablissements/lienEdt';
import type { EtablissementRow } from '../../../shared/supabase/types';
import { blueprintDuLienALire, lienLuSurLeCompte, projeterLienLu } from './LienDuCompte';

const LIEN = 'https://pronote.exemple.fr/Telechargements/ical/Edt_ESSAI.ics?version=2026.4.7&icalsecurise=ABC&param=66'
    + '6f6f';

function publier(partial: Partial<EtablissementRow>): void {
    appliquerCatalogue({
        essai: projeterEtablissement({ code: 'essai', nom: 'Essai', ...partial } as EtablissementRow),
    });
    setCodeEtablissementActif('essai');
}

afterEach(() => {
    appliquerCatalogue(null);
    appliquerLiensEdt(null);
    setCodeEtablissementActif(ETABLISSEMENT_DEFAUT);
});

describe('blueprintDuLienALire', () => {
    it('nomme le Blueprint quand le lien manque et que le catalogue sait le lire', () => {
        publier({ edt: { abonnement: { blueprint_lien: 'ukit.portail.essai.edt.lien' } } });
        expect(blueprintDuLienALire()).toBe('ukit.portail.essai.edt.lien');
    });

    it('ne relit pas un lien deja range, lu ou colle', () => {
        publier({ edt: { abonnement: { blueprint_lien: 'ukit.portail.essai.edt.lien' } } });
        appliquerLiensEdt({ essai: LIEN });
        expect(blueprintDuLienALire()).toBeNull();
    });

    it('lit le lien de l etablissement actif, sans regarder celui d un autre', () => {
        // Le cloisonnement des liens (lienEdt.ts) : celui de « autre » ne dispense pas l'IUT de lire le sien.
        publier({ edt: { abonnement: { blueprint_lien: 'ukit.portail.essai.edt.lien' } } });
        appliquerLiensEdt({ autre: LIEN });
        expect(blueprintDuLienALire()).toBe('ukit.portail.essai.edt.lien');
    });

    it('se tait sans Blueprint de lecture : le collage reste le seul chemin', () => {
        publier({ edt: { abonnement: {} } });
        expect(blueprintDuLienALire()).toBeNull();
    });

    it('se tait quand la source n est pas un abonnement : le lien n y serait jamais joue', () => {
        publier({
            celcat_domaine: 'https://celcat.exemple.fr/calendar',
            edt: { abonnement: { blueprint_lien: 'ukit.portail.essai.edt.lien' } },
        });
        expect(blueprintDuLienALire()).toBeNull();
    });

    it('relit un lien deja range quand des identifiants viennent d etre saisis', () => {
        // Le compte a pu changer : garder le lien du precedent montrerait son emploi du temps.
        publier({ edt: { abonnement: { blueprint_lien: 'ukit.portail.essai.edt.lien' } } });
        appliquerLiensEdt({ essai: LIEN });
        expect(blueprintDuLienALire({ forcer: true })).toBe('ukit.portail.essai.edt.lien');
    });

    it('ne force rien chez un etablissement qui ne sait pas lire le lien', () => {
        publier({ edt: { abonnement: {} } });
        appliquerLiensEdt({ essai: LIEN });
        expect(blueprintDuLienALire({ forcer: true })).toBeNull();
    });

    it('refuse un nom hors du prefixe reserve', () => {
        publier({ edt: { abonnement: { blueprint_lien: 'ukit.celcat.jour' } } });
        expect(blueprintDuLienALire()).toBeNull();
    });
});

describe('lienLuSurLeCompte', () => {
    it('dit qu un lien appartient au compte quand l etablissement le lit, range ou non', () => {
        publier({ edt: { abonnement: { blueprint_lien: 'ukit.portail.essai.edt.lien' } } });
        expect(lienLuSurLeCompte()).toBe(true);
        appliquerLiensEdt({ essai: LIEN });
        expect(lienLuSurLeCompte()).toBe(true);
    });

    it('laisse a lui-meme un lien colle chez un etablissement qui ne le lit pas', () => {
        publier({ edt: { abonnement: {} } });
        appliquerLiensEdt({ essai: LIEN });
        expect(lienLuSurLeCompte()).toBe(false);
    });
});

describe('projeterLienLu', () => {
    it('garde une adresse https, sans blanc autour', () => {
        expect(projeterLienLu({ lien: `  ${LIEN}\n` })).toBe(LIEN);
    });

    it.each([
        ['absente', {}],
        ['vide', { lien: '' }],
        ['non textuelle', { lien: 42 }],
        ['en clair', { lien: LIEN.replace('https', 'http') }],
        ['sans chemin', { lien: 'https://pronote.exemple.fr' }],
        ['venue d une valeur absente', { lien: 'https://pronote.exemple.fr/None' + ' x' }],
        ['au gabarit non resolu', { lien: 'https://pronote.exemple.fr/{{ steps.export.relatif }}' }],
    ])('refuse une adresse %s', (_cas, outputs) => {
        expect(projeterLienLu(outputs)).toBeNull();
    });
});
