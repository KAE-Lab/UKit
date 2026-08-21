/**
 * Les restaurants CROUS, joues par le moteur embarque.
 *
 * Ce service n'emet plus aucune requete : il joue deux Blueprints — la liste et le menu d'un
 * restaurant, un par appel que l'application demande reellement — et travaille la donnee recue. Ce
 * qui reste ici est ce qui ne descend pas dans un fichier : la position de l'utilisateur, le calcul
 * des distances, le tri, et la langue des libelles de repli.
 *
 * Le contrat rendu aux ecrans porte desormais l'echec (`{ ok: false, failure }`), sur le modele de
 * `BdeService` : une source en panne et une liste legitimement vide cessent d'etre le meme ecran.
 *
 * Voir docs/features/campus-crous.md et docs/phase-6/6-d-campus.md.
 */

import Translator from '../../../shared/i18n/Translator';
import { BLUEPRINT, reportFailure, runBlueprint, serviceAbsent, type UkitFailure } from '../../../shared/aetherius';
import { crousRegionActive } from '../../../shared/etablissements';
import {
    projeterJourMenu,
    projeterRestaurant,
    type CrousDayMenu,
    type CrousRestaurant,
    type JourExtrait,
    type RestaurantExtrait,
} from './CrousMapping';
import { getDistanceInKm } from './FreeRoomService';

export type { CrousDayMenu, CrousRestaurant } from './CrousMapping';

/**
 * Ce qu'un ecran recoit.
 *
 * **Se teste avec `resultat.ok === false`, jamais avec `!resultat.ok`** : sans `strictNullChecks`,
 * TypeScript ne restreint pas une union sur la simple veracite du discriminant. Voir
 * shared/aetherius/runBlueprint.ts.
 */
export type CrousRestaurantsResult =
    | { readonly ok: true; readonly restaurants: CrousRestaurant[] }
    | { readonly ok: false; readonly failure: UkitFailure };

export type CrousMenuResult =
    | { readonly ok: true; readonly menus: CrousDayMenu[] }
    | { readonly ok: false; readonly failure: UkitFailure };

function commeListe(valeur: unknown): unknown[] {
    return Array.isArray(valeur) ? valeur : [];
}

/**
 * L'echec de restaurants qu'un etablissement ne couvre pas.
 *
 * `config` et non `unavailable` : aucun run n'est parti, rien n'est en panne, et proposer de reessayer
 * serait faux. Le message est celui d'un service absent — la meme famille que la messagerie d'une fac
 * dont le webmail n'est pas extractible (jalon 6-G).
 */
function restaurantsAbsents(): UkitFailure {
    return serviceAbsent(
        'ERROR_SERVICE_ABSENT',
        'CROUS_ABSENT',
        'l etablissement ne declare pas de region CROUS',
        'ERROR_SERVICE_ABSENT_TITLE',
    );
}

class CrousServiceManager {
    /**
     * La liste regionale, triee du plus proche au plus lointain quand la position est connue.
     *
     * Le tri et la distance restent applicatifs : ce sont des calculs, et un calcul dans un Blueprint
     * devrait etre reimplemente a l'identique dans les deux moteurs.
     */
    async fetchRestaurantsBordeaux(userLat?: number, userLon?: number): Promise<CrousRestaurantsResult> {
        // La region vient du catalogue depuis le jalon 6-J. `null` n'est pas une panne : c'est un
        // etablissement qui ne declare pas de restaurants, et l'ecran fait alors disparaitre la
        // section — meme regle que la messagerie et que les salles libres.
        const region = crousRegionActive();
        if (region === null) {
            return { ok: false, failure: restaurantsAbsents() };
        }

        const run = await runBlueprint(BLUEPRINT.CAMPUS_RESTAURANTS, { inputs: { region } });
        if (run.ok === false) {
            reportFailure(BLUEPRINT.CAMPUS_RESTAURANTS, run.failure);
            return { ok: false, failure: run.failure };
        }

        const repli = Translator.get('UNSPECIFIED_HOURS');
        const restaurants = commeListe(run.outputs.restaurants).map((brut) => {
            const restaurant = projeterRestaurant(brut as RestaurantExtrait, repli);
            if (userLat === undefined || userLon === undefined) {
                return restaurant;
            }
            return { ...restaurant, distance: getDistanceInKm(userLat, userLon, restaurant.lat, restaurant.lon) };
        });

        if (userLat !== undefined && userLon !== undefined) {
            restaurants.sort((gauche, droite) => (gauche.distance || 0) - (droite.distance || 0));
        }

        return { ok: true, restaurants };
    }

    /**
     * Les menus publies d'un restaurant, tous les jours d'un coup.
     *
     * Une liste vide est un **resultat** : plus de la moitie des restaurants de la region ne publient
     * aucun menu, et le Blueprint accepte explicitement ce cas (statut 404) plutot que d'en faire une
     * panne. L'ecran affiche alors son etat vide, comme avant la migration.
     */
    async fetchRestaurantMenu(restaurantId: string): Promise<CrousMenuResult> {
        const run = await runBlueprint(BLUEPRINT.CAMPUS_RESTAURANT_MENU, {
            inputs: { restaurant: String(restaurantId) },
        });
        if (run.ok === false) {
            reportFailure(BLUEPRINT.CAMPUS_RESTAURANT_MENU, run.failure);
            return { ok: false, failure: run.failure };
        }

        const repliCategorie = Translator.get('CATEGORY');
        return {
            ok: true,
            menus: commeListe(run.outputs.jours).map((jour) => projeterJourMenu(jour as JourExtrait, repliCategorie)),
        };
    }
}

export const CrousService = new CrousServiceManager();
