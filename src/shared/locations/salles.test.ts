/**
 * Ce que la reconnaissance de salle doit tenir, sur les deux formes reelles.
 *
 * Le premier enjeu est une **non-regression** : la forme bordelaise etait onze lignes de code, et le
 * jalon 6-I les a remplacees par une donnee de catalogue. Les cas verrouilles ici sont ceux ou une
 * generalisation naive change ce que resout un libelle — la troncature qui n'est pas une enumeration,
 * et `A5bis` qui ne doit surtout pas devenir `A5`.
 *
 * Le second est la forme de Bordeaux INP, mesuree le 2026-08-15 : `CD-O204`, `CA-N103`,
 * `E103 - FabLaB,CD-O108`. Aucune ne correspond au motif bordelais, et c'est ce qui rendait la carte
 * du cours impossible pour ce portail.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getLocations, getLocationsInText, ligneDeSalle } from './salles';
import { appliquerSurcouche } from './referentiel';
import type { FormatSalles } from '../etablissements/catalogue';

/** Le format historique, celui que porte le socle embarque et toute ligne sans colonne `salles`. */
const BORDEAUX: FormatSalles = { separateurs: [' | ', '/'], motif: '([A-Z][0-9]+)', depuis: 2 };

/** Celui de Bordeaux INP : la virgule enumere, le tiret cadratin tronque, le prefixe est le code. */
const INP: FormatSalles = { separateurs: [',', ' - '], motif: '^([A-Z]{2})-', depuis: 0 };

describe('getLocations, forme bordelaise', () => {
    it('tronque sur la barre oblique plutot que d y voir un second lieu', () => {
        const lieux = getLocations('A22/Amphithéâtre Charles DARWIN', BORDEAUX);

        expect(lieux).toHaveLength(1);
        expect(lieux[0].title).toBe('A22');
        expect(lieux[0].lat).toBeCloseTo(44.8072, 3);
    });

    it('enumere sur la barre verticale', () => {
        expect(getLocations('A22/Amphi | A29/Salle 12', BORDEAUX).map((lieu) => lieu.title)).toEqual(['A22', 'A29']);
    });

    it('ne confond pas A5bis avec A5', () => {
        // Le piege du jalon. Appliquer d'emblee `([A-Z][0-9]+)` a `A5bis` capturerait `A5`, qui existe
        // aussi dans le referentiel : la fiche de cours pointerait un **autre batiment**. Le segment
        // est donc essaye tel quel d'abord, et le motif ne sert que de repli.
        const bis = getLocations('A5bis/Salle 3', BORDEAUX);
        expect(bis).toHaveLength(1);
        expect(bis[0].title).toBe('A5bis');
        expect(bis[0].lat).not.toBeCloseTo(getLocations('A5/Salle 3', BORDEAUX)[0].lat as number, 5);
    });

    it('ignore un libelle qui ne nomme aucun batiment connu', () => {
        expect(getLocations('Salle inconnue', BORDEAUX)).toEqual([]);
    });
});

describe('getLocations, forme Bordeaux INP', () => {
    // Les batiments de l'INP n'entrent pas dans le socle embarque : ils arrivent par la table
    // `batiments`, sans release, et c'est exactement ce que ce jalon publie. Le test installe donc la
    // surcouche par le **vrai** mecanisme du jalon 6-D plutot que de contourner le referentiel.
    beforeAll(() => {
        appliquerSurcouche({
            CA: { lat: 44.80723, lng: -0.60598, campus: 'Talence' },
            CD: { lat: 44.80664, lng: -0.60639, campus: 'Talence' },
        });
    });
    afterAll(() => appliquerSurcouche());

    it('tire le code de batiment du prefixe d une salle ADE', () => {
        expect(getLocations('CD-O204', INP).map((lieu) => lieu.title)).toEqual(['CD']);
        expect(getLocations('CA-N103', INP).map((lieu) => lieu.title)).toEqual(['CA']);
    });

    it('enumere sur la virgule et tronque sur le tiret', () => {
        // `E103 - FabLaB,CD-O108` : deux salles, dont une nommee. `ical.js` a deja deshabille la
        // virgule echappee de la RFC 5545 quand le libelle arrive ici. `E103` ne designe aucun
        // batiment publie et disparait donc en silence, ce qui est le comportement voulu — une salle
        // qu'on ne sait pas placer ne doit pas empecher de placer les autres.
        expect(getLocations('E103 - FabLaB,CD-O108', INP).map((lieu) => lieu.title)).toEqual(['CD']);
    });

    it('ne resout rien sur un libelle vide, ce que LOCATION est souvent', () => {
        expect(getLocations('', INP)).toEqual([]);
    });
});

describe('getLocationsInText', () => {
    it('trouve un batiment cite au milieu d un texte', () => {
        expect(getLocationsInText('Cours en A29 salle 12', BORDEAUX).map((lieu) => lieu.title)).toEqual(['A29']);
    });

    it('rend une liste vide quand le motif ne correspond a rien', () => {
        expect(getLocationsInText('Cours a distance', BORDEAUX)).toEqual([]);
    });

    it('ne leve pas et retombe sur le defaut quand le motif publie est illisible', () => {
        // Un motif vient de la base : il doit pouvoir etre faux sans casser une fiche de cours.
        const casse: FormatSalles = { ...BORDEAUX, motif: '([A-Z]' };
        expect(() => getLocationsInText('A29', casse)).not.toThrow();
        expect(getLocationsInText('A29', casse)).toEqual([]);
    });
});

describe('ligneDeSalle', () => {
    it('commence a la troisieme ligne pour une description Celcat', () => {
        // Le groupe et l'enseignant occupent les deux premieres : chercher des la premiere ferait
        // passer un code de groupe pour un batiment.
        const description = 'CMI ISI601A1, INF601A\nGAVOILLE Cyril\nA22/Amphithéâtre Charles DARWIN\n3,5-7,9-11';
        expect(ligneDeSalle(description, BORDEAUX)).toBe('A22/Amphithéâtre Charles DARWIN');
    });

    it('commence a la premiere ligne pour une description iCalendar', () => {
        // La salle vient d'un champ separe (`LOCATION`) que `IcsMapping` remet en tete.
        expect(ligneDeSalle('CC-S112\n2A GR1\nFARRELL Flora', INP)).toBe('CC-S112');
    });

    it('ecarte une ligne qui n est qu une enumeration de semaines', () => {
        expect(ligneDeSalle('Groupes\nEnseignant\n3,5-7,9-11\nA29/Salle', BORDEAUX)).toBe('A29/Salle');
        expect(ligneDeSalle('Groupes\nEnseignant\nSemaines : 3-7', BORDEAUX)).toBe('');
    });

    it('rend une chaine vide sur une description absente', () => {
        expect(ligneDeSalle('', BORDEAUX)).toBe('');
    });
});
