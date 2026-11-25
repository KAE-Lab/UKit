/**
 * L'emploi du temps d'un ami, en lecture, et vos creneaux libres en commun (docs/phase-8/8-amis.md).
 *
 * En tete, les deux semaines que couvre un partage ; puis « Libres ensemble », une carte de la meme
 * surface que la carte du jour, un jour par rangee et ses creneaux en chiffres, et aujourd'hui le trou
 * de midi commun avec ses restaurants, celui du lot 6 tel quel (`Midi`). Dessous, son emploi du temps,
 * dans l'agenda de la vue semaine ; un instantane n'y montre que des plages « Occupe ». Retirer l'ami
 * l'efface de ce telephone.
 */

import moment from 'moment';
import React, { useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import Translator from '../../../shared/i18n/Translator';
import { AppContext, upperCaseFirstLetter } from '../../../shared/services/AppCore';
import { maintenant } from '../../../shared/services/Temps';
import style, { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Dialogue } from '../../../shared/ui/Dialogue';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { GroupeDeReglages, RangeeDeReglage } from '../../../shared/ui/GroupeDeReglages';
import { Icon } from '../../../shared/ui/Icon';
import { AgendaDeLaSemaine } from '../../Planning/components/AgendaDeLaSemaine';
import { Midi } from '../../Planning/components/CarteDuJour';
import { useOuManger } from '../../Planning/hooks/useOuManger';
import { formaterDuree, formaterHeure } from '../../Planning/services/frise';
import { amiExpire } from '../services/amis';
import { retirerLAmi, useAmis } from '../services/AmisStore';
import type { JourCommun } from '../services/creneauxCommuns';
import { partDeMidi } from '../services/creneauxCommuns';
import { dateDuJour, dernierJour } from '../services/instantane';
import { semainesProposees, useSemaineDeLAmi, type SemaineDeLAmi } from '../hooks/useSemaineDeLAmi';

type Navigation = { navigate: (route: string, params?: object) => void; goBack: () => void };

interface AmiScreenProps {
    navigation: Navigation;
    route: { params: { id: string } };
    headerPadding?: Record<string, unknown>;
    onAnimatedScroll?: (event: unknown) => void;
}

const ICONE = 16;

function Semaines({ theme, choisie, choisir }: { theme: AppThemeType; choisie: number; choisir: (rang: number) => void }) {
    const libelles = [Translator.get('AMI_CETTE_SEMAINE'), Translator.get('AMI_SEMAINE_PROCHAINE')];
    return (
        <View style={[styles.semaines, { backgroundColor: theme.greyBackground }]} accessibilityRole="tablist">
            {libelles.map((libelle, rang) => (
                <Pressable
                    key={libelle}
                    onPress={() => choisir(rang)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: rang === choisie }}
                    style={[styles.semaine, rang === choisie && { backgroundColor: theme.cardBackground }]}
                >
                    <Text style={[styles.libelleDeSemaine, { color: rang === choisie ? theme.font : theme.fontSecondary }]}>{libelle}</Text>
                </Pressable>
            ))}
        </View>
    );
}

function plage(debut: number, fin: number): string {
    return `${formaterHeure(debut)}–${formaterHeure(fin)}`;
}

/** Un jour de « Libres ensemble » : son nom, puis chaque creneau, l'heure a gauche, la duree a droite. */
function JourEnCommun({ jour, theme, premier }: { jour: JourCommun; theme: AppThemeType; premier: boolean }) {
    const titre = upperCaseFirstLetter(moment(jour.date).format('dddd D MMMM'));
    return (
        <View style={[styles.jour, !premier && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Text style={[styles.titreDuJour, { color: theme.font }]}>{titre}</Text>
            {jour.creneaux.map((creneau) => {
                const midi = partDeMidi(creneau) !== null;
                return (
                    <View
                        key={creneau.debut}
                        style={styles.creneau}
                        accessible
                        accessibilityLabel={`${titre}, ${plage(creneau.debut, creneau.fin)}, ${formaterDuree(creneau.fin - creneau.debut)}`}
                    >
                        <View style={styles.heures}>
                            <Icon icon={{ name: midi ? 'silverware-fork-knife' : 'clock-outline' }} size={ICONE} color={theme.fontSecondary} />
                            <Text style={[styles.plage, tokens.texte.chiffres, { color: theme.font }]}>{plage(creneau.debut, creneau.fin)}</Text>
                        </View>
                        <Text style={[styles.petit, tokens.texte.chiffres, { color: theme.fontSecondary }]}>{formaterDuree(creneau.fin - creneau.debut)}</Text>
                    </View>
                );
            })}
        </View>
    );
}

/** Ce que la carte « Libres ensemble » dit quand elle n'a pas de creneau a montrer. */
function messageSansCreneau(semaine: SemaineDeLAmi): string | null {
    if (semaine.mon === 'sans-emploi-du-temps') return Translator.get('AMI_SANS_MON_EDT');
    if (semaine.mon === 'echec') return Translator.get('AMI_MON_EDT_ECHEC');
    if (semaine.mon === 'lecture' || semaine.son === 'lecture') return null;
    if (semaine.son === 'echec') return Translator.get('AMI_SON_EDT_ECHEC');
    return Translator.get('AMI_AUCUN_COMMUN');
}

function LibresEnsemble({ semaine, theme, navigation }: { semaine: SemaineDeLAmi; theme: AppThemeType; navigation: Navigation }) {
    const aujourdhui = dateDuJour(maintenant());
    // Midi a venir seulement, comme la carte du jour : une fois le trou passe, rien a proposer.
    const midiAVenir = semaine.midi !== null && semaine.minute !== null && semaine.minute < semaine.midi.fenetre.fin;
    const ouManger = useOuManger(semaine.midi, semaine.minute, midiAVenir);
    const message = semaine.communs.length === 0 ? messageSansCreneau(semaine) : null;
    return (
        <>
            <Text style={[tokens.texte.intertitre, styles.intertitre, { color: theme.fontSecondary }]}>{Translator.get('AMI_EN_COMMUN')}</Text>
            <View style={[styles.carte, { backgroundColor: theme.eventBackground, borderColor: theme.contourDeCarte }]}>
                {semaine.communs.map((jour, rang) => (
                    <View key={jour.date}>
                        <JourEnCommun jour={jour} theme={theme} premier={rang === 0} />
                        {jour.date === aujourdhui && midiAVenir && semaine.midi !== null ? (
                            <Midi fenetre={semaine.midi.fenetre} etat={ouManger} theme={theme} navigation={navigation} />
                        ) : null}
                    </View>
                ))}
                {message !== null ? <Text style={[styles.message, { color: theme.fontSecondary }]}>{message}</Text> : null}
                {semaine.communs.length === 0 && message === null ? <ActivityIndicator color={theme.fontSecondary} /> : null}
            </View>
        </>
    );
}

export default function AmiScreen({ navigation, route, headerPadding, onAnimatedScroll }: AmiScreenProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName ?? 'light'];
    const amis = useAmis();
    const ami = useMemo(() => amis?.find((a) => a.id === route.params.id) ?? null, [amis, route.params.id]);
    const [rang, setRang] = useState(0);
    const [confirmation, setConfirmation] = useState(false);
    const semaines = useMemo(() => semainesProposees(maintenant()), []);
    const semaine = useSemaineDeLAmi(ami, semaines[rang]);
    const aujourdhui = dateDuJour(maintenant());

    if (ami === null) return <View style={[styles.page, { backgroundColor: theme.background }]} />;
    const expire = amiExpire(ami, aujourdhui);

    const retirer = (
        <GroupeDeReglages theme={theme}>
            <RangeeDeReglage theme={theme} icone="account-remove-outline" libelle={Translator.get('AMI_RETIRER', ami.nom)} onPress={() => setConfirmation(true)} destructive />
        </GroupeDeReglages>
    );

    return (
        <View style={[styles.page, { backgroundColor: theme.background }]}>
            <Animated.ScrollView contentContainerStyle={[headerPadding, styles.contenu]} onScroll={onAnimatedScroll as never} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
                {expire && ami.contenu.genre === 'instantane' ? (
                    <View style={styles.etat}>
                        <EmptyState
                            theme={theme}
                            icon="clock-outline"
                            tone="warning"
                            title={Translator.get('AMI_EXPIRE_TITRE')}
                            message={Translator.get('AMI_EXPIRE_CORPS', ami.nom, moment(dernierJour(ami.contenu.premierJour)).format('D MMMM'))}
                        />
                    </View>
                ) : (
                    <>
                        <Semaines theme={theme} choisie={rang} choisir={setRang} />
                        <LibresEnsemble semaine={semaine} theme={theme} navigation={navigation} />
                        <Text style={[tokens.texte.intertitre, styles.intertitre, { color: theme.fontSecondary }]}>
                            {Translator.get(ami.contenu.genre === 'groupes' ? 'AMI_SON_EDT' : 'AMI_SES_CRENEAUX')}
                        </Text>
                        {semaine.son === 'echec' ? (
                            <View style={styles.etat}>
                                <EmptyState theme={theme} icon="cloud-off" title={Translator.get('PARTAGE_ECHEC_TITRE')} message={Translator.get('AMI_SON_EDT_ECHEC')} action={{ label: Translator.get('RETRY'), onPress: semaine.relire }} />
                            </View>
                        ) : (
                            <AgendaDeLaSemaine jours={semaine.jours} repli={(r) => moment(semaine.jours[r]?.date)} theme={theme} navigation={undefined} />
                        )}
                    </>
                )}
                {retirer}
            </Animated.ScrollView>
            <Dialogue
                theme={theme}
                visible={confirmation}
                fermer={() => setConfirmation(false)}
                titre={Translator.get('AMI_RETIRER_TITRE', ami.nom)}
                corps={Translator.get('AMI_RETIRER_CORPS', ami.nom)}
                libelleFermer={Translator.get('CANCEL')}
                action={{
                    libelle: Translator.get('AMI_RETIRER', ami.nom),
                    onPress: () => {
                        setConfirmation(false);
                        void retirerLAmi(ami.id).then(() => navigation.goBack());
                    },
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    contenu: {
        paddingBottom: tokens.space.xxl,
    },
    etat: {
        marginHorizontal: tokens.space.md,
        marginTop: tokens.space.md,
    },
    semaines: {
        flexDirection: 'row',
        marginHorizontal: tokens.space.md,
        marginTop: tokens.space.md,
        padding: tokens.space.xxs,
        borderRadius: tokens.radius.md,
    },
    semaine: {
        flex: 1,
        minHeight: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: tokens.radius.sm,
    },
    libelleDeSemaine: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.semibold,
    },
    intertitre: {
        marginLeft: tokens.space.xl,
        marginTop: tokens.space.lg,
        marginBottom: tokens.space.sm,
    },
    // La surface de la carte du jour (CarteDuJour) : « Libres ensemble » en prolonge les trous.
    carte: {
        marginHorizontal: tokens.space.md,
        marginBottom: tokens.space.sm,
        padding: tokens.space.md,
        gap: tokens.space.sm,
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        ...tokens.shadow.sm,
    },
    jour: {
        gap: tokens.space.xs,
        paddingTop: tokens.space.xs,
    },
    titreDuJour: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    creneau: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 28,
    },
    heures: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.sm,
    },
    plage: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.medium,
    },
    petit: {
        fontSize: tokens.fontSize.sm,
    },
    message: {
        fontSize: tokens.fontSize.sm,
        lineHeight: 20,
    },
});
