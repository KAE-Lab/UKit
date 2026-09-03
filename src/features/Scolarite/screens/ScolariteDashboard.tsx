/**
 * L'onglet Scolarite.
 *
 * Trois sections, et elles n'ont pas la meme nature — c'est ce qui les empeche de se ressembler :
 * « Ton dossier » est ce que l'application **sait**, « Tes services » ce que l'etudiant peut
 * **ouvrir**, « Tes documents » ce qu'il a **range**. Une grille de tuiles indifferenciees se lit
 * comme un brouillon ; trois sections dont l'intention est nommee se lisent comme une decision
 * (docs/features/scolarite.md).
 *
 * ## L'aiguillage s'est inverse, et c'est le changement structurant
 *
 * Cet ecran rendait un etat **plein ecran** et rien d'autre des que la session n'etait pas nominale.
 * Depuis que les documents existent — locaux, sans compte, sans portail — cacher toute la page
 * derriere un ecran d'erreur rendrait l'onglet mort pour ceux a qui il sert le plus. Les etats sont
 * donc des **encarts en tete de page** (`EncartSession`), et la page se poursuit dessous.
 *
 * Une seule exception, deliberee : le **parcours froid** reste plein ecran, parce qu'il est
 * transitoire et qu'une page qui se remplit sous un indicateur de progression fait sauter le contenu.
 *
 * ## Le verrou biometrique ne garde que ce qui merite d'etre garde
 *
 * Il ne s'arme que lorsqu'un compte est enregistre. Sans compte il n'y a **rien a proteger** dans cet
 * onglet — l'identite n'a pas ete lue — et demander une empreinte pour atteindre ses propres fichiers
 * serait un peage sans serrure derriere. Il reste une porte d'interface : le trousseau, lui, n'exige
 * pas d'authentification (docs/features/scolarite.md).
 */

import React, { useContext, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { PastilleService } from '../../../shared/messages/PastilleService';
import { AppContext } from '../../../shared/services/AppCore';
import { getCodeEtablissementActif } from '../../../shared/etablissements';
import { basculerEtablissement } from '../../../shared/etablissements/bascule';
import { ChoixEtablissement } from '../../../shared/ui/ChoixEtablissement';
import { demandeUneRessaisie, presenterEchec } from '../services/ScolariteMapping';
import { useCredentials } from '../services/CredentialsContext';
import BiometryGate from '../components/BiometryGate';
import ScolariteLoadingScreen from '../components/ScolariteLoadingScreen';
import ScolariteLoginView from '../components/ScolariteLoginView';
import { useEcranDeProgression } from '../hooks/useEcranDeProgression';
import { useSessionDepuisLeFormulaire } from '../hooks/useSessionDepuisLeFormulaire';
import { PageScolarite } from '../components/PageScolarite';
import { CampusNonRelie } from '../components/CampusNonRelie';
import { EnteteScolarite } from '../components/EnteteScolarite';
import type { PointWidget } from '../widgets/definitions';

/**
 * L'onglet sans compte : le grand titre des onglets pose comme Campus et Reglages — pas
 * d'en-tete collant, le bandeau du formulaire passe en `compact` (deux « Scolarite » a l'ecran
 * se seraient repete). Et le titre FOND au defilement, comme celui des Reglages : c'est le seul
 * cas ou il surplombe un contenu defilant, et il restait plante sur le formulaire.
 *
 * Sorti de l'ecran pour le garder sous la limite de lignes, comme `PageScolarite` avant lui.
 */
const OngletDeconnecte = ({ theme, accent, defilement, onDebut }) => {
    /** Le choix d'etablissement, ouvert par « Tu es d'un autre campus ? » sous le formulaire. */
    const [choixCampus, setChoixCampus] = useState(false);

    return (
    <SafeAreaInsetsContext.Consumer>
        {(insets) => (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <Animated.View
                    style={[styles.titreDOnglet, {
                        paddingTop: insets?.top || 0,
                        opacity: defilement.interpolate({
                            inputRange: [0, 50],
                            outputRange: [1, 0],
                            extrapolate: 'clamp',
                        }),
                    }]}
                    pointerEvents="box-none"
                >
                    {/* `box-none` sur la rangee et `none` sur le titre : le formulaire dessous garde
                        ses touchers, seule la pastille d'etat de service prend les siens. */}
                    <View style={styles.rangeeDuTitre} pointerEvents="box-none">
                        <Text style={[styles.titreDOngletTexte, { color: theme.font }]} pointerEvents="none">
                            {Translator.get('SCOLARITY')}
                        </Text>
                        <PastilleService theme={theme} style={styles.rappel} />
                    </View>
                </Animated.View>
                <ScolariteLoginView
                    theme={theme}
                    color={accent}
                    topPadding={insets?.top || 0}
                    compact
                    onDebut={onDebut}
                    onAutreCampus={() => setChoixCampus(true)}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: defilement } } }],
                        { useNativeDriver: true },
                    )}
                />
                {/* La meme bascule que les Reglages, avertissement de purge compris : l'onglet suit
                    ensuite `AppContext.etablissement`, et le contexte de session relit le trousseau
                    de la fac d'arrivee — revenir a Bordeaux retrouve sa session. */}
                <ChoixEtablissement
                    theme={theme}
                    visible={choixCampus}
                    fermer={() => setChoixCampus(false)}
                    codeActif={getCodeEtablissementActif()}
                    onConfirmer={(code) => { void basculerEtablissement(code); }}
                />
            </View>
        )}
    </SafeAreaInsetsContext.Consumer>
    );
};

const ScolariteDashboard = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const accent = theme.accent ?? theme.primary;

    const {
        credentials, credentialsLoaded, coldData, widgets, certificatEnCours, portailDisponible,
        scrapeStatus, scrapeProgress, sessionMode, sessionFailure, retrySession,
    } = useCredentials();

    // Le defilement du formulaire deconnecte, pour fondre le grand titre — le gabarit des
    // Reglages, a l'identique (interpolation 0-50 → 1-0). Les autres branches ne s'en servent
    // pas : le tableau de bord a son en-tete collant, qui vit sa propre vie.
    const defilementDeconnecte = useRef(new Animated.Value(0)).current;

    const renderHeader = (insets) => (
        <EnteteScolarite
            theme={theme}
            teinte={accent}
            insets={insets}
            coldData={coldData}
        />
    );

    // `useEcranDeProgression` et non un test direct : l'ecran doit **survivre** quelques centaines de
    // millisecondes a la fin du run, le temps que la barre rejoigne 100 %. Sans ce delai, elle restait
    // a 80 % et la page se substituait d'un coup.
    const progression = useEcranDeProgression(sessionMode, scrapeStatus);
    // Une session lancee depuis le formulaire de cet onglet lui laisse la page jusqu'a son terme :
    // `credentials` est pose au dixieme step, et sans ce drapeau l'ecran basculait en plein run
    // (voir le hook). Les deux hooks vivent au-dessus du premier retour, comme les regles l'exigent.
    const formulaire = useSessionDepuisLeFormulaire(progression.visible);

    if (!credentialsLoaded) return null;

    /**
     * L'echec qui merite un encart : la session a echoue et a quelque chose a dire. Avec un dossier
     * deja lu, l'encart se pose au-dessus de la page qui reste — une actualisation qui echoue ne doit
     * pas etre muette (6.1-A). Un run annule ne montre rien : l'utilisateur est deja parti.
     */
    const echecBloquant = scrapeStatus === 'error' && sessionFailure !== null && !sessionFailure.silent
        ? presenterEchec(sessionFailure)
        : null;

    const ouvrirRessaisie = () => navigation.navigate('CredentialsSettings', { ressaisie: true });
    const ouvrirFiche = () => navigation.navigate('CredentialsSettings');
    const ouvrirDocuments = () => navigation.navigate('Documents');
    const ouvrirPorte = (point: string) => navigation.navigate('WebBrowser', { entrypoint: point });
    const ouvrirLien = (href: string) => navigation.navigate('WebBrowser', { href });

    /**
     * Ou mene une rangee de widget.
     *
     * Quand elle dit « identifiants incorrects », la toucher doit mener a les **corriger**, pas ouvrir
     * un service auquel on n'a plus acces. C'est l'autre moitie de l'impasse : celle qui se produit
     * quand des donnees froides existent deja, donc que l'encart d'echec ne s'affiche pas. La regle
     * valait pour la messagerie seule ; elle vaut pour les quatre, et pour la meme raison.
     *
     * La messagerie s'ouvre sous `email` : le point de catalogue porte le nom du service, pas celui du
     * widget. Les trois autres coincident (docs/features/scolarite.md).
     */
    const ouvrirWidget = (point: PointWidget) => {
        const echec = widgets.echecs[point] ?? sessionFailure;
        if (demandeUneRessaisie(echec)) return ouvrirRessaisie();
        return ouvrirPorte(point === 'messagerie' ? 'email' : point);
    };

    // Un campus que l'application ne porte pas a sa page — pas le tableau de bord avec un encart de
    // plus (voir CampusNonRelie). Elle passe devant tout : sans portail, il n'y a ni formulaire, ni
    // session, ni grille a montrer.
    if (!portailDisponible) {
        return <CampusNonRelie theme={theme} onDemande={ouvrirLien} />;
    }

    /*
     * L'onglet SANS compte EST le formulaire de connexion : l'etat vide « connecte ton compte »
     * obligeait un tap de plus vers exactement la meme page. Et pas d'en-tete collant ici — le
     * bandeau du formulaire porte deja le titre « Scolarite », pose dans le vide : l'en-tete
     * collant appartient au tableau de bord, qui a un dossier a saluer. Le retour anticipe sur
     * `credentialsLoaded` evite le flash du formulaire pendant la lecture du trousseau au lancement.
     *
     * **Le formulaire passe devant l'ecran de chargement plein**, et l'ordre est le sujet : teste
     * apres lui, l'ecran plein le supplantait des que `credentials` arrivait, a mi-parcours — deux
     * vues pour le meme run. Il tient la page tant que la session partie de lui n'est pas finie.
     */
    if (!credentials || formulaire.enCours) {
        return (
            <OngletDeconnecte
                theme={theme}
                accent={accent}
                defilement={defilementDeconnecte}
                onDebut={formulaire.onDebut}
            />
        );
    }

    // Le parcours froid prend l'ecran **tant qu'il n'y a aucun dossier a montrer** : il est
    // transitoire, et une page qui se remplit sous lui ferait sauter le contenu a chaque etape
    // franchie. Avec un dossier deja lu — « Actualiser mon dossier » —, la page reste et la
    // progression s'y pose en encart (PageScolarite) : revenir sur l'onglet pendant l'actualisation
    // retombait sur l'ecran plein, l'ancienne barre (constat du 2026-09-02, 6.1-A).
    if (progression.visible && coldData === null) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <SafeAreaInsetsContext.Consumer>
                    {(insets) => renderHeader(insets)}
                </SafeAreaInsetsContext.Consumer>
                <ScolariteLoadingScreen
                    scrapeProgress={scrapeProgress}
                    terminee={progression.terminee}
                    theme={theme}
                    color={accent}
                />
            </View>
        );
    }

    const corps = () => (
        <PageScolarite
            certificatEnCours={certificatEnCours}
            theme={theme}
            teinte={accent}
            progression={progression}
            scrapeProgress={scrapeProgress}
            coldData={coldData}
            widgets={widgets}
            credentials={credentials}
            portailDisponible={portailDisponible}
            sessionFailure={sessionFailure}
            echecBloquant={echecBloquant}
            onRetry={retrySession}
            onRessaisir={ouvrirRessaisie}
            onConnecter={ouvrirFiche}
            onDemanderCampus={ouvrirLien}
            onWidget={ouvrirWidget}
            onPorte={ouvrirPorte}
            onDocuments={ouvrirDocuments}
        />
    );

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderHeader(insets)}
                    {credentials
                        ? <BiometryGate theme={theme}>{corps()}</BiometryGate>
                        : corps()}
                </View>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Le gabarit du titre de Campus et des Reglages, a l'identique : meme position, meme corps.
    titreDOnglet: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingBottom: tokens.space.sm,
    },
    rangeeDuTitre: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: tokens.space.md,
    },
    titreDOngletTexte: {
        fontSize: tokens.fontSize.title,
        fontWeight: tokens.fontWeight.bold as '700',
        marginBottom: tokens.space.md,
        paddingHorizontal: tokens.space.md,
    },
    // Pousse a droite, et la meme marge basse que le titre : la pastille s'aligne sur sa ligne.
    rappel: {
        marginLeft: 'auto',
        marginBottom: tokens.space.md,
    },
});

export default ScolariteDashboard;
