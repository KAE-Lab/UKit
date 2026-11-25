/**
 * Chaque mot qu'un sujet du vocabulaire peut demander existe dans les trois dictionnaires : une cle
 * calculee echappe au compilateur, et une cle absente s'afficherait en majuscules brutes (docs/i18n.md).
 */

import { describe, expect, test } from 'vitest';

import en from '../../../shared/i18n/en';
import es from '../../../shared/i18n/es';
import fr from '../../../shared/i18n/fr';
import { SUJETS, sujetDeLieu } from '../../../shared/communaute/vocabulaire';
import { cleDeValeur, cleDOption, clesDuSujet } from './cles';

describe('les mots du vocabulaire', () => {
    test('chaque cle de chaque sujet existe dans les trois langues', () => {
        for (const sujet of SUJETS) {
            for (const cle of clesDuSujet(sujet)) {
                expect(Object.keys(en), cle).toContain(cle);
                expect(Object.keys(fr), cle).toContain(cle);
                expect(Object.keys(es), cle).toContain(cle);
            }
        }
    });

    test('le geste d un fait du jour se dit comme sa valeur, les autres ont le leur', () => {
        expect(cleDOption(sujetDeLieu('restaurant.self_ferme')!)).toBe('SIGNAL_RESTAURANT_SELF_FERME_OUI');
        expect(cleDOption(sujetDeLieu('batiment.ferme_jusqu')!)).toBe('SIGNALER_BATIMENT_FERME_JUSQU');
        expect(cleDOption(sujetDeLieu('restaurant.attente')!)).toBe('SIGNALER_RESTAURANT_ATTENTE');
        expect(cleDeValeur(sujetDeLieu('restaurant.attente')!, 'tres_long')).toBe('SIGNAL_RESTAURANT_ATTENTE_TRES_LONG');
    });
});
