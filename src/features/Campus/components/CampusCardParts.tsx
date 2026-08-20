/**
 * Les deux morceaux que les cartes Campus se partagent, et qui ne remontent pas dans `shared/ui/`.
 *
 * La regle du depot est « deux usages au moins pour remonter » — mais aussi : on ne remonte que ce
 * qui n'appartient a personne. Une distance a pied et un etat d'affluence sont du **domaine Campus**,
 * pas du vocabulaire visuel : les mettre dans `shared/ui/` obligerait le socle a connaitre les
 * bibliotheques. Ils vivent donc ici, ou les deux ecrans concernes — la liste et le tableau de bord —
 * peuvent les prendre sans dependance croisee entre dossiers de `features/`.
 */

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { tokens, AppThemeType, toneColor, type SemanticTone } from '../../../shared/theme/Theme';
import { Badge } from '../../../shared/ui/Badge';
import { Icon, type IconSpec } from '../../../shared/ui/Icon';
import { ProgressBar } from '../../../shared/ui/ProgressBar';

interface CardTitleRowProps {
    title: string;
    theme: AppThemeType;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
    numberOfLines?: number;
    /** Le releve pose 4 px sous le titre des cartes de liste, et rien sous celui des cartes de carrousel. */
    titleMarginBottom?: number;
}

/**
 * Le titre d'une carte et son etoile de favori.
 *
 * Ecrit quatre fois a l'identique, `hitSlop` compris — et c'est le seul endroit du depot ou une cible
 * tactile de 22 px est correctement elargie. L'extraire evite que la cinquieme carte oublie de le
 * faire (inventaire visuel, 4.2).
 */
export function CardTitleRow({
    title,
    theme,
    isFavorite,
    onToggleFavorite,
    numberOfLines,
    titleMarginBottom = 0,
}: CardTitleRowProps) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
            <Text
                numberOfLines={numberOfLines}
                style={{
                    fontSize: tokens.fontSize.lg,
                    fontWeight: tokens.fontWeight.bold,
                    color: theme.font,
                    flexShrink: 1,
                    marginBottom: titleMarginBottom,
                }}
            >
                {title}
            </Text>

            {onToggleFavorite !== undefined ? (
                <TouchableOpacity
                    onPress={onToggleFavorite}
                    hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }}
                    style={{ marginLeft: 6 }}
                >
                    <Icon
                        icon={{ name: isFavorite ? 'star' : 'star-outline' }}
                        size={22}
                        color={isFavorite ? theme.primary : theme.fontSecondary}
                    />
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

/**
 * La distance a pied, formatee et mise en pastille.
 *
 * Le formatage etait recopie six fois a l'identique — sous le kilometre en metres arrondis, au-dela
 * en kilometres a une decimale. Le glyphe, lui, avait deja diverge entre deux copies (`walk` et
 * `directions-walk`, deux familles d'icones differentes) : il reste donc une prop, sans quoi remonter
 * le composant changerait le rendu d'un ecran de reference.
 */
export function DistanceBadge({ distance, theme, icon }: { distance: number; theme: AppThemeType; icon: IconSpec }) {
    const libelle = distance < 1
        ? `${Math.round(distance * 1000)} m`
        : `${distance.toFixed(1)} km`;

    return <Badge label={libelle} theme={theme} icon={icon} />;
}

interface LibraryStatusRowProps {
    isOpen: boolean;
    rate: number | null;
    tone: SemanticTone;
    label: string;
    /** La precision du fournisseur, dans sa langue a lui. Secondaire par construction. */
    note?: string | null;
    theme: AppThemeType;
}

/**
 * L'etat d'une bibliotheque : ouverte ou fermee, et si elle est ouverte, sa jauge d'occupation.
 *
 * Ecrit deux fois a l'identique — la liste et la carte du tableau de bord. La fiche, elle, a sa
 * propre disposition (jauge sur deux lignes, hauteur differente) et garde la sienne : ce n'est pas
 * le meme rendu, seulement le meme sujet.
 */
export function LibraryStatusRow({ isOpen, rate, tone, label, note, theme }: LibraryStatusRowProps) {
    const couleur = toneColor(theme, tone);

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon icon={{ name: isOpen ? 'door-open' : 'door-closed' }} size={16} color={couleur} />
            <Text
                numberOfLines={1}
                style={{
                    fontSize: tokens.fontSize.sm,
                    fontWeight: tokens.fontWeight.semibold,
                    color: couleur,
                    marginLeft: tokens.space.xs,
                    flexShrink: 1,
                }}
            >
                {label}
            </Text>

            {note ? (
                <Text
                    numberOfLines={1}
                    style={{
                        fontSize: tokens.fontSize.sm,
                        color: theme.fontSecondary,
                        marginLeft: tokens.space.xs,
                        flexShrink: 1,
                    }}
                >
                    {note}
                </Text>
            ) : null}

            {isOpen && rate !== null ? (
                <>
                    <ProgressBar
                        percent={rate}
                        color={couleur}
                        trackColor={theme.greyBackground}
                        height={6}
                        style={{ flex: 1, marginHorizontal: tokens.space.sm }}
                    />
                    <Text style={{
                        fontSize: tokens.fontSize.xs,
                        color: theme.fontSecondary,
                        fontWeight: tokens.fontWeight.bold,
                    }}>
                        {`${rate}%`}
                    </Text>
                </>
            ) : null}
        </View>
    );
}
