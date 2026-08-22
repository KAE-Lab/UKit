/**
 * Ce que la surcouche des visuels doit tenir.
 *
 * Le risque est unique et il est silencieux, comme celui du referentiel des lieux : une regle mal
 * lue ne produit **aucune erreur** — juste une photo qui ne change pas, ou une photo qui disparait.
 * Rien a l'ecran ne distingue « la base n'a pas repondu » de « il n'y avait rien a corriger », et
 * c'est pour ca que la resolution des trois etats se verrouille ici plutot que sur un appareil.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
    appliquerSurcouche,
    appliquerVisuel,
    nombreDeVisuels,
    projeterVisuels,
    visuelDe,
} from './referentiel';
import type { VisuelRow } from '../supabase/types';

function ligne(partial: Partial<VisuelRow>): VisuelRow {
    return { domaine: 'crous', cle: '21', image_url: null, ...partial } as VisuelRow;
}

// Le module tient un etat de portee fichier : le laisser fuir d'un test a l'autre ferait passer des
// assertions pour de mauvaises raisons.
afterEach(() => appliquerSurcouche(null));

describe('projeterVisuels', () => {
    it('retient une URL publiee', () => {
        expect(projeterVisuels([ligne({ image_url: 'https://exemple/amazone.jpg' })])).toEqual({
            'crous:21': 'https://exemple/amazone.jpg',
        });
    });

    it('distingue la chaine vide du nul', () => {
        // La sonde du lot : le vide dit « n'affiche aucune image », le nul dit « je ne corrige
        // rien ». Les aplatir ferait perdre le seul moyen de retirer une photo fausse.
        const surcouche = projeterVisuels([
            ligne({ cle: '21', image_url: '' }),
            ligne({ cle: '22', image_url: null }),
        ]);

        expect(surcouche).toEqual({ 'crous:21': null });
    });

    it('ignore un domaine que cette version ne connait pas', () => {
        // Une publication peut ouvrir un domaine avant que le parc installe ne le suive. Ce n'est
        // pas une erreur a signaler : l'application ignore la ligne et garde le visuel de la source.
        expect(projeterVisuels([ligne({ domaine: 'scolarite', image_url: 'https://exemple/x.jpg' })])).toEqual({});
    });

    it('ignore une cle vide', () => {
        expect(projeterVisuels([ligne({ cle: '', image_url: 'https://exemple/x.jpg' })])).toEqual({});
    });

    it('separe les domaines qui partagent une cle', () => {
        const surcouche = projeterVisuels([
            ligne({ domaine: 'crous', cle: '21', image_url: 'https://exemple/resto.jpg' }),
            ligne({ domaine: 'bibliotheque', cle: '21', image_url: 'https://exemple/bu.jpg' }),
        ]);

        expect(surcouche).toEqual({
            'crous:21': 'https://exemple/resto.jpg',
            'bibliotheque:21': 'https://exemple/bu.jpg',
        });
    });
});

describe('visuelDe', () => {
    it('rend undefined quand aucune regle n existe', () => {
        expect(visuelDe('crous', '21')).toBeUndefined();
    });

    it('rend null pour un visuel explicitement retire', () => {
        appliquerSurcouche({ 'crous:21': null });
        expect(visuelDe('crous', '21')).toBeNull();
    });

    it('ne confond pas deux domaines', () => {
        appliquerSurcouche({ 'crous:21': 'https://exemple/resto.jpg' });
        expect(visuelDe('bibliotheque', '21')).toBeUndefined();
    });
});

describe('appliquerVisuel', () => {
    it('laisse la source decider sans regle', () => {
        expect(appliquerVisuel('crous', '21', 'https://api/preview')).toBe('https://api/preview');
    });

    it('remplace le visuel de la source', () => {
        appliquerSurcouche({ 'crous:21': 'https://exemple/amazone.jpg' });
        expect(appliquerVisuel('crous', '21', 'https://api/preview')).toBe('https://exemple/amazone.jpg');
    });

    it('retire le visuel de la source, ce qui rend la main au repli de l ecran', () => {
        appliquerSurcouche({ 'crous:21': null });
        expect(appliquerVisuel('crous', '21', 'https://api/preview')).toBeUndefined();
    });

    it('n invente pas d image quand la source n en a pas', () => {
        expect(appliquerVisuel('bibliotheque', '404', undefined)).toBeUndefined();
    });
});

describe('appliquerSurcouche', () => {
    it('remplace la surcouche entiere plutot que de la fusionner', () => {
        // C'est ce qui fait qu'une ligne retiree de la base rend son visuel a la source. Fusionner
        // rendrait une correction indefectible, ce qui est le contraire du but.
        appliquerSurcouche({ 'crous:21': 'https://exemple/a.jpg', 'crous:22': 'https://exemple/b.jpg' });
        appliquerSurcouche({ 'crous:22': 'https://exemple/b.jpg' });

        expect(visuelDe('crous', '21')).toBeUndefined();
        expect(nombreDeVisuels()).toBe(1);
    });

    it('revient aux visuels des sources sans argument', () => {
        appliquerSurcouche({ 'crous:21': 'https://exemple/a.jpg' });
        appliquerSurcouche(null);

        expect(nombreDeVisuels()).toBe(0);
    });

    it('ne garde pas de reference sur la table qu on lui donne', () => {
        const surcouche = { 'crous:21': 'https://exemple/a.jpg' };
        appliquerSurcouche(surcouche);
        surcouche['crous:21'] = 'https://exemple/mute.jpg';

        expect(visuelDe('crous', '21')).toBe('https://exemple/a.jpg');
    });
});
