import React, { useContext, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { useCampusLocation } from '../hooks/useCampusLocation';

import { BdeSection } from './components/BdeSection';
import { CrousSection } from './components/CrousSection';
import { LibrarySection } from './components/LibrarySection';
import { FreeRoomSection } from './components/FreeRoomSection';

const CampusDashboard = ({ navigation }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    // Fetch location once for the whole dashboard to avoid multiple requests
    const { fetchLocation } = useCampusLocation();
    const [location, setLocation] = useState<{ lat?: number, lon?: number }>({});

    useEffect(() => {
        let mounted = true;
        fetchLocation().then(({ lat, lon }) => {
            if (mounted) setLocation({ lat, lon });
        });
        return () => { mounted = false; };
    }, [fetchLocation]);

    const scrollY = useRef(new Animated.Value(0)).current;

    const renderHeader = (insets: import('react-native-safe-area-context').EdgeInsets | null) => {
        const topPadding = (insets?.top || 0);

        const opacity = scrollY.interpolate({
            inputRange: [0, 50],
            outputRange: [1, 0],
            extrapolate: 'clamp'
        });

        return (
            <Animated.View style={[styles.headerContainer, { paddingTop: topPadding, backgroundColor: 'transparent', opacity }]}>
                <View style={[styles.headerContent, { paddingHorizontal: tokens.space.md }]}>
                    <Text style={[styles.greetingText, { color: theme.font }]}>
                        {Translator.get('CAMPUS') || 'Campus'}
                    </Text>
                </View>
            </Animated.View>
        );
    };

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderHeader(insets)}

                    <Animated.ScrollView
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: true }
                        )}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingTop: (insets?.top || 0) + 60, paddingBottom: tokens.space.xxl + 80 }}
                    >
                        <BdeSection navigation={navigation} />
                        <CrousSection navigation={navigation} userLat={location.lat} userLon={location.lon} />
                        <LibrarySection navigation={navigation} userLat={location.lat} userLon={location.lon} />
                        <FreeRoomSection navigation={navigation} userLat={location.lat} userLon={location.lon} />
                    </Animated.ScrollView>
                </View>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingBottom: tokens.space.sm,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    greetingText: {
        fontSize: 34,
        fontWeight: tokens.fontWeight.bold as '700',
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: tokens.space.md,
    },
});

export default CampusDashboard;
