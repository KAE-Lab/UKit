/**
 * Le bandeau fixe d'une fiche : les jours d'un menu ou d'une bibliotheque, les heures d'un batiment
 * (7-J, deuxieme passe).
 *
 * **Trois copies d'un meme bandeau** vivaient dans les fiches du CROUS, des bibliotheques et des salles
 * libres : le nom du lieu en gris, puis des puces sur une carte bordee d'un filet, qui coupait net le
 * contenu defilant dessous. Le nom monte dans la barre (« Details » ne nommait rien, review du
 * 2026-11-05), les puces prennent les cases du ruban du Planning, et le bandeau se pose sur le fond de
 * la page ; l'ecran pose le fondu sous lui (`FonduDeBord`).
 *
 * Il tient lui-meme sa liste : la case choisie se recentre, et un recentrage qui echoue avant la mesure
 * se rejoue une fois. Ce que les cases lisent (dates, heures) vit dans `bandeauDeCases.ts`, teste.
 */

import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens, type AppThemeType } from '../theme/Theme';
import Translator from '../i18n/Translator';
import { CaseDuRuban, TAILLE_DE_CASE } from './CaseDuRuban';
import { heureDuCreneau, jourDuFournisseur } from './bandeauDeCases';
import { HAUTEUR_DE_BARRE_POUSSEE } from '../navigation/NavHelpers';

const ECART = tokens.space.xs;
const PAS = TAILLE_DE_CASE + ECART;
const MARGE = tokens.space.sm;

export interface CaseDuBandeau {
    cle: string;
    haut: string | number;
    bas: string;
    courante?: boolean;
    /** La legende en capitales (« JEU ») ; faux pour une unite qui s'ecrit en bas de casse (« h »). */
    basEnCapitales?: boolean;
    accessibilite: string;
}

const JOURS = ['DAY_SUN', 'DAY_MON', 'DAY_TUE', 'DAY_WED', 'DAY_THU', 'DAY_FRI', 'DAY_SAT'] as const;

/** La case d'une date du fournisseur : le quantieme en grand, le jour en legende, aujourd'hui marque. */
export function caseDeDate(cle: string, date: string | null, aujourdhui: Date): CaseDuBandeau {
    const jour = jourDuFournisseur(date);
    if (jour === null) {
        const repli = date ?? Translator.get('UNKNOWN');
        return { cle, haut: '?', bas: repli, accessibilite: repli };
    }
    const bas = Translator.get(JOURS[jour.day()]);
    return { cle, haut: jour.date(), bas, courante: jour.isSame(aujourdhui, 'day'), accessibilite: `${bas} ${jour.date()}` };
}

/** La case d'un creneau rond (`08:00`) : l'heure sans zero en grand, son unite en legende. */
export function caseDHeure(creneau: string, instant: Date): CaseDuBandeau {
    const heure = heureDuCreneau(creneau);
    if (heure === null) return { cle: creneau, haut: creneau, bas: '', accessibilite: creneau };
    return {
        cle: creneau,
        haut: heure,
        bas: Translator.get('CASE_HEURE'),
        basEnCapitales: false,
        courante: heure === instant.getHours(),
        accessibilite: creneau,
    };
}

export function BandeauDeCases({ theme, fond, cases, choisie, onChoisir }: {
    theme: AppThemeType;
    /** Le fond de la page : le bandeau n'est pas un bloc a part, le contenu passe dessous en fondu. */
    fond: string;
    cases: readonly CaseDuBandeau[];
    choisie: number;
    onChoisir: (index: number) => void;
}) {
    const insets = useSafeAreaInsets();
    const liste = useRef<FlatList<CaseDuBandeau>>(null);
    const reprise = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Le recentrage attend la largeur de la liste : avant sa mesure, `scrollToIndex` centre la case
    // dans une fenetre de largeur nulle, et la premiere case partait a moitie hors de l'ecran.
    const [largeur, setLargeur] = useState(0);
    useEffect(() => {
        if (cases.length === 0 || largeur === 0) return undefined;
        const minuterie = setTimeout(() => {
            liste.current?.scrollToIndex({ index: choisie, animated: true, viewPosition: 0.5 });
        }, 100);
        return () => clearTimeout(minuterie);
    }, [choisie, cases.length, largeur]);
    useEffect(() => () => { if (reprise.current) clearTimeout(reprise.current); }, []);

    return (
        <View style={[styles.bandeau, { backgroundColor: fond, paddingTop: (insets.top || 0) + HAUTEUR_DE_BARRE_POUSSEE }]}>
            <FlatList
                ref={liste}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={cases as CaseDuBandeau[]}
                keyExtractor={(item) => item.cle}
                contentContainerStyle={styles.cases}
                onLayout={(evenement) => setLargeur(evenement.nativeEvent.layout.width)}
                getItemLayout={(_, index) => ({ length: PAS, offset: MARGE + PAS * index, index })}
                onScrollToIndexFailed={(info) => {
                    reprise.current = setTimeout(() => {
                        liste.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                    }, 500);
                }}
                renderItem={({ item, index }) => (
                    <View style={styles.emplacement}>
                        <CaseDuRuban
                            theme={theme}
                            haut={item.haut}
                            bas={item.bas}
                            choisie={index === choisie}
                            courante={item.courante === true}
                            basEnCapitales={item.basEnCapitales}
                            onPress={() => onChoisir(index)}
                            accessibilityLabel={item.accessibilite}
                        />
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    bandeau: {
        paddingBottom: tokens.space.xs,
    },
    cases: {
        paddingHorizontal: MARGE,
    },
    emplacement: {
        marginRight: ECART,
    },
});
