/**
 * L'assemblage de la page du lecteur : ce qui doit survivre au passage en litteral, et ce qui doit
 * lever plutot que rendre une page blanche.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { LIMITE_BASE64, assemblerPageLecteur, lireMessageDuLecteur, litteralScript } from './LecteurPdfPage';

const pieces = {
    gabarit: '<script>var L = /*UKIT:LIB*/; var W = /*UKIT:WORKER*/; var D = /*UKIT:DOCUMENT*/;</script><style>body{background:/*UKIT:FOND*/}</style>',
    bibliotheque: 'const a = "x"; if (a < "y") { document.write("</script>"); } // $& $1 \\ fin\n',
    worker: 'self.onmessage = () => {};',
};

describe('litteralScript', () => {
    it('rend un litteral que JavaScript relit a l identique', () => {
        for (const source of [pieces.bibliotheque, 'guillemets "" et \'\' et \\\\', 'ligne\u2028separee ']) {
            expect(JSON.parse(litteralScript(source))).toBe(source);
        }
    });

    it('ne laisse aucun < dans le litteral : un </script> ne peut pas fermer la balise', () => {
        expect(litteralScript(pieces.bibliotheque)).not.toContain('<');
    });
});

describe('assemblerPageLecteur', () => {
    it('pose les trois pieces et le fond, sans laisser de marqueur', () => {
        const page = assemblerPageLecteur(pieces, 'JVBERi0xLjQ=', '#F2F2F7');

        expect(page).not.toContain('/*UKIT:');
        expect(page).toContain('var D = "JVBERi0xLjQ=";');
        expect(page).toContain('background:#F2F2F7');
        // Le `$&` de la bibliotheque doit arriver tel quel : `replace` l'aurait remplace par le marqueur.
        expect(page).toContain('$& $1');
    });

    it('leve quand un marqueur manque au gabarit', () => {
        expect(() => assemblerPageLecteur({ ...pieces, gabarit: '<html></html>' }, '', '#000000'))
            .toThrow(/marqueur absent/);
    });

    it('refuse un fond qui n est pas une couleur hexadecimale', () => {
        expect(() => assemblerPageLecteur(pieces, '', 'red; } body { display: none'))
            .toThrow(/fond de page/);
    });

    it('assemble le vrai gabarit du depot', () => {
        const gabarit = readFileSync('assets/pdfjs/viewer.html', 'utf8');
        const page = assemblerPageLecteur({ ...pieces, gabarit }, 'JVBERi0xLjQ=', '#000000');

        expect(page).not.toContain('/*UKIT:');
        expect(page).toContain('type="module"');
    });

    it('borne le document a une taille que la page peut porter', () => {
        expect(LIMITE_BASE64).toBeGreaterThan(1_000_000);
    });
});

describe('lireMessageDuLecteur', () => {
    it('lit les deux messages que la page emet', () => {
        expect(lireMessageDuLecteur('{"type":"rendu","pages":3}')).toEqual({ type: 'rendu', pages: 3 });
        expect(lireMessageDuLecteur('{"type":"echec","detail":"Invalid PDF structure"}'))
            .toEqual({ type: 'echec', detail: 'Invalid PDF structure' });
    });

    it('ignore ce qui n est pas un message du lecteur, sans lever', () => {
        expect(lireMessageDuLecteur('pas du json')).toBeNull();
        expect(lireMessageDuLecteur('{"type":"autre"}')).toBeNull();
        expect(lireMessageDuLecteur('{"type":"rendu"}')).toBeNull();
        expect(lireMessageDuLecteur('null')).toBeNull();
    });
});
