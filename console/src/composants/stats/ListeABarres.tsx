/**
 * Une liste a barres de fond, sur le modele de Plausible : le nom sur une barre qui dit sa part, le
 * compte et la part a droite, en chiffres alignes. Une seule teinte, celle de l'accent : la longueur
 * porte la quantite, la couleur ne la redit pas. Une petite case se lit « moins de 5 », sans barre ni
 * part. Une ligne peut se choisir (un hote, une annonce) : le choix va dans l'adresse.
 */

import type { CSSProperties, ReactNode } from 'react';

import type { Case } from '../../stats/cases';
import { formaterCompte, formaterPart } from '../../stats/formats';
import { BoutonNu } from '../ui/BoutonNu';

export interface ListeABarresProps {
    readonly cases: readonly Case[] | undefined;
    /** L'en-tete de la colonne des noms, et celui des comptes. */
    readonly colonnes: readonly [string, string];
    readonly libelleDe?: (cle: string) => ReactNode;
    readonly choisie?: string | null;
    readonly choisir?: (cle: string) => void;
    readonly vide?: string;
    /** Le titre de la carte, ou le controle segmente, nomme deja la colonne : son en-tete ne reste que pour un lecteur d'ecran. */
    readonly nomCache?: boolean;
}

function Nom({ cle, libelle, choisie, choisir }: { readonly cle: string; readonly libelle: ReactNode; readonly choisie: boolean; readonly choisir?: (cle: string) => void }) {
    if (choisir === undefined) return <span className="nom">{libelle}</span>;
    return <BoutonNu className="nom" aria-pressed={choisie} onClick={() => choisir(cle)}>{libelle}</BoutonNu>;
}

export function ListeABarres({ cases, colonnes, libelleDe = (cle) => cle, choisie = null, choisir, vide = 'Rien sur la période.', nomCache = false }: ListeABarresProps) {
    return (
        <table className="liste-a-barres">
            <thead><tr><th>{nomCache ? <span className="visuellement-cache">{colonnes[0]}</span> : colonnes[0]}</th><th className="nombre">{colonnes[1]}</th><th className="nombre">Part</th></tr></thead>
            <tbody>
                {cases === undefined ? Array.from({ length: 4 }, (_, i) => <tr key={i} aria-hidden="true"><td colSpan={3}><div className="squelette texte" /></td></tr>) : null}
                {cases !== undefined && cases.length === 0 ? <tr><td colSpan={3} className="secondaire">{vide}</td></tr> : null}
                {cases?.map((c) => {
                    // La part, calculee, est la seule valeur de style posee ici : la longueur de la barre.
                    const barre = c.part === null ? null : <span className="barre-de-fond" style={{ '--part': c.part } as CSSProperties} aria-hidden="true" />;
                    return (
                        <tr key={c.cle} className={choisie === c.cle ? 'choisie' : undefined}>
                            <td>{barre}<Nom cle={c.cle} libelle={libelleDe(c.cle)} choisie={choisie === c.cle} choisir={choisir} /></td>
                            <td className="nombre">{formaterCompte(c.n)}</td>
                            <td className="nombre secondaire">{formaterPart(c.part)}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
