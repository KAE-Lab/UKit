import React, { useState, useContext } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../../utils/DeviceUtils';

import DayView from './DayView';
import WeekView from './WeekView';

export default function ScheduleScreen(props) {
    const [mode, setMode] = useState('day'); 
    const AppContextValues = useContext(AppContext);
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];

    const toggleMode = () => setMode(prev => prev === 'day' ? 'week' : 'day');

    const groupName = props.route?.params?.name || props.groupName;

    return (
        <View style={{ flex: 1, backgroundColor: theme.greyBackground }}>
            {mode === 'day' ? (
                <DayView {...props} groupName={groupName} />
            ) : (
                <WeekView 
                    {...props} 
                    groupName={groupName} 
                    route={{ ...props.route, params: { ...props.route?.params, groupName } }} 
                />
            )}

            {/* ── Bouton Flottant (Toggle Jour / Semaine) ────────────────── */}
            <TouchableOpacity
                onPress={toggleMode}
                activeOpacity={0.8}
                style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 24,
                    backgroundColor: theme.primary,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                    ...tokens.shadow.lg,
                    zIndex: 100,
                }}
            >
                <MaterialCommunityIcons
                    name={mode === 'day' ? 'calendar-week' : 'calendar-today'}
                    size={28}
                    color="#FFFFFF"
                />
            </TouchableOpacity>
        </View>
    );
}