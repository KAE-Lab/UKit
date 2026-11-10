/**
 * L'annee scolaire des favoris, lue une fois et partagee.
 *
 * Trois lecteurs la demandent sans rapport l'un avec l'autre : la proposition d'UE du dossier, qui
 * compare les inscriptions a tout ce que le groupe porte, le Planning, qui regarde autour d'une
 * journee vide si le groupe n'est pas eteint (`groupeInactif`), et la fiche d'un cours, qui compte
 * les seances restantes (`seancesRestantes`). Les jouer chacun a part aurait sollicite la source
 * plusieurs fois pour la meme reponse. C'est la requete de la synchronisation de l'agenda, qui la joue
 * de son cote, sans ce partage : elle veut une reponse fraiche.
 *
 * Gardee six heures par etablissement et jeu de favoris, en memoire seulement : un echec n'est pas
 * garde, la demande suivante rejoue. L'horloge est la vraie, comme tout horodatage de cache.
 *
 * Voir docs/features/planning.md.
 */

import { getCodeEtablissementActif } from '../../../shared/etablissements';
import { PlanningApiService, type PlanningRunOptions, type PlanningSyncResult } from './PlanningApiService';

const DUREE_MS = 6 * 60 * 60 * 1000;

const lectures = new Map<string, { readonly quand: number; readonly reponse: Promise<PlanningSyncResult> }>();

export function lireAnneeDesFavoris(favoris: readonly string[], options: PlanningRunOptions = {}): Promise<PlanningSyncResult> {
    const cle = `${getCodeEtablissementActif()}|${favoris.join('+')}`;
    const connue = lectures.get(cle);
    if (connue !== undefined && Date.now() - connue.quand < DUREE_MS) return connue.reponse;

    const reponse = PlanningApiService.fetchCalendarForSynchronization([...favoris], options).then((resultat) => {
        if (resultat.ok === false) lectures.delete(cle);
        return resultat;
    }, (erreur: unknown) => {
        lectures.delete(cle);
        throw erreur;
    });
    lectures.set(cle, { quand: Date.now(), reponse });
    return reponse;
}
