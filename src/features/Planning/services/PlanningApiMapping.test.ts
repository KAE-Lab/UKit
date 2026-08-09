/**
 * Ce que la projection de l'emploi du temps doit tenir.
 *
 * Les cas verrouilles ici sont **mesures** contre la vraie source le 2026-08-09, pas imagines :
 * l'arite d'une extraction, la description telle que Celcat la sert reellement, le separateur qui
 * change avec la vue, et la fin nulle d'un evenement de vacances. Aucun des quatre ne se voit a la
 * relecture, et chacun ferait disparaitre de la donnee en silence.
 */

import moment from 'moment';
import { describe, expect, it } from 'vitest';

import {
    decouperSemaine,
    projeterAnnee,
    projeterCours,
    projeterGroupes,
    projeterJour,
    sujetDuCours,
    trierCours,
    type CoursExtrait,
} from './PlanningApiMapping';

/** Un cours reel, recopie d'une reponse du serveur de l'universite. */
const COURS: CoursExtrait = {
    id: '-390114417:-1414780040:6:1512279:21',
    debut: '2026-01-12T09:30:00',
    fin: '2026-01-12T10:50:00',
    categorie: 'Cours',
    couleur: '#00FFFF',
    modules: '4TIN602U Techn algorithmiques et program',
    description:
        'Cours\r\n\r\n<br />\r\n\r\n4TIN602U Techn algorithmiques et program\r\n\r\n<br />\r\n\r\n' +
        'CMI ISI601A1, INF601A, MI601A\r\n\r\n<br />\r\n\r\nGAVOILLE Cyril\r\n\r\n<br />\r\n\r\n' +
        'A22/Amphith&#233;&#226;tre Charles DARWIN\r\n\r\n<br />\r\n\r\n3,5-7,9-11,13-14\r\n',
};

/** Un evenement de vacances, tel que la source le sert : journee entiere, sans fin, sans modules. */
const VACANCES: CoursExtrait = {
    id: '-390114417:-1414780040:6:1392549:10',
    debut: '2025-10-27T08:00:00',
    fin: null,
    categorie: 'Vacances',
    couleur: '#FF0000',
    modules: null,
    description: 'Vacances\r\n\r\n<br />\r\n\r\n44\r\n',
};

describe('sujetDuCours', () => {
    it('lit une extraction a une seule correspondance, qui rend la valeur et non une liste', () => {
        // Le piege du jalon : `$.modules[*]` rend `'Compilation'` pour un cours a un module, pas
        // `['Compilation']`. Un code qui ferait `.shift()` recupererait ici la lettre 'C'.
        expect(sujetDuCours('4TIN603U Compilation', 'Cours')).toBe('4TIN603U Compilation');
    });

    it('prend le premier element quand la source en sert plusieurs', () => {
        expect(sujetDuCours(['4TIN603U Compilation', 'Autre'], 'Cours')).toBe('4TIN603U Compilation');
    });

    it('retombe sur la categorie quand il n y a pas de module', () => {
        // `null` est ce que l'extraction rend pour un champ absent — le cas des vacances — et aussi
        // pour une liste vide, que rien ne distingue apres coup. Voir docs/features/planning.md.
        expect(sujetDuCours(null, 'Vacances')).toBe('Vacances');
        expect(sujetDuCours([], 'Reunion')).toBe('Reunion');
    });
});

describe('projeterCours', () => {
    it('nettoie la description et retire les lignes qui repetent la categorie ou le sujet', () => {
        const projete = projeterCours(COURS, 'INF601A', ';');

        expect(projete.subject).toBe('4TIN602U Techn algorithmiques et program');
        expect(projete.category).toBe('Cours');
        expect(projete.starttime).toBe('09:30');
        expect(projete.endtime).toBe('10:50');
        expect(projete.schedule).toBe('09:30-10:50 Cours');
        expect(projete.color).toBe('#00FFFF');
        // Les entites HTML sont decodees, la ligne de categorie et celle du sujet ont disparu.
        expect(projete.description).toContain('GAVOILLE Cyril');
        expect(projete.description).toContain('A22/Amphithéâtre Charles DARWIN');
        expect(projete.description).not.toContain('4TIN602U');
    });

    it('separe la description selon la vue, et la vue semaine n en garde rien', () => {
        const jour = projeterCours(COURS, 'INF601A', ';');
        const semaine = projeterCours(COURS, 'INF601A', '\n');

        // En vue jour, les quatre lignes utiles sont separees : groupes, enseignant, salle, semaines.
        expect(jour.description.split('\n')).toHaveLength(4);

        // En vue semaine, la description ressort **vide**, et ce n'est pas un defaut de ce jalon :
        // c'est le comportement d'origine, verrouille ici parce qu'il est contre-intuitif. Mesure du
        // 2026-08-09 : le serveur formate la description a l'identique dans les deux vues
        // (`\r\n\r\n<br />\r\n\r\n`), donc `formatDescription` la reduit a une seule ligne separee par
        // `;`. Couper sur `\n` ne rend alors qu'un champ, qui porte la categorie en tete et se fait
        // ecarter en entier. Corriger cela changerait l'affichage de la vue semaine : c'est une
        // decision produit, pas une correction de migration. Voir docs/features/planning.md.
        expect(semaine.description).toBe('');
    });

    it('deduit le sous-groupe a filtrer depuis la premiere ligne de description', () => {
        const brut: CoursExtrait = { ...COURS, description: 'Cours\r\n\r\n<br />\r\n\r\nINF601A - Grpe 2\r\n' };
        expect(projeterCours(brut, 'INF601A', ';').toFilter).toBe('Grpe 2');
    });

    it('traite une fin nulle comme une date invalide, pas comme maintenant', () => {
        // `moment(undefined)` vaut *maintenant* : un evenement de vacances se retrouverait a l'heure
        // courante. `moment(null)` est invalide, ce que le code d'origine produisait deja.
        const projete = projeterCours(VACANCES, 'INF601A', ';');

        expect(projete.endtime).toBe('Invalid date');
        expect(projete.date.end).toBeNull();
        expect(projete.date.start).not.toBeNull();
    });

    it('ne leve pas sur une reponse sans description', () => {
        // Le code d'origine appelait `.replace` sans verifier : une reponse amputee vidait la journee
        // entiere par le `catch` du service, en silence.
        expect(() => projeterCours({ ...COURS, description: null }, 'INF601A', ';')).not.toThrow();
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
});

describe('projeterJour', () => {
    it('ecarte les vacances et les debordements du serveur', () => {
        // Une journee demandee un dimanche rend les cours du lundi : le serveur deborde, mesure le
        // 2026-08-09. Le refiltrage sur la date exacte est ce qui rattrape ce comportement.
        const cours = projeterJour([COURS, VACANCES], 'INF601A', '2026-01-12');

        expect(cours).toHaveLength(1);
        expect(projeterJour([COURS], 'INF601A', '2026-01-11')).toHaveLength(0);
    });
});

describe('decouperSemaine', () => {
    it('rend six jours, du lundi au samedi, et y range les cours', () => {
        const semaine = decouperSemaine([COURS], 'INF601A', moment('2026-01-12'));

        expect(semaine).toHaveLength(6);
        expect(semaine.map((jour) => jour.dayNumber)).toEqual(['1', '2', '3', '4', '5', '6']);
        // Le 12 janvier 2026 est un lundi.
        expect(semaine[0].courses).toHaveLength(1);
        expect(semaine[0].courses[0].dayNumber).toBe('1');
        expect(semaine[1].courses).toHaveLength(0);
    });

    it('ecarte le dimanche, que l application n affiche pas', () => {
        const dimanche: CoursExtrait = { ...COURS, debut: '2026-01-18T09:30:00', fin: '2026-01-18T10:50:00' };
        const semaine = decouperSemaine([dimanche], 'INF601A', moment('2026-01-12'));

        expect(semaine.every((jour) => jour.courses.length === 0)).toBe(true);
    });
});

describe('projeterAnnee', () => {
    it('rend une liste a plat, vacances ecartees', () => {
        const evenements = projeterAnnee([COURS, VACANCES], 'INF601A');

        expect(evenements).toHaveLength(1);
        expect(evenements[0].dayNumber).toBe('1');
    });
});

describe('projeterGroupes', () => {
    it('ecarte les identifiants trop courts et trie le reste', () => {
        expect(projeterGroupes(['MI601A', 'AB', 'INF601A', null, 42])).toEqual(['INF601A', 'MI601A']);
    });
});
