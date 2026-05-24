import React, { useEffect, useState, useContext, useRef } from 'react';
import { Animated, View, Text, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import Translator from '../../shared/i18n/Translator';
import BdeService, { BdeAnnonce } from './BdeService';
import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import { withHeaderAnimation } from '../../shared/navigation/NavHelpers';

export interface BdeScreenProps {
    navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
    onAnimatedScroll?: (event: unknown) => void;
}

function BdeScreen({ navigation, onAnimatedScroll }: BdeScreenProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const insets = useSafeAreaInsets();

    const [annonces, setAnnonces] = useState<BdeAnnonce[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const mountedRef = useRef<boolean>(true);
    useEffect(() => { return () => { mountedRef.current = false; }; }, []);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await BdeService.fetchAnnonces();
        if (!mountedRef.current) return;
        setAnnonces(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            <View style={{ flex: 1 }}>
                <Animated.FlatList
                    data={annonces}
                    onScroll={onAnimatedScroll}
                    scrollEventThrottle={16}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: (insets.top || 0) + 70, paddingVertical: tokens.space.sm, flexGrow: 1 }}
                    ListEmptyComponent={() => (
                        <View style={{ 
                            alignItems: 'center', 
                            paddingVertical: tokens.space.xl, 
                            paddingHorizontal: tokens.space.lg,
                            marginHorizontal: tokens.space.sm,
                            backgroundColor: theme.cardBackground, 
                            borderRadius: tokens.radius.lg, 
                            borderWidth: 1, 
                            borderColor: theme.border 
                        }}>
                            <MaterialCommunityIcons name="party-popper" size={48} color={theme.fontSecondary} style={{ marginBottom: tokens.space.sm }} />
                            <Text style={{ 
                                color: theme.fontSecondary, 
                                fontSize: tokens.fontSize.md,
                                textAlign: 'center'
                            }}>
                                {Translator.get('NO_RESULTS' as Parameters<typeof Translator.get>[0]) || 'Aucune annonce'}
                            </Text>
                        </View>
                    )}
                    renderItem={({ item }) => (
                        <Reanimated.View 
                            entering={FadeIn}
                            layout={LinearTransition.springify()}
                        >
                            <TouchableOpacity 
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate('BdeDetail', { annonce: item })}
                                style={{
                                    backgroundColor: theme.cardBackground,
                                    borderRadius: tokens.radius.xl, 
                                    marginBottom: tokens.space.lg, 
                                    marginHorizontal: tokens.space.sm,
                                    ...tokens.shadow.md, 
                                    overflow: 'hidden', 
                                }}
                            >
                                <View style={{ width: '100%', height: 180, backgroundColor: theme.greyBackground }}>
                                    {item.image_url ? (
                                        <Image 
                                            source={{ uri: item.image_url }}
                                            style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }}
                                        />
                                    ) : null}
                                </View>

                                <View style={{ padding: tokens.space.md }}>
                                    <Text style={{ 
                                        fontSize: tokens.fontSize.lg, 
                                        fontWeight: tokens.fontWeight.bold, 
                                        color: theme.font,
                                        flexShrink: 1,
                                        marginBottom: 4
                                    }}>
                                        {item.title}
                                    </Text>
                                    
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: item.info_label ? 4 : 0 }}>
                                        <MaterialCommunityIcons name="account" size={16} color={theme.fontSecondary} />
                                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                                            {item.issuer_name}
                                        </Text>
                                    </View>

                                    {item.info_label ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                            <MaterialCommunityIcons name="information-outline" size={16} color={theme.fontSecondary} style={{ marginTop: 2 }} />
                                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1, lineHeight: 20 }} numberOfLines={2}>
                                                {item.info_label}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            </TouchableOpacity>
                        </Reanimated.View>
                    )}
                />
            </View>
        </SafeAreaView>
    );
}

export default withHeaderAnimation(BdeScreen);
