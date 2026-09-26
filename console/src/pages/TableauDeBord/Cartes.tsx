/**
 * Les cartes du tableau de bord : le parc actif, les retours ouverts, les annonces. Chacune lit sa
 * propre requete et porte son squelette et son erreur, a sa place.
 */

import { Bell, Inbox, Megaphone } from 'lucide-react';
import type { ReactNode } from 'react';

import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { SqueletteBloc, SqueletteTexte } from '../../composants/ui/Squelette';
import { formaterDate } from '../../lib/dates';
import { useCampusChoisi } from '../../composants/campus';
import { SANS_FILTRE, useTout } from '../../requetes/useListe';
import { ETATS_OUVERTS } from '../../schema/tables/retours';
import { etatDesAnnonces, type AnnonceLegere } from './annonces';
import { libelleDeCase, parcActif, type Case, type Jeton } from './parc';

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

function Cases({ titre, cases }: { readonly titre: string; readonly cases: readonly Case[] }) {
    return (
        <div>
            <h3>{titre}</h3>
            <table className="tableau-compact"><tbody>
                {cases.length === 0 ? <tr><td className="secondaire">—</td></tr> : cases.map((c) => <tr key={c.cle}><td>{c.cle}</td><td className="nombre">{libelleDeCase(c.n)}</td></tr>)}
            </tbody></table>
        </div>
    );
}

const COLONNES_DE_JETON = 'etablissement,version,plateforme,testeur,maj_le';

export function CarteDuParc() {
    const campus = useCampusChoisi();
    const requete = useTout('jetons_push', COLONNES_DE_JETON, SANS_FILTRE);
    const jetons = (requete.data ?? []).filter((j) => campus === null || j.etablissement === campus) as unknown as readonly Jeton[];
    const parc = parcActif(jetons, new Date());
    return (
        <Carte titre="Parc actif" icone={<Bell className="icone" aria-hidden="true" />} lien="/jetons" requete={requete}>
            <div className="chiffre-cle">{parc.total}<small>appareils avec notifications, 14 jours{campus === null ? '' : `, ${campus}`}</small></div>
            <div className="trois-colonnes">
                <Cases titre="Par campus" cases={parc.parCampus} />
                <Cases titre="Par version" cases={parc.parVersion} />
                <Cases titre="Par plateforme" cases={parc.parPlateforme} />
            </div>
            <p className="petit secondaire">Un minorant : un appareil qui a coupé les notifications n’y est pas. Aucune case sous cinq n’est affichée (docs/mesure.md).</p>
        </Carte>
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
            {a.audience === 'testeurs' ? <span className="pastille avert">testeurs</span> : null}
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
