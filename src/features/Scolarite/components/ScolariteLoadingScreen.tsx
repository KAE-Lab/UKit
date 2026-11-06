/**
 * L'ecran du parcours froid : une barre, un pourcentage, et **une seule ligne** qui dit ou l'on en
 * est.
 *
 * ## Pourquoi une ligne et non la liste des etapes
 *
 * La liste cochee etait plus informative, et c'est justement ce qui la rendait mal adaptee ici :
 * **on ne peut agir sur aucune de ces etapes.** « Recuperation du dossier etudiant » ne dit rien
 * d'utilisable a quelqu'un qui ne peut qu'attendre ; ce qu'il veut savoir, c'est *combien de temps
 * encore*. Une liste de taches sert quand on peut intervenir, ou quand les etapes veulent dire
 * quelque chose pour celui qui regarde — ce n'est ni l'un ni l'autre.
 *
 * La ligne unique dit la meme chose, sans etaler quatre lignes dont trois sont grisees.
 *
 * ## Pourquoi elle ne saute jamais
 *
 * La version d'avant posait un **plancher** au changement d'etape : la barre bondissait d'un coup,
 * et les etapes quasi instantanees rendaient le saut tres visible. Ici la barre **anime toujours
 * depuis sa position courante** vers le plafond de l'etape — un changement d'etape ne fait donc que
 * changer la cible, jamais la position. Une etape qui passe en une seconde accelere la barre au lieu
 * de la teleporter.
 *
 * Elle est rendue par une `Animated.Value` : elle avance a la frequence de l'ecran, pas a celle des
 * mises a jour d'etat. La version d'avant se rafraichissait quatre fois par seconde, ce qui suffit a
 * se voir.
 *
 * ## Ce que la barre s'autorise, et ce qu'elle s'interdit
 *
 * Elle s'autorise a **lisser** : les durees sont estimees, donc elle avance sans savoir exactement ou
 * elle en est. Elle s'interdit deux choses, et ce sont celles qui feraient d'elle un mensonge — elle
 * ne **recule** jamais, et elle n'atteint jamais le plafond d'une etape qui n'est pas finie. Le
 * pourcentage suit la barre : il ne s'invente pas une precision qu'elle n'a pas.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { ProgressBar } from '../../../shared/ui/ProgressBar';
import { JeuDuRenard, type CommandeDuJeu } from '../../../shared/ui/jeu/JeuDuRenard';
import { Icon } from '../../../shared/ui/Icon';
import { hauteurDeLEnTete } from '../../../shared/ui/EnTeteDOnglet';
import { TAB_BAR_HEIGHT } from '../../../shared/ui/ScreenState';

/**
 * `plafond` : ou la barre tend pendant cette etape, sans jamais l'atteindre.
 * `duree` : en combien de temps elle s'en approche — une estimation, calee sur le portail le plus
 * lent des deux. La sous-estimer ferait stagner la barre ; la surestimer la ferait paraitre en
 * retard. Les paliers ne sont pas equidistants parce que les etapes ne durent pas pareil : la
 * connexion porte la cascade d'authentification, le profil est instantane, le dossier enchaine
 * plusieurs vues.
 *
 * **Une etape a disparu le 2026-08-28**, et la table a ete recalee pour elle : la messagerie ne
 * ferme plus le parcours froid, elle est devenue un widget avec son propre rafraichissement. Le
 * dossier est donc la derniere etape reelle, et son plafond monte de 70 a 97 — le laisser a 70
 * aurait fait sauter la barre d'un quart de sa course a la fermeture, exactement le defaut que le
 * lissage a supprime. Le parcours y gagne une vingtaine de secondes : la page apparait plus tot, et
 * les widgets se remplissent **dedans**.
 */
const STEPS = [
    // Le run n'a pas encore annonce d'etape : `scrapeProgress` vaut `null` pendant la navigation
    // initiale et la cascade SSO, ce qui laissait la ligne **vide** — la barre avancait sous un
    // texte absent. Une phase nommee vaut mieux qu'un blanc.
    // Les durees sont celles mesurees apres 6.1-D (parcours froid de 14 s a Bordeaux, 25 s a l'INP),
    // et non plus celles d'un parcours de 46 s : la connexion annoncait dix-huit secondes pour un
    // plafond de 34 %, et la barre paraissait figee vers 30 % (defauts-fonctionnels.md, 7-J).
    { key: '__demarrage', labelKey: 'LOADING_STARTING', plafond: 8, duree: 2000 },
    { key: 'connecting', labelKey: 'LOADING_CONNECTING', plafond: 40, duree: 7000 },
    { key: 'profile', labelKey: 'LOADING_PROFILE', plafond: 52, duree: 2000 },
    { key: 'dossier', labelKey: 'LOADING_DOSSIER', plafond: 97, duree: 11000 },
    // La fin. Elle n'est jamais annoncee par le run : c'est l'appelant qui la pose, quand la session
    // s'acheve. Sans elle, la barre restait la ou elle en etait et l'ecran cedait la place d'un coup.
    { key: '__fin', labelKey: 'LOADING_FINISHING', plafond: 100, duree: 420 },
] as const;

const INDICE_FIN = STEPS.length - 1;

/**
 * L'etape courante, jamais `-1`.
 *
 * Un `scrapeProgress` inconnu — `null` au demarrage, ou un nom qu'une version publiee du Blueprint
 * emettrait sans que cette version de l'application le connaisse — retombe sur le demarrage plutot
 * que de laisser la ligne vide.
 */
const indiceDeLEtape = (etape: string | null | undefined) => {
    const trouve = STEPS.findIndex((s) => s.key === etape);
    return trouve < 0 ? 0 : trouve;
};

/**
 * La barre, et le nombre qui la suit.
 *
 * Le pourcentage passe par un ecouteur plutot que par le rendu : arrondi a l'entier, il ne provoque
 * au plus que cent mises a jour sur tout le parcours, la ou suivre la valeur brute en rendrait des
 * milliers pour un texte qui ne change pas.
 */
function useProgression(indice: number) {
    const valeur = useRef(new Animated.Value(0)).current;
    const [entier, setEntier] = useState(0);
    // La position courante de la barre, lisible au moment de choisir la prochaine cible.
    const atteint = useRef(0);

    useEffect(() => {
        const abonnement = valeur.addListener(({ value }) => {
            atteint.current = value;
            setEntier((precedent) => {
                const arrondi = Math.round(value);
                return arrondi === precedent ? precedent : arrondi;
            });
        });
        return () => valeur.removeListener(abonnement);
    }, [valeur]);

    useEffect(() => {
        const etape = STEPS[indice];
        // La barre ne recule JAMAIS. Un parcours enchaine plusieurs phases et le statut repasse
        // par un terminal entre deux : la fin l'envoyait a 100, puis la phase suivante la
        // ramenait vers son plafond — un recul de quelques points, visible juste avant que
        // l'ecran avance (constate sur le College ST le 2026-08-31). Une cible plus basse que
        // l'acquis est donc ignoree : le libelle continue de raconter la phase, la barre tient.
        if (etape.plafond <= atteint.current) return;
        // Une approche **asymptotique** (7-J) : rapide au debut, puis de plus en plus lente, sans
        // jamais s'arreter avant la fin reelle de l'etape. `duree` est le temps pour couvrir neuf
        // dixiemes du chemin ; la course entiere en prend le triple. L'ancienne courbe touchait son
        // plafond a `duree` puis s'immobilisait si l'etape durait davantage — c'est cet arret que
        // l'oeil lisait comme un blocage.
        const animation = Animated.timing(valeur, {
            toValue: etape.plafond,
            duration: etape.duree * 3,
            easing: Easing.out(Easing.exp),
            // La largeur d'une vue n'est pas animable par le pilote natif.
            useNativeDriver: false,
        });
        animation.start();
        return () => animation.stop();
    }, [indice, valeur]);

    return { valeur, entier };
}

/**
 * Le libelle de l'etape, en fondu — **sans jamais disparaitre**.
 *
 * Une premiere version repartait de `0` a chaque changement : le texte s'effacait completement puis
 * revenait, ce qui produisait un blanc de plus d'un dixieme de seconde. Sur un parcours ou deux
 * etapes s'enchainent vite, ca se lisait comme un clignotement, pas comme une transition.
 *
 * Il repart donc de `0.35` : assez pour qu'on percoive le changement, jamais assez pour que la ligne
 * paraisse vide.
 */
function useFondu(indice: number) {
    const opacite = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        opacite.setValue(0.35);
        const animation = Animated.timing(opacite, {
            toValue: 1,
            duration: 240,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        });
        animation.start();
        return () => animation.stop();
    }, [indice, opacite]);

    return opacite;
}

/**
 * La progression seule — barre, ligne, pourcentage — **sans l'ecran autour**.
 *
 * Elle est exportee parce qu'elle a deux hotes, et que ce sont deux situations differentes :
 *
 *   - **l'ecran plein** (`ScolariteLoadingScreen`), quand le parcours froid part sans qu'on l'ait
 *     demande depuis un formulaire — au lancement, ou sur « Actualiser mon dossier » ;
 *   - **le formulaire de connexion** (`ScolariteLoginView`), qui la pose a la place de ses champs
 *     pendant que la session qu'il vient de lancer se deroule. Il **ne cede pas la place** : le
 *     bandeau reste, la carte change de contenu. Deux pages a moitie vides qui se remplacent
 *     donnaient l'impression d'une application qui hesite ; une seule page qui se transforme se lit
 *     comme une suite. Et un echec s'affiche la ou la saisie a eu lieu, sans retour en arriere.
 */
export function BlocProgression({ scrapeProgress, terminee = false, theme, color }) {
    const indice = terminee ? INDICE_FIN : indiceDeLEtape(scrapeProgress);
    const { valeur, entier } = useProgression(indice);
    const opacite = useFondu(indice);

    return (
        <View style={styles.bloc}>
            <ProgressBar
                percent={valeur}
                color={color}
                trackColor={theme.greyBackground}
                height={4}
                // Le degrade du logo : une progression neutre, la seule de l'application a le porter.
                degrade={[theme.logo.bleu, theme.logo.indigo]}
            />
            <View style={styles.legende}>
                <Animated.Text
                    style={[styles.etapeDeLaCarte, { color: theme.fontSecondary, opacity: opacite }]}
                    numberOfLines={1}
                >
                    {Translator.get(STEPS[indice].labelKey)}
                </Animated.Text>
                <Text style={[styles.pourcent, tokens.texte.chiffres, { color: theme.font }]}>{`${entier} %`}</Text>
            </View>
        </View>
    );
}

/**
 * L'ecran du parcours froid : le titre, la progression, et le jeu du point dessous (7-J). Quatorze a
 * vingt-six secondes d'attente par nature, sur le seul ecran ou elle est longue : le jeu les occupe, et
 * l'ecran entier s'efface a l'arrivee du dossier. Sous « reduire les animations », le jeu ne s'affiche
 * pas et l'ecran redevient celui d'avant.
 */
/** Les trois etapes que la liste nomme : le demarrage et la fin sont des moments, pas des etapes. */
const ETAPES_NOMMEES = [
    { indice: 1, labelKey: 'ETAPE_CONNEXION' },
    { indice: 2, labelKey: 'ETAPE_PROFIL' },
    { indice: 3, labelKey: 'ETAPE_DOSSIER' },
] as const;

/**
 * La progression de l'ecran plein (deuxieme passe de 7-J) : le pourcentage en grand, l'etape en cours,
 * une barre fine, et les trois etapes cochees a mesure. La carte du formulaire garde `BlocProgression`,
 * plus court ; ici la page n'a que cela a dire, et le chiffre en est le titre.
 */
function ProgressionPleinEcran({ indice, theme, color }) {
    const { valeur, entier } = useProgression(indice);
    const opacite = useFondu(indice);
    return (
        <View style={styles.progression}>
            <Text style={[styles.grandPourcent, tokens.texte.chiffres, { color: theme.font }]}>{`${entier} %`}</Text>
            <Animated.Text style={[styles.etapeCourante, { color: theme.fontSecondary, opacity: opacite }]} numberOfLines={1}>
                {Translator.get(STEPS[indice].labelKey)}
            </Animated.Text>
            <ProgressBar percent={valeur} color={color} trackColor={theme.greyBackground} height={6} degrade={[theme.logo.bleu, theme.logo.indigo]} />
            <View style={styles.etapes}>
                {ETAPES_NOMMEES.map((etape) => {
                    const faite = indice > etape.indice;
                    const enCours = indice === etape.indice;
                    return (
                        <View key={etape.labelKey} style={styles.etape}>
                            <View style={styles.marqueDEtape}>
                                {faite ? <Icon icon={{ name: 'check' }} size={18} color={color} /> : null}
                                {enCours ? <ActivityIndicator size="small" color={theme.fontSecondary} /> : null}
                                {!faite && !enCours ? <Icon icon={{ name: 'minus' }} size={18} color={theme.fontTertiary} /> : null}
                            </View>
                            <Text style={[styles.nomDEtape, { color: faite || enCours ? theme.font : theme.fontTertiary }]}>
                                {Translator.get(etape.labelKey)}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

/**
 * L'ecran plein du parcours froid (deuxieme passe de 7-J).
 *
 * Il etait un titre, une barre et la carte du jeu, centres dans le vide sous le titre flottant de
 * l'onglet : le meme ecran qu'avant le jeu, le jeu en plus (review du 2026-11-05). Il pose desormais
 * la progression comme le sujet de la page, sous l'en-tete fixe de l'onglet, et le jeu en grand,
 * dessous, avec ce qu'il occupe : l'attente. **Un appui n'importe ou fait sauter** : la vue racine ne
 * prend que les touchers qu'aucun enfant n'a pris.
 */
const ScolariteLoadingScreen = ({ scrapeProgress, terminee = false, theme, color }) => {
    const insets = useSafeAreaInsets();
    const jeu = useRef<CommandeDuJeu>(null);
    const indice = terminee ? INDICE_FIN : indiceDeLEtape(scrapeProgress);
    // Le jeu prend la hauteur qui reste sous la progression : un tiers d'ecran vide sous lui se lisait
    // comme une page inachevee. Borne, pour qu'il ne s'etire pas en tour sur une tablette.
    const [hauteurDuJeu, setHauteurDuJeu] = useState<number>(JEU.minimum);
    return (
        <View
            style={[styles.container, {
                backgroundColor: theme.background,
                paddingTop: hauteurDeLEnTete(insets.top) + tokens.space.md,
                paddingBottom: TAB_BAR_HEIGHT + tokens.space.lg,
            }]}
            onStartShouldSetResponder={() => true}
            onResponderGrant={() => jeu.current?.sauter()}
        >
            <ProgressionPleinEcran indice={indice} theme={theme} color={color} />
            <View
                style={styles.zoneDuJeu}
                onLayout={(e) => setHauteurDuJeu(Math.max(JEU.minimum, Math.min(JEU.maximum, Math.round(e.nativeEvent.layout.height - JEU.legende))))}
            >
                <Text style={[styles.legendeDuJeu, { color: theme.fontTertiary }]}>{Translator.get('JEU_ATTENTE')}</Text>
                <JeuDuRenard ref={jeu} theme={theme} hauteur={hauteurDuJeu} />
            </View>
        </View>
    );
};

/** La hauteur du jeu de l'ecran plein, bornee, et ce que la legende prend au-dessus de lui. */
const JEU = { minimum: 180, maximum: 320, legende: 28 } as const;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: tokens.space.md,
        gap: tokens.space.xl,
    },
    bloc: {
        width: '100%',
        gap: tokens.space.md,
    },
    legende: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.md,
    },
    etapeDeLaCarte: {
        flex: 1,
        fontSize: tokens.fontSize.md,
    },
    pourcent: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        minWidth: 52,
        textAlign: 'right',
    },
    progression: {
        gap: tokens.space.sm,
        paddingHorizontal: tokens.space.xs,
    },
    grandPourcent: {
        ...tokens.texte.grandTitre,
    },
    etapeCourante: {
        fontSize: tokens.fontSize.md,
        marginBottom: tokens.space.xs,
    },
    etapes: {
        marginTop: tokens.space.md,
        gap: tokens.space.sm,
    },
    etape: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.md,
    },
    marqueDEtape: {
        width: tokens.space.lg,
        alignItems: 'center',
    },
    nomDEtape: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.medium,
    },
    zoneDuJeu: {
        flex: 1,
        gap: tokens.space.sm,
    },
    legendeDuJeu: {
        fontSize: tokens.fontSize.sm,
        paddingHorizontal: tokens.space.xs,
    },
});

export default ScolariteLoadingScreen;
