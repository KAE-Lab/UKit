/* eslint-disable max-lines */
import { Platform } from 'react-native';

import { tokens } from './tokens';


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
        primary:       '#007AFF',
        primarySoft:   '#007AFF15',
        secondary:     '#5856D6',
        selection:     '#F2F2F7',
        accent:        '#007AFF',
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
        font:          '#1C1C1E',
        fontSecondary: '#8E8E93',
        lightFont:     '#FFFFFF',
        link:          '#007AFF',
        icon:          '#1C1C1E',
        border:        '#E5E5EA',
        // Anterieure a la palette, et laissee a sa valeur : la nommer supprime le litteral d'AppUI
        // sans changer un pixel de la barre de statut.
        statusBarBackground: '#006F9F',
        background:            '#F2F2F7',
        cardBackground:        '#FFFFFF',
        greyBackground:        '#E5E5EA',
        collapsableBackground: '#00000008',
        field:                 '#F2F2F7',
        fieldBorder:           '#E5E5EA',
        courseBackground: '#F2F2F7',
        eventBackground:  '#FFFFFF',
        eventBorder:      '#E5E5EA',
        sections:       ['#007AFF10', '#34C75910', '#FF950010', '#FF3B3010', '#5856D610', '#5AC8FA10'],
        sectionsHeaders: ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#5AC8FA'],
        calendar: {
            selection: '#007AFF',
            currentDay: '#007AFF15',
            sunday: '#FF3B3010'
        },
        settings: {
            switchTrack: {
                false: '#E5E5EA',
                true:  '#007AFF',
            },
            background: {
                flex: 1,
                backgroundColor: '#F2F2F7',
            },
            separationText: {
                color:      '#8E8E93',
                fontSize:   tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                marginTop:  tokens.space.lg,
                marginLeft: tokens.space.md,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
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
                color:      '#8E8E93',
                fontSize:   tokens.fontSize.md,
                marginLeft: 'auto',
                alignSelf:  'center',
            },
            leftIcon: {
                marginLeft: tokens.space.md,
                color:      '#007AFF',
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
                        backgroundColor: '#007AFF15',
                        padding:         tokens.space.sm,
                        borderRadius:    tokens.radius.lg,
                        margin:          tokens.space.sm,
                        flexDirection:   'row',
                        alignItems:      'center',
                    },
                    buttonText: {
                        fontSize:   tokens.fontSize.lg,
                        fontWeight: tokens.fontWeight.bold,
                        color:      '#007AFF',
                    },
                    iconColor: '#007AFF',
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
                    fontWeight: tokens.fontWeight.bold,
                    fontSize:   tokens.fontSize.xl,
                    color:      '#1C1C1E',
                },
                textDescription: {
                    marginTop:      tokens.space.sm,
                    marginBottom:   tokens.space.sm,
                    lineHeight:     22,
                    fontSize:       tokens.fontSize.md,
                    color:          '#8E8E93',
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
                    backgroundColor: '#007AFF',
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
                    color: '#8E8E93',
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
                radioContainer: {
                    flexDirection:  'row',
                    alignContent:   'center',
                    marginTop:      tokens.space.md,
                },
                radioIconColor: '#007AFF',
                radioText: {
                    fontSize:  tokens.fontSize.lg,
                    marginLeft: tokens.space.md,
                    color:     '#1C1C1E',
                },
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
                textInputIconColor:        '#007AFF',
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
        primary:       '#5E5CE6',
        primarySoft:   '#0A84FF20',
        accent:        '#5E5CE6',
        secondary:     '#30D158',
        selection:     '#2C2C2E',
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
        font:          '#FFFFFF',
        fontSecondary: '#8E8E93',
        lightFont:     '#FFFFFF',
        link:          '#64D2FF',
        icon:          '#FFFFFF',
        border:        '#38383A',
        statusBarBackground: '#000000',
        background:            '#000000',
        cardBackground:        '#1C1C1E',
        greyBackground:        '#121212',
        collapsableBackground: '#FFFFFF0A',
        field:                 '#2C2C2E',
        fieldBorder:           '#38383A',
        courseBackground: '#000000',
        eventBackground:  '#1C1C1E',
        eventBorder:      '#2C2C2E',
        sections:        ['#0A84FF15', '#30D15815', '#FF9F0A15', '#FF453A15', '#5E5CE615', '#64D2FF15'],
        sectionsHeaders: ['#5E5CE6', '#30D158', '#FF9F0A', '#FF453A', '#5E5CE6', '#64D2FF'],
        calendar: {
            selection: '#5E5CE6',
            currentDay: '#1C1C1E',
            sunday: '#FF453A15',
        },
        settings: {
            switchTrack: {
                false: '#38383A',
                true:  '#5E5CE6',
            },
            background: {
                flex: 1,
                backgroundColor: '#000000',
            },
            separationText: {
                color:      '#8E8E93',
                fontSize:   tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                marginTop:  tokens.space.lg,
                marginLeft: tokens.space.md,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
            },
            button: {
                backgroundColor: '#1C1C1E',
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
                color:      '#8E8E93',
                fontSize:   tokens.fontSize.md,
                marginLeft: 'auto',
                alignSelf:  'center',
            },
            leftIcon: {
                marginLeft: tokens.space.md,
                color:      '#5E5CE6',
                alignSelf:  'center',
            },
            rightIcon: {
                alignSelf:        'center',
                color:            '#8E8E93',
                marginHorizontal: tokens.space.xs,
            },
            popup: {
                filters: {
                    container: {
                        flex:            1,
                        flexGrow:        1,
                        backgroundColor: '#1C1C1E',
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
                        backgroundColor: '#2C2C2E',
                        padding:         tokens.space.sm,
                        borderRadius:    tokens.radius.lg,
                        margin:          tokens.space.sm,
                        flexDirection:   'row',
                        alignItems:      'center',
                    },
                    buttonText: {
                        fontSize:   tokens.fontSize.lg,
                        fontWeight: tokens.fontWeight.bold,
                        color:      '#5E5CE6',
                    },
                    iconColor: '#5E5CE6',
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
                    backgroundColor: '#1C1C1E',
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
                    fontWeight: tokens.fontWeight.bold,
                    fontSize:   tokens.fontSize.xl,
                    color:      '#FFFFFF',
                },
                textDescription: {
                    marginTop:      tokens.space.sm,
                    marginBottom:   tokens.space.sm,
                    lineHeight:     22,
                    fontSize:       tokens.fontSize.md,
                    color:          '#8E8E93',
                },
                buttonContainer: {
                    flexDirection: 'row',
                    gap:           tokens.space.sm,
                    marginTop:     tokens.space.sm,
                },
                buttonSecondary: {
                    backgroundColor: '#121212',
                    flex: 1,
                    minHeight: 48,
                    paddingVertical: tokens.space.sm,
                    paddingHorizontal: tokens.space.sm,
                    borderRadius: tokens.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                buttonMain: {
                    backgroundColor: '#5E5CE6',
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
                    color: '#8E8E93',
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
                    color: '#8E8E93',
                },
                radioContainer: {
                    flexDirection: 'row',
                    alignContent:  'center',
                    marginTop:     tokens.space.md,
                },
                radioIconColor: '#5E5CE6',
                radioText: {
                    fontSize:   tokens.fontSize.lg,
                    marginLeft: tokens.space.md,
                    color:      '#FFFFFF',
                },
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
                    borderColor:  '#38383A',
                    borderRadius: tokens.radius.md,
                    padding:      tokens.space.sm,
                    paddingVertical: Platform.OS === 'ios' ? tokens.space.sm : tokens.space.xs,
                    flex:         1,
                    marginRight:  tokens.space.xs,
                    color:        '#FFFFFF',
                    backgroundColor: '#2C2C2E',
                },
                textInputIconColor:        '#5E5CE6',
                textInputPlaceholderColor: '#8E8E93',
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

const StyleWelcome = {
    light: {
        buttonContainer: {
            backgroundColor: '#FFFFFF',
            borderRadius: tokens.radius.md,
            paddingVertical: tokens.space.md,
            marginHorizontal: tokens.space.xl,
            marginVertical: tokens.space.md,
            ...tokens.shadow.md,
            justifyContent: 'center',
        },
        buttonText: {
            fontSize: tokens.fontSize.md,
            color: '#5E5CE6',
            alignSelf: 'center',
            letterSpacing: 0.5,
        },
        mainText: {
            color: '#006F9F', 
            fontSize: tokens.fontSize.xl,
            fontWeight: tokens.fontWeight.bold,
            marginBottom: tokens.space.sm,
            textAlign: 'center',
        },
        secondaryText: {
            color: '#555555', 
            fontSize: tokens.fontSize.md,
            textAlign: 'center',
            lineHeight: 22,
            opacity: 0.9,
        },
        pageDots: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: tokens.space.md,
        },
        circleFill: {
            width: 24,
            height: 8,
            marginHorizontal: tokens.space.xs,
            borderRadius: tokens.radius.md,
            backgroundColor: '#FFFFFF',
        },
        circleEmpty: {
            width: 8,
            height: 8,
            borderRadius: tokens.radius.md,
            marginHorizontal: tokens.space.xs,
            backgroundColor: '#FFFFFF44',
        },
        whiteCardContainer: {
            flexShrink: 1,
        },
        whiteCard: {
            backgroundColor: '#FFFFFFEE',
            borderRadius: tokens.radius.xl,
            padding: tokens.space.lg,
            marginHorizontal: tokens.space.md,
            marginVertical: tokens.space.md,
            ...tokens.shadow.lg,
        },
        whiteCardText: {
            fontSize: tokens.fontSize.lg,
            marginBottom: tokens.space.md,
            color: '#1A1D23',
            letterSpacing: 0.1,
        },
        whiteCardButton: {
            backgroundColor: '#F5F7FA',
            borderRadius: tokens.radius.md,
            borderColor: '#E0E4EA',
            borderWidth: 1.5,
            paddingVertical: tokens.space.sm,
            paddingHorizontal: tokens.space.md,
            marginRight: tokens.space.sm,
            marginBottom: tokens.space.sm,
        },
        whiteCardButtonSelected: {
            backgroundColor: '#5E5CE6',
            borderRadius: tokens.radius.md,
            borderColor: '#5E5CE6',
            borderWidth: 1.5,
            paddingVertical: tokens.space.sm,
            paddingHorizontal: tokens.space.md,
            marginRight: tokens.space.sm,
            marginBottom: tokens.space.sm,
        },
        whiteCardButtonText: {
            fontSize: tokens.fontSize.sm,
            alignSelf: 'center',
            color: '#495057',
        },
        whiteCardButtonTextSelected: {
            fontSize: tokens.fontSize.sm,
            alignSelf: 'center',
            color: '#FFFFFF',
        },
        whiteCardGroupButton: {
            backgroundColor: '#F5F7FA',
            borderRadius: tokens.radius.md,
            borderColor: '#E0E4EA',
            borderWidth: 1.5,
            paddingVertical: tokens.space.sm,
            paddingHorizontal: tokens.space.md,
            marginRight: tokens.space.sm,
            marginBottom: tokens.space.sm,
            flex: 1,
        },
        whiteCardGroupText: {
            fontSize: tokens.fontSize.sm,
            color: '#495057',
        },
        greyBottomText: {
            fontSize: tokens.fontSize.xs,
            marginTop: tokens.space.sm,
            marginHorizontal: tokens.space.sm,
            color: '#00000066',
            lineHeight: 18,
        },
        gradientColor: ['#5E5CE6', '#33b5e8', '#45D7E8'],
        placeholderTextColor: '#00000066',
        welcomeButtonIconColor: '#5E5CE6',
    },
    dark: {
        buttonContainer: {
            backgroundColor: '#3D2540',
            borderRadius: tokens.radius.md,
            paddingVertical: tokens.space.md,
            marginHorizontal: tokens.space.xl,
            marginVertical: tokens.space.md,
            ...tokens.shadow.md,
            justifyContent: 'center',
        },
        buttonText: {
            fontSize: tokens.fontSize.md,
            color: '#FFFFFF',
            alignSelf: 'center',
            letterSpacing: 0.5,
        },
        mainText: {
            color: '#ffffff', 
            fontSize: tokens.fontSize.xl,
            fontWeight: tokens.fontWeight.bold,
            marginBottom: tokens.space.sm,
            textAlign: 'center',
        },
        secondaryText: {
            color: '#006F9F', 
            fontSize: tokens.fontSize.md,
            textAlign: 'center',
            lineHeight: 22,
            fontWeight: tokens.fontWeight.medium,
        },
        pageDots: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: tokens.space.md,
        },
        circleFill: {
            width: 24,
            height: 8,
            marginHorizontal: tokens.space.xs,
            borderRadius: tokens.radius.md,
            backgroundColor: '#FFFFFF',
        },
        circleEmpty: {
            width: 8,
            height: 8,
            borderRadius: tokens.radius.md,
            marginHorizontal: tokens.space.xs,
            backgroundColor: '#FFFFFF33',
        },
        whiteCardContainer: {
            flexShrink: 1,
        },
        whiteCard: {
            backgroundColor: '#3D2540DD',
            borderRadius: tokens.radius.xl,
            padding: tokens.space.lg,
            marginHorizontal: tokens.space.md,
            marginVertical: tokens.space.md,
            ...tokens.shadow.lg,
        },
        whiteCardText: {
            fontSize: tokens.fontSize.lg,
            marginBottom: tokens.space.md,
            color: '#F0EAF1',
            letterSpacing: 0.1,
        },
        whiteCardButton: {
            backgroundColor: '#2D1A2E',
            borderRadius: tokens.radius.md,
            borderColor: '#5A3A5C',
            borderWidth: 1.5,
            paddingVertical: tokens.space.sm,
            paddingHorizontal: tokens.space.md,
            marginRight: tokens.space.sm,
            marginBottom: tokens.space.sm,
        },
        whiteCardButtonSelected: {
            backgroundColor: '#FFFFFF',
            borderRadius: tokens.radius.md,
            borderColor: '#FFFFFF',
            borderWidth: 1.5,
            paddingVertical: tokens.space.sm,
            paddingHorizontal: tokens.space.md,
            marginRight: tokens.space.sm,
            marginBottom: tokens.space.sm,
        },
        whiteCardButtonText: {
            fontSize: tokens.fontSize.sm,
            alignSelf: 'center',
            color: '#B1A5B2',
        },
        whiteCardButtonTextSelected: {
            fontSize: tokens.fontSize.sm,
            alignSelf: 'center',
            color: '#2D1A2E',
        },
        whiteCardGroupButton: {
            backgroundColor: '#2D1A2E',
            borderRadius: tokens.radius.md,
            borderColor: '#5A3A5C',
            borderWidth: 1.5,
            paddingVertical: tokens.space.sm,
            paddingHorizontal: tokens.space.md,
            marginRight: tokens.space.sm,
            marginBottom: tokens.space.sm,
            flex: 1,
        },
        whiteCardGroupText: {
            fontSize: tokens.fontSize.sm,
            color: '#B1A5B2',
        },
        greyBottomText: {
            fontSize: tokens.fontSize.xs,
            marginTop: tokens.space.sm,
            marginHorizontal: tokens.space.sm,
            color: '#FFFFFF66',
            lineHeight: 18,
        },
        gradientColor: ['#120912', '#2D1A2E', '#713775'],
        placeholderTextColor: '#FFFFFF66',
        welcomeButtonIconColor: '#FFFFFF',
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
        searchInputView: { flex: 0 },
        searchInput: {
            height:    40,
            paddingLeft: tokens.space.sm,
            color:     'white',
        },
        sectionList: { flex: 0 },

        sections: [
            { backgroundColor: 'rgba(0, 122, 255, 0.1)' },
            { backgroundColor: 'rgba(52, 199, 89, 0.1)' },
            { backgroundColor: 'rgba(255, 149, 0, 0.1)' },
            { backgroundColor: 'rgba(255, 59, 48, 0.1)' },
            { backgroundColor: 'rgba(88, 86, 214, 0.1)' },
            { backgroundColor: 'rgba(90, 200, 250, 0.1)' },
        ],
        sectionHeaders: [
            { backgroundColor: '#007AFF' },
            { backgroundColor: '#34C759' },
            { backgroundColor: '#FF9500' },
            { backgroundColor: '#FF3B30' },
            { backgroundColor: '#5856D6' },
            { backgroundColor: '#5AC8FA' },
        ],

        homeView: {
            flex:            1,
            backgroundColor: 'transparent',
        },
        view: {
            backgroundColor:  'transparent',
            borderWidth:      0,
            borderBottomColor: colors.gray,
            paddingHorizontal: tokens.space.lg,
            paddingVertical:  tokens.space.sm,
            justifyContent:   'space-between',
        },
        sectionHeaderView: {
            height:          40,
            flex:            1,
            flexDirection:   'column',
            justifyContent:  'space-around',
            alignItems:      'center',
            alignContent:    'center',
            borderBottomColor: colors.gray,
            borderRadius:    tokens.radius.sm,
            marginHorizontal: tokens.space.sm,
            marginTop:       tokens.space.sm,
            ...tokens.shadow.sm,
        },
        sectionHeaderTitle: {
            fontWeight: tokens.fontWeight.bold,
            fontSize:   tokens.fontSize.md,
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

export { tokens, StyleWelcome };
export default style as typeof style & { Theme: Record<ThemeKey, AppThemeType> };