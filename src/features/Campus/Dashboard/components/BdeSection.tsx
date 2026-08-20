import React, { useContext } from 'react';
import { View, FlatList, Dimensions } from 'react-native';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { SectionHeader } from '../../../../shared/ui/SectionHeader';
import { LoadingState } from '../../../../shared/ui/LoadingState';
import { useBdeAnnonces } from '../../hooks/useBdeAnnonces';
import { BdeAnnonceCard, BdeSectionError } from './BdeSectionParts';
import type { BdeAnnonce } from '../../services/BdeService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

export function BdeSection({ navigation }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const { annonces, failure, loading, retry } = useBdeAnnonces();
    const enEchec = failure !== undefined && failure.silent !== true;

    // Une absence d'annonces ne merite pas de section : rien a montrer, rien a dire. Un echec, si —
    // disparaitre en silence est precisement ce qui rendait « la source est morte » indiscernable de
    // « il n'y a rien aujourd'hui ».
    if (!loading && annonces.length === 0 && !enEchec) return null;

    const renderCard = ({ item }: { item: BdeAnnonce }) => (
        <BdeAnnonceCard
            annonce={item}
            width={CARD_WIDTH}
            theme={theme}
            onPress={() => navigation.navigate('BdeDetail', { annonce: item })}
        />
    );

    return (
        <View style={{ marginTop: tokens.space.md }}>
            <SectionHeader
                title={Translator.get('STUDENT_LIFE')}
                theme={theme}
                onPress={() => navigation.navigate('Bde')}
            />

            {loading ? (
                <LoadingState theme={theme} />
            ) : enEchec ? (
                <BdeSectionError failure={failure!} theme={theme} onRetry={retry} />
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
