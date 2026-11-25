/**
 * Le vocabulaire des signalements (phase 8, lot 2 de la 7.0 ; docs/phase-8/2-signalements.md) : les
 * sujets que l'application propose sur un restaurant, une bibliotheque ou un batiment, leur famille de
 * duree et leurs valeurs. C'est la copie de ce que la migration insere dans `public.sujets`, que la base
 * juge seule ; vocabulaire.test.ts garde les deux egales.
 *
 * Pur, partage avec la console, qui modere ces sujets.
 *
 * **Un sujet a deux valeurs, `oui` et `non`, sauf ceux qui portent leur propre echelle** (l'attente,
 * l'ambiance) ou une forme (les horaires, le plat). `non` est la `normale` : le lieu tel que sa source
 * le dit. Un etat etabli sur la normale ne s'affiche pas, sauf s'il est officiel : c'est la reponse
 * « non » a « toujours vrai ? », qui eteint un signalement sans en creer un autre.
 */

import type { Famille } from './donnees';

export type DomaineDeLieu = 'restaurant' | 'bibliotheque' | 'batiment';

/** Ce qui dure (fermeture, panne, correction), le direct (attente), et le pour le plaisir (plat, ambiance). */
export type Categorie = 'dure' | 'direct' | 'plaisir';

export interface SujetDeLieu {
    readonly sujet: string;
    readonly domaine: DomaineDeLieu;
    readonly famille: Famille;
    readonly categorie: Categorie;
    /** Les valeurs permises, dans l'ordre ou l'ecran les propose ; `null` pour un sujet a forme. */
    readonly valeurs: readonly string[] | null;
    /** La forme d'une valeur lue ailleurs (un plat du menu, des horaires), en expression POSIX de Postgres. */
    readonly forme: string | null;
    /** La valeur qui ne dit rien de plus que la source ; `null` quand toutes disent quelque chose. */
    readonly normale: string | null;
}

/**
 * Un plat du menu du jour, tel que la source le nomme : pas de caractere de controle, cent vingt au
 * plus. L'ecran ne montre un plat recommande que s'il est au menu du jour : un texte forge ne
 * s'affiche jamais (classement.ts).
 */
export const FORME_PLAT = '^[^[:cntrl:]]{1,120}$';

const CRENEAU = '([01][0-9]|2[0-3])[0-5][0-9]-([01][0-9]|2[0-3])[0-5][0-9]';
const SERVICE = `(midi|soir|jour)=(${CRENEAU}|ferme)`;

/**
 * Une correction d'horaires : l'empreinte des horaires de la source qu'elle corrige, puis les bons
 * horaires service par service, ou `source` pour dire que la source est juste (horaires.ts).
 */
export const FORME_HORAIRES = `^[0-9a-f]{8}[|](source|${SERVICE}(,${SERVICE}){0,2})$`;

const OUI_NON = ['oui', 'non'] as const;

function binaire(sujet: string, domaine: DomaineDeLieu, famille: Famille, categorie: Categorie = famille === 'direct' ? 'direct' : 'dure'): SujetDeLieu {
    return { sujet, domaine, famille, categorie, valeurs: OUI_NON, forme: null, normale: 'non' };
}

export const SUJETS: readonly SujetDeLieu[] = [
    binaire('restaurant.ferme', 'restaurant', 'jour'),
    binaire('restaurant.self_ferme', 'restaurant', 'jour'),
    binaire('restaurant.cafeteria_fermee', 'restaurant', 'jour'),
    binaire('restaurant.menu_faux', 'restaurant', 'jour'),
    binaire('restaurant.ferme_jusqu', 'restaurant', 'date'),
    { sujet: 'restaurant.horaires', domaine: 'restaurant', famille: 'correction', categorie: 'dure', valeurs: null, forme: FORME_HORAIRES, normale: null },
    { sujet: 'restaurant.attente', domaine: 'restaurant', famille: 'direct', categorie: 'direct', valeurs: ['fluide', 'attente', 'tres_long'], forme: null, normale: null },
    binaire('restaurant.places', 'restaurant', 'direct'),
    binaire('restaurant.izly', 'restaurant', 'direct'),
    { sujet: 'restaurant.plat', domaine: 'restaurant', famille: 'jour', categorie: 'plaisir', valeurs: null, forme: FORME_PLAT, normale: null },

    binaire('bibliotheque.fermee', 'bibliotheque', 'jour'),
    binaire('bibliotheque.fermeture_partielle', 'bibliotheque', 'jour'),
    binaire('bibliotheque.fermee_jusqu', 'bibliotheque', 'date'),
    { sujet: 'bibliotheque.horaires', domaine: 'bibliotheque', famille: 'correction', categorie: 'dure', valeurs: null, forme: FORME_HORAIRES, normale: null },
    { sujet: 'bibliotheque.ambiance', domaine: 'bibliotheque', famille: 'direct', categorie: 'plaisir', valeurs: ['calme', 'papote'], forme: null, normale: null },

    binaire('batiment.acces_bloque', 'batiment', 'jour'),
    binaire('batiment.ferme', 'batiment', 'jour'),
    binaire('batiment.chauffage', 'batiment', 'jour'),
    binaire('batiment.wifi', 'batiment', 'jour'),
    binaire('batiment.ferme_jusqu', 'batiment', 'date'),
];

const PAR_NOM = new Map(SUJETS.map((s) => [s.sujet, s]));

export function sujetDeLieu(sujet: string): SujetDeLieu | undefined {
    return PAR_NOM.get(sujet);
}

export function sujetsDuDomaine(domaine: DomaineDeLieu): readonly SujetDeLieu[] {
    return SUJETS.filter((s) => s.domaine === domaine);
}

/** Une valeur que ce sujet admet : dans sa liste, ou conforme a sa forme (la base refait ce jugement). */
export function valeurPermise(sujet: SujetDeLieu, valeur: string): boolean {
    if (sujet.valeurs !== null) return sujet.valeurs.includes(valeur);
    return sujet.forme !== null && valeur.length >= 1 && valeur.length <= 120 && new RegExp(versJavaScript(sujet.forme), 'u').test(valeur);
}

/** Les deux formes sont ecrites pour Postgres ; seule la classe POSIX des caracteres de controle differe. */
function versJavaScript(forme: string): string {
    return forme.replace('[^[:cntrl:]]', '[^\\p{Cc}]');
}

/**
 * La cible d'un batiment : `<etablissement>/<code>` (docs/phase-8/1-base-communautaire.md), ou `null`
 * si l'un des deux n'a pas la forme qu'une cible admet. Les autres lieux prennent l'identifiant de leur
 * source tel quel.
 */
export const FORME_CIBLE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$/;

export function cibleDuLieu(domaine: DomaineDeLieu, identifiant: string, etablissement?: string): string | null {
    const cible = domaine === 'batiment' ? `${etablissement ?? ''}/${identifiant}` : identifiant;
    if (domaine === 'batiment' && (etablissement === undefined || etablissement === '' || identifiant === '')) return null;
    return FORME_CIBLE.test(cible) ? cible : null;
}
