/**
 * Le filigrane d'identite : une grande silhouette posee en transparence sur une surface.
 *
 * C'est un geste de signature du depot — ne le sous-utiliser ni le galvauder :
 *
 *   - il porte **l'identite** d'une surface : le service d'une tuile (l'enveloppe de la messagerie,
 *     le dossier des documents), l'entite d'un en-tete (le logo d'etablissement, qui a pose le
 *     motif). Il ne decore pas : la silhouette est toujours la version pleine de ce que la surface
 *     represente ;
 *   - il se pose **sur des surfaces uniques**, jamais sur les elements repetes d'une liste — repete
 *     a chaque rangee, il cesse d'etre une signature et devient du bruit ;
 *   - il est **a moitie rogne par le bord** : entiere, la silhouette se lirait comme une icone de
 *     plus ; rognee, comme une texture ;
 *   - son opacite est **fixe** (`0F`, ~6 %) et ne se regle pas par appelant : deux filigranes
 *     d'intensites differentes se liraient comme une erreur.
 *
 * La regle est consignee dans docs/theme.md, « Les decisions durables ».
 *
 * Le calque est clippe a part, aux coins de la surface hote : poser `overflow: hidden` sur la
 * surface elle-meme mangerait son ombre sur iOS (`masksToBounds`).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { tokens } from '../theme/Theme';
import { Icon, type IconSpec } from './Icon';

export interface GlypheFiligraneProps {
    /** La version **pleine** de l'icone de la surface — une silhouette, pas un trait. */
    icone: IconSpec;
    /** La couleur de base — celle du texte de la surface. L'opacite est posee ici, pas chez l'appelant. */
    couleur: string;
    size?: number;
    /** Le rayon de la surface hote : le rognage doit suivre ses coins. */
    rayon?: number;
    /** Le bord droit qui rogne : `haut` (coin haut), `centre` (milieu), `bas` (coin bas). */
    position?: 'haut' | 'centre' | 'bas';
}

export function GlypheFiligrane({ icone, couleur, size = 88, rayon = tokens.radius.lg, position = 'bas' }: GlypheFiligraneProps) {
    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: rayon, overflow: 'hidden' }]}>
            <View style={styles[position]}>
                <Icon icon={icone} size={size} color={`${couleur}0F`} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Le coin bas droit est le defaut, et les trois positions ont ete essayees le 2026-08-30 avant
    // de s'y arreter : au milieu, la silhouette ne repondait a rien ; en haut, son sommet coupe se
    // lisait mal — une enveloppe sans dessus est une forme cassee, une enveloppe qui plonge sous le
    // bord est une enveloppe qui depasse. Le rognage doit manger le **bas** d'une silhouette.
    haut: {
        position: 'absolute',
        right: -tokens.space.md,
        top: -tokens.space.md,
    },
    centre: {
        position: 'absolute',
        right: -tokens.space.md,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    bas: {
        position: 'absolute',
        right: -tokens.space.md,
        bottom: -tokens.space.md,
    },
});
