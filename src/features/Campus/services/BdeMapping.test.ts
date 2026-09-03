/**
 * La projection des annonces et leur peremption.
 *
 * Jouable hors appareil parce que `BdeMapping.ts` n'importe aucune plateforme. C'est la partie du
 * chemin des annonces ou une erreur ne se voit pas : un champ omis rend un ecran incomplet sans rien
 * casser, et une date mal traitee fait disparaitre du contenu publie.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { estValide, projeterAnnonce, type BdeAnnonce } from './BdeMapping';
import type { AnnonceRow } from '../../../shared/supabase/types';

const LIGNE: AnnonceRow = {
    id: '0f5b2c8e-1d3a-4c9f-8b7e-2a6d4f8c1b03',
    titre: 'Soiree de rentree',
    emetteur: 'BDE Sciences',
    accroche: '20 septembre, campus Talence',
    description: 'Le detail complet de la soiree.',
    image_url: 'https://exemple.test/visuel.jpg',
    images: null,
    lat: null,
    lng: null,
    couleur: null,
    cta_texte: 'Reserver',
    cta_lien: 'https://exemple.test/billets',
    publiee_le: '2026-09-01T10:00:00Z',
    expire_le: '2099-12-31T23:59:59Z',
    active: true,
    creee_le: '2026-09-01T10:00:00Z',
    audience: 'tous',
    etablissements: null,
    version_min: null,
    version_max: null,
};

function annonce(patch: Partial<BdeAnnonce>): BdeAnnonce {
    return { ...projeterAnnonce(LIGNE), ...patch };
}

test('les colonnes de la base arrivent sur les champs que les ecrans lisent', () => {
    const projetee = projeterAnnonce(LIGNE);

    expect(projetee.title).toBe('Soiree de rentree');
    expect(projetee.issuer_name).toBe('BDE Sciences');
    expect(projetee.info_label).toBe('20 septembre, campus Talence');
    expect(projetee.long_desc).toBe('Le detail complet de la soiree.');
    expect(projetee.cta_text).toBe('Reserver');
    expect(projetee.cta_link).toBe('https://exemple.test/billets');
    expect(projetee.image_url).toBe('https://exemple.test/visuel.jpg');
    expect(projetee.is_active).toBe(true);
});

test('la description longue vient bien de la colonne description', () => {
    // Trois noms pour un meme champ le long de la chaine — `description` en base, `desc_longue` dans
    // le Blueprint historique, `long_desc` a l'ecran. C'est la fiche qui l'affiche, et l'oublier
    // viderait la fiche sans rien casser ailleurs.
    expect(projeterAnnonce({ ...LIGNE, description: 'texte long' }).long_desc).toBe('texte long');
});

test('un champ nul est omis, jamais rendu chaine vide', () => {
    const projetee = projeterAnnonce({
        ...LIGNE,
        accroche: null,
        description: null,
        image_url: null,
        cta_texte: null,
        cta_lien: null,
    });

    expect(projetee.info_label).toBeUndefined();
    expect(projetee.long_desc).toBeUndefined();
    expect(projetee.image_url).toBeUndefined();
    expect(projetee.cta_text).toBeUndefined();
    expect(projetee.cta_link).toBeUndefined();
});

test('une chaine vide vaut une absence', () => {
    // Le fichier historique portait `"cta_text": ""` : la fiche n'affiche son bouton que si le
    // libelle **et** le lien sont presents, et un libelle vide afficherait un bouton muet.
    expect(projeterAnnonce({ ...LIGNE, cta_texte: '', cta_lien: '' }).cta_text).toBeUndefined();
});

test('les champs requis restent des chaines meme sur une ligne incomplete', () => {
    // `titre` et `emetteur` sont NOT NULL en base ; le contrat ne doit pas dependre de cette
    // garantie pour rester sain, parce qu'un ecran fait `numberOfLines` dessus.
    const projetee = projeterAnnonce({ ...LIGNE, titre: '', emetteur: '' });

    expect(projetee.title).toBe('');
    expect(projetee.issuer_name).toBe('');
    expect(projetee.id).not.toBe('');
});

test('la galerie ne garde que des URLs, et s omet plutot que d etre vide', () => {
    // La colonne est un jsonb libre : une entree qui n'est pas une chaine s'ignore, elle ne casse
    // pas la fiche.
    expect(projeterAnnonce({ ...LIGNE, images: ['https://a.test/1.jpg', 42, '', 'https://a.test/2.jpg'] }).images)
        .toEqual(['https://a.test/1.jpg', 'https://a.test/2.jpg']);
    expect(projeterAnnonce({ ...LIGNE, images: [] }).images).toBeUndefined();
    expect(projeterAnnonce({ ...LIGNE, images: 'pas-un-tableau' }).images).toBeUndefined();
});

test('le lieu exige les deux coordonnees : une carte a moitie situee serait une carte fausse', () => {
    expect(projeterAnnonce({ ...LIGNE, lat: 44.8, lng: -0.6 }).location).toEqual({ lat: 44.8, lng: -0.6 });
    expect(projeterAnnonce({ ...LIGNE, lat: 44.8, lng: null }).location).toBeUndefined();
    expect(projeterAnnonce(LIGNE).location).toBeUndefined();
});

test('l identite visuelle exige un entier positif, sinon elle s omet', () => {
    expect(projeterAnnonce({ ...LIGNE, couleur: 2 }).couleur).toBe(2);
    expect(projeterAnnonce(LIGNE).couleur).toBeUndefined();
    expect(projeterAnnonce({ ...LIGNE, couleur: -1 }).couleur).toBeUndefined();
    expect(projeterAnnonce({ ...LIGNE, couleur: 2.5 }).couleur).toBeUndefined();
});

test('une annonce sans expiration ne disparait pas', () => {
    // `expire_le` est nullable et la politique de lecture laisse passer `expire_le is null` : la
    // base la publie, l'ecran doit la montrer. Ce test verrouille le correctif.
    expect(estValide(annonce({ expires_at: '' }), new Date('2026-08-08T12:00:00Z'))).toBe(true);
});

test('une annonce expiree est ecartee, une annonce a venir est gardee', () => {
    const maintenant = new Date('2026-08-08T12:00:00Z');

    expect(estValide(annonce({ expires_at: '2026-08-07T23:59:59Z' }), maintenant)).toBe(false);
    expect(estValide(annonce({ expires_at: '2026-08-09T00:00:00Z' }), maintenant)).toBe(true);
});

test('une date illisible ecarte l annonce plutot que de l afficher', () => {
    // Mieux vaut masquer une annonce que d'en montrer une dont on ne sait pas si elle est encore
    // d'actualite. Une absence de date, elle, est une information ; une date fausse n'en est pas une.
    expect(estValide(annonce({ expires_at: 'pas une date' }), new Date('2026-08-08T12:00:00Z'))).toBe(false);
});

test('le ciblage est projete avec la ligne, et une ligne d avant les colonnes vise tout le monde', () => {
    expect(projeterAnnonce(LIGNE).ciblage).toEqual({ audience: 'tous', etablissements: null, version_min: null, version_max: null });
    expect(projeterAnnonce({ ...LIGNE, audience: 'testeurs', etablissements: ['bordeaux-inp'], version_max: '6.0.0' }).ciblage)
        .toEqual({ audience: 'testeurs', etablissements: ['bordeaux-inp'], version_min: null, version_max: '6.0.0' });
    // Un cache ou une base d'avant le jalon : les colonnes manquent, l'annonce reste visible.
    const ancienne = Object.fromEntries(Object.entries(LIGNE).filter(([cle]) => cle !== 'audience')) as AnnonceRow;
    expect(projeterAnnonce(ancienne).ciblage.audience).toBe('tous');
});
