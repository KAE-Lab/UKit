import React, { useContext } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';

const WidgetCard = ({ 
    children, 
    onPress, 
    title, 
    icon, 
    color, 
    fullWidth = false, 
    style: customStyle 
}) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const cardStyle = [
        styles.card,
        {
            backgroundColor: theme.cardBackground,
            shadowColor: themeName === 'dark' ? '#000' : '#000',
        },
        fullWidth ? styles.fullWidth : styles.halfWidth,
        customStyle
    ];

    const Content = () => (
        <>
            {(title || icon) && (
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        {icon && (
                            <MaterialCommunityIcons 
                                name={icon} 
                                size={20} 
                                color={color || theme.primary} 
                                style={styles.icon} 
                            />
                        )}
                        {title && (
                            <Text style={[styles.title, { color: theme.font }]}>
                                {title}
                            </Text>
                        )}
                    </View>
                    {onPress && (
                        <MaterialCommunityIcons 
                            name="chevron-right" 
                            size={20} 
                            color={theme.fontSecondary} 
                        />
                    )}
                </View>
            )}
            <View style={styles.content}>
                {children}
            </View>
        </>
    );

    if (onPress) {
        return (
            <TouchableOpacity 
                style={cardStyle} 
                onPress={onPress} 
                activeOpacity={0.7}
            >
                <Content />
            </TouchableOpacity>
        );
    }

    return (
        <View style={cardStyle}>
            <Content />
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: tokens.radius.xl,
        padding: tokens.space.md,
        marginBottom: tokens.space.md,
        ...tokens.shadow.md,
    },
    fullWidth: {
        width: '100%',
    },
    halfWidth: {
        flex: 1,
        marginHorizontal: tokens.space.xs,
        minWidth: '45%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: tokens.space.sm,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.bold,
        fontFamily: 'Montserrat_600SemiBold',
    },
    icon: {
        marginRight: tokens.space.xs,
    },
    content: {
        flex: 1,
    }
});

export default WidgetCard;
