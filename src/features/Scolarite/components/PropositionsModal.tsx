/**
 * La confirmation de ce que le dossier a livre : les UE a masquer, et l'emploi du temps personnel.
 *
 * **Rendue par `rootContainer`**, a cote du menu flottant et pour la meme raison : elle doit pouvoir
 * apparaitre pendant le parcours d'accueil — qui est rendu **a la place** de la navigation — comme
 * au-dessus de n'importe quel onglet. Aucun ecran ne la porte, donc aucun ecran n'a besoin de savoir
 * qu'elle existe.
 *
 * **Elle attend son moment.** Le parcours d'accueil demande le compte **avant** le groupe : a la fin
 * de la lecture du dossier, il n'y a pas encore de planning, donc pas d'UE a comparer. Son hook
 * (`usePropositionsADemander`) s'abonne donc aux trois choses qui peuvent rendre la question complete — les UE rencontrees, les
 * filtres poses, les groupes favoris — et se montre des que `decider` le dit. C'est
 * `PropositionsDecision` qui tranche ; ce fichier ne fait qu'afficher et appliquer.
 *
 * **Ce que « appliquer » veut dire, precisement** :
 *
 *   - les UE **cochees** deviennent des **filtres**, qui masquent. Ce sont des UE auxquelles le dossier
 *     ne l'inscrit pas, jamais les siennes — voir le module de decision, ou cette inversion est le
 *     premier test — et aucune n'est cochee d'office : le complement n'est pas une certitude
 *     (`PropositionsChoix`). Apres coup, un dialogue dit combien ont ete masquees, ou les retrouver,
 *     et permet d'annuler ;
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

import React, { useContext, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Translator from '../../../shared/i18n/Translator';
import style, { propsLibelleBouton, tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { AppContext, SettingsManager } from '../../../shared/services/AppCore';
import { enregistrerEdtPersonnel } from '../../../shared/etablissements';
import { PlanningDataManager as DataManager } from '../../Planning/services/PlanningDataManager';
import { useCredentials } from '../services/CredentialsContext';
import type { Proposition } from '../services/PropositionsDecision';
import { aAppliquer, basculer, choixInitial, estVide } from '../services/PropositionsChoix';
import { usePropositionsADemander } from '../hooks/usePropositionsADemander';
import { Icon } from '../../../shared/ui/Icon';
import { Dialogue } from '../../../shared/ui/Dialogue';
import { Coche } from '../../Onboarding/components/EtapesDeChoix';

/**
 * Les UE proposees, une rangee a cocher chacune : le code, et son intitule quand le planning le connait.
 *
 * L'intitule n'est pas un ornement — sans lui, il faudrait ouvrir son emploi du temps pour savoir ce
 * qu'on accepte de masquer, ce qui vide la confirmation de son sens. La coche est celle de l'accueil
 * (`Coche`), la seule forme de choix multiple de l'application.
 */
function ListeUes({ theme, ues, choix, onBasculer }: {
    theme: AppThemeType;
    ues: readonly string[];
    choix: ReadonlySet<string>;
    onBasculer: (code: string) => void;
}) {
    return (
        <View>
            {ues.map((code) => {
                const nom = DataManager.nomDUE(code);
                const cochee = choix.has(code);
                return (
                    <Pressable
                        key={code}
                        onPress={() => onBasculer(code)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: cochee }}
                        accessibilityLabel={nom !== null ? `${code} ${nom}` : code}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, paddingVertical: tokens.space.sm }}
                    >
                        <View style={{ flex: 1 }}>
                            {/* Le code en texte, plus en pastille a l'accent : une donnee ne prend pas la
                                couleur d'action (docs/theme.md), et dix pastilles bleues criaient. */}
                            <Text style={[tokens.texte.chiffres, { fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: theme.font }]}>
                                {code}
                            </Text>
                            {nom !== null ? (
                                <Text numberOfLines={1} style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary }}>
                                    {nom}
                                </Text>
                            ) : null}
                        </View>
                        <Coche theme={theme} choisie={cochee} />
                    </Pressable>
                );
            })}
        </View>
    );
}

interface SectionProps {
    readonly theme: AppThemeType;
    readonly icone: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    readonly titre: string;
    readonly children: React.ReactNode;
}

function Section({ theme, icone, titre, children }: SectionProps) {
    return (
        // Pas de marge propre : c'est le `gap` du conteneur qui espace les sections, d'un seul pas.
        // Chacune posait la sienne, et l'intro, les sections et les boutons se retrouvaient separes
        // de trois ecarts differents.
        <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm }}>
                <Icon icon={{ name: icone }} size={20} color={theme.primary} />
                <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: theme.font }}>
                    {titre}
                </Text>
            </View>
            <View style={{ marginTop: tokens.space.sm }}>{children}</View>
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

/**
 * Apres coup : combien d'UE ont ete masquees, ou les retrouver, et le moyen d'annuler.
 *
 * Le dialogue informatif du depot (`Dialogue`) : « Annuler » en lien discret, la fermeture en bouton
 * plein. Annuler retire les filtres poses par ce geste, et eux seuls — ceux d'avant ne figuraient pas
 * dans la proposition (`complement`).
 */
function ConfirmationDeMasquage({ theme, masquees, fermer }: { theme: AppThemeType; masquees: readonly string[]; fermer: () => void }) {
    const annuler = () => {
        for (const code of masquees) SettingsManager.removeFilters(code);
        fermer();
    };
    return (
        <Dialogue
            theme={theme}
            visible={true}
            fermer={fermer}
            titre={masquees.length === 1 ? Translator.get('PROPOSALS_DONE_ONE') : Translator.get('PROPOSALS_DONE_MANY', masquees.length)}
            corps={Translator.get(masquees.length === 1 ? 'PROPOSALS_DONE_BODY_ONE' : 'PROPOSALS_DONE_BODY')}
            lien={{ libelle: Translator.get('PROPOSALS_UNDO'), onPress: annuler }}
        />
    );
}

/** La meme que les rangees desactivees des reglages (`GroupeDeReglages`). */
const OPACITE_INACTIVE = 0.5;

export function PropositionsModal() {
    const { propositions, oublierPropositions } = useCredentials();
    const { themeName } = useContext(AppContext);
    const theme: AppThemeType = style.Theme[themeName];
    const decision = usePropositionsADemander(propositions);
    const [choix, setChoix] = useState(choixInitial);
    const [masquees, setMasquees] = useState<readonly string[] | null>(null);

    if (masquees !== null) {
        return <ConfirmationDeMasquage theme={theme} masquees={masquees} fermer={() => setMasquees(null)} />;
    }
    if (decision.kind !== 'demander') return null;
    const { proposition } = decision;
    const retenue = aAppliquer(proposition, choix);
    const popup = theme.settings.popup;

    /** Oublier **d'abord** : la modale disparait, et ce qui suit ne repeint rien derriere elle. */
    const confirmer = () => {
        oublierPropositions();
        setChoix(choixInitial());
        if (retenue.ues.length > 0) setMasquees(retenue.ues);
        void appliquer(retenue);
    };

    return (
        <Modal animationType="fade" transparent={true} visible={true} onRequestClose={oublierPropositions}>
            <View style={popup.background as never}>
                <View style={popup.container as never}>
                    <View style={popup.header as never}>
                        <Text style={popup.textHeader}>{Translator.get('PROPOSALS_TITLE')}</Text>
                        <TouchableOpacity onPress={oublierPropositions} hitSlop={12} accessibilityRole="button" accessibilityLabel={Translator.get('CLOSE')}>
                            <Icon icon={{ family: 'material', name: 'close' }} size={24} color={popup.closeIcon.color as string} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ gap: tokens.space.lg, paddingVertical: tokens.space.xs }}>
                        {proposition.edt !== null ? (
                            <Section
                                theme={theme}
                                icone="calendar-account"
                                titre={Translator.get('PROPOSALS_EDT_LABEL')}
                            >
                                {/* Le libelle vient d'ADE : c'est une donnee, pas un libelle traduit, et
                                    il s'ecrit comme tel, sans pastille a l'accent. */}
                                <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: theme.font }}>
                                    {proposition.edt.libelle}
                                </Text>
                            </Section>
                        ) : null}

                        {proposition.ues.length > 0 ? (
                            <Section
                                theme={theme}
                                icone="filter-variant"
                                titre={Translator.get('PROPOSALS_UES_LABEL')}
                            >
                                {/* La raison de la proposition, une fois, en tete : pas de texte sous
                                    les rangees (docs/theme.md). */}
                                <Text style={[popup.textDescription, { marginTop: 0 }]}>{Translator.get('PROPOSALS_UES_REASON')}</Text>
                                <ListeUes theme={theme} ues={proposition.ues} choix={choix} onBasculer={(code) => setChoix((avant) => basculer(avant, code))} />
                            </Section>
                        ) : null}
                    </ScrollView>

                    <View style={popup.buttonContainer as never}>
                        <TouchableOpacity style={popup.buttonSecondary as never} onPress={oublierPropositions}>
                            <Text {...propsLibelleBouton} style={popup.buttonTextSecondary as never}>{Translator.get('PROPOSALS_SKIP')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[popup.buttonMain, estVide(retenue) ? { opacity: OPACITE_INACTIVE } : null] as never}
                            onPress={confirmer}
                            disabled={estVide(retenue)}
                            accessibilityState={{ disabled: estVide(retenue) }}
                        >
                            <Text {...propsLibelleBouton} style={popup.buttonTextMain as never}>{Translator.get('PROPOSALS_APPLY')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
