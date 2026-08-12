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

import { useEffect, useState } from 'react';

import { SettingsManager, languageFromDevice } from '../../../shared/services/AppCore';
import {
    changerEtablissement,
    getCodeEtablissementActif,
    listeEtablissements,
    type Etablissement,
} from '../../../shared/etablissements';
import { PlanningDataManager as DataManager } from '../../Planning/services/PlanningDataManager';

/** Les fragments d'identifiant de groupe par annee et par semestre. Table locale, source Celcat. */
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
    readonly year: OptionListee | null;
    readonly season: OptionListee | null;
    readonly groups: string[];
    readonly groupList: string[];
    readonly groupListFiltered: string[];
    readonly textFilter: string;
}

export interface WelcomeActions {
    readonly selectTheme: (entree: OptionListee) => void;
    readonly selectLanguage: (entree: OptionListee) => void;
    readonly selectEtablissement: (code: string) => void;
    readonly selectGroup: (groupe: string) => void;
    readonly filterList: (year: OptionListee | null, season: OptionListee | null, textFilter: string) => void;
}

export function useWelcomeState(): { state: WelcomeState; actions: WelcomeActions } {
    const [state, setState] = useState<WelcomeState>({
        language: 'fr',
        theme: 'light',
        etablissement: getCodeEtablissementActif(),
        etablissements: listeEtablissements(),
        year: null,
        season: null,
        groups: [],
        groupList: DataManager.getGroupList(),
        groupListFiltered: [],
        textFilter: '',
    });

    const changer = (partiel: Partial<WelcomeState>) => setState((prev) => ({ ...prev, ...partiel }));

    useEffect(() => {
        SettingsManager.on('theme', (theme: string) => changer({ theme }));
        SettingsManager.on('language', (language: string) => changer({ language }));
        SettingsManager.on('favoriteGroups', (groups: string[]) => changer({ groups }));
        // Le catalogue peut arriver **apres** l'affichage : sa lecture est hors du chemin de
        // demarrage (rootContainer). L'ecran s'abonne donc, comme il le fait deja pour la liste des
        // groupes, plutot que de figer une liste au montage.
        SettingsManager.on('etablissement', (code: string) =>
            changer({ etablissement: code, etablissements: listeEtablissements() }));
        DataManager.on('groupList', (groupList: string[]) => changer({ groupList }));

        SettingsManager.setLanguage(languageFromDevice());
        SettingsManager.setTheme(SettingsManager.getAutomaticTheme());
    }, []);

    const filterList: WelcomeActions['filterList'] = (year, season, textFilter) => {
        const filtres = year && season ? FILTRE_SAISON[season.id][year.id] : null;
        const groupListFiltered = filtres === null ? [] : state.groupList.filter((groupe) => {
            const majuscules = groupe.toUpperCase();
            return filtres.some((fragment) =>
                majuscules.includes(fragment.toUpperCase()) && majuscules.includes(textFilter.toUpperCase()));
        });

        changer({ groupListFiltered, year, season, textFilter });
    };

    return {
        state,
        actions: {
            selectTheme: (entree) => SettingsManager.setTheme(entree.id),
            selectLanguage: (entree) => SettingsManager.setLanguage(entree.id),
            /**
             * Le choix de l'etablissement passe par la meme porte que celui des reglages — purge
             * comprise.
             *
             * Il n'y a le plus souvent rien a purger au premier lancement, et c'est justement
             * pourquoi il faut passer par la : une reinstallation par-dessus une installation
             * existante laisse un trousseau et des caches, et un second chemin « allege » finirait
             * par diverger de celui qui compte.
             */
            selectEtablissement: (code) => {
                void changerEtablissement(code).then(() => SettingsManager.setEtablissement(code));
            },
            selectGroup: (groupe) => {
                if (state.groups.includes(groupe)) SettingsManager.removeFavoriteGroup(groupe);
                else SettingsManager.addFavoriteGroup(groupe);
            },
            filterList,
        },
    };
}
