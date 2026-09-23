/**
 * Ce qui garde une saisie : ne pas la perdre en quittant — l'onglet, ou un lien de la console —, et
 * l'enregistrer au clavier.
 *
 * Jusqu'a 7-F, seul « Retour a la liste » demandait confirmation : un clic dans la navigation perdait
 * une annonce a moitie ecrite sans rien dire. La garde des liens retient desormais tout lien interne
 * (`#/…`) tant que le formulaire est modifie. Le bouton « precedent » du navigateur, lui, n'est pas
 * retenu : un changement de fragment ne s'annule pas.
 */

import { useEffect, useRef } from 'react';

import type { Question } from '../ui/Confirmation';

export const QUITTER_SANS_ENREGISTRER: Question = { titre: 'Quitter sans enregistrer ?', texte: 'Les modifications de ce formulaire seront perdues.', confirmer: 'Quitter' };

interface Touche {
    readonly key: string;
    readonly ctrlKey: boolean;
    readonly metaKey: boolean;
    readonly altKey: boolean;
    readonly shiftKey: boolean;
}

/** Ctrl+S, ou Cmd+S sur un Mac : le geste d'enregistrer de tout logiciel. */
export function estRaccourciDEnregistrement(touche: Touche): boolean {
    return (touche.ctrlKey || touche.metaKey) && !touche.altKey && !touche.shiftKey && touche.key.toLowerCase() === 's';
}

/** Le raccourci tel qu'il s'ecrit sur ce poste. */
export function raccourciDEnregistrement(agentUtilisateur: string): string {
    return /Mac|iPhone|iPad/.test(agentUtilisateur) ? '⌘ S' : 'Ctrl S';
}

/** Avertit avant de quitter la page ou l'onglet avec des saisies non enregistrees. */
export function useGardeDeSortie(modifie: boolean): void {
    useEffect(() => {
        if (!modifie) return undefined;
        const garder = (evenement: BeforeUnloadEvent) => { evenement.preventDefault(); };
        window.addEventListener('beforeunload', garder);
        return () => window.removeEventListener('beforeunload', garder);
    }, [modifie]);
}

/** Retient un clic simple sur un lien interne tant que la saisie n'est pas enregistree, et demande. */
export function useGardeDeNavigation(modifie: boolean, demander: (question: Question) => Promise<boolean>): void {
    useEffect(() => {
        if (!modifie) return undefined;
        const retenir = (evenement: MouseEvent) => {
            if (evenement.defaultPrevented || evenement.button !== 0 || evenement.ctrlKey || evenement.metaKey || evenement.shiftKey || evenement.altKey) return;
            const lien = evenement.target instanceof Element ? evenement.target.closest('a[href^="#/"]') : null;
            const cible = lien?.getAttribute('href') ?? null;
            if (lien === null || cible === null || lien.getAttribute('target') === '_blank') return;
            evenement.preventDefault();
            void demander(QUITTER_SANS_ENREGISTRER).then((oui) => { if (oui) window.location.hash = cible; });
        };
        document.addEventListener('click', retenir, true);
        return () => document.removeEventListener('click', retenir, true);
    }, [modifie, demander]);
}

/** Ctrl+S ou Cmd+S enregistre le formulaire ouvert, au lieu d'enregistrer la page du navigateur. */
export function useRaccourciDEnregistrement(enregistrer: () => void): void {
    const courant = useRef(enregistrer);
    useEffect(() => { courant.current = enregistrer; });
    useEffect(() => {
        const ecouter = (evenement: KeyboardEvent) => {
            if (!estRaccourciDEnregistrement(evenement)) return;
            evenement.preventDefault();
            courant.current();
        };
        window.addEventListener('keydown', ecouter);
        return () => window.removeEventListener('keydown', ecouter);
    }, []);
}
