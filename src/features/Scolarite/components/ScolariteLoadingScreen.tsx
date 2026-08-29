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
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';

import { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { ProgressBar } from '../../../shared/ui/ProgressBar';

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
    { key: '__demarrage', labelKey: 'LOADING_STARTING', plafond: 9, duree: 4000 },
    { key: 'connecting', labelKey: 'LOADING_CONNECTING', plafond: 34, duree: 18000 },
    { key: 'profile', labelKey: 'LOADING_PROFILE', plafond: 46, duree: 3000 },
    { key: 'dossier', labelKey: 'LOADING_DOSSIER', plafond: 97, duree: 24000 },
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

    useEffect(() => {
        const abonnement = valeur.addListener(({ value }) => {
            setEntier((precedent) => {
                const arrondi = Math.round(value);
                return arrondi === precedent ? precedent : arrondi;
            });
        });
        return () => valeur.removeListener(abonnement);
    }, [valeur]);

    useEffect(() => {
        const etape = STEPS[indice];
        // `Easing.out` : rapide au debut, de plus en plus lent en approchant du plafond. C'est ce qui
        // donne l'impression d'une progression qui « travaille » plutot que d'un compte a rebours.
        const animation = Animated.timing(valeur, {
            toValue: etape.plafond,
            duration: etape.duree,
            easing: Easing.out(Easing.quad),
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
                height={6}
            />
            <View style={styles.legende}>
                <Animated.Text
                    style={[styles.etape, { color: theme.fontSecondary, opacity: opacite }]}
                    numberOfLines={1}
                >
                    {Translator.get(STEPS[indice].labelKey)}
                </Animated.Text>
                <Text style={[styles.pourcent, { color: theme.font }]}>{`${entier} %`}</Text>
            </View>
        </View>
    );
}

const ScolariteLoadingScreen = ({ scrapeProgress, terminee = false, theme, color }) => (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.font }]}>
            {Translator.get('SCOLARITY')}
        </Text>
        <BlocProgression
            scrapeProgress={scrapeProgress}
            terminee={terminee}
            theme={theme}
            color={color}
        />
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: tokens.space.xl,
        gap: tokens.space.xl,
    },
    title: {
        fontSize: tokens.fontSize.xxl,
        fontWeight: tokens.fontWeight.semibold,
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
    etape: {
        flex: 1,
        fontSize: tokens.fontSize.md,
    },
    pourcent: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
        // Tabulaire par la largeur : sans elle, le nombre fait bouger le libelle a chaque unite.
        minWidth: 52,
        textAlign: 'right',
    },
});

export default ScolariteLoadingScreen;
