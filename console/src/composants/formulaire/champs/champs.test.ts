/**
 * Ce qui est pur dans les widgets des annonces : l'insertion d'un marqueur, le pas du clavier sur la
 * focale, le bilan d'un lot d'images.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { inserer } from './Description';
import { deplacer } from './Focale';
import { bilanDeLot } from './Galerie';

test('un marqueur de ligne s insere en tete de la ligne du curseur, le gras entoure la selection', () => {
    expect(inserer('Bonjour\nle monde', 12, 12, { libelle: '', titre: '', prefixe: '- ' })).toEqual({ texte: 'Bonjour\n- le monde', curseur: 14 });
    expect(inserer('Bonjour', 0, 7, { libelle: '', titre: '', entoure: '**' })).toEqual({ texte: '**Bonjour**', curseur: 9 });
    expect(inserer('', 0, 0, { libelle: '', titre: '', prefixe: '# ' })).toEqual({ texte: '# ', curseur: 2 });
});

test('les fleches deplacent la focale d un pas, sans sortir de l image', () => {
    expect(deplacer({ x: 0.5, y: 0.3 }, 'ArrowLeft')).toEqual({ x: 0.45, y: 0.3 });
    expect(deplacer({ x: 0.98, y: 0.3 }, 'ArrowRight')).toEqual({ x: 1, y: 0.3 });
    expect(deplacer({ x: 0.5, y: 0.02 }, 'ArrowUp')).toEqual({ x: 0.5, y: 0 });
    expect(deplacer({ x: 0.5, y: 0.3 }, 'Enter')).toBeNull();
});

test('le bilan d un lot dit ce qui est parti et nomme le premier refus', () => {
    expect(bilanDeLot(3, 3 * 1024 * 100, [])).toEqual({ ton: 'ok', texte: '3 images téléversées (300 Ko).' });
    expect(bilanDeLot(1, 1024 * 50, ['trop lourd', 'autre'])).toEqual({ ton: 'erreur', texte: '1 image téléversée (50 Ko) ; 2 refusées : trop lourd' });
    expect(bilanDeLot(0, 0, ['refus'])).toEqual({ ton: 'erreur', texte: '1 refusée : refus' });
});
