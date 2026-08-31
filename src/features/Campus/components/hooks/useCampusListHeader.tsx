import { useEffect } from 'react';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { tokens } from '../../../../shared/theme/Theme';
import { HeaderButton, HEADER_BUTTON_ICON, HEADER_BUTTON_SIZE } from '../../../../shared/ui/HeaderButton';
import { FilterOption } from '../CampusListLayout';

export function useCampusListHeader({
    navigation,
    filterOptions,
    selectedFilter,
    theme,
    routeKey,
    setFilterVisible
}: {
    navigation?: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
    filterOptions: FilterOption[];
    selectedFilter?: string;
    theme: import('../../../../shared/theme/Theme').AppThemeType;
    routeKey: string;
    setFilterVisible: (v: boolean) => void;
}) {
    useEffect(() => {
        if (!navigation || filterOptions.length === 0) return;

        navigation.setOptions({
            headerRight: () => (
                // Plus de mise a l'echelle : elle interpolait 1,14 -> 1 au defilement, et son repli
                // etait la valeur STATIQUE 1,14 — ce bouton restait donc agrandi de 14 % en
                // permanence, seul de sa barre, longtemps apres que la mecanique ait ete retiree
                // ailleurs (docs/defauts-fonctionnels.md).
                <View style={{ height: HEADER_BUTTON_SIZE, justifyContent: 'center' }}>
                    <TouchableOpacity onPress={() => setFilterVisible(true)} style={{ paddingRight: tokens.space.md }}>
                        <HeaderButton theme={theme}>
                            <MaterialCommunityIcons
                                name="filter-variant"
                                size={HEADER_BUTTON_ICON}
                                color={selectedFilter !== 'all' && selectedFilter !== undefined ? theme.primary : theme.fontSecondary}
                            />
                        </HeaderButton>
                    </TouchableOpacity>
                </View>
            )
        });
    }, [navigation, theme, routeKey, selectedFilter, filterOptions, setFilterVisible]);
}
