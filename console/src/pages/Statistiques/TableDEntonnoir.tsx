/**
 * L'entonnoir en tableau : impressions, ouvertures et actions, et les deux taux. Les lignes arrivent
 * protegees contre leur total (`protegerLesLignes`) : une case cachee se lit « moins de 5 » ou
 * « masque », un taux qui la trahirait ne s'ecrit pas, et un taux sur moins de vingt au denominateur se
 * lit grise (7-G). Le classement des annonces, la comparaison par campus et le rapport partenaire le
 * partagent.
 */

import type { ReactNode } from 'react';

import { BoutonNu } from '../../composants/ui/BoutonNu';
import { SEUIL_DE_TAUX, tauxAffiche, type EntonnoirAffiche, type Taux } from '../../stats/annonces';
import { formaterCompte, formaterPart } from '../../stats/formats';

export interface LigneDEntonnoir {
    readonly cle: string;
    readonly libelle: ReactNode;
    readonly affiche: EntonnoirAffiche;
}

function CelluleDeTaux({ taux, denominateur }: { readonly taux: Taux; readonly denominateur: string }) {
    if (taux.valeur === null) return <td className="nombre secondaire">—</td>;
    if (!taux.fragile) return <td className="nombre">{formaterPart(taux.valeur)}</td>;
    return <td className="nombre taux-fragile" title={`Sur moins de ${SEUIL_DE_TAUX} ${denominateur} : trop peu pour se lire seul.`}>{formaterPart(taux.valeur)}</td>;
}

export function TableDEntonnoir({ premiereColonne, lignes, choisie = null, choisir, vide }: {
    readonly premiereColonne: string;
    readonly lignes: readonly LigneDEntonnoir[] | undefined;
    readonly choisie?: string | null;
    readonly choisir?: (cle: string) => void;
    readonly vide: string;
}) {
    return (
        <div className="defilable">
            <table className="tableau tableau-entonnoir">
                <thead>
                    <tr>
                        <th>{premiereColonne}</th>
                        <th className="nombre">Impressions</th><th className="nombre">Ouvertures</th><th className="nombre">Taux d’ouverture</th>
                        <th className="nombre">Actions</th><th className="nombre">Taux d’action</th>
                    </tr>
                </thead>
                <tbody>
                    {lignes === undefined ? Array.from({ length: 3 }, (_, i) => <tr key={i} aria-hidden="true"><td colSpan={6}><div className="squelette texte" /></td></tr>) : null}
                    {lignes !== undefined && lignes.length === 0 ? <tr><td colSpan={6} className="secondaire">{vide}</td></tr> : null}
                    {lignes?.map((l) => (
                        <tr key={l.cle} className={choisie === l.cle ? 'choisie' : undefined}>
                            <td>
                                {choisir === undefined ? l.libelle : <BoutonNu className="nom" aria-pressed={choisie === l.cle} onClick={() => choisir(l.cle)}>{l.libelle}</BoutonNu>}
                            </td>
                            <td className="nombre">{formaterCompte(l.affiche.impressions)}</td>
                            <td className="nombre">{formaterCompte(l.affiche.ouvertures)}</td>
                            <CelluleDeTaux taux={tauxAffiche(l.affiche.ouvertures, l.affiche.impressions)} denominateur="impressions" />
                            <td className="nombre">{formaterCompte(l.affiche.actions)}</td>
                            <CelluleDeTaux taux={tauxAffiche(l.affiche.actions, l.affiche.ouvertures)} denominateur="ouvertures" />
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
