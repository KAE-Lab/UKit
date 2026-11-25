/**
 * « Sur place » sur la fiche d'un restaurant : la cible, les horaires que la fiche affiche (leur
 * empreinte, et les deux services a corriger), les plats du menu du jour pour la recommandation, et
 * la question de l'attente aux heures du service, a proximite si la position est connue.
 */

import { useMemo } from 'react';

import { jourDeParis } from '../../../shared/communaute/donnees';
import { empreinteDesHoraires } from '../../../shared/communaute/horaires';
import { nomDePlat } from '../../../shared/communaute/lieu';
import { cibleDuLieu } from '../../../shared/communaute/vocabulaire';
import { maintenant } from '../../../shared/services/Temps';
import { useCampusPosition } from '../hooks/useCampusPosition';
import type { CrousDayMenu } from '../services/CrousService';
import type { HorairesASaisir } from './FeuilleDeSignalement';
import { poserLaQuestionDeLAttente } from './service';
import { useSurPlace, type SurPlace } from './useSurPlace';

/** Les plats d'un jour, tels que la recommandation les ecrit et les compare (lieu.ts `nomDePlat`). */
export function platsDuJour(menu: CrousDayMenu | undefined): string[] {
    if (menu === undefined) return [];
    const noms = [...menu.midi, ...menu.soir].flatMap((categorie) => categorie.dishes).map(nomDePlat).filter((nom) => nom !== '');
    return [...new Set(noms)];
}

export interface SurPlaceDuRestaurant {
    readonly cible: string | null;
    readonly surPlace: SurPlace;
    readonly horaires: HorairesASaisir | null;
    readonly plats: readonly string[];
    readonly questionDAttente: boolean;
}

export function useSurPlaceDuRestaurant({ restaurantId, openingLines, location, menus }: {
    readonly restaurantId: string;
    readonly openingLines: readonly string[] | undefined;
    readonly location: { readonly lat: number; readonly lng: number } | undefined;
    readonly menus: readonly CrousDayMenu[];
}): SurPlaceDuRestaurant {
    const position = useCampusPosition();
    const cible = cibleDuLieu('restaurant', String(restaurantId));
    const empreinte = useMemo(() => (openingLines !== undefined && openingLines.length > 0 ? empreinteDesHoraires(openingLines) : null), [openingLines]);
    const horaires = useMemo((): HorairesASaisir | null => (empreinte === null ? null : { empreinte, services: ['midi', 'soir'] }), [empreinte]);
    // Le jour se relit a chaque rendu : une fiche laissee ouverte apres minuit ne propose plus les plats de la veille.
    const jour = jourDeParis(maintenant());
    const plats = useMemo(() => platsDuJour(menus.find((menu) => menu.date === jour)), [menus, jour]);
    const platsPermis = useMemo(() => new Set(plats), [plats]);
    const surPlace = useSurPlace({ domaine: 'restaurant', cible, empreinteDesHoraires: empreinte, platsDuJour: platsPermis });
    // La position se lit une fois pour tout le Campus : tant qu'elle ne l'est pas, la question attend,
    // pour ne pas apparaitre puis disparaitre a quelques centaines de metres.
    const questionDAttente = position.resolue && poserLaQuestionDeLAttente(
        openingLines ?? [],
        new Date(surPlace.instant),
        position.lat !== undefined && position.lon !== undefined ? { lat: position.lat, lon: position.lon } : null,
        location !== undefined ? { lat: location.lat, lon: location.lng } : null,
    );
    return { cible, surPlace, horaires, plats, questionDAttente };
}
