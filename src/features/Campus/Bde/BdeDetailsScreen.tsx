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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import style, { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';
import { PiedFlottant, PIED_FLOTTANT_DEGAGEMENT } from '../../../shared/ui/PiedFlottant';
import { CampusMapSection } from '../components/CampusMapSection';
import { DescriptionAnnonce } from './DescriptionAnnonce';
import { PastilleEmetteur, teinteDAnnonce } from './PastilleEmetteur';
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
 * L'accroche, dans le meme systeme que la pastille d'emetteur : fond teinte a 10 %, icone et texte
 * dans la teinte d'identite — mais **multi-ligne**. C'est le debordement qui l'avait chassee des
 * pastilles (une phrase dans une pastille a une ligne sortait de l'ecran) ; la ligne grise essayee
 * ensuite faisait deux systemes pour deux voisines. Celle-ci enveloppe sa phrase.
 */
function AccrocheAnnonce({ texte, teinte }: { texte: string; teinte: string }) {
    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            alignSelf: 'flex-start',
            backgroundColor: `${teinte}1A`,
            paddingHorizontal: tokens.space.sm,
            paddingVertical: tokens.space.xs,
            borderRadius: tokens.radius.md,
        }}>
            <MaterialCommunityIcons name="information-outline" size={14} color={teinte} style={{ marginTop: tokens.space.xxs }} />
            <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: teinte, marginLeft: tokens.space.xs, flexShrink: 1, lineHeight: 20 }}>
                {texte}
            </Text>
        </View>
    );
}

/** Un visuel dans son cadre adaptatif — le visuel principal comme chaque image de la galerie. */
function CadreVisuel({ url, theme }: { url: string; theme: AppThemeType }) {
    const ratio = useImageRatio(url);

    return (
        <View style={{ width: '100%', aspectRatio: ratio, backgroundColor: theme.greyBackground, borderRadius: tokens.radius.lg, overflow: 'hidden' }}>
            <Image source={{ uri: url }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
        </View>
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

    if (!annonce) return null;

    // L'identite de l'annonce : sa couleur de palette, l'accent en repli — c'est elle qui teinte la
    // pastille d'emetteur, l'accroche, et le point de depart des sections.
    const teinte = teinteDAnnonce(annonce.couleur, theme);

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
                                <CadreVisuel url={annonce.image_url} theme={theme} />
                            </View>
                        ) : null}

                        {/* `md`, la gouttiere des boutons et de la barre d'action : a `sm`, le texte
                            debordait des bords que le reste de la page etablit — des paragraphes qui
                            flottaient dans le vide. L'image suit, pour que ses bords tombent sur
                            ceux du bouton. */}
                        <View style={{ paddingHorizontal: tokens.space.md, paddingTop: tokens.space.lg }}>
                            <Text style={{ fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.bold, color: theme.font, marginBottom: tokens.space.sm }}>
                                {annonce.title}
                            </Text>

                            {/* La pastille d'emetteur porte l'identite de l'annonce (`couleur` en
                                base) — le meme fond a 10 % que le Badge, dans SA teinte. */}
                            <View style={{ flexDirection: 'row', marginBottom: tokens.space.sm }}>
                                <PastilleEmetteur nom={annonce.issuer_name} teinte={teinte} />
                            </View>

                            {/* Le meme systeme que la pastille d'emetteur, en version multi-ligne :
                                deux voisines a deux styles se lisaient comme un accident. */}
                            {annonce.info_label ? (
                                <View style={{ marginBottom: tokens.space.md }}>
                                    <AccrocheAnnonce texte={annonce.info_label} teinte={teinte} />
                                </View>
                            ) : null}

                            {annonce.long_desc ? (
                                <DescriptionAnnonce texte={annonce.long_desc} couleurDepart={annonce.couleur} theme={theme} />
                            ) : null}

                            {/* La galerie suit le recit : chaque image dans le meme cadre adaptatif
                                que le visuel principal. */}
                            {annonce.images !== undefined ? (
                                <View style={{ marginTop: tokens.space.lg, gap: tokens.space.md }}>
                                    {annonce.images.map((url) => (
                                        <CadreVisuel key={url} url={url} theme={theme} />
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
                </View>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};


export default withHeaderAnimation(BdeDetailsScreen);
