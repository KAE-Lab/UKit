/**
 * La confirmation de ce que le dossier a livre : les UE a masquer, et l'emploi du temps personnel.
 *
 * **Rendue par `rootContainer`**, a cote du menu flottant et pour la meme raison : elle doit pouvoir
 * apparaitre pendant le parcours d'accueil — qui est rendu **a la place** de la navigation — comme
 * au-dessus de n'importe quel onglet. Aucun ecran ne la porte, donc aucun ecran n'a besoin de savoir
 * qu'elle existe.
 *
 * **Elle attend son moment.** Le parcours d'accueil demande le compte **avant** le groupe : a la fin
 * de la lecture du dossier, il n'y a pas encore de planning, donc pas d'UE a comparer. La modale
 * s'abonne donc aux trois choses qui peuvent rendre la question complete — les UE rencontrees, les
 * filtres poses, les groupes favoris — et se montre des que `decider` le dit. C'est
 * `PropositionsDecision` qui tranche ; ce fichier ne fait qu'afficher et appliquer.
 *
 * **Ce que « appliquer » veut dire, precisement** :
 *
 *   - les UE deviennent des **filtres**, qui masquent. Ce sont celles auxquelles l'etudiant n'est pas
 *     inscrit, jamais les siennes — voir le module de decision, ou cette inversion est le premier
 *     test ;
 *   - l'emploi du temps devient une **entree de referentiel** au trousseau, fusionnee au catalogue
 *     par `sourceEdt()`, plus un favori. Le groupe personnel se resout ensuite comme un autre.
 *
 * Refuser n'ecrit rien et **n'est pas garde** : les propositions vivent le temps de la session qui a
 * lu le dossier. Une nouvelle lecture — le bouton « Actualiser le dossier », une reconnexion — les
 * reproposera, ce qui est le bon comportement puisqu'elle est un geste volontaire. C'est aussi ce qui
 * evite qu'une proposition vieille de six mois ressurgisse un jour sans raison.
 *
 * Voir docs/features/scolarite.md.
 */

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import Translator from '../../../shared/i18n/Translator';
import style, { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { AppContext, SettingsManager } from '../../../shared/services/AppCore';
import { tracerPropositions } from '../../../shared/services/PropositionsTrace';
import { edtPersonnelActif, enregistrerEdtPersonnel } from '../../../shared/etablissements';
import { PlanningDataManager as DataManager } from '../../Planning/services/PlanningDataManager';
import { PlanningApiService } from '../../Planning/services/PlanningApiService';
import { Badge } from '../../../shared/ui/Badge';
import { useCredentials } from '../services/CredentialsContext';
import { decider, type Proposition } from '../services/PropositionsDecision';
import type { PropositionsDossier } from '../services/PropositionsDossier';

/** L'etat que la decision consulte, relu a chaque fois plutot que memorise. */
function etatCourant() {
    const personnel = edtPersonnelActif();
    return {
        uesDuPlanning: DataManager.getAvailableUEs(),
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
 *
 * L'abonnement n'est pas defait du cote du planning — `PlanningDataManager` n'expose pas de
 * desabonnement — et c'est sans consequence ici : ce composant est monte par `rootContainer` pour
 * toute la duree de l'application, comme le menu flottant.
 */
function useRevision(): number {
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        const rafraichir = () => setRevision((precedente) => precedente + 1);
        DataManager.on('availableUEs', rafraichir);
        SettingsManager.on('filter', rafraichir);
        SettingsManager.on('favoriteGroups', rafraichir);
        return () => {
            SettingsManager.unsubscribe('filter', rafraichir);
            SettingsManager.unsubscribe('favoriteGroups', rafraichir);
        };
    }, []);

    return revision;
}

/**
 * Les UE de **toute l'annee**, demandees une fois quand une proposition attend.
 *
 * Sans ca, la proposition est **partielle par construction** : la liste des UE rencontrees ne se
 * remplit qu'a mesure qu'on affiche des journees, si bien qu'on proposerait de masquer une UE
 * etrangere aujourd'hui et une autre la semaine prochaine. Masquer un tiers de ce qu'il fallait est
 * pire que ne rien masquer — l'etudiant croit le menage fait.
 *
 * Le run existe deja et sert la synchronisation calendrier : il rend l'annee scolaire entiere du
 * groupe. Il part **une seule fois par session**, seulement s'il y a une proposition d'UE en attente,
 * et son resultat entre par la porte ordinaire (`extractUEsFromCourses`) — ce qui profite aussi a la
 * liste de suggestions des reglages. Un echec ne se dit pas : on retombe simplement sur ce que
 * l'ecran a deja charge.
 */
function useUesDeLAnnee(propositions: PropositionsDossier | null, revision: number): void {
    const demande = useRef(false);

    useEffect(() => {
        if (demande.current || propositions === null || propositions.ues.length === 0) return;

        const favoris = SettingsManager.getFavoriteGroups();
        // Aucun favori : rien a demander, et surtout pas de quoi consommer l'unique tentative — le
        // groupe se choisit souvent **apres** la connexion.
        if (favoris.length === 0) return;

        demande.current = true;
        void PlanningApiService.fetchCalendarForSynchronization(favoris).then((resultat) => {
            if (resultat.ok === false) return;
            DataManager.extractUEsFromCourses(resultat.courses);
        });
        // `revision` remet l'effet en jeu quand les favoris changent : le groupe se choisit souvent
        // apres la connexion, et sans ca la demande n'aurait jamais lieu pour un premier login.
    }, [propositions, revision]);
}

/**
 * Les UE proposees, une par ligne : le code, et son intitule quand le planning le connait.
 *
 * L'intitule n'est pas un ornement — sans lui, il faudrait ouvrir son emploi du temps pour savoir ce
 * qu'on accepte de masquer, ce qui vide la confirmation de son sens.
 */
function ListeUes({ theme, ues }: { theme: AppThemeType; ues: readonly string[] }) {
    return (
        <View style={{ gap: tokens.space.xs }}>
            {ues.map((code) => {
                const nom = DataManager.nomDUE(code);
                return (
                    <View key={code} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm }}>
                        <Badge label={code} theme={theme} />
                        {nom !== null ? (
                            <Text
                                numberOfLines={1}
                                style={{ flexShrink: 1, fontSize: tokens.fontSize.sm, color: theme.fontSecondary }}
                            >
                                {nom}
                            </Text>
                        ) : null}
                    </View>
                );
            })}
        </View>
    );
}

interface SectionProps {
    readonly theme: AppThemeType;
    readonly icone: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    readonly titre: string;
    readonly aide: string;
    readonly children: React.ReactNode;
}

function Section({ theme, icone, titre, aide, children }: SectionProps) {
    return (
        <View style={{ marginTop: tokens.space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm }}>
                <MaterialCommunityIcons name={icone} size={20} color={theme.primary} />
                <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: theme.font }}>
                    {titre}
                </Text>
            </View>
            <View style={{ marginTop: tokens.space.sm }}>{children}</View>
            <Text style={{ marginTop: tokens.space.sm, fontSize: tokens.fontSize.sm, color: theme.fontSecondary }}>
                {aide}
            </Text>
        </View>
    );
}

/**
 * Applique ce qui a ete accepte, dans un ordre qui compte.
 *
 * Le referentiel **avant** le favori : `resoudreRessources` resout un favori par son nom, et un
 * favori pose sur un nom que le referentiel ne porte pas encore rendrait « groupe inconnu » le temps
 * d'un rendu. La liste des groupes est ensuite redemandee — sans reseau pour un referentiel
 * iCalendar — pour que l'ecran de choix montre le groupe personnel des la premiere visite.
 */
async function appliquer(proposition: Proposition): Promise<void> {
    for (const code of proposition.ues) SettingsManager.addFilters(code);

    const edt = proposition.edt;
    if (edt === null) return;

    await enregistrerEdtPersonnel({ nom: edt.libelle, ressource: edt.ressource });
    SettingsManager.addFavoriteGroup(edt.libelle);
    void DataManager.fetchGroupList();
}

export function PropositionsModal() {
    const { propositions, oublierPropositions } = useCredentials();
    const { themeName } = useContext(AppContext);
    const theme: AppThemeType = style.Theme[themeName];
    const revision = useRevision();
    useUesDeLAnnee(propositions, revision);

    const decision = useMemo(
        () => {
            if (propositions === null) return { kind: 'rien' as const };
            const etat = etatCourant();
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
                `[propositions] decision : ${prise.kind} — ${etat.uesDuPlanning.length} UE au planning, ` +
                `${propositions.ues.length} inscrite(s), ${prise.kind === 'demander' ? prise.proposition.ues.length : 0} a masquer`,
            );
            return prise;
        },
        // `revision` n'est pas lue dans le corps : elle est ce qui redemande la decision quand le
        // planning, les filtres ou les favoris ont bouge.
        [propositions, revision],
    );

    if (decision.kind !== 'demander') return null;
    const { proposition } = decision;
    const popup = theme.settings.popup;

    /** Oublier **d'abord** : la modale disparait, et ce qui suit ne repeint rien derriere elle. */
    const confirmer = () => {
        oublierPropositions();
        void appliquer(proposition);
    };

    return (
        <Modal animationType="fade" transparent={true} visible={true} onRequestClose={oublierPropositions}>
            <View style={popup.background as never}>
                <View style={popup.container as never}>
                    <View style={popup.header as never}>
                        <Text style={popup.textHeader}>{Translator.get('PROPOSALS_TITLE')}</Text>
                        <TouchableOpacity onPress={oublierPropositions} hitSlop={12}>
                            <MaterialIcons name="close" size={24} style={popup.closeIcon} />
                        </TouchableOpacity>
                    </View>
                    <Text style={popup.textDescription}>{Translator.get('PROPOSALS_INTRO')}</Text>

                    <ScrollView>
                        {proposition.edt !== null ? (
                            <Section
                                theme={theme}
                                icone="calendar-account"
                                titre={Translator.get('PROPOSALS_EDT_LABEL')}
                                aide={Translator.get('PROPOSALS_EDT_HINT')}
                            >
                                {/* Le libelle vient d'ADE : c'est une donnee, pas un libelle traduit. */}
                                <Badge label={proposition.edt.libelle} theme={theme} icon={{ name: 'calendar-blank' }} />
                            </Section>
                        ) : null}

                        {proposition.ues.length > 0 ? (
                            <Section
                                theme={theme}
                                icone="filter-variant"
                                titre={Translator.get('PROPOSALS_UES_LABEL')}
                                aide={Translator.get('PROPOSALS_UES_HINT')}
                            >
                                <ListeUes theme={theme} ues={proposition.ues} />
                            </Section>
                        ) : null}
                    </ScrollView>

                    <View style={popup.buttonContainer as never}>
                        <TouchableOpacity style={popup.buttonSecondary as never} onPress={oublierPropositions}>
                            <Text style={popup.buttonTextSecondary as never}>{Translator.get('PROPOSALS_SKIP')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={popup.buttonMain as never} onPress={confirmer}>
                            <Text style={popup.buttonTextMain as never}>{Translator.get('PROPOSALS_APPLY')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
