/**
 * La logique du formulaire : les saisies, leur conversion, la validation, l'ecriture.
 *
 * Separee du composant pour qu'il ne fasse que rendre — et pour que la regle « une ligne se
 * convertit champ par champ, et rien ne part si un seul refuse » vive a un seul endroit.
 */

import { useCallback, useState } from 'react';

import type { Ligne } from '../supabase';
import { enregistrer, messageDErreur, supprimer } from '../lib/base';
import { versLigneDuChamp, versSaisieDuChamp, type Saisie } from '../schema/conversion';
import { valeurParDefaut, type Descripteur } from '../schema/descripteurs';

export interface RetourDeFormulaire {
    readonly ton: 'ok' | 'erreur';
    readonly texte: string;
}

function saisiesInitiales(descripteur: Descripteur, ligne: Ligne | null): Record<string, Saisie> {
    return Object.fromEntries(descripteur.champs.map((champ) => [
        champ.nom,
        versSaisieDuChamp(champ, ligne === null ? valeurParDefaut(champ) : ligne[champ.nom]),
    ]));
}

/** La ligne telle que les saisies la dessinent, sans validation — pour ce qui depend d'un autre champ. */
function ligneApproximative(saisies: Record<string, Saisie>): Ligne {
    return { ...saisies };
}

export function useFormulaire(descripteur: Descripteur, existante: Ligne | null) {
    const [saisies, setSaisies] = useState<Record<string, Saisie>>(() => saisiesInitiales(descripteur, existante));
    const [erreurs, setErreurs] = useState<Record<string, string>>({});
    const [retour, setRetour] = useState<RetourDeFormulaire | null>(null);
    const [enCours, setEnCours] = useState(false);

    const changer = useCallback((nom: string, saisie: Saisie) => {
        setSaisies((courantes) => ({ ...courantes, [nom]: saisie }));
        setErreurs((courantes) => {
            if (!(nom in courantes)) return courantes;
            const reste = { ...courantes };
            delete reste[nom];
            return reste;
        });
    }, []);

    const convertir = useCallback((): Ligne | null => {
        const ligne: Ligne = {};
        const refus: Record<string, string> = {};
        for (const champ of descripteur.champs) {
            if (champ.lectureSeule === true) continue;
            const conversion = versLigneDuChamp(champ, saisies[champ.nom] ?? '');
            if (conversion.ok) ligne[champ.nom] = conversion.valeur;
            else refus[champ.nom] = conversion.erreur;
        }
        setErreurs(refus);
        if (Object.keys(refus).length > 0) return null;
        const complete = descripteur.avantEcriture === undefined ? ligne : descripteur.avantEcriture(ligne, existante);
        const message = descripteur.valider === undefined ? null : descripteur.valider(complete);
        if (message !== null) {
            setRetour({ ton: 'erreur', texte: message });
            return null;
        }
        return complete;
    }, [descripteur, existante, saisies]);

    const soumettre = useCallback(async (): Promise<Ligne | null> => {
        setRetour(null);
        const ligne = convertir();
        if (ligne === null) return null;
        setEnCours(true);
        try {
            const ecrite = await enregistrer(descripteur, ligne, existante);
            setRetour({ ton: 'ok', texte: 'Enregistré.' });
            return ecrite;
        } catch (echec) {
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
            return null;
        } finally {
            setEnCours(false);
        }
    }, [convertir, descripteur, existante]);

    const effacer = useCallback(async (): Promise<boolean> => {
        if (existante === null) return false;
        setEnCours(true);
        try {
            await supprimer(descripteur, existante);
            return true;
        } catch (echec) {
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
            return false;
        } finally {
            setEnCours(false);
        }
    }, [descripteur, existante]);

    return { saisies, erreurs, retour, enCours, changer, soumettre, effacer, ligne: ligneApproximative(saisies) };
}
