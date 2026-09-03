/**
 * Ce que l'ecran montre, a partir des messages connus, de ce qui a deja ete vu, et de qui on est.
 *
 * C'est la seule logique de presentation des messages de service, et elle est pure : l'hote
 * (`MessagesDeServiceHote`) ne fait que la rejouer a chaque changement — une lecture, une
 * fermeture, un changement d'etablissement — et rendre ce qu'elle repond.
 *
 * La regle, celle de la spec 6.1-B :
 *
 *   | niveau         | premiere fois          | ensuite, tant qu'il dure            |
 *   |----------------|------------------------|-------------------------------------|
 *   | info           | bandeau, fermable      | plus rien                           |
 *   | avertissement  | feuille modale         | plus rien                           |
 *   | incident       | feuille modale         | un rappel discret en tete d'onglet  |
 *
 * **Une chose a la fois pour ce qui se lit** : avec une modale, pas de bandeau ; le suivant vient a
 * la fermeture, quand l'hote rejoue la regle. Le rappel d'incident, lui, a sa propre place dans la
 * rangee du titre et coexiste avec les deux autres. Entre plusieurs candidats, l'incident passe avant
 * l'avertissement, qui passe avant l'information, et le plus recent avant le plus ancien.
 *
 * Voir docs/pilotage.md.
 */

import { estCible, type ContexteDeCiblage } from '../ciblage/ciblage';
import { estEnCours, type MessageDeService, type NiveauDeMessage } from './projection';

export interface Presentation {
    /** Une feuille modale a montrer, ou rien. */
    readonly modale: MessageDeService | null;
    /** Une `info` pas encore vue : le bandeau flottant, fermable. Jamais en meme temps qu'une modale. */
    readonly bandeau: MessageDeService | null;
    /**
     * Un `incident` deja lu et toujours en cours : le rappel discret en tete des onglets. Il a sa
     * propre place, donc il coexiste avec les deux autres — un incident ne cesse pas d'etre en cours
     * parce qu'une information arrive.
     */
    readonly rappel: MessageDeService | null;
}

export const RIEN_A_MONTRER: Presentation = { modale: null, bandeau: null, rappel: null };

const RANG: Readonly<Record<NiveauDeMessage, number>> = { incident: 0, avertissement: 1, info: 2 };

/** Les messages que cet appareil doit voir, du plus pressant au moins pressant. */
export function messagesVisibles(
    messages: readonly MessageDeService[],
    contexte: ContexteDeCiblage,
    maintenant: Date,
): MessageDeService[] {
    return messages
        .filter((message) => estEnCours(message, maintenant) && estCible(message.ciblage, contexte))
        .sort((a, b) =>
            RANG[a.niveau] - RANG[b.niveau]
            || b.publieLe.localeCompare(a.publieLe)
            || a.cle.localeCompare(b.cle));
}

export function choisirPresentation(
    messages: readonly MessageDeService[],
    vus: ReadonlySet<string>,
    contexte: ContexteDeCiblage,
    maintenant: Date,
): Presentation {
    const visibles = messagesVisibles(messages, contexte, maintenant);

    // Le rappel ne depend de rien d'autre : un incident lu et toujours en cours se rappelle, point.
    const rappel = visibles.find((message) => message.niveau === 'incident' && vus.has(message.cle)) ?? null;

    const modale = visibles.find((message) => message.niveau !== 'info' && !vus.has(message.cle));
    if (modale !== undefined) return { modale, bandeau: null, rappel };

    const information = visibles.find((message) => message.niveau === 'info' && !vus.has(message.cle));
    return { modale: null, bandeau: information ?? null, rappel };
}
