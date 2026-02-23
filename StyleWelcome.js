import { tokens } from './Style';

export default {
    light: {
        // ── Bouton principal ──────────────────────────────────────────
        buttonContainer: {
            backgroundColor: '#FFFFFF',
            borderRadius: tokens.radius.pill,
            paddingVertical: tokens.space.md,
            marginHorizontal: tokens.space.xl,
            marginVertical: tokens.space.md,
            ...tokens.shadow.md,
            justifyContent: 'center',
        },
        buttonText: {
            fontFamily: 'Montserrat_600SemiBold',
            fontSize: tokens.fontSize.md,
            color: '#009ee0',
            alignSelf: 'center',
            letterSpacing: 0.5,
        },

        // ── Textes principaux ─────────────────────────────────────────
        mainText: {
            fontFamily: 'Montserrat_700Bold',
            fontSize: tokens.fontSize.hero,
            alignSelf: 'center',
            color: '#FFFFFF',
            marginTop: tokens.space.xxl,
            letterSpacing: -0.5,
            textAlign: 'center',
        },
        secondaryText: {
            fontFamily: 'Montserrat_500Medium',
            fontSize: tokens.fontSize.lg,
            alignSelf: 'center',
            color: '#FFFFFFCC',
            marginHorizontal: tokens.space.xl,
            textAlign: 'center',
            marginTop: tokens.space.lg,
            lineHeight: 28,
        },

        // ── Pagination ────────────────────────────────────────────────
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
            borderRadius: tokens.radius.pill,
            backgroundColor: '#FFFFFF',
        },
        circleEmpty: {
            width: 8,
            height: 8,
            borderRadius: tokens.radius.pill,
            marginHorizontal: tokens.space.xs,
            backgroundColor: '#FFFFFF44',
        },

        // ── Card blanche ──────────────────────────────────────────────
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
            fontFamily: 'Montserrat_600SemiBold',
            fontSize: tokens.fontSize.lg,
            marginBottom: tokens.space.md,
            color: '#1A1D23',
            letterSpacing: 0.1,
        },

        // ── Boutons de sélection ──────────────────────────────────────
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
            backgroundColor: '#009ee0',
            borderRadius: tokens.radius.md,
            borderColor: '#009ee0',
            borderWidth: 1.5,
            paddingVertical: tokens.space.sm,
            paddingHorizontal: tokens.space.md,
            marginRight: tokens.space.sm,
            marginBottom: tokens.space.sm,
        },
        whiteCardButtonText: {
            fontFamily: 'Montserrat_500Medium',
            fontSize: tokens.fontSize.sm,
            alignSelf: 'center',
            color: '#495057',
        },
        whiteCardButtonTextSelected: {
            fontFamily: 'Montserrat_500Medium',
            fontSize: tokens.fontSize.sm,
            alignSelf: 'center',
            color: '#FFFFFF',
        },

        // ── Boutons de groupe ─────────────────────────────────────────
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
            fontFamily: 'Montserrat_500Medium',
            fontSize: tokens.fontSize.sm,
            color: '#495057',
        },

        // ── Divers ────────────────────────────────────────────────────
        greyBottomText: {
            fontFamily: 'Montserrat_500Medium',
            fontSize: tokens.fontSize.xs,
            marginTop: tokens.space.sm,
            marginHorizontal: tokens.space.sm,
            color: '#00000066',
            lineHeight: 18,
        },
        gradientColor: ['#009ee0', '#33b5e8', '#45D7E8'],
        placeholderTextColor: '#00000066',
        welcomeButtonIconColor: '#009ee0',
    },

    dark: {
        // ── Bouton principal ──────────────────────────────────────────
        buttonContainer: {
            backgroundColor: '#3D2540',
            borderRadius: tokens.radius.pill,
            paddingVertical: tokens.space.md,
            marginHorizontal: tokens.space.xl,
            marginVertical: tokens.space.md,
            ...tokens.shadow.md,
            justifyContent: 'center',
        },
        buttonText: {
            fontFamily: 'Montserrat_600SemiBold',
            fontSize: tokens.fontSize.md,
            color: '#FFFFFF',
            alignSelf: 'center',
            letterSpacing: 0.5,
        },

        // ── Textes principaux ─────────────────────────────────────────
        mainText: {
            fontFamily: 'Montserrat_700Bold',
            fontSize: tokens.fontSize.hero,
            alignSelf: 'center',
            color: '#FFFFFF',
            marginTop: tokens.space.xxl,
            letterSpacing: -0.5,
            textAlign: 'center',
        },
        secondaryText: {
            fontFamily: 'Montserrat_500Medium',
            fontSize: tokens.fontSize.lg,
            alignSelf: 'center',
            color: '#FFFFFFBB',
            marginHorizontal: tokens.space.xl,
            textAlign: 'center',
            marginTop: tokens.space.lg,
            lineHeight: 28,
        },

        // ── Pagination ────────────────────────────────────────────────
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
            borderRadius: tokens.radius.pill,
            backgroundColor: '#FFFFFF',
        },
        circleEmpty: {
            width: 8,
            height: 8,
            borderRadius: tokens.radius.pill,
            marginHorizontal: tokens.space.xs,
            backgroundColor: '#FFFFFF33',
        },

        // ── Card ──────────────────────────────────────────────────────
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
            fontFamily: 'Montserrat_600SemiBold',
            fontSize: tokens.fontSize.lg,
            marginBottom: tokens.space.md,
            color: '#F0EAF1',
            letterSpacing: 0.1,
        },

        // ── Boutons de sélection ──────────────────────────────────────
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
            fontFamily: 'Montserrat_500Medium',
            fontSize: tokens.fontSize.sm,
            alignSelf: 'center',
            color: '#B1A5B2',
        },
        whiteCardButtonTextSelected: {
            fontFamily: 'Montserrat_500Medium',
            fontSize: tokens.fontSize.sm,
            alignSelf: 'center',
            color: '#2D1A2E',
        },

        // ── Boutons de groupe ─────────────────────────────────────────
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
            fontFamily: 'Montserrat_500Medium',
            fontSize: tokens.fontSize.sm,
            color: '#B1A5B2',
        },

        // ── Divers ────────────────────────────────────────────────────
        greyBottomText: {
            fontFamily: 'Montserrat_500Medium',
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