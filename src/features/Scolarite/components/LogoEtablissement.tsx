/**
 * Le logo de l'etablissement, avec repli sur l'icone generique.
 *
 * Le catalogue porte une colonne `logo_url` depuis le jalon 6-G, et **elle n'etait lue nulle part** :
 * la plomberie existait, la donnee manquait. Un logo est de la donnee de catalogue au meme titre que
 * le nom — le publier, le remplacer ou le retirer reste une publication, jamais une release.
 *
 * ## Deux gabarits, parce que ce sont deux objets differents
 *
 * Un logo d'universite est un **logotype** : large, plus proche du mot que du pictogramme. Mesure du
 * 2026-08-27, l'Universite de Bordeaux est en **2,86:1** et Bordeaux INP en **1,69:1**. Les poser
 * dans le carre de 72 prevu pour une icone les reduisait a 49 points de large sur 17 de haut — un
 * timbre illisible au milieu d'un grand carre blanc.
 *
 * Le conteneur est donc **large quand il porte un logo** et carre quand il porte l'icone de repli.
 * `contain` fait le reste : un logotype tres large sature la largeur, un plus compact sature la
 * hauteur, et les deux occupent la boite.
 *
 * ## Fond blanc dans les deux themes, et ce n'est pas une entorse
 *
 * Un logo publie est fourni **detoure sur transparent**, dessine pour du blanc. Le poser sur le fond
 * de page le rendrait illisible en theme sombre — c'est ce que la capture montrait. Il prend donc
 * `lightFont`, blanc dans les deux themes, exactement comme le logo de UKit sur la page A propos.
 * Le teinter serait pire encore : ca ferait varier les couleurs d'une marque qu'on ne possede pas.
 *
 * L'icone de repli, elle, garde la teinte d'accent : ce n'est pas une marque, c'est un pictogramme.
 *
 * ## Trois etats, et le repli les couvre tous
 *
 * Aucun logo publie, un logo qui ne se charge pas (reseau coupe, fichier retire du bucket), et le
 * premier lancement hors ligne. Dans les trois cas l'ecran montre l'icone plutot qu'un carre vide —
 * le formulaire reste utilisable, ce qui est la seule chose qui compte a cet endroit.
 *
 * `onError` et non une verification prealable : on ne sait pas si une image chargera avant d'avoir
 * essaye, et une requete de controle doublerait le trafic pour deviner ce que l'echec dira de
 * lui-meme.
 *
 * ## Deux tailles, meme gabarit
 *
 * `compact` sert l'en-tete du tableau de bord, ou le logo remplit le vide a droite du titre et dit de
 * quelle fac viennent les donnees — la seule information que la page ne portait nulle part depuis
 * qu'il y a deux etablissements. Ce sont les memes proportions, a l'echelle : les figer une seconde
 * fois les aurait fait diverger a la premiere retouche.
 */

import React, { useState } from 'react';
import { Image, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Icon } from '../../../shared/ui/Icon';

/** Le gabarit d'un logotype : large, et assez haut pour qu'un logo compact respire aussi. */
const LARGEUR_LOGO = 208;
const HAUTEUR_LOGO = 88;
/** Celui du repli : un carre, comme toute surface d'icone de l'application. */
const COTE_ICONE = 72;
/**
 * La reduction de l'en-tete.
 *
 * Un seul facteur plutot que quatre nombres : les proportions mesurees au jalon 6-K restent vraies a
 * l'echelle, et une seconde table de tailles aurait diverge de la premiere des la premiere retouche.
 *
 * `0.42` donne **87 x 37 points**, ce qui tient dans la ligne d'ecriture d'un titre en 34 (environ 41
 * points de haut) sans la faire grandir. C'est la contrainte qui fixe la valeur : le logo partage la
 * ligne du grand titre, donc il doit s'y loger — pas la rallonger.
 *
 * Il a valu `0.38` le temps d'un essai ou il partageait une ligne de pastilles, plus basse. La
 * contrainte a change avec sa place ; c'est le seul nombre a bouger s'il faut le reajuster.
 */
const FACTEUR_COMPACT = 0.42;

export interface LogoEtablissementProps {
    /** L'adresse publiee par le catalogue, ou `null`. */
    logo: string | null;
    theme: AppThemeType;
    teinte: string;
    /** La taille de l'en-tete : les memes proportions, reduites. */
    compact?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function LogoEtablissement({ logo, theme, teinte, compact = false, style }: LogoEtablissementProps) {
    const [echec, setEchec] = useState(false);
    const montrerLeLogo = logo !== null && logo !== '' && !echec;
    const echelle = (valeur: number) => Math.round(compact ? valeur * FACTEUR_COMPACT : valeur);
    const marge = compact ? tokens.space.xs : tokens.space.md;

    if (!montrerLeLogo) {
        return (
            <View
                style={[
                    styles.surface,
                    { width: echelle(COTE_ICONE), height: echelle(COTE_ICONE), backgroundColor: `${teinte}1A` },
                    style,
                ]}
            >
                <Icon icon={{ name: 'school-outline' }} size={echelle(COTE_ICONE) / 2} color={teinte} />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.surface,
                {
                    width: echelle(LARGEUR_LOGO),
                    height: echelle(HAUTEUR_LOGO),
                    // Blanc dans les deux themes : les logos publies sont detoures sur transparent et
                    // dessines pour du blanc. Voir l'en-tete de ce fichier.
                    backgroundColor: theme.lightFont,
                    // Le rembourrage est **le notre**, et il vit sur le conteneur : les fichiers
                    // publies sont detoures a ras du trace, sans marge, et un `padding` pose sur une
                    // `Image` ne retrecit pas son contenu en React Native.
                    paddingHorizontal: marge,
                    paddingVertical: compact ? tokens.space.xxs : tokens.space.sm,
                },
                style,
            ]}
        >
            <Image
                source={{ uri: logo as string }}
                style={styles.image}
                resizeMode="contain"
                onError={() => setEchec(true)}
                accessibilityIgnoresInvertColors
            />
        </View>
    );
}

const styles = StyleSheet.create({
    surface: {
        // `radius.lg` : le gabarit de l'encart d'icone du formulaire de lien, et celui du logo de la
        // page A propos. Un carre arrondi, jamais un disque (docs/theme.md).
        borderRadius: tokens.radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
