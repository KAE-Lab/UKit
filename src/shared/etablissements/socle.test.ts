/**
 * Le socle embarque est une copie des lignes publiees, et rien d'autre.
 *
 * Le defaut que ce test ferme a ete vu le premier jour de la rentree 2026 : le socle ne portait que
 * le College ST, et une installation neuve n'a vu que lui a l'accueil — les deux autres
 * etablissements n'arrivaient que par le rafraichissement, apres le premier rendu. La regle de la
 * 6.1 est que le socle embarque **tout ce qui est publie a la date de la release** ; ce test empeche
 * les deux cotes de diverger en silence, dans un sens comme dans l'autre.
 *
 * La comparaison passe par `projeterEtablissement` : le socle doit etre exactement ce que
 * l'application ferait de la ligne publiee, pas une transcription a la main qui aurait sa propre
 * idee des valeurs par defaut.
 */

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import { BUNDLED, type BlueprintName } from '../../../blueprints';
import { lireInsertionsEtablissements } from '../../../tools/catalogue/etablissementsSql';
import type { EtablissementRow } from '../supabase/types';
import {
    ETABLISSEMENT_DEFAUT,
    appliquerCatalogue,
    getEtablissement,
    listeEtablissements,
    projeterEtablissement,
    setCodeEtablissementActif,
} from './catalogue';

// Relatif a la racine du depot, ou vitest est lance : la meme convention que delivery.test.ts.
const LIGNES = lireInsertionsEtablissements(readFileSync('supabase/etablissements.sql', 'utf8'))
    .map((ligne) => ligne as unknown as EtablissementRow);

afterEach(() => {
    appliquerCatalogue(null);
    setCodeEtablissementActif(ETABLISSEMENT_DEFAUT);
});

describe('le socle embarque', () => {
    it('porte exactement les lignes publiees, dans leur ordre', () => {
        appliquerCatalogue(null);
        const publies = [...LIGNES].sort((a, b) => a.ordre - b.ordre).map((ligne) => ligne.code);

        expect(publies.length).toBeGreaterThan(1);
        expect(listeEtablissements().map((e) => e.code)).toEqual(publies);
    });

    it.each(LIGNES.map((ligne) => [ligne.code, ligne] as const))(
        'est, pour %s, ce que la projection rend de la ligne publiee',
        (code, ligne) => {
            appliquerCatalogue(null);
            expect(getEtablissement(code)).toEqual(projeterEtablissement(ligne));
        },
    );

    it('n embarque que des lignes actives : une ligne retiree ne doit pas survivre dans un binaire', () => {
        for (const ligne of LIGNES) expect(ligne.actif).toBe(true);
    });
});

describe('les Blueprints que le socle nomme', () => {
    it('sont tous embarques : le binaire n embarque un etablissement que s il embarque de quoi le jouer', () => {
        // La regle du depot, rendue executable (6.1-A). Un socle qui nommerait un portail arrive par
        // manifeste ferait echouer le premier lancement hors ligne sur un nom inconnu du registre.
        appliquerCatalogue(null);
        const nommes = new Set<string>();
        for (const etablissement of listeEtablissements()) {
            for (const nom of [etablissement.portailDossier, etablissement.portailMessagerie, etablissement.portailDocuments]) {
                if (nom !== null) nommes.add(nom);
            }
            for (const widget of Object.values(etablissement.portailWidgets)) nommes.add(widget.blueprint);
            if (etablissement.edt !== null) {
                nommes.add(etablissement.edt.blueprint);
                nommes.add(etablissement.edt.blueprintAnnee);
            }
        }

        expect(nommes.size).toBeGreaterThan(0);
        for (const nom of nommes) {
            expect(BUNDLED[nom as BlueprintName], nom).toBeDefined();
        }
    });
});
