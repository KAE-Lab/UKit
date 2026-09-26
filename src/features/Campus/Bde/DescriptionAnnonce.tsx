/**
 * La description d'une annonce, dessinee dans le vocabulaire des fiches.
 *
 * La grammaire — le decoupage du mini-langage en blocs, le gras, la regle de la marque de fin — vit
 * dans `shared/annonces/grammaire.ts` depuis le jalon 7-F, pur et partage avec la console de
 * pilotage, dont l'apercu rend le meme arbre en HTML. Ici, on ne fait que dessiner : les tetes de
 * section colorees (l'icone dans son carre teinte des fiches de restaurant et de BU), les puces
 * comme les plats d'un menu, l'exergue, la transition, la signature.
 *
 * La regle d'ensemble des emphases (2026-08-31) : les TEXTES ne jouent que sur la taille et la
 * graisse, dans la couleur du texte ; la couleur vit dans de petits elements — filets et traits.
 * Les formes essayees et defaites sont notees sur chaque element.
 */

import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { GlypheFiligrane } from '../../../shared/ui/GlypheFiligrane';
import {
    arbreDeDescription,
    couleurDIdentite,
    estLeLead,
    ICONE_PAR_DEFAUT,
    porteLaSignature,
    segmentsDeTexte,
    type NiveauDePuce,
} from '../../../shared/annonces/grammaire';
import { CampusSectionHeader } from '../components/CampusSectionHeader';

/** Le gras en ligne : les `Text` imbriques heritent du style parent, seule la graisse change. */
function TexteRiche({ texte, style }: { texte: string; style: import('react-native').TextStyle }) {
    return (
        <Text style={style}>
            {segmentsDeTexte(texte).map((segment, rang) => (
                <Text key={rang} style={segment.gras ? { fontWeight: tokens.fontWeight.bold } : null}>
                    {segment.texte}
                </Text>
            ))}
        </Text>
    );
}

/**
 * L'exergue : le pull-quote — la phrase en grand, texte du theme, un filet teinte a gauche.
 *
 * Trois formes defaites avant celle-ci : texte teinte + guillemet geant en filigrane (trois signes
 * a la fois, le guillemet rogne par la hauteur du bloc, l'ensemble en brouillon de styles), puis la
 * phrase centree entre deux filets horizontaux — trop ceremonielle au milieu d'une lettre.
 */
function Exergue({ texte, teinte, theme }: { texte: string; teinte: string; theme: AppThemeType }) {
    return (
        <View style={{
            borderLeftWidth: 3,
            borderLeftColor: teinte,
            paddingLeft: tokens.space.md,
            marginVertical: tokens.space.sm,
        }}>
            <Text style={{
                fontSize: tokens.fontSize.xl,
                fontWeight: tokens.fontWeight.semibold,
                color: theme.font,
                lineHeight: 30,
            }}>
                {texte}
            </Text>
        </View>
    );
}

/**
 * La transition : la phrase en plus grand, sous un court trait teinte — le « crosshead » de presse.
 *
 * L'emphase moyenne entre le paragraphe et l'exergue, nee d'une phrase de liaison trop longue pour
 * l'une et trop importante pour le corps. Deux formes essayees et defaites le meme jour : le
 * surligneur a fond teinte faisait etiquette, pas emphase ; la bascule a droite ne passait pas a la
 * lecture. C'est l'ESPACE qui fait le travail, et le trait teinte l'annonce sans crier.
 */
function Transition({ texte, teinte, theme }: { texte: string; teinte: string; theme: AppThemeType }) {
    return (
        // Asymetrique a dessein : collee au texte qu'elle conclut (l'ecart du conteneur suffit),
        // detachee de ce qui suit — symetrique, elle flottait entre les deux sans appartenir a rien.
        <View style={{ marginBottom: tokens.space.md, gap: tokens.space.sm }}>
            <View style={{ width: 32, height: 3, borderRadius: tokens.radius.pill, backgroundColor: teinte }} />
            <Text style={{
                fontSize: tokens.fontSize.lg,
                fontWeight: tokens.fontWeight.semibold,
                color: theme.font,
                lineHeight: 26,
            }}>
                {texte}
            </Text>
        </View>
    );
}

/**
 * La signature : la fin d'une lettre — alignee a droite, teintee, en semibold.
 *
 * Rendue comme un texte de corps la formule de conge se noyait dans le dernier paragraphe ; une
 * lettre se termine par un nom qui se detache, pas par une ligne de plus.
 */
function Signature({ texte, teinte }: { texte: string; teinte: string }) {
    return (
        <Text style={{
            alignSelf: 'flex-end',
            fontSize: tokens.fontSize.lg,
            fontWeight: tokens.fontWeight.semibold,
            color: teinte,
            marginTop: tokens.space.xs,
        }}>
            {texte}
        </Text>
    );
}

/**
 * Une puce : la grammaire des plats d'un menu — le point prend la teinte de sa section.
 *
 * Trois profondeurs, degressives : point, petit point, tiret — chaque niveau s'indente et son
 * signe s'efface un peu, pour que la hierarchie se lise sans compter les retraits.
 */
function Puce({ texte, niveau, teinte, theme }: { texte: string; niveau: NiveauDePuce; teinte: string; theme: AppThemeType }) {
    const glyphe = niveau === 1 ? 'circle-medium' : niveau === 2 ? 'circle-small' : 'minus';
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginLeft: (niveau - 1) * tokens.space.lg }}>
            <MaterialCommunityIcons name={glyphe} size={20} color={teinte} style={{ marginTop: tokens.space.xxs, opacity: niveau === 1 ? 1 : 0.7 }} />
            {/* `md`, comme le corps : une puce d'article est du texte de lecture, pas une ligne de
                menu — en `sm` il fallait plisser les yeux. */}
            <TexteRiche
                texte={texte}
                style={{ fontSize: tokens.fontSize.md, color: theme.font, flex: 1, lineHeight: 24, marginLeft: tokens.space.xs }}
            />
        </View>
    );
}

export interface DescriptionAnnonceProps {
    texte: string;
    /** L'identite de l'annonce (`couleur` en base) : la couleur de toutes ses sections. */
    couleurDepart?: number;
    theme: AppThemeType;
}

export function DescriptionAnnonce({ texte, couleurDepart, theme }: DescriptionAnnonceProps) {
    const couleur = couleurDIdentite(couleurDepart);
    const teinte = theme.sectionsHeaders[couleur] ?? theme.accent ?? theme.primary;
    const { blocs, signatureClot } = arbreDeDescription(texte);

    return (
        // `xl` entre sections : le rythme d'un article, pas d'un formulaire — sans cartes pour
        // separer, c'est le blanc qui fait les chapitres.
        <View style={{ gap: tokens.space.xl }}>
            {blocs.map((bloc, index) => (
                <View key={index}>
                    {/* Le pied de la lettre recoit la plume en filigrane — une surface unique par
                        annonce, comme le heros et l'exergue, jamais un motif repete. */}
                    {porteLaSignature(bloc) ? (
                        <GlypheFiligrane icone={{ name: 'feather' }} couleur={teinte} size={64} rayon={0} />
                    ) : null}
                    {bloc.titre !== null ? (
                        <CampusSectionHeader
                            icone={(bloc.icone ?? ICONE_PAR_DEFAUT) as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                            titre={bloc.titre}
                            couleur={couleur}
                            theme={theme}
                            style={{ marginBottom: tokens.space.sm }}
                        />
                    ) : null}
                    {bloc.contenu.length > 0 ? (
                        <View style={{ gap: tokens.space.sm }}>
                            {bloc.contenu.map((element, rang) => {
                                if (element.type === 'puce') return <Puce key={rang} texte={element.texte} niveau={element.niveau} teinte={teinte} theme={theme} />;
                                if (element.type === 'exergue') return <Exergue key={rang} texte={element.texte} teinte={teinte} theme={theme} />;
                                if (element.type === 'transition') return <Transition key={rang} texte={element.texte} teinte={teinte} theme={theme} />;
                                if (element.type === 'signature') return <Signature key={rang} texte={element.texte} teinte={teinte} />;
                                return (
                                    // La taille de LECTURE, pas d'etiquette : le corps en `md`
                                    // interligne 26, le lead en `lg` — la typo de presse. En
                                    // `sm` il fallait plisser les yeux sur un texte long.
                                    <TexteRiche
                                        key={rang}
                                        texte={element.texte}
                                        style={estLeLead(index, bloc)
                                            ? { fontSize: tokens.fontSize.lg, color: theme.font, lineHeight: 28 }
                                            : { fontSize: tokens.fontSize.md, color: theme.font, lineHeight: 26 }}
                                    />
                                );
                            })}
                        </View>
                    ) : null}
                </View>
            ))}

            {/* La marque de fin — le « tombstone » des colonnes de presse : un point teinte qui dit
                que l'article est fini, avant que la galerie ou la carte prennent la suite. */}
            {!signatureClot && (
                <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 6, height: 6, borderRadius: tokens.radius.pill, backgroundColor: teinte, opacity: 0.6 }} />
                </View>
            )}
        </View>
    );
}
