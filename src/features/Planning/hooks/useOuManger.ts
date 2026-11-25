/**
 * Ou manger pendant le trou de midi (docs/phase-8/6-intelligence.md) : le batiment du cours suivant,
 * puis les restaurants proposes autour. Ne lit rien quand il n'y a rien a proposer — pas de trou, pas
 * de batiment place, un trou deja passe —, et ne relit que si la fenetre ou le batiment changent.
 */

import { useEffect, useMemo, useState } from 'react';

import { lieuxDuCours } from '../../../shared/locations/salles';
import { maintenant } from '../../../shared/services/Temps';
import type { PlanningEvent } from '../services/PlanningAssembly';
import { proposerOuManger, type Suggestion } from '../services/OuMangerService';
import type { Lieu, TrouDeMidi } from '../services/ouManger';

export type EtatDeMidi =
    | { readonly etat: 'sans-lieu' }
    | { readonly etat: 'attente' }
    | { readonly etat: 'indisponible' }
    | { readonly etat: 'pret'; readonly suggestions: readonly Suggestion[] };

/** Le premier batiment place du cours : celui ou l'etudiant sera apres le trou. */
function lieuDuCours(cours: PlanningEvent | null): Lieu | null {
    if (cours === null) return null;
    const lieu = lieuxDuCours(cours).find((un) => typeof un.lat === 'number' && typeof un.lng === 'number');
    return lieu === undefined ? null : { lat: lieu.lat as number, lng: lieu.lng as number };
}

/**
 * Le pas auquel la fenetre suit l'heure pendant le trou : un restaurant qui ferme dans cinq minutes ne
 * se propose plus, sans relire la communaute a chaque minute.
 */
const PAS_MINUTES = 10;

export function useOuManger(trou: TrouDeMidi<PlanningEvent> | null, minute: number | null, actif: boolean): EtatDeMidi {
    const lieu = useMemo(() => lieuDuCours(trou?.coursSuivant ?? null), [trou?.coursSuivant]);
    const [etat, setEtat] = useState<EtatDeMidi>({ etat: 'attente' });
    // Des nombres pour dependances : une relecture du telephone refait la journee, pas le trou ni le lieu.
    // Pendant le trou, ce qui en reste : un service qui recouvrait le trou entier peut finir avant.
    const debut = trou === null ? undefined : Math.max(trou.fenetre.debut, minute === null ? 0 : Math.floor(minute / PAS_MINUTES) * PAS_MINUTES);
    const fin = trou?.fenetre.fin;
    const lat = lieu?.lat;
    const lng = lieu?.lng;

    useEffect(() => {
        if (!actif || lat === undefined || lng === undefined || debut === undefined || fin === undefined) return undefined;
        let vivant = true;
        setEtat({ etat: 'attente' });
        proposerOuManger({ fenetre: { debut, fin }, lieu: { lat, lng }, instant: maintenant() })
            .then((resultat) => { if (vivant) setEtat(resultat); })
            .catch((erreur) => {
                console.warn('[planning] ou manger en erreur', erreur);
                if (vivant) setEtat({ etat: 'indisponible' });
            });
        return () => { vivant = false; };
    }, [actif, lat, lng, debut, fin]);

    return lieu === null ? { etat: 'sans-lieu' } : etat;
}
