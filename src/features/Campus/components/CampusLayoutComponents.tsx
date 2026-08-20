import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { EdgeInsets } from 'react-native-safe-area-context';
import Translator from '../../../shared/i18n/Translator';
import { tokens, AppThemeType } from '../../../shared/theme/Theme';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { SourceFailureNotice } from '../../../shared/ui/SourceFailureNotice';
import type { UkitFailure } from '../../../shared/aetherius';

interface CampusSearchBarProps {
    searchText: string;
    onSearchChange: (text: string) => void;
    searchPlaceholder: string;
    theme: AppThemeType;
    insets: EdgeInsets;
}

export function CampusSearchBar({ searchText, onSearchChange, searchPlaceholder, theme, insets }: CampusSearchBarProps) {
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'position' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
            }}
        >
            <View style={{
                paddingBottom: Math.max(tokens.space.sm, (insets?.bottom || 0) - 15)
            }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.greyBackground,
                    borderRadius: tokens.radius.md,
                    paddingHorizontal: tokens.space.md,
                    marginHorizontal: tokens.space.md,
                    height: 45,
                    elevation: 5,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                }}>
                    <MaterialCommunityIcons
                        name="magnify"
                        size={22}
                        color={theme.fontSecondary}
                        style={{ marginRight: tokens.space.sm }}
                    />
                    <TextInput
                        style={{
                            flex: 1,
                            fontSize: tokens.fontSize.md,
                            color: theme.font,
                            padding: 0
                        }}
                        placeholder={searchPlaceholder}
                        placeholderTextColor={theme.fontSecondary}
                        onChangeText={onSearchChange}
                        value={searchText}
                        autoCorrect={false}
                    />
                    {searchText.length > 0 && onSearchChange && (
                        <TouchableOpacity
                            onPress={() => onSearchChange('')}
                            style={{ padding: tokens.space.xs }}
                        >
                            <MaterialCommunityIcons name="close-circle" size={18} color={theme.fontSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

interface FilterOption {
    id: string;
    label: string;
}

interface CampusFilterModalProps {
    visible: boolean;
    setVisible: (visible: boolean) => void;
    filterOptions: FilterOption[];
    selectedFilter: string | undefined;
    onFilterChange: (id: string) => void;
    theme: AppThemeType;
}

export function CampusFilterModal({ visible, setVisible, filterOptions, selectedFilter, onFilterChange, theme }: CampusFilterModalProps) {
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={() => setVisible(false)}>
            <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                {/*
                  * La modale prend le vocabulaire de `theme.settings.popup`, sans repli.
                  *
                  * Elle portait jusqu'au jalon 6-K une chaine `?.` doublee d'objets de style ecrits
                  * inline « au cas ou » : un troisieme dialecte de modale, qui ne s'affichait jamais et
                  * divergeait a chaque retouche du vrai. `settings.popup` fait partie de `AppThemeType`,
                  * donc des deux themes — son absence serait un theme casse, pas un cas a rattraper.
                  */}
                <View style={theme.settings.popup.background as never}>
                    <TouchableWithoutFeedback>
                        <View style={theme.settings.popup.container as never}>
                            <View style={theme.settings.popup.header as never}>
                                <Text style={theme.settings.popup.textHeader as never}>
                                    {Translator.get('FILTERS')}
                                </Text>
                                <TouchableOpacity onPress={() => setVisible(false)}>
                                    <MaterialIcons name="close" size={28} color={theme.fontSecondary} />
                                </TouchableOpacity>
                            </View>

                            {filterOptions.map((option) => (
                                <TouchableOpacity 
                                    key={option.id}
                                    onPress={() => { onFilterChange(option.id); setVisible(false); }} 
                                    style={{ 
                                        paddingVertical: tokens.space.md, 
                                        borderBottomWidth: option.id === filterOptions[filterOptions.length - 1].id ? 0 : 1, 
                                        borderColor: theme.border, 
                                        flexDirection: 'row', 
                                        alignItems: 'center' 
                                    }}
                                >
                                    <MaterialCommunityIcons 
                                        name={selectedFilter === option.id ? "radiobox-marked" : "radiobox-blank"} 
                                        size={22} 
                                        color={selectedFilter === option.id ? theme.primary : theme.fontSecondary} 
                                        style={{ marginRight: tokens.space.sm }} 
                                    />
                                    <Text style={{ 
                                        color: selectedFilter === option.id ? theme.primary : theme.font, 
                                        fontSize: tokens.fontSize.md, 
                                        fontWeight: selectedFilter === option.id ? 'bold' : 'normal' 
                                    }}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

interface CampusListEmptyStateProps {
    isFiltering: boolean;
    emptyIcon: keyof typeof import('@expo/vector-icons').MaterialCommunityIcons.glyphMap;
    emptyMessage: string;
    theme: AppThemeType;
    /**
     * L'echec, quand il y en a un.
     *
     * Sa presence est ce qui distingue « la source est morte » de « il n'y a rien a afficher ». Les
     * deux produisaient le meme ecran avant la Phase 6, et c'est exactement le defaut qu'elle
     * supprime : une liste vide n'est pas une erreur, et une erreur n'est pas une liste vide.
     */
    failure?: UkitFailure;
    onRetry?: () => void;
}

/**
 * L'etat vide d'une liste Campus, et son etat d'erreur.
 *
 * Le rendu de l'echec est delegue a `SourceFailureNotice`, qui sert aussi les ecrans sans liste — la
 * fiche d'un restaurant, les horaires d'une bibliotheque, le planning. Un seul message et un seul
 * bouton pour un meme echec, quel que soit l'ecran qui le montre.
 */
export function CampusListEmptyState({ isFiltering, emptyIcon, emptyMessage, theme, failure, onRetry }: CampusListEmptyStateProps) {
    if (failure !== undefined && failure.silent !== true) {
        return <SourceFailureNotice failure={failure} theme={theme} onRetry={onRetry} />;
    }

    // Meme bloc que l'echec, et c'est voulu : ce qui les separe est l'icone et le message, pas la
    // mise en page. Les deux etaient ecrits a l'identique jusqu'au jalon 6-K.
    return (
        <EmptyState
            icon={emptyIcon}
            message={isFiltering ? Translator.get('NO_RESULTS_FOUND') : emptyMessage}
            theme={theme}
        />
    );
}

/**
 * Le rendu d'un echec de source a remonte dans `shared/ui/` au jalon 6-E, quand le planning en a eu
 * besoin : une dependance croisee entre deux dossiers de `features/` est ce que
 * [architecture.md](../../../../docs/architecture.md) demande d'eviter. Le nom local est conserve
 * pour que les ecrans Campus qui l'importent d'ici n'aient pas a changer.
 */
export { SourceFailureNotice as CampusFailureNotice };

interface CampusPartialNoticeProps {
    theme: AppThemeType;
    onRetry?: () => void;
}

/**
 * Le bandeau de couverture partielle.
 *
 * Il repond a une question que l'ancien code ne se posait pas : que fait-on quand deux points de
 * balayage sur douze echouent ? La reponse etait « rien, on n'en sait rien ». Elle est desormais
 * « on affiche ce qu'on a, **en le disant** » — une liste incomplete qui se presente comme complete
 * est un mensonge silencieux, et c'est exactement le defaut que la Phase 6 supprime.
 *
 * Discret par construction : la donnee est la, seule sa completude est en doute.
 */
export function CampusPartialNotice({ theme, onRetry }: CampusPartialNoticeProps) {
    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: tokens.space.md,
            marginBottom: tokens.space.sm,
            paddingVertical: tokens.space.sm,
            paddingHorizontal: tokens.space.md,
            backgroundColor: theme.cardBackground,
            borderRadius: tokens.radius.md,
            borderWidth: 1,
            borderColor: theme.border,
        }}>
            <MaterialCommunityIcons name="alert-outline" size={18} color={theme.fontSecondary} />
            <Text style={{ flex: 1, marginLeft: tokens.space.sm, color: theme.fontSecondary, fontSize: tokens.fontSize.sm }}>
                {Translator.get('PARTIAL_COVERAGE')}
            </Text>

            {onRetry ? (
                <TouchableOpacity onPress={onRetry} activeOpacity={0.7} style={{ paddingLeft: tokens.space.sm }}>
                    <Text style={{ color: theme.primary, fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold }}>
                        {Translator.get('RETRY')}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
