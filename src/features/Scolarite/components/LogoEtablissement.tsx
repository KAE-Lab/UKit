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
 * Le blanc est **cadre par un filet** (`theme.border`) : sur un en-tete sombre, un rectangle blanc nu
 * se lisait comme un element flottant, pas comme une vignette posee. Le filet le rattache a la
 * surface — invisible ou presque en theme clair, decisif en sombre. Et en `compact` le rayon descend
 * a `radius.md` : `radius.lg` sur 37 points de haut arrondissait la vignette en pilule.
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
 * `filigrane` sert l'en-tete du tableau de bord : le logo y est rendu **monochrome**
 * (`tintColor: fontSecondary`), sans fond ni filet, plus grand que l'ancienne vignette. C'est l'usage
 * « niveaux de gris » que tout kit de marque autorise — a ne pas confondre avec recolorer ou tourner
 * le logo, qui restent interdits. Ce traitement supprime le carre blanc qui, en theme sombre, se
 * lisait comme un element flottant, et il a permis de **grossir** le logo : un aplat monochrome peut
 * occuper l'espace la ou un bloc blanc l'aurait ecrase. Sa taille se calcule du **ratio mesure** du
 * fichier publie — une hauteur commune egalise la masse visuelle entre un logotype etire et un logo
 * trapu, ce qu'une boite fixe ne faisait pas.
 *
 * Le formulaire de connexion emploie le meme traitement avec une hauteur plus genereuse (`hauteur`) :
 * le logo y est le heros du bandeau, pas une signature de coin. La vignette blanche a filet reste,
 * elle, sans usage courant — gardee pour un logo publie dont la silhouette monochrome serait illisible.
 */

import React, { useEffect, useState } from 'react';
import { Image, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Icon } from '../../../shared/ui/Icon';

/** Le gabarit d'un logotype : large, et assez haut pour qu'un logo compact respire aussi. */
const LARGEUR_LOGO = 208;
const HAUTEUR_LOGO = 88;
/** Celui du repli : un carre, comme toute surface d'icone de l'application. */
const COTE_ICONE = 72;
/**
 * Le gabarit du filigrane : une hauteur cible, et un plafond de largeur.
 *
 * La taille se calcule depuis le **ratio mesure du logo** (`Image.getSize`), pas depuis une boite
 * fixe : dans une boite, `contain` fait saturer la hauteur aux logos compacts et la largeur aux
 * etires — a hauteur pleine, le logo trapu de Bordeaux INP (1,69:1) paraissait plus lourd que le
 * logotype etire de l'UB (2,86:1). Une hauteur commune egalise la masse visuelle ; le plafond de
 * largeur ne rabote que les logotypes extremes.
 */
const HAUTEUR_FILIGRANE = 44;
const LARGEUR_MAX_FILIGRANE = 132;

export interface LogoEtablissementProps {
    /** L'adresse publiee par le catalogue, ou `null`. */
    logo: string | null;
    theme: AppThemeType;
    teinte: string;
    /** Le gabarit de l'en-tete : monochrome, sans fond, aux memes proportions reduites. */
    filigrane?: boolean;
    /**
     * La hauteur cible du filigrane — celle de l'en-tete par defaut. Le plafond de largeur et
     * l'icone de repli suivent la meme echelle, pour que le gabarit grandisse d'un bloc.
     */
    hauteur?: number;
    style?: StyleProp<ViewStyle>;
}

export function LogoEtablissement({ logo, theme, teinte, filigrane = false, hauteur = HAUTEUR_FILIGRANE, style }: LogoEtablissementProps) {
    const [echec, setEchec] = useState(false);
    /** Le ratio largeur/hauteur du fichier publie, mesure — inconnu tant que l'image n'a pas repondu. */
    const [ratio, setRatio] = useState<number | null>(null);
    const montrerLeLogo = logo !== null && logo !== '' && !echec;

    useEffect(() => {
        if (!filigrane || logo === null || logo === '') return;
        Image.getSize(
            logo,
            (largeur, hauteur) => { if (hauteur > 0) setRatio(largeur / hauteur); },
            () => setEchec(true),
        );
    }, [filigrane, logo]);

    if (!montrerLeLogo) {
        // En filigrane le repli suit le traitement : une icone nue, monochrome, sans surface.
        if (filigrane) {
            return (
                <View style={style}>
                    <Icon
                        icon={{ name: 'school-outline' }}
                        size={Math.round((hauteur * 28) / HAUTEUR_FILIGRANE)}
                        color={theme.fontSecondary}
                    />
                </View>
            );
        }
        return (
            <View
                style={[
                    styles.surface,
                    { width: COTE_ICONE, height: COTE_ICONE, backgroundColor: `${teinte}1A` },
                    style,
                ]}
            >
                <Icon icon={{ name: 'school-outline' }} size={COTE_ICONE / 2} color={teinte} />
            </View>
        );
    }

    if (filigrane) {
        // Rien tant que le ratio n'est pas mesure : un filigrane qui change de taille sous les yeux
        // serait pire qu'un filigrane qui apparait. La mesure sort du cache des la deuxieme fois.
        if (ratio === null) return null;

        // Le plafond de largeur suit la hauteur demandee : a 44 il vaut 132, a 64 il grandit
        // d'autant — sans quoi grossir le gabarit ne grossirait jamais un logotype etire.
        const largeurMax = (LARGEUR_MAX_FILIGRANE * hauteur) / HAUTEUR_FILIGRANE;
        const hauteurRendue = Math.min(hauteur, largeurMax / ratio);
        return (
            <View style={[{ width: Math.round(hauteurRendue * ratio), height: Math.round(hauteurRendue) }, style]}>
                <Image
                    source={{ uri: logo as string }}
                    // `tintColor` rend la silhouette du logo dans le gris du theme : lisible sur les
                    // deux fonds, sans le carre blanc qui flottait en sombre. Voir l'en-tete.
                    style={[styles.image, { tintColor: theme.fontSecondary }]}
                    resizeMode="contain"
                    onError={() => setEchec(true)}
                    accessibilityIgnoresInvertColors
                />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.surface,
                {
                    width: LARGEUR_LOGO,
                    height: HAUTEUR_LOGO,
                    // Blanc dans les deux themes : les logos publies sont detoures sur transparent et
                    // dessines pour du blanc. Voir l'en-tete de ce fichier.
                    backgroundColor: theme.lightFont,
                    // Le filet qui ancre le blanc : voir l'en-tete de ce fichier.
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.border,
                    // Le rembourrage est **le notre**, et il vit sur le conteneur : les fichiers
                    // publies sont detoures a ras du trace, sans marge, et un `padding` pose sur une
                    // `Image` ne retrecit pas son contenu en React Native.
                    paddingHorizontal: tokens.space.md,
                    paddingVertical: tokens.space.sm,
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
