import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { tokens } from '../../shared/theme/Theme';
import Translator from '../../shared/i18n/Translator';

interface ICalTutorialModalProps {
    themeObj: any;
}

const ICalTutorialModal = forwardRef<BottomSheetModal, ICalTutorialModalProps>(({ themeObj }, ref) => {
    const snapPoints = useMemo(() => ['50%', '90%'], []);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
            />
        ),
        []
    );

    return (
        <BottomSheetModal
            ref={ref}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose={true}
            backdropComponent={renderBackdrop}
            backgroundStyle={{ backgroundColor: themeObj.background }}
            handleIndicatorStyle={{ backgroundColor: themeObj.fontSecondary }}
        >
            <BottomSheetScrollView style={{ flex: 1, padding: tokens.space.md }}>
                <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: themeObj.font, marginBottom: tokens.space.lg }}>
                    {Translator.get('HOW_TO_FIND_LINK')}
                </Text>

                <View style={{ backgroundColor: themeObj.cardBackground, borderRadius: tokens.radius.lg, padding: tokens.space.md, marginBottom: tokens.space.lg, borderWidth: 1, borderColor: themeObj.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.md }}>
                        <MaterialCommunityIcons name="web" size={24} color={themeObj.primary} style={{ marginRight: tokens.space.sm }} />
                        <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: themeObj.font }}>
                            {Translator.get('TUTORIAL_SATELLYS_TITLE')}
                        </Text>
                    </View>
                    
                    <View style={{ marginLeft: tokens.space.sm }}>
                        <Text style={{ color: themeObj.font, marginBottom: tokens.space.sm, lineHeight: 22 }}>
                            <Text style={{ fontWeight: tokens.fontWeight.bold }}>1. </Text>
                            {Translator.get('TUTORIAL_SATELLYS_STEP_1')}
                        </Text>
                        <Text style={{ color: themeObj.font, marginBottom: tokens.space.sm, lineHeight: 22 }}>
                            <Text style={{ fontWeight: tokens.fontWeight.bold }}>2. </Text>
                            {Translator.get('TUTORIAL_SATELLYS_STEP_2')}
                        </Text>
                        <Text style={{ color: themeObj.font, marginBottom: tokens.space.sm, lineHeight: 22 }}>
                            <Text style={{ fontWeight: tokens.fontWeight.bold }}>3. </Text>
                            {Translator.get('TUTORIAL_SATELLYS_STEP_3')} <Text style={{ fontWeight: tokens.fontWeight.bold }}>VCalendar</Text> (ou iCal).
                        </Text>
                        <Text style={{ color: themeObj.font, marginBottom: tokens.space.sm, lineHeight: 22 }}>
                            <Text style={{ fontWeight: tokens.fontWeight.bold }}>4. </Text>
                            {Translator.get('TUTORIAL_SATELLYS_STEP_4')} <Text style={{ fontWeight: tokens.fontWeight.bold }}>{Translator.get('TUTORIAL_SATELLYS_STEP_4_BOLD')}</Text> {Translator.get('TUTORIAL_SATELLYS_STEP_4_END')}
                        </Text>
                        <Text style={{ color: themeObj.font, marginBottom: tokens.space.sm, lineHeight: 22 }}>
                            <Text style={{ fontWeight: tokens.fontWeight.bold }}>5. </Text>
                            {Translator.get('TUTORIAL_SATELLYS_STEP_5')} <Text style={{ fontWeight: tokens.fontWeight.bold }}>{Translator.get('TUTORIAL_SATELLYS_STEP_5_BOLD')}</Text>.
                        </Text>
                        <Text style={{ color: themeObj.font, lineHeight: 22 }}>
                            <Text style={{ fontWeight: tokens.fontWeight.bold }}>6. </Text>
                            {Translator.get('TUTORIAL_SATELLYS_STEP_6')}
                        </Text>
                    </View>
                </View>

                <View style={{ backgroundColor: themeObj.cardBackground, borderRadius: tokens.radius.lg, padding: tokens.space.md, marginBottom: tokens.space.xxl, borderWidth: 1, borderColor: themeObj.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.md }}>
                        <MaterialCommunityIcons name="calendar-export" size={24} color={themeObj.primary} style={{ marginRight: tokens.space.sm }} />
                        <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: themeObj.font }}>
                            {Translator.get('TUTORIAL_OTHER_TITLE')}
                        </Text>
                    </View>
                    
                    <Text style={{ color: themeObj.font, marginBottom: tokens.space.sm, lineHeight: 22 }}>
                        {Translator.get('TUTORIAL_OTHER_DESC_1')}
                    </Text>
                    <Text style={{ color: themeObj.font, lineHeight: 22 }}>
                        {Translator.get('TUTORIAL_OTHER_DESC_2')}
                    </Text>
                </View>
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
});

export default ICalTutorialModal;
