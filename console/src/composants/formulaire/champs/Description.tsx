/**
 * La description d'une annonce : le mini-langage des fiches, dans une zone qui aide. La barre
 * insere les marqueurs au bon endroit — en tete de ligne pour une regle de ligne, autour de la
 * selection pour le gras — et l'apercu, a droite, les rend. La grammaire elle-meme est celle de
 * `src/shared/annonces/grammaire.ts` : la barre n'en connait que les prefixes.
 */

import { useRef } from 'react';

import type { ChampProps } from './types';

interface Marqueur {
    readonly libelle: string;
    readonly titre: string;
    /** Un prefixe de ligne ; le gras, lui, entoure. */
    readonly prefixe?: string;
    readonly entoure?: string;
}

const MARQUEURS: readonly Marqueur[] = [
    { libelle: '# Titre', titre: 'Une section : tête colorée avec icône', prefixe: '# ' },
    { libelle: '# icône|Titre', titre: 'Une section avec l’icône MaterialCommunityIcons nommée (calendar-check, map-marker…)', prefixe: '# calendar-check|' },
    { libelle: '- puce', titre: 'Une puce ; -- et --- pour les niveaux suivants', prefixe: '- ' },
    { libelle: '> exergue', titre: 'Une exergue : la phrase en grand, filet teinté à gauche', prefixe: '> ' },
    { libelle: '= transition', titre: 'Une transition : la phrase en plus grand sous un trait teinté', prefixe: '= ' },
    { libelle: '~ signature', titre: 'Une signature : alignée à droite, teintée', prefixe: '~ ' },
    { libelle: '**gras**', titre: 'Le gras en ligne, dans un paragraphe ou une puce', entoure: '**' },
];

/** Insere le marqueur dans le texte et rend le texte nouveau et la position du curseur apres. */
export function inserer(texte: string, debut: number, fin: number, marqueur: Marqueur): { readonly texte: string; readonly curseur: number } {
    if (marqueur.entoure !== undefined) {
        const selection = texte.slice(debut, fin);
        const nouveau = `${texte.slice(0, debut)}${marqueur.entoure}${selection}${marqueur.entoure}${texte.slice(fin)}`;
        return { texte: nouveau, curseur: debut + marqueur.entoure.length + selection.length };
    }
    const prefixe = marqueur.prefixe ?? '';
    const debutDeLigne = texte.lastIndexOf('\n', debut - 1) + 1;
    return { texte: `${texte.slice(0, debutDeLigne)}${prefixe}${texte.slice(debutDeLigne)}`, curseur: debut + prefixe.length };
}

export function ChampDescription({ id, saisie, onChange, desactive, champ }: ChampProps) {
    const zone = useRef<HTMLTextAreaElement>(null);
    const texte = typeof saisie === 'string' ? saisie : '';

    const poser = (marqueur: Marqueur) => {
        const element = zone.current;
        const debut = element?.selectionStart ?? texte.length;
        const fin = element?.selectionEnd ?? texte.length;
        const resultat = inserer(texte, debut, fin, marqueur);
        onChange(resultat.texte);
        // Le curseur se repose apres que React a rendu la nouvelle valeur, sinon il saute a la fin.
        requestAnimationFrame(() => {
            element?.focus();
            element?.setSelectionRange(resultat.curseur, resultat.curseur);
        });
    };

    return (
        <div className="description-editeur">
            <div className="barre-marqueurs" role="toolbar" aria-label="Marqueurs de la description">
                {MARQUEURS.map((marqueur) => (
                    <button key={marqueur.libelle} type="button" className="marqueur" title={marqueur.titre} disabled={desactive} onClick={() => poser(marqueur)}>
                        {marqueur.libelle}
                    </button>
                ))}
            </div>
            <textarea ref={zone} id={id} value={texte} disabled={desactive} spellCheck onChange={(e) => onChange(e.target.value)} aria-describedby={champ.aide === undefined ? undefined : `${id}-aide`} />
        </div>
    );
}
