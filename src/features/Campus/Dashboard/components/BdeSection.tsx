import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import BdeService, { BdeAnnonce } from '../../services/BdeService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

export function BdeSection({ navigation }: { navigation: any }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    
    const [annonces, setAnnonces] = useState<BdeAnnonce[]>([]);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        BdeService.fetchAnnonces().then(data => {
            if (mountedRef.current) {
                setAnnonces(data);
                setLoading(false);
            }
        }).catch(() => {
            if (mountedRef.current) setLoading(false);
        });
        return () => { mountedRef.current = false; };
    }, []);

    const renderCard = ({ item }: { item: BdeAnnonce }) => (
        <Reanimated.View
            entering={FadeIn}
            layout={LinearTransition.springify()}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('BdeDetail', { annonce: item })}
                style={{
                    width: CARD_WIDTH,
                    backgroundColor: theme.cardBackground,
                    borderRadius: tokens.radius.xl,
                    marginRight: tokens.space.md,
                    ...tokens.shadow.md,
                    overflow: 'hidden',
                }}
            >
                <View style={{ width: '100%', height: 160, backgroundColor: theme.greyBackground }}>
                    {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }} />
                    ) : null}
                </View>

                <View style={{ padding: tokens.space.md }}>
                    <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold as any, color: theme.font, flexShrink: 1, marginBottom: 4 }} numberOfLines={1}>
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
    );

    if (!loading && annonces.length === 0) return null;

    return (
        <View style={{ marginTop: tokens.space.md }}>
            <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}
                onPress={() => navigation.navigate('Bde')}
                activeOpacity={0.7}
            >
                <Text style={{ fontSize: 22, fontWeight: tokens.fontWeight.bold as any, fontFamily: 'Montserrat_600SemiBold', color: theme.font }}>
                    {Translator.get('STUDENT_LIFE') || 'Student life'}
                </Text>
                <MaterialIcons name="chevron-right" size={26} color={theme.fontSecondary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>

            {loading ? (
                <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />
            ) : (
                <FlatList
                    horizontal
                    data={annonces}
                    renderItem={renderCard}
                    keyExtractor={item => item.id}
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_WIDTH + tokens.space.md}
                    decelerationRate="fast"
                    contentContainerStyle={{ paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.lg }}
                />
            )}
        </View>
    );
}
