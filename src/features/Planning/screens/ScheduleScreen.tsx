import React, { useContext, useLayoutEffect } from 'react';
import { View } from 'react-native';
import { AppContext, treatTitle } from '../../../shared/services/AppCore';
import { NavBarHelper, SaveGroupButton } from '../../../shared/navigation/NavHelpers';
import Translator from '../../../shared/i18n/Translator';
import { tokens } from '../../../shared/theme/Theme';
import DayView from '../views/DayView';

export default function ScheduleScreen(props) {
    const context = useContext(AppContext);
    let groupName = props.route?.params?.name || props.groupName;
    
    if (Array.isArray(groupName)) {
        groupName = context.favoriteGroups;
    }

    useLayoutEffect(() => {
        if (props.navigation) {
            const translatedTitle = Array.isArray(groupName) ? (Translator.get('MY_PLANNING')) : treatTitle(groupName);
            const helper = NavBarHelper({ 
                title: translatedTitle, 
                themeName: context.themeName, 
                route: props.route,
                headerRight: () => (
                    <View style={{ paddingRight: tokens.space.md }}>
                        <SaveGroupButton groupName={groupName} themeName={context.themeName} />
                    </View>
                )
            });
            
            // Force React Navigation to update the title component and the Favorite button!
            props.navigation.setOptions({
                headerTitle: helper.headerTitle,
                headerRight: helper.headerRight
            });
        }
    }, [groupName, props.navigation, context.themeName, props.route?.params?.animatedReady]);
    
    return <DayView {...props} groupName={groupName} />;
}