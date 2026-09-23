/**
 * Le lieu d'une annonce : la latitude, et la longitude que le descripteur nomme en colonne soeur.
 * Personne ne tape une latitude : on colle un point copie d'une carte — le clic droit de Google Maps,
 * l'adresse d'une fiche Google Maps ou d'OpenStreetMap —, et les deux champs se remplissent. Un lien
 * ouvre le point sur une carte, pour verifier avant de publier.
 */

import { ExternalLink, X } from 'lucide-react';
import type { ClipboardEvent } from 'react';

import { lienOpenStreetMap, lireCoordonnees } from '../../../lib/coordonnees';
import { Bouton } from '../../ui/Bouton';
import type { ChampProps } from './types';

function texte(valeur: unknown): string {
    return typeof valeur === 'string' ? valeur : '';
}

export function ChampLieu({ champ, id, saisie, onChange, poserAutre, ligne, desactive }: ChampProps) {
    const longitude = champ.type.type === 'lieu' ? champ.type.longitude : 'lng';
    const lat = texte(saisie);
    const lng = texte(ligne[longitude]);
    const point = lireCoordonnees(`${lat} ${lng}`.replace(/,/g, '.'));

    // Un couple colle remplit les deux champs ; un nombre seul se colle comme d'habitude.
    const coller = (evenement: ClipboardEvent<HTMLInputElement>) => {
        const colle = lireCoordonnees(evenement.clipboardData.getData('text'));
        if (colle === null) return;
        evenement.preventDefault();
        onChange(String(colle.lat));
        poserAutre(longitude, String(colle.lng));
    };

    return (
        <div className="lieu">
            <div className="lieu-champs">
                <label className="sous-champ">Latitude
                    <input id={id} type="text" inputMode="decimal" placeholder="44.80581" value={lat} disabled={desactive} onChange={(e) => onChange(e.target.value)} onPaste={coller} />
                </label>
                <label className="sous-champ">Longitude
                    <input type="text" inputMode="decimal" placeholder="-0.60410" value={lng} disabled={desactive} onChange={(e) => poserAutre(longitude, e.target.value)} onPaste={coller} />
                </label>
            </div>
            <div className="boutons">
                {point !== null ? (
                    <a className="bouton tonal compact" href={lienOpenStreetMap(point)} target="_blank" rel="noreferrer">
                        <span className="contenu-bouton"><ExternalLink className="icone" aria-hidden="true" />Vérifier sur la carte</span>
                    </a>
                ) : null}
                <Bouton variante="discret" compact disabled={desactive || (lat === '' && lng === '')} onClick={() => { onChange(''); poserAutre(longitude, ''); }} icone={<X className="icone" aria-hidden="true" />}>
                    Retirer le lieu
                </Bouton>
            </div>
        </div>
    );
}
