/**
 * Un sprite du jeu Encre, en SVG : un chemin par symbole, les pixels fusionnes ligne par ligne
 * (`traceDuSymbole`). Les traces se calculent une fois par grille et par symbole.
 */

import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

import { PIXEL, SYMBOLES, tailleDe, traceDuSymbole, type Grille, type Symbole } from './encre';

export type Encres = Readonly<Record<Symbole, string>>;

const TRACES = new WeakMap<Grille, Readonly<Record<Symbole, string>>>();

function tracesDe(grille: Grille): Readonly<Record<Symbole, string>> {
    const connues = TRACES.get(grille);
    if (connues !== undefined) return connues;
    const traces = Object.fromEntries(SYMBOLES.map((symbole) => [symbole, traceDuSymbole(grille, symbole)])) as Record<Symbole, string>;
    TRACES.set(grille, traces);
    return traces;
}

export const SpritePixel = memo(function SpritePixel({ grille, encres }: { grille: Grille; encres: Encres }) {
    const { largeur, hauteur } = tailleDe(grille);
    const traces = tracesDe(grille);
    return (
        <Svg width={largeur * PIXEL} height={hauteur * PIXEL} viewBox={`0 0 ${largeur} ${hauteur}`}>
            {SYMBOLES.map((symbole) => (traces[symbole] === '' ? null : <Path key={symbole} d={traces[symbole]} fill={encres[symbole]} />))}
        </Svg>
    );
});
