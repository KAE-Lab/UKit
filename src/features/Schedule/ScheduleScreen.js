import React, { useContext, useLayoutEffect } from 'react';
import { View } from 'react-native';
import { AppContext, treatTitle } from '../../shared/services/AppCore';
import { NavBarHelper, SaveGroupButton } from '../../shared/navigation/NavHelpers';
import Translator from '../../shared/i18n/Translator';
import DayView from './DayView';

export default function ScheduleScreen(props) {
    const context = useContext(AppContext);
    let groupName = props.route?.params?.name || props.groupName;
    
    if (Array.isArray(groupName)) {
        groupName = context.favoriteGroups;
    }

    useLayoutEffect(() => {
        if (props.navigation) {
            const translatedTitle = Array.isArray(groupName) ? (Translator.get('MY_PLANNING') || 'Mon Planning') : treatTitle(groupName);
            const helper = NavBarHelper({ 
                title: translatedTitle, 
                themeName: context.themeName, 
                route: props.route,
                headerRight: () => (
                    <View style={{ paddingRight: 16 }}>
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
    }, [groupName, props.navigation, context.themeName]);
    
    return <DayView {...props} groupName={groupName} />;
}