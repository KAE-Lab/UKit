/**
 * La grammaire de la description : le decoupage en blocs, le gras, la marque de fin.
 *
 * Un seul decoupage pour l'application et la console (jalon 7-F) : ce qui est verifie ici vaut pour
 * les deux rendus.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { arbreDeDescription, couleurDIdentite, decouperEnBlocs, estLeLead, lireTitre, porteLaSignature, segmentsDeTexte } from './grammaire';

test('un texte vide ne rend aucun bloc', () => {
    expect(decouperEnBlocs('')).toEqual([]);
    expect(decouperEnBlocs('\n\n  \n')).toEqual([]);
    expect(arbreDeDescription('')).toEqual({ blocs: [], signatureClot: false });
});

test('le premier bloc sans titre est le lead, les titres ouvrent des sections', () => {
    const blocs = decouperEnBlocs('Ouverture.\n\n# Programme\nLe corps.');
    expect(blocs).toEqual([
        { titre: null, icone: null, contenu: [{ type: 'paragraphe', texte: 'Ouverture.' }] },
        { titre: 'Programme', icone: null, contenu: [{ type: 'paragraphe', texte: 'Le corps.' }] },
    ]);
    expect(estLeLead(0, blocs[0] as (typeof blocs)[number])).toBe(true);
    expect(estLeLead(1, blocs[1] as (typeof blocs)[number])).toBe(false);
});

test('un titre nomme son icone avant le pipe, et le pipe ne s ecrit pas dans un intitule', () => {
    expect(lireTitre('calendar-check|Quand')).toEqual({ titre: 'Quand', icone: 'calendar-check' });
    expect(lireTitre('  Quand  ')).toEqual({ titre: 'Quand', icone: null });
    expect(lireTitre('|Sans icone')).toEqual({ titre: 'Sans icone', icone: null });
    expect(decouperEnBlocs('# map-marker|Ou')[0]).toEqual({ titre: 'Ou', icone: 'map-marker', contenu: [] });
});

test('les puces ont trois niveaux, le plus long prefixe se teste en premier', () => {
    expect(decouperEnBlocs('- un\n-- deux\n--- trois\n---- quatre')).toEqual([{
        titre: null,
        icone: null,
        contenu: [
            { type: 'puce', texte: 'un', niveau: 1 },
            { type: 'puce', texte: 'deux', niveau: 2 },
            { type: 'puce', texte: 'trois', niveau: 3 },
            { type: 'paragraphe', texte: '---- quatre' },
        ],
    }]);
});

test('une puce vide, une exergue vide ou une signature vide sont ignorees', () => {
    expect(decouperEnBlocs('- \n> \n~ \n= ')).toEqual([]);
});

test('exergue, transition et signature sont des elements a part entiere', () => {
    expect(decouperEnBlocs('> La phrase\n= Passons\n~ Le BDE')[0]?.contenu).toEqual([
        { type: 'exergue', texte: 'La phrase' },
        { type: 'transition', texte: 'Passons' },
        { type: 'signature', texte: 'Le BDE' },
    ]);
});

test('une puce ou une ligne vide vident le paragraphe en cours, sans perdre le texte', () => {
    expect(decouperEnBlocs('Une ligne\nla suite\n- puce\nApres')[0]?.contenu).toEqual([
        { type: 'paragraphe', texte: 'Une ligne\nla suite' },
        { type: 'puce', texte: 'puce', niveau: 1 },
        { type: 'paragraphe', texte: 'Apres' },
    ]);
});

test('le gras en ligne est non gourmand et laisse le reste intact', () => {
    expect(segmentsDeTexte('Un **mot** puis **deux mots** fin')).toEqual([
        { gras: false, texte: 'Un ' },
        { gras: true, texte: 'mot' },
        { gras: false, texte: ' puis ' },
        { gras: true, texte: 'deux mots' },
        { gras: false, texte: ' fin' },
    ]);
    expect(segmentsDeTexte('sans gras')).toEqual([{ gras: false, texte: 'sans gras' }]);
    expect(segmentsDeTexte('')).toEqual([]);
    expect(segmentsDeTexte('**seul**')).toEqual([{ gras: true, texte: 'seul' }]);
});

test('une signature qui clot le texte efface la marque de fin, pas une signature au milieu', () => {
    expect(arbreDeDescription('Texte\n~ Le BDE').signatureClot).toBe(true);
    expect(arbreDeDescription('~ Le BDE\n\nTexte').signatureClot).toBe(false);
    expect(arbreDeDescription('Texte\n~ Le BDE\n# Apres').signatureClot).toBe(false);
    const blocs = decouperEnBlocs('# Fin\nMerci.\n~ Le BDE');
    expect(porteLaSignature(blocs[0] as (typeof blocs)[number])).toBe(true);
});

test('la couleur d identite se valide contre la palette, le 4 retombe sur le 0', () => {
    expect(couleurDIdentite(5)).toBe(5);
    expect(couleurDIdentite(4)).toBe(0);
    expect(couleurDIdentite(9)).toBe(0);
    expect(couleurDIdentite(undefined)).toBe(0);
});
