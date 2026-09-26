/**
 * Le panneau « Ordre du carrousel » : une heure, un jour, un campus, une plateforme, l'option
 * « appareil testeur », une version — et la liste des annonces dans l'ordre ou un telephone les
 * montrerait a cet instant, par les regles partagees avec l'application (visibles.ts). C'est ce qui
 * repond a « a 12 h 30, a Talence, mon annonce est-elle en tete ? » sans avoir un telephone a
 * Talence a 12 h 30.
 */

import { Pin, Timer, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Bouton } from '../../composants/ui/Bouton';
import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { EtatVide } from '../../composants/ui/EtatVide';
import { Pastille } from '../../composants/ui/Pastille';
import { SqueletteBloc } from '../../composants/ui/Squelette';
import { versSaisie } from '../../lib/dates';
import { useEtablissements } from '../../requetes/useEtablissements';
import { SANS_FILTRE, useTout } from '../../requetes/useListe';
import { PLATEFORMES } from '../../../../src/shared/ciblage/ciblage';
import { lienVers } from '../../routeur';
import { EMPLACEMENTS } from '../../schema/tables/annonces';
import { resumeDeCreneaux } from '../../schema/resumes';
import { ordreVuA, type ContexteDuPanneau } from './visibles';

const COLONNES = 'id,titre,emetteur,statut,active,publiee_le,expire_le,audience,etablissements,version_min,version_max,plateformes,epinglee,priorite,creneaux,emplacements,type';

function libelleDEmplacements(valeur: unknown): string {
    if (!Array.isArray(valeur)) return '';
    return valeur.map((code) => EMPLACEMENTS.find((e) => e.valeur === code)?.libelle ?? String(code)).join(', ');
}

export function Ordre() {
    const { etablissements } = useEtablissements();
    const requete = useTout('annonces', COLONNES, SANS_FILTRE);
    const [instant, setInstant] = useState(() => versSaisie(new Date().toISOString()));
    const [etablissement, setEtablissement] = useState('');
    const [plateforme, setPlateforme] = useState<ContexteDuPanneau['plateforme']>('ios');
    const [testeur, setTesteur] = useState(false);
    const [version, setVersion] = useState('');
    const campus = etablissement === '' ? (etablissements[0]?.code ?? '') : etablissement;

    const contexte: ContexteDuPanneau = useMemo(() => ({
        instant: instant === '' || Number.isNaN(new Date(instant).getTime()) ? new Date() : new Date(instant),
        etablissement: campus,
        plateforme,
        testeur,
        version: version.trim() === '' ? null : version.trim(),
    }), [instant, campus, plateforme, testeur, version]);
    const ordre = useMemo(() => (requete.data === undefined ? null : ordreVuA(requete.data, contexte)), [requete.data, contexte]);

    return (
        <>
            <div className="entete-page">
                <div>
                    <h1>Ordre du carrousel</h1>
                    <p className="sous-titre">Ce qu’un téléphone montre à cet instant, dans cet ordre : les épinglées, puis les créneaux actifs, puis la priorité, puis une rotation par heure.</p>
                </div>
                <a className="bouton discret" href={lienVers('/annonces')}><span className="contenu-bouton"><Undo2 className="icone" aria-hidden="true" />Retour aux annonces</span></a>
            </div>
            <div className="carte">
                <div className="filtres ordre-controles">
                    <label className="filtre"><span>Instant</span><input type="datetime-local" value={instant} onChange={(e) => setInstant(e.target.value)} /></label>
                    <label className="filtre"><span>Campus</span>
                        <select value={campus} onChange={(e) => setEtablissement(e.target.value)}>
                            {etablissements.map((e) => <option key={e.code} value={e.code}>{e.nom}</option>)}
                        </select>
                    </label>
                    <label className="filtre"><span>Plateforme</span>
                        <select value={plateforme} onChange={(e) => setPlateforme(e.target.value as ContexteDuPanneau['plateforme'])}>
                            {PLATEFORMES.map((p) => <option key={p} value={p}>{p === 'ios' ? 'iOS' : 'Android'}</option>)}
                        </select>
                    </label>
                    <label className="filtre"><span>Version</span><input type="text" placeholder="6.3.0 — vide : sans borne" value={version} onChange={(e) => setVersion(e.target.value)} style={{ width: 170 }} /></label>
                    <label className="case"><input type="checkbox" checked={testeur} onChange={(e) => setTesteur(e.target.checked)} /> Appareil testeur</label>
                    <span className="espace" />
                    <Bouton variante="discret" compact onClick={() => setInstant(versSaisie(new Date().toISOString()))} icone={<Timer className="icone" aria-hidden="true" />}>Maintenant</Bouton>
                </div>
                <p className="petit secondaire">Heure de Paris. L’ordre change à chaque heure pleine pour les annonces à égalité ; l’application l’applique à partir de la 6.3.</p>
                {requete.isError ? <ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} enCours={requete.isFetching} /> : null}
                {ordre === null && !requete.isError ? (
                    <div className="ordre-liste" aria-busy="true" aria-label="Lecture en cours">{[0, 1, 2, 3, 4].map((i) => <SqueletteBloc key={i} hauteur={48} />)}</div>
                ) : null}
                {ordre !== null && ordre.length === 0 ? <EtatVide>Aucune annonce visible à cet instant pour ce téléphone.</EtatVide> : null}
                {ordre !== null && ordre.length > 0 ? (
                    <ol className="ordre-liste">
                        {ordre.map(({ annonce, parametres, creneauActif }, rang) => (
                            <li key={String(annonce.id)}>
                                <span className="ordre-rang">{rang + 1}</span>
                                <a href={lienVers(`/annonces/${String(annonce.id)}`)} className="ordre-titre">{String(annonce.titre)}</a>
                                <span className="secondaire petit">{String(annonce.emetteur ?? '')}</span>
                                <span className="liste-en-ligne">
                                    {parametres.epinglee ? <Pastille ton="accent"><Pin className="icone" aria-hidden="true" />épinglée</Pastille> : null}
                                    {creneauActif ? <Pastille ton="ok" point>créneau actif</Pastille> : null}
                                    {parametres.priorite !== 0 ? <Pastille>priorité {parametres.priorite}</Pastille> : null}
                                    {parametres.creneaux.length > 0 && !creneauActif ? <span className="petit secondaire">{resumeDeCreneaux(parametres.creneaux)}</span> : null}
                                    {Array.isArray(annonce.emplacements) && annonce.emplacements.length > 1 ? <span className="petit secondaire">{libelleDEmplacements(annonce.emplacements)}</span> : null}
                                </span>
                            </li>
                        ))}
                    </ol>
                ) : null}
            </div>
        </>
    );
}
