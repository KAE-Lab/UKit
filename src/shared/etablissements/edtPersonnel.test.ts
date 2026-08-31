/**
 * Ce que l'emploi du temps personnel doit tenir.
 *
 * Le risque est asymetrique et il ne se voit pas a l'ecran. Un identifiant de ressource mal garde ne
 * rend pas une erreur : l'export anonyme d'ADE accepte **n'importe quel** identifiant et rend
 * l'emploi du temps correspondant, donc une entree corrompue afficherait le planning de quelqu'un
 * d'autre. Et une fusion ratee ferait perdre le groupe personnel ou, pire, masquerait une entree du
 * referentiel publie.
 */

import { describe, expect, it } from 'vitest';

import {
    appliquerEdtsPersonnels,
    edtPersonnelActif,
    fusionnerEdtsPersonnels,
    fusionnerGroupePersonnel,
    lireEdtsPersonnels,
} from './edtPersonnel';
import type { EdtIcal } from './catalogue';

const MOI = { nom: 'Belharet Damien', ressource: '4087' };
const AUTRE = { nom: 'Dupont Camille', ressource: '4156' };

const REFERENTIEL: EdtIcal = {
    blueprint: 'ukit.portail.bordeaux-inp.edt',
    blueprintAnnee: 'ukit.portail.bordeaux-inp.edt.annee',
    params: { projet: '1' },
    groupes: [{ nom: 'ENSC 2A GR1', ressource: '2467' }],
};

describe('lireEdtsPersonnels', () => {
    it('lit la table telle qu elle est ecrite', () => {
        expect(lireEdtsPersonnels(JSON.stringify({ 'bordeaux-inp': MOI }))).toEqual({ 'bordeaux-inp': MOI });
    });

    it('rend une table vide plutot que de lever sur un contenu illisible', () => {
        expect(lireEdtsPersonnels('{')).toEqual({});
        expect(lireEdtsPersonnels(null)).toEqual({});
        expect(lireEdtsPersonnels('[]')).toEqual({});
    });

    it('refuse un identifiant de ressource qui n est pas un nombre', () => {
        // La garde qui compte. Elle est deja posee a la lecture du dossier ; elle est refaite ici
        // parce qu'une entree corrompue ne produirait aucune erreur visible, juste le planning de
        // quelqu'un d'autre.
        const brut = JSON.stringify({
            a: { nom: 'X', ressource: 'Direct Planning Tree_4087' },
            b: { nom: 'X', ressource: '' },
            c: { nom: 'X', ressource: 4087 },
            d: MOI,
        });
        expect(lireEdtsPersonnels(brut)).toEqual({ d: MOI });
    });

    it('refuse une entree sans nom, qui ne pourrait ni s afficher ni se retenir', () => {
        // Le nom **est** la cle du favori : sans lui, le groupe serait enregistre et introuvable.
        expect(lireEdtsPersonnels(JSON.stringify({ a: { nom: '', ressource: '4087' } }))).toEqual({});
    });
});

describe('fusionnerEdtsPersonnels', () => {
    it('pose une entree sans toucher aux autres, et la retire avec null', () => {
        const table = fusionnerEdtsPersonnels({ bordeaux: AUTRE }, 'bordeaux-inp', MOI);
        expect(table).toEqual({ bordeaux: AUTRE, 'bordeaux-inp': MOI });
        expect(fusionnerEdtsPersonnels(table, 'bordeaux-inp', null)).toEqual({ bordeaux: AUTRE });
    });
});

describe('edtPersonnelActif', () => {
    it('rend null quand rien n est enregistre', () => {
        appliquerEdtsPersonnels(null);
        expect(edtPersonnelActif()).toBeNull();
    });

    it('ne rend que l entree de l etablissement selectionne', () => {
        // L'etablissement par defaut est Bordeaux : l'entree de l'INP ne doit pas s'y voir. C'est le
        // cloisonnement, et le confondre afficherait un emploi du temps d'une fac sous une autre.
        appliquerEdtsPersonnels({ 'bordeaux-inp': MOI });
        expect(edtPersonnelActif()).toBeNull();

        appliquerEdtsPersonnels({ bordeaux: MOI });
        expect(edtPersonnelActif()).toEqual(MOI);
        appliquerEdtsPersonnels(null);
    });
});

describe('fusionnerGroupePersonnel', () => {
    it('pose le groupe personnel en tete du referentiel', () => {
        const fusion = fusionnerGroupePersonnel(REFERENTIEL, MOI);
        expect(fusion.groupes).toEqual([MOI, ...REFERENTIEL.groupes]);
    });

    it('rend la configuration telle quelle quand il n y a rien a fusionner', () => {
        // L'identite, et pas seulement l'egalite : `sourceEdt()` est appelee a chaque rendu.
        expect(fusionnerGroupePersonnel(REFERENTIEL, null)).toBe(REFERENTIEL);
    });

    it('laisse gagner le referentiel publie sur un nom deja present', () => {
        // Deux entrees de meme nom en rendraient une inatteignable : `resoudreRessources` resout par
        // le nom, et prendrait la premiere.
        const homonyme = { nom: 'ENSC 2A GR1', ressource: '9999' };
        expect(fusionnerGroupePersonnel(REFERENTIEL, homonyme)).toBe(REFERENTIEL);
    });

    it('ne mute pas le referentiel qu on lui donne', () => {
        fusionnerGroupePersonnel(REFERENTIEL, MOI);
        expect(REFERENTIEL.groupes).toHaveLength(1);
    });
});
