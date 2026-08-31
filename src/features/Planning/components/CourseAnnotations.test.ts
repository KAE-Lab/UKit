/**
 * Ce que l'icone d'une ligne de description doit tenir.
 *
 * Le defaut d'origine etait positionnel — premiere ligne un groupe, deuxieme un enseignant,
 * troisieme une salle — et il s'est vu sur appareil au jalon 6-I : dans une fiche de cours de
 * Bordeaux INP, la salle `CD-O204` portait l'icone « groupe » et le type `TD` portait l'icone
 * « lieu ». Les cas d'ici sont les deux formes reelles, cote a cote.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { iconeDAnnotation } from './CourseAnnotations';
import { appliquerSurcouche } from '../../../shared/locations/referentiel';
import {
    ETABLISSEMENT_DEFAUT,
    appliquerCatalogue,
    projeterEtablissement,
    setCodeEtablissementActif,
} from '../../../shared/etablissements/catalogue';
import type { EtablissementRow } from '../../../shared/supabase/types';

describe('iconeDAnnotation, description Celcat', () => {
    // Les quatre lignes d'un cours bordelais, dans l'ordre ou le serveur les sert. Elles rendaient
    // deja ces quatre icones avant le jalon : la regle a change, le resultat non.
    it('rend les memes icones qu avant sur les quatre lignes d un cours', () => {
        expect(iconeDAnnotation('CMI ISI601A1, INF601A, MI601A')).toBe('group');
        expect(iconeDAnnotation('GAVOILLE Cyril')).toBe('person');
        expect(iconeDAnnotation('A22/Amphithéâtre Charles DARWIN')).toBe('room');
        expect(iconeDAnnotation('3,5-7,9-11,13-14')).toBe('date-range');
    });

    it('reconnait une salle par mot-cle quand le referentiel ne la connait pas', () => {
        expect(iconeDAnnotation('Salle des thèses')).toBe('room');
        expect(iconeDAnnotation('Amphi Darwin')).toBe('room');
    });
});

describe('iconeDAnnotation, description iCalendar', () => {
    // L'etablissement **et** son referentiel, installes par les vrais mecanismes : la reconnaissance
    // de salle lit le format de l'etablissement actif, donc un test qui ne le poserait pas
    // verifierait la forme bordelaise en croyant verifier celle de l'INP.
    beforeAll(() => {
        appliquerSurcouche({ CD: { lat: 44.806224, lng: -0.597046 } });
        appliquerCatalogue({
            inp: projeterEtablissement({
                code: 'inp',
                nom: 'Bordeaux INP',
                salles: { separateurs: [','], motif: '^([A-Z]{2})-', depuis: 0 },
            } as unknown as EtablissementRow),
        });
        setCodeEtablissementActif('inp');
    });
    afterAll(() => {
        appliquerSurcouche();
        appliquerCatalogue(null);
        setCodeEtablissementActif(ETABLISSEMENT_DEFAUT);
    });

    it('rend l icone juste sur les quatre lignes d un cours ADE', () => {
        // Le defaut exact trouve sur appareil : ces deux-la etaient inversees.
        expect(iconeDAnnotation('CD-O204')).toBe('room');
        expect(iconeDAnnotation('COG7-CILAN')).toBe('info-outline');
        expect(iconeDAnnotation('2A GR1 Anglais TOEIC')).toBe('group');
        expect(iconeDAnnotation('FARRELL Flora')).toBe('person');
    });

    it('reconnait les codes de module des autres ecoles', () => {
        expect(iconeDAnnotation('ESE7-INFS2')).toBe('info-outline');
        expect(iconeDAnnotation('BIO7-MBCM4')).toBe('info-outline');
        expect(iconeDAnnotation('JPB1-OPTIQ')).toBe('info-outline');
    });

    it('ne prend pas un libelle de groupe pour un code de module', () => {
        expect(iconeDAnnotation('2A FISE-G1')).toBe('group');
        expect(iconeDAnnotation('ENSEGID 2A')).toBe('group');
    });
});
