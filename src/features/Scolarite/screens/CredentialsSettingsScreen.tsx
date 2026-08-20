import React, { useState, useContext } from 'react';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';

import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import style, { tokens } from '../../../shared/theme/Theme';
import { SourceFailureNotice } from '../../../shared/ui/SourceFailureNotice';
import { useCredentials } from '../services/CredentialsContext';
import { portailAbsent } from '../services/ScolariteSession';
import ScolariteLoginView from '../components/ScolariteLoginView';

const InfoRow = ({ label, value, theme }) => (
    <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: theme.fontSecondary }]}>
            {label}
        </Text>
        <Text style={[styles.infoValue, { color: theme.font }]} numberOfLines={1}>
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

/** Les identifiants enregistres, dont le mot de passe que la biometrie seule devoile. */
const IdentifiantsSection = ({ theme, credentials, passwordVisible, onTogglePassword }) => (
    <SectionCard title={Translator.get('CREDENTIALS_SETTINGS')} theme={theme}>
        <InfoRow label={Translator.get('USERNAME')} value={credentials?.username} theme={theme} />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.fontSecondary }]}>
                {Translator.get('PASSWORD')}
            </Text>
            <View style={styles.passwordRow}>
                <Text style={[styles.infoValue, { color: theme.font, flex: 1 }]} numberOfLines={1}>
                    {passwordVisible ? credentials?.password : '••••••••'}
                </Text>
                <TouchableOpacity onPress={onTogglePassword} hitSlop={8}>
                    <MaterialCommunityIcons
                        name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.fontSecondary}
                    />
                </TouchableOpacity>
            </View>
        </View>
    </SectionCard>
);

/** L'etablissement ne publie aucun portail : il n'y a pas de compte a regler ici. */
const PortailAbsent = ({ theme }) => (
    <SafeAreaInsetsContext.Consumer>
        {(insets) => (
            <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.background, paddingTop: (insets?.top || 0) + 65 }}>
                <SourceFailureNotice failure={portailAbsent()} theme={theme} />
            </View>
        )}
    </SafeAreaInsetsContext.Consumer>
);

/**
 * Aucun compte enregistre : on propose de se connecter, pas une fiche vide.
 *
 * C'est le meme formulaire que partout ailleurs, et il referme l'ecran une fois la session partie —
 * on revient donc la d'ou l'on venait, le plus souvent les Reglages.
 */
const CompteADemander = ({ theme, onSuccess }) => (
    <SafeAreaInsetsContext.Consumer>
        {(insets) => (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
                <ScolariteLoginView
                    theme={theme}
                    color={theme.accent ?? theme.primary}
                    topPadding={(insets?.top || 0) + 65}
                    onSuccess={onSuccess}
                    compact
                />
            </View>
        )}
    </SafeAreaInsetsContext.Consumer>
);

/**
 * Les reglages du compte universitaire : ce qui est enregistre, et la deconnexion.
 *
 * **Sans compte, il propose de se connecter** au lieu d'afficher sa fiche vide. L'ecran a toujours
 * suppose qu'on y arrivait connecte — c'etait vrai tant que son seul chemin etait le bouton d'action
 * de l'onglet Scolarite, qui n'existe qu'apres une session. Le jalon 6-J y ajoute une entree depuis
 * les Reglages, atteignable a tout moment : la fiche s'affichait alors avec six tirets et un bouton
 * « Se deconnecter » qui n'avait rien a deconnecter. Mesure sur appareil.
 *
 * Voir docs/features/scolarite.md.
 */

/**
 * Les trois gestes qu'on peut poser sur son compte, du plus doux au plus destructif.
 *
 * Sortis de l'ecran pour le garder sous la limite de lignes — meme decoupage que
 * `CampusLayoutComponents` pour `CampusListLayout`. L'ordre porte du sens : actualiser ne perd rien,
 * ressaisir ne perd que le mot de passe garde, se deconnecter efface tout.
 */
const ActionsDuCompte = ({ theme, onRafraichir, onRessaisir, onDeconnecter }) => (
    <>
        {/*
          * Redemander un parcours froid, sans se deconnecter : le mode se deduisait de la presence des
          * donnees froides, sans aucun moyen de forcer (jalon 6-K, docs/defauts-fonctionnels.md).
          */}
        <TouchableOpacity style={[styles.actionButton, { borderColor: theme.primary }]} onPress={onRafraichir} activeOpacity={0.8}>
            <MaterialCommunityIcons name="refresh" size={20} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>{Translator.get('REFRESH_RECORD')}</Text>
        </TouchableOpacity>
        <Text style={[styles.actionHint, { color: theme.fontSecondary }]}>{Translator.get('REFRESH_RECORD_DESC')}</Text>

        {/*
          * Ressaisir sans deconnecter : un mot de passe change a l'universite n'invalide pas le compte,
          * et passer par la deconnexion effacerait aussi l'identite deja lue.
          */}
        <TouchableOpacity style={[styles.actionButton, { borderColor: theme.primary }]} onPress={onRessaisir} activeOpacity={0.8}>
            <MaterialCommunityIcons name="account-key-outline" size={20} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>{Translator.get('REENTER_CREDENTIALS')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { borderColor: theme.danger }]} onPress={onDeconnecter} activeOpacity={0.8}>
            <MaterialCommunityIcons name="logout" size={20} color={theme.danger} />
            <Text style={[styles.actionText, { color: theme.danger }]}>{Translator.get('LOGOUT')}</Text>
        </TouchableOpacity>
    </>
);

const CredentialsSettingsScreen = () => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const navigation = useNavigation();

    const route = useRoute<RouteProp<{ p: { ressaisie?: boolean } }, 'p'>>();

    const { credentials, coldData, logout, rafraichirDossier, portailDisponible } = useCredentials();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    /**
     * Ressaisir sans se deconnecter.
     *
     * Un mot de passe change a l'universite n'invalide pas le compte, seulement le mot de passe garde.
     * Passer par la deconnexion pour le corriger effacait aussi l'identite deja lue et obligeait a
     * retaper l'identifiant. `validateAndSave` rejoue de toute facon un parcours complet : il suffit
     * de rendre le formulaire atteignable (jalon 6-K, docs/defauts-fonctionnels.md).
     */
    const [ressaisie, setRessaisie] = useState(route.params?.ressaisie === true);

    if (!portailDisponible) return <PortailAbsent theme={theme} />;
    if (!credentials || ressaisie) {
        return <CompteADemander theme={theme} onSuccess={() => { setRessaisie(false); navigation.goBack(); }} />;
    }

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
                                <InfoRow label={Translator.get('USERNAME')} value={credentials?.username} theme={theme} />
                                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                <InfoRow label={coldData?.firstName ? 'Prénom' : ''} value={coldData?.firstName} theme={theme} />
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

                            <IdentifiantsSection
                                theme={theme}
                                credentials={credentials}
                                passwordVisible={passwordVisible}
                                onTogglePassword={handleShowPassword}
                            />

                            <ActionsDuCompte
                                theme={theme}
                                onRafraichir={() => { rafraichirDossier(); navigation.goBack(); }}
                                onRessaisir={() => setRessaisie(true)}
                                onDeconnecter={() => setShowLogoutModal(true)}
                            />

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
                <MaterialCommunityIcons name="logout" size={48} color={theme.danger} style={{ marginBottom: tokens.space.md }} />
                <Text style={[styles.modalText, { color: theme.font }]}>
                    {Translator.get('CONFIRM_LOGOUT')}
                </Text>
                <View style={styles.modalActions}>
                    <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, marginRight: tokens.space.sm }]}
                        onPress={onClose}
                    >
                        <Text style={{ color: theme.fontSecondary, fontWeight: 'bold' }}>{Translator.get('CANCEL')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: theme.danger, marginLeft: tokens.space.sm }]}
                        onPress={onConfirm}
                    >
                        {/* `lightFont` et non `accentFont` : ce dernier est le rouge destructif lui-meme. */}
                        <Text style={{ color: theme.lightFont, fontWeight: 'bold' }}>{Translator.get('CONFIRM')}</Text>
                    </TouchableOpacity>
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
    /** Un bouton d'action bordé, dont la teinte vient du thème : `primary` ou `danger`. */
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.space.sm,
        borderWidth: 1,
        borderRadius: tokens.radius.lg,
        paddingVertical: tokens.space.md,
        marginTop: tokens.space.sm,
    },
    actionText: {
        fontSize: tokens.fontSize.md,
    },
    actionHint: {
        fontSize: tokens.fontSize.sm,
        textAlign: 'center',
        marginTop: tokens.space.xs,
        marginHorizontal: tokens.space.md,
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
