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
import { useSessionDemandeeIci } from '../hooks/useSessionDemandeeIci';
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
/**
 * Le titre de l'onglet **sans bandeau** : le gabarit de Campus et des Reglages, a l'identique.
 *
 * Il sert partout ou la page n'a **pas de dossier a saluer** — le formulaire de connexion, le
 * parcours froid en cours, l'echec qui propose de reessayer. Le bandeau collant
 * ([`EnteteScolarite`](../components/EnteteScolarite.tsx)) appartient au tableau de bord garni, et la
 * raison tient en une phrase : **la salutation EST le titre de cette page-la**. Sans dossier, il n'y
 * a rien a saluer, et un bandeau se refermait sur un titre pose dans le vide — signale sur appareil
 * le 2026-09-04, sur l'ecran de reessai.
 *
 * `box-none` sur la rangee et `none` sur le titre : ce qu'il y a dessous garde ses touchers, seule la
 * pastille d'etat de service prend les siens.
 */
const TitreFlottant = ({ theme, defilement, insets }) => (
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
        <View style={styles.rangeeDuTitre} pointerEvents="box-none">
            <Text style={[styles.titreDOngletTexte, { color: theme.font }]} pointerEvents="none">
                {Translator.get('SCOLARITY')}
            </Text>
            <PastilleService theme={theme} style={styles.rappel} />
        </View>
    </Animated.View>
);

/**
 * L'en-tete de l'onglet : **un bandeau seulement quand il y a un dossier a saluer**.
 *
 * `EnteteScolarite` porte un filet et une ombre, et il se justifie parce que la **salutation est le
 * titre** de la page garnie. Sans dossier, il n'y a rien a saluer : le bandeau se refermait alors sur
 * un titre pose dans le vide, avec trois objets sur une meme ligne — le titre, la pastille d'etat et
 * le filigrane de l'etablissement — ce qui se lisait comme une collision (signale sur appareil le
 * 2026-09-04, sur l'ecran de reessai).
 *
 * Le titre **flotte** donc tant qu'il n'y a pas de dossier, exactement comme sur le formulaire de
 * connexion, sur Campus et sur les Reglages ; il devient un bandeau au moment ou la lecture aboutit,
 * c'est-a-dire au moment ou il a quelque chose a dire.
 */
const EnTeteDeLOnglet = ({ theme, accent, coldData, defilement, insets }) => (
    coldData === null
        ? <TitreFlottant theme={theme} defilement={defilement} insets={insets} />
        : <EnteteScolarite theme={theme} teinte={accent} insets={insets} coldData={coldData} />
);

/**
 * Le parcours froid **qui n'a rien a preserver** : au lancement, ou apres une annulation.
 *
 * Il prend l'ecran parce qu'il est transitoire, et qu'une page qui se remplirait sous lui ferait
 * sauter le contenu a chaque etape franchie. Des qu'il y a quelque chose a garder — un dossier deja
 * lu, ou un geste fait sur la page — la progression se pose en encart et la page tient
 * (`PageScolarite`).
 */
/**
 * Ou mene chaque geste de l'onglet. Regroupees parce qu'elles n'ont rien a decider : ce sont cinq
 * destinations, et les laisser dans le corps de l'ecran l'allongeait sans rien lui apprendre.
 */
function destinations(navigation) {
    return {
        ouvrirRessaisie: () => navigation.navigate('CredentialsSettings', { ressaisie: true }),
        ouvrirFiche: () => navigation.navigate('CredentialsSettings'),
        ouvrirDocuments: () => navigation.navigate('Documents'),
        ouvrirPorte: (point: string) => navigation.navigate('WebBrowser', { entrypoint: point }),
        ouvrirLien: (href: string) => navigation.navigate('WebBrowser', { href }),
    };
}

const EcranDeParcoursFroid = ({ theme, accent, renderHeader, scrapeProgress, terminee }) => (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaInsetsContext.Consumer>
            {(insets) => renderHeader(insets)}
        </SafeAreaInsetsContext.Consumer>
        <ScolariteLoadingScreen
            scrapeProgress={scrapeProgress}
            terminee={terminee}
            theme={theme}
            color={accent}
        />
    </View>
);

const OngletDeconnecte = ({ theme, accent, defilement, onDebut }) => {
    /** Le choix d'etablissement, ouvert par « Tu es d'un autre campus ? » sous le formulaire. */
    const [choixCampus, setChoixCampus] = useState(false);

    return (
    <SafeAreaInsetsContext.Consumer>
        {(insets) => (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <TitreFlottant theme={theme} defilement={defilement} insets={insets} />
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
    /** Le meme, pour la page sans dossier : son titre flotte aussi, donc il s'efface au defilement. */
    const defilementSansDossier = useRef(new Animated.Value(0)).current;

    /** Voir `EnTeteDeLOnglet` : sans dossier, le titre flotte et la page lui laisse la place. */
    const titreFlotte = coldData === null;
    const renderHeader = (insets) => (
        <EnTeteDeLOnglet
            theme={theme} accent={accent} coldData={coldData}
            defilement={defilementSansDossier} insets={insets}
        />
    );

    // `useEcranDeProgression` et non un test direct : l'ecran doit **survivre** quelques centaines de
    // millisecondes a la fin du run, le temps que la barre rejoigne 100 %. Sans ce delai, elle restait
    // a 80 % et la page se substituait d'un coup.
    const progression = useEcranDeProgression(sessionMode, scrapeStatus);
    // Une session lancee par un geste fait **ici** laisse la page a ce geste jusqu'a son terme :
    // `credentials` est pose au dixieme step, et sans ce drapeau l'ecran basculait en plein run
    // (voir le hook). Les deux hooks vivent au-dessus du premier retour, comme les regles l'exigent.
    const geste = useSessionDemandeeIci(progression.visible);

    if (!credentialsLoaded) return null;

    /**
     * L'echec qui merite un encart : la session a echoue et a quelque chose a dire. Avec un dossier
     * deja lu, l'encart se pose au-dessus de la page qui reste — une actualisation qui echoue ne doit
     * pas etre muette (6.1-A). Un run annule ne montre rien : l'utilisateur est deja parti.
     */
    const echecBloquant = scrapeStatus === 'error' && sessionFailure !== null && !sessionFailure.silent
        ? presenterEchec(sessionFailure)
        : null;

    /**
     * « Reessayer », depuis l'encart d'echec de la page.
     *
     * Le geste s'annonce **ici**, dans le `onPress`, et non dans `retrySession` : un parcours froid
     * repart aussi tout seul au retour au premier plan apres une annulation
     * (`useCycleDeVieSession`), et cette reprise-la n'est pas un geste — elle doit garder l'ecran
     * plein, qui est le bon rendu quand il n'y a rien a preserver.
     */
    const reessayerDepuisLaPage = () => {
        geste.depuisLaPage();
        retrySession();
    };

    const { ouvrirRessaisie, ouvrirFiche, ouvrirDocuments, ouvrirPorte, ouvrirLien } = destinations(navigation);

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
    if (!credentials || geste.origine === 'formulaire') {
        return (
            <OngletDeconnecte
                theme={theme}
                accent={accent}
                defilement={defilementDeconnecte}
                onDebut={geste.depuisLeFormulaire}
            />
        );
    }

    /*
     * Le parcours froid prend l'ecran **tant qu'il n'y a aucun dossier a montrer** : il est
     * transitoire, et une page qui se remplit sous lui ferait sauter le contenu a chaque etape
     * franchie. Avec un dossier deja lu — « Actualiser mon dossier » —, la page reste et la
     * progression s'y pose en encart (PageScolarite) : revenir sur l'onglet pendant l'actualisation
     * retombait sur l'ecran plein, l'ancienne barre (constat du 2026-09-02, 6.1-A).
     *
     * **Sauf si le geste vient de cette page**, correctif du 2026-09-04 : un dossier qui echoue apres
     * l'ecriture des identifiants laisse la page sur son encart d'echec, sans `coldData` ; toucher
     * « Reessayer » **dans l'encart** faisait donc reprendre l'ecran plein, et la page changeait sous
     * le doigt de quelqu'un en train de reparer. La page tient, la barre remplace l'encart. Il reste
     * l'ecran plein pour ce que personne n'a demande **ici** : le lancement, et la reprise apres une
     * annulation.
     */
    if (progression.visible && coldData === null && geste.origine !== 'page') {
        return (
            <EcranDeParcoursFroid
                theme={theme}
                accent={accent}
                renderHeader={renderHeader}
                scrapeProgress={scrapeProgress}
                terminee={progression.terminee}
            />
        );
    }

    const corps = (insets) => (
        <PageScolarite
            {...(titreFlotte ? {
                // Le gabarit de Campus et des Reglages : le titre flotte au-dessus, la page se pose
                // dessous et lui transmet son defilement pour qu'il s'efface.
                paddingHaut: (insets?.top || 0) + HAUTEUR_TITRE_FLOTTANT,
                onScroll: Animated.event(
                    [{ nativeEvent: { contentOffset: { y: defilementSansDossier } } }],
                    { useNativeDriver: true },
                ),
            } : {})}
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
            onRetry={reessayerDepuisLaPage}
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
                        ? <BiometryGate theme={theme}>{corps(insets)}</BiometryGate>
                        : corps(insets)}
                </View>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};

/** Ce qu'un grand titre flottant occupe, hors encoche. La valeur de Campus et des Reglages. */
const HAUTEUR_TITRE_FLOTTANT = 60;

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
