import React, { useContext } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import { AppContext } from '../services/AppCore';
import style, { tokens, AppThemeType } from '../theme/Theme';
import { Interrupteur } from './Interrupteur';

// ── Bouton de Retour ───────────────────────────────────────────
export interface BackButtonProps {
    backAction: () => void;
}
export const BackButton = ({ backAction }: BackButtonProps) => {
    const AppContextValues = useContext(AppContext);
    const theme = style.Theme[AppContextValues.themeName];

    const _onPress = () => {
        requestAnimationFrame(() => backAction());
    };
    return (
        <GHTouchableOpacity onPress={_onPress} style={[style.backButton as never, { paddingLeft: tokens.space.md }]}>
            <View style={{ backgroundColor: theme.primary, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: tokens.radius.md, flexShrink: 0 }}>
                {/* `lightFont` et non `accentFont` : ce dernier est le rouge destructif (docs/theme.md). */}
                <Ionicons
                    name="arrow-back"
                    size={22}
                    color={theme.lightFont}
                />
            </View>
        </GHTouchableOpacity>
    );
};

// ── Bouton du Menu (Drawer) ────────────────────────────────────
export interface DrawerButtonProps {
    title?: string;
    icon?: keyof typeof MaterialIcons.glyphMap;
    size?: number;
    color?: string;
    onPress?: () => void;
    isActive?: boolean;
    textSize?: number;
    fontColor?: string;
}
export const DrawerButton = (props: DrawerButtonProps) => {
    const AppContextValues = useContext(AppContext);
    const theme = style.Theme[AppContextValues.themeName];

    let icon = props.icon ? (
        <MaterialIcons name={props.icon} size={props.size} style={{ color: props.color }} />
    ) : (
        <View />
    );

    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: tokens.space.md,
                // 3 en dur jusqu'a 6.1-E : un point de plus, et la ligne tient sur l'echelle.
                paddingVertical: tokens.space.xs,
                marginHorizontal: tokens.space.sm,
                marginVertical: tokens.space.xs,
                borderRadius: tokens.radius.md,
                backgroundColor: props.isActive || pressed ? theme.greyBackground : 'transparent'
            })}>
            <View style={{
                width: 36,
                height: 36,
                borderRadius: tokens.radius.md,
                backgroundColor: theme.greyBackground,
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                {icon}
            </View>
            <Text style={{
                fontSize: props.textSize ?? tokens.fontSize.md,
                color: props.isActive ? theme.primary : props.fontColor,
                marginLeft: tokens.space.md,
                fontWeight: tokens.fontWeight.medium,
                flex: 1,
            }}>
                {props.title}
            </Text>
        </Pressable>
    );
};

// ── Bouton des Paramètres ──────────────────────────────────────
export interface SettingsButtonProps {
    theme?: AppThemeType['settings'];
    onPress?: () => void;
    leftIcon?: keyof typeof MaterialIcons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap;
    leftIconAnimation?: string;
    leftText?: string;
    rightText?: string;
    disabled?: boolean;
    switchValue?: boolean;
    onSwitchToggle?: (value: boolean) => void;
}
/**
 * La valeur a droite d'une ligne de reglage : elle **cede** avant le libelle.
 *
 * `flexShrink: 1` et `numberOfLines` la font se tronquer plutot que pousser ; `marginLeft: 'auto'`
 * la garde collee a droite maintenant que le libelle n'occupe plus tout l'espace disponible.
 */
const VALEUR_A_DROITE: import('react-native').TextStyle = {
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 'auto',
};

export const SettingsButton = ({ theme, onPress, leftIcon, leftIconAnimation, leftText, rightText, disabled, switchValue, onSwitchToggle }: SettingsButtonProps) => {
    if (!theme?.button) return null;

    // `sync` en MaterialIcons et non MaterialCommunityIcons : le glyphe MCI est dessine en
    // diagonale, et l'icone de synchronisation semblait figee de travers au repos. La variante
    // MaterialIcons est droite, de la meme famille que `sync-disabled` juste au-dessus.
    const isMaterialIcon = ['settings', 'language', 'filter-list', 'sync', 'sync-disabled'].includes(leftIcon);
    const IconComponent = isMaterialIcon ? MaterialIcons : MaterialCommunityIcons;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- G8 : les styles composes de Theme.ts ne sont pas types (docs/defauts-fonctionnels.md), session a part en 6.2
            style={[theme.button, { flexDirection: 'row', alignItems: 'center' }, disabled && { opacity: 0.5}] as any}>
            {leftIcon && (
                leftIconAnimation ? (
                    /*
                      * L'indicateur natif remplace l'icone pendant la synchronisation — le meme
                      * vocabulaire que les tuiles Scolarite en lecture. Une rotation maison de
                      * l'icone a ete essayee et defaite : `Animated` la faisait pivoter autour du
                      * coin haut gauche et non du centre, et le rendu ne fonctionnait pas. La boite
                      * de 24 garde le gabarit de l'icone qu'il remplace, sans saut de mise en page.
                      */
                    <View style={{
                        marginLeft: (theme.leftIcon as import('react-native').TextStyle)?.marginLeft,
                        alignSelf: 'center',
                        width: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        <ActivityIndicator size="small" color={(theme.leftIcon as import('react-native').TextStyle)?.color} />
                    </View>
                ) : (
                    <IconComponent name={leftIcon as never} size={24} style={theme.leftIcon as import('react-native').TextStyle} />
                )
            )}
            {/*
              * `flexShrink: 0` et non `flex: 1` seul : le libelle ne doit **jamais** etre comprime.
              * Sans cette borne, une valeur longue a droite — le nom d'un etablissement, par exemple —
              * ecrasait le libelle jusqu'a une lettre par ligne, et « Institution » s'affichait a la
              * verticale. Ce n'etait pas un probleme de longueur de nom mais de gabarit : n'importe
              * quelle valeur longue le reproduisait.
              */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- G8 : les styles composes de Theme.ts ne sont pas types (docs/defauts-fonctionnels.md), session a part en 6.2 */}
            <Text style={[theme.buttonMainText, { flexShrink: 0 }] as any}>{leftText}</Text>
            {onSwitchToggle !== undefined ? (
                /*
                  * L'interrupteur du depot, dessine, et non celui du systeme : voir son en-tete. La
                  * marge droite reprend celle de l'icone de gauche — la rangee reste symetrique,
                  * comme elle l'etait avec le `Switch` natif.
                  */
                <Interrupteur
                    theme={theme}
                    valeur={switchValue === true}
                    onChange={onSwitchToggle}
                    accessibilityLabel={leftText}
                    style={{ marginLeft: 'auto', marginRight: (theme.leftIcon as import('react-native').TextStyle)?.marginLeft }}
                />
            ) : (
                <Text
                    style={[theme.buttonSecondaryText as import('react-native').TextStyle, VALEUR_A_DROITE]}
                    numberOfLines={1}
                >
                    {rightText}
                </Text>
            )}
            {!onSwitchToggle && (
                <MaterialCommunityIcons name="chevron-right" size={22} style={theme.rightIcon as import('react-native').TextStyle} />
            )}
        </TouchableOpacity>
    );
};

// ── COMPOSANT UNIVERSEL ─────────────────────────────────
export type ButtonProps = Partial<Omit<SettingsButtonProps, 'theme'> & BackButtonProps & DrawerButtonProps> & {
    theme?: AppThemeType['settings'] | 'light' | 'dark';
};

export default function Button(props: ButtonProps) {
    if (props.backAction) return <BackButton {...props as BackButtonProps} />;
    if (props.title) return <DrawerButton {...props as DrawerButtonProps} />;
    return <SettingsButton {...props as SettingsButtonProps} />;
}