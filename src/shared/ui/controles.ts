/**
 * Ce que les **controles dessines** du depot partagent — [`Interrupteur`](Interrupteur.tsx) et
 * [`Curseur`](Curseur.tsx).
 *
 * Un seul motif y vit pour l'instant, et il y vit parce qu'il est apparu deux fois : la regle du
 * depot est qu'un motif releve une deuxieme fois remonte, plutot que d'etre recopie et de diverger a
 * la premiere retouche (docs/theme.md).
 */

import { tokens } from '../theme/Theme';

/**
 * L'ombre d'une poignee de controle : **plus marquee que les tokens**, et c'est mesure a l'usage
 * (retour d'appareil du 2026-09-04).
 *
 * `tokens.shadow.sm` est calibree pour une carte posee sur le fond de page, a quatre pour cent
 * d'opacite. Une poignee **blanche** sur une piste **gris clair** — l'interrupteur eteint, la part
 * non remplie d'un curseur, en theme clair — s'y fondait : le disque ne se detachait plus, et le
 * controle se lisait mal.
 *
 * Ce n'est pas un cas particulier de plus, c'est une **difference de situation** : une carte se
 * detache d'un fond neutre, une poignee doit se detacher d'une surface **coloree qui porte la
 * valeur**, et de la plus claire d'entre elles. Le depot admet deja des ombres ecrites a la main pour
 * cette raison — la barre d'onglets en porte deux (docs/theme.md, limites) — et la **couleur**, elle,
 * reste celle des tokens.
 */
export const OMBRE_DE_POIGNEE = {
    shadowColor: tokens.shadow.md.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
} as const;
