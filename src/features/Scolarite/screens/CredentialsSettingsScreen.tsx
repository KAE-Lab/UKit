import React, { useState, useContext } from 'react';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, ScrollView, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';

import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import style, { tokens } from '../../../shared/theme/Theme';
import { ActionButton } from '../../../shared/ui/ActionButton';
import { ScreenState } from '../../../shared/ui/ScreenState';
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

/**
 * L'etablissement ne publie aucun portail : il n'y a pas de compte a regler ici.
 *
 * L'ecran calait sa compensation d'en-tete a `+ 65` la ou tout le reste emploie `+ 70`, **en haut
 * seul** : le bloc se posait donc cinq points plus haut que partout ailleurs, et decale vers le bas.
 * `ScreenState` porte la seule valeur du depot (shared/ui/ScreenState).
 */
const PortailAbsent = ({ theme }) => (
    <ScreenState theme={theme}>
        <SourceFailureNotice failure={portailAbsent()} theme={theme} variant="plain" />
    </ScreenState>
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
        <ActionButton
            theme={theme}
            variant="tonal"
            icon={{ name: 'refresh' }}
            label={Translator.get('REFRESH_RECORD')}
            onPress={onRafraichir}
            style={{ marginTop: tokens.space.sm }}
        />

        {/*
          * Ressaisir sans deconnecter : un mot de passe change a l'universite n'invalide pas le compte,
          * et passer par la deconnexion effacerait aussi l'identite deja lue.
          */}
        <ActionButton
            theme={theme}
            variant="tonal"
            icon={{ name: 'account-key-outline' }}
            label={Translator.get('REENTER_CREDENTIALS')}
            onPress={onRessaisir}
            style={{ marginTop: tokens.space.sm }}
        />

        {/* Destructif : la deconnexion efface le trousseau **et** l'identite deja lue. */}
        <ActionButton
            theme={theme}
            variant="destructive"
            icon={{ name: 'logout' }}
            label={Translator.get('LOGOUT')}
            onPress={onDeconnecter}
            style={{ marginTop: tokens.space.sm }}
        />
    </>
);

/**
 * Les deux confirmations de l'ecran, groupees pour le garder sous la limite de lignes — meme decoupage
 * que `ActionsDuCompte` juste au-dessus.
 */
const ConfirmationsDuCompte = ({ theme, refresh, logout }) => (
    <>
        <ConfirmationModal
            theme={theme}
            visible={refresh.visible}
            titre={Translator.get('REFRESH_RECORD')}
            description={Translator.get('REFRESH_RECORD_DESC')}
            confirmer={Translator.get('CONFIRM')}
            onClose={refresh.fermer}
            onConfirm={refresh.confirmer}
        />

        <ConfirmationModal
            theme={theme}
            visible={logout.visible}
            titre={Translator.get('LOGOUT')}
            description={Translator.get('CONFIRM_LOGOUT')}
            confirmer={Translator.get('CONFIRM')}
            onClose={logout.fermer}
            onConfirm={logout.confirmer}
            destructif
        />
    </>
);

const CredentialsSettingsScreen = () => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const navigation = useNavigation();

    const route = useRoute<RouteProp<{ p: { ressaisie?: boolean } }, 'p'>>();

    const { credentials, coldData, logout, rafraichirDossier, portailDisponible } = useCredentials();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showRefreshModal, setShowRefreshModal] = useState(false);
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

    const confirmRefresh = () => {
        setShowRefreshModal(false);
        rafraichirDossier();
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
                                {/* La ligne disparait faute de donnee, au lieu d'afficher un libelle vide. */}
                                {coldData?.firstName ? (
                                    <>
                                        <InfoRow label={Translator.get('FIRST_NAME')} value={coldData.firstName} theme={theme} />
                                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                    </>
                                ) : null}
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
                                onRafraichir={() => setShowRefreshModal(true)}
                                onRessaisir={() => setRessaisie(true)}
                                onDeconnecter={() => setShowLogoutModal(true)}
                            />

                        </View>
                    </ScrollView>

                    <ConfirmationsDuCompte
                        theme={theme}
                        refresh={{ visible: showRefreshModal, fermer: () => setShowRefreshModal(false), confirmer: confirmRefresh }}
                        logout={{ visible: showLogoutModal, fermer: () => setShowLogoutModal(false), confirmer: confirmLogout }}
                    />
                </SafeAreaView>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};

/**
 * Les deux confirmations de cet ecran, dans un seul dialogue parametre.
 *
 * La deconnexion portait un **dialecte de modale a elle seule** — sa propre superposition en
 * `rgba(0,0,0,0.5)`, sa propre boite en 85 % de largeur, ses propres boutons — alors que huit autres
 * modales partagent `theme.settings.popup`. Elle le prend comme les autres.
 *
 * L'actualisation en a gagne une, et ce n'est pas un rangement de texte : elle **rejoue une connexion
 * complete**, ce qui prend l'ecran plusieurs secondes et ne s'annule pas une fois lance. Le depot
 * reserve les confirmations aux gestes couteux (« l'extinction passe par une confirmation, l'allumage
 * non ») — celui-ci l'est par sa **duree**, pas par ce qu'il detruit, et c'est la raison de sa garde.
 * Son explication vit donc la, au moment de decider, au lieu d'etre une ligne d'aide sous le bouton
 * que personne ne lisait — et qui cassait au passage le rythme des trois actions.
 */
const ConfirmationModal = ({ theme, visible, titre, description, confirmer, onClose, onConfirm, destructif = false }) => (
    <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={onClose}
    >
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={theme.settings.popup.background}>
                <TouchableWithoutFeedback>
                    <View style={theme.settings.popup.container}>
                        <View style={theme.settings.popup.header}>
                            <Text style={theme.settings.popup.textHeader}>{titre}</Text>
                        </View>
                        <Text style={theme.settings.popup.textDescription}>{description}</Text>
                        <View style={theme.settings.popup.buttonContainer}>
                            <TouchableOpacity style={theme.settings.popup.buttonSecondary} onPress={onClose}>
                                <Text style={theme.settings.popup.buttonTextSecondary}>{Translator.get('CANCEL')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={destructif ? theme.settings.popup.buttonDestructive : theme.settings.popup.buttonMain}
                                onPress={onConfirm}
                            >
                                <Text style={destructif ? theme.settings.popup.buttonTextDestructive : theme.settings.popup.buttonTextMain}>
                                    {confirmer}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
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
        marginBottom: tokens.space.xxs,
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
});

export default CredentialsSettingsScreen;
