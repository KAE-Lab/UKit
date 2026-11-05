/**
 * Les primitives de design : espacements, rayons, tailles, graisses, ombres.
 *
 * **Un fichier a part, et ce n'est pas du rangement.** [`Theme.ts`](Theme.ts) importe `react-native`
 * pour la branche `Platform.OS`, ce qui le rend injouable sous Node — donc invérifiable. Les tokens,
 * eux, sont de la donnee pure : les isoler les rend testables, et c'est ce qui permet a
 * [`tools/eslint/no-style-literals.mjs`](../../../tools/eslint/no-style-literals.mjs) de verifier que
 * sa table d'echelles n'a pas derive de celle-ci. C'est la regle du depot appliquee a la lettre : le
 * code testable est separe du code de plateforme (docs/qualite.md).
 *
 * Ils restent reexportes par `Theme.ts` — `import { tokens } from '../theme/Theme'` continue de
 * marcher partout, et rien n'a eu a changer.
 */

import type { SpecOmbre } from './ombres';

const fontSize = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    // `title` remplace un `hero: 36` qui n'etait reference nulle part : le grand titre de page
    // reellement utilise vaut 34, dans quatre ecrans dont Planning et le tableau de bord Campus.
    // Nommer la valeur qui est la plutot que garder celle que personne n'appelle (jalon 6-K).
    title: 34,
};

const fontWeight = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
};

export const tokens = {
    space: {
        // `xxs` nomme le pas que l'echelle n'avait pas : 26 espacements valaient 2 en dur, sous le
        // `xs` de 4 (inventaire visuel du 2026-08-16, jalon 6-K). Ajoute, pas invente.
        xxs: 2,
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
    fontSize,
    fontWeight,
    /**
     * Les styles de texte composes (7-J, 2026-11-05) : la taille, la graisse et l'approche d'un role,
     * ecrites une fois. La police reste celle du systeme ; ce qui la rend precise, c'est une approche
     * resserree sur les grands corps — Roboto et San Francisco s'y relachent — et des chiffres
     * tabulaires partout ou un nombre se compare a son voisin : une heure, une duree, une distance.
     */
    texte: {
        /** Le grand titre d'un onglet. */
        grandTitre: { fontSize: fontSize.title, fontWeight: fontWeight.bold, letterSpacing: -0.6 },
        /** Le titre d'une section de tableau de bord, d'une fiche. */
        titreDeSection: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, letterSpacing: -0.35 },
        /** Le titre d'une carte ou d'une rangee importante. */
        titreDeCarte: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, letterSpacing: -0.2 },
        /** Le titre de la barre compacte d'un onglet defile. */
        titreDeBarre: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, letterSpacing: -0.2 },
        /** Une heure affichee en grand : le debut d'un cours, un compte a rebours. */
        heure: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, letterSpacing: -0.3, fontVariant: ['tabular-nums' as const] },
        /** Des chiffres qui ne dansent pas d'une ligne a l'autre. */
        chiffres: { fontVariant: ['tabular-nums' as const] },
    },
    /**
     * Les ombres, en **specifications** : decalage, flou, opacite, au sens d'iOS. `Theme.ts` les
     * resout en `tokens.shadow.{sm,md,lg}`, prets a etaler : un `boxShadow` sur les deux plateformes
     * depuis 7-J (ombres.ts). Elles portaient une `elevation` jusqu'en 6.2.x : ombre dure, et ordre
     * de dessin change sur les vieux Android.
     */
    ombres: {
        // Deux couches par ombre (7-J, 2026-11-05) : un contact net, au ras de la surface, et une
        // portee douce. Une seule couche floue se lisait comme une tache grise sous la carte ; le
        // contact pose l'objet, la portee l'eleve. Plus marquees que celles de 6-K : le « cran
        // au-dessus » du labo les voulait, et l'iPhone n'en avait aucune sous les cartes.
        sm: [{ y: 1, flou: 1, opacite: 0.04 }, { y: 2, flou: 6, opacite: 0.05 }] as readonly SpecOmbre[],
        md: [{ y: 1, flou: 2, opacite: 0.05 }, { y: 8, flou: 12, opacite: 0.08 }] as readonly SpecOmbre[],
        lg: [{ y: 2, flou: 3, opacite: 0.06 }, { y: 16, flou: 20, opacite: 0.12 }] as readonly SpecOmbre[],
    },
    /**
     * Le mouvement (jalon 7-I) : les durees et le ressort que les animations se partagent.
     *
     * Releves avant d'etre nommes (docs/inventaire-mouvement.md) : huit durees vivaient chacune dans
     * son fichier, et deux fondus de la meme couture n'avaient pas la meme. Ce ne sont pas des
     * proprietes de style, `ukit/no-style-literals` ne les voit donc pas : la regle est une
     * convention, et une duree nouvelle se prend ici plutot que de s'ecrire dans son composant.
     */
    mouvement: {
        /** La couture chargement → contenu, et l'arrivee d'une image : se percevoir sans se regarder. */
        couture: 200,
        /** Une bascule de structure, le commit entier fondu par `LayoutAnimation`. */
        structure: 220,
        /**
         * L'entree echelonnee des cartes d'une liste qui arrive d'un coup : l'ecart entre deux rangs,
         * et le nombre de rangs echelonnes — au-dela, les cartes entrent avec la derniere, sinon la
         * fin d'une longue liste se ferait attendre.
         */
        cascade: { pas: 40, rangs: 4 },
        /**
         * Le reflet qui balaie un squelette : la duree d'un passage, et la largeur de la bande, en
         * fraction de la surface balayee. Celui de la planche C du labo, choisi le 2026-09-27.
         */
        balayage: { duree: 1600, bande: 0.6 },
        /** L'echelle d'une carte sous le doigt : assez pour se sentir, pas assez pour se voir de loin. */
        pression: 0.97,
        /**
         * Le ressort unique de l'application : reflux d'une liste, retour d'une carte pressee. Un
         * rapport d'amortissement d'environ 0,83 — un soupcon de rebond, la ou le defaut de
         * Reanimated 4 (`GentleSpringConfig`, 120) n'en a aucun et se lit comme une glissiere.
         */
        ressort: { damping: 100, mass: 4, stiffness: 900 },
        /**
         * Le glissement du fond d'un onglet : une periode du motif par cycle. Assez lent pour se
         * remarquer au bout d'un moment plutot qu'au premier regard (labo, tours 5 et 6).
         */
        fond: { cycle: 60000 },
    },
};

export default tokens;
