/**
 * La carte d'annonce v2 : la focale et ses deux positions, le type et son badge, les emplacements,
 * l'ajustement, le partenaire d'une carte.
 *
 * Une seule source pour l'application et la console (jalon 7-I) : ce qui est verifie ici vaut pour
 * les deux rendus.
 *
 *     npm test
 */

// Un import de type, efface a l'execution : `tsc` verifie que la position locale est bien celle
// qu'expo-image accepte, sans que le module teste ne tire le paquet.
import type { ImageContentPosition } from 'expo-image';
import { expect, test } from 'vitest';

import {
    emplacementsSpeciaux,
    estTypeDAnnonce,
    FOCALE_PAR_DEFAUT,
    lireAjustement,
    lireEmplacements,
    lireFocale,
    lireType,
    partenaireDeCarte,
    positionDeFocale,
    positionPourExpoImage,
    RATIO_CARTE,
    typeDeBadge,
} from './carte';

test('le cadre est 4:5', () => {
    expect(RATIO_CARTE).toBe(0.8);
});

test('la focale se lit bornee a l image, et retombe sur le defaut de la base', () => {
    expect(lireFocale({ x: 0.2, y: 0.9 })).toEqual({ x: 0.2, y: 0.9 });
    expect(lireFocale({ x: 0, y: 1 })).toEqual({ x: 0, y: 1 });
    expect(lireFocale({ x: 1.2, y: 0.5 })).toBe(FOCALE_PAR_DEFAUT);
    expect(lireFocale({ x: '0.2', y: 0.5 })).toBe(FOCALE_PAR_DEFAUT);
    expect(lireFocale({ x: Number.NaN, y: 0.5 })).toBe(FOCALE_PAR_DEFAUT);
    expect(lireFocale(null)).toEqual({ x: 0.5, y: 0.3 });
    expect(lireFocale('rien')).toEqual({ x: 0.5, y: 0.3 });
});

test('la focale devient une position CSS', () => {
    expect(positionDeFocale({ x: 0.5, y: 0.3 })).toBe('50% 30%');
    expect(positionDeFocale({ x: 0.797, y: 0.898 })).toBe('80% 90%');
});

test('expo-image recoit les memes pourcentages que la console, par le coin haut gauche', () => {
    const position: ImageContentPosition = positionPourExpoImage({ x: 0.797, y: 0.898 });
    expect(position).toEqual({ left: '80%', top: '90%' });
    expect(positionPourExpoImage(FOCALE_PAR_DEFAUT)).toEqual({ left: '50%', top: '30%' });
    expect(positionPourExpoImage({ x: 0, y: 1 })).toEqual({ left: '0%', top: '100%' });
});

test('un type inconnu se rend comme un evenement', () => {
    expect(lireType('bon_plan')).toBe('bon_plan');
    expect(lireType('agenda')).toBe('evenement');
    expect(lireType(undefined)).toBe('evenement');
    expect(estTypeDAnnonce('partenaire')).toBe(true);
    expect(estTypeDAnnonce('autre')).toBe(false);
    expect(estTypeDAnnonce(3)).toBe(false);
});

test('un evenement ne porte pas de badge ; les autres types, le leur', () => {
    expect(typeDeBadge('evenement')).toBeNull();
    expect(typeDeBadge('info')).toBe('info');
    expect(typeDeBadge('bon_plan')).toBe('bon_plan');
    expect(typeDeBadge('partenaire')).toBe('partenaire');
});

test('les emplacements gardent les codes connus, dans l ordre des carrousels, sans doublon', () => {
    expect(lireEmplacements(['salles', 'annonces', 'salles'])).toEqual(['annonces', 'salles']);
    // Un carrousel ouvert en base avant que le parc ne le connaisse : la carte n'y va pas.
    expect(lireEmplacements(['agenda'])).toEqual([]);
    // Un cache d'avant les colonnes : le defaut de la base.
    expect(lireEmplacements(null)).toEqual(['annonces']);
    expect(lireEmplacements('annonces')).toEqual(['annonces']);
});

test('les emplacements speciaux excluent celui des annonces, et gardent une valeur hors liste', () => {
    expect(emplacementsSpeciaux(['annonces', 'restaurants'])).toEqual(['restaurants']);
    expect(emplacementsSpeciaux(['annonces'])).toEqual([]);
    expect(emplacementsSpeciaux(['restaurants', 'agenda'])).toEqual(['restaurants', 'agenda']);
});

test('contenir n est choisi que si la colonne le dit', () => {
    expect(lireAjustement('contenir')).toBe('contenir');
    expect(lireAjustement('couvrir')).toBe('couvrir');
    expect(lireAjustement('etirer')).toBe('couvrir');
    expect(lireAjustement(null)).toBe('couvrir');
});

test('un partenaire sans nom n existe pas ; un logo ou un lien vide vaut une absence', () => {
    expect(partenaireDeCarte({ nom: ' Crous ', logo_url: '', lien: 'https://x' })).toEqual({ nom: 'Crous', logoUrl: null, lien: 'https://x' });
    expect(partenaireDeCarte({ nom: 'Crous', logo_url: 'https://l', lien: null })).toEqual({ nom: 'Crous', logoUrl: 'https://l', lien: null });
    expect(partenaireDeCarte({ nom: '  ', logo_url: 'https://l', lien: 'https://x' })).toBeNull();
    expect(partenaireDeCarte({ logo_url: 'https://l' })).toBeNull();
    expect(partenaireDeCarte(null)).toBeNull();
    expect(partenaireDeCarte('Crous')).toBeNull();
});
