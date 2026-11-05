import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Translator from '../../../../shared/i18n/Translator';
import { tokens, AppThemeType } from '../../../../shared/theme/Theme';
import { SectionHeader } from '../../../../shared/ui/SectionHeader';
import { FreeRoomSlot, grouperParEtage } from '../../services/FreeRoomService';
import { HAUTEUR_DU_FONDU } from '../../../../shared/ui/FonduDeBord';

/** L'intertitre d'un etage : traduit, le rez-de-chaussee et les salles sans numero a part. */
function libelleDEtage(etage: number | null): string {
    if (etage === null) return Translator.get('FLOOR_UNNUMBERED');
    if (etage === 0) return Translator.get('FLOOR_GROUND');
    return Translator.get('FLOOR_N', etage);
}

/**
 * Une salle libre : son nom, l'heure ou elle cesse de l'etre, et la duree en chiffres a droite (7-J,
 * deuxieme passe). Chaque salle etait une carte a elle seule, dix-sept cartes identiques pour un
 * batiment, avec une pastille d'accent par ligne ; elles se rangent desormais dans la carte de leur
 * etage, un filet entre deux, comme les cours d'une journee de l'agenda.
 */
function LigneDeSalle({ slot, theme }: { slot: FreeRoomSlot; theme: AppThemeType }) {
    const minutes = slot.durationMinutes % 60;
    const duree = `${Math.floor(slot.durationMinutes / 60)}h${minutes > 0 ? minutes.toString().padStart(2, '0') : ''}`;
    return (
        <View style={styles.ligne}>
            <View style={{ flex: 1 }}>
                {/* `font` et non l'accent : un nom de salle nomme, il n'agit pas. */}
                <Text style={[styles.nomDeSalle, { color: theme.font }]}>{slot.room.name}</Text>
                <Text style={[styles.jusquA, { color: theme.fontSecondary }]}>
                    {Translator.get('AVAILABLE_UNTIL')} {slot.availableUntil}
                </Text>
            </View>
            <Text style={[styles.duree, tokens.texte.chiffres, { color: theme.fontSecondary }]}>{duree}</Text>
        </View>
    );
}

interface FreeRoomsListProps {
    freeRooms: FreeRoomSlot[];
    theme: AppThemeType;
    /** Ce qui suit les creneaux — la carte du batiment, montee par l'ecran. */
    pied?: React.ReactNode;
}

export function FreeRoomsList({ freeRooms, theme, pied }: FreeRoomsListProps) {
    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: HAUTEUR_DU_FONDU, paddingHorizontal: tokens.space.md }}>
            {/* L'intertitre d'une fiche (7-J, deuxieme passe), sans pastille de couleur. */}
            <SectionHeader
                title={`${Translator.get('FREE_ROOMS')} (${freeRooms.length})`}
                theme={theme}
                style={{ paddingHorizontal: 0 }}
            />

            {freeRooms.length === 0 ? (
                <Text style={{ textAlign: 'center', color: theme.fontSecondary, marginTop: tokens.space.xl }}>
                    {Translator.get('NO_FREE_ROOMS')}
                </Text>
            ) : (
                /* Par etage, du plus bas au plus haut : la question qu'on se pose devant la liste
                   n'est pas « quelle salle » mais « combien de marches ». L'intertitre est celui
                   des categories du menu, gris et en casse de phrase : un etage nomme, il n'agit pas. */
                grouperParEtage(freeRooms).map((groupe, indexGroupe) => (
                    <View key={groupe.etage ?? 'autres'}>
                        <Text style={{
                            ...tokens.texte.intertitre,
                            color: theme.fontSecondary,
                            marginTop: indexGroupe === 0 ? tokens.space.xs : tokens.space.lg,
                            marginBottom: tokens.space.sm,
                        }}>
                            {libelleDEtage(groupe.etage)}
                        </Text>
                        <View style={[styles.carte, { backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}>
                            {groupe.slots.map((slot, rang) => (
                                <View key={slot.room.id}>
                                    {rang > 0 ? <View style={[styles.filet, { backgroundColor: theme.border }]} /> : null}
                                    <LigneDeSalle slot={slot} theme={theme} />
                                </View>
                            ))}
                        </View>
                    </View>
                ))
            )}

            {pied}

            <View style={{ height: tokens.space.xxl }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    carte: {
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    ligne: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.md,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm + tokens.space.xs,
    },
    nomDeSalle: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    jusquA: {
        fontSize: tokens.fontSize.sm,
        marginTop: tokens.space.xxs,
    },
    duree: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    filet: {
        height: StyleSheet.hairlineWidth,
        marginLeft: tokens.space.md,
    },
});
