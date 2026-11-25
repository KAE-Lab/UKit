/**
 * Les cartes du tableau de bord : les retours ouverts, les annonces. Chacune lit sa propre requete et
 * porte son squelette et son erreur, a sa place. Le parc, lui, est passe aux listes a barres (lot 0).
 */

import { Inbox, Megaphone } from 'lucide-react';
import type { ReactNode } from 'react';

import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { Pastille } from '../../composants/ui/Pastille';
import { SqueletteBloc, SqueletteTexte } from '../../composants/ui/Squelette';
import { formaterDate } from '../../lib/dates';
import { SANS_FILTRE, useTout } from '../../requetes/useListe';
import { ETATS_OUVERTS } from '../../schema/tables/retours';
import { etatDesAnnonces, type AnnonceLegere } from './annonces';

function Carte({ titre, icone, lien, requete, children }: {
    readonly titre: string;
    readonly icone: ReactNode;
    readonly lien: string;
    readonly requete: { readonly isPending: boolean; readonly isError: boolean; readonly error: unknown; readonly refetch: () => unknown; readonly isFetching: boolean };
    readonly children: ReactNode;
}) {
    return (
        <section className="carte">
            <h2><span>{icone}{titre}</span><a href={`#${lien}`}>ouvrir</a></h2>
            <div className="corps">
                {requete.isPending ? <><SqueletteTexte largeur="35%" /><SqueletteBloc hauteur={64} /><SqueletteTexte largeur="70%" /></> : null}
                {requete.isError ? <ErreurDeLecture erreur={requete.error} reessayer={() => { void requete.refetch(); }} enCours={requete.isFetching} /> : null}
                {!requete.isPending && !requete.isError ? children : null}
            </div>
        </section>
    );
}

const COLONNES_DE_RETOUR = 'id,recu_le,nature,etat,campus,texte';

export function CarteDesRetours() {
    const requete = useTout('retours', COLONNES_DE_RETOUR, { ...SANS_FILTRE, tri: [{ colonne: 'recu_le', desc: true }] });
    const retours = requete.data ?? [];
    const ouverts = retours.filter((r) => typeof r.etat === 'string' && ETATS_OUVERTS.includes(r.etat));
    return (
        <Carte titre="Retours ouverts" icone={<Inbox className="icone" aria-hidden="true" />} lien="/retours" requete={requete}>
            <div className="chiffre-cle">{ouverts.length}<small>à traiter sur {retours.length}</small></div>
            <ul className="liste-simple">
                {ouverts.slice(0, 5).map((r) => (
                    <li key={String(r.id)}>
                        <span className="quand">{formaterDate(r.recu_le)}</span>
                        <a className="texte" href={`#/retours/${String(r.id)}`}>{String(r.texte ?? '').trim() || (typeof r.campus === 'string' && r.campus !== '' ? `Campus demandé : ${r.campus}` : '(sans texte)')}</a>
                    </li>
                ))}
                {ouverts.length === 0 ? <li className="secondaire">Rien d’ouvert : tout est traité.</li> : null}
            </ul>
        </Carte>
    );
}

const COLONNES_D_ANNONCE = 'id,titre,statut,active,publiee_le,expire_le,audience';

export function CarteDesAnnonces() {
    const requete = useTout('annonces', COLONNES_D_ANNONCE, SANS_FILTRE);
    const etat = etatDesAnnonces((requete.data ?? []) as unknown as readonly AnnonceLegere[], new Date());
    const ligne = (a: AnnonceLegere, quand: string) => (
        <li key={String(a.id)}>
            <span className="quand">{quand}</span>
            <a className="texte" href={`#/annonces/${String(a.id)}`}>{String(a.titre)}</a>
            {a.audience === 'testeurs' ? <Pastille>testeurs</Pastille> : null}
        </li>
    );
    return (
        <Carte titre="Annonces" icone={<Megaphone className="icone" aria-hidden="true" />} lien="/annonces" requete={requete}>
            <div className="chiffre-cle">{etat.actives.length}<small>active{etat.actives.length > 1 ? 's' : ''}, {etat.programmees.length} programmée{etat.programmees.length > 1 ? 's' : ''}</small></div>
            <ul className="liste-simple">
                {etat.actives.slice(0, 5).map((a) => ligne(a, a.expire_le === null || a.expire_le === undefined ? 'sans fin' : `jusqu’au ${formaterDate(a.expire_le)}`))}
                {etat.programmees.slice(0, 5).map((a) => ligne(a, `le ${formaterDate(a.publiee_le)}`))}
                {etat.actives.length === 0 && etat.programmees.length === 0 ? <li className="secondaire">Aucune annonce visible ni programmée.</li> : null}
            </ul>
            <p className="petit secondaire">{etat.brouillons} brouillon{etat.brouillons > 1 ? 's' : ''}, {etat.archivees} archivée{etat.archivees > 1 ? 's' : ''}.</p>
        </Carte>
    );
}
