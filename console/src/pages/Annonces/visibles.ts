/**
 * L'ordre vu a une heure donnee : ce qu'un telephone montrerait a cet instant, sur ce campus, avec
 * cette version et cette plateforme, testeur ou non. Trois regles, toutes partagees avec
 * l'application : la visibilite de la politique de lecture (etat.ts), le ciblage
 * (`shared/ciblage/ciblage.ts`) et l'ordre (`shared/annonces/ordre.ts`).
 *
 * Pur : joue par `npm test` a la racine du depot (visibles.test.ts).
 */

import { creneauActif, instantDeParis, ordonner, projeterOrdre, type ParametresDOrdre } from '../../../../src/shared/annonces/ordre';
import { estCible, projeterCiblage, type Plateforme } from '../../../../src/shared/ciblage/ciblage';
import { etatDAnnonce } from './etat';

export interface ContexteDuPanneau {
    readonly instant: Date;
    readonly etablissement: string;
    readonly plateforme: Plateforme;
    readonly testeur: boolean;
    /** La version de l'application ; nulle, aucune borne de version ne filtre. */
    readonly version: string | null;
}

export interface AnnonceOrdonnee<T> {
    readonly annonce: T;
    readonly parametres: ParametresDOrdre;
    readonly creneauActif: boolean;
}

type LigneDAnnonce = Readonly<Record<string, unknown>>;

/** Les annonces qu'un telephone montrerait a cet instant, dans cet ordre. */
export function ordreVuA<T extends LigneDAnnonce>(lignes: readonly T[], contexte: ContexteDuPanneau): AnnonceOrdonnee<T>[] {
    const paris = instantDeParis(contexte.instant);
    const visibles = lignes.filter((ligne) => etatDAnnonce(ligne, contexte.instant).etat === 'active'
        && estCible(projeterCiblage(ligne), { testeur: contexte.testeur, etablissement: contexte.etablissement, version: contexte.version, plateforme: contexte.plateforme }));
    // La ligne est un enregistrement ouvert : `id` y est, sans que le type le promette.
    const parametresDe = (ligne: T) => projeterOrdre({ id: ligne.id, epinglee: ligne.epinglee, priorite: ligne.priorite, creneaux: ligne.creneaux });
    return ordonner(visibles, contexte.instant, parametresDe).map((annonce) => {
        const parametres = parametresDe(annonce);
        return { annonce, parametres, creneauActif: creneauActif(parametres.creneaux, paris) };
    });
}
