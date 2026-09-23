/**
 * Les champs editables d'un formulaire, ranges par groupe quand le descripteur en nomme ; a plat
 * sinon. Un champ dont la regle de visibilite dit non ne se montre pas — il garde sa valeur.
 */

import { Controller, type Control } from 'react-hook-form';

import type { EtablissementConnu } from '../../lib/base';
import type { Champ } from '../../schema/descripteurs';
import type { Saisies } from '../../schema/schemas';
import type { Ligne } from '../../supabase';
import { ChampEditeur } from './champs/Champ';

export interface ChampsProps {
    readonly champs: readonly Champ[];
    readonly control: Control<Saisies, unknown, Ligne>;
    readonly valeurs: Ligne;
    readonly etablissements: readonly EtablissementConnu[];
    readonly codes: readonly string[] | null;
    readonly poserAutre: (nom: string, saisie: Saisies[string]) => void;
    readonly desactiver: (champ: Champ) => boolean;
    readonly signalerLigne: (nom: string, ligne: number) => void;
}

interface Groupe {
    readonly nom: string | null;
    readonly champs: Champ[];
}

/** Les champs consecutifs d'un meme groupe, dans l'ordre du descripteur. */
function grouper(champs: readonly Champ[]): readonly Groupe[] {
    const groupes: Groupe[] = [];
    for (const champ of champs) {
        const dernier = groupes[groupes.length - 1];
        if (dernier !== undefined && dernier.nom === (champ.groupe ?? null)) dernier.champs.push(champ);
        else groupes.push({ nom: champ.groupe ?? null, champs: [champ] });
    }
    return groupes;
}

export function Champs({ champs, control, valeurs, etablissements, codes, poserAutre, desactiver, signalerLigne }: ChampsProps) {
    const rendre = (champ: Champ) => (
        <Controller
            key={champ.nom}
            control={control}
            name={champ.nom}
            render={({ field, fieldState }) => (
                <ChampEditeur
                    champ={champ}
                    saisie={field.value ?? ''}
                    onChange={field.onChange}
                    poserAutre={poserAutre}
                    ligne={valeurs}
                    etablissements={etablissements}
                    codesConnus={codes}
                    erreur={fieldState.error?.message}
                    enErreur={fieldState.error !== undefined}
                    desactive={desactiver(champ)}
                    signalerLigne={(ligne) => signalerLigne(champ.nom, ligne)}
                />
            )}
        />
    );
    const visibles = champs.filter((champ) => champ.visible === undefined || champ.visible(valeurs));
    return (
        <>
            {grouper(visibles).map((groupe, rang) => (groupe.nom === null
                ? groupe.champs.map(rendre)
                : <fieldset key={`${groupe.nom}-${rang}`} className="groupe"><legend>{groupe.nom}</legend>{groupe.champs.map(rendre)}</fieldset>
            ))}
        </>
    );
}
