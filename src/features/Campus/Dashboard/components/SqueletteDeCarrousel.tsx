/**
 * Ce qu'une section du tableau de bord montre avant ses cartes : un carrousel de squelettes.
 *
 * Il reprend **le gabarit exact du carrousel** — le rembourrage de `CarrouselDeSection`, la largeur
 * et la gouttiere des cartes — et une carte de squelette **construite avec les briques de la vraie
 * carte** (`Card`, le titre, `MetaRow`, la pastille de distance), en mode masque. La hauteur de la
 * section est donc celle qu'elle aura, et le contenu la remplace sans rien pousser dessous
 * (docs/theme.md, « un chargement annonce sa forme »).
 *
 * Deux cartes : la premiere entiere, l'amorce de la seconde au bord de l'ecran, comme un carrousel
 * rempli. Une seule dirait « une carte arrive », trois ne se verraient pas. Deux carrousels : celui
 * des lieux, et celui des annonces, au cadre 4:5 de leurs affiches.
 */

import React from 'react';
import { View } from 'react-native';

import { tokens, type AppThemeType } from '../../../../shared/theme/Theme';
import { Card } from '../../../../shared/ui/Card';
import { MetaRow } from '../../../../shared/ui/MetaRow';
import { Balayage, Squelette } from '../../../../shared/ui/Squelette';
import { CardTitleRow, DistanceBadge } from '../../components/CampusCardParts';
import { dimensionsDuVisuel, PiedDAnnonce } from '../../Bde/BdeAnnonceCard';
import { HAUTEUR_VISUEL_CARTE, LARGEUR_CARTE_ANNONCE, LARGEUR_CARTE_LIEU } from './gabarits';

/**
 * Le corps d'une carte de lieu en masque — restaurant, bibliotheque, batiment : les trois ont la meme
 * charpente, un titre et son etoile, une ligne avec la distance, une ligne d'etat.
 *
 * Exporte parce qu'il sert deux fois : visible, c'est le corps du squelette ; invisible, c'est le
 * **gabarit** sur lequel la carte en panne se pose (CarteEnPanne). Les deux ont ainsi la hauteur de
 * la vraie carte par construction, et une ligne ajoutee a la carte les suit sans qu'on y pense.
 */
export function CorpsMasqueDeCarteLieu({ theme }: { theme: AppThemeType }) {
    return (
        <View style={{ padding: tokens.space.md }}>
            <CardTitleRow title="" theme={theme} masque />
            <MetaRow
                label=""
                theme={theme}
                icon={{ family: 'material', name: 'location-on' }}
                marginBottom={tokens.space.xs}
                trailing={<DistanceBadge distance={0} theme={theme} icon={{ name: 'walk' }} masque />}
                masque
            />
            <MetaRow label="" theme={theme} icon={{ name: 'clock-outline' }} masque />
        </View>
    );
}

function SqueletteDeCarteLieu({ theme }: { theme: AppThemeType }) {
    return (
        <Card theme={theme} animated={false} style={{ width: LARGEUR_CARTE_LIEU, marginRight: tokens.space.md }}>
            <View style={{ width: '100%', height: HAUTEUR_VISUEL_CARTE, backgroundColor: theme.border }} />
            <CorpsMasqueDeCarteLieu theme={theme} />
            {/* Le dernier enfant : il passe au-dessus du visuel et des barres, rogne par la carte. */}
            <Balayage theme={theme} largeur={LARGEUR_CARTE_LIEU} />
        </Card>
    );
}

export function SqueletteDeCarrouselDeLieux({ theme, libelle }: { theme: AppThemeType; libelle: string }) {
    return (
        <Squelette
            libelle={libelle}
            style={{ flexDirection: 'row', paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.lg }}
        >
            <SqueletteDeCarteLieu theme={theme} />
            <SqueletteDeCarteLieu theme={theme} />
        </Squelette>
    );
}

/** Le squelette d'une carte d'annonce : l'affiche 4:5 et son pied, le vrai pied en masque. */
function SqueletteDeCarteDAnnonce({ theme }: { theme: AppThemeType }) {
    return (
        <Card theme={theme} animated={false} style={{ width: LARGEUR_CARTE_ANNONCE, marginRight: tokens.space.md }}>
            <View style={[dimensionsDuVisuel('affiche'), { backgroundColor: theme.border }]} />
            <PiedDAnnonce theme={theme} kicker="" titre="" masque />
            <Balayage theme={theme} largeur={LARGEUR_CARTE_ANNONCE} />
        </Card>
    );
}

export function SqueletteDeCarrouselDAnnonces({ theme, libelle }: { theme: AppThemeType; libelle: string }) {
    return (
        <Squelette
            libelle={libelle}
            style={{ flexDirection: 'row', paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.lg }}
        >
            <SqueletteDeCarteDAnnonce theme={theme} />
            <SqueletteDeCarteDAnnonce theme={theme} />
        </Squelette>
    );
}
