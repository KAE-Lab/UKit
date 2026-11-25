/**
 * La variation d'un chiffre sur la periode precedente : le signe, la fleche, et la couleur selon que
 * la hausse est bonne ou mauvaise — une session de plus est une bonne nouvelle, un echec de source de
 * plus, non. Le signe et la fleche disent le sens sans la couleur.
 */

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { formaterVariation } from '../../stats/formats';

export type Sens = 'hausse-bonne' | 'hausse-mauvaise';

export function Variation({ valeur, sens = 'hausse-bonne', base }: {
    readonly valeur: number | null;
    readonly sens?: Sens;
    /** La periode comparee, en clair : « sur les 7 jours d'avant ». */
    readonly base: string;
}) {
    if (valeur === null) return <span className="variation" title={`Pas de comparaison ${base}`}>—</span>;
    const texte = formaterVariation(valeur);
    const arrondie = Math.round(valeur * 100);
    if (arrondie === 0) return <span className="variation" title={base}>{texte}</span>;
    const bonne = (arrondie > 0) === (sens === 'hausse-bonne');
    const Fleche = arrondie > 0 ? ArrowUpRight : ArrowDownRight;
    return (
        <span className={`variation ${bonne ? 'bonne' : 'mauvaise'}`} title={`${texte} ${base}`}>
            <Fleche className="icone" aria-hidden="true" />
            {texte}
            <span className="visuellement-cache"> {base}</span>
        </span>
    );
}
