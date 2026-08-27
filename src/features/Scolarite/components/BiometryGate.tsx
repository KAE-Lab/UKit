import React, { useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { capacites, demander } from '../../../shared/biometrie';
import Translator from '../../../shared/i18n/Translator';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ScreenState } from '../../../shared/ui/ScreenState';

/**
 * Porte biometrique : protege son contenu par une authentification locale.
 *
 * **Une seule demande par session d'application**, et le drapeau vit donc **au niveau du module**,
 * pas dans le composant. Un `useRef` survit aux rendus mais pas aux **demontages**, et cette porte se
 * demonte tout le temps : le tableau de bord la retire des qu'un parcours froid prend l'ecran, et la
 * remonte apres. On redemandait donc une empreinte apres chaque actualisation du dossier, a quelqu'un
 * qu'on venait d'identifier — la demande de trop.
 *
 * Un module survit aussi d'un ecran a l'autre, ce qui est le second effet voulu : la fiche du compte
 * et le tableau de bord partagent la meme porte, et franchir l'une ouvre l'autre. Sans ce partage,
 * l'ecran du compte atteignable depuis les Reglages montrait l'INE et l'etat civil **sans rien
 * demander**, ce qui faisait du verrou de l'onglet un theatre.
 *
 * Elle passe par `shared/biometrie`, qui demande **la biometrie d'abord** puis le code. L'appel
 * direct qui vivait ici passait `disableDeviceFallback: false`, ce qui laissait iOS court-circuiter
 * Face ID et presenter le code d'emblee — le defaut que ce module corrige.
 *
 * **Un appareil sans aucun verrou ouvre la porte**, et c'est une decision. Sans code ni biometrie,
 * aucune demande ne peut jamais aboutir : l'ecran d'avant montrait un bouton « Reessayer » qui ne
 * pouvait pas marcher, et l'onglet Scolarite devenait inatteignable pour toujours. Cette porte est un
 * verrou **d'interface** — le trousseau, lui, ne demande pas d'authentification
 * (`SecureStoreService`) — donc bloquer ne protegeait rien que l'appareil ne laisse deja voir.
 */
/**
 * A-t-on deja ete authentifie depuis le lancement ?
 *
 * Au niveau du module, volontairement : voir l'en-tete. Il n'est jamais remis a `false` — une session
 * d'application, une demande.
 */
let dejaAuthentifie = false;

const BiometryGate = ({ children, theme }) => {
    const authPassedRef = useRef(dejaAuthentifie);
    const [authenticated, setAuthenticated] = React.useState(dejaAuthentifie);
    const [failed, setFailed] = React.useState(false);

    const ouvrir = useCallback(() => {
        authPassedRef.current = true;
        dejaAuthentifie = true;
        setAuthenticated(true);
        setFailed(false);
    }, []);

    const authenticate = useCallback(async () => {
        if (authPassedRef.current) return;

        const etat = await capacites();
        if (!etat.verrouille) {
            console.warn('[biometrie] aucun verrou sur cet appareil : la porte s ouvre');
            ouvrir();
            return;
        }

        const resultat = await demander();
        if (resultat.success) ouvrir();
        else setFailed(true);
    }, [ouvrir]);

    useFocusEffect(
        useCallback(() => {
            if (!authPassedRef.current) {
                authenticate();
            }
        }, [authenticate])
    );

    if (authenticated) return children;

    /*
     * La porte prend le vocabulaire des autres etats plein ecran.
     *
     * Elle portait un **cadenas emoji** de 48 points en guise d'icone et un `#fff` en dur sur son
     * bouton : deux regles du depot enfreintes au meme endroit — aucun emoji, aucune couleur en dur —
     * et un rendu qui variait avec la police d'emoji du systeme. L'icone est desormais un glyphe de la
     * meme famille que partout ailleurs, dans le meme disque, et le bouton est celui de tous les
     * etats.
     */
    return (
        <ScreenState theme={theme}>
            <EmptyState
                variant="plain"
                icon="lock-outline"
                title={Translator.get('BIOMETRY_TITLE')}
                message={Translator.get('BIOMETRY_PROMPT')}
                theme={theme}
                action={failed ? { label: Translator.get('BIOMETRY_RETRY'), onPress: authenticate, icon: 'refresh' } : null}
            />
        </ScreenState>
    );
};

export default BiometryGate;
