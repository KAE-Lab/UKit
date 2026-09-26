/**
 * Les creneaux de mise en avant : des plages — les jours de la semaine, une heure de debut, une
 * heure de fin —, en heure de Paris, comme toute l'application. Le module partage `ordre.ts` dit
 * ce qu'une plage active fait de l'ordre ; ici, on la saisit.
 */

import { Plus, X } from 'lucide-react';

import { JOURS } from '../../../schema/resumes';
import { lireCreneauxSaisis, type CreneauSaisi } from '../../../schema/schemas';
import { Bouton } from '../../ui/Bouton';
import type { ChampProps } from './types';

const PLAGE_NEUVE: CreneauSaisi = { jours: [1, 2, 3, 4, 5], de: '11:00', a: '14:00' };

function Plage({ plage, rang, desactive, onChange, onRetirer }: {
    readonly plage: CreneauSaisi;
    readonly rang: number;
    readonly desactive: boolean;
    readonly onChange: (plage: CreneauSaisi) => void;
    readonly onRetirer: () => void;
}) {
    const basculer = (numero: number) => {
        const jours = plage.jours.includes(numero) ? plage.jours.filter((jour) => jour !== numero) : [...plage.jours, numero].sort((a, b) => a - b);
        onChange({ ...plage, jours });
    };
    return (
        <div className="creneau" role="group" aria-label={`Créneau ${rang + 1}`}>
            <div className="creneau-jours">
                {JOURS.map((jour) => (
                    <label key={jour.numero} className={`jour ${plage.jours.includes(jour.numero) ? 'coche' : ''}`} title={jour.long}>
                        <input type="checkbox" checked={plage.jours.includes(jour.numero)} disabled={desactive} onChange={() => basculer(jour.numero)} />
                        {jour.court}
                    </label>
                ))}
            </div>
            <div className="creneau-heures">
                <label>de <input type="time" value={plage.de} disabled={desactive} onChange={(e) => onChange({ ...plage, de: e.target.value })} /></label>
                <label>à <input type="time" value={plage.a} disabled={desactive} onChange={(e) => onChange({ ...plage, a: e.target.value })} /></label>
                <Bouton variante="discret" compact disabled={desactive} onClick={onRetirer} icone={<X className="icone" aria-hidden="true" />} aria-label={`Retirer le créneau ${rang + 1}`} />
            </div>
        </div>
    );
}

export function ChampCreneaux({ saisie, onChange, desactive }: ChampProps) {
    const plages = lireCreneauxSaisis(saisie);
    const remplacer = (rang: number, plage: CreneauSaisi) => onChange(plages.map((courante, index) => (index === rang ? plage : courante)));
    return (
        <div className="creneaux">
            {plages.map((plage, rang) => (
                <Plage key={rang} plage={plage} rang={rang} desactive={desactive} onChange={(suivante) => remplacer(rang, suivante)} onRetirer={() => onChange(plages.filter((_, index) => index !== rang))} />
            ))}
            <div className="boutons">
                <Bouton variante="tonal" compact disabled={desactive} onClick={() => onChange([...plages, PLAGE_NEUVE])} icone={<Plus className="icone" aria-hidden="true" />}>
                    {plages.length === 0 ? 'Ajouter un créneau' : 'Un autre créneau'}
                </Bouton>
                <span className="petit secondaire">Heure de Paris. La fin est exclue ; une plage peut passer minuit.</span>
            </div>
        </div>
    );
}
