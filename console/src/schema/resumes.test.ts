/**
 * Les resumes en une ligne des saisies structurees.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { resumeDeCreneaux, resumeDeFocale, resumeDeGalerie, resumeDePartenaire, resumeStructure } from './resumes';

test('la focale, les creneaux, la galerie et le partenaire se resument', () => {
    expect(resumeDeFocale({ x: 0.5, y: 0.3 })).toBe('x 50 %, y 30 %');
    expect(resumeDeFocale('rien')).toBe('x 50 %, y 30 %');
    expect(resumeDeCreneaux([{ jours: [1, 2, 3], de: '11:00', a: '14:00' }, { jours: [6], de: '20:00', a: '02:00' }])).toBe('lun, mar, mer 11:00–14:00 ; sam 20:00–02:00');
    expect(resumeDeCreneaux(null)).toBe('—');
    expect(resumeDeGalerie(['a', 'b'])).toBe('2 images');
    expect(resumeDeGalerie(['a'])).toBe('1 image');
    expect(resumeDeGalerie([])).toBe('—');
    expect(resumeDePartenaire({ nom: 'Crous' })).toBe('Crous');
    expect(resumeDePartenaire(null)).toBe('—');
});

test('un type sans resume rend null, pour laisser le repli texte faire', () => {
    expect(resumeStructure('texte', 'bonjour')).toBeNull();
    expect(resumeStructure('galerie', ['a'])).toBe('1 image');
});
