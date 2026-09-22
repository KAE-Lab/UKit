/**
 * Le point focal d'une image : un clic pose `{ x, y }` en fractions, les fleches l'ajustent au
 * clavier, et la bascule a cote dit si l'image **couvre** le cadre autour de ce point ou s'y
 * **contient** sur fond flou. L'image et l'ajustement sont deux autres colonnes du formulaire, que
 * le descripteur nomme ; l'apercu recadre aussitot.
 */

import { Crosshair } from 'lucide-react';
import type { KeyboardEvent, MouseEvent } from 'react';

import { FOCALE_PAR_DEFAUT, lireFocale, type FocaleSaisie } from '../../../schema/schemas';
import type { ChampProps } from './types';

const PAS_CLAVIER = 0.05;

const AJUSTEMENTS = [
    { valeur: 'couvrir', libelle: 'Couvrir', aide: 'L’image remplit le cadre 4:5, recadrée autour du point focal.' },
    { valeur: 'contenir', libelle: 'Contenir', aide: 'L’image entière, sur un fond flou tiré d’elle-même.' },
] as const;

function borner(valeur: number): number {
    return Math.min(1, Math.max(0, Math.round(valeur * 1000) / 1000));
}

/** La focale deplacee d'une fleche ; `null` si la touche n'en est pas une. */
export function deplacer(focale: FocaleSaisie, touche: string): FocaleSaisie | null {
    switch (touche) {
        case 'ArrowLeft': return { ...focale, x: borner(focale.x - PAS_CLAVIER) };
        case 'ArrowRight': return { ...focale, x: borner(focale.x + PAS_CLAVIER) };
        case 'ArrowUp': return { ...focale, y: borner(focale.y - PAS_CLAVIER) };
        case 'ArrowDown': return { ...focale, y: borner(focale.y + PAS_CLAVIER) };
        default: return null;
    }
}

export function ChampFocale({ champ, id, saisie, onChange, poserAutre, ligne, desactive }: ChampProps) {
    const type = champ.type.type === 'focale' ? champ.type : null;
    const image = type === null ? '' : String(ligne[type.image] ?? '');
    const ajustement = type === null ? 'couvrir' : String(ligne[type.ajustement] ?? 'couvrir');
    const focale = lireFocale(saisie);

    const cliquer = (evenement: MouseEvent<HTMLImageElement>) => {
        if (desactive) return;
        const boite = evenement.currentTarget.getBoundingClientRect();
        if (boite.width === 0 || boite.height === 0) return;
        onChange({ x: borner((evenement.clientX - boite.left) / boite.width), y: borner((evenement.clientY - boite.top) / boite.height) });
    };

    const clavier = (evenement: KeyboardEvent<HTMLButtonElement>) => {
        const suivante = deplacer(focale, evenement.key);
        if (suivante === null || desactive) return;
        evenement.preventDefault();
        onChange(suivante);
    };

    return (
        <div className="focale">
            {image === '' ? (
                <div className="focale-sans-image secondaire">Téléverse d’abord un visuel : le point focal se choisit dessus.</div>
            ) : (
                <div className="focale-cadre">
                    <img src={image} alt="" draggable={false} onClick={cliquer} />
                    <button
                        type="button"
                        id={id}
                        className="focale-repere"
                        style={{ left: `${focale.x * 100}%`, top: `${focale.y * 100}%` }}
                        aria-label={`Point focal : ${Math.round(focale.x * 100)} % en largeur, ${Math.round(focale.y * 100)} % en hauteur. Les flèches le déplacent.`}
                        disabled={desactive}
                        onKeyDown={clavier}
                    >
                        <Crosshair className="icone" aria-hidden="true" />
                    </button>
                </div>
            )}
            <div className="focale-controles">
                <span className="petit secondaire">Focale : x {Math.round(focale.x * 100)} %, y {Math.round(focale.y * 100)} %</span>
                <button type="button" className="bouton discret compact" disabled={desactive || (focale.x === FOCALE_PAR_DEFAUT.x && focale.y === FOCALE_PAR_DEFAUT.y)} onClick={() => onChange(FOCALE_PAR_DEFAUT)}>
                    Recentrer
                </button>
                <span className="espace" />
                <div className="bascule" role="radiogroup" aria-label="Ajustement de l’image">
                    {AJUSTEMENTS.map((option) => (
                        <button
                            key={option.valeur}
                            type="button"
                            role="radio"
                            aria-checked={ajustement === option.valeur}
                            className={`segment ${ajustement === option.valeur ? 'actif' : ''}`}
                            title={option.aide}
                            disabled={desactive}
                            onClick={() => { if (type !== null) poserAutre(type.ajustement, option.valeur); }}
                        >
                            {option.libelle}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
