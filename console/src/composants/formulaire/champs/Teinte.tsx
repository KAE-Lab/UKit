/**
 * La teinte d'identite d'une annonce, sur un nuancier : choisir « 2 » dans une liste ne disait rien
 * a qui publie. Chaque pastille montre la couleur dans les deux themes de l'application — la moitie
 * haute en clair, la moitie basse en sombre —, parce qu'elle n'y est pas tout a fait la meme.
 *
 * Les couleurs viennent de `palettes.ts`, les index permis de la grammaire (le 4 est interdit) :
 * rien n'est recopie ici que les noms.
 */

import { PALETTE } from '../../../../../src/shared/annonces/grammaire';
import { PALETTES } from '../../../../../src/shared/theme/palettes';
import type { ChampProps } from './types';

/** Les noms des teintes de `sectionsHeaders`, pour qui ne lit pas l'hexadecimal. */
const NOMS: Readonly<Record<number, string>> = { 0: 'Bleu', 1: 'Vert', 2: 'Orange', 3: 'Rouge', 5: 'Bleu ciel' };

interface Nuance {
    readonly valeur: string;
    readonly nom: string;
    readonly clair: string;
    readonly sombre: string;
}

function nuances(): readonly Nuance[] {
    const parDefaut: Nuance = { valeur: '', nom: 'Par défaut', clair: PALETTES.light.accent, sombre: PALETTES.dark.accent };
    return [parDefaut, ...PALETTE.map((index) => ({
        valeur: String(index),
        nom: NOMS[index] ?? String(index),
        clair: PALETTES.light.sectionsHeaders[index] ?? PALETTES.light.accent,
        sombre: PALETTES.dark.sectionsHeaders[index] ?? PALETTES.dark.accent,
    }))];
}

export function ChampTeinte({ champ, id, saisie, onChange, desactive }: ChampProps) {
    const valeur = typeof saisie === 'string' ? saisie : '';
    const liste = nuances();
    const inconnue = valeur !== '' && !liste.some((nuance) => nuance.valeur === valeur);
    return (
        <div className="nuancier" role="radiogroup" aria-label={champ.libelle}>
            {liste.map((nuance) => (
                <label key={nuance.valeur} className={`nuance ${valeur === nuance.valeur ? 'choisie' : ''}`} title={`${nuance.nom} : ${nuance.clair} en clair, ${nuance.sombre} en sombre`}>
                    <input
                        type="radio"
                        name={id}
                        id={nuance.valeur === liste[0]?.valeur ? id : undefined}
                        checked={valeur === nuance.valeur}
                        disabled={desactive}
                        onChange={() => onChange(nuance.valeur)}
                    />
                    <span className="echantillon" aria-hidden="true" style={{ background: `linear-gradient(${nuance.clair} 50%, ${nuance.sombre} 50%)` }} />
                    {nuance.nom}
                </label>
            ))}
            {inconnue ? <span className="case inconnue" title="Hors palette : choisis une autre teinte pour pouvoir enregistrer.">{valeur} (hors palette)</span> : null}
        </div>
    );
}
