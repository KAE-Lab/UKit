/**
 * La page generique d'une ressource : la liste, et le formulaire d'une ligne ou d'une ligne neuve.
 */

import { useCallback, useEffect, useState } from 'react';

import type { Ligne } from '../supabase';
import { lister, listerEtablissements, messageDErreur, type EtablissementConnu } from '../lib/base';
import type { Descripteur } from '../schema/descripteurs';
import { Bouton } from '../composants/Bouton';
import { Formulaire } from '../composants/Formulaire';
import { Liste } from '../composants/Liste';
import { Retour } from '../composants/Retour';

type Selection = { readonly mode: 'liste' } | { readonly mode: 'nouveau' } | { readonly mode: 'ligne'; readonly ligne: Ligne };

export function Ressource({ descripteur }: { readonly descripteur: Descripteur }) {
    const [lignes, setLignes] = useState<readonly Ligne[] | null>(null);
    const [etablissements, setEtablissements] = useState<readonly EtablissementConnu[]>([]);
    const [erreur, setErreur] = useState<string | null>(null);
    const [selection, setSelection] = useState<Selection>({ mode: 'liste' });

    const charger = useCallback(async () => {
        setErreur(null);
        try {
            setLignes(await lister(descripteur));
        } catch (echec) {
            setErreur(messageDErreur(echec));
        }
    }, [descripteur]);

    useEffect(() => {
        setSelection({ mode: 'liste' });
        setLignes(null);
        void charger();
        // Le catalogue sert aux cases du ciblage ; un echec ici n'empeche pas d'editer le reste.
        void listerEtablissements().then(setEtablissements).catch(() => setEtablissements([]));
    }, [charger]);

    const retourALaListe = () => {
        setSelection({ mode: 'liste' });
        void charger();
    };

    return (
        <>
            <div className="entete-page">
                <div>
                    <h1>{descripteur.titre}</h1>
                    <p className="sous-titre">{descripteur.description}</p>
                </div>
                {selection.mode === 'liste' && descripteur.creation !== false ? (
                    <Bouton variante="plein" onClick={() => setSelection({ mode: 'nouveau' })}>Nouvelle ligne</Bouton>
                ) : null}
            </div>
            {descripteur.avertissement !== undefined ? <div className="carte"><Retour ton="avert">{descripteur.avertissement}</Retour></div> : null}
            {erreur !== null ? <div className="carte"><Retour ton="erreur">{erreur}</Retour></div> : null}
            {selection.mode === 'liste' ? (
                <div className="carte">
                    {lignes === null ? <p className="secondaire">Lecture…</p> : <Liste descripteur={descripteur} lignes={lignes} onChoisir={(ligne) => setSelection({ mode: 'ligne', ligne })} />}
                </div>
            ) : (
                <Formulaire
                    descripteur={descripteur}
                    existante={selection.mode === 'ligne' ? selection.ligne : null}
                    etablissements={etablissements}
                    onEnregistre={(ligne) => setSelection({ mode: 'ligne', ligne })}
                    onSupprime={retourALaListe}
                    onAnnule={retourALaListe}
                />
            )}
        </>
    );
}
