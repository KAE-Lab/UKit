/**
 * Ce qui part avec un retour (lot 3) : les captures, en vignettes qu'un toucher retire, et les blocs du
 * contexte, chacun avec sa valeur telle qu'elle partira et son interrupteur. Rien n'est cache : ce qui
 * se lit ici est exactement ce que la console recevra.
 */

import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FAILURE_PRESENTATION, type UkitFailureKind } from '../../../shared/aetherius/failures';
import Translator, { type TranslationKey } from '../../../shared/i18n/Translator';
import type { Bloc, CleDeBloc, EchecJoint } from '../../../shared/retours/contexte';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Icon } from '../../../shared/ui/Icon';
import { GroupeDeReglages, RangeeDeReglage } from '../../../shared/ui/GroupeDeReglages';
import { RangeeAInterrupteur } from './Elements';

const VIGNETTE = 72;

export function CapturesJointes({ theme, captures, ajouter, retirer, ajout, max }: {
    theme: AppThemeType; captures: readonly string[]; ajouter: () => void; retirer: (uri: string) => void; ajout: boolean; max: number;
}) {
    return (
        <GroupeDeReglages theme={theme} titre={Translator.get('CAPTURES')}>
            {captures.length > 0 ? (
                <View style={styles.vignettes}>
                    {captures.map((uri) => (
                        <Pressable
                            key={uri}
                            onPress={() => retirer(uri)}
                            accessibilityRole="button"
                            accessibilityLabel={Translator.get('CAPTURE_RETIRER')}
                            style={[styles.vignette, { borderColor: theme.border, backgroundColor: theme.greyBackground }]}
                        >
                            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            <View style={[styles.croix, { backgroundColor: theme.cardBackground }]}>
                                <Icon icon={{ name: 'close' }} size={14} color={theme.font} />
                            </View>
                        </Pressable>
                    ))}
                </View>
            ) : null}
            {captures.length < max ? (
                <RangeeDeReglage theme={theme} icone="image-plus" libelle={Translator.get('CAPTURE_AJOUTER')} onPress={ajouter} enCours={ajout} desactivee={ajout} />
            ) : null}
        </GroupeDeReglages>
    );
}

const LIBELLE: Readonly<Record<CleDeBloc, TranslationKey>> = {
    version: 'CONTEXTE_VERSION',
    appareil: 'CONTEXTE_APPAREIL',
    etablissement: 'CONTEXTE_ETABLISSEMENT',
    langueTheme: 'CONTEXTE_LANGUE_THEME',
    onglet: 'CONTEXTE_ONGLET',
    reseau: 'CONTEXTE_RESEAU',
    erreur: 'CONTEXTE_ERREUR',
    echecs: 'CONTEXTE_ECHECS',
    parcours: 'CONTEXTE_PARCOURS',
};

const RESEAU: Readonly<Record<string, TranslationKey>> = {
    wifi: 'RESEAU_WIFI', cellulaire: 'RESEAU_CELLULAIRE', hors_ligne: 'RESEAU_HORS_LIGNE', autre: 'RESEAU_AUTRE',
};
const LANGUE: Readonly<Record<string, TranslationKey>> = { fr: 'FRENCH', en: 'ENGLISH', es: 'SPANISH' };

/** Un echec, tel qu'il part, dit dans la langue de l'ecran : l'hote, ce qui s'est passe, quand. */
function echecLisible(e: EchecJoint): string {
    const famille = (FAILURE_PRESENTATION as Record<string, { titleKey: TranslationKey } | undefined>)[e.famille as UkitFailureKind];
    const quoi = famille !== undefined ? Translator.get(famille.titleKey) : e.famille;
    return [e.hote ?? null, quoi, e.minutes !== undefined ? Translator.get('CONTEXTE_IL_Y_A', e.minutes) : null].filter((p) => p !== null).join(', ');
}

/** La valeur d'un bloc, en clair : ce que l'etudiant relit avant d'envoyer. */
export function valeurDuBloc(bloc: Bloc): string {
    const e = bloc.envoi as Record<string, unknown>;
    switch (bloc.cle) {
        case 'appareil': return [e.appareil, e.systeme].filter((v) => typeof v === 'string').join(', ');
        case 'langueTheme': return `${Translator.get(LANGUE[String(e.langue)] ?? 'FRENCH')}, ${Translator.get(e.theme === 'dark' ? 'DARK_THEME' : 'LIGHT_THEME')}`;
        case 'reseau': return Translator.get(RESEAU[String(e.reseau)] ?? 'RESEAU_AUTRE');
        case 'erreur': return echecLisible(e.erreur as EchecJoint);
        case 'echecs': return (e.echecs as EchecJoint[]).map(echecLisible).join(' ; ');
        case 'parcours': return (e.parcours as string[]).join(' › ');
        default: return String(Object.values(e)[0] ?? '');
    }
}

export function BlocsJoints({ theme, blocs, retires, basculer }: {
    theme: AppThemeType; blocs: readonly Bloc[]; retires: ReadonlySet<CleDeBloc>; basculer: (cle: CleDeBloc) => void;
}) {
    return (
        <GroupeDeReglages theme={theme} titre={Translator.get('CONTEXTE_TITRE')} filetCourt>
            {blocs.map((bloc) => (
                <RangeeAInterrupteur
                    key={bloc.cle}
                    theme={theme}
                    libelle={Translator.get(LIBELLE[bloc.cle])}
                    valeur={valeurDuBloc(bloc)}
                    actif={!retires.has(bloc.cle)}
                    basculer={() => basculer(bloc.cle)}
                />
            ))}
        </GroupeDeReglages>
    );
}

const styles = StyleSheet.create({
    vignettes: {
        flexDirection: 'row',
        gap: tokens.space.sm,
        padding: tokens.space.md,
    },
    vignette: {
        width: VIGNETTE,
        height: VIGNETTE * 1.6,
        borderRadius: tokens.radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    croix: {
        position: 'absolute',
        top: tokens.space.xs,
        right: tokens.space.xs,
        width: 22,
        height: 22,
        borderRadius: tokens.radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
