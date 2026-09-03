/**
 * L'etat des widgets, et sa politique de rafraichissement.
 *
 * **Quand ca se rejoue** : au lancement une fois le trousseau lu, au retour d'arriere-plan, et sur un
 * geste explicite. C'est frequent — et c'est borne par la peremption de chaque widget, sans quoi
 * chaque bascule d'application couterait la traversee complete d'un CAS pour une valeur identique.
 *
 * **Ce qui s'affiche pendant ce temps** : la derniere valeur connue, relue du trousseau avant tout
 * run. C'est ce qui fait que la page s'ouvre pleine, et qu'elle n'est pas vide hors ligne. La
 * messagerie n'avait pas ce cache — d'ou l'indicateur tournant a chaque lancement.
 *
 * **Ce hook ne joue rien lui-meme** : il tient l'etat, decide du moment, et delegue la sequence a
 * `rafraichirWidgets`. La separation garde le runner jouable sans React.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import SecureStoreService from '../../../shared/services/SecureStoreService';
import type { UkitFailure } from '../../../shared/aetherius/failures';
import type { PointWidget } from './definitions';
import { lireValeursPersistees } from './stockage';
import { rafraichirWidgets, relireWidget, type ValeursWidgets } from './runner';
import type { ValeurWidget } from './projection';

export type EchecsWidgets = Readonly<Partial<Record<PointWidget, UkitFailure>>>;

export interface EtatDesWidgets {
    readonly valeurs: ValeursWidgets;
    readonly echecs: EchecsWidgets;
    /** Le point en cours de lecture, ou `null` : le moteur est sequentiel, il n'y en a jamais deux. */
    readonly pointEnCours: PointWidget | null;
    /**
     * Rejoue ce qui est perime — ou tout, avec `force`.
     *
     * **Rend une promesse**, et pas pour que l'ecran l'attende : c'est ce qui permet d'enchainer une
     * autre lecture *apres* celle-ci plutot qu'a cote. Le rangement du certificat en a besoin — lance
     * en parallele, il prenait le moteur entre deux widgets et retardait le second d'une vingtaine de
     * secondes (mesure du 2026-08-29).
     */
    readonly rafraichir: (options?: { readonly force?: boolean }) => Promise<void>;
    /**
     * Relit **un seul** point — le geste de la feuille d'echec d'une tuile.
     *
     * Elle **attend** le rafraichissement en vol plutot que de le refuser : une boucle globale peut
     * sauter le widget en echec (frais selon la valeur d'avant), et un « Relancer » sans effet
     * visible serait un bouton mort. Elle se range ensuite derriere lui, ce qui evite aux deux de se
     * disputer l'indicateur d'attente et l'ecriture du cache.
     */
    readonly relancer: (point: PointWidget) => Promise<void>;
    /**
     * Vide l'etat **sans toucher au cache**.
     *
     * C'est ce dont une bascule d'etablissement a besoin : les valeurs de la fac qu'on quitte doivent
     * disparaitre de l'ecran, et rester dans le trousseau pour le jour ou l'on y revient. Le cache de
     * la nouvelle est relu tout seul — `pret` retombe a faux puis remonte, ce qui rejoue la lecture.
     */
    readonly reinitialiser: () => void;
}

export function useWidgets(pret: boolean): EtatDesWidgets {
    const [valeurs, setValeurs] = useState<ValeursWidgets>({});
    const [echecs, setEchecs] = useState<EchecsWidgets>({});
    const [pointEnCours, setPointEnCours] = useState<PointWidget | null>(null);

    /**
     * Les valeurs, aussi en reference.
     *
     * Le rafraichissement a besoin des valeurs **courantes** pour juger de leur fraicheur, et il est
     * declenche par des abonnements (`AppState`) qui capturent l'etat de leur rendu. Sans cette
     * reference, un retour d'arriere-plan comparerait la fraicheur a un instantane perime et
     * rejouerait tout a chaque fois.
     */
    const valeursRef = useRef<ValeursWidgets>({});
    const enCoursRef = useRef(false);
    /** La lecture en vol — boucle ou relance — derriere laquelle une relance se range. */
    const enVolRef = useRef<Promise<void>>(Promise.resolve());
    const pretRef = useRef(pret);
    pretRef.current = pret;

    const poser = useCallback((prochaines: ValeursWidgets) => {
        valeursRef.current = prochaines;
        setValeurs(prochaines);
    }, []);

    /**
     * Une lecture a abouti. Au fil de l'eau : chaque rangee s'allume des qu'elle sait, sans attendre
     * les suivantes — un parcours de quatre widgets remplirait sinon la page d'un coup, a la fin, ce
     * qui est exactement l'attente aveugle qu'on cherche a supprimer. L'echec du point s'efface, et
     * le trousseau suit.
     */
    const poserValeur = useCallback((point: PointWidget, valeur: ValeurWidget) => {
        const prochaines = { ...valeursRef.current, [point]: valeur };
        poser(prochaines);
        setEchecs((precedents) => {
            if (precedents[point] === undefined) return precedents;
            const suite = { ...precedents };
            delete suite[point];
            return suite;
        });
        void SecureStoreService.saveWidgets(prochaines);
    }, [poser]);

    const poserEchec = useCallback((point: PointWidget, echec: UkitFailure) => {
        setEchecs((precedents) => ({ ...precedents, [point]: echec }));
    }, []);

    const rafraichir = useCallback((options: { readonly force?: boolean } = {}): Promise<void> => {
        // Un seul rafraichissement a la fois. Le moteur serialiserait de toute facon, mais deux
        // boucles concurrentes se disputeraient l'indicateur d'attente et l'ecrasement du cache.
        if (!pretRef.current || enCoursRef.current) return Promise.resolve();

        enCoursRef.current = true;
        const boucle = rafraichirWidgets(valeursRef.current, {
            ...(options.force === true ? { force: true } : {}),
            onEnCours: setPointEnCours,
            onValeur: poserValeur,
            onEchec: poserEchec,
        })
            .catch((erreur) => {
                // `rafraichirWidgets` ne leve pas ; ce filet couvre l'imprevu, et il est muet parce
                // qu'un rafraichissement d'arriere-plan n'a personne a qui parler.
                console.warn('[widgets] rafraichissement interrompu', erreur);
            })
            .finally(() => {
                enCoursRef.current = false;
                setPointEnCours(null);
            })
            // Les valeurs sont deja posees au fil de l'eau : ce qui est rendu ici est un jalon, pas
            // une donnee. `void` le dit au type, plutot que d'obliger l'appelant a l'ignorer.
            .then(() => undefined);
        enVolRef.current = boucle;
        return boucle;
    }, [poserValeur, poserEchec]);

    const relancer = useCallback((point: PointWidget): Promise<void> => {
        if (!pretRef.current) return Promise.resolve();

        const relance = enVolRef.current.then(async () => {
            enCoursRef.current = true;
            setPointEnCours(point);
            try {
                const lu = await relireWidget(point);
                if (lu.ok === true) poserValeur(point, lu.valeur);
                else if (lu.echec !== null) poserEchec(point, lu.echec);
            } catch (erreur) {
                console.warn('[widgets] relance interrompue', erreur);
            } finally {
                enCoursRef.current = false;
                setPointEnCours(null);
            }
        });
        enVolRef.current = relance;
        return relance;
    }, [poserValeur, poserEchec]);

    const reinitialiser = useCallback(() => {
        valeursRef.current = {};
        setValeurs({});
        setEchecs({});
    }, []);

    // Le cache d'abord, le reseau ensuite : la page doit pouvoir s'ouvrir pleine avant qu'un seul
    // run ne parte.
    useEffect(() => {
        if (!pret) return;
        void lireValeursPersistees().then((persistees) => {
            poser(persistees);
            void rafraichir();
        });
    }, [poser, pret, rafraichir]);

    useEffect(() => {
        const abonnement = AppState.addEventListener('change', (etat) => {
            if (etat === 'active') void rafraichir();
        });
        return () => abonnement.remove();
    }, [rafraichir]);

    return { valeurs, echecs, pointEnCours, rafraichir, relancer, reinitialiser };
}
