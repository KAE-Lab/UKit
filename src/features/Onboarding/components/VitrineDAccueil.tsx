/**
 * L'arrivee de l'accueil, la vitrine (7-J, accueil refait, direction A choisie le 2026-11-07).
 *
 * L'accueil montre l'application avant de lui poser une question : trois vraies cartes de UKit, un
 * cours, un restaurant, une bibliotheque, flottent en relief sur une lueur aux couleurs du logo. Ce
 * sont les composants des onglets eux-memes (`CourseRow`, et les briques des cartes Campus, `LieuxDExemple`)
 * nourris d'exemples, pas des dessins : ce qu'on voit ici est ce qu'on aura. L'arrivee etait un U et
 * une phrase sur un ecran vide (review du 2026-11-06, « passe a la trappe »).
 *
 * Un seul moment orchestre : les cartes montent l'une apres l'autre, puis la pile respire lentement.
 * Sous « reduire les animations », tout est la d'emblee et rien ne bouge. Les cartes ne se touchent
 * pas : la pile est un decor, le bouton du pied est la seule action.
 *
 * Les exemples sont generiques la ou un lieu reel n'est pas verifie (le restaurant), et vrais la ou
 * il l'est (la bibliotheque Sciences et Techniques de Talence).
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Reanimated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import Translator from '../../../shared/i18n/Translator';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { LogoUKit } from '../../../shared/ui/epure/LogoUKit';
import { CourseRow } from '../../Planning/components/CourseRow';
import { coursDExemple, MINUTE_D_EXEMPLE } from './exemples';
import { BibliothequeDExemple, RestaurantDExemple } from './LieuxDExemple';

/** La pile respire : un aller-retour lent, assez pour se sentir vivant, pas assez pour distraire. */
const RESPIRATION_MS = 3600;
/** L'ecart entre l'arrivee de deux cartes : un moment, pas une cascade de liste. */
const PAS_D_ARRIVEE = 140;
/** La pile est dessinee en grand, puis reduite : les cartes gardent leur mise en page d'onglet. */
const ECHELLE_DE_LA_PILE = 0.86;
const LOGO = 72;

/** La lueur du fond : les deux couleurs du logo, du centre vers rien. */
function Lueur({ theme, largeur, sombre }: { theme: AppThemeType; largeur: number; sombre: boolean }) {
    // Sur fond clair, la meme lueur lavait la page : elle s'y fait plus discrete.
    const intensite = sombre ? 0.34 : 0.16;
    return (
        <Svg pointerEvents="none" width={largeur * 1.4} height={largeur * 1.4} style={[styles.lueur, { left: -largeur * 0.2 }]}>
            <Defs>
                <RadialGradient id="lueur" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={theme.accent} stopOpacity={intensite} />
                    <Stop offset="0.45" stopColor={theme.accentProfond} stopOpacity={intensite / 3} />
                    <Stop offset="1" stopColor={theme.accentProfond} stopOpacity={0} />
                </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#lueur)" />
        </Svg>
    );
}

export function VitrineDAccueil({ theme, sombre, degagement }: { theme: AppThemeType; sombre: boolean; degagement: number }) {
    const { width } = useWindowDimensions();
    const mouvementReduit = useReducedMotion();
    const souffle = useSharedValue(0);
    const cours = coursDExemple(theme)[0];

    useEffect(() => {
        if (mouvementReduit) return;
        souffle.value = withRepeat(withTiming(1, { duration: RESPIRATION_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
    }, [souffle, mouvementReduit]);

    // La perspective d'abord, puis l'inclinaison : l'ordre des transformations fait le relief.
    const pile = useAnimatedStyle(() => ({
        transform: [
            { perspective: 1000 },
            { translateY: -souffle.value * tokens.space.sm },
            { rotateX: `${16 - souffle.value * 4}deg` },
            { rotateZ: `${-5 + souffle.value * 1.5}deg` },
            { scale: ECHELLE_DE_LA_PILE },
        ] as const,
    }));

    const arrivee = (rang: number) => (mouvementReduit ? undefined : FadeInDown.delay(rang * PAS_D_ARRIVEE).duration(tokens.mouvement.couture * 3));

    return (
        <View style={[styles.page, { paddingBottom: degagement }]}>
            <Lueur theme={theme} largeur={width} sombre={sombre} />
            <View style={styles.logo}>
                <LogoUKit theme={theme} largeur={LOGO} />
            </View>

            <View style={styles.scene} pointerEvents="none">
                <Reanimated.View style={[styles.pile, { width }, pile]}>
                    <Reanimated.View entering={arrivee(2)} style={[styles.carte, styles.fond, { width: width - tokens.space.xl * 2 }]}>
                        <BibliothequeDExemple theme={theme} />
                    </Reanimated.View>
                    <Reanimated.View entering={arrivee(1)} style={[styles.carte, styles.milieu, { width: width - tokens.space.xl * 2 }]}>
                        <RestaurantDExemple theme={theme} />
                    </Reanimated.View>
                    <Reanimated.View entering={arrivee(0)} style={[styles.carte, styles.devant, { width: width - tokens.space.xl }]}>
                        <CourseRow data={cours} theme={theme} minute={MINUTE_D_EXEMPLE} />
                    </Reanimated.View>
                </Reanimated.View>
            </View>

            <Reanimated.View entering={arrivee(3)} style={styles.texte}>
                <Text style={[tokens.texte.grandTitre, styles.titre, { color: theme.font }]}>
                    {Translator.get('VITRINE_TITRE')}
                    {'\n'}
                    <Text style={{ color: theme.fontTertiary }}>{Translator.get('VITRINE_TITRE_SUITE')}</Text>
                </Text>
                <Text style={[styles.origine, { color: theme.fontSecondary }]}>{Translator.get('VITRINE_ORIGINE')}</Text>
            </Reanimated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    lueur: {
        position: 'absolute',
        top: 0,
    },
    logo: {
        position: 'absolute',
        top: tokens.space.xxl,
        left: tokens.space.xl,
    },
    scene: {
        flex: 1,
        justifyContent: 'center',
        marginTop: tokens.space.xxl * 2,
    },
    pile: {
        height: 380,
        alignSelf: 'center',
    },
    carte: {
        position: 'absolute',
    },
    fond: {
        top: 240,
        left: tokens.space.xl,
    },
    milieu: {
        top: 118,
        left: tokens.space.xxl,
    },
    devant: {
        top: 0,
        left: tokens.space.md,
    },
    texte: {
        paddingHorizontal: tokens.space.xl,
        paddingBottom: tokens.space.lg,
    },
    titre: {
        alignSelf: 'stretch',
    },
    origine: {
        alignSelf: 'stretch',
        marginTop: tokens.space.md,
        fontSize: tokens.fontSize.md,
        lineHeight: 22,
    },
});
