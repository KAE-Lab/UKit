import { describe, expect, it } from 'vitest';

import { nomDuCertificat, projeterCertificat } from './CertificatProjection';

/**
 * La sortie telle que le run reel l'a rendue le 2026-08-29, contenu tronque.
 *
 * Les valeurs viennent de la sonde : trois certificats listes, le premier de 93 759 octets, libelle
 * « Certificat 2026/2027 ». Un gabarit invente aurait teste ce qu'on imagine du portail.
 */
const SORTIE_REELLE = {
    nombre: 3,
    libelles: ['Certificat 2026/2027', 'Certificat 2025/2026', 'Certificat 2024/2025'],
    liens: ['/document/QXBw…/lang'],
    fichier: { libelle: 'Certificat 2026/2027', octets: 93759, contenu: 'JVBERi0xLjQK' },
};

describe('projeterCertificat', () => {
    it('rend la piece quand le run en rapporte une', () => {
        const projection = projeterCertificat(SORTIE_REELLE);

        expect(projection.ok).toBe(true);
        if (projection.ok !== true) return;
        expect(projection.certificat.libelle).toBe('Certificat 2026/2027');
        expect(projection.certificat.octets).toBe(93759);
        expect(projection.certificat.contenu).toBe('JVBERi0xLjQK');
    });

    it('lit « aucune piece » sur le null que rend une categorie vide', () => {
        // Le script du Blueprint rend `null` plutot que d'echouer : un dossier sans certificat n'est
        // pas une panne du portail.
        expect(projeterCertificat({ ...SORTIE_REELLE, fichier: null })).toEqual({
            ok: false, refus: 'aucune-piece',
        });
    });

    it('lit « aucune piece » quand la sortie manque entierement', () => {
        expect(projeterCertificat({ nombre: 0 })).toEqual({ ok: false, refus: 'aucune-piece' });
    });

    it('refuse ce que le script a lui-meme signale comme rate', () => {
        for (const erreur of ['reseau', 'statut-403', 'pas-un-pdf', 'trop-gros']) {
            expect(projeterCertificat({ fichier: { erreur } })).toEqual({ ok: false, refus: 'refuse' });
        }
    });

    it('refuse un contenu vide plutot que de ranger un PDF de zero octet', () => {
        expect(projeterCertificat({ fichier: { libelle: 'Certificat', octets: 0, contenu: '' } }))
            .toEqual({ ok: false, refus: 'illisible' });
        expect(projeterCertificat({ fichier: { libelle: 'Certificat', octets: 12, contenu: '   ' } }))
            .toEqual({ ok: false, refus: 'illisible' });
    });

    it('refuse une sortie qui n’a pas la forme attendue', () => {
        expect(projeterCertificat({ fichier: 'un-pdf' })).toEqual({ ok: false, refus: 'illisible' });
        expect(projeterCertificat({ fichier: ['un-pdf'] })).toEqual({ ok: false, refus: 'illisible' });
    });

    it('accepte une piece sans libelle : c’est le nom qui manque, pas la piece', () => {
        const projection = projeterCertificat({ fichier: { octets: 10, contenu: 'JVBERi0=' } });

        expect(projection.ok).toBe(true);
        if (projection.ok !== true) return;
        expect(projection.certificat.libelle).toBe('');
    });
});

describe('nomDuCertificat', () => {
    it('remplace la barre oblique du libelle, qui separerait des repertoires', () => {
        expect(nomDuCertificat('Certificat 2026/2027', 'Certificat')).toBe('Certificat 2026-2027.pdf');
    });

    it('rend le meme nom pour le meme libelle — c’est la cle d’idempotence', () => {
        expect(nomDuCertificat('Certificat 2026/2027', 'Certificat'))
            .toBe(nomDuCertificat('Certificat 2026/2027', 'Certificat'));
    });

    it('garde les accents et la ponctuation lisible', () => {
        expect(nomDuCertificat('Attestation de réussite (2026)', 'Certificat'))
            .toBe('Attestation de réussite (2026).pdf');
    });

    it('neutralise ce qui casserait un chemin', () => {
        expect(nomDuCertificat('a\\b:c*d?e"f<g>h|i', 'Certificat')).toBe('a-b-c-d-e-f-g-h-i.pdf');
        expect(nomDuCertificat('../../etc/passwd', 'Certificat')).toBe('..-..-etc-passwd.pdf');
    });

    it('retombe sur le defaut quand le libelle ne laisse rien', () => {
        expect(nomDuCertificat('', 'Certificat')).toBe('Certificat.pdf');
        expect(nomDuCertificat('///', 'Certificat')).toBe('Certificat.pdf');
    });
});
