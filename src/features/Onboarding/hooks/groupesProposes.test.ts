/**
 * Les groupes proposes a l'accueil, sur des noms reels de la liste publique de Celcat Bordeaux.
 */

import { describe, expect, it } from 'vitest';

import { groupesProposes } from './groupesProposes';
import type { OptionListee } from './useWelcomeState';

const annee = (id: string): OptionListee => ({ id, title: 'YOUR_YEAR' });
const AUTOMNE: OptionListee = { id: 'autumn', title: 'AUTUMN' };
const PRINTEMPS: OptionListee = { id: 'spring', title: 'SPRING' };

const LISTE = [
    'INF501A1',
    'INF601A1',
    '31ST750U M1 Professionnalisation',
    '4TAL001S M2  Algorithmes et Modèles  S10',
    '4TBA802S M1 BBA-S8-SAP- UE NGS',
    'L3 IMSAT S5 - GR1',
    'L3 IMSAT S6 - GR1',
    'L3 IMSAT - IMA601S',
    'MI101A1',
    'ENSC 2A GR1',
];

const proposes = (an: string, saison: OptionListee, texte = '') => groupesProposes(LISTE, annee(an), saison, texte, true);

describe('groupesProposes, tri par annee', () => {
    it('garde les fragments pour un nom qui ne dit pas son niveau', () => {
        expect(proposes('L3', AUTOMNE)).toContain('INF501A1');
        expect(proposes('L3', PRINTEMPS)).toContain('INF601A1');
        expect(proposes('L1', AUTOMNE)).toContain('MI101A1');
    });

    it('ne montre pas un groupe de master en licence parce qu un fragment y tombe', () => {
        // `50` dans `750`, `10` dans `S10` : la sous-chaine les faisait passer en licence.
        expect(proposes('L3', AUTOMNE)).not.toContain('31ST750U M1 Professionnalisation');
        expect(proposes('L1', AUTOMNE)).not.toContain('4TAL001S M2  Algorithmes et Modèles  S10');
        expect(proposes('M1', AUTOMNE)).toContain('31ST750U M1 Professionnalisation');
    });

    it('range un groupe au niveau ecrit selon la parite de son semestre ecrit', () => {
        expect(proposes('L3', AUTOMNE)).toContain('L3 IMSAT S5 - GR1');
        expect(proposes('L3', AUTOMNE)).not.toContain('L3 IMSAT S6 - GR1');
        expect(proposes('L3', PRINTEMPS)).toContain('L3 IMSAT S6 - GR1');
        // S8 est un semestre de printemps, meme si `M1` est aussi un fragment d'automne.
        expect(proposes('M1', AUTOMNE)).not.toContain('4TBA802S M1 BBA-S8-SAP- UE NGS');
        expect(proposes('M1', PRINTEMPS)).toContain('4TBA802S M1 BBA-S8-SAP- UE NGS');
        expect(proposes('M2', AUTOMNE)).not.toContain('4TAL001S M2  Algorithmes et Modèles  S10');
    });

    it('sans semestre ecrit, un groupe au niveau ecrit parait aux deux semestres', () => {
        expect(proposes('L3', AUTOMNE)).toContain('L3 IMSAT - IMA601S');
        expect(proposes('L3', PRINTEMPS)).toContain('L3 IMSAT - IMA601S');
        expect(proposes('M1', PRINTEMPS)).toContain('31ST750U M1 Professionnalisation');
    });

    it('« Autre » montre tout, reduit par le texte', () => {
        expect(proposes('AUTRE', AUTOMNE)).toHaveLength(LISTE.length);
        expect(proposes('AUTRE', AUTOMNE, 'imsat')).toHaveLength(3);
    });

    it('sans annee, rien a montrer, sauf une recherche qui porte alors sur toute la liste', () => {
        // Le defaut du banc : le nom exact tape, « Aucun groupe ne correspond a cette recherche ».
        expect(groupesProposes(LISTE, null, AUTOMNE, '', true)).toEqual([]);
        expect(groupesProposes(LISTE, null, AUTOMNE, 'inf501a1', true)).toEqual(['INF501A1']);
        expect(groupesProposes(LISTE, null, null, ' INF6 ', true)).toEqual(['INF601A1']);
    });
});

describe('groupesProposes, sans tri par annee', () => {
    it('montre la liste entiere, reduite par le texte', () => {
        expect(groupesProposes(LISTE, null, null, '', false)).toHaveLength(LISTE.length);
        expect(groupesProposes(LISTE, null, null, 'ensc', false)).toEqual(['ENSC 2A GR1']);
    });
});
