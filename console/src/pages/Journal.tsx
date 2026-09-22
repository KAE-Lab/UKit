/**
 * Le journal : tout ce qui s'est ecrit, filtrable par table — toutes les tables journalisees, pas
 * seulement celles qui ont une page (defaut 12) —, pagine avec son total, exportable en JSON avec
 * les memes filtres. Une entree s'ouvre a `/journal/<numero>` : avant, apres.
 */

import { Download } from 'lucide-react';
import { useState } from 'react';

import { ListeDeRessource } from '../composants/liste/ListeDeRessource';
import { etatDepuisParams } from '../composants/liste/etatUrl';
import { Bouton } from '../composants/ui/Bouton';
import { Encart, PlaceDEncart, type RetourDeGeste } from '../composants/ui/Encart';
import { ErreurDeLecture } from '../composants/ui/ErreurDeLecture';
import { EtatVide } from '../composants/ui/EtatVide';
import { Lecture } from '../composants/formulaire/Lecture';
import { SqueletteBloc } from '../composants/ui/Squelette';
import { lireTout } from '../lib/base';
import { formaterDate } from '../lib/dates';
import { messageDErreur } from '../lib/erreurs';
import { exporterJson } from '../lib/exportJson';
import { specDepuisEtat } from '../lib/requete';
import { useLigne } from '../requetes/useListe';
import { JOURNAL } from '../schema/tables/suivi';
import { naviguer, useRoute } from '../routeur';

function Entree({ numero, retour }: { readonly numero: string; readonly retour: () => void }) {
    const requete = useLigne(JOURNAL, { id: numero });
    if (requete.isError) return <div className="carte"><ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} /></div>;
    if (requete.data === undefined) return <div className="carte"><SqueletteBloc hauteur={200} /></div>;
    if (requete.data === null) return <div className="carte"><EtatVide>Cette entrée n’existe pas.</EtatVide></div>;
    const ligne = requete.data;
    return (
        <div className="carte">
            <h2>Entrée {numero} — {formaterDate(ligne.quand)}</h2>
            <Lecture champs={JOURNAL.champs.filter((c) => ['table_name', 'operation', 'ligne_id', 'par'].includes(c.nom))} ligne={ligne} />
            <div className="diff" style={{ marginTop: 'var(--espace-md)' }}>
                <div><div className="titre">Avant</div><pre>{ligne.avant === null ? '—' : JSON.stringify(ligne.avant, null, 2)}</pre></div>
                <div><div className="titre">Après</div><pre>{ligne.apres === null ? '—' : JSON.stringify(ligne.apres, null, 2)}</pre></div>
            </div>
            <div className="boutons" style={{ marginTop: 'var(--espace-md)' }}><Bouton variante="discret" onClick={retour}>Retour au journal</Bouton></div>
        </div>
    );
}

export function Journal({ reste }: { readonly reste: string | null }) {
    const { params } = useRoute();
    const [retour, setRetour] = useState<RetourDeGeste | null>(null);
    const [exportEnCours, setExportEnCours] = useState(false);

    const exporter = async () => {
        setExportEnCours(true);
        setRetour(null);
        try {
            const spec = specDepuisEtat(JOURNAL, etatDepuisParams(params, JOURNAL.filtres ?? []), null);
            const lignes = await lireTout('journal', spec);
            exporterJson(`journal-${new Date().toISOString().slice(0, 10)}.json`, lignes);
            setRetour({ ton: 'ok', texte: `${lignes.length} entrée${lignes.length > 1 ? 's' : ''} exportée${lignes.length > 1 ? 's' : ''}, avec les filtres de la liste.` });
        } catch (echec) {
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
        } finally {
            setExportEnCours(false);
        }
    };

    return (
        <>
            <div className="entete-page">
                <div><h1>Journal</h1><p className="sous-titre">{JOURNAL.description}</p></div>
                {reste === null ? <Bouton variante="tonal" onClick={() => { void exporter(); }} enAttente={exportEnCours} icone={<Download className="icone" aria-hidden="true" />}>Exporter en JSON</Bouton> : null}
            </div>
            <PlaceDEncart retour={retour}>{reste === null ? <Encart ton="info">L’export relit tout ce que les filtres retiennent, par pages de mille : c’est le fichier à remettre quand quelque chose a mal tourné.</Encart> : null}</PlaceDEncart>
            {reste === null ? (
                <div className="carte"><ListeDeRessource descripteur={JOURNAL} lienDe={(ligne) => `/journal/${String(ligne.id)}${params.size > 0 ? `?${params.toString()}` : ''}`} /></div>
            ) : (
                <Entree numero={reste} retour={() => naviguer('/journal', params)} />
            )}
        </>
    );
}
