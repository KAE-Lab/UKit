import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import moment from 'moment';
import { useRoute, type RouteProp } from '@react-navigation/native';

import { demander } from '../../../shared/biometrie';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import style, { tokens } from '../../../shared/theme/Theme';
import { ActionButton } from '../../../shared/ui/ActionButton';
import { ErrorAlert } from '../../../shared/ui/Alerts';
import { ScreenState } from '../../../shared/ui/ScreenState';
import { SourceFailureNotice } from '../../../shared/ui/SourceFailureNotice';
import { useCredentials } from '../services/CredentialsContext';
import { portailAbsent } from '../services/ScolariteSession';
import ScolariteLoginView from '../components/ScolariteLoginView';
import { BlocProgression } from '../components/ScolariteLoadingScreen';
import BiometryGate from '../components/BiometryGate';
import { useEcranDeProgression } from '../hooks/useEcranDeProgression';
import { ConfirmationScolarite } from '../components/ConfirmationScolarite';

const InfoRow = ({ label, value, theme, copiable = false }) => {
    /*
     * Copier plutot que selectionner a la main : un numero etudiant, un INE et une adresse
     * universitaire se redemandent sans arret — inscription en bibliotheque, feuille d'examen,
     * formulaire administratif — et ce sont precisement les trois chaines qu'on ne retient pas.
     *
     * Le bouton ne s'affiche **que s'il y a quelque chose a copier** : une icone au-dessus d'un tiret
     * proposerait un geste sans effet. Et le retour est un toast plutot qu'un changement d'icone,
     * parce qu'un presse-papier est invisible : sans confirmation, rien ne distingue « copie » de
     * « rien ne s'est passe ».
     */
    const copier = () => {
        void Clipboard.setStringAsync(String(value));
        new ErrorAlert(Translator.get('COPIED_TO_CLIPBOARD'), ErrorAlert.durations.SHORT).show();
    };

    return (
        <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.fontSecondary }]}>
                {label}
            </Text>
            <View style={styles.valueRow}>
                <Text style={[styles.infoValue, { color: theme.font }]} numberOfLines={1}>
                    {value || '—'}
                </Text>
                {copiable && value ? (
                    <TouchableOpacity onPress={copier} hitSlop={12} accessibilityLabel={Translator.get('COPY')}>
                        <MaterialCommunityIcons name="content-copy" size={18} color={theme.fontSecondary} />
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
};

/**
 * Depuis quand le dossier date, dans la langue de l'application.
 *
 * `moment` et non un formatage maison : il porte deja la locale, et `GreetingBlock` montre ce que
 * coute de s'en passer — ses noms de jours et de mois sont ecrits en francais, en dur, dans une
 * application qui parle trois langues (docs/defauts-fonctionnels.md).
 */
const fraicheur = (cold) => {
    if (typeof cold?.luLe !== 'string' || cold.luLe === '') return Translator.get('RECORD_NEVER_READ');
    const lecture = moment(cold.luLe);
    return lecture.isValid() ? lecture.format('LL') : Translator.get('RECORD_NEVER_READ');
};

const SectionCard = ({ title, children, theme }) => (
    <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.fontSecondary }]}>
            {title.toUpperCase()}
        </Text>
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            {children}
        </View>
    </View>
);

/** Les identifiants enregistres, dont le mot de passe que la biometrie seule devoile. */
const IdentifiantsSection = ({ theme, credentials, passwordVisible, onTogglePassword }) => (
    <SectionCard title={Translator.get('CREDENTIALS_SETTINGS')} theme={theme}>
        <InfoRow label={Translator.get('USERNAME')} value={credentials?.username} theme={theme} />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.fontSecondary }]}>
                {Translator.get('PASSWORD')}
            </Text>
            <View style={styles.passwordRow}>
                <Text style={[styles.infoValue, { color: theme.font, flex: 1 }]} numberOfLines={1}>
                    {passwordVisible ? credentials?.password : '••••••••'}
                </Text>
                <TouchableOpacity onPress={onTogglePassword} hitSlop={8}>
                    <MaterialCommunityIcons
                        name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.fontSecondary}
                    />
                </TouchableOpacity>
            </View>
        </View>
    </SectionCard>
);

/**
 * L'etablissement ne publie aucun portail : il n'y a pas de compte a regler ici.
 *
 * L'ecran calait sa compensation d'en-tete a `+ 65` la ou tout le reste emploie `+ 70`, **en haut
 * seul** : le bloc se posait donc cinq points plus haut que partout ailleurs, et decale vers le bas.
 * `ScreenState` porte la seule valeur du depot (shared/ui/ScreenState).
 */
const PortailAbsent = ({ theme }) => (
    <ScreenState theme={theme}>
        <SourceFailureNotice failure={portailAbsent()} theme={theme} variant="plain" />
    </ScreenState>
);

/**
 * Aucun compte enregistre : on propose de se connecter, pas une fiche vide.
 *
 * C'est le meme formulaire que partout ailleurs, et il referme l'ecran une fois la session partie —
 * on revient donc la d'ou l'on venait, le plus souvent les Reglages.
 */
const CompteADemander = ({ theme, onDebut, onSuccess }) => (
    <SafeAreaInsetsContext.Consumer>
        {(insets) => (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
                <ScolariteLoginView
                    theme={theme}
                    color={theme.accent ?? theme.primary}
                    topPadding={(insets?.top || 0) + 65}
                    onDebut={onDebut}
                    onSuccess={onSuccess}
                    compact
                />
            </View>
        )}
    </SafeAreaInsetsContext.Consumer>
);

/**
 * Les reglages du compte universitaire : ce qui est enregistre, et la deconnexion.
 *
 * **Sans compte, il propose de se connecter** au lieu d'afficher sa fiche vide. L'ecran a toujours
 * suppose qu'on y arrivait connecte — c'etait vrai tant que son seul chemin etait le bouton d'action
 * de l'onglet Scolarite, qui n'existe qu'apres une session. Le jalon 6-J y ajoute une entree depuis
 * les Reglages, atteignable a tout moment : la fiche s'affichait alors avec six tirets et un bouton
 * « Se deconnecter » qui n'avait rien a deconnecter. Mesure sur appareil.
 *
 * Voir docs/features/scolarite.md.
 */

/**
 * Les deux fiches que l'ecran du compte porte : le profil, et le dossier.
 *
 * Sorties de l'ecran pour le garder sous la limite de lignes — meme decoupage que `ActionsDuCompte`
 * et `ConfirmationsDuCompte`. L'ecran garde ce qui lui revient, l'aiguillage ; celles-ci ne font que
 * presenter.
 */
const FichesDuDossier = ({ theme, credentials, coldData }) => (
    <>
                            {/*
          * Section Profil — **sans `username`**. Il y figurait en double, ici et
          * dans les identifiants juste en dessous : la meme valeur sous le meme
          * libelle, a deux endroits d'un ecran qui tient sur une hauteur. Celui
          * des identifiants est le bon, parce qu'il y voisine le mot de passe
          * qu'il sert a ouvrir.
          */}
        <SectionCard title={Translator.get('PROFILE')} theme={theme}>
            {/* La ligne disparait faute de donnee, au lieu d'afficher un libelle vide. */}
            {coldData?.firstName ? (
                <>
                    <InfoRow label={Translator.get('FIRST_NAME')} value={coldData.firstName} theme={theme} />
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                </>
            ) : null}
            {coldData?.formation ? (
                <>
                    <InfoRow label={Translator.get('PROGRAMME')} value={coldData.formation} theme={theme} />
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                </>
            ) : null}
            <InfoRow label={Translator.get('DATE_OF_BIRTH')} value={coldData?.dateOfBirth} theme={theme} />
        </SectionCard>

        {/*
          * Section Dossier — les **trois champs copiables** de l'application, et
          * ce n'est pas un hasard : numero etudiant, INE et adresse universitaire
          * sont exactement les chaines qu'on redemande a un etudiant et qu'il ne
          * retient pas.
          */}
        <SectionCard title={Translator.get('DOSSIER')} theme={theme}>
            <InfoRow label={Translator.get('STUDENT_NUMBER')} value={coldData?.studentNumber} theme={theme} copiable />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <InfoRow label={Translator.get('STUDENT_INE')} value={coldData?.ine} theme={theme} copiable />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <InfoRow label={Translator.get('STUDENT_EMAIL')} value={coldData?.emailAddress} theme={theme} copiable />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            {/*
              * La fraicheur a quitte le tableau de bord pour venir ici, a cote du
              * bouton qui la corrige : elle y est **actionnable** au lieu d'etre
              * informative, et le tableau de bord y gagne d'etre dedie aux
              * services.
              */}
            <InfoRow label={Translator.get('RECORD_READ_LABEL')} value={fraicheur(coldData)} theme={theme} />
        </SectionCard>
    </>
);

/**
 * Les trois gestes qu'on peut poser sur son compte, du plus doux au plus destructif.
 *
 * Sortis de l'ecran pour le garder sous la limite de lignes — meme decoupage que
 * `CampusLayoutComponents` pour `CampusListLayout`. L'ordre porte du sens : actualiser ne perd rien,
 * ressaisir ne perd que le mot de passe garde, se deconnecter efface tout.
 */
const ActionsDuCompte = ({ theme, onRafraichir, onRessaisir, onDeconnecter, progression, scrapeProgress }) => (
    progression.visible ? (
        /*
         * **La fiche ne bouge pas ; seuls ses boutons cedent la place.**
         *
         * « Actualiser mon dossier » prenait l'ecran entier. On perdait de vue ce qu'on etait en
         * train d'actualiser, et le retour de la fiche se lisait comme un changement de page. Ici
         * l'etat civil reste sous les yeux et la progression occupe l'espace des trois actions —
         * qui n'ont de toute facon aucun sens pendant un run.
         *
         * Meme mecanique que le formulaire de connexion, qui remplace ses champs plutot que de ceder
         * la page : *une page se transforme, elle ne se remplace pas*.
         */
        <View style={[styles.card, styles.carteProgression, {
            backgroundColor: theme.cardBackground, borderColor: theme.border,
        }]}>
            <BlocProgression
                scrapeProgress={scrapeProgress}
                terminee={progression.terminee}
                theme={theme}
                color={theme.accent ?? theme.primary}
            />
        </View>
    ) : (
    <>
        {/*
          * Redemander un parcours froid, sans se deconnecter : le mode se deduisait de la presence des
          * donnees froides, sans aucun moyen de forcer (jalon 6-K, docs/defauts-fonctionnels.md).
          */}
        <ActionButton
            theme={theme}
            variant="tonal"
            icon={{ name: 'refresh' }}
            label={Translator.get('REFRESH_RECORD')}
            onPress={onRafraichir}
            style={{ marginTop: tokens.space.sm }}
        />

        {/*
          * Ressaisir sans deconnecter : un mot de passe change a l'universite n'invalide pas le compte,
          * et passer par la deconnexion effacerait aussi l'identite deja lue.
          */}
        <ActionButton
            theme={theme}
            variant="tonal"
            icon={{ name: 'account-key-outline' }}
            label={Translator.get('REENTER_CREDENTIALS')}
            onPress={onRessaisir}
            style={{ marginTop: tokens.space.sm }}
        />

        {/* Destructif : la deconnexion efface le trousseau **et** l'identite deja lue. */}
        <ActionButton
            theme={theme}
            variant="destructive"
            icon={{ name: 'logout' }}
            label={Translator.get('LOGOUT')}
            onPress={onDeconnecter}
            style={{ marginTop: tokens.space.sm }}
        />
    </>
    )
);

/**
 * Les deux confirmations de l'ecran, groupees pour le garder sous la limite de lignes — meme decoupage
 * que `ActionsDuCompte` juste au-dessus.
 */
const ConfirmationsDuCompte = ({ theme, refresh, logout }) => (
    <>
        <ConfirmationScolarite
            theme={theme}
            visible={refresh.visible}
            titre={Translator.get('REFRESH_RECORD')}
            description={Translator.get('REFRESH_RECORD_DESC')}
            confirmer={Translator.get('CONFIRM')}
            onClose={refresh.fermer}
            onConfirm={refresh.confirmer}
        />

        <ConfirmationScolarite
            theme={theme}
            visible={logout.visible}
            titre={Translator.get('LOGOUT')}
            description={Translator.get('CONFIRM_LOGOUT')}
            confirmer={Translator.get('CONFIRM')}
            onClose={logout.fermer}
            onConfirm={logout.confirmer}
            destructif
        />
    </>
);

const CredentialsSettingsScreen = () => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const route = useRoute<RouteProp<{ p: { ressaisie?: boolean } }, 'p'>>();

    const {
        credentials, coldData, logout, rafraichirDossier, portailDisponible,
        scrapeStatus, scrapeProgress, sessionMode,
    } = useCredentials();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showRefreshModal, setShowRefreshModal] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    /**
     * Ressaisir sans se deconnecter.
     *
     * Un mot de passe change a l'universite n'invalide pas le compte, seulement le mot de passe garde.
     * Passer par la deconnexion pour le corriger effacait aussi l'identite deja lue et obligeait a
     * retaper l'identifiant. `validateAndSave` rejoue de toute facon un parcours complet : il suffit
     * de rendre le formulaire atteignable (jalon 6-K, docs/defauts-fonctionnels.md).
     */
    const [ressaisie, setRessaisie] = useState(route.params?.ressaisie === true);
    /** Une session lancee **depuis le formulaire** : elle lui laisse la page jusqu'a son terme. */
    const [connexionEnCours, setConnexionEnCours] = useState(false);

    /*
     * **La progression s'affiche ici, et non la ou elle se joue.**
     *
     * « Actualiser mon dossier » rejouait un parcours froid puis fermait l'ecran. Le run se
     * deroulait bien — il n'est annule qu'au passage en arriere-plan, jamais par un changement
     * d'ecran — mais **rien ne le montrait** en dehors de l'onglet Scolarite, le seul endroit qui
     * rendait l'ecran de progression. Depuis les Reglages, on revenait donc aux Reglages et le geste
     * paraissait sans effet, jusqu'a ce qu'on ouvre l'onglet et qu'on decouvre une progression qui
     * semblait commencer a cet instant.
     *
     * L'autre remede envisage — renvoyer l'utilisateur vers l'onglet Scolarite — corrige le symptome
     * en **deplacant la personne** : on touche une ligne dans les Reglages et on se retrouve dans un
     * autre onglet. Montrer la progression sur l'ecran ou le geste a ete fait ne surprend personne,
     * et vaut identiquement depuis les deux entrees.
     */
    const progression = useEcranDeProgression(sessionMode, scrapeStatus);

    // Le drapeau retombe quand la session s'acheve — y compris sur un echec, ou le formulaire doit
    // reprendre la main pour afficher son message.
    useEffect(() => {
        if (!progression.visible) setConnexionEnCours(false);
    }, [progression.visible]);

    if (!portailDisponible) return <PortailAbsent theme={theme} />;

    /*
     * **Le formulaire passe devant la progression**, et l'ordre est le sujet.
     *
     * Il portait sa propre progression depuis peu : le bandeau reste, la carte passe des champs a la
     * barre. Mais l'ecran de progression plein etait teste **avant** lui, si bien qu'il le supplantait
     * des que la session partait — on retombait sur deux pages qui se remplacent, exactement ce qu'on
     * venait de supprimer.
     *
     * Ce qui reste a l'ecran plein : le parcours froid qu'on n'a **pas** demande depuis un formulaire
     * — au lancement, ou sur « Actualiser mon dossier ». Il n'y a alors aucune page a garder.
     */
    /*
     * **Le formulaire garde la page tant que SA session tourne.**
     *
     * `LOGIN_SUCCESS` est emis au dixieme step sur vingt : les identifiants sont poses des que le CAS
     * accepte, donc `credentials` cesse d'etre nul **en plein run**. Sans le drapeau ci-dessous, la
     * condition retombait a faux a mi-parcours et l'ecran basculait d'un coup sur autre chose — ce
     * qu'on voyait comme « la barre est repassee sur l'ancienne version de la page ».
     */
    if (!credentials || ressaisie || connexionEnCours) {
        return (
            <CompteADemander
                theme={theme}
                onDebut={() => setConnexionEnCours(true)}
                onSuccess={() => setRessaisie(false)}
            />
        );
    }

    const handleShowPassword = async () => {
        if (passwordVisible) {
            setPasswordVisible(false);
            return;
        }
        // Biometrie d'abord, code ensuite : `shared/biometrie` porte la sequence, et ne leve jamais.
        const resultat = await demander();
        if (resultat.success) setPasswordVisible(true);
    };

    /*
     * **On ne referme plus l'ecran, et c'est la correction de deux ejections a la fois.**
     *
     * Il se refermait apres un `await`, ce qui supposait que la personne y etait encore. Elle ne
     * l'etait plus, pour deux raisons independantes :
     *
     *   - **a la deconnexion**, `logout` attend la fermeture de la session distante, soit quelques
     *     secondes. L'interface, elle, s'est deja mise a jour bien avant — `oublier()` precede cet
     *     appel — donc le formulaire de connexion est deja affiche, et l'ecran se refermait pendant
     *     qu'on retapait ses identifiants ;
     *   - **a la connexion**, `LOGIN_SUCCESS` est emis au **dixieme step sur vingt** : le CAS a
     *     accepte, mais le dossier, la formation et l'annuaire restent a lire. La promesse se
     *     resolvait donc a mi-parcours, et l'ecran se refermait avec dix secondes de run devant lui.
     *
     * Rester est aussi le bon comportement en soi : l'aiguillage de cet ecran montre deja la suite —
     * la progression, puis la fiche, ou le formulaire apres une deconnexion. Il n'y a rien a fuir.
     */
    const confirmLogout = async () => {
        setShowLogoutModal(false);
        await logout();
    };

    const confirmRefresh = () => {
        setShowRefreshModal(false);
        // On **reste** : l'ecran bascule sur la progression ci-dessus, puis revient a la fiche une
        // fois le dossier relu. Fermer l'ecran rendait le geste invisible depuis les Reglages.
        rafraichirDossier();
    };

    /*
     * **La fiche partage la porte du tableau de bord**, et c'est une correction de coherence.
     *
     * Cet ecran montre l'INE, la date de naissance, l'etat civil complet et les identifiants — plus
     * que l'onglet, qui lui est garde. Atteignable depuis les Reglages, il s'ouvrait **sans rien
     * demander** : le verrou de l'onglet devenait un theatre qu'il suffisait de contourner par un
     * autre chemin.
     *
     * La porte etant desormais partagee au niveau du module, franchir l'une ouvre l'autre : on ne
     * paie pas une seconde demande, on ferme un contournement.
     *
     * Ce qui n'est **pas** garde, et volontairement : le formulaire de connexion — il n'y a rien a
     * proteger avant d'avoir lu quoi que ce soit — et la progression, qui est transitoire.
     */
    return (
        <BiometryGate theme={theme}>
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingTop: (insets?.top || 0) + 65, paddingBottom: tokens.space.xxl + 80 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={{ marginHorizontal: tokens.space.md, marginTop: tokens.space.sm, gap: tokens.space.sm }}>

                            <FichesDuDossier theme={theme} credentials={credentials} coldData={coldData} />

                            <IdentifiantsSection
                                theme={theme}
                                credentials={credentials}
                                passwordVisible={passwordVisible}
                                onTogglePassword={handleShowPassword}
                            />

                            <ActionsDuCompte
                                theme={theme}
                                progression={progression}
                                scrapeProgress={scrapeProgress}
                                onRafraichir={() => setShowRefreshModal(true)}
                                onRessaisir={() => setRessaisie(true)}
                                onDeconnecter={() => setShowLogoutModal(true)}
                            />

                        </View>
                    </ScrollView>

                    <ConfirmationsDuCompte
                        theme={theme}
                        refresh={{ visible: showRefreshModal, fermer: () => setShowRefreshModal(false), confirmer: confirmRefresh }}
                        logout={{ visible: showLogoutModal, fermer: () => setShowLogoutModal(false), confirmer: confirmLogout }}
                    />
                </SafeAreaView>
            )}
        </SafeAreaInsetsContext.Consumer>
        </BiometryGate>
    );
};

const styles = StyleSheet.create({
    section: {
        gap: tokens.space.xs,
    },
    sectionTitle: {
        fontSize: tokens.fontSize.xs,
        letterSpacing: 0.8,
        marginLeft: tokens.space.sm,
        marginBottom: tokens.space.xxs,
    },
    card: {
        borderRadius: tokens.radius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    /*
     * La progression prend la **meme surface** que les fiches au-dessus d'elle : sans encadre ni
     * rembourrage, elle s'etirait d'un bord a l'autre pendant que tout le reste de l'ecran respirait,
     * et la page paraissait se casser en deux. C'est le pendant de la version du formulaire, qui vit
     * deja dans sa carte.
     */
    carteProgression: {
        marginTop: tokens.space.md,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.lg,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm + 2,
        gap: tokens.space.md,
    },
    infoLabel: {
        fontSize: tokens.fontSize.sm,
        flexShrink: 0,
    },
    infoValue: {
        fontSize: tokens.fontSize.sm,
        textAlign: 'right',
        flex: 1,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: tokens.space.sm,
        justifyContent: 'flex-end',
    },
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: tokens.space.sm,
        justifyContent: 'flex-end',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: tokens.space.md,
    },
});

export default CredentialsSettingsScreen;
