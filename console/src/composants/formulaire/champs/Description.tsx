/**
 * La description d'une annonce : le mini-langage des fiches, dans une zone qui aide a l'ecrire.
 *
 * - la zone **grandit avec le texte** : une annonce longue se relit d'un coup d'oeil au lieu de se
 *   parcourir dans une boite de dix lignes ;
 * - la **barre des marqueurs** reste visible pendant qu'on ecrit : elle colle sous la barre de la
 *   console quand la zone defile ;
 * - la zone dit a l'apercu **la ligne ou est le curseur**, et l'apercu se cale sur la section
 *   correspondante de la fiche.
 *
 * La grammaire elle-meme est celle de `src/shared/annonces/grammaire.ts` : la barre n'en connait que
 * les prefixes.
 */

import { useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

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

/** Assez de lignes pour qu'une annonce courante tienne sans defiler ; la zone grandit au-dela. */
const LIGNES_MINIMUM = 12;

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

/** La ligne du curseur, 0 pour la premiere. */
export function ligneDuCurseur(texte: string, position: number): number {
    return texte.slice(0, Math.max(0, position)).split('\n').length - 1;
}

export function ChampDescription({ id, saisie, onChange, desactive, champ, signalerLigne }: ChampProps) {
    const zone = useRef<HTMLTextAreaElement>(null);
    const texte = typeof saisie === 'string' ? saisie : '';

    const signaler = () => {
        const element = zone.current;
        if (element !== null && signalerLigne !== undefined) signalerLigne(ligneDuCurseur(element.value, element.selectionStart));
    };

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
            signaler();
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
            <TextareaAutosize
                ref={zone}
                id={id}
                className="zone-description"
                value={texte}
                minRows={LIGNES_MINIMUM}
                disabled={desactive}
                spellCheck
                onChange={(e) => onChange(e.target.value)}
                onSelect={signaler}
                onFocus={signaler}
                aria-describedby={champ.aide === undefined ? undefined : `${id}-aide`}
            />
        </div>
    );
}
