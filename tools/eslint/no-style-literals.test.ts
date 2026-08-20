/**
 * La regle ESLint porte une **copie** des echelles de tokens : elle est chargee par ESLint, qui ne
 * sait pas lire du TypeScript applicatif, et importer `src/shared/theme/tokens.ts` depuis un
 * `.mjs` de configuration reviendrait a exiger un transpileur au demarrage du linter.
 *
 * Une copie derive. Celle-ci ne le peut pas : ce test lit les deux et echoue des qu'elles different.
 * Sans lui, ajouter un token laisserait la regle conseiller un remplacement qui n'existe pas, ou
 * pire, signaler une valeur qui est desormais legitime — et personne ne s'en apercevrait avant
 * d'avoir desactive la regle par lassitude.
 *
 * C'est le meme reflexe que le fuseau fige de `vitest.config.ts` : verrouiller ce qui casserait sans
 * bruit.
 */

import { describe, expect, it } from 'vitest';

import { ECHELLES } from './no-style-literals.mjs';
import { tokens } from '../../src/shared/theme/tokens';

describe('la table de la regle no-style-literals', () => {
    it('couvre exactement les echelles numeriques des tokens', () => {
        // `fontWeight` et `shadow` ne sont pas des echelles numeriques d'espacement : la regle ne les
        // gouverne pas, et les attendre ici serait une fausse exigence.
        expect(Object.keys(ECHELLES).sort()).toEqual(['fontSize', 'radius', 'space']);
    });

    it.each(['space', 'radius', 'fontSize'] as const)('reproduit %s a l identique', (echelle) => {
        expect(ECHELLES[echelle]).toEqual(tokens[echelle]);
    });

    it('ne conseille que des valeurs reellement disponibles', () => {
        for (const echelle of ['space', 'radius', 'fontSize'] as const) {
            for (const [nom, valeur] of Object.entries(ECHELLES[echelle])) {
                const disponibles: Record<string, number> = tokens[echelle];
                expect(
                    disponibles[nom],
                    `tokens.${echelle}.${nom} a disparu ou change de valeur`,
                ).toBe(valeur);
            }
        }
    });
});
