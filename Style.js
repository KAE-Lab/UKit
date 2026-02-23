import { Platform } from 'react-native';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────

const tokens = {
    space: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    radius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        pill: 999,
    },
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 22,
        xxl: 28,
        hero: 36,
    },
    fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },
    shadow: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.10,
            shadowRadius: 12,
            elevation: 5,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.14,
            shadowRadius: 20,
            elevation: 10,
        },
    },
};

// ─── COULEURS DE BASE ─────────────────────────────────────────────────────────

const colors = {
    // Marque
    brand:      '#009ee0',
    brandDark:  '#007ab8',
    brandLight: '#33b5e8',

    // Neutres
    // white: '#FFFFFF',
    // black: '#000000',
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

    // Compatibilité cours
    gray:        '#454545',
    lightblue:   '#40C4FF',
    blue:        '#006F9F',
    darkblue:    '#0D47A1',
    darkred:     '#D50000',
    backgroundGrey: '#E9E9EF',
};

const hintColors = {
    green: '#55da59',
    gray: '#9499a1AA',
};

// ─── PALETTES MATERIAL (sections de liste) ────────────────────────────────────

const colors200 = {
    red:        '#EF9A9A',
    pink:       '#F48FB1',
    purple:     '#CE93D8',
    deepPurple: '#B39DDB',
    indigo:     '#9FA8DA',
    blue:       '#90CAF9',
    lightBlue:  '#81D4FA',
    cyan:       '#80DEEA',
    teal:       '#80CBC4',
    green:      '#A5D6A7',
    lightGreen: '#C5E1A5',
    lime:       '#E6EE9C',
    yellow:     '#FFF59D',
    amber:      '#FFE082',
    orange:     '#FFCC80',
    deepOrange: '#FFAB91',
    brown:      '#BCAAA4',
    grey:       '#EEEEEE',
    blueGrey:   '#B0BEC5',
};

const colors50 = {
    red:        '#FFEBEE',
    pink:       '#FCE4EC',
    purple:     '#F3E5F5',
    deepPurple: '#EDE7F6',
    indigo:     '#E8EAF6',
    blue:       '#E3F2FD',
    lightBlue:  '#E1F5FE',
    cyan:       '#E0F7FA',
    teal:       '#E0F2F1',
    green:      '#E8F5E9',
    lightGreen: '#F1F8E9',
    lime:       '#F9FBE7',
    yellow:     '#FFFDE7',
    amber:      '#FFF8E1',
    orange:     '#FFF3E0',
    deepOrange: '#FBE9E7',
    brown:      '#EFEBE9',
    grey:       '#FAFAFA',
    blueGrey:   '#ECEFF1',
};

// ─── THÈME GLOBAL ─────────────────────────────────────────────────────────────

const AppTheme = {
    primary:   '#009ee0',
    secondary: '#0098c5',
};

// ─── THÈMES CLAIR / SOMBRE ────────────────────────────────────────────────────

const Theme = {
    light: {
        primary:    '#009ee0',
        primarySoft: '#E8F6FD',

        secondary:  '#0098c5',
        selection:  '#F0F4F8',

        accentFont:    '#C62828',
        font:          '#1A1D23',
        fontSecondary: '#6C757D',
        lightFont:     '#F8F9FA',

        link:   '#1565C0',
        icon:   '#4C5464',
        border: '#E0E4EA',

        background:              '#F5F7FA',
        cardBackground:          '#FFFFFF',
        greyBackground:          '#F0F4F8',
        collapsableBackground:   '#00000008',
        field:                   '#FFFFFF',
        fieldBorder:             '#DEE2E6',

        courseBackground: '#F5F7FA',
        eventBackground:  '#FFFFFF',
        eventBorder:      '#E0E4EA',

        sections:       ['#E8F6FD', '#E3F5F9', '#E8F5E9', '#FFF8E1', '#FCE4EC', '#EDE7F6'],
		sectionsHeaders: ['#009ee0', '#00ACC1', '#43A047', '#F9A825', '#E91E63', '#7E57C2'],
		
		calendar: {
			selection: '#009ee0',
			currentDay: '#e8f6fd',
			sunday: '#fff3f3'
		},

        // ── Settings ─────────────────────────────────────────────────
        settings: {
            switchTrack: {
                false: '#DEE2E6',
                true:  '#009ee0',
            },
            background: {
                flex: 1,
                backgroundColor: '#F5F7FA',
            },
            separationText: {
                color:      '#6C757D',
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
                color:           '#1A1D23',
                fontSize:        tokens.fontSize.md,
                marginHorizontal: tokens.space.md,
                alignSelf:       'center',
            },
            buttonSecondaryText: {
                fontWeight: tokens.fontWeight.regular,
                color:      '#6C757D',
                fontSize:   tokens.fontSize.md,
                marginLeft: 'auto',
                alignSelf:  'center',
            },
            leftIcon: {
                marginLeft: tokens.space.md,
                color:      '#009ee0',
                alignSelf:  'center',
            },
            rightIcon: {
                alignSelf:       'center',
                color:           '#ADB5BD',
                marginHorizontal: tokens.space.xs,
            },
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
                        backgroundColor: '#E8F6FD',
                        padding:         tokens.space.sm,
                        borderRadius:    tokens.radius.lg,
                        margin:          tokens.space.sm,
                        flexDirection:   'row',
                        alignItems:      'center',
                    },
                    buttonText: {
                        fontSize:   tokens.fontSize.lg,
                        fontWeight: tokens.fontWeight.bold,
                        color:      '#009ee0',
                    },
                    iconColor: '#009ee0',
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
                    borderRadius:    tokens.radius.xl,
                    padding:         tokens.space.md,
                    marginHorizontal: tokens.space.md,
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
                    fontSize:   tokens.fontSize.lg,
                    color:      '#1A1D23',
                },
                textDescription: {
                    marginVertical: tokens.space.sm,
                    fontSize:       tokens.fontSize.md,
                    color:          '#6C757D',
                },
                buttonContainer: {
                    flexDirection:  'row',
                    justifyContent: 'space-around',
                    marginTop:      tokens.space.xl,
                },
                buttonSecondary: {
                    flex:            1,
                    backgroundColor: '#F0F4F8',
                    borderRadius:    tokens.radius.md,
                    paddingVertical: tokens.space.sm,
                    marginHorizontal: tokens.space.xs,
                    alignItems:      'center',
                },
                buttonMain: {
                    flex:            1,
                    backgroundColor: '#009ee0',
                    borderRadius:    tokens.radius.md,
                    paddingVertical: tokens.space.sm,
                    marginHorizontal: tokens.space.xs,
                    alignItems:      'center',
                },
                buttonTextSecondary: {
                    fontSize: tokens.fontSize.lg,
                    color:    '#6C757D',
                },
                buttonTextMain: {
                    fontSize: tokens.fontSize.lg,
                    color:    '#FFFFFF',
                },
                closeIcon: {
                    color: '#ADB5BD',
                },
                radioContainer: {
                    flexDirection:  'row',
                    alignContent:   'center',
                    marginTop:      tokens.space.md,
                },
                radioIconColor: '#009ee0',
                radioText: {
                    fontSize:  tokens.fontSize.lg,
                    marginLeft: tokens.space.md,
                    color:     '#1A1D23',
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
                    borderColor:  '#DEE2E6',
                    borderRadius: tokens.radius.md,
                    padding:      tokens.space.sm,
                    paddingVertical: Platform.OS === 'ios' ? tokens.space.sm : tokens.space.xs,
                    flex:         1,
                    marginRight:  tokens.space.xs,
                    color:        '#1A1D23',
                    backgroundColor: '#F8F9FA',
                },
                textInputIconColor:        '#009ee0',
                textInputPlaceholderColor: '#ADB5BD',
            },
        },

        // ── Couleurs des cours ────────────────────────────────────────
        courses: {
            '#FFFF00': '#c0ca33',
            '#00FFFF': '#00acc1',
            '#800040': '#546e7a',
            '#808000': '#546e7a',
            '#800000': '#e53935',
            '#8000FF': '#fb8c00',
            '#00FF00': '#43a047',
            '#400080': '#5c6bc0',
            default:   '#5c6bc0',
        },
    },

    dark: {
        primary:    '#1A0D1B',
        primarySoft: '#2D1A2E',

        accent: '#C48FE0',

        secondary:  '#200F21',
        selection:  '#3D2540',

        accentFont:    '#EF9A9A',
        font:          '#F0EAF1',
        fontSecondary: '#B1A5B2',
        lightFont:     '#F0EAF1',

        link:   '#82B1FF',
        icon:   '#C48FE0',
        border: '#5A3A5C',

        background:            '#120912',
        cardBackground:        '#2D1A2E',
        greyBackground:        '#1A0D1B',
        collapsableBackground: '#FFFFFF0A',
        field:                 '#3D2540',
        fieldBorder:           '#5A3A5C',

        courseBackground: '#2D1A2E',
        eventBackground:  '#3D2540',
        eventBorder:      '#5A3A5C',

        sections:        ['#1A2744', '#1A2E30', '#1A2E1B', '#2E2710', '#2E1520', '#21192E'],
		sectionsHeaders: ['#1565C0', '#00838F', '#2E7D32', '#F57F17', '#880E4F', '#4527A0'],
		
		calendar: {
			selection: '#7b3f9e',
			currentDay: '#2d1a2e',
			sunday: '#2e1520',
		},

        // ── Settings ─────────────────────────────────────────────────
        settings: {
            switchTrack: {
                false: '#5A3A5C',
                true:  '#7B3F9E',
            },
            background: {
                flex: 1,
                backgroundColor: '#120912',
            },
            separationText: {
                color:      '#B1A5B2',
                fontSize:   tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                marginTop:  tokens.space.lg,
                marginLeft: tokens.space.md,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
            },
            button: {
                backgroundColor: '#2D1A2E',
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
                color:           '#F0EAF1',
                fontSize:        tokens.fontSize.md,
                marginHorizontal: tokens.space.md,
                alignSelf:       'center',
            },
            buttonSecondaryText: {
                fontWeight: tokens.fontWeight.regular,
                color:      '#B1A5B2',
                fontSize:   tokens.fontSize.md,
                marginLeft: 'auto',
                alignSelf:  'center',
            },
            leftIcon: {
                marginLeft: tokens.space.md,
                color:      '#C48FE0',
                alignSelf:  'center',
            },
            rightIcon: {
                alignSelf:        'center',
                color:            '#B1A5B2',
                marginHorizontal: tokens.space.xs,
            },
            popup: {
                filters: {
                    container: {
                        flex:            1,
                        flexGrow:        1,
                        backgroundColor: '#2D1A2E',
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
                        backgroundColor: '#3D2540',
                        padding:         tokens.space.sm,
                        borderRadius:    tokens.radius.lg,
                        margin:          tokens.space.sm,
                        flexDirection:   'row',
                        alignItems:      'center',
                    },
                    buttonText: {
                        fontSize:   tokens.fontSize.lg,
                        fontWeight: tokens.fontWeight.bold,
                        color:      '#C48FE0',
                    },
                    iconColor: '#C48FE0',
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
                    backgroundColor: '#2D1A2E',
                    borderRadius:    tokens.radius.xl,
                    padding:         tokens.space.md,
                    marginHorizontal: tokens.space.md,
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
                    fontSize:   tokens.fontSize.lg,
                    color:      '#F0EAF1',
                },
                textDescription: {
                    marginVertical: tokens.space.sm,
                    fontSize:       tokens.fontSize.md,
                    color:          '#B1A5B2',
                },
                buttonContainer: {
                    flexDirection:  'row',
                    justifyContent: 'space-around',
                    marginTop:      tokens.space.xl,
                },
                buttonSecondary: {
                    flex:            1,
                    backgroundColor: '#3D2540',
                    borderRadius:    tokens.radius.md,
                    paddingVertical: tokens.space.sm,
                    marginHorizontal: tokens.space.xs,
                    alignItems:      'center',
                },
                buttonMain: {
                    flex:            1,
                    backgroundColor: '#7B3F9E',
                    borderRadius:    tokens.radius.md,
                    paddingVertical: tokens.space.sm,
                    marginHorizontal: tokens.space.xs,
                    alignItems:      'center',
                },
                buttonTextSecondary: {
                    fontSize: tokens.fontSize.lg,
                    color:    '#B1A5B2',
                },
                buttonTextMain: {
                    fontSize: tokens.fontSize.lg,
                    color:    '#F0EAF1',
                },
                closeIcon: {
                    color: '#B1A5B2',
                },
                radioContainer: {
                    flexDirection: 'row',
                    alignContent:  'center',
                    marginTop:     tokens.space.md,
                },
                radioIconColor: '#C48FE0',
                radioText: {
                    fontSize:   tokens.fontSize.lg,
                    marginLeft: tokens.space.md,
                    color:      '#F0EAF1',
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
                    borderColor:  '#5A3A5C',
                    borderRadius: tokens.radius.md,
                    padding:      tokens.space.sm,
                    paddingVertical: Platform.OS === 'ios' ? tokens.space.sm : tokens.space.xs,
                    flex:         1,
                    marginRight:  tokens.space.xs,
                    color:        '#F0EAF1',
                    backgroundColor: '#3D2540',
                },
                textInputIconColor:        '#C48FE0',
                textInputPlaceholderColor: '#5A3A5C',
            },
        },

        // ── Couleurs des cours ────────────────────────────────────────
        courses: {
            '#FFFF00': '#7c8500',
            '#00FFFF': '#006064',
            '#800040': '#37474f',
            '#808000': '#37474f',
            '#800000': '#b71c1c',
            '#8000FF': '#e65100',
            '#00FF00': '#1b5e20',
            '#400080': '#283593',
            default:   '#283593',
        },
    },
};

// ─── STYLES GLOBAUX ───────────────────────────────────────────────────────────

export { tokens };

export default {
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
			borderBottomWidth: 1,
			borderBottomColor: '#E0E4EA',
		},
		titleText: {
			fontSize: tokens.fontSize.lg,
			fontWeight: tokens.fontWeight.semibold,
		},
		contentView: {
			flex: 1,
		},

		course: {
			root: {
				flex: 1,
				flexDirection: 'column',
				marginVertical: tokens.space.xs,
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
				fontWeight: tokens.fontWeight.medium,
				textAlign: 'center',
			},
			contentBlock: {
				flex: 1,
				flexDirection: 'column',
				paddingVertical: tokens.space.sm,
				paddingRight: tokens.space.sm,
			},
			contentType: {
				flex: 1,
				flexDirection: 'row',
				justifyContent: 'space-between',
				alignItems: 'flex-start',
			},
			content: {
				fontSize: tokens.fontSize.sm,
			},
			title: {
				fontSize: tokens.fontSize.sm,
				fontWeight: tokens.fontWeight.semibold,
			},
			iconHeader: {
				flexDirection: 'row',
				alignItems: 'center',
				marginTop: tokens.space.xs,
			},
			line: {
				flexDirection: 'row',
				alignItems: 'center',
				marginTop: tokens.space.xs,
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
			noCourse: {
				flex: 1,
				justifyContent: 'center',
				alignItems: 'center',
				paddingVertical: tokens.space.xl,
			},
			noCourseText: {
				fontSize: tokens.fontSize.md,
				fontWeight: tokens.fontWeight.medium,
				opacity: 0.5,
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
            borderRadius: tokens.radius.pill,
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

    // ── Calendar ──────────────────────────────────────────────────────────────
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
            borderRadius: tokens.radius.pill,
            backgroundColor: '#009ee0',
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

        // Fonds de sections (couleurs pastel)
        sections: [
            { backgroundColor: colors50.deepOrange },
            { backgroundColor: colors50.pink },
            { backgroundColor: colors50.lightBlue },
            { backgroundColor: colors50.blueGrey },
            { backgroundColor: colors50.green },
            { backgroundColor: colors50.purple },
        ],
        // Headers de sections
        sectionHeaders: [
            { backgroundColor: colors200.deepOrange },
            { backgroundColor: colors200.pink },
            { backgroundColor: colors200.lightBlue },
            { backgroundColor: colors200.blueGrey },
            { backgroundColor: colors200.green },
            { backgroundColor: colors200.purple },
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
            // backgroundColor: 'white',
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
        itemSize: 60,
    },

    Theme,
};