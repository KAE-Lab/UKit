/**
 * L'evenement d'une annonce, sous son titre (phase 8, lot 5 ; docs/phase-8/5-evenements.md) : quand et
 * ou, en trois rangees d'une carte au gabarit du sondage, puis « Ajouter a mon planning ».
 *
 * L'ajout se fait d'un toucher et se defait de meme ; un evenement que l'abonnement montre deja
 * s'ajoute encore, pour partir dans l'agenda synchronise. Apres le premier ajout, une seule fois, l'application
 * propose l'abonnement aux evenements du campus : un dialogue du systeme, que « Pas maintenant » ferme
 * pour de bon — le reglage reste dans l'Agenda des Reglages. Un evenement fini ne s'ajoute plus.
 */

import moment from 'moment';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import Translator from '../../../shared/i18n/Translator';
import { estPasse, type EvenementDAnnonce as Evenement } from '../../../shared/annonces/evenement';
import { useEvenementDeLaFiche } from '../../../shared/evenements';
import { maintenantMs } from '../../../shared/services/Temps';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { ActionButton } from '../../../shared/ui/ActionButton';
import { Icon, type IconSpec } from '../../../shared/ui/Icon';
import type { BdeAnnonce } from '../services/BdeService';

/** Le jour, dans la grammaire de chaque langue : « jeudi 3 décembre », « Thursday, December 3 », « jueves 3 de diciembre ». */
const FORMAT_DU_JOUR = { fr: 'dddd D MMMM', en: 'dddd, MMMM D', es: 'dddd D [de] MMMM' } as const;

function Rangee({ theme, icone, texte, premiere }: { theme: AppThemeType; icone: IconSpec; texte: string; premiere: boolean }) {
    return (
        <View style={[styles.rangee, !premiere && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
            <Icon icon={icone} size={18} color={theme.fontSecondary} />
            <Text style={[styles.texte, { color: theme.font }]}>{texte}</Text>
        </View>
    );
}

export function EvenementDAnnonce({ theme, annonce, evenement }: { theme: AppThemeType; annonce: BdeAnnonce; evenement: Evenement }) {
    const fiche = useEvenementDeLaFiche(annonce);
    const [enCours, setEnCours] = useState(false);

    const debut = moment(evenement.debut);
    const fin = moment(evenement.fin);
    const jour = debut.format(FORMAT_DU_JOUR[Translator.getLanguage()]);

    const basculer = async () => {
        setEnCours(true);
        try {
            if (fiche.ajoute === true) {
                await fiche.retirer();
                return;
            }
            const { proposer } = await fiche.ajouter();
            if (!proposer) return;
            Alert.alert(
                Translator.get('EVENEMENT_ABONNEMENT_TITRE'),
                Translator.get('EVENEMENT_ABONNEMENT_CORPS'),
                [
                    { text: Translator.get('EVENEMENT_ABONNEMENT_NON'), style: 'cancel', onPress: () => { void fiche.repondre(false); } },
                    { text: Translator.get('EVENEMENT_ABONNEMENT_OUI'), onPress: () => { void fiche.repondre(true); } },
                ],
                // Fermer sans repondre vaut « pas maintenant » : la proposition ne revient pas.
                { cancelable: true, onDismiss: () => { void fiche.repondre(false); } },
            );
        } finally {
            setEnCours(false);
        }
    };

    return (
        <View style={styles.bloc}>
            <View style={[styles.carte, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Rangee theme={theme} premiere icone={{ name: 'calendar-blank' }} texte={jour.charAt(0).toUpperCase() + jour.slice(1)} />
                <Rangee theme={theme} premiere={false} icone={{ name: 'clock-outline' }} texte={`${debut.format('HH:mm')} – ${fin.format('HH:mm')}`} />
                <Rangee theme={theme} premiere={false} icone={{ name: 'map-marker' }} texte={evenement.lieu} />
            </View>
            {estPasse(evenement, maintenantMs()) || fiche.ajoute === null ? null : (
                <ActionButton
                    theme={theme}
                    variant="tonal"
                    label={Translator.get(fiche.ajoute ? 'EVENEMENT_RETIRER' : 'EVENEMENT_AJOUTER')}
                    icon={{ name: fiche.ajoute ? 'calendar-remove' : 'calendar-plus' }}
                    onPress={() => { void basculer(); }}
                    disabled={enCours}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    bloc: {
        marginBottom: tokens.space.lg,
        gap: tokens.space.sm,
    },
    carte: {
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    rangee: {
        minHeight: 48,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.sm,
    },
    texte: {
        flex: 1,
        fontSize: tokens.fontSize.md,
    },
});
