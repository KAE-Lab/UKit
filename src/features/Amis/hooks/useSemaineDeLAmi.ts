/**
 * Ce que l'ecran d'un ami montre d'une semaine (docs/phase-8/8-amis.md) : son emploi du temps en
 * lecture, vos creneaux libres en commun, et, aujourd'hui, le trou de midi commun que le lot 6 sait
 * nourrir. Les lectures sont dans `PlanningDesAmis.ts`, le calcul dans les modules purs ; ce hook les
 * assemble et suit l'heure.
 */

import moment from 'moment';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Translator from '../../../shared/i18n/Translator';
import { maintenant } from '../../../shared/services/Temps';
import type { Plage } from '../../Planning/services/carteDuJour';
import { preparerPourAffichage } from '../../Planning/services/filtresUe';
import { formaterHeure } from '../../Planning/services/frise';
import type { TrouDeMidi } from '../../Planning/services/ouManger';
import { lundiDeSemaineIso, type PlanningEvent, type SemaineIso } from '../../Planning/services/PlanningAssembly';
import type { JourDuCache } from '../../Planning/services/agenda';
import { useMinuteDuJour } from '../../Planning/components/Frise';
import type { Ami } from '../services/amis';
import { partDeMidi, premierApres, semaineCommune, type JourCommun } from '../services/creneauxCommuns';
import { creneauxOccupes, dateDuJour, occupeLe } from '../services/instantane';
import { lireMaSemaine, lireSaSemaine, type LectureDeSemaine } from '../services/PlanningDesAmis';

export type EtatDeLecture = 'lecture' | 'pret' | 'sans-emploi-du-temps' | 'echec';

export interface SemaineDeLAmi {
    /** Son emploi du temps, jour par jour, pret pour l'agenda ; un instantane en plages « Occupe ». */
    readonly jours: readonly JourDuCache[];
    readonly son: EtatDeLecture;
    readonly mon: EtatDeLecture;
    /** Les creneaux communs a venir ; vide tant que l'une des deux lectures manque. */
    readonly communs: readonly JourCommun[];
    /** Le trou de midi commun d'aujourd'hui, et le cours apres lui dont le batiment compte. */
    readonly midi: TrouDeMidi<PlanningEvent> | null;
    readonly minute: number | null;
    readonly relire: () => void;
}

function etatDe(lecture: LectureDeSemaine | null): EtatDeLecture {
    if (lecture === null) return 'lecture';
    if (lecture.ok === true) return 'pret';
    return lecture.failure === null ? 'sans-emploi-du-temps' : 'echec';
}

/** Les dates de la semaine, du lundi au dimanche. */
function datesDe(semaine: SemaineIso): string[] {
    const lundi = lundiDeSemaineIso(semaine);
    return Array.from({ length: 7 }, (_, rang) => moment(lundi).add(rang, 'days').format('YYYY-MM-DD'));
}

function coursDe(lecture: LectureDeSemaine | null): PlanningEvent[] {
    return lecture !== null && lecture.ok === true ? lecture.jours.flatMap((jour) => jour.courses ?? []) : [];
}

function coursDuJour(cours: readonly PlanningEvent[], date: string): PlanningEvent[] {
    return cours.filter((c) => typeof c.date?.start === 'string' && dateDuJour(c.date.start) === date);
}

/** Une plage occupee d'un instantane, sous la forme d'un cours : l'agenda la dessine sans rien savoir. */
function plageCommeCours(date: string, plage: Plage): PlanningEvent {
    const debut = formaterHeure(plage.debut);
    const fin = formaterHeure(plage.fin);
    return {
        id: `occupe-${date}-${plage.debut}`,
        style: '',
        color: '',
        schedule: '',
        starttime: debut,
        endtime: fin,
        date: { start: `${date}T${debut}:00`, end: `${date}T${fin}:00` },
        subject: Translator.get('AMI_OCCUPE'),
        description: '',
        category: '',
        group: '',
    };
}

export function useSemaineDeLAmi(ami: Ami | null, semaine: SemaineIso): SemaineDeLAmi {
    const [mienne, setMienne] = useState<LectureDeSemaine | null>(null);
    const [sienne, setSienne] = useState<LectureDeSemaine | null>(null);
    const [revision, setRevision] = useState(0);
    const aujourdhui = dateDuJour(maintenant());
    const minute = useMinuteDuJour(aujourdhui);
    const parGroupes = ami?.contenu.genre === 'groupes';

    useEffect(() => {
        let vivant = true;
        setMienne(null);
        lireMaSemaine(semaine)
            .then((lecture) => { if (vivant) setMienne(lecture); })
            .catch((erreur) => {
                console.warn('[amis] lecture de sa semaine en erreur', erreur);
                if (vivant) setMienne({ ok: false, failure: null });
            });
        return () => { vivant = false; };
    }, [semaine.week, semaine.year, revision]);

    useEffect(() => {
        let vivant = true;
        setSienne(null);
        if (ami === null || !parGroupes) return undefined;
        lireSaSemaine(ami, semaine)
            .then((lecture) => { if (vivant) setSienne(lecture); })
            .catch((erreur) => {
                console.warn('[amis] lecture de la semaine d un ami en erreur', erreur);
                if (vivant) setSienne({ ok: false, failure: null });
            });
        return () => { vivant = false; };
    }, [ami, parGroupes, semaine.week, semaine.year, revision]);

    const dates = useMemo(() => datesDe(semaine), [semaine.week, semaine.year]);

    // Les plages de chacun, date par date ; `null` pour un jour inconnu.
    const plages = useMemo(() => {
        const lundi = dates[0];
        const mes = mienne !== null && mienne.ok === true ? creneauxOccupes(coursDe(mienne), lundi) : null;
        let ses: (date: string) => Plage[] | null = () => null;
        if (ami?.contenu.genre === 'instantane') {
            const { premierJour, creneaux } = ami.contenu;
            ses = (date) => occupeLe(premierJour, creneaux, date);
        } else if (sienne !== null && sienne.ok === true) {
            const occupes = creneauxOccupes(coursDe(sienne), lundi);
            ses = (date) => occupeLe(lundi, occupes, date);
        }
        return dates.map((date) => ({ date, miens: mes === null ? null : occupeLe(lundi, mes, date), siens: ses(date) }));
    }, [ami, dates, mienne, sienne]);

    const communs = useMemo(() => semaineCommune(plages, aujourdhui, minute ?? 0), [plages, aujourdhui, minute]);

    const jours = useMemo<JourDuCache[]>(() => {
        if (ami?.contenu.genre === 'instantane') {
            return plages
                .filter((jour) => jour.siens !== null)
                .map((jour) => ({ date: jour.date, courses: (jour.siens ?? []).map((plage) => plageCommeCours(jour.date, plage)) }));
        }
        if (sienne === null || sienne.ok === false) return [];
        const cours = preparerPourAffichage(coursDe(sienne), false, []);
        return dates.map((date) => ({ date, courses: coursDuJour(cours, date) }));
    }, [ami, dates, plages, sienne]);

    // Midi, aujourd'hui seulement : les menus et les signalements sont ceux du jour (lot 6).
    const midi = useMemo<TrouDeMidi<PlanningEvent> | null>(() => {
        const duJour = communs.find((jour) => jour.date === aujourdhui);
        for (const creneau of duJour?.creneaux ?? []) {
            const fenetre = partDeMidi(creneau);
            if (fenetre === null) continue;
            const miens = coursDuJour(coursDe(mienne), aujourdhui);
            const siens = parGroupes ? coursDuJour(coursDe(sienne), aujourdhui) : [];
            return { fenetre, coursSuivant: premierApres(miens, creneau.fin) ?? premierApres(siens, creneau.fin) };
        }
        return null;
    }, [communs, aujourdhui, mienne, sienne, parGroupes]);

    const relire = useCallback(() => setRevision((r) => r + 1), []);
    const son: EtatDeLecture = ami?.contenu.genre === 'instantane' ? 'pret' : etatDe(sienne);
    return { jours, son, mon: etatDe(mienne), communs, midi, minute, relire };
}

/** Les deux semaines que l'ecran propose : celle d'aujourd'hui et la suivante, comme l'instantane. */
export function semainesProposees(instant: Date): readonly SemaineIso[] {
    const jour = moment(instant);
    const suivante = moment(instant).add(7, 'days');
    return [
        { week: jour.isoWeek(), year: jour.isoWeekYear() },
        { week: suivante.isoWeek(), year: suivante.isoWeekYear() },
    ];
}
