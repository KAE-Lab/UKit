import React, { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ICalParserService } from '../Planning/services/ICalParserService';
import { SettingsManager } from '../../shared/services/AppCore';
import { tokens } from '../../shared/theme/Theme';
import Translator from '../../shared/i18n/Translator';
import { UnifiedTouchable } from '../../shared/ui/UnifiedTouchable';

export default function OnboardingScheduleView({ themeObj, onComplete, onOpenTutorial }) {
    const [icalUrl, setIcalUrl] = useState('');
    const [loading, setLoading] = useState(false);

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

    return (
        <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: themeObj.cardBackground, borderRadius: tokens.radius.lg, padding: tokens.space.md, marginBottom: tokens.space.lg, borderWidth: 1, borderColor: themeObj.border, ...tokens.shadow.sm }}>
                <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: themeObj.font, marginBottom: tokens.space.md }}>
                    {Translator.get('ICAL_LINK_TITLE')}
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
            </View>
        </View>
    );
}
