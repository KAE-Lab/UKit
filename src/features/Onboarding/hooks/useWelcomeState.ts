/**
 * L'etat du parcours d'accueil : ce qu'il retient, ce a quoi il s'abonne, et les cinq gestes qu'il
 * expose.
 *
 * Extrait de `WelcomeScreen.tsx` au jalon 6-G, quand l'etape d'etablissement a pousse l'ecran
 * au-dela de la limite de lignes. La coupure n'est pas arbitraire : ce fichier porte **ce qui
 * change**, l'ecran porte **ce qui s'affiche**.
 *
 * Les valeurs par defaut viennent de l'appareil (langue, theme systeme) et chaque choix s'applique
 * immediatement — il n'y a donc rien a valider a la fin, seul `firstload` reste a basculer.
 *
 * Voir docs/features/onboarding.md.
 */

import { useContext, useEffect, useState } from 'react';

import { AppContext, SettingsManager, languageFromDevice } from '../../../shared/services/AppCore';
import {
    attendrePremierRafraichissement,
    getCodeEtablissementActif,
    listeEtablissements,
    premierRafraichissementRepondu,
    sourceEdt,
    type Etablissement,
} from '../../../shared/etablissements';
import { basculerEtablissement } from '../../../shared/etablissements/bascule';

/**
 * Ce que l'etape d'etablissement attend, au plus, avant d'afficher la liste qu'elle connait.
 *
 * Le socle est complet a la date de la release, donc la liste connue n'est pas fausse — seulement
 * peut-etre en retard d'un etablissement publie depuis. Quatre secondes suffisent a une base qui
 * repond, et une base muette ne doit pas retenir un premier lancement plus longtemps.
 */
const PLAFOND_CATALOGUE_MS = 4000;
import { PlanningDataManager as DataManager, type EtatListeGroupes } from '../../Planning/services/PlanningDataManager';

/**
 * Les fragments d'identifiant de groupe par annee et par semestre.
 *
 * **C'est une convention de nommage de Celcat Bordeaux, et de rien d'autre.** Elle existe parce que ce
 * serveur publie plusieurs centaines de groupes et qu'il faut bien les reduire ; elle n'a aucun sens
 * ailleurs. Depuis le jalon 6-I, Bordeaux INP a lui aussi un emploi du temps, et ses treize groupes
 * s'appellent `ENSC 2A GR1` : aucune pastille ne les atteint, et l'etape restait vide sauf en
 * choisissant « AUTRE ». C'est pourquoi les pastilles ne s'affichent plus que pour la source qui les
 * justifie (`filtrageParAnnee`) — le probleme n'etait pas la table, c'etait de la croire generale.
 */
const FILTRE_SAISON: Record<string, Record<string, string[]>> = {
    autumn: {
        L1: ['10', 'MIASHS1'], L2: ['30', 'MIASHS3'], L3: ['50', 'MIASHS5'],
        M1: ['M1', '70'], M2: ['M2', '90'], AUTRE: [''],
    },
    spring: {
        L1: ['20', 'MIASHS2'], L2: ['40', 'MIASHS4'], L3: ['60', 'MIASHS6'],
        M1: ['M1', '80'], M2: ['M2', '000', '001', '002', '003', '004'], AUTRE: [''],
    },
};

export interface OptionListee {
    readonly id: string;
    readonly title: string;
    readonly suffix?: string;
}

export interface WelcomeState {
    readonly language: string;
    readonly theme: string;
    readonly etablissement: string;
    readonly etablissements: readonly Etablissement[];
    /** Le premier rafraichissement du catalogue n'a pas encore repondu : la liste peut etre en retard. */
    readonly catalogueEnAttente: boolean;
    readonly year: OptionListee | null;
    readonly season: OptionListee | null;
    readonly groups: string[];
    readonly groupList: string[];
    /** Ou en est la lecture de la liste : l'etape des groupes dit pourquoi elle est vide (6.1-C). */
    readonly groupesEtat: EtatListeGroupes;
    readonly groupListFiltered: string[];
    readonly textFilter: string;
}

/**
 * L'etape des groupes doit-elle proposer le tri par annee et semestre ?
 *
 * Seulement pour Celcat, et c'est la source qui le dit, pas l'etablissement. La question reelle est
 * « cette liste est-elle trop longue pour etre parcourue ? » : Celcat en publie plusieurs centaines,
 * un referentiel iCalendar en compte treize. Proposer un tri par annee sur treize entrees demanderait
 * deux gestes pour reduire une liste qui tient a l'ecran — et, comme la table de fragments est
 * bordelaise, il ne reduirait rien du tout.
 */
export function filtrageParAnnee(): boolean {
    return sourceEdt().kind === 'celcat';
}

/**
 * Les groupes a proposer, selon ce que l'etudiant a choisi et ce que la source permet.
 *
 * Deux regimes, et c'est la seule difference entre les sources a cette etape :
 *
 *   - **avec tri par annee** (Celcat) : rien tant qu'annee et semestre ne sont pas choisis. La liste
 *     complete serait illisible, et l'afficher inviterait a la parcourir ;
 *   - **sans** (referentiel iCalendar) : la liste entiere, reduite par le texte saisi. Treize entrees
 *     se lisent d'un coup d'oeil.
 *
 * Extrait pour etre appele **aussi** a l'arrivee de la liste : elle est chargee hors du chemin de
 * demarrage, donc elle peut arriver apres que l'etudiant a saisi son filtre, et la version d'origine
 * ne recalculait qu'au geste suivant — une liste qui reste vide sans raison visible.
 */
function filtrer(
    groupList: string[],
    year: OptionListee | null,
    season: OptionListee | null,
    textFilter: string,
): string[] {
    const recherche = textFilter.toUpperCase();

    if (!filtrageParAnnee()) {
        return groupList.filter((groupe) => groupe.toUpperCase().includes(recherche));
    }

    const filtres = year && season ? FILTRE_SAISON[season.id][year.id] : null;
    if (filtres === null) return [];

    return groupList.filter((groupe) => {
        const majuscules = groupe.toUpperCase();
        return filtres.some((fragment) => majuscules.includes(fragment.toUpperCase()) && majuscules.includes(recherche));
    });
}

export interface WelcomeActions {
    readonly selectTheme: (entree: OptionListee) => void;
    readonly selectLanguage: (entree: OptionListee) => void;
    readonly selectEtablissement: (code: string) => void;
    readonly selectGroup: (groupe: string) => void;
    readonly filterList: (year: OptionListee | null, season: OptionListee | null, textFilter: string) => void;
    /** Redemande la liste des groupes a sa source — le « Reessayer » de l'etape. */
    readonly relancerGroupes: () => void;
}

export function useWelcomeState(): { state: WelcomeState; actions: WelcomeActions } {
    // La revision du catalogue publie : rootContainer la bouscule quand la surcouche change. C'est le
    // canal par lequel un etablissement publie apres le montage atteint cette liste.
    const { catalogue } = useContext(AppContext);
    // L'etat de depart lit le gestionnaire plutot que de figer `fr`/`light` : au retour dans un
    // parcours interrompu, les reglages restaures sont deja poses, et repartir d'une constante
    // afficherait un ecran clair le temps d'un rendu avant de se corriger.
    const [state, setState] = useState<WelcomeState>({
        language: SettingsManager.getLanguage(),
        theme: SettingsManager.getTheme(),
        etablissement: getCodeEtablissementActif(),
        etablissements: listeEtablissements(),
        catalogueEnAttente: !premierRafraichissementRepondu(),
        year: null,
        season: null,
        groups: [],
        groupList: DataManager.getGroupList(),
        groupesEtat: DataManager.getGroupListEtat(),
        groupListFiltered: [],
        textFilter: '',
    });

    const changer = (partiel: Partial<WelcomeState>) => setState((prev) => ({ ...prev, ...partiel }));

    // Le catalogue arrive **apres** l'affichage : sa lecture est hors du chemin de demarrage
    // (rootContainer). La liste se relit a chaque revision publiee — l'abonnement a `etablissement`
    // ci-dessous ne part qu'au choix de l'utilisateur, et il a longtemps passe pour ce reabonnement :
    // une installation neuve ne voyait que le socle (6.1-A).
    useEffect(() => {
        changer({ etablissements: listeEtablissements() });
    }, [catalogue]);

    // Le premier rafraichissement, attendu une fois et plafonne : l'etape affiche un chargement
    // parlant plutot qu'une liste qu'elle sait peut-etre en retard, puis la liste connue quoi qu'il
    // arrive — completee par l'effet ci-dessus si la reponse finit par arriver.
    useEffect(() => {
        let monte = true;
        void attendrePremierRafraichissement(PLAFOND_CATALOGUE_MS).then(() => {
            if (monte) changer({ catalogueEnAttente: false, etablissements: listeEtablissements() });
        });
        return () => {
            monte = false;
        };
    }, []);

    useEffect(() => {
        const surTheme = (theme: string) => changer({ theme });
        const surLangue = (language: string) => changer({ language });
        const surFavoris = (groups: string[]) => changer({ groups });
        // Le tri par annee et le texte saisi appartiennent a l'universite qu'on quitte : une annee
        // choisie sous la convention de nommage de l'une ne veut rien dire sous l'autre.
        const surEtablissement = (code: string) => changer({
            etablissement: code,
            etablissements: listeEtablissements(),
            year: null,
            season: null,
            textFilter: '',
            groupListFiltered: [],
        });
        // La liste arrive **apres** le montage — elle est chargee hors du chemin de demarrage, et elle
        // est rechargee a chaque changement d'etablissement (PlanningDataManager). Refiltrer ici plutot
        // que d'attendre le geste suivant : sans ca, choisir son universite puis avancer d'un ecran
        // montrait une liste vide jusqu'a ce qu'on retouche un filtre.
        const surListe = (groupList: string[]) => setState((prev) => ({
            ...prev,
            groupList,
            groupListFiltered: filtrer(groupList, prev.year, prev.season, prev.textFilter),
        }));
        const surEtatListe = (groupesEtat: EtatListeGroupes) => changer({ groupesEtat });

        SettingsManager.on('theme', surTheme);
        SettingsManager.on('language', surLangue);
        SettingsManager.on('favoriteGroups', surFavoris);
        SettingsManager.on('etablissement', surEtablissement);
        DataManager.on('groupList', surListe);
        DataManager.on('groupListEtat', surEtatListe);

        // **Les defauts de l'appareil, une seule fois** : au tout premier lancement, quand rien n'a
        // encore ete ecrit. Les poser a chaque montage etait un defaut signale par un utilisateur —
        // choisir le mode sombre pendant la configuration, quitter l'application puis la rouvrir, et
        // le parcours reprenait en clair, le choix ecrase par le theme du systeme. Il ne revenait
        // qu'au redemarrage **suivant**, une fois la configuration terminee, ce qui le faisait passer
        // pour un bug d'affichage alors que la preference etait bien enregistree.
        //
        // Un parcours interrompu n'a rien d'exceptionnel : il suffit qu'Android reclame la memoire.
        if (!SettingsManager.aDesReglagesEnregistres()) {
            SettingsManager.setLanguage(languageFromDevice());
            SettingsManager.setTheme(SettingsManager.getAutomaticTheme());
        }

        // Resilies au demontage : ils ne l'etaient jamais, et les managers gardaient six rappels vers
        // un parcours termine pour toute la session (limite ecrite depuis 6-G, corrigee en 6.1-C).
        return () => {
            SettingsManager.unsubscribe('theme', surTheme);
            SettingsManager.unsubscribe('language', surLangue);
            SettingsManager.unsubscribe('favoriteGroups', surFavoris);
            SettingsManager.unsubscribe('etablissement', surEtablissement);
            DataManager.unsubscribe('groupList', surListe);
            DataManager.unsubscribe('groupListEtat', surEtatListe);
        };
    }, []);

    const filterList: WelcomeActions['filterList'] = (year, season, textFilter) => {
        changer({ groupListFiltered: filtrer(state.groupList, year, season, textFilter), year, season, textFilter });
    };

    return {
        state,
        actions: {
            selectTheme: (entree) => SettingsManager.setTheme(entree.id),
            selectLanguage: (entree) => SettingsManager.setLanguage(entree.id),
            /**
             * Le choix de l'etablissement passe par la meme bascule que les reglages — purge
             * comprise (shared/etablissements/bascule.ts).
             *
             * Il n'y a le plus souvent rien a purger au premier lancement, et c'est justement
             * pourquoi il faut passer par la : une reinstallation par-dessus une installation
             * existante laisse un trousseau et des caches, et un second chemin « allege » finirait
             * par diverger de celui qui compte.
             */
            selectEtablissement: (code) => {
                void basculerEtablissement(code);
            },
            selectGroup: (groupe) => {
                if (state.groups.includes(groupe)) SettingsManager.removeFavoriteGroup(groupe);
                else SettingsManager.addFavoriteGroup(groupe);
            },
            filterList,
            relancerGroupes: () => {
                void DataManager.fetchGroupList();
            },
        },
    };
}
