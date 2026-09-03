/**
 * L'hote des messages de service : rejoue la regle de presentation et rend ce qu'elle repond.
 *
 * Monte par `rootContainer` et non par un ecran, pour la meme raison que la modale des
 * propositions : un message attend un moment qui n'appartient a aucun ecran — le retour au premier
 * plan, une lecture qui aboutit — et doit pouvoir apparaitre au-dessus de n'importe lequel. Il est
 * **inactif pendant le parcours d'accueil** : rien ne doit interferer avec lui, et l'etablissement
 * n'y est pas encore choisi.
 *
 * Il ne decide rien : `choisirPresentation` decide, et il la rejoue a chaque changement — une lecture
 * (`onMessages`), une fermeture (qui marque « vu »), un changement d'etablissement (le contexte), la
 * simulation de date (le conteneur racine repeint tout). Il rend la **modale** et le **bandeau**
 * d'information ; la pastille d'etat de service, elle, est posee par chaque en-tete d'onglet
 * (`PastilleService`), et c'est elle qui rappelle un incident deja lu. Voir docs/pilotage.md.
 */

import React, { useCallback, useContext, useEffect, useState } from 'react';

import { contexteDeCiblage } from '../ciblage';
import Translator from '../i18n/Translator';
import { AppContext } from '../services/AppCore';
import { maintenant } from '../services/Temps';
import style from '../theme/Theme';
import { Bandeau } from '../ui/Bandeau';
import { Dialogue } from '../ui/Dialogue';
import { fermerMessage, messagesConnus, onMessages } from './index';
import { choisirPresentation } from './presentation';
import type { MessageDeService } from './projection';
import { vusConnus } from './vus';

export interface MessagesDeServiceHoteProps {
    /** Faux pendant le parcours d'accueil : l'hote ne rend rien. */
    readonly actif: boolean;
}

export function MessagesDeServiceHote({ actif }: MessagesDeServiceHoteProps) {
    const { themeName, etablissement } = useContext(AppContext);
    const theme = style.Theme[themeName ?? 'light'];
    const [, setRevision] = useState(0);
    /** La feuille ouverte depuis un bandeau, par le toucher. Distincte de la modale que la regle impose. */
    const [detail, setDetail] = useState<MessageDeService | null>(null);

    const rejouer = useCallback(() => setRevision((revision) => revision + 1), []);

    useEffect(() => onMessages(rejouer), [rejouer]);

    const fermer = useCallback((message: MessageDeService) => {
        setDetail(null);
        void fermerMessage(message.cle);
    }, []);

    if (!actif) return null;

    // Le code d'etablissement du contexte est celui du catalogue ; celui du contexte React ne sert
    // qu'a provoquer ce rendu quand il change, et c'est le meme.
    const contexte = { ...contexteDeCiblage(), etablissement: etablissement ?? contexteDeCiblage().etablissement };
    const { modale, bandeau } = choisirPresentation(messagesConnus(), vusConnus(), contexte, maintenant());
    const feuille = modale ?? detail;

    return (
        <>
            {bandeau !== null ? (
                <Bandeau
                    key={bandeau.cle}
                    theme={theme}
                    titre={bandeau.titre}
                    onPress={() => setDetail(bandeau)}
                    onFermer={() => fermer(bandeau)}
                />
            ) : null}
            {feuille !== null ? (
                <Dialogue
                    theme={theme}
                    visible={true}
                    fermer={() => fermer(feuille)}
                    titre={feuille.titre}
                    corps={feuille.corps ?? ''}
                    libelleFermer={Translator.get('MESSAGE_COMPRIS')}
                />
            ) : null}
        </>
    );
}
