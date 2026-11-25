/**
 * Les reglages (7-G) : la part des themes, des langues, de la synchronisation du calendrier et des
 * notifications, chacun compte une fois par session. Les deux themes a egalite se jugent sur ce
 * chiffre (docs/mesure.md).
 */

import { useMemo } from 'react';

import { CarteDeListe } from '../../composants/stats/CarteDeListe';
import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { par } from '../../stats/agregats';
import { casesDe } from '../../stats/cases';
import { useLignes, type Choix } from './choix';
import { LANGUES, libelleDe, NOTIFICATIONS, SYNCHRO, THEMES } from './libelles';

/** `rappels:on` et `messages:off` : un interrupteur et son etat, separes pour deux listes. */
function interrupteur(comptes: ReadonlyMap<string, number>, nom: string): Map<string, number> {
    const etats = new Map<string, number>();
    for (const [cle, n] of comptes) {
        const [interrupteurDeLaCle, etat] = cle.split(':');
        if (interrupteurDeLaCle === nom && etat !== undefined) etats.set(etat, (etats.get(etat) ?? 0) + n);
    }
    return etats;
}

export function Reglages({ choix }: { readonly choix: Choix }) {
    const { lignes, lecture } = useLignes(choix);
    const vue = useMemo(() => {
        if (lignes === undefined) return undefined;
        const notifications = par(lignes.courantes, 'reglage.notifications', 'cle');
        return {
            themes: casesDe(par(lignes.courantes, 'reglage.theme', 'cle')),
            langues: casesDe(par(lignes.courantes, 'reglage.langue', 'cle')),
            synchro: casesDe(par(lignes.courantes, 'reglage.synchro', 'cle')),
            rappels: casesDe(interrupteur(notifications, 'rappels')),
            messages: casesDe(interrupteur(notifications, 'messages')),
        };
    }, [lignes]);
    if (lecture.enErreur) return <div className="carte"><ErreurDeLecture erreur={lecture.erreur} reessayer={lecture.relire} enCours={lecture.enCours} /></div>;
    return (
        <div className="grille-stats courte">
            <CarteDeListe titre="Thème" vues={[{ valeur: 'theme', libelle: 'Thème', cases: vue?.themes, colonnes: ['Thème', 'Sessions'], libelleDe: libelleDe(THEMES) }]} />
            <CarteDeListe titre="Langue" vues={[{ valeur: 'langue', libelle: 'Langue', cases: vue?.langues, colonnes: ['Langue', 'Sessions'], libelleDe: libelleDe(LANGUES) }]} />
            <CarteDeListe titre="Synchronisation du calendrier" vues={[{ valeur: 'synchro', libelle: 'Synchronisation', cases: vue?.synchro, colonnes: ['Synchronisation', 'Sessions'], libelleDe: libelleDe(SYNCHRO) }]} />
            <CarteDeListe titre="Notifications" vues={[
                { valeur: 'messages', libelle: 'Messages', cases: vue?.messages, colonnes: ['Messages de service', 'Sessions'], libelleDe: libelleDe(NOTIFICATIONS) },
                { valeur: 'rappels', libelle: 'Rappels', cases: vue?.rappels, colonnes: ['Rappels de cours', 'Sessions'], libelleDe: libelleDe(NOTIFICATIONS) },
            ]} />
        </div>
    );
}
