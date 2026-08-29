/**
 * La lecture defensive du cache des widgets.
 *
 * A part du hook parce que c'est une **validation de forme**, et que le depot les garde pures : le
 * trousseau rend `unknown`, et ce qui en sort a ete ecrit par une version anterieure de
 * l'application — ou pas ecrit du tout.
 *
 * Une entree qui ne tient pas la forme est **ecartee**, pas reparee. Une valeur a demi lue afficherait
 * un compteur invente ; l'ecarter fait simplement relire la source.
 */

import SecureStoreService from '../../../shared/services/SecureStoreService';
import { WIDGETS, type PointWidget } from './definitions';
import type { ValeurWidget } from './projection';
import type { ValeursWidgets } from './runner';

const POINTS: readonly string[] = WIDGETS.map((widget) => widget.point);

function estValeur(brut: unknown): brut is ValeurWidget {
    if (brut === null || typeof brut !== 'object') return false;

    const candidat = brut as Record<string, unknown>;
    const nombre = candidat.nombre;
    const detail = candidat.detail;
    return (
        (nombre === null || (typeof nombre === 'number' && Number.isFinite(nombre)))
        && (detail === null || typeof detail === 'string')
        && typeof candidat.luLe === 'string'
    );
}

/** Les valeurs de widgets du trousseau, reduites a ce qui est exploitable. */
export async function lireValeursPersistees(): Promise<ValeursWidgets> {
    const brut = await SecureStoreService.getWidgets();
    if (brut === null || typeof brut !== 'object') return {};

    const valeurs: Partial<Record<PointWidget, ValeurWidget>> = {};
    for (const [point, valeur] of Object.entries(brut as Record<string, unknown>)) {
        // Un point inconnu est ignore : il vient d'une version qui nommait ses widgets autrement, ou
        // d'un widget retire. Le garder ferait grossir le cache sans que rien ne le lise jamais.
        if (POINTS.includes(point) && estValeur(valeur)) {
            valeurs[point as PointWidget] = { nombre: valeur.nombre, detail: valeur.detail, luLe: valeur.luLe };
        }
    }
    return valeurs;
}
