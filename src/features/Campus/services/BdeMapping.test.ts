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

import { avecImage, estValide, projeterAnnonce, type BdeAnnonce } from './BdeMapping';
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
    plateformes: null,
    type: 'evenement',
    emplacements: ['annonces'],
    ajustement: 'couvrir',
    focale: { x: 0.5, y: 0.3 },
    priorite: 0,
    epinglee: false,
    creneaux: null,
    statut: 'publiee',
    blurhash: null,
    partenaire: null,
};

function annonce(patch: Partial<BdeAnnonce>): BdeAnnonce {
    return { ...projeterAnnonce(LIGNE), ...patch };
}

/** Une ligne d'un cache ou d'une base d'avant ces colonnes : elles manquent, au lieu d'etre nulles. */
function sans(colonnes: readonly string[]): AnnonceRow {
    return Object.fromEntries(Object.entries(LIGNE).filter(([cle]) => !colonnes.includes(cle))) as AnnonceRow;
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
    expect(projeterAnnonce(LIGNE).ciblage).toEqual({ audience: 'tous', etablissements: null, version_min: null, version_max: null, plateformes: null });
    expect(projeterAnnonce({ ...LIGNE, audience: 'testeurs', etablissements: ['bordeaux-inp'], version_max: '6.0.0' }).ciblage)
        .toEqual({ audience: 'testeurs', etablissements: ['bordeaux-inp'], version_min: null, version_max: '6.0.0', plateformes: null });
    // Un cache ou une base d'avant le jalon : les colonnes manquent, l'annonce reste visible.
    expect(projeterAnnonce(sans(['audience'])).ciblage.audience).toBe('tous');
});

test('le type arrive tel quel, et un type que le parc ne connait pas se rend comme un evenement', () => {
    expect(projeterAnnonce({ ...LIGNE, type: 'bon_plan' }).type).toBe('bon_plan');
    expect(projeterAnnonce({ ...LIGNE, type: 'agenda' }).type).toBe('evenement');
    expect(projeterAnnonce(sans(['type'])).type).toBe('evenement');
});

test('les emplacements gardent les carrousels connus, et une ligne d avant la colonne va aux annonces', () => {
    expect(projeterAnnonce(LIGNE).emplacements).toEqual(['annonces']);
    expect(projeterAnnonce({ ...LIGNE, emplacements: ['restaurants', 'annonces', 'restaurants'] }).emplacements).toEqual(['annonces', 'restaurants']);
    // Un carrousel ouvert en base avant que le parc ne le connaisse : la carte n'y va pas.
    expect(projeterAnnonce({ ...LIGNE, emplacements: ['agenda'] }).emplacements).toEqual([]);
    expect(projeterAnnonce(sans(['emplacements'])).emplacements).toEqual(['annonces']);
});

test('contenir n est retenu que si la colonne le dit', () => {
    expect(projeterAnnonce({ ...LIGNE, ajustement: 'contenir' }).ajustement).toBe('contenir');
    expect(projeterAnnonce(LIGNE).ajustement).toBe('couvrir');
    expect(projeterAnnonce({ ...LIGNE, ajustement: 'etirer' }).ajustement).toBe('couvrir');
    expect(projeterAnnonce(sans(['ajustement'])).ajustement).toBe('couvrir');
});

test('la focale se lit bornee a l image, et retombe sur le defaut de la base', () => {
    expect(projeterAnnonce({ ...LIGNE, focale: { x: 0.2, y: 0.9 } }).focale).toEqual({ x: 0.2, y: 0.9 });
    expect(projeterAnnonce({ ...LIGNE, focale: { x: 2, y: 0.9 } }).focale).toEqual({ x: 0.5, y: 0.3 });
    expect(projeterAnnonce({ ...LIGNE, focale: null }).focale).toEqual({ x: 0.5, y: 0.3 });
    expect(projeterAnnonce(sans(['focale'])).focale).toEqual({ x: 0.5, y: 0.3 });
});

test('le blurhash arrive quand la console l a calcule, et s omet sinon', () => {
    expect(projeterAnnonce({ ...LIGNE, blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' }).blurhash).toBe('LEHV6nWB2yk8pyo0adR*.7kCMdnj');
    expect(projeterAnnonce(LIGNE).blurhash).toBeUndefined();
    expect(projeterAnnonce({ ...LIGNE, blurhash: '' }).blurhash).toBeUndefined();
});

test('le partenaire s omet sans nom ; son logo et son lien vides valent une absence', () => {
    expect(projeterAnnonce({ ...LIGNE, partenaire: { nom: ' Crous ', logo_url: '', lien: 'https://exemple.test/crous' } }).partenaire)
        .toEqual({ nom: 'Crous', logoUrl: null, lien: 'https://exemple.test/crous' });
    expect(projeterAnnonce({ ...LIGNE, partenaire: { nom: '', logo_url: 'https://exemple.test/logo.png', lien: null } }).partenaire).toBeUndefined();
    expect(projeterAnnonce(LIGNE).partenaire).toBeUndefined();
});

test('l ordre est projete avec la ligne, et une ligne d avant les colonnes n est ni epinglee ni prioritaire', () => {
    const midi = [{ jours: [1, 2, 3, 4, 5], de: '11:00', a: '14:00' }];
    expect(projeterAnnonce({ ...LIGNE, epinglee: true, priorite: 3, creneaux: midi }).ordre)
        .toEqual({ id: LIGNE.id, epinglee: true, priorite: 3, creneaux: midi });
    expect(projeterAnnonce(sans(['epinglee', 'priorite', 'creneaux'])).ordre)
        .toEqual({ id: LIGNE.id, epinglee: false, priorite: 0, creneaux: [] });
});

test('le blurhash ne suit que l image sur laquelle il a ete calcule', () => {
    const avecPlaceholder = annonce({ blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' });
    // La table `visuels` ne publie rien pour l'annonce : l'image et son placeholder restent.
    expect(avecImage(avecPlaceholder, avecPlaceholder.image_url).blurhash).toBe('LEHV6nWB2yk8pyo0adR*.7kCMdnj');
    // Une autre image publiee, ou l'image retiree : le placeholder de l'ancienne ne vaut plus.
    const remplacee = avecImage(avecPlaceholder, 'https://exemple.test/autre.jpg');
    expect(remplacee.image_url).toBe('https://exemple.test/autre.jpg');
    expect(remplacee.blurhash).toBeUndefined();
    expect(avecImage(avecPlaceholder, undefined).blurhash).toBeUndefined();
});
