/**
 * Une cellule par type de champ ; le texte est le repli. Une valeur que la console ne connait pas
 * — un `tv` dans les plateformes, un code hors catalogue — se montre telle quelle, marquee.
 */

import type { JSX } from 'react';
import { ImageOff } from 'lucide-react';

import { formaterDate } from '../../lib/dates';
import type { Champ } from '../../schema/descripteurs';
import { resumeStructure } from '../../schema/resumes';
import { valeursInconnues } from '../../schema/schemas';
import { Pastille, ValeurInconnue } from '../ui/Pastille';

export function estVide(valeur: unknown): boolean {
    return valeur === null || valeur === undefined || valeur === '';
}

const Tiret = () => <span className="secondaire">—</span>;

function celluleBooleen(valeur: unknown) {
    return <Pastille ton={valeur === true ? 'ok' : 'neutre'}>{valeur === true ? 'oui' : 'non'}</Pastille>;
}

function celluleImage(valeur: unknown) {
    if (typeof valeur === 'string' && valeur !== '') return <img className="vignette" src={valeur} alt="" loading="lazy" />;
    return valeur === '' ? <ImageOff className="icone secondaire" aria-label="aucune image" /> : <Tiret />;
}

function celluleJson(valeur: unknown) {
    return estVide(valeur) ? <Tiret /> : <code className="secondaire">{JSON.stringify(valeur).slice(0, 60)}</code>;
}

function listeAvecInconnues(valeurs: readonly string[], libelles: ReadonlyMap<string, string>, inconnues: readonly string[]) {
    return (
        <span className="liste-en-ligne">
            {valeurs.map((v) => (inconnues.includes(v) ? <ValeurInconnue key={v} valeur={v} /> : <span key={v}>{libelles.get(v) ?? v}</span>))}
        </span>
    );
}

function celluleEtablissements(valeur: unknown, codesConnus: readonly string[] | null) {
    if (!Array.isArray(valeur) || valeur.length === 0) return <span className="secondaire">tous</span>;
    const codes = valeur.map(String);
    return listeAvecInconnues(codes, new Map(), valeursInconnues({ nom: '', libelle: '', type: { type: 'etablissements' } }, codes, codesConnus));
}

/** Les libelles des cases cochees ; rien de coche se lit « toutes », comme les campus. */
function celluleCases(champ: Champ, valeur: unknown) {
    const options = champ.type.type === 'cases' ? champ.type.options : [];
    if (!Array.isArray(valeur) || valeur.length === 0) return <span className="secondaire">toutes</span>;
    const valeurs = valeur.map(String);
    return listeAvecInconnues(valeurs, new Map(options.map((o) => [o.valeur, o.libelle])), valeursInconnues(champ, valeurs, null));
}

function celluleChoix(champ: Champ, valeur: unknown) {
    const options = champ.type.type === 'choix' ? champ.type.options : [];
    const option = options.find((candidat) => candidat.valeur === String(valeur ?? ''));
    if (option !== undefined) {
        return option.ton === undefined ? <>{option.libelle}</> : <Pastille ton={option.ton}>{option.libelle}</Pastille>;
    }
    return estVide(valeur) ? <Tiret /> : <ValeurInconnue valeur={String(valeur)} />;
}

export interface CelluleProps {
    readonly champ: Champ | undefined;
    readonly valeur: unknown;
    readonly codesConnus: readonly string[] | null;
}

const CELLULES: Record<string, (props: CelluleProps & { readonly champ: Champ }) => JSX.Element> = {
    booleen: ({ valeur }) => celluleBooleen(valeur),
    date: ({ valeur }) => <>{formaterDate(valeur)}</>,
    image: ({ valeur }) => celluleImage(valeur),
    json: ({ valeur }) => celluleJson(valeur),
    etablissements: ({ valeur, codesConnus }) => celluleEtablissements(valeur, codesConnus),
    cases: ({ champ, valeur }) => celluleCases(champ, valeur),
    choix: ({ champ, valeur }) => celluleChoix(champ, valeur),
};

export function Cellule({ champ, valeur, codesConnus }: CelluleProps) {
    const rendu = champ === undefined ? undefined : CELLULES[champ.type.type];
    if (champ !== undefined && rendu !== undefined) return rendu({ champ, valeur, codesConnus });
    if (estVide(valeur)) return <Tiret />;
    // Les saisies structurees de 7-F se resument en une ligne plutot qu'en `[object Object]`.
    const resume = champ === undefined ? null : resumeStructure(champ.type.type, valeur);
    return <>{resume ?? String(valeur)}</>;
}

/** Un texte long (une zone) se tronque comme un titre : sans ca, la colonne s'elargit a la longueur de la plus longue reponse. */
export function seTronque(nom: string, champ: Champ | undefined): boolean {
    return nom === 'titre' || nom === 'nom' || nom === 'texte' || champ?.type.type === 'zone' || champ?.type.type === 'description';
}

/** La classe d'une cellule : tronquee pour un texte long, d'un seul tenant pour une date. */
export function classeDeCellule(nom: string, champ: Champ | undefined): string | undefined {
    if (seTronque(nom, champ)) return 'tronque';
    return champ?.type.type === 'date' ? 'date' : undefined;
}
