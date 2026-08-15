/**
 * Ce que la projection d'un export iCalendar doit tenir.
 *
 * Les corps recopies ici sont **mesures** contre `ade.bordeaux-inp.fr` le 2026-08-15, pas imagines,
 * et chacun porte une propriete qui ne se voit pas a la relecture : l'heure d'ete d'un `DTSTART` en
 * UTC, le pliage de lignes de la RFC 5545, la virgule echappee d'une salle multiple, l'horodatage
 * d'export qui change a chaque requete, et un bloc de commentaire de longueur variable avant le code
 * de module. Les cinq feraient disparaitre ou fausser de la donnee en silence.
 */

import moment from 'moment';
import { describe, expect, it } from 'vitest';

import {
    couleurDeMatiere,
    decouperSemaineIcs,
    lireCalendrier,
    projeterAnneeIcs,
    projeterJourIcs,
    typeDuCours,
} from './IcsMapping';

/** Enveloppe des evenements dans un calendrier, en terminaisons CRLF comme le serveur les sert. */
function calendrier(...evenements: string[]): string {
    return [
        'BEGIN:VCALENDAR',
        'METHOD:REQUEST',
        'PRODID:-//ADE/version 6.0',
        'VERSION:2.0',
        'CALSCALE:GREGORIAN',
        ...evenements,
        'END:VCALENDAR',
    ].join('\r\n');
}

/**
 * Un cours reel, recopie de l'export du 18 novembre 2025 pour le groupe `2A GR1`.
 *
 * Il porte trois choses a la fois : le pliage de ligne de la description (`FARR` / ` ELL Flora`),
 * l'horodatage d'export, et un `DTSTART` en UTC un jour d'heure d'hiver.
 */
const COURS = [
    'BEGIN:VEVENT',
    'DTSTAMP:20260815T151255Z',
    'DTSTART:20251118T083000Z',
    'DTEND:20251118T095000Z',
    'SUMMARY:Traitement du signal',
    'LOCATION:CC-S112',
    'DESCRIPTION:\\n\\nCOG7-SCFTS\\nTD\\n2A GR1\\nTraitement du signal\\nFARR',
    ' ELL Flora\\n(Exporté le:15/08/2026 17:12)\\n',
    'UID:ADE60323032352d323032362d3831392d302d3132',
    'END:VEVENT',
].join('\r\n');

/** Le meme creneau hebdomadaire, en septembre : heure d'ete, donc une heure UTC de moins. */
const COURS_ETE = [
    'BEGIN:VEVENT',
    'DTSTART:20250916T073000Z',
    'DTEND:20250916T085000Z',
    'SUMMARY:Anglais',
    'LOCATION:',
    'DESCRIPTION:\\n\\nCOG9-CILAN\\nTD\\n2A GR1\\nAnglais\\n(Exporté le:15/08/2026 17:12)\\n',
    'UID:ete-1',
    'END:VEVENT',
].join('\r\n');

/** Le meme creneau, en novembre : heure d'hiver. Les deux doivent tomber a la meme heure locale. */
const COURS_HIVER = [
    'BEGIN:VEVENT',
    'DTSTART:20251118T083000Z',
    'DTEND:20251118T095000Z',
    'SUMMARY:Anglais',
    'LOCATION:',
    'DESCRIPTION:\\n\\nCOG9-CILAN\\nTD\\n2A GR1\\nAnglais\\n(Exporté le:15/08/2026 17:12)\\n',
    'UID:hiver-1',
    'END:VEVENT',
].join('\r\n');

/** Deux salles dans un seul `LOCATION`, separees par une virgule **echappee** (RFC 5545). */
const COURS_DEUX_SALLES = [
    'BEGIN:VEVENT',
    'DTSTART:20251118T130000Z',
    'DTEND:20251118T142000Z',
    'SUMMARY:Technologie et Prototypage rapide',
    'LOCATION:E103 - FabLaB\\,CD-O108',
    'DESCRIPTION:\\n\\nCOG5-SCFTP\\nTP\\n1A GR3\\nTechnologie et Prototypage rapide\\nPLACIN Frederic\\n(Exporté le:15/08/2026 17:12)\\n',
    'UID:salles-1',
    'END:VEVENT',
].join('\r\n');

/**
 * Un cours dont la description porte **deux lignes de commentaire** avant le code de module.
 *
 * C'est la mesure qui interdit de compter les lignes depuis le debut : ici le type `CM` est en
 * cinquieme position, ailleurs en quatrieme.
 */
const COURS_COMMENTE = [
    'BEGIN:VEVENT',
    'DTSTART:20251118T090000Z',
    'DTEND:20251118T110000Z',
    'SUMMARY:IA et société',
    'LOCATION:CD-O207',
    'DESCRIPTION:\\nCHAPRON Axelle - IBM\\nGROUPE A\\nCOG9-COGIA\\nCM\\n3A COMMUN\\nIA et société\\n(Exporté le:15/08/2026 17:12)\\n',
    'UID:commente-1',
    'END:VEVENT',
].join('\r\n');

/** Un evenement **sans** code de module : son type n'est pas derivable, et c'est un cas reel. */
const COURS_SANS_MODULE = [
    'BEGIN:VEVENT',
    'DTSTART:20251118T120000Z',
    'DTEND:20251118T140000Z',
    'SUMMARY:LAI (180)',
    'LOCATION:',
    'DESCRIPTION:\\n\\n\\n\\nCGP-3A LAI\\nAGB-3A LAI\\nLEAL CALDERON Fernando\\n(Exporté le:15/08/2026 17:12)\\n',
    'UID:sans-module-1',
    'END:VEVENT',
].join('\r\n');

describe('lireCalendrier', () => {
    it('deplie les lignes et retire l horodatage d export', () => {
        const [cours] = lireCalendrier(calendrier(COURS), '2A GR1');

        // Le pliage RFC 5545 est recolle : sans lui, l'enseignant s'appellerait « FARR ».
        expect(cours.description).toContain('FARRELL Flora');
        // L'horodatage change a CHAQUE requete : le laisser passer afficherait une horloge dans la
        // fiche du cours et rendrait deux lectures du meme jour toujours differentes.
        expect(cours.description).not.toContain('Exporté le');
    });

    it('met la salle en tete de la description, parce qu elle vient d un champ separe', () => {
        const [cours] = lireCalendrier(calendrier(COURS), '2A GR1');
        expect(cours.description.split('\n')[0]).toBe('CC-S112');
    });

    it('n affiche pas deux fois ce que l ecran montre deja', () => {
        // Constate sur appareil : la fiche portait un `TD` en pastille **et** un `TD` en ligne de
        // description. La matiere subissait le meme sort. Meme regle que chez Celcat.
        const [cours] = lireCalendrier(calendrier(COURS), '2A GR1');
        const lignes = cours.description.split('\n');

        expect(lignes).not.toContain('TD');
        expect(lignes).not.toContain('Traitement du signal');
        expect(lignes).toEqual(['CC-S112', 'COG7-SCFTS', '2A GR1', 'FARRELL Flora']);
    });

    it('deshabille la virgule echappee d une salle multiple', () => {
        const [cours] = lireCalendrier(calendrier(COURS_DEUX_SALLES), '1A GR3');
        expect(cours.description.split('\n')[0]).toBe('E103 - FabLaB,CD-O108');
    });

    it('projette le sujet, l horaire et l identifiant', () => {
        const [cours] = lireCalendrier(calendrier(COURS), '2A GR1');

        expect(cours.subject).toBe('Traitement du signal');
        expect(cours.category).toBe('TD');
        expect(cours.schedule).toBe('09:30-10:50 TD');
        expect(cours.id).toBe('ADE60323032352d323032362d3831392d302d3132');
        expect(cours.group).toBe('2A GR1');
        // L'instant, lui, ne depend d'aucun fuseau.
        expect(cours.date.start).toBe('2025-11-18T08:30:00.000Z');
    });

    it('lit les dates en UTC honnete : l heure d ete est geree par la source', () => {
        // La mesure du jalon. Le meme creneau hebdomadaire est servi `07:30Z` en septembre et
        // `08:30Z` en novembre : c'est le serveur qui applique le decalage, pas nous. Un affichage
        // qui ignorerait cela decalerait tous les cours d'une heure la moitie de l'annee.
        const [ete] = lireCalendrier(calendrier(COURS_ETE), '2A GR1');
        const [hiver] = lireCalendrier(calendrier(COURS_HIVER), '2A GR1');

        expect(ete.starttime).toBe('09:30');
        expect(hiver.starttime).toBe('09:30');
        expect(ete.endtime).toBe('10:50');
        expect(hiver.endtime).toBe('10:50');
    });

    it('rend une liste vide sur un corps illisible plutot que de lever', () => {
        expect(lireCalendrier('ceci n est pas un calendrier', '2A GR1')).toEqual([]);
        expect(lireCalendrier(null, '2A GR1')).toEqual([]);
        // Un calendrier vide est un **resultat** : une semaine sans cours.
        expect(lireCalendrier(calendrier(), '2A GR1')).toEqual([]);
    });
});

describe('typeDuCours', () => {
    it('ancre le type sur le code de module, quelle que soit la longueur du commentaire', () => {
        expect(typeDuCours('\n\nCOG7-SCFTS\nTD\n2A GR1\nTraitement du signal\n')).toBe('TD');
        // Deux lignes de commentaire avant le code : compter depuis le debut donnerait « GROUPE A ».
        expect(typeDuCours('\nCHAPRON Axelle - IBM\nGROUPE A\nCOG9-COGIA\nCM\n3A COMMUN\n')).toBe('CM');
    });

    it('rend une chaine vide quand aucun code de module n ancre la description', () => {
        // Un resultat, pas un echec : inventer une categorie serait pire que de ne rien afficher, et
        // la pastille de l'ecran sait se taire sur une categorie vide.
        expect(typeDuCours('\n\n\n\nCGP-3A LAI\nAGB-3A LAI\nLEAL CALDERON Fernando\n')).toBe('');
    });

    it('accepte les codes de module a chiffre final des autres ecoles', () => {
        expect(typeDuCours('\n\nESE7-INFS2\nCI\nS2\nProgrammation\n')).toBe('CI');
        expect(typeDuCours('\n\nBIO7-MBCM4\nTD\n2A FISA\nImmunologie\n')).toBe('TD');
    });
});

describe('couleurDeMatiere', () => {
    it('n emet jamais la teinte par defaut, qui signifierait « pas de couleur »', () => {
        // Les 61 matieres d'une annee complete de l'ENSC, mesurees le 2026-08-15. Aucune ne doit
        // tomber hors de la palette : `theme.courses` retomberait sur `default`, et un cours aurait
        // l'air de n'avoir pas de couleur. C'est le defaut trouve sur appareil — la palette d'origine
        // contenait une teinte neutre, qui attrapait 8 matieres sur 61 et 467 cours sur l'annee.
        const matieres = [
            'Traitement du signal', 'Anglais', 'Systèmes Cognitifs Hybrides', 'Génie logiciel',
            'Facteurs humains, Utilisabilité et UX', 'Probabilités et statistique', 'Physique',
            'Conception Centrée Utilisateur et Innovation', 'Intelligence Artificielle',
            'Programmation avancée', 'Augmentation et Autonomie', 'Anglais TOEIC', '',
        ];
        for (const matiere of matieres) {
            expect(couleurDeMatiere(matiere)).toMatch(/^palette-[1-8]$/);
        }
    });

    it('rend la meme teinte pour la meme matiere, et reste dans la palette du theme', () => {
        expect(couleurDeMatiere('Traitement du signal')).toBe(couleurDeMatiere('Traitement du signal'));
        for (const matiere of ['Anglais', 'Génie logiciel', 'Physique', '', 'Probabilités et statistique']) {
            expect(couleurDeMatiere(matiere)).toMatch(/^palette-[1-8]$/);
        }
    });

    it('distingue deux matieres voisines', () => {
        expect(couleurDeMatiere('Anglais')).not.toBe(couleurDeMatiere('Anglais TOEIC'));
    });
});

describe('projeterJourIcs', () => {
    it('trie les cours de la journee par heure', () => {
        const cours = projeterJourIcs(calendrier(COURS_DEUX_SALLES, COURS), '2A GR1');
        expect(cours.map((c) => c.starttime)).toEqual(['09:30', '14:00']);
    });

    it('n a pas de refiltrage sur la date : les bornes d ADE sont respectees', () => {
        // Contrairement a Celcat, qui rend les cours du lundi pour une journee demandee un dimanche.
        expect(projeterJourIcs(calendrier(COURS), '2A GR1')).toHaveLength(1);
    });
});

describe('decouperSemaineIcs', () => {
    it('rend six jours et y range les cours, le dimanche ecarte', () => {
        const semaine = decouperSemaineIcs(calendrier(COURS), '2A GR1', moment('2025-11-17'));

        expect(semaine).toHaveLength(6);
        // Le 18 novembre 2025 est un mardi.
        expect(semaine[1].courses).toHaveLength(1);
        expect(semaine[1].courses[0].dayNumber).toBe('2');
        expect(semaine[0].courses).toHaveLength(0);
    });
});

describe('projeterAnneeIcs', () => {
    it('rend une liste a plat, decoree du jour', () => {
        const evenements = projeterAnneeIcs(calendrier(COURS, COURS_SANS_MODULE), '2A GR1');

        expect(evenements).toHaveLength(2);
        expect(evenements[0].dayNumber).toBe('2');
        // Un evenement sans code de module garde une categorie vide, et son horaire s'affiche seul.
        const sansModule = evenements.find((evenement) => evenement.subject === 'LAI (180)');
        expect(sansModule?.category).toBe('');
        expect(sansModule?.schedule).toBe('13:00-15:00');
    });
});

describe('sous-groupe', () => {
    it('deduit le filtre quand le cours designe un groupe plus precis que celui demande', () => {
        const anglais = [
            'BEGIN:VEVENT',
            'DTSTART:20251118T130000Z',
            'DTEND:20251118T142000Z',
            'SUMMARY:Anglais TOEIC',
            'LOCATION:CD-O204',
            'DESCRIPTION:\\n\\nCOG7-CILAN\\nTD\\n2A GR1 Anglais TOEIC\\nAnglais TOEIC\\nFARRELL Flora\\n(Exporté le:15/08/2026 17:12)\\n',
            'UID:toeic-1',
            'END:VEVENT',
        ].join('\r\n');

        const [cours] = lireCalendrier(calendrier(anglais), '2A GR1');
        expect(cours.toFilter).toBe('Anglais TOEIC');
    });

    it('ne deduit rien pour le planning agrege des favoris', () => {
        const [cours] = lireCalendrier(calendrier(COURS), ['2A GR1', 'ENSC 1A']);
        expect(cours.toFilter).toBeNull();
    });

    it('ne deduit rien quand le cours designe exactement le groupe demande', () => {
        const [cours] = lireCalendrier(calendrier(COURS_COMMENTE), '3A COMMUN');
        expect(cours.toFilter).toBeNull();
    });
});
