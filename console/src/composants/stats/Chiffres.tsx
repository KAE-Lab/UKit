/**
 * La rangee de chiffres cles, sur le modele de Plausible : un libelle, le chiffre en grand, sa
 * variation, et au besoin une ligne de contexte. Un chiffre qui mene a sa page est un lien. Le chiffre
 * garde sa place pendant la lecture : un squelette a sa hauteur, rien ne saute ; une lecture en echec
 * laisse un tiret, l'erreur et « Reessayer » se disent dans la carte du graphique.
 */

import type { ReactNode } from 'react';

import { SEUIL_DE_TAUX, type Taux } from '../../stats/annonces';
import { masquer } from '../../stats/cases';
import { formaterCompte, formaterPart } from '../../stats/formats';
import { SqueletteTexte } from '../ui/Squelette';
import { Variation, type Sens } from './Variation';

export function RangeeDeChiffres({ children, etiquette }: { readonly children: ReactNode; readonly etiquette: string }) {
    return <section className="chiffres" aria-label={etiquette}>{children}</section>;
}

export function Chiffre({ libelle, valeur, variation, detail, vers }: {
    readonly libelle: string;
    /** `undefined` pendant la lecture. */
    readonly valeur: string | undefined;
    readonly variation?: ReactNode;
    readonly detail?: ReactNode;
    readonly vers?: string;
}) {
    const corps = (
        <>
            <div className="libelle">{libelle}</div>
            <div className="valeur">{valeur ?? <SqueletteTexte largeur="60%" />}</div>
            <div className="pied">
                {valeur === undefined ? null : variation}
                {valeur === undefined || detail === undefined ? null : <span className="detail">{detail}</span>}
            </div>
        </>
    );
    if (vers === undefined) return <div className="chiffre">{corps}</div>;
    return <a className="chiffre" href={vers}>{corps}</a>;
}

/**
 * Un chiffre qui est un compte : « moins de 5 » sous le seuil, et sa variation quand une base de
 * comparaison est donnee. `n` vaut `undefined` pendant la lecture, `null` quand elle a echoue.
 */
export function ChiffreDeCompte({ n, variation, sens, base, ...reste }: {
    readonly libelle: string;
    readonly n: number | null | undefined;
    readonly variation?: number | null;
    readonly sens?: Sens;
    /** La periode comparee, en clair ; sans elle, pas de variation. */
    readonly base?: string;
    readonly detail?: ReactNode;
    readonly vers?: string;
}) {
    const valeur = n === undefined ? undefined : n === null ? '—' : formaterCompte(masquer(n));
    const ecart = base === undefined || n === null ? undefined : <Variation valeur={variation ?? null} sens={sens} base={base} />;
    return <Chiffre {...reste} valeur={valeur} variation={ecart} />;
}

/**
 * Un taux en ligne de contexte : « 3,7 % des impressions ». Sous vingt au denominateur il se lit en
 * retrait, et le dit au survol (7-G) ; quand il trahirait une case cachee, il ne s'ecrit pas.
 */
export function DetailDeTaux({ taux, de, denominateur }: { readonly taux: Taux | undefined; readonly de: string; readonly denominateur: string }) {
    if (taux === undefined || taux.valeur === null) return null;
    const texte = `${formaterPart(taux.valeur)} ${de}`;
    if (!taux.fragile) return <>{texte}</>;
    return <span className="taux-fragile" title={`Sur moins de ${SEUIL_DE_TAUX} ${denominateur} : trop peu pour se lire seul.`}>{texte}</span>;
}
