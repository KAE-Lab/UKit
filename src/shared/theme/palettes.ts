/**
 * Les palettes de base des deux themes : les couleurs qu'une surface de contenu emploie.
 *
 * **Un fichier a part, pour la meme raison que `tokens.ts`.** `Theme.ts` importe `react-native`
 * pour la branche `Platform.OS`, ce qui le rend injouable hors appareil. La console de pilotage
 * dessine pourtant, depuis le jalon 7-F, un apercu de la carte et de la fiche d'une annonce dans les
 * couleurs de l'application : elle lit ces palettes par un chemin relatif, et l'apercu ne peut pas
 * deriver du theme — une seule source. `Theme.ts` les etale dans `Theme.light` et `Theme.dark`,
 * rien ne change pour les composants.
 *
 * Ce qui reste dans `Theme.ts` : l'echelle semantique, les champs, le calendrier, le sous-arbre
 * `settings` — ce qu'aucun apercu n'a a connaitre. Une cle ajoutee ici doit l'etre dans les deux
 * themes : c'est ce qui rend `AppThemeType` fiable.
 *
 * Voir docs/theme.md.
 */

export interface PaletteDeBase {
    /** La couleur d'action principale, et l'accent qui lui est souvent egal. */
    readonly primary: string;
    readonly accent: string;
    /**
     * L'accent un cran plus profond : le bas du bouton plein, qui prend ainsi une matiere au lieu d'un
     * aplat (7-J, troisieme passe). La meme teinte, jamais une seconde couleur.
     */
    readonly accentProfond: string;
    readonly font: string;
    readonly fontSecondary: string;
    /**
     * Le troisieme niveau (7-J) : ce qui se lit en retrait sans porter d'information propre — un
     * onglet inactif, un chevron, une legende. Le texte secondaire est monte d'un cran le 2026-11-04 ;
     * sans ce niveau, un onglet inactif pesait presque autant que l'actif.
     */
    readonly fontTertiary: string;
    readonly border: string;
    readonly background: string;
    readonly cardBackground: string;
    readonly greyBackground: string;
    /**
     * Le filet qui borde une carte (7-J) : en sombre, une ombre ne se voit pas sur le noir, et la
     * carte ne se detache que par sa teinte, a deux pas du fond ; un blanc a 7 % en dessine le bord.
     * En clair, un noir a 4 %, qui affermit le bord la ou l'ombre d'Android reste plus douce.
     */
    readonly contourDeCarte: string;
    /**
     * Le reflet qui balaie un squelette (7-I, `Balayage`). En clair, un blanc a 70 % : sur la carte
     * blanche il ne se voit pas, et il ne passe que sur les barres grises. En sombre, un voile de 8 %,
     * qui effleure aussi la carte : un reflet plus sombre que la carte se lirait comme une ombre.
     */
    readonly reflet: string;
    /**
     * Les six teintes pleines des sections, indexees cycliquement ; l'index 4 est interdit aux
     * annonces (il a double le 0 en sombre jusqu'en 6.1-C). `sections` en est la version a 6 %.
     */
    readonly sectionsHeaders: string[];
    readonly sections: string[];
    /**
     * Les deux teintes du fond de chaque onglet (`FondDOnglet`), **le long du degrade du logo**
     * (7-J, deuxieme passe) : le Planning au bout bleu (257 degres en OKLCH), Campus au milieu (268),
     * la Scolarite au bout indigo (278), chacune avec sa voisine a dix degres ; les Reglages presque
     * neutres. Meme clarte et meme saturation pour les trois, par theme (L 0,905 et C 0,06 en clair,
     * L 0,235 et C 0,105 en sombre). C'etaient le bleu ciel, le turquoise et le violet rose du labo
     * (7-I) : trois familles hors de l'identite, que la review du 2026-11-05 a jugees « prototype ».
     */
    readonly fondDOnglet: Readonly<Record<'planning' | 'campus' | 'scolarite' | 'reglages', readonly [string, string]>>;
    /**
     * Les deux couleurs du logo, les memes dans les deux themes : le bleu et l'indigo de son degrade
     * (docs/identite.md). Le logo vectoriel et la figure en echo de l'accueil les lisent ici (7-J).
     */
    readonly logo: { readonly bleu: string; readonly indigo: string };
}

export const PALETTES: { readonly light: PaletteDeBase; readonly dark: PaletteDeBase } = {
    light: {
        primary:        '#3B5FE5',
        accent:         '#3B5FE5',
        accentProfond:  '#3454CA',
        font:           '#1C1C1E',
        fontSecondary:  '#6C6C70',
        fontTertiary:   '#8E8E93',
        border:         '#E5E5EA',
        background:     '#F2F2F7',
        cardBackground: '#FFFFFF',
        greyBackground: '#E5E5EA',
        contourDeCarte: '#0000000A',
        reflet:         '#FFFFFFB3',
        sections:        ['#007AFF10', '#34C75910', '#FF950010', '#FF3B3010', '#5856D610', '#5AC8FA10'],
        sectionsHeaders: ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#5AC8FA'],
        fondDOnglet: {
            planning:  ['#C4E3FF', '#CADFFF'],
            campus:    ['#CBE0FF', '#D1DCFF'],
            scolarite: ['#D3DEFF', '#D8D9FF'],
            reglages:  ['#E0E0EE', '#E0E0EE'],
        },
        logo: { bleu: '#007AFF', indigo: '#5E5CE6' },
    },
    dark: {
        primary:        '#6381F8',
        accent:         '#6381F8',
        accentProfond:  '#5974DF',
        font:           '#FFFFFF',
        fontSecondary:  '#BCBCCB',
        fontTertiary:   '#8A8A98',
        border:         '#2A2A37',
        background:     '#0B0B12',
        cardBackground: '#15151E',
        greyBackground: '#22222E',
        contourDeCarte: '#FFFFFF12',
        reflet:         '#FFFFFF14',
        sections:        ['#0A84FF15', '#30D15815', '#FF9F0A15', '#FF453A15', '#5E5CE615', '#64D2FF15'],
        // L'index 0 portait `#5E5CE6`, la valeur du 4 : cinq teintes au lieu de six en sombre, corrige en 6.1-C.
        sectionsHeaders: ['#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#5E5CE6', '#64D2FF'],
        fondDOnglet: {
            planning:  ['#001B4D', '#02164D'],
            campus:    ['#03174E', '#11124D'],
            scolarite: ['#12134E', '#1B0E4B'],
            reglages:  ['#1C1B29', '#1C1B29'],
        },
        logo: { bleu: '#007AFF', indigo: '#5E5CE6' },
    },
};
