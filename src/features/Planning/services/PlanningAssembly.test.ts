/**
 * Ce que la separation du code d'UE doit tenir.
 *
 * Le defaut d'origine s'est vu sur appareil au jalon 6-I : `2025-2026 - Les rencontres du Réseau
 * d'Écoute` s'affichait comme un cours d'unite d'enseignement `2026` intitule `- Les rencontres du
 * Réseau d'Écoute`, tiret orphelin compris — et l'en-tete de la fiche annoncait `2026`. Seize
 * matieres d'un seul groupe etaient dans ce cas.
 *
 * La regle vaut pour les deux sources : les codes d'UE de Celcat gardent exactement le comportement
 * qu'ils avaient, et c'est la moitie de ce que ces cas verrouillent.
 */

import { describe, expect, it } from 'vitest';

import { indexerUes, separerCodeUE, trierCours } from './PlanningAssembly';

describe('separerCodeUE, codes Celcat', () => {
    it('separe un code d UE de son intitule, comme avant', () => {
        expect(separerCodeUE('4TIN602U Techn algorithmiques et program')).toEqual({
            code: '4TIN602U',
            reste: 'Techn algorithmiques et program',
        });
        expect(separerCodeUE('1AAA111A Algebre')).toEqual({ code: '1AAA111A', reste: 'Algebre' });
    });
});

describe('separerCodeUE, titres ADE', () => {
    it('ne prend pas une annee pour un code d unite d enseignement', () => {
        // Les seize titres mesures le 2026-08-15 commencent par une annee. Un nombre nu n'est pas un
        // code d'UE : la lettre obligatoire est ce qui les separe.
        for (const titre of [
            "2025-2026 - Les rencontres du Réseau d'Écoute et d'Accompagnement",
            '2025-2026 - RENTREE - Buffet d accueil',
            '2025/2026 Présentation d élus étudiants Bordeaux INP (élection 2026)',
            '25-26 Réunion RI',
            '2025-2026 - WEI',
        ]) {
            expect(separerCodeUE(titre)).toBeNull();
        }
    });

    it('rend null sur une matiere ordinaire, qui n a pas de code', () => {
        expect(separerCodeUE('Traitement du signal')).toBeNull();
        expect(separerCodeUE('Anglais TOEIC')).toBeNull();
    });
});

describe('trierCours', () => {
    it('trie par heure, puis par sujet apres retrait du code d UE', () => {
        const cours = [
            { starttime: '10:00', subject: '4TIN603U Compilation' },
            { starttime: '08:00', subject: '9ZZZ999Z Zoologie' },
            { starttime: '10:00', subject: '1AAA111A Algebre' },
        ];

        expect([...cours].sort(trierCours).map((c) => c.subject)).toEqual([
            '9ZZZ999Z Zoologie',
            '1AAA111A Algebre',
            '4TIN603U Compilation',
        ]);
    });

    it('trie un titre ADE sur son intitule entier, annee comprise', () => {
        // Sans la lettre obligatoire, celui-ci se serait trie sur « - LES RENCONTRES », c'est-a-dire
        // sur un tiret — donc avant tout le reste, pour une raison invisible.
        const cours = [
            { starttime: '08:00', subject: "2025-2026 - Les rencontres du Réseau d'Écoute" },
            { starttime: '08:00', subject: 'Anglais' },
        ];

        expect([...cours].sort(trierCours).map((c) => c.subject[0])).toEqual(['2', 'A']);
    });
});


describe('indexerUes', () => {
    it('garde l intitule, qui etait jete', () => {
        // Le defaut que ca corrige : les reglages n'affichaient qu'un code, que personne ne sait
        // relier a un cours sans ouvrir son planning.
        expect(indexerUes(['4TIN602U Techn algorithmiques et program'])).toEqual([
            { code: '4TIN602U', nom: 'Techn algorithmiques et program' },
        ]);
    });

    it('applique la regle du jalon 6-I, que l indexation avait ratee', () => {
        // L'ancienne expression acceptait un nombre nu : un titre d'ADE commencant par une annee
        // devenait une UE fantome `2026`, dans la liste de suggestions comme dans les filtres.
        expect(indexerUes(["2025-2026 - Les rencontres du Reseau d'Ecoute"])).toEqual([]);
    });

    it('nettoie l intitule, que la source espace parfois deux fois', () => {
        expect(indexerUes(['4TIN606U  Histoire et Epistemologie'])[0].nom).toBe('Histoire et Epistemologie');
    });

    it('cumule sans changer un intitule deja connu', () => {
        // Deux sujets d'une meme UE peuvent differer ; changer le libelle d'un rendu a l'autre ferait
        // clignoter l'ecran des reglages sans raison.
        const connues = [{ code: '4TIN602U', nom: 'Techn algorithmiques' }];
        const apres = indexerUes(['4TIN602U Autre libelle', '4TIN603U Compilation'], connues);

        expect(apres).toEqual([
            { code: '4TIN602U', nom: 'Techn algorithmiques' },
            { code: '4TIN603U', nom: 'Compilation' },
        ]);
    });

    it('ecarte ce qui ne porte pas de code, sans lever', () => {
        expect(indexerUes(['Presentation semestre', '', 'N/C'])).toEqual([]);
    });

    it('trie par code, pour que l ecran ne depende pas de l ordre des cours', () => {
        const codes = indexerUes(['4TIN615U Logique', '4TIN602U Techn']).map((ue) => ue.code);
        expect(codes).toEqual(['4TIN602U', '4TIN615U']);
    });
});
