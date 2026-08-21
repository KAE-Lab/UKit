import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

/** La hauteur du degrade qui separe la liste de la barre. Assez pour amortir, pas assez pour masquer. */
const VOILE = 24;

/**
 * La hauteur du clavier, ou `0` quand il est replie. **iOS seulement**, et c'est voulu.
 *
 * Sous Android la fenetre se redimensionne quand le clavier monte : `bottom: 0` est deja au-dessus de
 * lui, il n'y a rien a compenser et rien a couvrir. Sous iOS le clavier est une couche **posee
 * par-dessus** l'application, et c'est ce qui cree les deux defauts que ce module corrige.
 */
function useHauteurClavier(): number {
    const [hauteur, setHauteur] = useState(0);

    useEffect(() => {
        if (Platform.OS !== 'ios') return undefined;
        // `will` et non `did` : la dalle doit etre en place **avant** que le clavier apparaisse,
        // sinon elle se pose une image apres lui et le defaut clignote.
        const montre = Keyboard.addListener('keyboardWillShow', (e) => setHauteur(e.endCoordinates.height));
        const cache = Keyboard.addListener('keyboardWillHide', () => setHauteur(0));
        return () => { montre.remove(); cache.remove(); };
    }, []);

    return hauteur;
}

/**
 * La barre de recherche, flottante au-dessus de la liste.
 *
 * **Elle reste en bas**, a portee de pouce : c'est un bon choix et le changer couterait plus qu'il ne
 * rendrait. Ce qui la rendait discrete n'etait pas sa hauteur mais sa **couleur** — `greyBackground`
 * est un fond, et un champ de la couleur d'un fond ne se voit pas. Elle prend donc la surface d'une
 * carte, un filet, et l'ombre partagee : un objet **pose sur** la liste plutot qu'un creux dedans.
 *
 * Les quatre proprietes d'ombre ecrites a la main sont remplacees par `tokens.shadow.md` — quatre
 * avertissements ESLint en moins, et la meme ombre que les cartes.
 *
 * Le degrade au-dessus n'est pas decoratif : sans lui, les cartes disparaissent d'un coup sous la
 * barre au defilement. `expo-linear-gradient` etait deja en dependance, sans aucun appelant.
 *
 * **Il part du fond a opacite nulle, jamais de `'transparent'`**, et c'est le piege classique du
 * degrade sous React Native : `'transparent'` vaut `rgba(0, 0, 0, 0)`, donc l'interpolation traverse
 * du **noir** de plus en plus opaque. En theme sombre ca ne se voit pas, le fond est deja noir ; en
 * theme clair ca pose une salissure grise en travers de la liste. Le fond a `00` d'alpha interpole
 * dans sa propre teinte et reste invisible dans les deux themes.
 */

/** Le fond de l'ecran, a opacite nulle : le point de depart honnete d'un degre de voile. */
function fondTransparent(couleur: string): string {
    return /^#[0-9a-f]{6}$/i.test(couleur) ? `${couleur}00` : couleur;
}
export function CampusSearchBar({ searchText, onSearchChange, searchPlaceholder, theme, insets }: CampusSearchBarProps) {
    const hauteurClavier = useHauteurClavier();

    return (
        <>
        {/*
          * La dalle posee **sous** le clavier, de la couleur de la page.
          *
          * Le clavier d'iOS a des coins superieurs arrondis et un fond qui laisse passer ce qu'il y a
          * derriere. Sans cette dalle, ce sont les cartes de la liste qui apparaissent dans ces coins,
          * juste sous la barre : une zone qui n'est visiblement « pas couverte ». Elle est rendue hors
          * du `KeyboardAvoidingView`, qui translate ses enfants vers le haut — une dalle qui monte avec
          * eux ne couvrirait justement pas la zone du clavier.
          */}
        {hauteurClavier > 0 ? (
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: hauteurClavier,
                    backgroundColor: theme.courseBackground,
                }}
            />
        ) : null}

        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'position' : undefined}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
            <LinearGradient
                colors={[fondTransparent(theme.courseBackground), theme.courseBackground]}
                style={{ height: VOILE }}
                pointerEvents="none"
            />
            <View style={{
                backgroundColor: theme.courseBackground,
                /*
                 * La marge de zone sure ne sert qu'a degager l'indicateur d'accueil. Clavier ouvert,
                 * celui-ci est masque : la garder laissait un ruban de vingt points entre la barre et
                 * le clavier, qu'on lit comme un trou.
                 */
                paddingBottom: hauteurClavier > 0
                    ? tokens.space.sm
                    : Math.max(tokens.space.sm, (insets?.bottom || 0) - 15),
            }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.cardBackground,
                    borderWidth: 1,
                    borderColor: theme.border,
                    // `radius.md`, comme le bouton de retour et le bouton favori : l'application est
                    // en carres arrondis, pas en pilules (docs/theme.md).
                    borderRadius: tokens.radius.md,
                    paddingHorizontal: tokens.space.md,
                    marginHorizontal: tokens.space.md,
                    height: 48,
                    ...tokens.shadow.md,
                }}>
                    <MaterialCommunityIcons
                        name="magnify"
                        size={20}
                        color={theme.fontSecondary}
                        style={{ marginRight: tokens.space.sm }}
                    />
                    <TextInput
                        style={{
                            flex: 1,
                            fontSize: tokens.fontSize.md,
                            color: theme.font,
                            padding: 0,
                        }}
                        placeholder={searchPlaceholder}
                        placeholderTextColor={theme.fontSecondary}
                        onChangeText={onSearchChange}
                        value={searchText}
                        autoCorrect={false}
                    />
                    {searchText.length > 0 ? (
                        <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={12}>
                            <MaterialCommunityIcons name="close-circle" size={20} color={theme.fontSecondary} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        </KeyboardAvoidingView>
        </>
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
                                <TouchableOpacity onPress={() => setVisible(false)} hitSlop={12}>
                                    <MaterialIcons name="close" size={24} color={theme.fontSecondary} />
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
                                        fontWeight: selectedFilter === option.id ? tokens.fontWeight.semibold : tokens.fontWeight.regular,
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
    emptyTitle: string;
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
    /** Efface la recherche et remet le filtre a `all`. Absent, l'etat vide ne propose rien. */
    onReset?: () => void;
}

/**
 * L'etat vide d'une liste Campus, et son etat d'erreur.
 *
 * Le rendu de l'echec est delegue a `SourceFailureNotice`, qui sert aussi les ecrans sans liste — la
 * fiche d'un restaurant, les horaires d'une bibliotheque, le planning. Un seul message et un seul
 * bouton pour un meme echec, quel que soit l'ecran qui le montre.
 *
 * Les deux rendent en `plain` : ils **sont** l'ecran, puisque la liste est vide. Ils etaient encadres
 * et colles sous l'en-tete, ce qui les posait plus haut que les etats vides du Planning et de la
 * Scolarite ; c'est `ScreenState`, cote `CampusListLayout`, qui decide maintenant de leur hauteur.
 */
export function CampusListEmptyState({ isFiltering, emptyIcon, emptyTitle, emptyMessage, theme, failure, onRetry, onReset }: CampusListEmptyStateProps) {
    if (failure !== undefined && failure.silent !== true) {
        return <SourceFailureNotice failure={failure} theme={theme} onRetry={onRetry} variant="plain" />;
    }

    // Meme bloc que l'echec, et c'est voulu : ce qui les separe est l'icone et le message, pas la
    // mise en page. Les deux etaient ecrits a l'identique jusqu'au jalon 6-K.
    return (
        <EmptyState
            variant="plain"
            icon={isFiltering ? 'magnify-close' : emptyIcon}
            title={isFiltering ? Translator.get('NO_RESULTS_FOUND_TITLE') : emptyTitle}
            message={isFiltering ? Translator.get('NO_RESULTS_FOUND') : emptyMessage}
            theme={theme}
            /*
             * « Un etat vide propose une action quand il en existe une » (recette d'ecran). Ici elle
             * existe, et elle etait cachee derriere l'icone de filtre de l'en-tete : rien, dans un
             * ecran vide, ne disait qu'un filtre etait la cause. Elle n'apparait que quand on filtre —
             * une liste vide **par nature** n'a rien a reinitialiser.
             */
            action={isFiltering && onReset
                ? { label: Translator.get('SHOW_ALL'), onPress: onReset, icon: 'filter-remove-outline' }
                : null}
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

interface CampusNoticeProps {
    theme: AppThemeType;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    message: string;
    /** Le geste propose a droite. Sans lui, le bandeau ne fait que dire. */
    actionLabel?: string;
    onAction?: () => void;
}

/**
 * Une ligne discrete qui dit quelque chose **sur** une liste, sans la remplacer.
 *
 * Elle est nee du bandeau de couverture partielle et a ete generalisee quand les sections du tableau
 * de bord en ont eu besoin : un carrousel vide n'affichait rien du tout sous son en-tete, ce qui se
 * lit comme une application cassee — d'autant que la cause la plus frequente est un **filtre**, donc
 * quelque chose que l'utilisateur peut defaire.
 *
 * Discrete par construction : elle tient sur une ligne et laisse la place a la donnee. Ce n'est pas
 * un etat vide plein ecran ([`EmptyState`](../../../shared/ui/EmptyState.tsx)), qui **est** l'ecran.
 */
export function CampusNotice({ theme, icon, message, actionLabel, onAction }: CampusNoticeProps) {
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
            <MaterialCommunityIcons name={icon} size={18} color={theme.fontSecondary} />
            <Text style={{ flex: 1, marginLeft: tokens.space.sm, color: theme.fontSecondary, fontSize: tokens.fontSize.sm }}>
                {message}
            </Text>

            {actionLabel !== undefined && onAction !== undefined ? (
                <TouchableOpacity onPress={onAction} activeOpacity={0.7} style={{ paddingLeft: tokens.space.sm }} hitSlop={8}>
                    <Text style={{ color: theme.primary, fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold }}>
                        {actionLabel}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

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
 */
export function CampusPartialNotice({ theme, onRetry }: CampusPartialNoticeProps) {
    return (
        <CampusNotice
            theme={theme}
            icon="alert-outline"
            message={Translator.get('PARTIAL_COVERAGE')}
            {...(onRetry !== undefined ? { actionLabel: Translator.get('RETRY'), onAction: onRetry } : {})}
        />
    );
}
