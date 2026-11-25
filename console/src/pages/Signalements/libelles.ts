/**
 * Les mots de la moderation, en francais : la console parle a l'equipe. L'application a les siens, dans
 * ses trois dictionnaires ; libelles.test.ts verifie qu'aucun sujet du vocabulaire n'en manque ici.
 */

import { formaterMinutes, lireCorrection, servicesDe } from '../../../../src/shared/communaute/horaires';
import type { DomaineDeLieu, SujetDeLieu } from '../../../../src/shared/communaute/vocabulaire';

export const DOMAINES: Readonly<Record<DomaineDeLieu, string>> = {
    restaurant: 'Restaurant',
    bibliotheque: 'Bibliothèque',
    batiment: 'Bâtiment',
};

export const SUJETS_EN_CLAIR: Readonly<Record<string, string>> = {
    'restaurant.ferme': 'Fermé aujourd’hui',
    'restaurant.self_ferme': 'Self fermé',
    'restaurant.cafeteria_fermee': 'Cafétéria fermée',
    'restaurant.menu_faux': 'Menu faux ou absent',
    'restaurant.ferme_jusqu': 'Fermé plusieurs jours',
    'restaurant.horaires': 'Horaires corrigés',
    'restaurant.attente': 'Attente',
    'restaurant.places': 'Plus de place assise',
    'restaurant.izly': 'Izly en panne',
    'restaurant.plat': 'Plat recommandé',
    'bibliotheque.fermee': 'Fermée aujourd’hui',
    'bibliotheque.fermeture_partielle': 'Un étage ou une salle fermé',
    'bibliotheque.fermee_jusqu': 'Fermée plusieurs jours',
    'bibliotheque.horaires': 'Horaires du jour corrigés',
    'bibliotheque.ambiance': 'Ambiance',
    'batiment.acces_bloque': 'Accès bloqué',
    'batiment.ferme': 'Fermé aujourd’hui',
    'batiment.chauffage': 'Chauffage en panne',
    'batiment.wifi': 'Wi-Fi en panne',
    'batiment.ferme_jusqu': 'Fermé pour travaux',
};

const VALEURS: Readonly<Record<string, string>> = {
    oui: 'oui', non: 'non', fluide: 'fluide', attente: 'ça attend', tres_long: 'très long', calme: 'calme', papote: 'ça papote',
};

export function libelleDuSujet(sujet: string): string {
    return SUJETS_EN_CLAIR[sujet] ?? sujet;
}

/** Une valeur en clair : une echelle, des horaires relus, un plat tel quel. */
export function libelleDeValeur(sujet: SujetDeLieu | undefined, valeur: string): string {
    if (sujet?.sujet.endsWith('.horaires') === true) {
        const c = lireCorrection(valeur);
        if (c === null) return valeur;
        if (c.source) return 'la source est juste';
        return servicesDe(c).map(([s, creneau]) => `${s} ${creneau === 'ferme' ? 'fermé' : `${formaterMinutes(creneau.debut)}–${formaterMinutes(creneau.fin)}`}`).join(', ');
    }
    return sujet?.valeurs === null ? valeur : (VALEURS[valeur] ?? valeur);
}

/** « Restaurant 2302 », « Bâtiment A28 (bordeaux) » : le lieu par l'identifiant de sa source. */
export function libelleDuLieu(domaine: DomaineDeLieu, cible: string): string {
    if (domaine === 'batiment') {
        const [etablissement, code] = cible.split('/', 2);
        return `${DOMAINES.batiment} ${code ?? cible} (${etablissement ?? ''})`;
    }
    return `${DOMAINES[domaine]} ${cible}`;
}
