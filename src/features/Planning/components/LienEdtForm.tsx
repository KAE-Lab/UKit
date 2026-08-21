/**
 * La saisie du lien d'abonnement a l'emploi du temps — le repli universel du jalon 6-J.
 *
 * **Un composant et non un ecran**, et c'est une contrainte reelle plutot qu'un gout : le parcours
 * d'accueil est rendu **a la place** du conteneur de navigation (`rootContainer.tsx`), il ne peut donc
 * pas naviguer vers un ecran de pile. Le meme formulaire sert donc trois endroits — l'etape d'accueil,
 * qui le rend en place ; l'ecran de pile atteint depuis l'etat vide du Planning et depuis les
 * Reglages. `onDone` est ce qui les distingue, et rien d'autre.
 *
 * **Le lien est verifie avant d'etre enregistre**, et c'est ce qui le distingue d'un champ de reglage.
 * Un lien colle de travers — l'adresse de la page de l'agenda au lieu du lien d'abonnement, une
 * redirection vers une page de connexion — donnerait un planning vide que personne ne saurait
 * expliquer, et l'application porterait le chapeau. On joue donc le Blueprint une fois, on compte les
 * cours, et on refuse en nommant ce qui ne va pas.
 *
 * Voir docs/features/planning.md et docs/phase-6/6-j-compte-et-sources-par-etablissement.md.
 */

import React, { useCallback, useContext, useState } from 'react';
import {
    ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Translator from '../../../shared/i18n/Translator';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { enregistrerLienEdt, lienEdtActif, sourceEdt } from '../../../shared/etablissements';
import { verifierLienEdt } from '../services/PlanningIcalSource';
import { ActionButton } from '../../../shared/ui/ActionButton';

interface LienEdtFormProps {
    /**
     * Ce qu'on fait une fois le lien pose — revenir en arriere depuis la pile, ou rien du tout depuis
     * l'accueil, qui reste sur son etape.
     */
    readonly onDone?: () => void;
    readonly topPadding?: number;
}

/**
 * Ce que la verification a rendu.
 *
 * `confirme` existe pour une raison qui vaut d'etre dite : le lien est **deja enregistre** quand cet
 * etat s'affiche, et l'ecran reste ouvert le temps de montrer ce qu'on a trouve. Un compte de cours
 * est la seule preuve qu'un etudiant puisse avoir que le lien colle est bien le sien — repartir en
 * silence lui laisserait a verifier lui-meme, et zero cours affiche noir sur blanc lui apprend quelque
 * chose au lieu de le laisser devant un planning vide.
 */
type Verdict =
    | { readonly etat: 'repos' }
    | { readonly etat: 'verification' }
    | { readonly etat: 'refuse'; readonly message: string }
    | { readonly etat: 'confirme'; readonly cours: number };

/** L'aide du catalogue, affichee telle quelle — c'est une donnee d'etablissement, pas un libelle. */
const AideLien = ({ theme, aide }) => (
    <View style={[styles.aide, { backgroundColor: theme.greyBackground }]}>
        <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs }}>
            {Translator.get('TIMETABLE_LINK_HELP')} {aide}
        </Text>
    </View>
);

/**
 * Ce que la verification a dit, en une ligne.
 *
 * Un calendrier reconnu **sans aucun cours** n'est pas un refus : en aout c'est le cas ordinaire, et
 * c'est justement le moment ou un etudiant installe l'application. On le dit, on ne le rejette pas —
 * d'ou une troisieme apparence, ni verte ni rouge.
 */
const VerdictLigne = ({ theme, verdict }: { theme; verdict: Verdict }) => {
    if (verdict.etat === 'refuse') {
        return (
            <View style={styles.errorRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.accentFont} />
                <Text style={[styles.errorText, { color: theme.accentFont }]}>{verdict.message}</Text>
            </View>
        );
    }
    if (verdict.etat !== 'confirme') return null;

    const trouve = verdict.cours > 0;
    return (
        <View style={styles.errorRow}>
            <MaterialCommunityIcons
                name={trouve ? 'check-circle-outline' : 'information-outline'}
                size={16}
                color={trouve ? theme.primary : theme.fontSecondary}
            />
            <Text style={[styles.errorText, { color: trouve ? theme.primary : theme.fontSecondary }]}>
                {trouve ? Translator.get('TIMETABLE_LINK_OK', verdict.cours) : Translator.get('TIMETABLE_LINK_EMPTY')}
            </Text>
        </View>
    );
};

/**
 * L'etat de la saisie : ce qu'on a tape, ce que la verification en a dit, et les deux gestes.
 *
 * Extrait du composant pour la meme raison que partout ailleurs dans ce depot — un fichier qui porte
 * **ce qui change** et un autre **ce qui s'affiche** — et parce que la garde ESLint sur la taille des
 * fonctions a sonne, ce qui est exactement son role.
 */
function useSaisieLien(onDone?: () => void) {
    const [lien, setLien] = useState(lienEdtActif() ?? '');
    const [verdict, setVerdict] = useState<Verdict>({ etat: 'repos' });

    const soumettre = useCallback(async () => {
        const candidat = lien.trim();
        if (candidat === '' || verdict.etat === 'verification') return;

        setVerdict({ etat: 'verification' });
        const controle = await verifierLienEdt(candidat);

        if (controle.ok === false) {
            setVerdict({ etat: 'refuse', message: Translator.get(controle.messageKey) });
            return;
        }

        // Enregistre des maintenant : l'ecran d'ou l'on vient relit la source a son prochain rendu, et
        // le planning est donc deja rempli quand on y revient. Ce qui reste affiche ici est le compte
        // de cours, pour que l'etudiant sache que le lien colle est bien le sien.
        await enregistrerLienEdt(candidat);
        setVerdict({ etat: 'confirme', cours: controle.cours });
    }, [lien, verdict.etat]);

    const oublier = useCallback(async () => {
        await enregistrerLienEdt(null);
        setLien('');
        setVerdict({ etat: 'repos' });
        onDone?.();
    }, [onDone]);

    // Le refus porte sur le lien precedent : le garder affiche pendant qu'on en tape un autre le ferait
    // passer pour un verdict sur celui-la.
    const saisir = useCallback((saisie: string) => {
        setLien(saisie);
        setVerdict((precedent) => (precedent.etat === 'refuse' ? { etat: 'repos' } : precedent));
    }, []);

    return { lien, verdict, saisir, soumettre, oublier };
}

export default function LienEdtForm({ onDone, topPadding = 0 }: LienEdtFormProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName ?? 'light'];

    const { lien, verdict, saisir, soumettre, oublier } = useSaisieLien(onDone);

    // L'aide vient du catalogue et s'affiche telle quelle : le chemin exact vers un lien d'abonnement
    // est propre a chaque universite, et le traduire n'aurait aucun sens (meme regle que son nom).
    const source = sourceEdt();
    const aide = source.kind === 'abonnement' || source.kind === 'lien-attendu' ? source.config.aide : null;

    const enregistre = lienEdtActif() !== null;
    const confirme = verdict.etat === 'confirme';
    const desactive = !confirme && (lien.trim() === '' || verdict.etat === 'verification');

    return (
    <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
        <ScrollView
            contentContainerStyle={{ paddingTop: topPadding + tokens.space.md, paddingBottom: tokens.space.xxl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.hero}>
                <View style={[styles.iconWrap, { backgroundColor: `${theme.primary}1A` }]}>
                    <MaterialCommunityIcons name="calendar-import" size={36} color={theme.primary} />
                </View>
                <Text style={[styles.title, { color: theme.font }]}>
                    {Translator.get('TIMETABLE_LINK_TITLE')}
                </Text>
                <Text style={[styles.subtitle, { color: theme.fontSecondary }]}>
                    {Translator.get('TIMETABLE_LINK_DESC')}
                </Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                {aide !== null && <AideLien theme={theme} aide={aide} />}

                <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.font, borderColor: theme.border }]}
                    placeholder={Translator.get('TIMETABLE_LINK_PLACEHOLDER')}
                    placeholderTextColor={theme.fontSecondary}
                    value={lien}
                    onChangeText={saisir}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    multiline
                    editable={verdict.etat !== 'verification'}
                />

                <VerdictLigne theme={theme} verdict={verdict} />

                <TouchableOpacity
                    onPress={confirme ? () => onDone?.() : () => { void soumettre(); }}
                    disabled={desactive}
                    activeOpacity={0.85}
                    style={[styles.button, { backgroundColor: theme.primary }, desactive && { opacity: 0.5 }]}
                >
                    {verdict.etat === 'verification' ? (
                        <>
                            <ActivityIndicator size="small" color={theme.lightFont} />
                            <Text style={[styles.buttonText, { color: theme.lightFont }]}>
                                {Translator.get('TIMETABLE_LINK_CHECKING')}
                            </Text>
                        </>
                    ) : (
                        <Text style={[styles.buttonText, { color: theme.lightFont }]}>
                            {Translator.get(confirme ? 'FINISH' : 'TIMETABLE_LINK_CHECK')}
                        </Text>
                    )}
                </TouchableOpacity>

                {enregistre && (
                    <ActionButton
                        theme={theme}
                        variant="destructive"
                        icon={{ name: 'link-variant-off' }}
                        label={Translator.get('TIMETABLE_LINK_FORGET')}
                        onPress={() => { void oublier(); }}
                        style={styles.forget}
                    />
                )}
            </View>
        </ScrollView>
    </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    hero: {
        alignItems: 'center',
        paddingHorizontal: tokens.space.lg,
        marginBottom: tokens.space.lg,
    },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: tokens.radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: tokens.space.md,
    },
    title: {
        fontSize: tokens.fontSize.xl,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: tokens.space.xs,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: tokens.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
    card: {
        marginHorizontal: tokens.space.md,
        padding: tokens.space.md,
        borderRadius: tokens.radius.lg,
        borderWidth: 1,
    },
    aide: {
        borderRadius: tokens.radius.md,
        padding: tokens.space.sm,
        marginBottom: tokens.space.md,
    },
    input: {
        minHeight: 50,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm,
        fontSize: tokens.fontSize.sm,
    },
    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.xs,
        marginTop: tokens.space.sm,
    },
    errorText: {
        flex: 1,
        fontSize: tokens.fontSize.sm,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.space.sm,
        height: 50,
        borderRadius: tokens.radius.md,
        marginTop: tokens.space.md,
    },
    buttonText: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    forget: {
        marginTop: tokens.space.md,
    },
});
