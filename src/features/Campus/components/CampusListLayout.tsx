import React, { useContext, useState } from 'react';
import { Animated, FlatList, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { ChargementPleinePage } from '../../../shared/ui/ChargementPleinePage';
import { ScreenState, HEADER_OFFSET } from '../../../shared/ui/ScreenState';
import { CampusSearchBar, CampusFilterModal, CampusListEmptyState, CampusPartialNotice } from './CampusLayoutComponents';
import { useCampusListHeader } from './hooks/useCampusListHeader';
import type { UkitFailure } from '../../../shared/aetherius';

export interface FilterOption {
    id: string;
    label: string;
}

export interface CampusListLayoutProps<T> {
    data: T[];
    loading: boolean;
    renderItem: (info: { item: T }) => React.ReactElement;
    onAnimatedScroll?: (event: unknown) => void;
    
    // Search
    hasSearch?: boolean;
    searchText?: string;
    onSearchChange?: (text: string) => void;
    searchPlaceholder?: string;
    /**
     * En dessous de ce nombre d'elements, la barre n'apparait pas : chercher parmi trois cartes
     * n'apporte rien, et la fumee de la barre n'a rien a voiler sur une liste qui tient a l'ecran.
     * Quatre par defaut — une liste d'une carte par rangee — ; la grille d'annonces, a deux par
     * rangee, passe le double. Une requete deja saisie garde toujours la barre : sans elle, la croix
     * qui l'efface disparaitrait avec.
     */
    seuilRecherche?: number;
    
    // Filters
    filterOptions?: FilterOption[];
    selectedFilter?: string;
    onFilterChange?: (id: string) => void;
    
    /**
     * Ce que la liste attend, en une phrase. **Obligatoire** : ce socle sert quatre domaines, et
     * chacun attend autre chose — des salles, des horaires d'ouverture, des annonces. Une phrase par
     * defaut aurait menti pour trois d'entre eux.
     */
    messageChargement: string;

    // Empty State
    emptyIcon?: keyof typeof import('@expo/vector-icons').MaterialCommunityIcons.glyphMap;
    emptyTitle?: string;
    emptyMessage?: string;

    // Echec de la source. Absent, la liste se comporte exactement comme avant : les ecrans Campus
    // qui n'y sont pas encore branches n'ont rien a changer.
    failure?: UkitFailure;
    onRetry?: () => void;

    // La donnee est la, mais incomplete : une source interrogee en plusieurs points n'a pas repondu
    // partout. Le bandeau le dit au-dessus de la liste, sans la masquer.
    partial?: boolean;

    // Grille : les affiches d'annonces se rangent a deux par rangee, les lieux restent une carte par
    // rangee. Absent, la liste se comporte exactement comme avant.
    numColumns?: number;

    // Navigation for setting header filter icon
    navigation?: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
}

/**
 * `Animated.FlatList` perd le generique de la liste : ses props attendent des valeurs animees, et
 * `T[]` n'en est pas une. Le socle n'anime que le defilement, jamais la donnee — la liste est donc
 * typee comme une `FlatList` ordinaire, ce qui rend `data`, `renderItem` et `keyExtractor` a `T`
 * sans les trois `any` que ce fichier portait (6.1-C).
 */
const ListeAnimee = Animated.FlatList as unknown as typeof FlatList;

/** Ce que la barre de recherche occupe en pied de liste, quand elle est affichee. */
const HAUTEUR_RECHERCHE = 80;

interface SurcouchesProps {
    theme: import('../../../shared/theme/Theme').AppThemeType;
    insets: import('react-native-safe-area-context').EdgeInsets;
    rechercheVisible: boolean;
    searchText: string;
    onSearchChange?: (text: string) => void;
    searchPlaceholder: string;
    filterOptions: FilterOption[];
    selectedFilter?: string;
    onFilterChange?: (id: string) => void;
    filterVisible: boolean;
    setFilterVisible: (visible: boolean) => void;
}

/**
 * Ce qui flotte au-dessus de la liste : la barre de recherche et la modale de filtre.
 *
 * Extrait parce que les deux branches — liste garnie et liste vide — les rendent a l'identique.
 * Recopier les deux blocs les aurait fait diverger a la premiere retouche, et la fonction principale
 * depassait la limite de lignes.
 */
function Surcouches({
    theme, insets, rechercheVisible, searchText, onSearchChange, searchPlaceholder,
    filterOptions, selectedFilter, onFilterChange, filterVisible, setFilterVisible,
}: SurcouchesProps) {
    return (
        <>
            {rechercheVisible && (
                <CampusSearchBar
                    searchText={searchText}
                    onSearchChange={onSearchChange!}
                    searchPlaceholder={searchPlaceholder}
                    theme={theme}
                    insets={insets}
                />
            )}

            {filterOptions.length > 0 && onFilterChange && (
                <CampusFilterModal
                    visible={filterVisible}
                    setVisible={setFilterVisible}
                    filterOptions={filterOptions}
                    selectedFilter={selectedFilter}
                    onFilterChange={onFilterChange}
                    theme={theme}
                />
            )}
        </>
    );
}

interface ContenuVideProps {
    theme: import('../../../shared/theme/Theme').AppThemeType;
    insets: import('react-native-safe-area-context').EdgeInsets;
    partial: boolean;
    isFiltering: boolean;
    emptyIcon: keyof typeof import('@expo/vector-icons').MaterialCommunityIcons.glyphMap;
    emptyTitle: string;
    emptyMessage: string;
    failure?: UkitFailure;
    onRetry?: () => void;
    onReset: () => void;
}

/**
 * Ce que l'ecran montre quand la liste n'a rien.
 *
 * L'etat vide **est** l'ecran : il se pose donc dans `ScreenState`, hors de la liste, plutot que dans
 * son `ListEmptyComponent`. C'est ce qui lui donne la meme hauteur que les etats du Planning et de la
 * Scolarite — la, il etait colle sous l'en-tete.
 *
 * Une couverture partielle **et** une liste vide se disent toutes les deux : le bandeau vit dans
 * l'en-tete de la liste, qui n'existe pas dans ce cas. Le taire ferait passer « on n'a pas pu tout
 * interroger » pour « il n'y a rien ».
 */
function ContenuVide({
    theme, insets, partial, isFiltering, emptyIcon, emptyTitle, emptyMessage, failure, onRetry, onReset,
}: ContenuVideProps) {
    return (
        <>
            {partial ? (
                <View style={{ paddingTop: (insets.top || 0) + HEADER_OFFSET }}>
                    <CampusPartialNotice theme={theme} onRetry={onRetry} />
                </View>
            ) : null}

            <ScreenState theme={theme} background={theme.courseBackground} topOffset={partial ? tokens.space.md : undefined}>
                <CampusListEmptyState
                    isFiltering={isFiltering}
                    emptyIcon={emptyIcon}
                    emptyTitle={emptyTitle}
                    emptyMessage={emptyMessage}
                    theme={theme}
                    failure={failure}
                    onRetry={onRetry}
                    onReset={onReset}
                />
            </ScreenState>
        </>
    );
}

/**
 * L'attente de la liste entiere : elle remplace la barre de recherche, les filtres et les cartes.
 *
 * Extraite du corps pour la meme raison que `Surcouches` juste au-dessus — la fonction principale
 * depassait la limite de lignes — et le decoupage tombe juste : c'est le seul etat de cet ecran qui
 * ne rend rien de ce qui l'entoure.
 */
function AttenteDeLaListe({ theme, message }: {
    theme: import('../../../shared/theme/Theme').AppThemeType;
    message: string;
}) {
    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            <ChargementPleinePage theme={theme} message={message} background={theme.courseBackground} />
        </SafeAreaView>
    );
}

// eslint-disable-next-line complexity
export function CampusListLayout<T>({
    data,
    loading,
    messageChargement,
    renderItem,
    onAnimatedScroll,
    hasSearch = false,
    searchText = '',
    onSearchChange,
    searchPlaceholder = '',
    seuilRecherche = 4,
    filterOptions = [],
    selectedFilter,
    onFilterChange,
    emptyIcon = 'layers-search',
    emptyTitle = '',
    emptyMessage = '',
    failure,
    onRetry,
    partial = false,
    numColumns = 1,
    navigation
}: CampusListLayoutProps<T>) {
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const theme = style.Theme[AppContextValues.themeName ?? 'light'];
    const insets = useSafeAreaInsets();
    const [filterVisible, setFilterVisible] = useState(false);
    const route = useRoute();

    useCampusListHeader({
        navigation,
        filterOptions,
        selectedFilter,
        theme,
        routeKey: route.key,
        setFilterVisible
    });

    if (loading) return <AttenteDeLaListe theme={theme} message={messageChargement} />;

    const isFiltering = searchText.trim().length > 0 || (selectedFilter && selectedFilter !== 'all');

    /*
     * La barre de recherche n'apparait que s'il y a quelque chose a chercher.
     *
     * Elle restait affichee au-dessus d'une panne de source et d'une liste vide, ou elle ne servait
     * rien et ou elle affirmait le contraire — un champ de recherche annonce une liste.
     *
     * La seconde moitie de la condition n'est **pas** optionnelle : masquer la barre des que la liste
     * est vide enfermerait quelqu'un avec une requete qu'il ne peut plus effacer. Tant qu'une requete
     * est saisie, la barre reste, croix comprise.
     */
    const rechercheVisible = hasSearch && (data.length >= seuilRecherche || searchText.trim().length > 0);

    /** Revenir a la liste entiere : les deux causes d'un filtrage se retirent ensemble. */
    const reinitialiser = () => {
        if (searchText.trim().length > 0) onSearchChange?.('');
        if (selectedFilter !== undefined && selectedFilter !== 'all') onFilterChange?.('all');
    };

    const surcouches: SurcouchesProps = {
        theme, insets, rechercheVisible, searchText, onSearchChange, searchPlaceholder,
        filterOptions, selectedFilter, onFilterChange, filterVisible, setFilterVisible,
    };

    if (data.length === 0) {
        return (
            <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <ContenuVide
                    theme={theme}
                    insets={insets}
                    partial={partial}
                    isFiltering={Boolean(isFiltering)}
                    emptyIcon={emptyIcon}
                    emptyTitle={emptyTitle}
                    emptyMessage={emptyMessage}
                    failure={failure}
                    onRetry={onRetry}
                    onReset={reinitialiser}
                />
                <Surcouches {...surcouches} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            <View style={{ flex: 1 }}>
                <ListeAnimee
                    data={data}
                    onScroll={onAnimatedScroll as never}
                    scrollEventThrottle={16}
                    keyExtractor={(item: T, index) => {
                        const id = (item as { id?: string | number }).id;
                        return id ? id.toString() : index.toString();
                    }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ 
                        paddingTop: (insets.top || 0) + HEADER_OFFSET, 
                        // Le pied suit **la meme condition** que la barre : sans ca, une liste sans
                        // barre garderait 80 de vide en dessous d'elle.
                        paddingBottom: Math.max(tokens.space.sm, (insets?.bottom || 0))
                            + (rechercheVisible ? HAUTEUR_RECHERCHE : tokens.space.lg),
                    }}
                    renderItem={renderItem}
                    numColumns={numColumns}
                    // La gouttiere horizontale d'une rangee ; la verticale reste aux cartes, comme
                    // pour les listes a une colonne.
                    columnWrapperStyle={numColumns > 1
                        ? { paddingHorizontal: tokens.space.sm, gap: tokens.space.md }
                        : undefined}
                    ListHeaderComponent={partial ? <CampusPartialNotice theme={theme} onRetry={onRetry} /> : null}
                />
            </View>

            <Surcouches {...surcouches} />
        </SafeAreaView>
    );
}
