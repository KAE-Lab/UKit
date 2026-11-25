import { describe, expect, test } from 'vitest';

import { blocsDuContexte, contexteAEnvoyer, type SourcesDuContexte } from './contexte';

const SOURCES: SourcesDuContexte = {
    version: '7.0.0', appareil: 'Pixel 7', systeme: 'Android 15', etablissement: 'Université de Bordeaux',
    langue: 'fr', theme: 'dark', onglet: 'Campus', reseau: 'wifi',
    echecs: [{ hote: 'api.croustillant.menu', famille: 'unavailable', minutes: 3 }],
    parcours: ['CampusTab', 'CrousMenu'],
    erreur: { hote: 'api.croustillant.menu', famille: 'unavailable' },
};

describe('les blocs du contexte', () => {
    test('chaque source qui a quelque chose a dire fait un bloc, dans l\'ordre de l\'ecran', () => {
        expect(blocsDuContexte(SOURCES).map((b) => b.cle)).toEqual(['version', 'appareil', 'etablissement', 'langueTheme', 'onglet', 'reseau', 'erreur', 'echecs', 'parcours']);
    });

    test('un bloc vide n\'est pas propose, et une valeur hors forme ne part pas', () => {
        const blocs = blocsDuContexte({
            ...SOURCES, version: null, appareil: null, systeme: '  ', onglet: null, reseau: null,
            echecs: [{ hote: 'https://edt.fr/ical?cle=secret', famille: 'unavailable' }],
            parcours: ['Group?name=TD1'], erreur: { hote: 'edt.fr', famille: 'Network Error' },
        });
        expect(blocs.map((b) => b.cle)).toEqual(['etablissement', 'langueTheme']);
    });

    test('retirer un bloc retire ses champs ; tout retirer ne joint rien', () => {
        const blocs = blocsDuContexte(SOURCES);
        const contexte = contexteAEnvoyer(blocs, new Set(['parcours', 'appareil']));
        expect(contexte).toMatchObject({ version: '7.0.0', onglet: 'Campus', reseau: 'wifi' });
        expect(contexte).not.toHaveProperty('parcours');
        expect(contexte).not.toHaveProperty('appareil');
        expect(contexte).not.toHaveProperty('systeme');
        expect(contexteAEnvoyer(blocs, new Set(blocs.map((b) => b.cle)))).toBeNull();
    });
});
