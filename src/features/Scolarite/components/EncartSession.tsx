/**
 * L'etat de la session, **en tete de page** et non plein ecran.
 *
 * C'est le renversement que la refonte impose, et il vaut d'etre explique parce qu'il a l'air d'une
 * regression. Avant, quatre situations prenaient l'ecran entier et rien d'autre ne s'affichait :
 * pas de portail publie, pas de compte enregistre, parcours froid en cours, echec bloquant. C'etait
 * juste tant que l'onglet n'avait **rien d'autre** a montrer.
 *
 * Depuis que « Tes documents » existe, ca ne l'est plus : ces fichiers sont locaux, ils ne dependent
 * ni d'un portail ni d'un compte, et les cacher derriere un ecran d'erreur rendrait l'onglet mort
 * pour exactement les gens a qui il sert le plus — quelqu'un qui n'a pas connecte son compte, et
 * tout etudiant d'un etablissement sans portail publie (« Autre universite »).
 *
 * **Une seule exception, et elle est deliberee : le parcours froid.** Il reste plein ecran, parce
 * qu'il est *transitoire* — l'afficher en encart au-dessus d'une page qui se remplit sous lui ferait
 * sauter le contenu a chaque etape franchie.
 */

import React from 'react';
import { View } from 'react-native';

import Translator from '../../../shared/i18n/Translator';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { SourceFailureNotice } from '../../../shared/ui/SourceFailureNotice';
import type { UkitFailure } from '../../../shared/aetherius/failures';
import { serviceEtablissement } from '../../../shared/etablissements';
import { demandeUneRessaisie } from '../services/ScolariteMapping';

export interface EncartSessionProps {
    theme: AppThemeType;
    portailDisponible: boolean;
    aUnCompte: boolean;
    echecBloquant: UkitFailure | null;
    sessionFailure: UkitFailure | null;
    onRetry: () => void;
    onRessaisir: () => void;
    onConnecter: () => void;
    /** Ouvre le formulaire de demande d'adaptation, quand le catalogue en publie un. */
    onDemanderCampus: (adresse: string) => void;
}

export function EncartSession({
    theme, portailDisponible, aUnCompte, echecBloquant, sessionFailure,
    onRetry, onRessaisir, onConnecter, onDemanderCampus,
}: EncartSessionProps) {
    const encadrer = (contenu: React.ReactNode) => (
        <View style={{ marginHorizontal: tokens.space.md, marginBottom: tokens.space.lg }}>
            {contenu}
        </View>
    );

    /*
     * L'ordre n'est pas indifferent, et c'est le meme raisonnement qu'au jalon 6-J : un etablissement
     * qui ne publie aucun portail n'a JAMAIS d'identifiants enregistres, donc la branche « pas de
     * compte » gagnerait toujours et proposerait un formulaire qui ne peut mener nulle part.
     */
    if (!portailDisponible) {
        /*
         * Un campus qu'on n'a pas porte n'est **pas une panne**, et ne doit donc pas emprunter la
         * grammaire d'echec : `SourceFailureNotice` disait « le portail ne repond pas » la ou il n'y
         * a jamais eu de portail a joindre. C'est un etat vide, avec ce qu'un etat vide doit porter —
         * **une action**, pas un bouton Reessayer qui n'aurait rien a rejouer.
         *
         * L'action est un formulaire de demande, et son adresse vient du **catalogue** : ajouter ou
         * changer ce lien est une publication, pas une release. Sans lien publie, le message reste et
         * l'action disparait — mieux vaut dire honnetement « pas encore » que proposer une porte
         * fermee.
         */
        const demande = serviceEtablissement('adaptation');
        return encadrer(
            <EmptyState
                icon="school-outline"
                title={Translator.get('CAMPUS_NOT_SUPPORTED_TITLE')}
                message={Translator.get('CAMPUS_NOT_SUPPORTED')}
                theme={theme}
                variant="card"
                action={demande === null ? null : {
                    label: Translator.get('CAMPUS_REQUEST_ACTION'),
                    onPress: () => onDemanderCampus(demande),
                }}
            />,
        );
    }

    if (!aUnCompte) {
        /*
         * Une invitation, pas un formulaire. Le formulaire complet vit dans l'ecran du compte et dans
         * le parcours d'accueil ; le poser ici en pleine page repousserait les documents sous la
         * ligne de flottaison pour quelqu'un qui a justement choisi de ne pas se connecter.
         *
         * Un etat vide **propose une action**, jamais un bouton Reessayer : il n'y a pas de panne, il
         * manque un geste (recette d'ecran, point 4).
         */
        return encadrer(
            <EmptyState
                icon="account-circle-outline"
                title={Translator.get('CONNECT_ACCOUNT_TITLE')}
                message={Translator.get('CONNECT_ACCOUNT_DESC')}
                theme={theme}
                variant="card"
                action={{ label: Translator.get('CONNECT_ACCOUNT_ACTION'), onPress: onConnecter }}
            />,
        );
    }

    if (echecBloquant === null) return null;

    /*
     * Un mot de passe refuse ne se repare pas en rejouant : il se repare en le ressaisissant. On
     * envoie donc au formulaire **sans deconnecter** — vider le trousseau effacerait aussi l'identite
     * deja lue et obligerait a retaper l'identifiant, pour un mot de passe qui a change tout seul.
     */
    return encadrer(
        <SourceFailureNotice
            variant="card"
            failure={echecBloquant}
            theme={theme}
            onRetry={onRetry}
            action={demandeUneRessaisie(sessionFailure) ? {
                label: Translator.get('REENTER_CREDENTIALS'),
                onPress: onRessaisir,
                icon: 'account-key-outline',
            } : undefined}
        />,
    );
}
