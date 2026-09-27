/**
 * Le conteneur d'une section du tableau de bord : sa marge, et sa facon de bouger.
 *
 * Quatre sections empilees, chargees chacune de son cote : quand l'une change de hauteur — la section
 * Annonces qui se replie faute d'annonce, une panne, le bandeau de couverture partielle —, celles du
 * dessous glissaient d'un coup (docs/inventaire-mouvement.md, section 5). Elles suivent desormais le
 * ressort de l'application (`REFLUX`), et une section qui disparait sort en fondu au lieu de laisser
 * un trou d'une image. Le squelette tient la hauteur pendant le chargement : ce mouvement ne joue que
 * sur ce qui change vraiment.
 */

import React from 'react';
import Reanimated from 'react-native-reanimated';

import { tokens } from '../../../../shared/theme/Theme';
import { REFLUX, SORTIE } from '../../../../shared/ui/mouvement';

export function SectionDuTableau({ children }: { children: React.ReactNode }) {
    return (
        <Reanimated.View layout={REFLUX} exiting={SORTIE} style={{ marginTop: tokens.space.md }}>
            {children}
        </Reanimated.View>
    );
}
