/**
 * Ce que le formulaire dit de lui-meme : son titre, et l'etat de la saisie dans la barre.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { libelleDeLigne, statutDeLaSaisie } from './etatDuFormulaire';

test('le titre suit la saisie, le titre ou le nom, sinon il dit ce qu on fait', () => {
    expect(libelleDeLigne({ titre: '  Soirée de rentrée ' }, null, 'Nouvelle annonce')).toBe('Soirée de rentrée');
    expect(libelleDeLigne({ nom: 'iPhone de Kylian' }, { id: 1 }, undefined)).toBe('iPhone de Kylian');
    expect(libelleDeLigne({ titre: '' }, null, 'Nouvelle annonce')).toBe('Nouvelle annonce');
    expect(libelleDeLigne({}, null, undefined)).toBe('Nouvelle ligne');
    expect(libelleDeLigne({ plateforme: 'ios' }, { plateforme: 'ios' }, undefined)).toBe('Modifier');
    expect(libelleDeLigne({ email: 'camille@exemple.fr', role: 'redacteur' }, { email: 'camille@exemple.fr' }, 'Inviter quelqu’un')).toBe('camille@exemple.fr');
});

test('la barre dit le dernier geste, puis les champs a corriger, puis ce qui n est pas enregistre', () => {
    const enregistre = { ton: 'ok' as const, texte: 'Enregistré.' };
    expect(statutDeLaSaisie(enregistre, 2, true)).toBe(enregistre);
    expect(statutDeLaSaisie(null, 2, true)).toEqual({ ton: 'erreur', texte: '2 champs à corriger avant d’enregistrer.' });
    expect(statutDeLaSaisie(null, 1, false)).toEqual({ ton: 'erreur', texte: '1 champ à corriger avant d’enregistrer.' });
    expect(statutDeLaSaisie(null, 0, true)).toEqual({ ton: 'avert', texte: 'Modifications non enregistrées.' });
    expect(statutDeLaSaisie(null, 0, false)).toBeNull();
});
