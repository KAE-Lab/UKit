/**
 * L'etat du Planning quand l'emploi du temps attend un lien d'abonnement : a coller, ou a lire sur le
 * compte.
 *
 * Il n'y avait qu'une reponse jusqu'au lot 3 — « colle ton lien » — et elle reste celle de tout campus
 * dont le catalogue ne sait pas lire le lien. Chez l'IUT de Bordeaux, il le sait
 * (`edt.abonnement.blueprint_lien`), et l'invitation a coller serait exactement le geste que le lot
 * supprime. Trois etats donc, et c'est le **compte** qui tranche entre eux :
 *
 *   - **aucun compte** : on invite a se connecter. La lecture suit la connexion (ScolariteSession) ;
 *   - **une session en cours** : la lecture est peut-etre en train de se faire — au lancement, la
 *     session chaude la retente si elle manque. Un chargement, et non une invitation qu'on retirerait
 *     trois secondes plus tard ;
 *   - **connecte, et pourtant rien** : la lecture a echoue (un portail en panne ce soir-la). Le collage
 *     est alors le bon repli, et la lecture se retentera seule au lancement suivant.
 *
 * Un composant fonction, et pas une branche de `ScheduleList` : l'etat du compte vit dans un contexte
 * React, qu'une classe ne lit pas sans tout reecrire. C'est aussi ce qui fait de ce fichier la seule
 * dependance du Planning vers la Scolarite (docs/architecture.md, « Dependances entre features »).
 */

import React from 'react';

import Translator from '../../../shared/i18n/Translator';
import { lienEdtAttendu, lienEdtParLeCompte, lienParLeCompte } from '../../../shared/etablissements';
import type { AppThemeType } from '../../../shared/theme/Theme';
import { SourceFailureNotice } from '../../../shared/ui/SourceFailureNotice';
import { useCredentials } from '../../Scolarite/services/CredentialsContext';
import { ChargementPlanning } from './ScheduleListEtats';

interface LienAttenduProps {
    readonly theme: AppThemeType;
    /** Ouvre l'ecran de saisie du lien. */
    readonly onColler: () => void;
    /** Mene a la connexion du compte universitaire. */
    readonly onConnecter: () => void;
}

export function LienAttendu({ theme, onColler, onConnecter }: LienAttenduProps) {
    const { credentials, scrapeStatus } = useCredentials();

    if (lienParLeCompte()) {
        if (credentials === null) {
            return (
                <SourceFailureNotice
                    variant="plain"
                    failure={lienEdtParLeCompte()}
                    theme={theme}
                    action={{ label: Translator.get('CONNECT_ACCOUNT_ACTION'), onPress: onConnecter, icon: 'login' }}
                />
            );
        }
        if (scrapeStatus === 'connecting' || scrapeStatus === 'scraping') {
            return <ChargementPlanning theme={theme} />;
        }
    }

    return (
        <SourceFailureNotice
            variant="plain"
            failure={lienEdtAttendu()}
            theme={theme}
            action={{ label: Translator.get('TIMETABLE_LINK_ADD'), onPress: onColler, icon: 'link-variant-plus' }}
        />
    );
}
