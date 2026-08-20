import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { presenterEchec } from '../services/ScolariteMapping';

/**
 * Rangée de section « Messagerie », style liste groupée native.
 * Affiche le nombre de mails non lus + l'adresse, ouvre la webview au tap.
 *
 * Depuis le jalon 6-F, la rangée porte aussi **l'échec** du parcours chaud. Sans ça, une messagerie
 * injoignable laissait l'indicateur tourner indéfiniment : l'utilisateur ne pouvait pas distinguer
 * « ça charge » de « ça a échoué », ce qui est exactement l'erreur avalée que la Phase 6 supprime.
 */
/** Ce que la rangée annonce : l'échec s'il y en a un, sinon le compte, accordé. */
const libelle = (echec, unread) => {
    if (echec) return Translator.get(presenterEchec(echec).messageKey);
    if (unread == null || unread <= 0) return Translator.get('MAILBOX_NO_UNREAD');
    return Translator.get(unread === 1 ? 'MAILBOX_UNREAD_ONE' : 'MAILBOX_UNREAD_MANY', unread);
};

/**
 * Ce que la rangée montre, décidé hors du rendu.
 *
 * Un échec **silencieux** est un run annulé : l'utilisateur est déjà parti, il n'y a rien à lui
 * dire, et la rangée se comporte comme s'il n'y avait pas eu d'échec.
 */
const etatDeLaRangee = ({ mailData, status, failure }) => {
    const echec = failure && !failure.silent ? failure : null;
    const unread = mailData?.unreadCount;

    return {
        echec,
        unread,
        loading: !echec && !mailData && (status === 'connecting' || status === 'scraping'),
        hasUnread: !echec && unread != null && unread > 0,
    };
};

const MailboxRow = ({ mailData, coldData, status, failure, color, theme, onPress }) => {
    const { echec, unread, loading, hasUnread } = etatDeLaRangee({ mailData, status, failure });
    const emailAddress = coldData?.emailAddress;
    const teinte = echec ? theme.accentFont : color;

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            style={[styles.row, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        >
            <View style={[styles.iconWrap, { backgroundColor: `${teinte}1A` }]}>
                <MaterialCommunityIcons
                    name={echec ? 'email-alert-outline' : 'email-outline'}
                    size={22}
                    color={teinte}
                />
            </View>

            <View style={styles.textWrap}>
                <Text
                    style={[styles.title, { color: echec ? theme.fontSecondary : theme.font }]}
                    numberOfLines={2}
                >
                    {libelle(echec, unread)}
                </Text>
                {emailAddress ? (
                    <Text
                        style={[styles.subtitle, { color: theme.fontSecondary }]}
                        numberOfLines={1}
                    >
                        {emailAddress}
                    </Text>
                ) : null}
            </View>

            {loading ? (
                <ActivityIndicator size="small" color={color} />
            ) : (
                <>
                    {hasUnread && (
                        <View style={[styles.badge, { backgroundColor: color }]}>
                            <Text style={styles.badgeText}>{unread}</Text>
                        </View>
                    )}
                    <MaterialIcons name="chevron-right" size={24} color={theme.fontSecondary} />
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: tokens.space.md,
        paddingVertical: tokens.space.md,
        paddingHorizontal: tokens.space.md,
        borderRadius: tokens.radius.lg,
        borderWidth: 1,
        gap: tokens.space.md,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: tokens.radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textWrap: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: tokens.fontSize.md,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: tokens.fontSize.sm,
    },
    badge: {
        borderRadius: tokens.radius.pill,
        paddingHorizontal: tokens.space.sm,
        paddingVertical: 2,
        minWidth: 24,
        alignItems: 'center',
    },
    badgeText: {
        fontSize: tokens.fontSize.xs,
        color: '#fff',
        fontWeight: '700',
    },
});

export default MailboxRow;
