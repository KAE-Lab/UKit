/**
 * La regle d'ecriture du catalogue : ce que la base accepterait et que le telephone jetterait sans
 * rien dire — un alias qui n'est pas un mot, un credit qui ne nomme personne.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import type { Ligne } from '../../supabase';
import { saisiesDe, schemaDuDescripteur } from '../schemas';
import { ETABLISSEMENTS } from './publiees';

const valider = (ligne: Ligne): string | null => ETABLISSEMENTS.valider?.(ligne) ?? null;

/** Ce que le formulaire enverrait a la base pour cette ligne : lue, montree, puis ecrite sans retouche. */
const ecrire = (ligne: Ligne | null, saisie: Ligne = {}): Ligne =>
    schemaDuDescripteur(ETABLISSEMENTS).parse({ ...saisiesDe(ETABLISSEMENTS, ligne), ...saisie });

test('une ligne publiee fait l aller-retour du formulaire sans rien perdre des trois colonnes', () => {
    const ecrite = ecrire({ code: 'bordeaux', nom: 'Collège ST', actif: true, ordre: 0, campus: 'Talence', alias: ['UB', 'Collège ST'], credits: null });
    expect([ecrite.campus, ecrite.alias, ecrite.credits]).toEqual(['Talence', ['UB', 'Collège ST'], null]);
    expect(valider(ecrite)).toBeNull();
});

test('une ligne neuve part avec une liste d alias vide, jamais nulle : la colonne est not null', () => {
    const ecrite = ecrire(null, { code: 'essai', nom: 'Essai' });
    expect([ecrite.campus, ecrite.alias, ecrite.credits]).toEqual([null, [], null]);
});

test('une ligne sans alias ni credit passe, comme la ligne « autre » publiee', () => {
    expect(valider({ alias: [], credits: null })).toBeNull();
});

test('des alias et des credits bien formes passent, role et lien facultatifs', () => {
    expect(valider({
        alias: ['UB', 'Collège ST'],
        credits: [{ nom: 'Camille', role: 'compte prêté', lien: 'https://exemple.fr' }, { nom: 'Sacha' }],
    })).toBeNull();
});

test('un alias qui n est pas une liste de mots ne part pas', () => {
    expect(valider({ alias: 'UB', credits: null })).toMatch(/alias/);
    expect(valider({ alias: ['UB', ''], credits: null })).toMatch(/alias/);
    expect(valider({ alias: ['UB', 3], credits: null })).toMatch(/alias/);
});

test('un credit que l application ignorerait ne part pas', () => {
    expect(valider({ alias: [], credits: [{ nom: 'Camille' }, { role: 'relevé des salles' }] })).toMatch(/crédit/);
    expect(valider({ alias: [], credits: { nom: 'Camille' } })).toMatch(/crédit/);
    expect(valider({ alias: [], credits: ['Camille'] })).toMatch(/crédit/);
});
