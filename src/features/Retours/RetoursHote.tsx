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

import { comparerVersions } from '../../shared/ciblage';
import { versionApplication } from '../../shared/ciblage/contexte';
import { jourDeParis } from '../../shared/communaute/donnees';
import Translator from '../../shared/i18n/Translator';
import { EVENEMENT_RETOURS, relireLesReponses } from '../../shared/retours';
import { capturerLEcran, ecouterLesCaptures, oublierLeFichier } from '../../shared/retours/captures';
import { guetterUneSortie, marquerAnnoncee, type Idee } from '../../shared/retours/idees';
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

function ReponseEnTete({ theme, surVisible }: { theme: AppThemeType; surVisible: (visible: boolean) => void }) {
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
    const visible = annonce !== null && derniere !== undefined && ecranCourant() !== 'MesRetours';
    useEffect(() => surVisible(visible), [visible, surVisible]);
    return (
        <Dialogue
            theme={theme}
            visible={visible}
            fermer={() => fermer(false)}
            titre={Translator.get('REPONSE_DE_L_EQUIPE')}
            corps={derniere?.texte ?? ''}
            action={{ libelle: Translator.get('REPONSE_VOIR'), onPress: () => fermer(true) }}
        />
    );
}

/**
 * La sortie d'une idee que cet appareil a soutenue (lot 4) : en tete, une fois, au lancement ou au retour au
 * premier plan. L'appareil compare ses soutiens aux statuts publies ; la base ne sait pas qui a soutenu quoi.
 */
/** « Mets a jour » seulement pour une version plus ancienne que celle qui livre l'idee. */
function corpsDeLaSortie(idee: Idee): string {
    if (idee.versionLivree === null) return idee.titre;
    const aJour = comparerVersions(versionApplication() ?? '', idee.versionLivree) !== -1;
    return Translator.get(aJour ? 'IDEE_LIVREE_CORPS_A_JOUR' : 'IDEE_LIVREE_CORPS', idee.titre, idee.versionLivree);
}

function IdeeLivreeEnTete({ theme, attendre }: { theme: AppThemeType; attendre: boolean }) {
    const [idee, setIdee] = useState<Idee | null>(null);

    useEffect(() => {
        let actif = true;
        const guetter = () => { void guetterUneSortie().then((i) => { if (actif && i !== null) setIdee(i); }); };
        guetter();
        const desabonner = onRetourAuPremierPlan(guetter);
        return () => {
            actif = false;
            desabonner();
        };
    }, []);

    const fermer = (voir: boolean) => {
        if (idee !== null) void marquerAnnoncee(idee.id);
        setIdee(null);
        if (voir) allerA('Idees');
    };

    return (
        <Dialogue
            theme={theme}
            // Deux dialogues ne s'empilent pas (iOS n'en montrerait qu'un) : la reponse de l'equipe passe d'abord.
            visible={idee !== null && !attendre}
            fermer={() => fermer(false)}
            titre={Translator.get('IDEE_LIVREE_TITRE')}
            corps={idee === null ? '' : corpsDeLaSortie(idee)}
            action={{ libelle: Translator.get('IDEE_LIVREE_VOIR'), onPress: () => fermer(true) }}
        />
    );
}

function PropositionDeCapture({ theme }: { theme: AppThemeType }) {
    const insets = useSafeAreaInsets();
    const [capture, setCapture] = useState<string | null>(null);
    const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
    // La capture proposee, hors du rendu : une seconde capture ou le demontage effacent la precedente.
    const proposee = useRef<string | null>(null);
    const proposer = useCallback((uri: string | null) => {
        if (minuteur.current !== null) clearTimeout(minuteur.current);
        if (proposee.current !== null) oublierLeFichier(proposee.current);
        proposee.current = uri;
        setCapture(uri);
    }, []);

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
                proposer(uri);
                minuteur.current = setTimeout(() => proposer(null), DUREE_DE_LA_PROPOSITION_MS);
            })();
        }).then((d) => {
            if (actif) desabonner = d; else d();
        });
        return () => {
            actif = false;
            desabonner();
            proposer(null);
        };
    }, [proposer]);

    if (capture === null) return null;
    // Une capture qu'on ne signale pas s'efface ; celle qu'on signale passe au formulaire, qui l'efface
    // en se fermant.
    const fermer = () => proposer(null);
    const signaler = () => {
        // Le formulaire la prend : il l'effacera en se fermant, pas l'hote.
        proposee.current = null;
        proposer(null);
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
    const [reponseVisible, setReponseVisible] = useState(false);
    if (!actif) return null;
    return (
        <>
            <ReponseEnTete theme={theme} surVisible={setReponseVisible} />
            <IdeeLivreeEnTete theme={theme} attendre={reponseVisible} />
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
