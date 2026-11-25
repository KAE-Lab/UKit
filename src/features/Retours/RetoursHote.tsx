/**
 * Ce que les retours font apparaitre par-dessus l'application (lot 3) : la reponse de l'equipe, en tete
 * a l'ouverture qui suit son arrivee, et la proposition de signaler apres une capture d'ecran. Pose par
 * la racine, comme les messages de service ; inactif pendant l'accueil.
 *
 * La proposition refait la capture de l'ecran de UKit — jamais celle du systeme, qu'aucune permission ne
 * donne —, au plus une fois par jour, et « Ne plus proposer » se rouvre dans Reglages, Confidentialite.
 * Elle a le gabarit du bandeau (`Bandeau.tsx`) : une carte sous la barre d'etat, qui ne deplace rien ; elle
 * porte deux gestes, et se retire seule.
 */

import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { jourDeParis } from '../../shared/communaute/donnees';
import Translator from '../../shared/i18n/Translator';
import { EVENEMENT_RETOURS, relireLesReponses } from '../../shared/retours';
import { capturerLEcran, ecouterLesCaptures, oublierLeFichier } from '../../shared/retours/captures';
import { aAnnoncer, marquer, peutProposer, type RetourConnu } from '../../shared/retours/donnees';
import { ecrireProposition, lireConnus, lireProposition, modifierConnus } from '../../shared/retours/memoire';
import { allerA, ecranCourant } from '../../shared/retours/navigation';
import { AppContext } from '../../shared/services/AppCore';
import { onRetourAuPremierPlan } from '../../shared/services/premierPlan';
import style, { tokens, type AppThemeType } from '../../shared/theme/Theme';
import { Dialogue } from '../../shared/ui/Dialogue';
import { HEADER_BUTTON_SIZE } from '../../shared/ui/HeaderButton';
import { Icon } from '../../shared/ui/Icon';

/** La proposition se retire seule : une capture d'ecran ne demande pas toujours de reponse. */
const DUREE_DE_LA_PROPOSITION_MS = 8000;
/** Les ecrans ou proposer n'aurait pas de sens : on y signale deja. */
const SANS_PROPOSITION = new Set(['Retour', 'MesRetours']);
const Z_INDEX = 900;

function ReponseEnTete({ theme }: { theme: AppThemeType }) {
    const [annonce, setAnnonce] = useState<RetourConnu | null>(null);

    const relire = useCallback(() => {
        void lireConnus().then((liste) => setAnnonce(aAnnoncer(liste)));
    }, []);

    useEffect(() => {
        relire();
        const abonnement = DeviceEventEmitter.addListener(EVENEMENT_RETOURS, (liste: RetourConnu[]) => setAnnonce(aAnnoncer(liste)));
        const desabonner = onRetourAuPremierPlan(() => { void relireLesReponses().then(relire); });
        return () => {
            abonnement.remove();
            desabonner();
        };
    }, [relire]);

    const fermer = (voir: boolean) => {
        const local = annonce?.local ?? null;
        setAnnonce(null);
        void modifierConnus((liste) => marquer(liste, 'annoncees', local));
        if (voir) allerA('MesRetours');
    };

    const derniere = annonce?.reponses[annonce.reponses.length - 1];
    return (
        <Dialogue
            theme={theme}
            visible={annonce !== null && derniere !== undefined && ecranCourant() !== 'MesRetours'}
            fermer={() => fermer(false)}
            titre={Translator.get('REPONSE_DE_L_EQUIPE')}
            corps={derniere?.texte ?? ''}
            action={{ libelle: Translator.get('REPONSE_VOIR'), onPress: () => fermer(true) }}
        />
    );
}

function PropositionDeCapture({ theme }: { theme: AppThemeType }) {
    const insets = useSafeAreaInsets();
    const [capture, setCapture] = useState<string | null>(null);
    const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let desabonner: () => void = () => undefined;
        let actif = true;
        void ecouterLesCaptures(() => {
            void (async () => {
                const jour = jourDeParis(new Date());
                if (SANS_PROPOSITION.has(ecranCourant() ?? '') || !peutProposer(await lireProposition(), jour)) return;
                const uri = await capturerLEcran();
                if (uri === null || !actif) return;
                await ecrireProposition({ jour, jamais: false });
                setCapture(uri);
                if (minuteur.current !== null) clearTimeout(minuteur.current);
                minuteur.current = setTimeout(() => {
                    oublierLeFichier(uri);
                    setCapture(null);
                }, DUREE_DE_LA_PROPOSITION_MS);
            })();
        }).then((d) => {
            if (actif) desabonner = d; else d();
        });
        return () => {
            actif = false;
            desabonner();
            if (minuteur.current !== null) clearTimeout(minuteur.current);
        };
    }, []);

    if (capture === null) return null;
    // Une capture qu'on ne signale pas s'efface ; celle qu'on signale passe au formulaire, qui l'efface
    // en se fermant.
    const fermer = () => {
        if (minuteur.current !== null) clearTimeout(minuteur.current);
        oublierLeFichier(capture);
        setCapture(null);
    };
    const signaler = () => {
        if (minuteur.current !== null) clearTimeout(minuteur.current);
        setCapture(null);
        allerA('Retour', { nature: 'bug', capture });
    };
    const nePlusProposer = () => {
        fermer();
        void ecrireProposition({ jour: jourDeParis(new Date()), jamais: true });
    };
    return (
        <View pointerEvents="box-none" style={[styles.hote, { top: insets.top + tokens.space.sm }]}>
            <View style={[styles.carte, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.ligne}>
                    <Icon icon={{ name: 'message-text-outline' }} size={22} color={theme.primary} />
                    <Text numberOfLines={2} style={[styles.titre, { color: theme.font }]}>{Translator.get('CAPTURE_PROPOSITION')}</Text>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={Translator.get('CLOSE')} hitSlop={tokens.space.sm} onPress={fermer} style={styles.croix}>
                        <Icon icon={{ name: 'close' }} size={tokens.fontSize.lg} color={theme.fontSecondary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.gestes}>
                    <TouchableOpacity accessibilityRole="button" onPress={nePlusProposer} hitSlop={tokens.space.xs}>
                        <Text style={[styles.geste, { color: theme.fontSecondary }]}>{Translator.get('CAPTURE_NE_PLUS_PROPOSER')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" onPress={signaler} style={[styles.signaler, { backgroundColor: theme.primary }]}>
                        <Text style={[styles.geste, { color: theme.lightFont }]}>{Translator.get('CAPTURE_SIGNALER')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

export function RetoursHote({ actif }: { actif: boolean }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName ?? 'light'];
    if (!actif) return null;
    return (
        <>
            <ReponseEnTete theme={theme} />
            <PropositionDeCapture theme={theme} />
        </>
    );
}

const styles = StyleSheet.create({
    hote: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: Z_INDEX,
        paddingHorizontal: tokens.space.md,
    },
    carte: {
        paddingVertical: tokens.space.sm,
        paddingLeft: tokens.space.md,
        paddingRight: tokens.space.xs,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        gap: tokens.space.sm,
        ...tokens.shadow.md,
    },
    ligne: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: HEADER_BUTTON_SIZE - tokens.space.sm,
        gap: tokens.space.sm,
    },
    titre: {
        flex: 1,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    croix: {
        padding: tokens.space.xs,
    },
    gestes: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: tokens.space.md,
        paddingRight: tokens.space.sm,
    },
    geste: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.semibold,
    },
    signaler: {
        minHeight: 36,
        paddingHorizontal: tokens.space.md,
        borderRadius: tokens.radius.md,
        justifyContent: 'center',
    },
});
