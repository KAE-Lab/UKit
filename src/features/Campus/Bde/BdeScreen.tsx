import React, { useEffect, useState, useContext } from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppContext } from '../../../shared/services/AppCore';
import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import BdeService, { BdeAnnonce } from '../services/BdeService';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';

import { CampusListLayout } from '../components/CampusListLayout';
import { CampusCard } from '../components/CampusCard';

export interface BdeScreenProps {
    navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void; setOptions?: any };
    onAnimatedScroll?: (event: unknown) => void;
}

function BdeScreen({ navigation, onAnimatedScroll }: BdeScreenProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const [annonces, setAnnonces] = useState<BdeAnnonce[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let mounted = true;
        const loadData = async () => {
            setLoading(true);
            const data = await BdeService.fetchAnnonces();
            if (!mounted) return;
            setAnnonces(data);
            setLoading(false);
        };

        loadData();
        return () => { mounted = false; };
    }, []);

    const renderItem = ({ item }: { item: BdeAnnonce }) => (
        <CampusCard
            title={item.title}
            imageUrl={item.image_url}
            onPress={() => navigation.navigate('BdeDetail', { annonce: item })}
        >
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
        </CampusCard>
    );

    return (
        <CampusListLayout
            data={annonces}
            loading={loading}
            renderItem={renderItem}
            onAnimatedScroll={onAnimatedScroll}
            navigation={navigation}
            
            emptyIcon="party-popper"
            emptyMessage={Translator.get('NO_RESULTS' as Parameters<typeof Translator.get>[0]) || 'Aucune annonce'}
        />
    );
}

export default withHeaderAnimation(BdeScreen);
