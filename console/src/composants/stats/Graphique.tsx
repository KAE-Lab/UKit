/**
 * Le graphique des statistiques, en Recharts : une courbe pour ce qui suit un rythme (les sessions),
 * des colonnes pour ce qui se compte par jour (les echecs, les impressions). Une seule serie, une seule
 * teinte — l'accent —, un trait de 2 px, un lavis a 10 %, une grille en filets, aucune animation
 * d'entree. Les couleurs viennent du theme par la feuille de style (`styles/statistiques.css`) : elles
 * suivent la bascule sans nouveau rendu.
 *
 * Charge a part (import paresseux) : Recharts ne pese que sur les pages qui dessinent.
 *
 * Une case cachee (stats/cases.ts) ne se dessine pas : la courbe s'interrompt, la colonne manque, et la
 * bulle dit « moins de 5 » ou « masque ».
 */

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';

import type { PointAffiche } from '../../stats/agregats';
import { formaterAxe, formaterCompte } from '../../stats/formats';
import { graduations } from '../../stats/graduations';
import { libelleCourt, libelleDuJour } from '../../stats/periode';

export interface GraphiqueProps {
    readonly points: readonly PointAffiche[];
    readonly forme: 'courbe' | 'colonnes';
    /** Ce que compte la serie, au pluriel : « sessions ». */
    readonly serie: string;
}

function Bulle({ active, payload, serie }: TooltipContentProps & { readonly serie: string }) {
    const point = payload[0]?.payload as PointTrace | undefined;
    if (!active || point === undefined) return null;
    return (
        <div className="bulle-graphique">
            <span className="valeur"><span className="cle-de-serie" aria-hidden="true" /><strong>{formaterCompte(point.affiche)}</strong> {serie}</span>
            <span className="quand">{libelleDuJour(point.jour)}</span>
        </div>
    );
}

/** Ce que Recharts trace : le nombre, ou rien pour une case cachee ; ce que la bulle dit. */
interface PointTrace {
    readonly jour: string;
    readonly valeur: number | null;
    readonly affiche: PointAffiche['valeur'];
}

const MARGES = { top: 8, right: 8, bottom: 0, left: 0 };
/** Le bout arrondi d'une colonne, carre a la base (skill dataviz) : plus fin que le plus petit rayon du theme. */
const BOUT_DE_COLONNE: [number, number, number, number] = [4, 4, 0, 0];

export default function Graphique({ points, forme, serie }: GraphiqueProps) {
    const donnees: PointTrace[] = points.map((p) => ({ jour: p.jour, valeur: typeof p.valeur === 'number' ? p.valeur : null, affiche: p.valeur }));
    const ticks = graduations(Math.max(0, ...donnees.map((p) => p.valeur ?? 0)));
    const haut = ticks[ticks.length - 1] ?? 1;
    const axes = (
        <>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="jour" tickFormatter={libelleCourt} tickLine={false} minTickGap={24} tickMargin={8} />
            <YAxis domain={[0, haut]} ticks={ticks} tickFormatter={(n: number) => formaterAxe(n, haut)} axisLine={false} tickLine={false} allowDecimals={false} width="auto" />
            <Tooltip content={(props) => <Bulle {...props} serie={serie} />} isAnimationActive={false} cursor={forme === 'courbe' ? { strokeWidth: 1 } : true} />
        </>
    );
    if (forme === 'colonnes') {
        return (
            <BarChart responsive className="graphique" data={donnees} margin={MARGES} barCategoryGap="20%">
                {axes}
                <Bar dataKey="valeur" maxBarSize={24} radius={BOUT_DE_COLONNE} isAnimationActive={false} />
            </BarChart>
        );
    }
    return (
        <AreaChart responsive className="graphique" data={donnees} margin={MARGES}>
            {axes}
            <Area dataKey="valeur" type="linear" strokeWidth={2} fillOpacity={0.1} activeDot={{ r: 4, strokeWidth: 2 }} dot={false} isAnimationActive={false} />
        </AreaChart>
    );
}
