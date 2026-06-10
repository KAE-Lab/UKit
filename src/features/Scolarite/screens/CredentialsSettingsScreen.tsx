import React, { useState, useContext } from 'react';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';

import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import style, { tokens } from '../../../shared/theme/Theme';
import { useCredentials } from '../services/CredentialsContext';
import { UnifiedTouchable } from '../../../shared/ui/UnifiedTouchable';

const InfoRow = ({ label, value, theme }) => (
    <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: theme.fontSecondary, fontFamily: 'Montserrat_500Medium' }]}>
            {label}
        </Text>
        <Text style={[styles.infoValue, { color: theme.font, fontFamily: 'Montserrat_600SemiBold' }]} numberOfLines={1}>
            {value || '—'}
        </Text>
    </View>
);

const SectionCard = ({ title, children, theme }) => (
    <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.fontSecondary }]}>
            {title.toUpperCase()}
        </Text>
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            {children}
        </View>
    </View>
);

const CredentialsSettingsScreen = () => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const navigation = useNavigation();

    const { credentials, coldData, logout } = useCredentials();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);

    const handleShowPassword = async () => {
        if (passwordVisible) {
            setPasswordVisible(false);
            return;
        }
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: Translator.get('BIOMETRY_PROMPT'),
                fallbackLabel: Translator.get('BIOMETRY_FALLBACK'),
                disableDeviceFallback: false,
            });
            if (result.success) setPasswordVisible(true);
        } catch {
            // biométrie non disponible, ignorer
        }
    };

    const confirmLogout = async () => {
        setShowLogoutModal(false);
        await logout();
        navigation.goBack();
    };

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingTop: (insets?.top || 0) + 65, paddingBottom: tokens.space.xxl + 80 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={{ marginHorizontal: tokens.space.md, marginTop: tokens.space.sm, gap: tokens.space.sm }}>

                            {/* Section Profil */}
                            <SectionCard title={Translator.get('PROFILE')} theme={theme}>
                                <InfoRow label={Translator.get('USERNAME') || "Nom d'utilisateur"} value={credentials?.username} theme={theme} />
                                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                <InfoRow label={Translator.get('LAST_NAME') || 'Nom'} value={coldData?.lastName} theme={theme} />
                                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                <InfoRow label={Translator.get('FIRST_NAME') || 'Prénom'} value={coldData?.firstName} theme={theme} />
                                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                <InfoRow label={Translator.get('DATE_OF_BIRTH')} value={coldData?.dateOfBirth} theme={theme} />
                            </SectionCard>

                            {/* Section Dossier */}
                            <SectionCard title={Translator.get('DOSSIER')} theme={theme}>
                                <InfoRow label={Translator.get('STUDENT_NUMBER')} value={coldData?.studentNumber} theme={theme} />
                                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                <InfoRow label={Translator.get('STUDENT_INE')} value={coldData?.ine} theme={theme} />
                                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                <InfoRow label={Translator.get('STUDENT_EMAIL')} value={coldData?.emailAddress} theme={theme} />
                            </SectionCard>

                            {/* Section Identifiants */}
                            <SectionCard title={Translator.get('CREDENTIALS_SETTINGS')} theme={theme}>
                                <InfoRow label={Translator.get('USERNAME')} value={credentials?.username} theme={theme} />
                                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, { color: theme.fontSecondary, fontFamily: 'Montserrat_500Medium' }]}>
                                        {Translator.get('PASSWORD')}
                                    </Text>
                                    <View style={styles.passwordRow}>
                                        <Text style={[styles.infoValue, { color: theme.font, fontFamily: 'Montserrat_600SemiBold', flex: 1 }]} numberOfLines={1}>
                                            {passwordVisible ? credentials?.password : '••••••••'}
                                        </Text>
                                        <UnifiedTouchable onPress={handleShowPassword} hitSlop={8}>
                                            <MaterialCommunityIcons
                                                name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                                                size={20}
                                                color={theme.fontSecondary}
                                            />
                                        </UnifiedTouchable>
                                    </View>
                                </View>
                            </SectionCard>

                            {/* Bouton déconnexion */}
                            <UnifiedTouchable
                                style={[styles.logoutButton, { borderColor: '#EF5350' }]}
                                onPress={() => setShowLogoutModal(true)}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons name="logout" size={20} color="#EF5350" />
                                <Text style={[styles.logoutText, { fontFamily: 'Montserrat_600SemiBold' }]}>
                                    {Translator.get('LOGOUT')}
                                </Text>
                            </UnifiedTouchable>

                        </View>
                    </ScrollView>

                    <LogoutModal
                        theme={theme}
                        visible={showLogoutModal}
                        onClose={() => setShowLogoutModal(false)}
                        onConfirm={confirmLogout}
                    />
                </SafeAreaView>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};

const LogoutModal = ({ theme, visible, onClose, onConfirm }) => (
    <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={onClose}
    >
        <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: theme.cardBackground }]}>
                <MaterialCommunityIcons name="logout" size={48} color="#EF5350" style={{ marginBottom: tokens.space.md }} />
                <Text style={[styles.modalText, { color: theme.font }]}>
                    {Translator.get('CONFIRM_LOGOUT')}
                </Text>
                <View style={styles.modalActions}>
                    <UnifiedTouchable
                        style={[styles.modalButton, { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, marginRight: tokens.space.sm }]}
                        onPress={onClose}
                    >
                        <Text style={{ color: theme.fontSecondary, fontWeight: 'bold' }}>{Translator.get('CANCEL')}</Text>
                    </UnifiedTouchable>
                    <UnifiedTouchable
                        style={[styles.modalButton, { backgroundColor: '#EF5350', marginLeft: tokens.space.sm }]}
                        onPress={onConfirm}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{Translator.get('CONFIRM')}</Text>
                    </UnifiedTouchable>
                </View>
            </View>
        </View>
    </Modal>
);

const styles = StyleSheet.create({
    section: {
        gap: tokens.space.xs,
    },
    sectionTitle: {
        fontSize: tokens.fontSize.xs,
        fontFamily: 'Montserrat_600SemiBold',
        letterSpacing: 0.8,
        marginLeft: tokens.space.sm,
        marginBottom: 2,
    },
    card: {
        borderRadius: tokens.radius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm + 2,
        gap: tokens.space.md,
    },
    infoLabel: {
        fontSize: tokens.fontSize.sm,
        flexShrink: 0,
    },
    infoValue: {
        fontSize: tokens.fontSize.sm,
        textAlign: 'right',
        flex: 1,
    },
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: tokens.space.sm,
        justifyContent: 'flex-end',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: tokens.space.md,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.space.sm,
        borderWidth: 1,
        borderRadius: tokens.radius.lg,
        paddingVertical: tokens.space.md,
        marginTop: tokens.space.sm,
    },
    logoutText: {
        color: '#EF5350',
        fontSize: tokens.fontSize.md,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalBox: {
        padding: tokens.space.lg,
        borderRadius: tokens.radius.lg,
        width: '85%',
        alignItems: 'center',
        ...tokens.shadow.lg,
    },
    modalText: {
        fontSize: tokens.fontSize.md,
        textAlign: 'center',
        marginBottom: tokens.space.lg,
        fontFamily: 'Montserrat_500Medium',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        flex: 1,
        padding: tokens.space.md,
        alignItems: 'center',
        borderRadius: tokens.radius.md,
    },
});

export default CredentialsSettingsScreen;
