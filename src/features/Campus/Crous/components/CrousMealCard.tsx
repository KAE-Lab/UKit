import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import style, { tokens } from '../../../../shared/theme/Theme';
import Translator from '../../../../shared/i18n/Translator';
import { CampusSectionHeader } from '../../components/CampusSectionHeader';

export const getDishIcon = (dishName: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] => {
    const str = dishName.toLowerCase();

    const iconMap = [
        { regex: 'fermé|ferme|fermée|non communiqué|modification|ou|structure|réserve|exceptionnel|formule|le menu', icon: 'information-outline' },
        { regex: 'bretonne|sans viande|sans porc|végé|veggie|vegan|steak végétal|tofu|soja|falafel', icon: 'leaf' },
        { regex: 'boisson|soda|coca|fanta|sprite|eau|jus|thé|the|café|cafe', icon: 'bottle-soda' },
        { regex: 'pizza|pasta box', icon: 'pizza' },
        { regex: 'frite|chips|snack', icon: 'french-fries' },
        { regex: 'burger|hamburger', icon: 'hamburger' },
        { regex: 'tacos|fajita', icon: 'taco' },
        { regex: 'sandwich|baguette|panini|wrap|croque|hot-dog', icon: 'baguette' },
        { regex: 'poulet|boeuf|bœuf|porc|veau|agneau|saucisse|viande|steak|lardon|chorizo|dinde|canard|merguez|filet|rôti|haché|kebab|jambon|bacon|cordon bleu|boulette|escalope|pâté|charcuterie', icon: 'food-drumstick' },
        { regex: 'poisson|saumon|cabillaud|colin|merlu|crevette|calamar|thon|truite|lieu|moule|fruit de mer|hoki|encornet|surimi', icon: 'fish' },
        { regex: 'oeuf|œuf|omelette', icon: 'egg' },
        { regex: 'entrée|soupe|potage|velouté|bouillon|gaspacho|crudité|hors d', icon: 'bowl-mix' },
        { regex: 'fromage|brie|camembert|chèvre|chevre|mozza|emmental|cantal|gruyère|parmesan|kiri|roquefort', icon: 'cheese' },
        { regex: 'viennoiserie|croissant|chocolatine|brioche', icon: 'food-croissant' },
        { regex: 'yaourt|lacté|petit suisse|fromage blanc|skyr|faisselle|glace|crème', icon: 'silverware-spoon' },
        { regex: 'dessert|tarte|pâtisserie|gâteau|cookie|muffin|brownie|entremet|flan|caramel|vanille|chocolat|bonbon|barre|confiserie|macaron|gaufre|crêpe', icon: 'cupcake' },
        { regex: 'salade|légume|haricot|lentille|pois|carotte|brocoli|chou|courgette|aubergine|épinard|poireau|champignon|céleri|ratatouille|tomate|concombre|maïs', icon: 'leaf' },
        { regex: 'coquillette|riz|pâte|spaghetti|macaroni|penne|ravioli|semoule|boulgour|blé|quinoa|pomme de terre|purée|gnocchi|nouille', icon: 'pasta' }
    ];

    const hasPomme = new RegExp(`(^|[\\s'’\\-])(fruit|pomme|banane|orange|kiwi|ananas|poire|fraise|framboise|pêche|abricot|raisin|mangue|melon|pastèque|citron|clémentine|compote)(s|x)?([\\s'’.,;!?:\\-]|$)`, 'i').test(str);
    const hasPommeDeTerre = new RegExp(`(^|[\\s'’\\-])(pomme de terre)(s|x)?([\\s'’.,;!?:\\-]|$)`, 'i').test(str);
    if (hasPomme && !hasPommeDeTerre) return 'food-apple';

    for (const item of iconMap) {
        const regex = new RegExp(`(^|[\\s'’\\-])(${item.regex})(s|x)?([\\s'’.,;!?:\\-]|$)`, 'i');
        if (regex.test(str)) {
            return item.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name'];
        }
    }

    return 'circle-medium';
};

interface CrousMealCardProps {
    mealTitle: string;
    categories: { name: string, dishes: string[] }[];
    mealType: 'midi' | 'soir';
    theme: typeof style.Theme['light'];
}

export function CrousMealCard({ mealTitle, categories, mealType, theme }: CrousMealCardProps) {
    if (!categories || categories.length === 0) return null;

    // Le soleil pour le midi, la lune pour le soir — et leur couleur suit : orange solaire, bleu
    // clair nocturne. Les index de `sectionsHeaders`, comme la grille Scolarite (le 4 reste inemploye :
    // il doublait le 0 en sombre jusqu'en 6.1-C, et les teintes n'ont pas bouge apres le correctif).
    const iconHeader = mealType === 'midi' ? 'white-balance-sunny' : 'moon-waning-crescent';
    const couleur = mealType === 'midi' ? 2 : 5;

    return (
        // `md` et non `lg` : les cartes de categories portent deja 8 points de marge basse
        // (`course.card`), et l'ecart commun des fiches vaut 32 — 8 + 16 + la marge haute de la
        // tete suivante. A `lg`, ce repas etait la seule section a 40.
        <View style={{ marginBottom: tokens.space.md }}>
            <CampusSectionHeader
                icone={iconHeader}
                titre={mealTitle}
                couleur={couleur}
                theme={theme}
                style={{ marginTop: tokens.space.sm, marginBottom: tokens.space.md, paddingHorizontal: tokens.space.md }}
            />

            {/* Liste des catégories */}
            {categories.map((cat, index) => (
                <View key={index} style={[style.course.card, {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.border,
                    borderWidth: 1
                }]}>
                    {/* L'intertitre des Reglages et des horaires : une categorie nomme, elle n'agit
                        pas — l'accent la faisait passer pour un lien. */}
                    <Text style={{
                        fontSize: tokens.fontSize.xs,
                        fontWeight: tokens.fontWeight.semibold,
                        color: theme.fontSecondary,
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                        marginBottom: tokens.space.sm,
                    }}>
                        {cat.name}
                    </Text>
                    
                    {cat.dishes.length > 0 ? cat.dishes.map((dish: string, dIdx: number) => {
                        const icon = getDishIcon(dish);
                        return (
                            // 6 en dur jusqu'a 6.1-E, deux fois dans cette carte : `space.xs` (4)
                            // pour l'interligne des plats et pour l'ecart icone -> texte (inventaire
                            // visuel 3.5, ou les deux valeurs 4 et 6 coexistaient sans raison).
                            <View key={dIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: tokens.space.xs }}>
                                {/* Le vegetarien est le seul plat qui porte une couleur : c'est un etat, donc
                                    un ton du theme et non un vert Material en dur (jalon 6-K). */}
                                <MaterialCommunityIcons
                                    name={icon}
                                    size={16}
                                    color={icon === 'leaf' ? theme.success : theme.fontSecondary}
                                    style={{ marginRight: tokens.space.xs, marginTop: tokens.space.xxs }}
                                />
                                <Text style={{ fontSize: tokens.fontSize.sm, color: theme.font, flex: 1, lineHeight: 20 }}>{dish}</Text>
                            </View>
                        );
                    }) : (
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, fontStyle: 'italic' }}>{Translator.get('NOT_SPECIFIED')}</Text>
                    )}
                </View>
            ))}
        </View>
    );
}
