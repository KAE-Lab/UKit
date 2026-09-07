/**
 * La projection d'une reponse : la nature, le texte assemble, le masquage, et surtout la cle —
 * stable a travers une colonne ajoutee, une colonne deplacee et les deux ecritures de l'horodatage.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyserCsv, enregistrementsDe } from './csv.mjs';
import { ADRESSE_RETIREE } from './nettoyage.mjs';
import { identifiantDe, natureDe, projeter, QUESTIONS, texteDe } from './projection.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const FEUILLE = join(ICI, 'exports/feuille-2026-09-07.csv');

type Cle = keyof typeof QUESTIONS;

const ENTETES: readonly string[] = [
    QUESTIONS.horodatage, QUESTIONS.pourquoi, QUESTIONS.probleme, QUESTIONS.fonctionnalite, QUESTIONS.alternatives,
    QUESTIONS.contexte, QUESTIONS.section, QUESTIONS.bug, QUESTIONS.reproduire, QUESTIONS.attendu, QUESTIONS.appareil,
    QUESTIONS.systeme, QUESTIONS.versionApp, QUESTIONS.campus, QUESTIONS.connu, QUESTIONS.cursus, QUESTIONS.annee,
    QUESTIONS.autre,
];

function ligne(valeurs: Partial<Record<Cle, string>>, entetes: readonly string[] = ENTETES): string[] {
    const parLibelle = new Map<string, string>(Object.entries(QUESTIONS).map(([cle, libelle]) => [libelle, valeurs[cle as Cle] ?? '']));
    return entetes.map((entete) => parLibelle.get(entete) ?? '');
}

describe('natureDe', () => {
    it('lit la case cochee', () => {
        expect(natureDe('Signaler un bug')).toBe('bug');
        expect(natureDe('Suggérer une fonctionnalité')).toBe('fonctionnalite');
        expect(natureDe('Demander un campus')).toBe('campus');
        expect(natureDe('Rien')).toBe('autre');
        expect(natureDe('')).toBe('autre');
    });
});

describe('projeter', () => {
    it('assemble un bug', () => {
        const retour = projeter(ENTETES, ligne({
            horodatage: '9/3/2026 9:16:16', pourquoi: 'Signaler un bug', section: 'Planning', bug: 'La synchro ne part pas. ',
            reproduire: '1. Activer\n2. Attendre', attendu: 'Une synchro', appareil: 'Google Pixel 3', systeme: '17',
            versionApp: 'The very new version ', cursus: 'Master', annee: 'M2',
        }), 10);
        expect(retour.nature).toBe('bug');
        expect(retour.recu_le).toBe('2026-09-03T07:16:16.000Z');
        expect(retour.section).toBe('Planning');
        expect(retour.appareil).toBe('Google Pixel 3');
        expect(retour.systeme).toBe('17');
        expect(retour.version_app).toBe('The very new version');
        expect(retour.campus).toBeNull();
        expect(retour.texte).toBe('Description : La synchro ne part pas.\n\nReproduire : 1. Activer\n2. Attendre\n\nAttendu : Une synchro');
        expect(retour.contact).toBeNull();
        expect(retour.volontaire).toBe(false);
        expect(retour.reponses[QUESTIONS.cursus]).toBe('Master');
        expect(retour.id).toMatch(/^[0-9a-f]{64}$/);
    });

    it('assemble une demande de campus, et une reponse vide', () => {
        const campus = projeter(ENTETES, ligne({ horodatage: '9/1/2026 8:13:22', pourquoi: 'Demander un campus', campus: 'Inspe' }), 3);
        expect(campus.nature).toBe('campus');
        expect(campus.campus).toBe('Inspe');
        expect(campus.texte).toBe('Campus demandé : Inspe');

        const rien = projeter(ENTETES, ligne({ horodatage: '9/1/2026 13:27:51', pourquoi: 'Rien', cursus: 'Droit' }), 4);
        expect(rien.nature).toBe('autre');
        expect(rien.texte).toBe('');
    });

    it('lit le contact et le volontariat quand les colonnes existent', () => {
        const entetes = [...ENTETES, QUESTIONS.contact, QUESTIONS.volontaire];
        const oui = projeter(entetes, ligne({
            horodatage: '9/8/2026 10:00:00', pourquoi: 'Demander un campus', campus: 'Carreire',
            contact: ' quelqu.un@u-bordeaux.fr ', volontaire: "Oui, j'ai lu la page d'engagement et on peut me contacter",
        }, entetes), 2);
        expect(oui.contact).toBe('quelqu.un@u-bordeaux.fr');
        expect(oui.volontaire).toBe(true);
        expect(oui.reponses[QUESTIONS.contact]).toBe('quelqu.un@u-bordeaux.fr');

        const non = projeter(entetes, ligne({ horodatage: '9/8/2026 10:00:00', pourquoi: 'Demander un campus', volontaire: 'Non merci' }, entetes), 2);
        expect(non.volontaire).toBe(false);
    });

    it('masque une adresse dans les textes libres, jamais dans le contact', () => {
        const entetes = [...ENTETES, QUESTIONS.contact];
        const retour = projeter(entetes, ligne({
            horodatage: '9/8/2026 10:00:00', pourquoi: 'Signaler un bug', bug: 'ecris-moi a moi@exemple.fr', contact: 'moi@exemple.fr',
        }, entetes), 2);
        expect(retour.texte).toBe(`Description : ecris-moi a ${ADRESSE_RETIREE}`);
        expect(retour.reponses[QUESTIONS.bug]).toBe(`ecris-moi a ${ADRESSE_RETIREE}`);
        expect(retour.contact).toBe('moi@exemple.fr');
    });

    it('garde une question inconnue dans la reponse entiere', () => {
        const entetes = [...ENTETES, 'Une question nouvelle ?'];
        const retour = projeter(entetes, [...ligne({ horodatage: '9/8/2026 10:00:00', pourquoi: 'Rien' }), 'oui'], 2);
        expect(retour.reponses['Une question nouvelle ?']).toBe('oui');
    });

    it('ignore une colonne sans en-tete quand elle est vide, la garde si elle porte quelque chose', () => {
        const entetes = [...ENTETES, 'Column 18'];
        const vide = projeter(entetes, [...ligne({ horodatage: '9/8/2026 10:00:00', pourquoi: 'Rien' }), ''], 2);
        expect('Column 18' in vide.reponses).toBe(false);
        const pleine = projeter(entetes, [...ligne({ horodatage: '9/8/2026 10:00:00', pourquoi: 'Rien' }), 'x'], 2);
        expect(pleine.reponses['Column 18']).toBe('x');
    });

    it('refuse un horodatage illisible, avec le numero de ligne', () => {
        expect(() => projeter(ENTETES, ligne({ horodatage: 'hier', pourquoi: 'Rien' }), 7)).toThrow(/ligne 7 : horodatage illisible « hier »/);
    });
});

describe('identifiantDe', () => {
    const recuLe = '2026-09-01T05:46:43.000Z';
    const base = ligne({ horodatage: '9/1/2026 7:46:43', pourquoi: 'Rien', cursus: 'Droit' });

    it('ne change pas quand une colonne vide est ajoutee ou que les colonnes bougent', () => {
        const reference = identifiantDe(recuLe, ENTETES, base);
        expect(identifiantDe(recuLe, [...ENTETES, QUESTIONS.contact], [...base, ''])).toBe(reference);
        const permutees = [...ENTETES].reverse();
        expect(identifiantDe(recuLe, permutees, ligne({ horodatage: '9/1/2026 7:46:43', pourquoi: 'Rien', cursus: 'Droit' }, permutees))).toBe(reference);
    });

    it('ne depend ni de l ecriture de l horodatage ni des espaces autour d une cellule', () => {
        const reference = identifiantDe(recuLe, ENTETES, base);
        expect(identifiantDe(recuLe, ENTETES, ligne({ horodatage: '2026/09/01 8:46:43 AM GMT+3', pourquoi: 'Rien', cursus: ' Droit ' }))).toBe(reference);
    });

    it('change des qu une cellule change', () => {
        expect(identifiantDe(recuLe, ENTETES, ligne({ horodatage: '9/1/2026 7:46:43', pourquoi: 'Rien', cursus: 'Droit' })))
            .not.toBe(identifiantDe(recuLe, ENTETES, ligne({ horodatage: '9/1/2026 7:46:43', pourquoi: 'Rien', cursus: 'Droits' })));
    });
});

describe('texteDe', () => {
    it('ne garde que les blocs remplis', () => {
        const reponses: Record<string, string> = { fonctionnalite: 'Un calendrier externe', contexte: 'Tout au meme endroit' };
        expect(texteDe('fonctionnalite', (cle: string) => reponses[cle] ?? '')).toBe('Description : Un calendrier externe\n\nContexte : Tout au meme endroit');
    });
});

describe('l export reel de la feuille', () => {
    it.skipIf(!existsSync(FEUILLE))('projette 22 reponses aux cles distinctes', () => {
        const { entetes, enregistrements } = enregistrementsDe(analyserCsv(readFileSync(FEUILLE, 'utf8')));
        const retours = enregistrements.map((enregistrement, index) => projeter(entetes, enregistrement, index + 2));
        expect(new Set(retours.map((retour) => retour.id)).size).toBe(22);
        const natures = retours.reduce<Record<string, number>>((compte, retour) => ({ ...compte, [retour.nature]: (compte[retour.nature] ?? 0) + 1 }), {});
        expect(natures).toEqual({ bug: 2, fonctionnalite: 3, campus: 14, autre: 3 });
        expect(retours.every((retour) => retour.contact === null && retour.volontaire === false)).toBe(true);
        expect(retours[0]?.recu_le).toBe('2026-09-01T05:46:43.000Z');
    });
});
