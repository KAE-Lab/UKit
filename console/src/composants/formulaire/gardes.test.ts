/**
 * Les gardes d'une saisie : le raccourci d'enregistrement, et comment il s'ecrit sur le poste.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { estRaccourciDEnregistrement, raccourciDEnregistrement } from './gardes';

const TOUCHE = { key: 's', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };

test('Ctrl+S et Cmd+S enregistrent, pas S seul ni une autre combinaison', () => {
    expect(estRaccourciDEnregistrement({ ...TOUCHE, ctrlKey: true })).toBe(true);
    expect(estRaccourciDEnregistrement({ ...TOUCHE, metaKey: true, key: 'S' })).toBe(true);
    expect(estRaccourciDEnregistrement(TOUCHE)).toBe(false);
    expect(estRaccourciDEnregistrement({ ...TOUCHE, ctrlKey: true, shiftKey: true })).toBe(false);
    expect(estRaccourciDEnregistrement({ ...TOUCHE, ctrlKey: true, altKey: true })).toBe(false);
    expect(estRaccourciDEnregistrement({ ...TOUCHE, ctrlKey: true, key: 'p' })).toBe(false);
});

test('le raccourci s ecrit comme le poste l ecrit', () => {
    expect(raccourciDEnregistrement('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)')).toBe('⌘ S');
    expect(raccourciDEnregistrement('Mozilla/5.0 (X11; Linux x86_64)')).toBe('Ctrl S');
    expect(raccourciDEnregistrement('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Ctrl S');
});
