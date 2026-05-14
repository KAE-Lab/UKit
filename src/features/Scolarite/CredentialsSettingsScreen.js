import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppContext } from '../../shared/services/AppCore';
import Translator from '../../shared/i18n/Translator';
import style, { tokens } from '../../shared/theme/Theme';
import Button from '../../shared/ui/Button';
import SecureStoreService from '../../shared/services/SecureStoreService';

const SettingsTextHeader = ({ theme, text }) => {
    if (!theme?.separationText) return null;
    return <Text style={theme.separationText}>{text.toUpperCase()}</Text>;
};

const CredentialsSettingsScreen = () => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const themeSettings = theme.settings;
    const navigation = useNavigation();

    const [loading, setLoading] = useState(true);
    const [savedUsername, setSavedUsername] = useState(null);
    const [hasCredentials, setHasCredentials] = useState(false);

    const [usernameInput, setUsernameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [message, setMessage] = useState('');

    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        loadCredentials();
    }, []);

    const loadCredentials = async () => {
        setLoading(true);
        const credentials = await SecureStoreService.getCredentials();
        if (credentials && credentials.username && credentials.password) {
            setSavedUsername(credentials.username);
            setHasCredentials(true);
            setUsernameInput('');
            setPasswordInput('');
        } else {
            setSavedUsername(null);
            setHasCredentials(false);
        }
        setLoading(false);
    };

    const confirmSave = async () => {
        setShowSaveModal(false);
        if (!usernameInput || !passwordInput) return;
        setLoading(true);
        const success = await SecureStoreService.saveCredentials(usernameInput, passwordInput);
        if (success) {
            setMessage(Translator.get('CREDENTIALS_SAVED_SUCCESS'));
            await loadCredentials();
        } else {
            setMessage('Erreur lors de la sauvegarde.');
        }
        setLoading(false);
        setTimeout(() => setMessage(''), 3000);
    };

    const confirmDelete = async () => {
        setShowDeleteModal(false);
        setLoading(true);
        const success = await SecureStoreService.deleteCredentials();
        if (success) {
            setMessage(Translator.get('CREDENTIALS_DELETED_SUCCESS'));
            await loadCredentials();
        } else {
            setMessage('Erreur lors de la suppression.');
        }
        setLoading(false);
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
                    <KeyboardAvoidingView 
                        style={{ flex: 1 }} 
                        behavior={Platform.OS === 'ios' ? 'padding' : null}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
                    >
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ paddingTop: (insets?.top || 0) + 65, paddingBottom: tokens.space.xxl + 80 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <SettingsTextHeader theme={themeSettings} text={Translator.get('LOGS')} />

                            {loading ? (
                                <View style={{ padding: tokens.space.md, alignItems: 'center' }}>
                                    <Text style={{ color: theme.fontSecondary }}>Chargement...</Text>
                                </View>
                            ) : hasCredentials ? (
                                <View style={{ marginHorizontal: tokens.space.md, marginTop: tokens.space.sm }}>
                                    <View style={{ backgroundColor: theme.cardBackground, borderRadius: tokens.radius.lg, padding: tokens.space.md, borderWidth: 1, borderColor: theme.border, marginBottom: tokens.space.md }}>
                                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginBottom: tokens.space.xs }}>
                                            {Translator.get('USERNAME')}
                                        </Text>
                                        <Text style={{ fontSize: tokens.fontSize.lg, color: theme.font, fontWeight: tokens.fontWeight.bold }}>
                                            {savedUsername}
                                        </Text>
                                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginTop: tokens.space.md, marginBottom: tokens.space.xs }}>
                                            {Translator.get('PASSWORD')}
                                        </Text>
                                        <Text style={{ fontSize: tokens.fontSize.lg, color: theme.font, fontWeight: tokens.fontWeight.bold }}>
                                            ••••••••••••
                                        </Text>
                                    </View>

                                    <Button
                                        theme={themeSettings}
                                        onPress={() => setShowDeleteModal(true)}
                                        leftIcon="delete-outline"
                                        leftText={Translator.get('DELETE_CREDENTIALS')}
                                    />
                                    {message ? <Text style={{ color: '#43A047', textAlign: 'center', marginTop: tokens.space.sm }}>{message}</Text> : null}
                                </View>
                            ) : (
                                <View style={{ marginHorizontal: tokens.space.md, marginTop: tokens.space.sm }}>
                                    <View style={{ backgroundColor: theme.cardBackground, borderRadius: tokens.radius.lg, padding: tokens.space.md, borderWidth: 1, borderColor: theme.border, marginBottom: tokens.space.md }}>
                                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, lineHeight: 20, marginBottom: tokens.space.md }}>
                                            {Translator.get('ENTER_CREDENTIALS_DESC')}
                                        </Text>
                                        
                                        <TextInput
                                            style={[styles.textInput, { backgroundColor: theme.background, color: theme.font, borderColor: theme.border }]}
                                            placeholder={Translator.get('USERNAME')}
                                            placeholderTextColor={theme.fontSecondary}
                                            value={usernameInput}
                                            onChangeText={setUsernameInput}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        
                                        <TextInput
                                            style={[styles.textInput, { backgroundColor: theme.background, color: theme.font, borderColor: theme.border, marginTop: tokens.space.sm }]}
                                            placeholder={Translator.get('PASSWORD')}
                                            placeholderTextColor={theme.fontSecondary}
                                            value={passwordInput}
                                            onChangeText={setPasswordInput}
                                            secureTextEntry
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>

                                    <Button
                                        theme={themeSettings}
                                        onPress={() => setShowSaveModal(true)}
                                        leftIcon="content-save-outline"
                                        leftText={Translator.get('SAVE')}
                                        disabled={!usernameInput || !passwordInput}
                                    />
                                    {message ? <Text style={{ color: '#43A047', textAlign: 'center', marginTop: tokens.space.sm }}>{message}</Text> : null}
                                </View>
                            )}

                        </ScrollView>
                    </KeyboardAvoidingView>

                    {/* Modal Save */}
                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={showSaveModal}
                        onRequestClose={() => setShowSaveModal(false)}
                    >
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <View style={{ backgroundColor: theme.cardBackground, padding: tokens.space.lg, borderRadius: tokens.radius.lg, width: '85%', alignItems: 'center', ...tokens.shadow.lg }}>
                                <MaterialCommunityIcons name="content-save" size={48} color={theme.primary} style={{ marginBottom: tokens.space.md }} />
                                <Text style={{ fontSize: tokens.fontSize.md, color: theme.font, textAlign: 'center', marginBottom: tokens.space.lg, fontFamily: 'Montserrat_500Medium' }}>
                                    {Translator.get('CONFIRM_SAVE_CREDENTIALS')}
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                    <TouchableOpacity 
                                        style={{ flex: 1, padding: tokens.space.md, alignItems: 'center', backgroundColor: theme.background, borderRadius: tokens.radius.md, marginRight: tokens.space.sm, borderWidth: 1, borderColor: theme.border }}
                                        onPress={() => setShowSaveModal(false)}
                                    >
                                        <Text style={{ color: theme.fontSecondary, fontWeight: 'bold' }}>{Translator.get('CANCEL')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={{ flex: 1, padding: tokens.space.md, alignItems: 'center', backgroundColor: theme.primary, borderRadius: tokens.radius.md, marginLeft: tokens.space.sm }}
                                        onPress={confirmSave}
                                    >
                                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{Translator.get('CONFIRM')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* Modal Delete */}
                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={showDeleteModal}
                        onRequestClose={() => setShowDeleteModal(false)}
                    >
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <View style={{ backgroundColor: theme.cardBackground, padding: tokens.space.lg, borderRadius: tokens.radius.lg, width: '85%', alignItems: 'center', ...tokens.shadow.lg }}>
                                <MaterialCommunityIcons name="delete-alert" size={48} color="#EF5350" style={{ marginBottom: tokens.space.md }} />
                                <Text style={{ fontSize: tokens.fontSize.md, color: theme.font, textAlign: 'center', marginBottom: tokens.space.lg, fontFamily: 'Montserrat_500Medium' }}>
                                    {Translator.get('CONFIRM_DELETE_CREDENTIALS')}
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                    <TouchableOpacity 
                                        style={{ flex: 1, padding: tokens.space.md, alignItems: 'center', backgroundColor: theme.background, borderRadius: tokens.radius.md, marginRight: tokens.space.sm, borderWidth: 1, borderColor: theme.border }}
                                        onPress={() => setShowDeleteModal(false)}
                                    >
                                        <Text style={{ color: theme.fontSecondary, fontWeight: 'bold' }}>{Translator.get('CANCEL')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={{ flex: 1, padding: tokens.space.md, alignItems: 'center', backgroundColor: '#EF5350', borderRadius: tokens.radius.md, marginLeft: tokens.space.sm }}
                                        onPress={confirmDelete}
                                    >
                                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{Translator.get('CONFIRM')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                </SafeAreaView>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};

const styles = StyleSheet.create({
    textInput: {
        height: 50,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        paddingHorizontal: tokens.space.md,
        fontSize: tokens.fontSize.md,
        fontFamily: 'Montserrat_500Medium',
    }
});

export default CredentialsSettingsScreen;
