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
    readonly font: string;
    readonly fontSecondary: string;
    readonly border: string;
    readonly background: string;
    readonly cardBackground: string;
    readonly greyBackground: string;
    /**
     * Les six teintes pleines des sections, indexees cycliquement ; l'index 4 est interdit aux
     * annonces (il a double le 0 en sombre jusqu'en 6.1-C). `sections` en est la version a 6 %.
     */
    readonly sectionsHeaders: string[];
    readonly sections: string[];
}

export const PALETTES: { readonly light: PaletteDeBase; readonly dark: PaletteDeBase } = {
    light: {
        primary:        '#007AFF',
        accent:         '#007AFF',
        font:           '#1C1C1E',
        fontSecondary:  '#8E8E93',
        border:         '#E5E5EA',
        background:     '#F2F2F7',
        cardBackground: '#FFFFFF',
        greyBackground: '#E5E5EA',
        sections:        ['#007AFF10', '#34C75910', '#FF950010', '#FF3B3010', '#5856D610', '#5AC8FA10'],
        sectionsHeaders: ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#5AC8FA'],
    },
    dark: {
        primary:        '#5E5CE6',
        accent:         '#5E5CE6',
        font:           '#FFFFFF',
        fontSecondary:  '#8E8E93',
        border:         '#38383A',
        background:     '#000000',
        cardBackground: '#1C1C1E',
        greyBackground: '#121212',
        sections:        ['#0A84FF15', '#30D15815', '#FF9F0A15', '#FF453A15', '#5E5CE615', '#64D2FF15'],
        // L'index 0 portait `#5E5CE6`, la valeur du 4 : cinq teintes au lieu de six en sombre, corrige en 6.1-C.
        sectionsHeaders: ['#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#5E5CE6', '#64D2FF'],
    },
};
