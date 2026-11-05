/* eslint-disable max-lines */
import { Platform } from 'react-native';

import { tokens as primitives } from './tokens';
import { PALETTES } from './palettes';
import { resoudreOmbre, type SpecOmbre } from './ombres';

/**
 * Une ombre, en `boxShadow` sur les deux plateformes depuis 7-J (ombres.ts) : sur iPhone, l'ombre
 * native etait coupee par le `overflow: hidden` de toute carte. Les ombres ecrites a la main hors
 * echelle passent par ici aussi, avec leurs propres valeurs.
 */
export function ombre(spec: SpecOmbre | readonly SpecOmbre[]) {
    return resoudreOmbre(spec);
}

/** Les tokens, ombres resolues : `...tokens.shadow.sm` s'etale comme avant, sur les deux plateformes. */
const tokens = {
    ...primitives,
    shadow: {
        sm: ombre(primitives.ombres.sm),
        md: ombre(primitives.ombres.md),
        lg: ombre(primitives.ombres.lg),
    },
};


const colors = {
    brand:      '#009ee0',
    brandDark:  '#007ab8',
    brandLight: '#33b5e8',
    gray50:  '#F8F9FA',
    gray100: '#F1F3F5',
    gray200: '#E9ECEF',
    gray300: '#DEE2E6',
    gray400: '#CED4DA',
    gray500: '#ADB5BD',
    gray600: '#6C757D',
    gray700: '#495057',
    gray800: '#343A40',
    gray900: '#212529',
    gray:        '#454545',
    lightblue:   '#40C4FF',
    blue:        '#006F9F',
    darkblue:    '#0D47A1',
    darkred:     '#D50000',
    backgroundGrey: '#E9E9EF',
    white:       '#FFFFFF',
    black:       '#000000',
};

const hintColors = {
    green: '#55da59',
    gray: '#9499a1AA',
};

const AppTheme = {
    primary:   '#007AFF',
    secondary: '#34C759',
};

const Theme = {
    light: {
        // Les couleurs de base viennent de palettes.ts, pur, que la console lit aussi (7-F).
        ...PALETTES.light,
        primarySoft:   '#3B5FE515',
        secondary:     '#5856D6',
        selection:     '#F2F2F7',
        accentFont:    '#FF3B30',
        // L'echelle semantique. Elle reprend les teintes que `sectionsHeaders` portait deja, plutot
        // que les verts et oranges Material qui trainaient en dur dans les composants : la palette
        // suit les couleurs systeme d'Apple, et en laisser vivre une seconde etait la cause des
        // `#4caf50` recopies. Le suffixe `Soft` suit la convention de `primarySoft`.
        success:       '#34C759',
        successSoft:   '#34C75915',
        warning:       '#FF9500',
        warningSoft:   '#FF950015',
        danger:        '#FF3B30',
        dangerSoft:    '#FF3B3015',
        neutral:       '#8E8E93',
        neutralSoft:   '#8E8E9315',
        lightFont:     '#FFFFFF',
        link:          '#3B5FE5',
        icon:          '#1C1C1E',
        // Anterieure a la palette, et laissee a sa valeur : la nommer supprime le litteral d'AppUI
        // sans changer un pixel de la barre de statut.
        statusBarBackground: '#006F9F',
        collapsableBackground: '#00000008',
        field:                 '#F2F2F7',
        fieldBorder:           '#E5E5EA',
        courseBackground: '#F2F2F7',
        eventBackground:  '#FFFFFF',
        eventBorder:      '#E5E5EA',
        calendar: {
            selection: '#3B5FE5',
            currentDay: '#3B5FE515',
            sunday: '#FF3B3010'
        },
        settings: {
            switchTrack: {
                false: '#E5E5EA',
                true:  '#3B5FE5',
            },
            // La poignee des deux controles dessines (Interrupteur, Curseur). Blanche dans les
            // deux themes, comme celle d'iOS : sur une piste qui porte la valeur, c'est le contraste
            // qui la rend lisible, pas la teinte. Un seul endroit a retoucher le jour ou le sombre
            // en voudra une autre.
            switchThumb: '#FFFFFF',
            background: {
                flex: 1,
                backgroundColor: '#F2F2F7',
            },
            separationText: {
                color:      '#6C6C70',
                fontSize:   tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                marginTop:  tokens.space.lg,
                marginLeft: tokens.space.md,
            },
            button: {
                backgroundColor: '#FFFFFF',
                borderRadius:    tokens.radius.lg,
                marginHorizontal: tokens.space.md,
                marginTop:       tokens.space.sm,
                paddingVertical: tokens.space.md,
                flexDirection:   'row',
                alignContent:    'center',
                ...tokens.shadow.sm,
            },
            buttonMainText: {
                fontWeight:      tokens.fontWeight.medium,
                color:           '#1C1C1E',
                fontSize:        tokens.fontSize.md,
                marginHorizontal: tokens.space.md,
                alignSelf:       'center',
            },
            buttonSecondaryText: {
                fontWeight: tokens.fontWeight.regular,
                color:      '#6C6C70',
                fontSize:   tokens.fontSize.md,
                marginLeft: 'auto',
                alignSelf:  'center',
            },
            leftIcon: {
                marginLeft: tokens.space.md,
                color:      '#3B5FE5',
                alignSelf:  'center',
            },
            rightIcon: {
                alignSelf:       'center',
                color:           '#C7C7CC',
                marginHorizontal: tokens.space.xs,
            },
            /*
             * Le vocabulaire des dialogues, et il est unique : les neuf modales de l'application
             * s'habillent ici, sans un style local. Les proportions ont ete recadrees apres mesure a
             * l'usage — un bouton de 150 de large et 52 de haut sous un libelle de 16 lisait comme
             * un bouton geant, et `radius.xl` sur une carte pleine largeur lisait comme une pastille.
             *
             * Ce qui a change : le conteneur descend a `radius.lg` et monte a `space.lg` de
             * rembourrage, le titre prend `fontSize.xl` — un titre de dialogue titre une page, pas un
             * paragraphe —, et les boutons passent en `flex: 1` avec un `minHeight` de 48, la cible
             * tactile minimale de la recette d'ecran, au lieu d'une largeur minimale en dur qui ne
             * s'adaptait a rien.
             *
             * **L'ecart description -> boutons reste a 16**, et pas davantage : une premiere version
             * l'avait porte a 32 en meme temps que le rembourrage, ce qui creusait un trou au milieu
             * du dialogue. Le rembourrage du conteneur et l'espacement interne ne se regient pas
             * ensemble.
             *
             * `minHeight` n'a pas de token, et c'est assume : le depot n'a aucune echelle de
             * dimensions (docs/theme.md, « ce que les tokens ne couvrent pas »).
             *
             * Le bloc jumeau du theme sombre porte exactement les memes valeurs : seules les
             * couleurs different. Toute retouche ici se recopie la-bas.
             */
            popup: {
                filters: {
                    container: {
                        flex: 1,
                        flexGrow: 1,
                        backgroundColor: '#FFFFFF',
                        padding: tokens.space.md,
                        justifyContent: 'space-between',
                    },
                    header: {
                        flexDirection:  'row',
                        justifyContent: 'space-between',
                        alignItems:     'center',
                        marginTop:      tokens.space.sm,
                    },
                    button: {
                        backgroundColor: '#3B5FE515',
                        padding:         tokens.space.sm,
                        borderRadius:    tokens.radius.lg,
                        margin:          tokens.space.sm,
                        flexDirection:   'row',
                        alignItems:      'center',
                    },
                    buttonText: {
                        fontSize:   tokens.fontSize.lg,
                        fontWeight: tokens.fontWeight.bold,
                        color:      '#3B5FE5',
                    },
                    iconColor: '#3B5FE5',
                    footer: {
                        marginTop:      tokens.space.md,
                        justifyContent: 'flex-end',
                        flexDirection:  'row',
                    },
                },
                background: {
                    flex:            1,
                    justifyContent:  'center',
                    backgroundColor: '#00000066',
                },
                container: {
                    backgroundColor: '#FFFFFF',
                    borderRadius:    tokens.radius.lg,
                    padding:         tokens.space.lg,
                    marginHorizontal: tokens.space.lg,
                    marginVertical:  tokens.space.xl,
                    ...tokens.shadow.lg,
                    flexShrink: 1,
                    maxHeight: '85%',
                },
                header: {
                    flexDirection:  'row',
                    justifyContent: 'space-between',
                    alignItems:     'center',
                },
                textHeader: {
                    // `flex: 1` et non `alignSelf` : l'en-tete est une **rangee**, ou un etirement
                    // jouerait sur la hauteur. Sans contrainte, Yoga mesure le titre a sa largeur
                    // intrinseque et Android en coupe la fin (docs/theme.md).
                    flex: 1,
                    fontWeight: tokens.fontWeight.bold,
                    fontSize:   tokens.fontSize.xl,
                    color:      '#1C1C1E',
                },
                textDescription: {
                    marginTop:      tokens.space.sm,
                    marginBottom:   tokens.space.sm,
                    lineHeight:     22,
                    fontSize:       tokens.fontSize.md,
                    color:          '#6C6C70',
                },
                buttonContainer: {
                    flexDirection: 'row',
                    gap:           tokens.space.sm,
                    marginTop:     tokens.space.sm,
                },
                buttonSecondary: {
                    backgroundColor: '#E5E5EA',
                    flex: 1,
                    minHeight: 48,
                    paddingVertical: tokens.space.sm,
                    paddingHorizontal: tokens.space.sm,
                    borderRadius: tokens.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                buttonMain: {
                    backgroundColor: '#3B5FE5',
                    flex: 1,
                    minHeight: 48,
                    paddingVertical: tokens.space.sm,
                    paddingHorizontal: tokens.space.sm,
                    borderRadius: tokens.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                buttonDestructive: {
                    backgroundColor: '#FF3B30',
                    flex: 1,
                    minHeight: 48,
                    paddingVertical: tokens.space.sm,
                    paddingHorizontal: tokens.space.sm,
                    borderRadius: tokens.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                buttonTextSecondary: {
                    color: '#6C6C70',
                    fontWeight: tokens.fontWeight.semibold,
                    fontSize: tokens.fontSize.md,
                },
                buttonTextMain: {
                    color: '#FFFFFF',
                    fontWeight: tokens.fontWeight.semibold,
                    fontSize: tokens.fontSize.md,
                },
                buttonTextDestructive: {
                    color: '#FFFFFF',
                    fontWeight: tokens.fontWeight.semibold,
                    fontSize: tokens.fontSize.md,
                },
                closeIcon: {
                    color: '#C7C7CC',
                },
                /*
                 * Une option de modale de choix : la forme des boutons de l'application, plus un etat
                 * selectionne — contour neutre au repos, fond teinte et filet d'accent une fois
                 * choisie. Remplace les ronds a cocher, qui ne ressemblaient a rien d'autre dans
                 * l'application.
                 */
                option: {
                    flexDirection:   'row',
                    alignItems:      'center',
                    justifyContent:  'space-between',
                    borderWidth:     1.5,
                    borderColor:     '#E5E5EA',
                    borderRadius:    tokens.radius.md,
                    minHeight:       48,
                    paddingVertical: tokens.space.sm,
                    paddingHorizontal: tokens.space.md,
                    marginTop:       tokens.space.sm,
                },
                optionSelected: {
                    borderColor:     '#3B5FE5',
                    backgroundColor: '#3B5FE515',
                },
                optionText: {
                    fontSize:   tokens.fontSize.md,
                    fontWeight: tokens.fontWeight.semibold,
                    color:      '#1C1C1E',
                    flexShrink: 1,
                },
                optionTextSelected: {
                    color: '#3B5FE5',
                },
                optionCheckColor: '#3B5FE5',
                filterListContainer: {
                    flex:           1,
                    flexDirection:  'row',
                    justifyContent: 'space-around',
                },
                textInputContainer: {
                    flexDirection:   'row',
                    alignItems:      'center',
                    marginHorizontal: tokens.space.xs,
                    marginTop:       tokens.space.md,
                    justifyContent:  'flex-end',
                },
                textInput: {
                    borderWidth:  1.5,
                    borderColor:  '#E5E5EA',
                    borderRadius: tokens.radius.md,
                    padding:      tokens.space.sm,
                    paddingVertical: Platform.OS === 'ios' ? tokens.space.sm : tokens.space.xs,
                    flex:         1,
                    marginRight:  tokens.space.xs,
                    color:        '#1C1C1E',
                    backgroundColor: '#F8F9FA',
                },
                textInputIconColor:        '#3B5FE5',
                textInputPlaceholderColor: '#C7C7CC',
            },
        },
        courses: {
            '#FFFF00': '#FFCC00',
            '#00FFFF': '#5AC8FA',
            '#800040': '#5856D6',
            '#808000': '#A2845E',
            '#800000': '#FF3B30',
            '#8000FF': '#FF9500',
            '#00FF00': '#34C759',
            '#400080': '#007AFF',
            // La palette DERIVEE : un export iCalendar ne porte aucune couleur, le jalon 6-I en tire
            // une de la matiere et la projette ici, pour que les deux sources aient le meme
            // vocabulaire visuel (features/Planning/services/IcsMapping.ts).
            //
            // Huit teintes **toutes vives**, et c'est une correction mesuree : la premiere version
            // reprenait les huit teintes de la table Celcat au-dessus, dont un brun (clair) qui vire
            // au gris en sombre. Il attrapait 8 matieres sur 61, soit 467 cours sur l'annee — un
            // cours sur sept avait l'air de n'avoir pas de couleur. La roue ci-dessous n'a aucune
            // teinte neutre : une collision se lit comme deux cours de la meme couleur, jamais comme
            // une couleur manquante.
            'palette-1': '#FF3B30', // rouge
            'palette-2': '#FF9500', // orange
            'palette-3': '#FFCC00', // jaune
            'palette-4': '#34C759', // vert
            'palette-5': '#00C7BE', // menthe
            'palette-6': '#5AC8FA', // cyan
            'palette-7': '#007AFF', // bleu
            'palette-8': '#AF52DE', // violet
            default:   '#007AFF',
        },
    },
    dark: {
        ...PALETTES.dark,
        primarySoft:   '#6381F822',
        secondary:     '#30D158',
        selection:     '#252532',
        accentFont:    '#FF453A',
        // Les variantes sombres des memes couleurs systeme, deja presentes dans `sectionsHeaders`.
        success:       '#30D158',
        successSoft:   '#30D15815',
        warning:       '#FF9F0A',
        warningSoft:   '#FF9F0A15',
        danger:        '#FF453A',
        dangerSoft:    '#FF453A15',
        neutral:       '#8E8E93',
        neutralSoft:   '#8E8E9315',
        lightFont:     '#FFFFFF',
        link:          '#6381F8',
        icon:          '#FFFFFF',
        statusBarBackground: '#0B0B12',
        collapsableBackground: '#FFFFFF0A',
        field:                 '#252532',
        fieldBorder:           '#30303E',
        courseBackground: '#0B0B12',
        eventBackground:  '#15151E',
        eventBorder:      '#252532',
        calendar: {
            selection: '#6381F8',
            currentDay: '#15151E',
            sunday: '#FF453A15',
        },
        settings: {
            switchTrack: {
                false: '#30303E',
                true:  '#6381F8',
            },
            // La poignee des deux controles dessines (Interrupteur, Curseur). Blanche dans les
            // deux themes, comme celle d'iOS : sur une piste qui porte la valeur, c'est le contraste
            // qui la rend lisible, pas la teinte. Un seul endroit a retoucher le jour ou le sombre
            // en voudra une autre.
            switchThumb: '#FFFFFF',
            background: {
                flex: 1,
                backgroundColor: '#0B0B12',
            },
            separationText: {
                color:      '#BCBCCB',
                fontSize:   tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                marginTop:  tokens.space.lg,
                marginLeft: tokens.space.md,
            },
            button: {
                backgroundColor: '#15151E',
                borderRadius:    tokens.radius.lg,
                marginHorizontal: tokens.space.md,
                marginTop:       tokens.space.sm,
                paddingVertical: tokens.space.md,
                flexDirection:   'row',
                alignContent:    'center',
                ...tokens.shadow.sm,
            },
            buttonMainText: {
                fontWeight:      tokens.fontWeight.medium,
                color:           '#FFFFFF',
                fontSize:        tokens.fontSize.md,
                marginHorizontal: tokens.space.md,
                alignSelf:       'center',
            },
            buttonSecondaryText: {
                fontWeight: tokens.fontWeight.regular,
                color:      '#BCBCCB',
                fontSize:   tokens.fontSize.md,
                marginLeft: 'auto',
                alignSelf:  'center',
            },
            leftIcon: {
                marginLeft: tokens.space.md,
                color:      '#6381F8',
                alignSelf:  'center',
            },
            rightIcon: {
                alignSelf:        'center',
                color:            '#BCBCCB',
                marginHorizontal: tokens.space.xs,
            },
            popup: {
                filters: {
                    container: {
                        flex:            1,
                        flexGrow:        1,
                        backgroundColor: '#15151E',
                        padding:         tokens.space.md,
                        justifyContent:  'space-between',
                    },
                    header: {
                        flexDirection:  'row',
                        justifyContent: 'space-between',
                        alignItems:     'center',
                        marginTop:      tokens.space.sm,
                    },
                    button: {
                        backgroundColor: '#252532',
                        padding:         tokens.space.sm,
                        borderRadius:    tokens.radius.lg,
                        margin:          tokens.space.sm,
                        flexDirection:   'row',
                        alignItems:      'center',
                    },
                    buttonText: {
                        fontSize:   tokens.fontSize.lg,
                        fontWeight: tokens.fontWeight.bold,
                        color:      '#6381F8',
                    },
                    iconColor: '#6381F8',
                    footer: {
                        marginTop:      tokens.space.md,
                        justifyContent: 'flex-end',
                        flexDirection:  'row',
                    },
                },
                background: {
                    flex:            1,
                    justifyContent:  'center',
                    backgroundColor: '#00000080',
                },
                container: {
                    backgroundColor: '#15151E',
                    borderRadius:    tokens.radius.lg,
                    padding:         tokens.space.lg,
                    marginHorizontal: tokens.space.lg,
                    marginVertical:  tokens.space.xl,
                    ...tokens.shadow.lg,
                    flexShrink: 1,
                    maxHeight: '85%',
                },
                header: {
                    flexDirection:  'row',
                    justifyContent: 'space-between',
                    alignItems:     'center',
                },
                textHeader: {
                    // `flex: 1` et non `alignSelf` : l'en-tete est une **rangee**, ou un etirement
                    // jouerait sur la hauteur. Sans contrainte, Yoga mesure le titre a sa largeur
                    // intrinseque et Android en coupe la fin (docs/theme.md).
                    flex: 1,
                    fontWeight: tokens.fontWeight.bold,
                    fontSize:   tokens.fontSize.xl,
                    color:      '#FFFFFF',
                },
                textDescription: {
                    marginTop:      tokens.space.sm,
                    marginBottom:   tokens.space.sm,
                    lineHeight:     22,
                    fontSize:       tokens.fontSize.md,
                    color:          '#BCBCCB',
                },
                buttonContainer: {
                    flexDirection: 'row',
                    gap:           tokens.space.sm,
                    marginTop:     tokens.space.sm,
                },
                buttonSecondary: {
                    backgroundColor: '#22222E',
                    flex: 1,
                    minHeight: 48,
                    paddingVertical: tokens.space.sm,
                    paddingHorizontal: tokens.space.sm,
                    borderRadius: tokens.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                buttonMain: {
                    backgroundColor: '#6381F8',
                    flex: 1,
                    minHeight: 48,
                    paddingVertical: tokens.space.sm,
                    paddingHorizontal: tokens.space.sm,
                    borderRadius: tokens.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                buttonDestructive: {
                    backgroundColor: '#FF453A',
                    flex: 1,
                    minHeight: 48,
                    paddingVertical: tokens.space.sm,
                    paddingHorizontal: tokens.space.sm,
                    borderRadius: tokens.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                buttonTextSecondary: {
                    color: '#BCBCCB',
                    fontWeight: tokens.fontWeight.semibold,
                    fontSize: tokens.fontSize.md,
                },
                buttonTextMain: {
                    color: '#FFFFFF',
                    fontWeight: tokens.fontWeight.semibold,
                    fontSize: tokens.fontSize.md,
                },
                buttonTextDestructive: {
                    color: '#FFFFFF',
                    fontWeight: tokens.fontWeight.semibold,
                    fontSize: tokens.fontSize.md,
                },
                closeIcon: {
                    color: '#BCBCCB',
                },
                /* Le jumeau du bloc clair : memes valeurs, seules les couleurs different. */
                option: {
                    flexDirection:   'row',
                    alignItems:      'center',
                    justifyContent:  'space-between',
                    borderWidth:     1.5,
                    borderColor:     '#30303E',
                    borderRadius:    tokens.radius.md,
                    minHeight:       48,
                    paddingVertical: tokens.space.sm,
                    paddingHorizontal: tokens.space.md,
                    marginTop:       tokens.space.sm,
                },
                optionSelected: {
                    borderColor:     '#6381F8',
                    backgroundColor: '#6381F81F',
                },
                optionText: {
                    fontSize:   tokens.fontSize.md,
                    fontWeight: tokens.fontWeight.semibold,
                    color:      '#FFFFFF',
                    flexShrink: 1,
                },
                optionTextSelected: {
                    color: '#6381F8',
                },
                optionCheckColor: '#6381F8',
                filterListContainer: {
                    flex:           1,
                    flexDirection:  'row',
                    justifyContent: 'space-around',
                },
                textInputContainer: {
                    flexDirection:    'row',
                    alignItems:       'center',
                    marginHorizontal: tokens.space.xs,
                    marginTop:        tokens.space.md,
                    justifyContent:   'flex-end',
                },
                textInput: {
                    borderWidth:  1.5,
                    borderColor:  '#30303E',
                    borderRadius: tokens.radius.md,
                    padding:      tokens.space.sm,
                    paddingVertical: Platform.OS === 'ios' ? tokens.space.sm : tokens.space.xs,
                    flex:         1,
                    marginRight:  tokens.space.xs,
                    color:        '#FFFFFF',
                    backgroundColor: '#252532',
                },
                textInputIconColor:        '#6381F8',
                textInputPlaceholderColor: '#7C7C8A',
            },
        },
        courses: {
            '#FFFF00': '#FFD60A',
            '#00FFFF': '#64D2FF',
            '#800040': '#BF5AF2',
            '#808000': '#8E8E93',
            '#800000': '#FF453A',
            '#8000FF': '#FF9F0A',
            '#00FF00': '#30D158',
            '#400080': '#5E5CE6',
            // La palette derivee, en sombre (voir le theme clair). Le gris `#8E8E93` en a ete
            // retire : c'est lui qui faisait passer un cours sur sept pour un cours sans couleur.
            'palette-1': '#FF453A', // rouge
            'palette-2': '#FF9F0A', // orange
            'palette-3': '#FFD60A', // jaune
            'palette-4': '#30D158', // vert
            'palette-5': '#66D4CF', // menthe
            'palette-6': '#64D2FF', // cyan
            'palette-7': '#0A84FF', // bleu
            'palette-8': '#BF5AF2', // violet
            default:   '#5E5CE6',
        },
    },
};

const style = {
    tokens,
    colors,
    hintColors,

    schedule: {
        containerView: {
            flex: 1,
        },
        titleView: {
            paddingHorizontal: tokens.space.md,
            paddingVertical: tokens.space.sm,
        },
        titleText: {
            fontSize: tokens.fontSize.lg,
            fontWeight: tokens.fontWeight.bold,
        },
        contentView: {
            flex: 1,
        },
        course: {
            root: {
                flex: 1,
                flexDirection: 'column',
                marginVertical: tokens.space.sm,
                marginHorizontal: tokens.space.sm,
            },
            row: {
                flex: 1,
                flexDirection: 'row',
            },
            hours: {
                flexDirection: 'column',
                justifyContent: 'space-around',
                alignItems: 'center',
                paddingHorizontal: tokens.space.sm,
                paddingVertical: tokens.space.sm,
                minWidth: 64,
            },
            hoursText: {
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.bold,
                textAlign: 'center',
                // Le parent pose un `minWidth`, pas une largeur : le texte reste libre, et un gras
                // libre se tronque sur Android (docs/theme.md).
                alignSelf: 'stretch' as const,
            },
            contentBlock: {
                flex: 1,
                flexDirection: 'column',
                paddingVertical: tokens.space.md,
                paddingRight: tokens.space.md,
            },
            contentType: {
                flex: 1,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 4,
            },
            content: {
                fontSize: tokens.fontSize.sm,
            },
            title: {
                fontSize: tokens.fontSize.md,
                fontWeight: tokens.fontWeight.bold,
            },
            iconHeader: {
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: tokens.space.xs,
            },
            line: {
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 6,
            },
            container: {
                flex: 1,
                marginLeft: tokens.space.xs,
            },
            groupsContainer: {
                flexDirection: 'row',
                flexWrap: 'wrap',
            },
            groupsContent: {
                flex: 1,
            },
        },
    },

    offline: {
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: tokens.space.xl,
        },
        icon: {
            marginBottom: tokens.space.lg,
            opacity: 0.4,
        },
        title: {
            fontSize: tokens.fontSize.xl,
            fontWeight: tokens.fontWeight.bold,
            marginBottom: tokens.space.sm,
            textAlign: 'center',
        },
        subtitle: {
            fontSize: tokens.fontSize.md,
            textAlign: 'center',
            opacity: 0.6,
        },
    },

    course: {
        container: {
            flex: 1,
        },
        card: {
            borderRadius: tokens.radius.lg,
            marginHorizontal: tokens.space.md,
            marginVertical: tokens.space.sm,
            padding: tokens.space.md,
            ...tokens.shadow.md,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: tokens.space.sm,
        },
        title: {
            fontSize: tokens.fontSize.lg,
            fontWeight: tokens.fontWeight.bold,
            flex: 1,
        },
        subtitle: {
            fontSize: tokens.fontSize.sm,
            marginTop: tokens.space.xs,
            opacity: 0.7,
        },
        badge: {
            borderRadius: tokens.radius.md,
            paddingHorizontal: tokens.space.sm,
            paddingVertical: tokens.space.xs,
        },
        badgeText: {
            fontSize: tokens.fontSize.xs,
            fontWeight: tokens.fontWeight.semibold,
            color: '#FFFFFF',
        },
        infoRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: tokens.space.sm,
        },
        infoText: {
            fontSize: tokens.fontSize.sm,
            marginLeft: tokens.space.sm,
        },
    },

    calendar: {
        container: {
            flex: 1,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: tokens.space.md,
            paddingVertical: tokens.space.sm,
        },
        headerTitle: {
            fontSize: tokens.fontSize.lg,
            fontWeight: tokens.fontWeight.bold,
        },
        dayContainer: {
            flex: 1,
            margin: tokens.space.xs,
            borderRadius: tokens.radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 60,
        },
        dayText: {
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.medium,
        },
        todayIndicator: {
            width: 6,
            height: 6,
            borderRadius: tokens.radius.md,
            backgroundColor: '#007AFF',
            marginTop: tokens.space.xs,
        },
    },

    backButton: {
        paddingLeft:     tokens.space.md,
        paddingRight:    tokens.space.xl,
        flexDirection:   'row',
        justifyContent:  'center',
        alignItems:      'center',
    },

    about: {
        title: {
            fontWeight: tokens.fontWeight.bold,
            fontSize:   tokens.fontSize.xl,
            marginTop:  tokens.space.lg,
            marginLeft: tokens.space.sm,
        },
        view: {
            padding: tokens.space.md,
        },
        content: {
            marginTop:    tokens.space.sm,
            marginBottom: tokens.space.md,
        },
    },

    stackNavigator: {
        headerStyle: {
            backgroundColor: AppTheme.primary,
        },
        headerTitleStyle: {
            color:        colors.white,
            marginBottom: tokens.space.lg,
            marginTop:    tokens.space.lg,
            fontSize:     tokens.fontSize.xl,
        },
        headerBackTitleStyle: {
            color: colors.white,
        },
        headerTintColor: colors.white,
    },

    containerView: {
        margin:    tokens.space.lg,
        marginTop: tokens.space.xl,
    },

    list: {
        homeView: {
            flex:            1,
            backgroundColor: 'transparent',
        },
    },

    calendarList: {
        itemSize: 64,
    },

    Theme,
};

export type AppThemeType = typeof Theme.light;
export type ThemeKey = 'light' | 'dark';

/**
 * Un etat, pas une couleur.
 *
 * Un service ou un module de projection rend un **ton** ; c'est le composant qui le resout sur le
 * theme courant. Sans ca une couleur redescend dans une couche qui ne sait pas quel theme est actif —
 * ce que faisait `getLibraryStatus`, qui rendait un hexadecimal clair jusqu'au jalon 6-K.
 */
export type SemanticTone = 'success' | 'warning' | 'danger' | 'neutral';

/** La couleur pleine d'un ton. */
export function toneColor(theme: AppThemeType, tone: SemanticTone): string {
    return theme[tone];
}

/** Le fond translucide du meme ton, pour une pastille ou un bandeau. */
export function toneSoftColor(theme: AppThemeType, tone: SemanticTone): string {
    return theme[`${tone}Soft` as const];
}

/**
 * Les props communes des libelles de boutons de dialogue : un libelle ne se plie JAMAIS sur deux
 * lignes — il retrecit legerement quand la place manque. Constate sur « Demander mon campus »
 * (2026-08-30) : plie en deux, le bouton grandissait et desequilibrait toute la rangee. A poser sur
 * chaque `Text` qui porte un style `buttonText*` de `popup`.
 */
export const propsLibelleBouton = {
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.8,
} as const;

export { tokens };
export default style as typeof style & { Theme: Record<ThemeKey, AppThemeType> };