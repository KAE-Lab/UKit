/**
 * Le point focal d'une image : un clic le pose, un glisser le deplace, les fleches l'ajustent au
 * clavier. Un voile couvre ce que le cadre de la carte coupera, pour qu'on voie le recadrage au lieu
 * de le deviner ; la bascule a cote dit si l'image **couvre** le cadre ou s'y **contient** sur fond
 * flou. L'image et l'ajustement sont deux autres colonnes du formulaire, que le descripteur nomme.
 *
 * Le cadre epouse l'image au pixel : le clic se mesure dans la boite de l'image, et le repere se
 * dessine en fractions de cette meme boite. Un cadre plus large que l'image — il s'etirait sur toute
 * la colonne — posait le repere a droite du clic (retour du 2026-09-23).
 */

import { Crosshair } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { focaleDepuisPointeur, zoneGardee } from '../../../lib/cadrage';
import { FOCALE_PAR_DEFAUT, lireFocale, type FocaleSaisie } from '../../../schema/schemas';
import type { ChampProps } from './types';

const PAS_CLAVIER = 0.05;

const AJUSTEMENTS = [
    { valeur: 'couvrir', libelle: 'Couvrir', aide: 'L’image remplit le cadre de la carte, recadrée selon le point focal.' },
    { valeur: 'contenir', libelle: 'Contenir', aide: 'L’image entière, sur un fond flou tiré d’elle-même.' },
] as const;

function borner(valeur: number): number {
    return Math.min(1, Math.max(0, Math.round(valeur * 1000) / 1000));
}

function pourcent(fraction: number): string {
    return `${fraction * 100}%`;
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

/** Poser et glisser le point sur l'image : un pointeur capture, mesure dans la boite de l'image. */
function useGlisser(image: React.RefObject<HTMLImageElement | null>, repere: React.RefObject<HTMLButtonElement | null>, poser: (focale: FocaleSaisie) => void, desactive: boolean) {
    const [enGlisse, setEnGlisse] = useState(false);
    const poserSous = (x: number, y: number) => {
        const boite = image.current?.getBoundingClientRect();
        const focale = boite === undefined ? null : focaleDepuisPointeur(x, y, boite);
        if (focale !== null) poser(focale);
    };
    return {
        enGlisse,
        onPointerDown: (evenement: PointerEvent<HTMLDivElement>) => {
            if (desactive || evenement.button !== 0) return;
            evenement.preventDefault();
            evenement.currentTarget.setPointerCapture(evenement.pointerId);
            setEnGlisse(true);
            poserSous(evenement.clientX, evenement.clientY);
            // Le repere prend le focus : les fleches affinent aussitot ce que le clic a pose.
            repere.current?.focus({ preventScroll: true });
        },
        onPointerMove: (evenement: PointerEvent<HTMLDivElement>) => { if (enGlisse) poserSous(evenement.clientX, evenement.clientY); },
        onPointerUp: () => setEnGlisse(false),
        onPointerCancel: () => setEnGlisse(false),
    };
}

/** Ce que le descripteur dit du champ : l'image visee, l'ajustement et sa colonne, le ratio du cadre. */
function reglages(champ: ChampProps['champ'], ligne: ChampProps['ligne']) {
    const type = champ.type.type === 'focale' ? champ.type : null;
    return {
        image: type === null ? '' : String(ligne[type.image] ?? ''),
        colonneAjustement: type?.ajustement ?? null,
        ajustement: type === null ? 'couvrir' : String(ligne[type.ajustement] ?? 'couvrir'),
        ratio: type?.ratio ?? null,
    };
}

/** Sous l'image : la position lue, « Recentrer », et la bascule couvrir / contenir. */
function Commandes({ focale, ajustement, desactive, onChange, poserAjustement }: {
    readonly focale: FocaleSaisie;
    readonly ajustement: string;
    readonly desactive: boolean;
    readonly onChange: (focale: FocaleSaisie) => void;
    readonly poserAjustement: (valeur: string) => void;
}) {
    const auDefaut = focale.x === FOCALE_PAR_DEFAUT.x && focale.y === FOCALE_PAR_DEFAUT.y;
    return (
        <div className="focale-controles">
            <span className="petit secondaire">x {Math.round(focale.x * 100)} %, y {Math.round(focale.y * 100)} %</span>
            <button type="button" className="bouton discret compact" disabled={desactive || auDefaut} onClick={() => onChange(FOCALE_PAR_DEFAUT)}>Recentrer</button>
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
                        onClick={() => poserAjustement(option.valeur)}
                    >
                        {option.libelle}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function ChampFocale({ champ, id, saisie, onChange, poserAutre, ligne, desactive }: ChampProps) {
    const { image, colonneAjustement, ajustement, ratio } = reglages(champ, ligne);
    const focale = lireFocale(saisie);
    const refImage = useRef<HTMLImageElement>(null);
    const refRepere = useRef<HTMLButtonElement>(null);
    // Le ratio est mesure au chargement, et ne vaut que pour l'image mesuree : une autre attend le sien.
    const [mesure, setMesure] = useState<{ readonly image: string; readonly ratio: number } | null>(null);
    const ratioImage = mesure !== null && mesure.image === image ? mesure.ratio : null;
    const { enGlisse, ...gestes } = useGlisser(refImage, refRepere, onChange, desactive);
    const zone = ratioImage === null || ratio === null || ajustement !== 'couvrir' ? null : zoneGardee(ratioImage, focale, ratio);

    const clavier = (evenement: KeyboardEvent<HTMLButtonElement>) => {
        const suivante = deplacer(focale, evenement.key);
        if (suivante === null || desactive) return;
        evenement.preventDefault();
        onChange(suivante);
    };

    if (image === '') return <div className="focale-sans-image secondaire">Téléverse d’abord un visuel : le point focal se choisit dessus.</div>;
    return (
        <div className="focale">
            <div className={`focale-cadre ${enGlisse ? 'en-glisse' : ''} ${ajustement === 'contenir' ? 'contient' : ''}`} {...gestes}>
                <img ref={refImage} src={image} alt="" draggable={false} onLoad={(e) => setMesure({ image, ratio: e.currentTarget.naturalWidth / e.currentTarget.naturalHeight })} />
                {zone !== null ? <div className="focale-zone" aria-hidden="true" style={{ left: pourcent(zone.gauche), top: pourcent(zone.haut), width: pourcent(zone.largeur), height: pourcent(zone.hauteur) }} /> : null}
                <button
                    ref={refRepere}
                    type="button"
                    id={id}
                    className="focale-repere"
                    style={{ left: pourcent(focale.x), top: pourcent(focale.y) }}
                    aria-label={`Point focal : ${Math.round(focale.x * 100)} % en largeur, ${Math.round(focale.y * 100)} % en hauteur. Les flèches le déplacent.`}
                    disabled={desactive}
                    onKeyDown={clavier}
                >
                    <Crosshair className="icone" aria-hidden="true" />
                </button>
            </div>
            <Commandes
                focale={focale}
                ajustement={ajustement}
                desactive={desactive}
                onChange={onChange}
                poserAjustement={(valeur) => { if (colonneAjustement !== null) poserAutre(colonneAjustement, valeur); }}
            />
            {ajustement === 'contenir' ? <span className="petit secondaire">En « contenir », l’image s’affiche entière sur un fond flou : le point focal ne sert pas.</span> : null}
        </div>
    );
}
