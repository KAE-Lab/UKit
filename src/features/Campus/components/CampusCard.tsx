import React, { useContext } from 'react';
import { View, Text, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { UnifiedTouchable } from '../../../shared/ui/UnifiedTouchable';

const defaultImage = require('../../../../assets/images/default_resto.png');

export interface CampusCardProps {
    title: string;
    imageUrl?: string | null;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
    onPress: () => void;
    children?: React.ReactNode;
}

export function CampusCard({
    title,
    imageUrl,
    isFavorite,
    onToggleFavorite,
    onPress,
    children
}: CampusCardProps) {
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];

    return (
        <Reanimated.View 
            entering={FadeIn}
            layout={LinearTransition.springify()}
        >
            <UnifiedTouchable 
                activeOpacity={0.9}
                onPress={onPress}
                style={{
                    backgroundColor: theme.cardBackground,
                    borderRadius: tokens.radius.xl, 
                    marginBottom: tokens.space.lg, 
                    marginHorizontal: tokens.space.sm,
                    ...tokens.shadow.md, 
                    overflow: 'hidden', 
                }}
            >
                {/* Image Section */}
                <View style={{ width: '100%', height: 180, backgroundColor: theme.greyBackground }}>
                    {/* Background fallback */}
                    <Image 
                        source={defaultImage}
                        style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }}
                    />
                    
                    {imageUrl ? (
                        <Image 
                            source={{ uri: imageUrl }}
                            style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }}
                        />
                    ) : null}
                </View>

                {/* Content Section */}
                <View style={{ padding: tokens.space.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                        <Text style={{ 
                            fontSize: tokens.fontSize.lg, 
                            fontWeight: tokens.fontWeight.bold as never, 
                            color: theme.font,
                            flexShrink: 1,
                            marginBottom: 4
                        }}>
                            {title}
                        </Text>
                        
                        {onToggleFavorite && (
                            <UnifiedTouchable 
                                onPress={onToggleFavorite}
                                hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }}
                                style={{ marginLeft: 6 }}
                            >
                                <MaterialCommunityIcons 
                                    name={isFavorite ? "star" : "star-outline"} 
                                    size={22} 
                                    color={isFavorite ? theme.primary : theme.fontSecondary} 
                                />
                            </UnifiedTouchable>
                        )}
                    </View>
                    
                    {/* Specific content injected here (location, distance, hours, etc.) */}
                    {children}
                </View>
            </UnifiedTouchable>
        </Reanimated.View>
    );
}
