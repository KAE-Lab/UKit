/**
 * La section « Sur place » d'une fiche, sa logique (docs/phase-8/2-signalements.md) : lire ce qu'on sait
 * du lieu — les signalements du jour et les etats officiels —, le tenir a l'heure, et envoyer ce que
 * l'etudiant signale, le rappel des regles a la premiere fois. L'ecran compose ; rien ici ne dessine.
 *
 * La lecture part a l'ouverture de la fiche et apres chaque envoi, jamais en boucle : le reseau est
 * compte (7-A). L'horloge, elle, avance chaque demi-minute, pour que « il y a 20 min » reste vrai.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    classement, envoyerUneContribution, lireLeLieu, lireLesEtatsOfficiels, lireLesSignalementsDuJour,
    type Contribution, type EtatDuSujet, type EtatOfficiel, type PlatClasse, type ResultatDeContribution, type Signalement,
} from '../../../shared/communaute';
import { sujetDeLieu, type DomaineDeLieu } from '../../../shared/communaute/vocabulaire';
import Translator from '../../../shared/i18n/Translator';
import { maintenant, maintenantMs } from '../../../shared/services/Temps';
import { ErrorAlert } from '../../../shared/ui/Alerts';
import { lignesSurPlace, type LigneSurPlace } from './presentation';
import { reglesDejaRappelees, retenirLeRappel } from './rappelDesRegles';
import { noterUneQuestionDAvis } from '../../../shared/notation';

const TIC_MS = 30_000;

export interface ParametresSurPlace {
    readonly domaine: DomaineDeLieu;
    /** La cible du lieu (`cibleDuLieu`) ; `null` quand elle ne se forme pas : la section ne se montre pas. */
    readonly cible: string | null;
    /** L'empreinte des horaires que la fiche affiche : sans elle, aucune correction ne se montre ni ne s'offre. */
    readonly empreinteDesHoraires: string | null;
    /** Les plats du menu du jour, tels que `nomDePlat` les ecrit : le classement s'y borne. */
    readonly platsDuJour?: ReadonlySet<string> | null;
}

export interface SurPlace {
    /** La premiere lecture a repondu (base ou cache) : avant, la section garde sa forme sans rien affirmer. */
    readonly lu: boolean;
    readonly instant: number;
    readonly etats: readonly EtatDuSujet[];
    readonly lignes: readonly LigneSurPlace[];
    /** Le plat le plus recommande aujourd'hui, s'il est au menu. */
    readonly plat: PlatClasse | null;
    readonly envoiEnCours: boolean;
    /** Une contribution attend le rappel des regles : l'ecran le montre, puis `confirmerLesRegles`. */
    readonly reglesARappeler: boolean;
    /**
     * `regles` : rien n'est parti, le rappel est a montrer d'abord. `envoyee` : l'envoi est parti, sans
     * l'attendre — la feuille se ferme aussitot, et le toast du resultat ne se dessine pas sous elle.
     */
    contribuer(sujet: string, valeur: string, fin?: string | null): Promise<'envoyee' | 'regles' | 'impossible'>;
    confirmerLesRegles(): Promise<void>;
    renoncer(): void;
}

/** Ce que l'etudiant lit apres un envoi : un mot, dans un toast, jamais un dialogue a confirmer (theme.md). */
function annoncer(resultat: ResultatDeContribution): void {
    let cle: Parameters<typeof Translator.get>[0];
    if (resultat.etat === 'acceptee') cle = resultat.poids > 0 ? 'SIGNAL_MERCI' : 'SIGNAL_EN_RETRAIT';
    else if (resultat.etat === 'refusee' && resultat.raison.startsWith('plafond_')) cle = 'SIGNAL_LIMITE';
    else if (resultat.etat === 'refusee' && resultat.raison === 'appareil_bloque') cle = 'SIGNAL_BLOQUE';
    else if (resultat.etat === 'refusee') cle = 'SIGNAL_REFUSE';
    else cle = 'SIGNAL_ECHEC';
    // Le non verifie a une phrase de plus a lire : il reste le temps de la lire.
    new ErrorAlert(Translator.get(cle), cle === 'SIGNAL_EN_RETRAIT' ? ErrorAlert.durations.LONG : ErrorAlert.durations.SHORT).show();
}

export function useSurPlace({ domaine, cible, empreinteDesHoraires, platsDuJour = null }: ParametresSurPlace): SurPlace {
    const [signalements, setSignalements] = useState<readonly Signalement[]>([]);
    const [officiels, setOfficiels] = useState<readonly EtatOfficiel[]>([]);
    const [lu, setLu] = useState(false);
    const [instant, setInstant] = useState(maintenantMs);
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [enAttente, setEnAttente] = useState<Contribution | null>(null);
    const monte = useRef(true);

    const relire = useCallback(async () => {
        const [jour, officiel] = await Promise.all([lireLesSignalementsDuJour(maintenant()), lireLesEtatsOfficiels(maintenantMs())]);
        if (!monte.current) return;
        setSignalements(jour.signalements);
        setOfficiels(officiel.officiels);
        setInstant(maintenantMs());
        setLu(true);
    }, []);

    useEffect(() => {
        monte.current = true;
        if (cible !== null) void relire();
        const tic = setInterval(() => setInstant(maintenantMs()), TIC_MS);
        return () => {
            monte.current = false;
            clearInterval(tic);
        };
    }, [cible, relire]);

    const etats = useMemo(
        () => (cible === null ? [] : lireLeLieu(signalements, officiels, domaine, cible, instant, { empreinteDesHoraires })),
        [signalements, officiels, domaine, cible, instant, empreinteDesHoraires],
    );
    const lignes = useMemo(() => lignesSurPlace(etats, { maintenant: instant, empreinteDesHoraires }), [etats, instant, empreinteDesHoraires]);
    const plat = useMemo(() => {
        const sujet = sujetDeLieu('restaurant.plat');
        if (domaine !== 'restaurant' || cible === null || sujet === undefined || platsDuJour === null || platsDuJour.size === 0) return null;
        return classement(signalements, sujet, cible, instant, platsDuJour)[0] ?? null;
    }, [domaine, cible, signalements, instant, platsDuJour]);

    const envoyer = useCallback(async (contribution: Contribution) => {
        // Une reponse a « Sur place » suit une question : la fiche de notation ne se proposera pas ce jour-la (lot 4).
        noterUneQuestionDAvis();
        setEnvoiEnCours(true);
        const resultat = await envoyerUneContribution(contribution);
        annoncer(resultat);
        if (resultat.etat === 'acceptee') await relire();
        if (monte.current) setEnvoiEnCours(false);
    }, [relire]);

    const contribuer = useCallback(async (sujet: string, valeur: string, fin: string | null = null) => {
        if (cible === null || envoiEnCours) return 'impossible' as const;
        const contribution: Contribution = { sujet, cible, valeur, fin };
        if (!(await reglesDejaRappelees())) {
            setEnAttente(contribution);
            return 'regles' as const;
        }
        void envoyer(contribution);
        return 'envoyee' as const;
    }, [cible, envoiEnCours, envoyer]);

    const confirmerLesRegles = useCallback(async () => {
        const contribution = enAttente;
        setEnAttente(null);
        await retenirLeRappel();
        if (contribution !== null) void envoyer(contribution);
    }, [enAttente, envoyer]);

    const renoncer = useCallback(() => setEnAttente(null), []);

    return { lu, instant, etats, lignes, plat, envoiEnCours, reglesARappeler: enAttente !== null, contribuer, confirmerLesRegles, renoncer };
}
