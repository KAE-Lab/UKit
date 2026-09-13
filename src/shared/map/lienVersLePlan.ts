/**
 * Le lien vers l'application de plans du systeme, pour un point ou pour une adresse.
 *
 * Un seul endroit connait la forme de l'URL. La carte des cours l'ouvrait sur des coordonnees ; la
 * fiche d'un rendez-vous du telephone l'ouvre sur un lieu en texte libre (6.2.x) — `search/?api=1`
 * accepte les deux, et le systeme confie le lien a l'application de plans installee, sur les deux
 * plateformes. Un lieu libre n'a pas de coordonnees : pas de carte integree, et pas de geocodage —
 * ce serait un appel reseau tiers pour un rendez-vous personnel.
 *
 * Pur, sans dependance de plateforme : jouable sous vitest.
 */

import { URL } from '../constants/urls';

export type CibleDuPlan =
    | { readonly lat: number; readonly lng: number }
    | { readonly adresse: string };

export function lienVersLePlan(cible: CibleDuPlan): string {
    const requete = 'adresse' in cible
        ? encodeURIComponent(cible.adresse.trim())
        : `${cible.lat},${cible.lng}`;
    return `${URL.MAP}search/?api=1&query=${requete}`;
}
