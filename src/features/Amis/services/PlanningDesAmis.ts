/**
 * Ce que l'ecran d'un ami et celui du partage lisent (docs/phase-8/8-amis.md) : la semaine de
 * l'etudiant, celle de l'ami, et le partage a ecrire. Les lectures passent par `PlanningApiService`
 * et les Blueprints de toujours ; le calcul est dans les modules purs.
 *
 * **Ce qui se partage depend de la source, pas d'un choix** :
 *
 *   - des groupes d'une source publique (Celcat, le referentiel iCalendar) partent par leurs codes —
 *     l'ami relit le meme emploi du temps public, a jour, intitules compris ;
 *   - un emploi du temps personnel (un abonnement, le groupe personnel de l'INP) part en instantane :
 *     ses creneaux occupes de quatorze jours, sans intitule. Le lien d'abonnement et l'identifiant
 *     personnel ne quittent jamais le telephone.
 *
 * Les calendriers du telephone et les evenements du campus n'y entrent jamais : `fetchCalendarWeek`
 * ne lit que la source, et la fusion avec le telephone se fait plus loin, dans le Planning.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

import {
    getCodeEtablissementActif,
    getEtablissementActif,
    groupeInconnu,
    groupesRequis,
    sourceEdt,
    sourcePubliqueDe,
} from '../../../shared/etablissements';
import type { UkitFailure } from '../../../shared/aetherius';
import { isConnected, SettingsManager } from '../../../shared/services/AppCore';
import { maintenant } from '../../../shared/services/Temps';
import { coursASynchroniser } from '../../Planning/services/filtresUe';
import { PlanningApiService, type PlanningEvent, type PlanningWeekDay } from '../../Planning/services/PlanningApiService';
import { semaineIsoDe, type SemaineIso } from '../../Planning/services/PlanningAssembly';
import type { Ami } from './amis';
import { creneauxOccupes, dateDuJour, JOURS_DE_L_INSTANTANE } from './instantane';
import type { ContenuPartage } from './lienAmi';
import { partageParGroupes } from './partage';

export type LectureDeSemaine =
    | { readonly ok: true; readonly jours: readonly PlanningWeekDay[]; readonly enCache: boolean }
    | { readonly ok: false; readonly failure: UkitFailure | null };

/** La cle du cache de la vue semaine des favoris (ScheduleList.cacheId) : le repli hors ligne. */
function cleDeCache(favoris: readonly string[], semaine: SemaineIso): string {
    return `${favoris.join('+')}@Week${semaine.year}-${semaine.week}`;
}

async function depuisLeCache(cle: string): Promise<PlanningWeekDay[] | null> {
    try {
        const brut = await AsyncStorage.getItem(cle);
        const cache = brut === null ? null : JSON.parse(brut);
        return Array.isArray(cache?.data) ? cache.data as PlanningWeekDay[] : null;
    } catch {
        return null;
    }
}

/** Les cours d'une semaine, sans ce qu'un filtre d'UE masque. */
function filtrer(jours: readonly PlanningWeekDay[], filtres: readonly string[]): PlanningWeekDay[] {
    return jours.map((jour) => ({ ...jour, courses: coursASynchroniser(jour.courses ?? [], filtres) }));
}

/**
 * La semaine de ses favoris, filtres d'UE appliques : le reseau, puis le cache de la vue semaine du
 * Planning en repli. `failure: null` quand il n'y a pas d'emploi du temps a lire (aucun favori, un
 * lien attendu) : ce n'est pas une panne.
 */
export async function lireMaSemaine(semaine: SemaineIso): Promise<LectureDeSemaine> {
    const favoris = SettingsManager.getFavoriteGroups();
    const filtres = SettingsManager.getFilters();
    const kind = sourceEdt().kind;
    if (kind === 'aucun' || kind === 'lien-attendu' || (groupesRequis() && favoris.length === 0)) return { ok: false, failure: null };
    const cle = cleDeCache(favoris, semaine);
    if ((await isConnected()) !== false) {
        const resultat = await PlanningApiService.fetchCalendarWeek(favoris, semaine, { origine: 'automatique' });
        if (resultat.ok === true) return { ok: true, jours: filtrer(resultat.week, filtres), enCache: false };
        const cache = await depuisLeCache(cle);
        return cache === null ? { ok: false, failure: resultat.failure } : { ok: true, jours: filtrer(cache, filtres), enCache: true };
    }
    const cache = await depuisLeCache(cle);
    return cache === null ? { ok: false, failure: null } : { ok: true, jours: filtrer(cache, filtres), enCache: true };
}

/** La semaine d'un ami par ses groupes publics, ses filtres appliques. Rien en cache : retirer efface tout. */
export async function lireSaSemaine(ami: Ami, semaine: SemaineIso): Promise<LectureDeSemaine> {
    if (ami.contenu.genre !== 'groupes') return { ok: false, failure: null };
    const resultat = await PlanningApiService.fetchSemainePublique(ami.etablissement, ami.contenu.groupes, semaine, { origine: 'automatique' });
    if (resultat.ok === false) return { ok: false, failure: resultat.failure };
    // Un groupe que le referentiel ne resout plus laisserait ses heures passer pour libres : la semaine
    // de l'ami n'est pas connue, pas a moitie (relecture du lot).
    if ((resultat.manquants ?? []).length > 0) return { ok: false, failure: groupeInconnu(resultat.manquants.join(', ')) };
    return { ok: true, jours: filtrer(resultat.week, ami.contenu.filtres), enCache: false };
}

export type PreparationDuPartage =
    | { readonly ok: true; readonly etablissement: string; readonly contenu: ContenuPartage }
    | { readonly ok: false; readonly raison: 'rien-a-partager' | 'lecture' };

/**
 * Le partage de son emploi du temps, pret a mettre dans un lien. Un instantane lit les semaines qui
 * couvrent ses quatorze jours, aujourd'hui compris ; une seule semaine illisible le fait echouer, plutot
 * que de partir avec un trou que l'ami lirait libre.
 */
export async function preparerLePartage(): Promise<PreparationDuPartage> {
    const etablissement = getCodeEtablissementActif();
    const favoris = SettingsManager.getFavoriteGroups();
    const source = sourceEdt();
    if (source.kind === 'aucun' || source.kind === 'lien-attendu') return { ok: false, raison: 'rien-a-partager' };
    if (groupesRequis() && favoris.length === 0) return { ok: false, raison: 'rien-a-partager' };
    const publique = sourcePubliqueDe(getEtablissementActif());
    const parGroupes = partageParGroupes({
        source: source.kind,
        etablissement,
        favoris,
        filtres: SettingsManager.getFilters(),
        groupesPublics: publique?.kind === 'ical' ? publique.config.groupes.map((groupe) => groupe.nom) : null,
    });
    if (parGroupes !== null) return { ok: true, etablissement, contenu: parGroupes };

    const premierJour = dateDuJour(maintenant());
    const semaines: SemaineIso[] = [];
    for (let jour = 0; jour < JOURS_DE_L_INSTANTANE; jour += 7) semaines.push(semaineIsoDe(moment(premierJour).add(jour, 'days')));
    const derniere = semaineIsoDe(moment(premierJour).add(JOURS_DE_L_INSTANTANE - 1, 'days'));
    if (!semaines.some((s) => s.week === derniere.week && s.year === derniere.year)) semaines.push(derniere);

    const cours: PlanningEvent[] = [];
    for (const semaine of semaines) {
        const lecture = await lireMaSemaine(semaine);
        if (lecture.ok === false) return { ok: false, raison: 'lecture' };
        for (const jour of lecture.jours) cours.push(...(jour.courses ?? []));
    }
    return { ok: true, etablissement, contenu: { genre: 'instantane', premierJour, creneaux: creneauxOccupes(cours, premierJour) } };
}
