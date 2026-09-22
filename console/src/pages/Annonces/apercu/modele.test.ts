/**
 * Le modele de l'apercu : les largeurs de l'application, la projection de la saisie, le recadrage.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { PALETTES } from '../../../../../src/shared/theme/palettes';
import { annonceDApercu, badgeDeType, emplacementsSpeciaux, LARGEUR_CARROUSEL, LARGEUR_CELLULE, LARGEUR_VISUEL, positionDeFocale, ratioDeCadre, teinteDe } from './modele';

test('les largeurs sont celles que l application calcule sur un iPhone 13 Pro', () => {
    expect(LARGEUR_CARROUSEL).toBe(234);
    expect(LARGEUR_CELLULE).toBe(179);
    expect(LARGEUR_VISUEL).toBe(358);
});

test('la saisie du formulaire se projette avec des replis lisibles', () => {
    const annonce = annonceDApercu({ titre: '  ', emetteur: '', couleur: '5', type: '', images: ['a', '', 3], focale: { x: 0.2, y: 0.9 }, partenaire: { nom: ' Crous ', logo_url: '', lien: 'https://x' }, lat: '44.8', lng: -0.6 });
    expect(annonce.titre).toBe('Titre de l’annonce');
    expect(annonce.emetteur).toBe('Émetteur');
    expect(annonce.couleur).toBe(5);
    expect(annonce.type).toBe('evenement');
    expect(annonce.images).toEqual(['a']);
    expect(annonce.focale).toEqual({ x: 0.2, y: 0.9 });
    expect(annonce.partenaire).toEqual({ nom: 'Crous', logoUrl: null, lien: 'https://x' });
    expect(annonce.aUnLieu).toBe(true);
    expect(annonce.ajustement).toBe('couvrir');
    expect(annonce.emplacements).toEqual(['annonces']);
});

test('une couleur hors palette retombe sur l accent, comme sur le telephone', () => {
    expect(teinteDe(1, PALETTES.light)).toBe('#34C759');
    expect(teinteDe(9, PALETTES.dark)).toBe(PALETTES.dark.accent);
    expect(teinteDe(undefined, PALETTES.light)).toBe(PALETTES.light.accent);
});

test('la focale devient une position CSS, et le ratio de la fiche se borne', () => {
    expect(positionDeFocale({ x: 0.5, y: 0.3 })).toBe('50% 30%');
    expect(ratioDeCadre(1000, 1000)).toBe(1);
    expect(ratioDeCadre(1000, 3000)).toBe(3 / 4);
    expect(ratioDeCadre(3000, 1000)).toBe(16 / 9);
    expect(ratioDeCadre(0, 10)).toBe(1);
});

test('un evenement ne porte pas de badge ; les autres types, oui ; les emplacements speciaux excluent le sien', () => {
    expect(badgeDeType('evenement')).toBeNull();
    expect(badgeDeType('bon_plan')).toBe('Bon plan');
    expect(badgeDeType('autre')).toBe('autre');
    expect(emplacementsSpeciaux(['annonces', 'restaurants'])).toEqual([{ code: 'restaurants', libelle: 'Restaurants' }]);
});
