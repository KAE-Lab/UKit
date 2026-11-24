/* eslint-disable ukit/no-style-literals -- ce module est l'unique endroit de la console ou une couleur s'ecrit : celles qui n'existent pas dans les palettes de l'application (voile, texte sur accent) y vivent. */
/**
 * Le theme de la console : les couleurs et les echelles de l'application, posees en variables CSS sur
 * la racine du document. Elles viennent des modules purs de `src/shared/theme`, jamais d'une copie :
 * une couleur changee dans `palettes.ts` change la console sans toucher `console/` (lot 0 de la
 * phase 8). `styles/tokens.css` ne garde que ce qui n'existe pas dans l'application.
 */

import { PALETTES, type PaletteDeBase } from '../../../src/shared/theme/palettes';
import { resoudreOmbre, type SpecOmbre } from '../../../src/shared/theme/ombres';
import { tokens } from '../../../src/shared/theme/tokens';
import { retenirTheme, themeRetenu, type ChoixDeTheme } from './preferences';

export type { ChoixDeTheme };
export type ThemeResolu = 'light' | 'dark';

/**
 * Les domaines de la navigation et l'onglet de l'application dont chacun prend la teinte d'en-tete
 * (`fondDOnglet`) : suivre lit comme le Planning, publier comme Campus, le compte comme les Reglages.
 */
export const TEINTE_DES_DOMAINES = { suivre: 'planning', publier: 'campus', compte: 'reglages' } as const;
export type Domaine = keyof typeof TEINTE_DES_DOMAINES;

const REQUETE_SOMBRE = '(prefers-color-scheme: dark)';

/** Une couleur `#RRGGBB` avec une opacite, en `#RRGGBBAA` ; une couleur qui en porte deja une reste telle quelle. */
export function avecOpacite(couleur: string, opacite: number): string {
    if (!/^#[0-9a-f]{6}$/i.test(couleur)) return couleur;
    const alpha = Math.round(Math.min(1, Math.max(0, opacite)) * 255).toString(16).padStart(2, '0');
    return `${couleur}${alpha.toUpperCase()}`;
}

function ombre(spec: readonly SpecOmbre[]): string {
    return resoudreOmbre(spec).boxShadow
        .map((couche) => `${couche.offsetX}px ${couche.offsetY}px ${couche.blurRadius}px ${couche.color}`)
        .join(', ');
}

/** Les couleurs d'un theme, sous les noms que la console emploie. */
export function couleursDe(theme: ThemeResolu): Readonly<Record<string, string>> {
    const p: PaletteDeBase = PALETTES[theme];
    const sombre = theme === 'dark';
    // Les couleurs d'etat sont celles des sections de l'application : vert, orange, rouge (6.1-C).
    const [, succes = p.accent, avert = p.accent, danger = p.accent] = p.sectionsHeaders;
    const doux = sombre ? 0.18 : 0.12;
    const couleurs: Record<string, string> = {
        '--fond': p.background,
        '--surface': p.cardBackground,
        '--surface-2': p.greyBackground,
        '--bordure': p.border,
        '--contour': p.contourDeCarte,
        '--reflet': p.reflet,
        '--texte': p.font,
        '--texte-2': p.fontSecondary,
        '--texte-3': p.fontTertiary,
        '--texte-sur-accent': '#FFFFFF',
        '--accent': p.accent,
        '--accent-profond': p.accentProfond,
        '--accent-doux': avecOpacite(p.accent, sombre ? 0.2 : 0.12),
        '--succes': succes,
        '--succes-doux': avecOpacite(succes, doux),
        '--avert': avert,
        '--avert-doux': avecOpacite(avert, doux),
        '--danger': danger,
        '--danger-doux': avecOpacite(danger, doux),
        '--voile': sombre ? '#00000099' : '#00000059',
        // Ce qui se pose sur une image ou sous une barre collee : des valeurs fixes, vraies dans les deux themes.
        '--sur-image': '#FFFFFF',
        '--voile-image': '#0000008C',
        '--voile-focale': '#00000080',
        '--ombre-barre': sombre ? '#00000066' : '#00000026',
        '--logo-bleu': p.logo.bleu,
        '--logo-indigo': p.logo.indigo,
    };
    for (const [domaine, onglet] of Object.entries(TEINTE_DES_DOMAINES)) {
        const [a, b] = p.fondDOnglet[onglet];
        couleurs[`--teinte-${domaine}-a`] = a;
        couleurs[`--teinte-${domaine}-b`] = b;
    }
    return couleurs;
}

/** Les echelles, identiques dans les deux themes. */
export function echelles(): Readonly<Record<string, string>> {
    const valeurs: Record<string, string> = {
        '--ombre': ombre(tokens.ombres.md),
        '--ombre-flottante': ombre(tokens.ombres.lg),
    };
    for (const [nom, v] of Object.entries(tokens.space)) valeurs[`--espace-${nom}`] = `${v}px`;
    for (const [nom, v] of Object.entries(tokens.radius)) valeurs[`--rayon-${nom === 'pill' ? 'pilule' : nom}`] = `${v}px`;
    for (const [nom, v] of Object.entries(tokens.fontSize)) valeurs[`--taille-${nom === 'title' ? 'titre' : nom}`] = `${v}px`;
    const { grandTitre, titreDeSection, titreDeCarte } = tokens.texte;
    valeurs['--approche-grand-titre'] = `${grandTitre.letterSpacing}px`;
    valeurs['--approche-titre-de-section'] = `${titreDeSection.letterSpacing}px`;
    valeurs['--approche-titre-de-carte'] = `${titreDeCarte.letterSpacing}px`;
    return valeurs;
}

export function themeResolu(choix: ChoixDeTheme): ThemeResolu {
    if (choix === 'clair') return 'light';
    if (choix === 'sombre') return 'dark';
    return typeof window !== 'undefined' && window.matchMedia(REQUETE_SOMBRE).matches ? 'dark' : 'light';
}

function poser(theme: ThemeResolu): void {
    const racine = document.documentElement;
    for (const [nom, valeur] of Object.entries({ ...echelles(), ...couleursDe(theme) })) racine.style.setProperty(nom, valeur);
    racine.dataset.theme = theme;
    racine.style.colorScheme = theme;
}

let choixCourant: ChoixDeTheme = 'systeme';
const abonnes = new Set<() => void>();

function prevenir(): void {
    for (const abonne of abonnes) abonne();
}

/** Pose le theme retenu, et suit le systeme tant que le choix est « systeme ». A appeler avant le premier rendu. */
export function installerTheme(): void {
    choixCourant = themeRetenu();
    poser(themeResolu(choixCourant));
    window.matchMedia(REQUETE_SOMBRE).addEventListener('change', () => {
        if (choixCourant !== 'systeme') return;
        poser(themeResolu('systeme'));
        prevenir();
    });
}

export function choixDeTheme(): ChoixDeTheme {
    return choixCourant;
}

export function choisirTheme(choix: ChoixDeTheme): void {
    choixCourant = choix;
    retenirTheme(choix);
    poser(themeResolu(choix));
    prevenir();
}

/** Pour `useSyncExternalStore` : le choix change par la bascule, le theme resolu aussi par le systeme. */
export function abonnerAuTheme(abonne: () => void): () => void {
    abonnes.add(abonne);
    return () => { abonnes.delete(abonne); };
}

export function themeCourant(): ThemeResolu {
    return themeResolu(choixCourant);
}
