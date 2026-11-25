/**
 * Les mots de « Sur place », dans la langue choisie : une valeur, son anciennete, d'ou elle vient. Le
 * calcul est dans presentation.ts ; ici, seulement la traduction et les formats.
 */

import moment from 'moment';

import { formaterMinutes, lireCorrection, servicesDe, type ServiceHoraire } from '../../../shared/communaute/horaires';
import type { SujetDeLieu } from '../../../shared/communaute/vocabulaire';
import Translator from '../../../shared/i18n/Translator';
import { cleDeValeur, cleDOption } from './cles';
import type { LigneSurPlace } from './presentation';

type Cle = Parameters<typeof Translator.get>[0];

/** Une cle calculee (cles.ts), verifiee par cles.test.ts : le seul transtypage legitime (docs/i18n.md). */
function dire(cle: string, ...args: (string | number)[]): string {
    return Translator.get(cle as Cle, ...args.map(String));
}

const MINUTE = 60_000;

/** « il y a 20 min », « il y a 2 h », « a l'instant ». */
export function ilYA(depuis: number, maintenant: number): string {
    const minutes = Math.max(0, Math.floor((maintenant - depuis) / MINUTE));
    if (minutes < 1) return Translator.get('SIGNAL_A_L_INSTANT');
    if (minutes < 60) return Translator.get('SIGNAL_IL_Y_A_MIN', String(minutes));
    return Translator.get('SIGNAL_IL_Y_A_H', String(Math.floor(minutes / 60)));
}

/** « 40 min », « 2 h » : depuis quand on ne sait plus rien. */
export function duree(depuis: number, maintenant: number): string {
    const minutes = Math.max(1, Math.floor((maintenant - depuis) / MINUTE));
    return minutes < 60 ? Translator.get('SIGNAL_DUREE_MIN', String(minutes)) : Translator.get('SIGNAL_DUREE_H', String(Math.floor(minutes / 60)));
}

/** « 28 novembre » : le jour d'une fin, dans la langue de l'application (moment suit Translator). */
export function jourDeFin(fin: string): string {
    return moment(fin, 'YYYY-MM-DD').format('D MMMM');
}

const SERVICES: Readonly<Record<ServiceHoraire, Cle>> = { midi: 'LUNCH', soir: 'DINNER', jour: 'TODAY' };

export function nomDuService(service: ServiceHoraire): string {
    return Translator.get(SERVICES[service]);
}

/** « Midi : 11:30–13:45, Soir : fermé » ; vide pour ce qui ne se relit pas. */
export function detailDeCorrection(valeur: string): string {
    const correction = lireCorrection(valeur);
    if (correction === null) return '';
    const separateur = Translator.get('TIME_SEPARATOR');
    return servicesDe(correction).map(([service, c]) => Translator.get(
        'SIGNAL_CRENEAU',
        nomDuService(service),
        c === 'ferme' ? Translator.get('SIGNAL_SERVICE_FERME').toLowerCase() : `${formaterMinutes(c.debut, separateur)}–${formaterMinutes(c.fin, separateur)}`,
    )).join(', ');
}

/** Ce qu'une valeur dit, a l'ecran. */
export function libelleDeValeur(sujet: SujetDeLieu, valeur: string, fin: string | null = null): string {
    if (sujet.sujet.endsWith('.horaires')) return Translator.get('SIGNAL_HORAIRES_CORRIGES');
    if (sujet.valeurs === null) return valeur;
    return dire(cleDeValeur(sujet, valeur), fin === null ? '' : jourDeFin(fin));
}

export function libelleDOption(sujet: SujetDeLieu): string {
    return dire(cleDOption(sujet));
}

/** La ligne sous la valeur : d'ou elle vient et depuis quand. */
export function sousTitre(ligne: LigneSurPlace, maintenant: number): string {
    const quand = ilYA(ligne.depuis, maintenant);
    if (ligne.source === 'officiel') {
        if (ligne.contraires === 1) return Translator.get('SIGNAL_OFFICIEL_CONTRAIRE_UN');
        if (ligne.contraires > 1) return Translator.get('SIGNAL_OFFICIEL_CONTRAIRES', String(ligne.contraires));
        return Translator.get('SIGNAL_OFFICIEL', quand);
    }
    if (ligne.source === 'non_verifie') return Translator.get('SIGNAL_NON_VERIFIE', quand);
    if (ligne.incertain) return Translator.get('SIGNAL_INCERTAIN', quand);
    return ligne.voix <= 1 ? Translator.get('SIGNAL_SELON_UN', quand) : Translator.get('SIGNAL_SELON', String(ligne.voix), quand);
}
