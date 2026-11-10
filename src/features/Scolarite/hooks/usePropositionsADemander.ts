/**
 * Ce que la modale des propositions doit demander, maintenant : la decision, relue a chaque fois que
 * le planning, les filtres, les favoris ou l'annee des favoris bougent.
 *
 * Sorti de `PropositionsModal` quand la modale a gagne le choix UE par UE : l'ecran affiche et
 * applique, ce hook decide quand. Voir docs/features/scolarite.md.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { SettingsManager } from '../../../shared/services/AppCore';
import { tracerPropositions } from '../../../shared/services/PropositionsTrace';
import { edtPersonnelActif } from '../../../shared/etablissements';
import { PlanningDataManager as DataManager } from '../../Planning/services/PlanningDataManager';
import type { PlanningSyncResult } from '../../Planning/services/PlanningApiService';
import { lireAnneeDesFavoris } from '../../Planning/services/anneeDesFavoris';
import { indexerUes, sujetsDesCours } from '../../Planning/services/PlanningAssembly';
import { decider, type Decision } from '../services/PropositionsDecision';
import type { PropositionsDossier } from '../services/PropositionsDossier';
import { uesAComparer, type AnneeDesFavoris } from '../services/PropositionsChoix';

/**
 * L'etat que la decision consulte, relu a chaque fois plutot que memorise, ou `null` tant que
 * l'annee des favoris est en cours de lecture.
 */
function etatCourant(annee: AnneeDesFavoris) {
    const personnel = edtPersonnelActif();
    const uesDuPlanning = uesAComparer(annee, DataManager.getAvailableUEs());
    if (uesDuPlanning === null) return null;
    return {
        uesDuPlanning,
        filtresActuels: SettingsManager.getFilters(),
        favoris: SettingsManager.getFavoriteGroups(),
        ressourceEnregistree: personnel === null ? null : personnel.ressource,
    };
}

/**
 * Ce qui peut rendre la question complete, ou la rendre sans objet.
 *
 * Un compteur plutot qu'une copie de l'etat : ces trois valeurs sont lues au moment de decider, et
 * les recopier dans un `useState` creerait un second endroit ou elles peuvent diverger.
 */
function useRevision(): number {
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        const rafraichir = () => setRevision((precedente) => precedente + 1);
        DataManager.on('availableUEs', rafraichir);
        SettingsManager.on('filter', rafraichir);
        SettingsManager.on('favoriteGroups', rafraichir);
        return () => {
            DataManager.unsubscribe('availableUEs', rafraichir);
            SettingsManager.unsubscribe('filter', rafraichir);
            SettingsManager.unsubscribe('favoriteGroups', rafraichir);
        };
    }, []);

    return revision;
}

/**
 * Les UE de **toute l'annee** des favoris, demandees quand une proposition attend.
 *
 * Sans ca, la proposition est **partielle par construction** : la liste des UE rencontrees ne se
 * remplit qu'a mesure qu'on affiche des journees, si bien qu'on proposerait de masquer une UE
 * etrangere aujourd'hui et une autre la semaine prochaine. Masquer un tiers de ce qu'il fallait est
 * pire que ne rien masquer — l'etudiant croit le menage fait. Et elle est **fausse** : la liste
 * accumulee porte aussi les UE des groupes consultes en passant (`uesAComparer`).
 *
 * Le run existe deja et sert la synchronisation calendrier : il rend l'annee scolaire entiere du
 * groupe, et `lireAnneeDesFavoris` le partage avec le Planning. Il part **une fois par jeu de
 * favoris**, seulement s'il y a une proposition d'UE en attente ; son resultat sert la
 * comparaison, et entre aussi par la porte ordinaire (`extractUEsFromCourses`) pour les intitules et
 * les suggestions des reglages. Un echec se trace et retombe sur ce que l'ecran a deja charge.
 */
function useUesDeLAnnee(propositions: PropositionsDossier | null, revision: number): AnneeDesFavoris {
    const [annee, setAnnee] = useState<AnneeDesFavoris>({ etat: 'sans-objet' });
    const demandee = useRef<string | null>(null);

    useEffect(() => {
        if (propositions === null || propositions.ues.length === 0) return;

        const favoris = SettingsManager.getFavoriteGroups();
        // Aucun favori : rien a demander — le groupe se choisit souvent **apres** la connexion.
        if (favoris.length === 0) return;
        const cle = favoris.join('\n');
        if (demandee.current === cle) return;
        demandee.current = cle;

        setAnnee({ etat: 'en-cours' });
        const reponse = (resultat: PlanningSyncResult) => {
            // Un jeu de favoris a remplace celui-ci pendant la lecture : sa reponse ne vaut plus.
            if (demandee.current !== cle) return;
            if (resultat.ok === false) {
                console.warn(`[propositions] annee des favoris illisible : ${resultat.failure.kind}`);
                setAnnee({ etat: 'echec' });
                return;
            }
            DataManager.extractUEsFromCourses(resultat.courses);
            setAnnee({ etat: 'lue', ues: indexerUes(sujetsDesCours(resultat.courses)).map((ue) => ue.code) });
        };
        lireAnneeDesFavoris(favoris).then(reponse, (erreur: unknown) => {
            console.warn('[propositions] annee des favoris en erreur', erreur);
            if (demandee.current === cle) setAnnee({ etat: 'echec' });
        });
        // `revision` remet l'effet en jeu quand les favoris changent : le groupe se choisit souvent
        // apres la connexion, et sans ca la demande n'aurait jamais lieu pour un premier login.
    }, [propositions, revision]);

    return annee;
}

/** La decision du moment, tracee a chaque calcul pour le panneau Dossier du menu de developpement. */
export function usePropositionsADemander(propositions: PropositionsDossier | null): Decision {
    const revision = useRevision();
    const annee = useUesDeLAnnee(propositions, revision);

    return useMemo(
        () => {
            if (propositions === null) return { kind: 'rien' as const };
            const etat = etatCourant(annee);
            if (etat === null) return { kind: 'attendre' as const };
            const prise = decider(propositions, etat);
            // Tracee a **chaque** calcul, y compris quand il n'y a rien a demander : sans ca, « aucun
            // dialogue » ne dit pas s'il n'y avait rien a proposer ou si la lecture avait echoue.
            tracerPropositions({
                heure: new Date().toLocaleTimeString(),
                uesInscrites: propositions.ues,
                edtLu: propositions.edt === null ? null : `${propositions.edt.libelle} (${propositions.edt.ressource})`,
                uesDuPlanning: etat.uesDuPlanning.length,
                filtres: etat.filtresActuels.length,
                decision: prise.kind,
                complement: prise.kind === 'demander' ? prise.proposition.ues : [],
                edtRetenu: prise.kind === 'demander' && prise.proposition.edt !== null
                    ? `${prise.proposition.edt.libelle} (${prise.proposition.edt.ressource})`
                    : null,
            });
            // La meme ligne que la lecture, du cote de la decision : ensemble, les deux racontent toute
            // l'histoire dans le terminal, sans avoir a ouvrir le panneau de sonde.
            console.log(
                `[propositions] decision : ${prise.kind} — ${etat.uesDuPlanning.length} UE au planning (${annee.etat}), ` +
                `${propositions.ues.length} inscrite(s), ${prise.kind === 'demander' ? prise.proposition.ues.length : 0} proposee(s)`,
            );
            return prise;
        },
        // `revision` n'est pas lue dans le corps : elle est ce qui redemande la decision quand le
        // planning, les filtres ou les favoris ont bouge.
        [propositions, revision, annee],
    );
}
