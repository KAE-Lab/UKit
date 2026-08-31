/**
 * La teinte d'identite d'une annonce (`couleur` en base) : sa couleur de palette, l'accent en repli.
 *
 * Le fichier a porte une **pastille d'emetteur**, essayee sur les trois surfaces et defaite partout
 * (2026-08-31) : sur les cartes, une capsule coloree par element etait du bruit repete — la regle
 * qui interdit le filigrane dans les listes — et sur la fiche elle s'empilait avec l'accroche en
 * deux capsules jumelles. L'emetteur se dit desormais en **kicker** — petites capitales grises
 * au-dessus du titre, la grammaire des cartes d'article — et seule la teinte a survecu : c'est elle
 * qui colore l'accroche, les tetes de section et l'affiche typographique d'une carte sans visuel.
 */

import { type AppThemeType } from '../../../shared/theme/Theme';

export function teinteDAnnonce(couleur: number | undefined, theme: AppThemeType): string {
    return theme.sectionsHeaders[couleur ?? -1] ?? theme.accent ?? theme.primary;
}
