/**
 * La liste d'une ressource : une table, une ligne par enregistrement, le toucher ouvre le
 * formulaire. Les colonnes viennent du descripteur ; chaque type sait s'afficher en une cellule.
 */

import type { JSX } from 'react';

import type { Ligne } from '../supabase';
import { formaterDate } from '../lib/dates';
import { champDe, cleDeLigne, type Champ, type Descripteur } from '../schema/descripteurs';
import { EtatVide } from './EtatVide';

function estVide(valeur: unknown): boolean {
    return valeur === null || valeur === undefined || valeur === '';
}

const Tiret = () => <span className="secondaire">—</span>;

function celluleBooleen(valeur: unknown) {
    return <span className={`pastille ${valeur === true ? 'ok' : ''}`}>{valeur === true ? 'oui' : 'non'}</span>;
}

function celluleImage(valeur: unknown) {
    if (typeof valeur === 'string' && valeur !== '') return <img className="vignette" src={valeur} alt="" loading="lazy" />;
    return <span className="secondaire">{valeur === '' ? 'aucune' : '—'}</span>;
}

function celluleJson(valeur: unknown) {
    return estVide(valeur) ? <Tiret /> : <code className="secondaire">{JSON.stringify(valeur).slice(0, 60)}</code>;
}

function celluleEtablissements(valeur: unknown) {
    return Array.isArray(valeur) && valeur.length > 0 ? <>{valeur.join(', ')}</> : <span className="secondaire">tous</span>;
}

function celluleChoix(champ: Champ, valeur: unknown) {
    const options = champ.type.type === 'choix' ? champ.type.options : [];
    const option = options.find((candidat) => candidat.valeur === String(valeur ?? ''));
    if (option !== undefined) return <>{option.libelle}</>;
    return estVide(valeur) ? <Tiret /> : <>{String(valeur)}</>;
}

/** Une cellule par type ; le texte est le repli. */
const CELLULES: Record<string, (champ: Champ, valeur: unknown) => JSX.Element> = {
    booleen: (_champ, valeur) => celluleBooleen(valeur),
    date: (_champ, valeur) => <>{formaterDate(valeur)}</>,
    image: (_champ, valeur) => celluleImage(valeur),
    json: (_champ, valeur) => celluleJson(valeur),
    etablissements: (_champ, valeur) => celluleEtablissements(valeur),
    choix: celluleChoix,
};

function Cellule({ champ, valeur }: { readonly champ: Champ | undefined; readonly valeur: unknown }) {
    const rendu = champ === undefined ? undefined : CELLULES[champ.type.type];
    if (champ !== undefined && rendu !== undefined) return rendu(champ, valeur);
    return estVide(valeur) ? <Tiret /> : <>{String(valeur)}</>;
}

export interface ListeProps {
    readonly descripteur: Descripteur;
    readonly lignes: readonly Ligne[];
    readonly onChoisir: (ligne: Ligne) => void;
}

export function Liste({ descripteur, lignes, onChoisir }: ListeProps) {
    if (lignes.length === 0) return <EtatVide>Aucune ligne. La première se crée avec le bouton en haut.</EtatVide>;
    return (
        <div className="defilable">
            <table className="tableau">
                <thead>
                    <tr>{descripteur.liste.map((nom) => <th key={nom}>{champDe(descripteur, nom)?.libelle ?? nom}</th>)}</tr>
                </thead>
                <tbody>
                    {lignes.map((ligne) => (
                        <tr key={cleDeLigne(descripteur, ligne)} className="cliquable" onClick={() => onChoisir(ligne)}>
                            {descripteur.liste.map((nom) => (
                                <td key={nom} className={nom === 'titre' || nom === 'nom' ? 'tronque' : undefined}>
                                    <Cellule champ={champDe(descripteur, nom)} valeur={ligne[nom]} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
