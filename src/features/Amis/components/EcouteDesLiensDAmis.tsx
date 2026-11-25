/**
 * L'ouverture par un lien d'ami (docs/phase-8/8-amis.md) : le schema de l'application, que la page
 * `/ami` du site ouvre, et plus tard le lien universel. Le lien de lancement se lit une fois par
 * session JavaScript — une reinitialisation remonte la navigation, et ne doit pas rouvrir un ami deja
 * vu — ; un lien recu application ouverte s'ouvre toujours.
 *
 * Monte dans le conteneur de navigation (rootContainer.tsx), donc seulement une fois l'accueil passe :
 * un etudiant qui installe l'application depuis le lien retouche le lien apres l'accueil.
 */

import { useEffect } from 'react';
import { Linking } from 'react-native';

import { allerA, navigationRacine } from '../../../shared/retours/navigation';
import { lireLeLien } from '../services/lienAmi';

let lancementLu = false;

/** La navigation se prepare apres le premier rendu : quelques essais, puis on renonce. */
function ouvrirQuandPret(adresse: string, essais = 40): void {
    if (navigationRacine.isReady()) {
        allerA('AjoutAmi', { lien: adresse });
        return;
    }
    if (essais > 0) setTimeout(() => ouvrirQuandPret(adresse, essais - 1), 250);
}

function recevoir(adresse: string | null): void {
    if (adresse === null) return;
    const lecture = lireLeLien(adresse);
    // L'adresse du build de developpement, ou toute autre qui ne nous concerne pas, ne s'ouvre pas.
    if (lecture.ok === false && lecture.raison === 'pas-un-lien') return;
    ouvrirQuandPret(adresse);
}

export function EcouteDesLiensDAmis(): null {
    useEffect(() => {
        if (!lancementLu) {
            lancementLu = true;
            Linking.getInitialURL().then(recevoir).catch((erreur) => console.warn('[amis] lien de lancement illisible', erreur));
        }
        const abonnement = Linking.addEventListener('url', ({ url }) => recevoir(url));
        return () => abonnement.remove();
    }, []);
    return null;
}
