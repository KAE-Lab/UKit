/**
 * L'onglet Scolarite d'un campus que l'application ne porte pas : une page a lui, pas un encart.
 *
 * Il etait **voile dans la barre d'onglets** — cadenas, flou, et une modale de demande au toucher —
 * mais on pouvait quand meme y arriver : en changeant de campus depuis le formulaire de connexion, ou
 * en y etant deja. On tombait alors sur le tableau de bord avec un encart de plus, c'est-a-dire sur la
 * page d'un etudiant connecte a qui il manquerait tout (retour d'appareil du 2026-09-02, 6.1-A).
 *
 * L'onglet s'ouvre donc, et la page dit ce qu'il en est : **pas une panne**, un campus pas encore
 * relie. Elle a la forme du formulaire de connexion — le bandeau, la phrase, une carte d'action —
 * parce que c'est la page que les autres campus voient a cet endroit, et que l'etudiant n'a pas a
 * apprendre un troisieme gabarit. Elle porte le seul geste qui compte — la demande, dont l'adresse
 * vient du catalogue (`services.adaptation`) — et le lien qui corrige un mauvais choix, « Tu es d'un
 * autre campus ? ». Le bouton Compte de la barre, lui, reste sous le voile : c'est le compte qui
 * n'est pas encore possible ici, pas l'onglet.
 *
 * **L'icone est celle d'un etat vide** — la surface de 72 du vocabulaire partage, la ou le
 * formulaire pose le logo de l'etablissement. Le logo de UKit y a ete essaye a la place et defait le
 * jour meme (2026-09-02) : un logotype monochrome en tete d'une page qui dit « pas encore » se lisait
 * comme une signature deplacee. Cette page n'appartient a aucun etablissement, et un etat vide est
 * exactement ce qu'elle est.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Translator from '../../../shared/i18n/Translator';
import { PastilleService } from '../../../shared/messages/PastilleService';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { getCodeEtablissementActif, serviceEtablissement } from '../../../shared/etablissements';
import { basculerEtablissement } from '../../../shared/etablissements/bascule';
import { ActionButton } from '../../../shared/ui/ActionButton';
import { ChoixEtablissement } from '../../../shared/ui/ChoixEtablissement';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { HEADER_OFFSET, TAB_BAR_HEIGHT } from '../../../shared/ui/ScreenState';

export interface CampusNonRelieProps {
    theme: AppThemeType;
    /** Ouvre le formulaire de demande dans le navigateur integre. */
    onDemande: (href: string) => void;
}

export function CampusNonRelie({ theme, onDemande }: CampusNonRelieProps) {
    const insets = useSafeAreaInsets();
    /** Le choix d'etablissement, ouvert par « Tu es d'un autre campus ? ». */
    const [choixCampus, setChoixCampus] = useState(false);
    const demande = serviceEtablissement('adaptation');

    return (
        <View style={[styles.page, { backgroundColor: theme.background }]}>
            {/* Le gabarit du titre des onglets, a l'identique : meme position, meme corps. */}
            <View style={[styles.titreDOnglet, { paddingTop: insets.top || 0 }]} pointerEvents="box-none">
                <View style={styles.rangeeDuTitre} pointerEvents="box-none">
                    <Text style={[styles.titreDOngletTexte, { color: theme.font }]} pointerEvents="none">
                        {Translator.get('SCOLARITY')}
                    </Text>
                    <PastilleService theme={theme} style={styles.rappel} />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingTop: (insets.top || 0) + HEADER_OFFSET, paddingBottom: tokens.space.xxl + TAB_BAR_HEIGHT }}
                showsVerticalScrollIndicator={false}
            >
                {/* L'etat vide du vocabulaire partage, a la place du bandeau du formulaire : la
                    surface d'icone, le titre, la phrase, et l'action. Sans lien publie, la phrase
                    reste et l'action disparait : mieux vaut dire honnetement « pas encore » que
                    proposer une porte fermee. */}
                <View style={styles.bloc}>
                    <EmptyState
                        variant="plain"
                        icon="school-outline"
                        title={Translator.get('CAMPUS_NOT_SUPPORTED_TITLE')}
                        message={Translator.get('CAMPUS_NOT_SUPPORTED')}
                        theme={theme}
                        action={demande === null ? null : {
                            label: Translator.get('CAMPUS_REQUEST_ACTION'),
                            onPress: () => onDemande(demande),
                        }}
                    />
                    {/* Un bouton tonal et non un lien nu : un texte seul sous un bloc se lisait
                        « dans le vide » (constat du 2026-09-02). Le meme bouton que sous le logo du
                        formulaire de connexion. */}
                    <ActionButton
                        theme={theme}
                        label={Translator.get('OTHER_CAMPUS_QUESTION')}
                        onPress={() => setChoixCampus(true)}
                        variant="tonal"
                        icon={{ name: 'swap-horizontal' }}
                        style={styles.changer}
                    />
                </View>
            </ScrollView>

            <ChoixEtablissement
                theme={theme}
                visible={choixCampus}
                fermer={() => setChoixCampus(false)}
                codeActif={getCodeEtablissementActif()}
                onConfirmer={(code) => { void basculerEtablissement(code); }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    titreDOnglet: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingBottom: tokens.space.sm,
    },
    rangeeDuTitre: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: tokens.space.md,
    },
    titreDOngletTexte: {
        fontSize: tokens.fontSize.title,
        fontWeight: tokens.fontWeight.bold as '700',
        marginBottom: tokens.space.md,
        paddingHorizontal: tokens.space.md,
    },
    rappel: {
        marginLeft: 'auto',
        marginBottom: tokens.space.md,
    },
    // Les marges de `ScreenState`, sans son ancrage : c'est le defilement qui pose le bloc ici.
    bloc: {
        alignItems: 'center',
        paddingHorizontal: tokens.space.lg,
    },
    changer: {
        alignSelf: 'center',
        marginTop: tokens.space.lg,
    },
});
