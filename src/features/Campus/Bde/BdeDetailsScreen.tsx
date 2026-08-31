/**
 * La fiche d'une annonce : le visuel, les metadonnees, le recit, le lieu, le geste.
 *
 * Elle etait une pile de texte brut sous une image — un titre, deux pastilles violettes dont une
 * accroche qui debordait de l'ecran, un paragraphe. Elle parle desormais le vocabulaire des fiches :
 * l'emetteur est la pastille partagee (`Badge`, la meme que la carte de liste), l'accroche est une
 * **ligne d'information** et non une pastille — elle porte une phrase, pas une etiquette —, la
 * galerie et la carte « S'y rendre » suivent la description quand l'annonce les publie.
 *
 * **Le bouton d'action ouvre le navigateur integre** pour un lien web : un formulaire d'inscription
 * se remplit sans quitter l'application, et le retour est un geste. Un lien non-web (mailto, tel)
 * part vers le systeme, qui seul sait l'ouvrir.
 *
 * La fiche reste purement presentationnelle : l'annonce complete arrive par les parametres de
 * navigation, rien n'est recharge (docs/features/campus-vie-etudiante.md).
 */

import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Image, Animated, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import style, { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';
import { PiedFlottant, PIED_FLOTTANT_DEGAGEMENT } from '../../../shared/ui/PiedFlottant';
import { VisionneuseImages } from '../../../shared/ui/VisionneuseImages';
import { CampusMapSection } from '../components/CampusMapSection';
import { DescriptionAnnonce } from './DescriptionAnnonce';
import { GlypheFiligrane } from '../../../shared/ui/GlypheFiligrane';
import { teinteDAnnonce } from './PastilleEmetteur';
import { BdeAnnonce } from '../services/BdeService';

export interface BdeDetailsRouteParams {
    annonce?: BdeAnnonce;
}

export interface BdeDetailsScreenProps {
    route: { params: BdeDetailsRouteParams };
    navigation: { goBack: () => void; navigate: (screen: string, params?: Record<string, unknown>) => void };
    onAnimatedScroll?: (event: unknown) => void;
}

/**
 * Le ratio du cadre d'un visuel : celui de l'image, borne.
 *
 * Une affiche 1:1 s'affiche ainsi pleine, au lieu d'etre reduite dans un bandeau paysage. Les bornes
 * empechent un format extreme — story verticale, banniere — de prendre l'ecran ou de s'ecraser ;
 * avant la mesure, le carre est le format attendu des affiches.
 */
function useImageRatio(imageUrl?: string): number {
    const [ratio, setRatio] = useState(1);

    useEffect(() => {
        if (!imageUrl) return;
        Image.getSize(imageUrl, (imgWidth, imgHeight) => {
            if (imgWidth > 0 && imgHeight > 0) {
                setRatio(Math.min(Math.max(imgWidth / imgHeight, 3 / 4), 16 / 9));
            }
        }, () => undefined);
    }, [imageUrl]);

    return ratio;
}

/**
 * L'accroche : un **chapeau** editorial — le « deck » gris de presse, semibold, pose nu.
 *
 * Cinq formes essayees avant celle-ci : la pastille a une ligne debordait de l'ecran ; la ligne
 * grise faisait deux systemes pour deux voisines ; la pastille multi-ligne empilait deux capsules
 * identiques sous le titre et passait pour un avertissement systeme ; le texte teinte, enfin,
 * ajoutait un troisieme registre colore a la page. La regle d'ensemble (2026-08-31) : les textes ne
 * jouent que sur la taille et la graisse — la couleur d'identite vit dans les elements, pas dans
 * les phrases.
 */
function AccrocheAnnonce({ texte, theme }: { texte: string; theme: AppThemeType }) {
    return (
        <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: theme.fontSecondary, lineHeight: 22 }}>
            {texte}
        </Text>
    );
}

/**
 * Un visuel dans son cadre adaptatif — le visuel principal comme chaque image de la galerie.
 * Le toucher l'ouvre en plein ecran : une affiche se lit de pres (VisionneuseImages).
 */
function CadreVisuel({ url, theme, onPress }: { url: string; theme: AppThemeType; onPress: () => void }) {
    const ratio = useImageRatio(url);

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            style={{ width: '100%', aspectRatio: ratio, backgroundColor: theme.greyBackground, borderRadius: tokens.radius.lg, overflow: 'hidden' }}
        >
            <Image source={{ uri: url }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
        </TouchableOpacity>
    );
}

/**
 * La barre du geste, flottante sur le contenu : le vocabulaire de la barre de recherche
 * (`PiedFlottant` — objet pose + degrade d'amortissement), et le gabarit du bouton primaire de
 * reference (LienEdtForm), avec l'ombre partagee puisqu'il flotte.
 */
function BarreDAction({ texte, theme, onPress }: { texte: string; theme: AppThemeType; onPress: () => void }) {
    return (
        <PiedFlottant fond={theme.background}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
                style={{
                    backgroundColor: theme.primary,
                    borderRadius: tokens.radius.md,
                    height: 50,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    ...tokens.shadow.md,
                }}
            >
                <Text style={{ color: theme.lightFont, fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold }}>
                    {texte}
                </Text>
            </TouchableOpacity>
        </PiedFlottant>
    );
}

const BdeDetailsScreen = ({ route, navigation, onAnimatedScroll }: BdeDetailsScreenProps) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const { annonce } = route.params || {};

    // Avant le retour conditionnel : les hooks se declarent inconditionnellement.
    const [imageOuverte, setImageOuverte] = useState<number | null>(null);

    if (!annonce) return null;

    // L'identite de l'annonce : sa couleur de palette, l'accent en repli — c'est elle qui teinte la
    // pastille d'emetteur, l'accroche, et le point de depart des sections.
    const teinte = teinteDAnnonce(annonce.couleur, theme);

    // Tous les visuels de la fiche dans une seule visionneuse balayable : le principal en tete,
    // la galerie a la suite — l'index ouvert est celui du visuel touche.
    const visuels = [annonce.image_url, ...(annonce.images ?? [])]
        .filter((url): url is string => typeof url === 'string' && url !== '');

    const handlePressCTA = () => {
        const lien = annonce.cta_link;
        if (!lien) return;
        // Le web s'ouvre dans l'application, le reste (mailto, tel) part vers le systeme.
        if (lien.startsWith('http')) return navigation.navigate('WebBrowser', { href: lien });
        Linking.openURL(lien).catch(() => undefined);
    };

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={{ flex: 1, backgroundColor: theme.background }}>
                    <Animated.ScrollView
                        onScroll={onAnimatedScroll}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingTop: (insets?.top || 0) + 70,
                            // La barre d'action est flottante : le defilement degage sa hauteur,
                            // sans quoi la carte « S'y rendre » mourrait dessous.
                            paddingBottom: annonce.cta_text && annonce.cta_link ? PIED_FLOTTANT_DEGAGEMENT : tokens.space.xxl,
                        }}
                    >
                        {/* Sans visuel, pas de cadre : un rectangle gris se lirait comme une image
                            cassee, et la fiche omet ce qui manque plutot que de le remplacer. */}
                        {annonce.image_url ? (
                            <View style={{ paddingHorizontal: tokens.space.md }}>
                                <CadreVisuel url={annonce.image_url} theme={theme} onPress={() => setImageOuverte(0)} />
                            </View>
                        ) : null}

                        {/* `md`, la gouttiere des boutons et de la barre d'action : a `sm`, le texte
                            debordait des bords que le reste de la page etablit — des paragraphes qui
                            flottaient dans le vide. L'image suit, pour que ses bords tombent sur
                            ceux du bouton. */}
                        <View style={{ paddingHorizontal: tokens.space.md, paddingTop: tokens.space.lg }}>
                            {/*
                              * Le heros, en grammaire d'article : kicker (l'emetteur, petites
                              * capitales grises), titre en corps d'affiche, chapeau teinte — et le
                              * filigrane signature du depot, permis ici parce que la fiche est une
                              * surface unique, jamais dans les listes. La pastille d'emetteur a
                              * vecu ici et a ete defaite (2026-08-31) : sous le titre, elle
                              * s'empilait avec l'accroche en deux capsules jumelles.
                              */}
                            <View style={{ marginBottom: tokens.space.lg }}>
                                <GlypheFiligrane icone={{ name: 'bullhorn' }} couleur={teinte} rayon={0} />
                                <Text style={{
                                    fontSize: tokens.fontSize.xs,
                                    fontWeight: tokens.fontWeight.semibold,
                                    color: theme.fontSecondary,
                                    letterSpacing: 0.8,
                                    textTransform: 'uppercase',
                                    marginBottom: tokens.space.xs,
                                }}>
                                    {annonce.issuer_name}
                                </Text>
                                <Text style={{
                                    fontSize: tokens.fontSize.xxl,
                                    fontWeight: tokens.fontWeight.bold,
                                    color: theme.font,
                                    lineHeight: 34,
                                    marginBottom: annonce.info_label ? tokens.space.sm : 0,
                                }}>
                                    {annonce.title}
                                </Text>
                                {annonce.info_label ? (
                                    <AccrocheAnnonce texte={annonce.info_label} theme={theme} />
                                ) : null}
                            </View>

                            {annonce.long_desc ? (
                                <DescriptionAnnonce texte={annonce.long_desc} couleurDepart={annonce.couleur} theme={theme} />
                            ) : null}

                            {/* La galerie suit le recit : chaque image dans le meme cadre adaptatif
                                que le visuel principal. */}
                            {annonce.images !== undefined ? (
                                <View style={{ marginTop: tokens.space.lg, gap: tokens.space.md }}>
                                    {annonce.images.map((url) => (
                                        <CadreVisuel key={url} url={url} theme={theme} onPress={() => setImageOuverte(visuels.indexOf(url))} />
                                    ))}
                                </View>
                            ) : null}

                            <CampusMapSection
                                location={annonce.location}
                                markerTitle={annonce.title}
                                theme={theme}
                                style={{ marginTop: tokens.space.xl }}
                            />
                        </View>
                    </Animated.ScrollView>

                    {annonce.cta_text && annonce.cta_link ? (
                        <BarreDAction texte={annonce.cta_text} theme={theme} onPress={handlePressCTA} />
                    ) : null}

                    <VisionneuseImages urls={visuels} index={imageOuverte} fermer={() => setImageOuverte(null)} />
                </View>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};


export default withHeaderAnimation(BdeDetailsScreen);
