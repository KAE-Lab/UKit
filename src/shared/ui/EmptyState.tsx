/**
 * Le bloc « il n'y a rien a montrer, et voila pourquoi ».
 *
 * Il porte deux situations que l'application distingue soigneusement depuis la Phase 6 — une liste
 * legitimement vide, et une source en panne — et c'est **volontairement le meme bloc** : ce qui les
 * separe est l'icone, le titre, le message et l'action, pas la mise en page.
 *
 * Deux dispositions, et une seule raison de choisir :
 *
 * - `plain` — le bloc **est** l'ecran. Il se pose alors dans un [`ScreenState`](ScreenState.tsx), qui
 *   l'ancre sous l'en-tete ; une carte posee au milieu d'un ecran vide flotterait sans rien pour
 *   l'ancrer ;
 * - `card` — le bloc s'inscrit **dans une liste** qui defile, entoure d'une surface et d'un filet.
 *
 * ## Ce qui a change apres mesure, et pourquoi
 *
 * Le bloc etait un glyphe gris de 48 et **une seule ligne** de texte secondaire, sur toute la largeur
 * et sans titre. C'est ce qui donnait a ces ecrans leur air de vide bizarre : ce n'est pas l'espace
 * qui etait en trop, c'est la **masse** et la **hierarchie** qui manquaient. Trois corrections, toutes
 * reprises de ce que font les applications qui servent de reference :
 *
 *   - la surface **porte le ton de l'etat** : gris pour une absence, teinte pour un echec. Un
 *     etablissement qui ne publie pas d'emploi du temps et une source en panne portaient le meme
 *     carre gris, et la severite ne se lisait qu'apres avoir lu les mots — alors que c'est
 *     exactement la distinction que la Phase 6 existe pour rendre visible ;
 *   - le glyphe descend a 32 mais vit dans une **surface** de 72 : il devient un objet, pas un
 *     residu. Un **carre arrondi** (`radius.lg`), et non un disque : c'est la forme de toutes les
 *     surfaces de l'application — bouton de retour, bouton favori, pastille du tiroir, encart du
 *     formulaire de lien — et c'est exactement le gabarit de `LienEdtForm.iconWrap`, 72 en
 *     `radius.lg`. Voir docs/theme.md, « les surfaces sont des carres arrondis » ;
 *   - le **titre est obligatoire**. Il est en `theme.font`, le message en `fontSecondary` : deux
 *     niveaux de lecture au lieu d'un seul aplat gris. Le rendre obligatoire est deliberé — c'est le
 *     compilateur qui garantit qu'aucun ecran n'en oublie un, pas une ligne de liste a cocher ;
 *   - le message prend une **mesure courte** (`MESURE`), parce qu'une ligne unique etiree sur la
 *     largeur d'un telephone se lit mal et souligne le vide autour d'elle.
 *
 * Les dimensions (72, 32, 300) n'ont pas de token : le depot n'a aucune echelle pour elles, et en
 * inventer une depasserait ce lot (docs/theme.md).
 */

import React from 'react';
import { Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, toneColor, toneSoftColor, type AppThemeType, type SemanticTone } from '../theme/Theme';
import { ActionButton } from './ActionButton';

/** La largeur de lecture du message. Au-dela, une seule ligne s'etire et le bloc se dilue. */
const MESURE = 300;

/** Le geste qui remplirait l'ecran, quand il en existe un. */
export interface EmptyStateAction {
    readonly label: string;
    readonly onPress: () => void;
    readonly icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

export interface EmptyStateProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    /** Ce qui se passe, en trois mots. Obligatoire : un etat sans titre est un aplat gris. */
    title: string;
    /** Pourquoi, et ce qu'on peut y faire. Une phrase. */
    message: string;
    theme: AppThemeType;
    action?: EmptyStateAction | null;
    /** `card` dans une liste, `plain` quand le bloc occupe l'ecran (dans un `ScreenState`). */
    variant?: 'card' | 'plain';
    /**
     * Ce que l'etat **est**, porte par la surface de l'icone. `neutral` par defaut : une liste vide
     * n'est pas une alerte.
     */
    tone?: SemanticTone;
}

/**
 * La surface de l'icone et son glyphe, selon le ton.
 *
 * `neutral` ne passe **pas** par `neutralSoft` : ce gris a 8 % se composite a un point du fond de
 * page et la surface disparaitrait. Il prend `greyBackground`, celui du bouton de retour et du bouton
 * de filtre en en-tete — la surface grise etablie de l'application, et donc la coherence recherchee.
 *
 * Il prend en revanche un filet : a 72 points, un aplat gris a quatre pour cent d'ecart du fond se
 * lit comme une tache plutot que comme un objet. Les tons semantiques n'en ont pas besoin, leur
 * teinte les detache deja.
 */
function surfaceDIcone(theme: AppThemeType, tone: SemanticTone): { fond: string; glyphe: string; filet: string | null } {
    if (tone === 'neutral') {
        return { fond: theme.greyBackground, glyphe: theme.fontSecondary, filet: theme.border };
    }
    return { fond: toneSoftColor(theme, tone), glyphe: toneColor(theme, tone), filet: null };
}

export function EmptyState({ icon, title, message, theme, action, variant = 'card', tone = 'neutral' }: EmptyStateProps) {
    const { fond, glyphe, filet } = surfaceDIcone(theme, tone);

    const conteneur: ViewStyle = variant === 'card'
        ? {
            alignItems: 'center',
            paddingVertical: tokens.space.xl,
            paddingHorizontal: tokens.space.lg,
            marginHorizontal: tokens.space.sm,
            backgroundColor: theme.cardBackground,
            borderRadius: tokens.radius.lg,
            borderWidth: 1,
            borderColor: theme.border,
        }
        : { alignItems: 'center' };

    return (
        <View style={conteneur}>
            <View style={{
                width: 72,
                height: 72,
                borderRadius: tokens.radius.lg,
                backgroundColor: fond,
                ...(filet !== null ? { borderWidth: 1, borderColor: filet } : {}),
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: tokens.space.md,
            }}>
                <MaterialCommunityIcons name={icon} size={32} color={glyphe} />
            </View>

            <Text style={{
                color: theme.font,
                fontSize: tokens.fontSize.lg,
                fontWeight: tokens.fontWeight.bold,
                textAlign: 'center',
                marginBottom: tokens.space.xs,
            }}>
                {title}
            </Text>

            <Text style={{
                color: theme.fontSecondary,
                fontSize: tokens.fontSize.md,
                lineHeight: 22,
                textAlign: 'center',
                maxWidth: MESURE,
            }}>
                {message}
            </Text>

            {action ? (
                <ActionButton
                    theme={theme}
                    label={action.label}
                    onPress={action.onPress}
                    {...(action.icon !== undefined ? { icon: { name: action.icon } as const } : {})}
                    style={{ marginTop: tokens.space.lg }}
                />
            ) : null}
        </View>
    );
}
