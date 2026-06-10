import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { tokens } from '../../../shared/theme/Theme';
import { UnifiedTouchable } from '../../../shared/ui/UnifiedTouchable';

/**
 * Rangée de section « Messagerie », style liste groupée native.
 * Affiche le nombre de mails non lus + l'adresse, ouvre la webview au tap.
 */
const MailboxRow = ({ mailData, coldData, status, color, theme, onPress }) => {
    const loading = (status === 'connecting' || status === 'scraping') && !mailData;
    const unread = mailData?.unreadCount;
    const hasUnread = unread != null && `${unread}` !== '0' && `${unread}` !== '';
    const emailAddress = coldData?.emailAddress;

    return (
        <UnifiedTouchable
            activeOpacity={0.7}
            onPress={onPress}
            style={[styles.row, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        >
            <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
                <MaterialCommunityIcons name="email-outline" size={22} color={color} />
            </View>

            <View style={styles.textWrap}>
                <Text style={[styles.title, { color: theme.font, fontFamily: 'Montserrat_600SemiBold' }]}>
                    {hasUnread
                        ? `${unread} message${`${unread}` === '1' ? '' : 's'} non lu${`${unread}` === '1' ? '' : 's'}`
                        : 'Aucun message non lu'}
                </Text>
                {emailAddress ? (
                    <Text
                        style={[styles.subtitle, { color: theme.fontSecondary, fontFamily: 'Montserrat_500Medium' }]}
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
        </UnifiedTouchable>
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
