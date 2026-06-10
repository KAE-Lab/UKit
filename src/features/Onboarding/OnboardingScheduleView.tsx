import React, { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ICalParserService } from '../Planning/services/ICalParserService';
import { SettingsManager } from '../../shared/services/AppCore';
import { tokens } from '../../shared/theme/Theme';
import Translator from '../../shared/i18n/Translator';
import { UnifiedTouchable } from '../../shared/ui/UnifiedTouchable';

export default function OnboardingScheduleView({ themeObj, onComplete, onOpenTutorial }) {
    const [icalUrl, setIcalUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSkipWarning, setShowSkipWarning] = useState(false);

    const handleIcalSubmit = async () => {
        if (!icalUrl.trim()) {
            Alert.alert(Translator.get('ERROR'), Translator.get('ENTER_VALID_URL'));
            return;
        }
        
        setLoading(true);
        try {
            const events = await ICalParserService.fetchAndParseICal(icalUrl.trim());
            if (events && events.length > 0) {
                // Success: save source and complete
                SettingsManager.setScheduleSource({ type: 'ical_url', url: icalUrl.trim() });
                onComplete();
            } else {
                Alert.alert(Translator.get('ERROR'), Translator.get('INVALID_ICAL_URL'));
            }
        } catch (error) {
            Alert.alert(Translator.get('ERROR'), Translator.get('ICAL_FETCH_ERROR'));
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        setShowSkipWarning(true);
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: themeObj.cardBackground, borderRadius: tokens.radius.lg, padding: tokens.space.md, marginBottom: tokens.space.lg, borderWidth: 1, borderColor: themeObj.border, ...tokens.shadow.sm }}>
                <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: themeObj.font, marginBottom: tokens.space.sm }}>
                    {Translator.get('ICAL_LINK_TITLE')}
                </Text>

                <Text style={{ fontSize: tokens.fontSize.sm, color: themeObj.fontSecondary, marginBottom: tokens.space.md, lineHeight: 20 }}>
                    {Translator.get('FALLBACK_ICAL_HINT')}
                </Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeObj.greyBackground, borderRadius: tokens.radius.md, paddingHorizontal: tokens.space.sm, marginBottom: tokens.space.md }}>
                    <MaterialCommunityIcons name="link" size={20} color={themeObj.fontSecondary} style={{ marginRight: tokens.space.xs }} />
                    <TextInput 
                        autoCorrect={false} 
                        style={{ flex: 1, paddingVertical: 12, color: themeObj.font, fontSize: tokens.fontSize.sm }} 
                        value={icalUrl}
                        onChangeText={setIcalUrl}
                        placeholder="https://.../export.ics" 
                        placeholderTextColor={themeObj.fontSecondary} 
                        autoCapitalize="none"
                        keyboardType="url"
                    />
                </View>

                <UnifiedTouchable onPress={onOpenTutorial} style={{ marginBottom: tokens.space.lg }}>
                    <Text style={{ color: themeObj.primary, fontSize: tokens.fontSize.sm, textDecorationLine: 'underline' }}>
                        {Translator.get('HOW_TO_FIND_LINK')}
                    </Text>
                </UnifiedTouchable>

                <UnifiedTouchable 
                    onPress={handleIcalSubmit}
                    disabled={loading || !icalUrl.trim()}
                    style={{
                        backgroundColor: (loading || !icalUrl.trim()) ? themeObj.greyBackground : themeObj.primary,
                        borderRadius: tokens.radius.md,
                        paddingVertical: tokens.space.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row'
                    }}
                >
                    {loading ? (
                        <ActivityIndicator color={themeObj.background} />
                    ) : (
                        <Text style={{ color: (!icalUrl.trim()) ? themeObj.fontSecondary : '#ffffff', fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold }}>
                            {Translator.get('VALIDATE_LINK')}
                        </Text>
                    )}
                </UnifiedTouchable>

                <UnifiedTouchable 
                    onPress={handleSkip}
                    style={{
                        marginTop: tokens.space.md,
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ color: themeObj.fontSecondary, fontSize: tokens.fontSize.sm, fontWeight: '600' }}>
                        {Translator.get('SKIP')}
                    </Text>
                </UnifiedTouchable>
            </View>

            <Modal visible={showSkipWarning} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: tokens.space.lg }}>
                    <View style={{ backgroundColor: themeObj.cardBackground, borderRadius: tokens.radius.lg, padding: tokens.space.xl, width: '100%', maxWidth: 400, ...tokens.shadow.lg }}>
                        <View style={{ alignItems: 'center', marginBottom: tokens.space.lg }}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={themeObj.accentFont || '#e74c3c'} style={{ marginBottom: tokens.space.sm }} />
                            <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: 'bold', color: themeObj.font, textAlign: 'center' }}>
                                {Translator.get('SKIP_WARNING_TITLE')}
                            </Text>
                        </View>
                        <Text style={{ fontSize: tokens.fontSize.sm, color: themeObj.fontSecondary, marginBottom: tokens.space.xl, textAlign: 'center', lineHeight: 22 }}>
                            {Translator.get('SKIP_WARNING_DESC')}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: tokens.space.md }}>
                            <UnifiedTouchable 
                                onPress={() => setShowSkipWarning(false)} 
                                style={{ flex: 1, paddingVertical: tokens.space.md, borderRadius: tokens.radius.md, backgroundColor: themeObj.greyBackground, alignItems: 'center' }}
                            >
                                <Text style={{ color: themeObj.font, fontWeight: '600' }}>{Translator.get('CANCEL')}</Text>
                            </UnifiedTouchable>
                            <UnifiedTouchable 
                                onPress={() => {
                                    setShowSkipWarning(false);
                                    SettingsManager.setScheduleSource({ type: 'celcat', url: '' });
                                    onComplete();
                                }} 
                                style={{ flex: 1, paddingVertical: tokens.space.md, borderRadius: tokens.radius.md, backgroundColor: themeObj.accentFont || '#e74c3c', alignItems: 'center' }}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: '600' }}>{Translator.get('SKIP_ANYWAY')}</Text>
                            </UnifiedTouchable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
