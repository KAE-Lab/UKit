import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { CrousService, CrousDayMenu } from '../services/CrousService';
import { structurerHoraires, type LigneHoraire } from '../services/CrousMapping';
import style, { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import type { UkitFailure } from '../../../shared/aetherius';
import { compter } from '../../../shared/mesure';
import { CampusFailureNotice } from '../components/CampusLayoutComponents';
import { CampusMapSection } from '../components/CampusMapSection';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ScreenState } from '../../../shared/ui/ScreenState';
import { ChargementPleinePage } from '../../../shared/ui/ChargementPleinePage';
import { CrousMealCard } from './components/CrousMealCard';
import { BandeauDeCases, caseDeDate } from '../../../shared/ui/BandeauDeCases';
import { FonduDeBord, HAUTEUR_DU_FONDU } from '../../../shared/ui/FonduDeBord';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { maintenant } from '../../../shared/services/Temps';
import { Icon } from '../../../shared/ui/Icon';

/**
 * Un ecran de menu qui n'a rien a lister : un etat, centre comme partout ailleurs.
 *
 * Le centrage vient de `ScreenState` et non d'un `justifyContent` local : cet ecran est pousse sur la
 * pile, donc sans barre d'onglets, mais son en-tete est transparent comme les autres — c'est le cas
 * par defaut de l'hote (shared/ui/ScreenState).
 */
function MenuPleinePage({ theme, children }: { theme: import('../../../shared/theme/Theme').AppThemeType; children: React.ReactNode }) {
    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            <ScreenState theme={theme} background={theme.courseBackground}>
                {children}
            </ScreenState>
        </SafeAreaView>
    );
}

/** Le filet qui separe deux lignes d'horaires. Jamais avant la premiere. */
function Filet({ theme }: { theme: AppThemeType }) {
    return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginLeft: tokens.space.md }} />;
}

/**
 * Une ligne d'horaires, rendue selon **ce qu'elle est**.
 *
 * La source ne declare aucune structure, mais elle en publie une : `structurerHoraires` la reconnait
 * (`CrousMapping`), et chaque forme a ici sa mise en page. Une `note` — le repli de tout ce qui n'est
 * pas reconnu — s'affiche telle quelle : le pire cas est donc exactement ce que l'ecran faisait quand
 * il alignait des lignes brutes.
 */
function LigneDHoraire({ ligne, theme }: { ligne: LigneHoraire; theme: AppThemeType }) {
    // Une **periode** cadre un groupe de lignes : l'intertitre gris des categories du menu, en
    // casse de phrase depuis la deuxieme passe de 7-J (les petites capitales espacees sont un tic). Un **guichet**, lui, se lit comme un nom de comptoir — donc
    // comme la colonne gauche d'un service, en gras : les deux etaient rendus a l'identique et un
    // guichet passait pour une plage de jours.
    if (ligne.kind === 'periode') {
        return (
            <Text style={{
                color: theme.fontSecondary,
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                paddingHorizontal: tokens.space.md,
                paddingTop: tokens.space.md,
                paddingBottom: tokens.space.xs,
            }}>
                {ligne.texte}
            </Text>
        );
    }

    if (ligne.kind === 'guichet') {
        return (
            <Text style={{
                color: theme.font,
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                paddingHorizontal: tokens.space.md,
                paddingTop: tokens.space.sm,
                paddingBottom: tokens.space.xxs,
            }}>
                {ligne.nom}
            </Text>
        );
    }

    if (ligne.kind === 'service') {
        return (
            <View style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: tokens.space.md,
                paddingHorizontal: tokens.space.md,
                paddingVertical: tokens.space.sm,
            }}>
                <Text style={{ color: theme.font, fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, flexShrink: 0 }}>
                    {ligne.nom}
                </Text>
                <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.sm, lineHeight: 20, textAlign: 'right', flex: 1 }}>
                    {ligne.horaire}
                </Text>
            </View>
        );
    }

    if (ligne.kind === 'horaire') {
        return (
            <Text style={{
                color: theme.font,
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                paddingHorizontal: tokens.space.md,
                paddingVertical: tokens.space.sm,
            }}>
                {ligne.texte}
            </Text>
        );
    }

    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space.sm, paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.sm }}>
            <Icon icon={{ name: 'information-outline' }} size={16} color={theme.fontSecondary} style={{ marginTop: tokens.space.xxs }} />
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.sm, lineHeight: 20, flex: 1 }}>
                {ligne.texte}
            </Text>
        </View>
    );
}

/**
 * Les horaires du restaurant, **en entier**, en pied de page.
 *
 * Trois decisions, et chacune corrige un essai precedent :
 *
 * - **selon leur forme**, et non ligne apres ligne. La source sert une liste d'affirmations
 *   heterogenes ; aplaties par des « | » elles formaient un pave, alignees brutes elles restaient
 *   indigestes. Mesure sur les quarante-et-un restaurants de la region : 36 lignes « NOM : creneau »,
 *   25 portees de jours, 20 creneaux nus ou phrases (`structurerHoraires`) ;
 * - **en pied**, parce que la raison d'ouvrir cet ecran est le menu. Les horaires sont une reference ;
 * - **dans la page et non derriere un bouton** : une information se lit, elle ne se declenche pas.
 *   La carte du restaurant a suivi la meme regle depuis : elle etait un bouton d'en-tete, elle est
 *   devenue la section « S'y rendre » en pied de page (`CampusMapSection`).
 *
 * La grammaire est celle d'un repas juste au-dessus : un intertitre, puis une carte.
 */
function HorairesDuRestaurant({ theme, lignes }: { theme: AppThemeType; lignes?: string[] }) {
    const structurees = structurerHoraires(lignes ?? []);
    if (structurees.length === 0) return null;

    return (
        // `xl` : l'ecart commun des sections d'une fiche, celui des repas (CrousMealCard).
        <View style={{ marginBottom: tokens.space.xl }}>
            <SectionHeader title={Translator.get('OPENING_HOURS')} theme={theme} />

            <View style={{
                backgroundColor: theme.cardBackground,
                borderRadius: tokens.radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.contourDeCarte,
                marginHorizontal: tokens.space.md,
                overflow: 'hidden',
                paddingBottom: tokens.space.xs,
            }}>
                {structurees.map((ligne, index) => (
                    <View key={index}>
                        {/*
                          * Pas de filet autour de ce qui cadre : ni au-dessus d'une periode, ni entre
                          * une periode ou un guichet et la premiere ligne qu'il annonce. Un titre
                          * touche ce qu'il annonce.
                          */}
                        {index > 0
                            && ligne.kind !== 'periode'
                            && structurees[index - 1].kind !== 'periode'
                            && structurees[index - 1].kind !== 'guichet'
                            ? <Filet theme={theme} />
                            : null}
                        <LigneDHoraire ligne={ligne} theme={theme} />
                    </View>
                ))}
            </View>
        </View>
    );
}

/** Les plats du jour selectionne — ou l'aveu qu'il n'y en a pas. */
function PlatsDuJour({ menu, theme }: { menu: CrousDayMenu; theme: AppThemeType }) {
    if (menu.midi?.length === 0 && menu.soir?.length === 0) {
        return (
            <Text style={{ textAlign: 'center', color: theme.fontSecondary, marginTop: tokens.space.lg, marginBottom: tokens.space.xl, paddingHorizontal: tokens.space.xl }}>
                {Translator.get('NO_DISH_INFO')}
            </Text>
        );
    }

    return (
        <>
            <CrousMealCard mealTitle={Translator.get('LUNCH')} categories={menu.midi} theme={theme} />
            <CrousMealCard mealTitle={Translator.get('DINNER')} categories={menu.soir} theme={theme} />
        </>
    );
}

export default function CrousMenuScreen({ route }: { route: { params: { restaurantId: string; restaurantName: string; location?: { lat: number; lng: number }; openingLines?: string[] } } }) {
    const { restaurantId, restaurantName, location, openingLines } = route.params;
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const theme = style.Theme[AppContextValues.themeName];

    const [menus, setMenus] = useState<CrousDayMenu[]>([]);
    const [failure, setFailure] = useState<UkitFailure | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Le titre de la barre est le nom du restaurant (StackNavigator, deuxieme passe de 7-J) : « Details »
    // ne nommait rien, et le bandeau le repetait en gris au-dessus des jours.
    useEffect(() => {
        // La fiche ouverte compte (7-D), par le code Croustillant du restaurant.
        compter('resto.ouverture', restaurantId);
        loadMenu();
    }, []);

    const loadMenu = async () => {
        setLoading(true);
        const resultat = await CrousService.fetchRestaurantMenu(restaurantId);
        if (!mountedRef.current) return;

        // `=== false` et non `!resultat.ok` : sans `strictNullChecks`, la seconde forme ne restreint
        // pas l'union. Voir shared/aetherius/runBlueprint.ts.
        if (resultat.ok === false) {
            setMenus([]);
            setFailure(resultat.failure);
        } else {
            setMenus(resultat.menus);
            setFailure(undefined);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <ChargementPleinePage
                theme={theme}
                message={Translator.get('LOADING_MENU')}
                background={theme.courseBackground}
            />
        );
    }

    // Une source en panne et un restaurant qui ne publie rien produisent deux ecrans differents. Le
    // second est frequent — plus de la moitie des restaurants de la region sont dans ce cas — et
    // n'est pas une erreur : le Blueprint accepte explicitement ce statut.
    if (failure !== undefined && failure.silent !== true) {
        return (
            <MenuPleinePage theme={theme}>
                <CampusFailureNotice failure={failure} theme={theme} onRetry={loadMenu} variant="plain" />
            </MenuPleinePage>
        );
    }

    if (menus.length === 0) {
        return (
            <MenuPleinePage theme={theme}>
                <EmptyState
                    variant="plain"
                    icon="food-off"
                    title={Translator.get('NO_MENU_PUBLISHED_TITLE')}
                    message={Translator.get('NO_MENU_PUBLISHED')}
                    theme={theme}
                />
            </MenuPleinePage>
        );
    }

    const currentMenu = menus[selectedIndex];

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            
            <BandeauDeCases
                theme={theme}
                fond={theme.courseBackground}
                cases={menus.map((menu, index) => caseDeDate(menu.date ?? String(index), menu.date, maintenant()))}
                choisie={selectedIndex}
                onChoisir={setSelectedIndex}
            />

            <View style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: HAUTEUR_DU_FONDU }}>
                    <PlatsDuJour menu={currentMenu} theme={theme} />
                    <HorairesDuRestaurant theme={theme} lignes={openingLines} />

                    {/* En pied, comme les horaires : le lieu ne depend pas du jour selectionne. */}
                    <CampusMapSection
                        location={location}
                        markerTitle={restaurantName}
                        theme={theme}
                        style={{ paddingHorizontal: tokens.space.md, marginBottom: tokens.space.xl }}
                    />

                    <View style={{ height: tokens.space.xxl }} />
                </ScrollView>
                <FonduDeBord fond={theme.courseBackground} />
            </View>
        </SafeAreaView>
    );
}