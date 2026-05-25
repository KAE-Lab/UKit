import React, { useContext } from 'react';
import { View, Text, StyleSheet, Image, Animated, TouchableOpacity, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaInsetsContext, SafeAreaView } from 'react-native-safe-area-context';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';
import { BdeAnnonce } from '../services/BdeService';

export interface BdeDetailsRouteParams {
    annonce?: BdeAnnonce;
}

export interface BdeDetailsScreenProps {
    route: { params: BdeDetailsRouteParams };
    navigation: { goBack: () => void; navigate?: (screen: string) => void; [key: string]: unknown };
    onAnimatedScroll?: (event: unknown) => void;
}

const BdeDetailsScreen = ({ route, navigation, onAnimatedScroll }: BdeDetailsScreenProps) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const { annonce } = route.params || {};

    if (!annonce) return null;

    const handlePressCTA = async () => {
        if (annonce.cta_link) {
            const supported = await Linking.canOpenURL(annonce.cta_link);
            if (supported) {
                await Linking.openURL(annonce.cta_link);
            }
        }
    };

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={{ flex: 1, backgroundColor: theme.background }}>
                    <Animated.ScrollView 
                        onScroll={onAnimatedScroll}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingTop: (insets?.top || 0) + 70, paddingBottom: tokens.space.xxl }}
                    >
                        <View style={{ width: '100%', height: 250, paddingHorizontal: tokens.space.sm }}>
                            <View style={{ width: '100%', height: '100%', backgroundColor: theme.greyBackground, borderRadius: tokens.radius.lg, overflow: 'hidden' }}>
                                {annonce.image_url ? (
                                    <Image source={{ uri: annonce.image_url }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                                ) : null}
                            </View>
                        </View>

                        <View style={{ paddingHorizontal: tokens.space.sm, paddingTop: tokens.space.lg }}>
                            <Text style={{ fontSize: 24, fontWeight: tokens.fontWeight.bold, color: theme.font, marginBottom: tokens.space.md }}>
                                {annonce.title}
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: tokens.space.md }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.primary}15`, paddingHorizontal: tokens.space.sm, paddingVertical: 4, borderRadius: tokens.radius.md, marginRight: tokens.space.sm, marginBottom: tokens.space.sm }}>
                                    <MaterialCommunityIcons name="account" size={14} color={theme.primary} />
                                    <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold, color: theme.primary, marginLeft: 4 }}>
                                        {annonce.issuer_name}
                                    </Text>
                                </View>

                                {annonce.info_label ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.primary}15`, paddingHorizontal: tokens.space.sm, paddingVertical: 4, borderRadius: tokens.radius.md, marginBottom: tokens.space.sm }}>
                                        <MaterialCommunityIcons name="information-outline" size={14} color={theme.primary} />
                                        <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold, color: theme.primary, marginLeft: 4 }}>
                                            {annonce.info_label}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            <Text style={{ fontSize: tokens.fontSize.md, color: theme.font, lineHeight: 24 }}>
                                {annonce.long_desc}
                            </Text>
                        </View>
                    </Animated.ScrollView>

                    {annonce.cta_text && annonce.cta_link ? (
                        <SafeAreaView 
                            edges={['bottom']}
                            style={{ 
                                paddingTop: tokens.space.md,
                                paddingHorizontal: tokens.space.md,
                                backgroundColor: theme.cardBackground,
                                borderTopWidth: 1,
                                borderTopColor: theme.border,
                            }}
                        >
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={handlePressCTA}
                                style={{
                                    backgroundColor: theme.primary,
                                    borderRadius: tokens.radius.md,
                                    paddingVertical: 14,
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold }}>
                                    {annonce.cta_text}
                                </Text>
                            </TouchableOpacity>
                        </SafeAreaView>
                    ) : null}
                </View>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});

export default withHeaderAnimation(BdeDetailsScreen);
