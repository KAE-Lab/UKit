/**
 * La description d'une annonce : un mini-langage publiable, rendu dans le vocabulaire des fiches.
 *
 * Un paragraphe nu ne donne pas envie d'etre lu, et un simple encadre n'y changeait rien : ce qui
 * aiguille dans le reste de l'application, ce sont les **tetes de section colorees** (l'icone dans
 * son carre teinte des fiches de restaurant et de BU) et les **lignes a puce** des menus. La
 * description parle donc cette langue-la — et comme tout vient du texte publie, un BDE peut
 * structurer et colorer son annonce **sans release**.
 *
 * ## La grammaire (une ligne = une regle, tout le reste est du texte)
 *
 *   | ligne             | rendu |
 *   |-------------------|-------|
 *   | `# Titre`         | une section : tete coloree, icone par defaut |
 *   | `# icone\|Titre`  | idem, avec l'icone MaterialCommunityIcons nommee (`calendar-check`, `map-marker`…) |
 *   | `- element`       | une puce, rendue comme les plats d'un menu |
 *   | ligne vide        | separation de paragraphes |
 *
 * Une icone inconnue rend le glyphe `?` de la famille — visible a la relecture de l'annonce, donc
 * corrigeable a la publication, jamais un plantage.
 *
 * ## Les couleurs tournent, et l'annonce choisit son point de depart
 *
 * Les tetes prennent la palette des sections (`theme.sectionsHeaders`, celle du Planning et de la
 * grille Scolarite), en **tournant** : premiere section, deuxieme, troisieme… La colonne `couleur`
 * de l'annonce — son identite, celle qui teinte aussi la pastille d'emetteur — fixe le point de
 * depart du cycle. L'index 4 est saute, comme partout : il duplique le 0 en theme sombre.
 */

import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { CampusSectionHeader } from '../components/CampusSectionHeader';

/** Les index utilisables de `sectionsHeaders` — le 4 duplique le 0 en theme sombre. */
const PALETTE = [0, 1, 2, 3, 5] as const;
const ICONE_PAR_DEFAUT = 'text-box-outline';

type ElementDeBloc =
    | { type: 'paragraphe'; texte: string }
    | { type: 'puce'; texte: string };

interface BlocAnnonce {
    titre: string | null;
    icone: string | null;
    contenu: ElementDeBloc[];
}

/** La couleur d'une section : la palette, en tournant a partir de l'identite de l'annonce. */
function couleurDeSection(depart: number | undefined, rang: number): number {
    const origine = depart !== undefined ? Math.max(PALETTE.indexOf(depart as typeof PALETTE[number]), 0) : 0;
    return PALETTE[(origine + rang) % PALETTE.length];
}

/** `icone|Titre` ou `Titre` seul : le pipe separe, il ne s'ecrit pas dans un intitule. */
function lireTitre(brut: string): { titre: string; icone: string | null } {
    const separateur = brut.indexOf('|');
    if (separateur === -1) return { titre: brut.trim(), icone: null };
    return { titre: brut.slice(separateur + 1).trim(), icone: brut.slice(0, separateur).trim() || null };
}

/**
 * Decoupe la description en blocs. Le tampon de paragraphe se vide a chaque puce, ligne vide, titre
 * ou fin — c'est ce qui permet de melanger librement paragraphes et puces dans une meme section.
 */
export function decouperEnBlocs(texte: string): BlocAnnonce[] {
    const blocs: BlocAnnonce[] = [{ titre: null, icone: null, contenu: [] }];
    let tampon: string[] = [];

    const vider = () => {
        const paragraphe = tampon.join('\n').trim();
        if (paragraphe !== '') blocs[blocs.length - 1].contenu.push({ type: 'paragraphe', texte: paragraphe });
        tampon = [];
    };

    for (const ligne of texte.split('\n')) {
        if (ligne.startsWith('# ')) {
            vider();
            blocs.push({ ...lireTitre(ligne.slice(2)), contenu: [] });
        } else if (ligne.startsWith('- ')) {
            vider();
            const puce = ligne.slice(2).trim();
            if (puce !== '') blocs[blocs.length - 1].contenu.push({ type: 'puce', texte: puce });
        } else if (ligne.trim() === '') {
            vider();
        } else {
            tampon.push(ligne);
        }
    }
    vider();

    return blocs.filter((bloc) => bloc.titre !== null || bloc.contenu.length > 0);
}

/** Une puce : la grammaire des plats d'un menu — le point prend la teinte de sa section. */
function Puce({ texte, teinte, theme }: { texte: string; teinte: string; theme: AppThemeType }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <MaterialCommunityIcons name="circle-medium" size={18} color={teinte} style={{ marginTop: tokens.space.xxs }} />
            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.font, flex: 1, lineHeight: 20, marginLeft: tokens.space.xs }}>
                {texte}
            </Text>
        </View>
    );
}

export interface DescriptionAnnonceProps {
    texte: string;
    /** L'identite de l'annonce (`couleur` en base) : le point de depart du cycle des sections. */
    couleurDepart?: number;
    theme: AppThemeType;
}

export function DescriptionAnnonce({ texte, couleurDepart, theme }: DescriptionAnnonceProps) {
    let rangDeSection = -1;

    return (
        <View style={{ gap: tokens.space.lg }}>
            {decouperEnBlocs(texte).map((bloc, index) => {
                if (bloc.titre !== null) rangDeSection += 1;
                const couleur = couleurDeSection(couleurDepart, Math.max(rangDeSection, 0));
                const teinte = theme.sectionsHeaders[couleur] ?? theme.accent ?? theme.primary;

                return (
                    <View key={index}>
                        {bloc.titre !== null ? (
                            <CampusSectionHeader
                                icone={(bloc.icone ?? ICONE_PAR_DEFAUT) as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                                titre={bloc.titre}
                                couleur={couleur}
                                theme={theme}
                                style={{ marginBottom: tokens.space.sm }}
                            />
                        ) : null}
                        {/* Une section sans corps garde sa tete seule : pas de carte vide dessous. */}
                        {bloc.contenu.length > 0 ? (
                            <View style={{
                                backgroundColor: theme.cardBackground,
                                borderWidth: 1,
                                borderColor: theme.border,
                                borderRadius: tokens.radius.lg,
                                padding: tokens.space.md,
                                gap: tokens.space.sm,
                            }}>
                                {bloc.contenu.map((element, rang) => (element.type === 'puce' ? (
                                    <Puce key={rang} texte={element.texte} teinte={teinte} theme={theme} />
                                ) : (
                                    <Text key={rang} style={{ fontSize: tokens.fontSize.md, color: theme.font, lineHeight: 24 }}>
                                        {element.texte}
                                    </Text>
                                )))}
                            </View>
                        ) : null}
                    </View>
                );
            })}
        </View>
    );
}
