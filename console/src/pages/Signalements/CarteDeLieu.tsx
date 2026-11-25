/**
 * Un lieu, dans la page Signalements : l'etat de chacun de ses sujets tel que l'application le montre,
 * l'etat officiel a publier ou a retirer, puis ses signalements, ligne par ligne, avec les gestes de la
 * moderation. Un appareil se designe par l'un de ses signalements : sa cle ne vient jamais jusqu'ici.
 */

import { useState, type ReactNode } from 'react';

import type { EtatDuSujet } from '../../../../src/shared/communaute/lieu';
import { sujetDeLieu, sujetsDuDomaine, type SujetDeLieu } from '../../../../src/shared/communaute/vocabulaire';
import { jourDeParis } from '../../../../src/shared/communaute/donnees';
import { Bouton } from '../../composants/ui/Bouton';
import { Pastille } from '../../composants/ui/Pastille';
import { Selecteur } from '../../composants/ui/Selecteur';
import { depuis, formaterDateDeListe } from '../../lib/dates';
import { libelleDeValeur, libelleDuLieu, libelleDuSujet } from './libelles';
import { finDeLOfficiel, type Lieu, type SignalementModere } from './moderation';

export interface Gestes {
    readonly dialogue: ReactNode;
    masquer(id: string): Promise<void>;
    retablir(id: string): Promise<void>;
    bloquer(id: string, bloque: boolean): Promise<void>;
    publier(etat: { readonly sujet: string; readonly cible: string; readonly valeur: string; readonly fin: string }): Promise<void>;
    retirer(id: string): Promise<void>;
}

interface Props {
    readonly lieu: Lieu;
    readonly instant: number;
    readonly admin: boolean;
    readonly gestes: Gestes;
    /** La cle du geste en cours (un signalement, un etat officiel, `sujet|cible`) : son bouton attend. */
    readonly enCours: string | null;
}

const iso = (ms: number) => new Date(ms).toISOString();

/** Ce qui peut devenir un etat officiel : ce qui dure, jamais le direct, jamais le plat. */
function officialisable(sujet: SujetDeLieu): boolean {
    return sujet.famille !== 'direct' && sujet.sujet !== 'restaurant.plat';
}

/** Ce que l'application dit d'un sujet, en clair ; `null` quand elle n'en dit rien. */
function EtatDUnSujet({ etat, lieu, instant, admin, gestes, enCours }: { readonly etat: EtatDuSujet } & Props) {
    const { officiel, communaute, enRetrait } = etat.etat;
    const valeur = (v: string) => libelleDeValeur(etat.sujet, v);
    let pastille: ReactNode = null;
    let detail = '';
    if (officiel !== null) {
        pastille = <Pastille ton="accent">officiel : {valeur(officiel.valeur)}</Pastille>;
        detail = `jusqu’au ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(`${officiel.fin ?? ''}T12:00:00`))}`;
    } else if (communaute.nature === 'etabli') {
        pastille = <Pastille ton={communaute.voix > 1 ? 'ok' : 'neutre'}>établi : {valeur(communaute.valeur)}</Pastille>;
        detail = `${communaute.voix} voix, confirmé il y a ${depuis(iso(communaute.confirmeLe), new Date(instant))}`;
    } else if (communaute.nature === 'incertain') {
        pastille = <Pastille ton="avert">incertain : {valeur(communaute.valeur)}</Pastille>;
        detail = `contredit : ${valeur(communaute.contraire ?? '')}`;
    } else if (enRetrait.length > 0) {
        pastille = <Pastille>non vérifié : {valeur(enRetrait[0]!.valeur)}</Pastille>;
        detail = `${enRetrait.length} contribution${enRetrait.length > 1 ? 's' : ''} sans attestation`;
    }
    if (pastille === null) return null;
    const cle = `${etat.sujet.sujet}|${lieu.cible}`;
    // La valeur que la communaute etablit, a rendre officielle. Le plat se classe, il ne s'officialise
    // pas ; un direct ne vaut que quelques minutes, et un officiel le figerait jusqu'au soir.
    const aPromouvoir = officiel === null && communaute.nature !== 'sans_info' && officialisable(etat.sujet) ? communaute.valeur : null;
    return (
        <div className="etat-du-lieu">
            <span className="sujet">{libelleDuSujet(etat.sujet.sujet)}</span>
            {pastille}
            <span className="secondaire">{detail}</span>
            <span className="espace" />
            {officiel !== null ? (
                <Bouton variante="discret" compact disabled={!admin} enAttente={enCours === officiel.id} onClick={() => { void gestes.retirer(officiel.id); }}>Retirer l’officiel</Bouton>
            ) : aPromouvoir !== null ? (
                <Bouton
                    variante="tonal"
                    compact
                    disabled={!admin}
                    enAttente={enCours === cle}
                    onClick={() => { void gestes.publier({ sujet: etat.sujet.sujet, cible: lieu.cible, valeur: aPromouvoir, fin: finDeLOfficiel(etat, jourDeParis(new Date())) }); }}
                >
                    Rendre officiel
                </Bouton>
            ) : null}
        </div>
    );
}

/** Publier un etat officiel que la communaute n'a pas dit : un sujet a valeurs, une valeur, un dernier jour. */
function Publication({ lieu, admin, gestes, enCours }: Props) {
    const sujets = sujetsDuDomaine(lieu.domaine).filter((s) => s.valeurs !== null && officialisable(s));
    const aujourdHui = jourDeParis(new Date());
    const [sujet, setSujet] = useState<string>(sujets[0]?.sujet ?? '');
    const [valeur, setValeur] = useState<string>('oui');
    const [fin, setFin] = useState(aujourdHui);
    const choisi = sujetDeLieu(sujet);
    const valeurs = choisi?.valeurs ?? [];
    const valeurRetenue = valeurs.includes(valeur) ? valeur : (valeurs[0] ?? '');
    return (
        <div className="officiel-a-publier">
            <span className="etiquette">État officiel</span>
            <Selecteur etiquette="Sujet de l’état officiel" compact desactive={!admin} valeur={sujet} options={sujets.map((s) => ({ valeur: s.sujet, libelle: libelleDuSujet(s.sujet) }))} onChange={setSujet} />
            <Selecteur etiquette="Valeur" compact desactive={!admin} valeur={valeurRetenue} options={valeurs.map((v) => ({ valeur: v, libelle: libelleDeValeur(choisi, v) }))} onChange={setValeur} />
            <label className="filtre">
                <span className="etiquette">jusqu’au</span>
                <input type="date" value={fin} min={aujourdHui} disabled={!admin} onChange={(e) => setFin(e.target.value)} />
            </label>
            <Bouton
                variante="plein"
                compact
                disabled={!admin || valeurRetenue === '' || fin < aujourdHui}
                enAttente={enCours === `${sujet}|${lieu.cible}`}
                onClick={() => { void gestes.publier({ sujet, cible: lieu.cible, valeur: valeurRetenue, fin }); }}
            >
                Publier
            </Bouton>
        </div>
    );
}

function Voix({ s }: { readonly s: SignalementModere }) {
    if (s.poids === 0) return <Pastille ton="avert">non vérifié</Pastille>;
    return <>{s.poids === 2 ? '2, fiable' : '1'}</>;
}

function Statut({ s }: { readonly s: SignalementModere }) {
    if (s.statut === 'masquee') return <Pastille ton="panne">masqué</Pastille>;
    return s.statut === 'remplacee' ? <span className="secondaire">remplacé</span> : <>actif</>;
}

function LigneDeSignalement({ s, admin, gestes, enCours, instant }: { readonly s: SignalementModere } & Pick<Props, 'admin' | 'gestes' | 'enCours' | 'instant'>) {
    const sujet = sujetDeLieu(s.sujet);
    const valeur = libelleDeValeur(sujet, s.valeur);
    return (
        <tr>
            <td title={new Date(s.creeLe).toLocaleString('fr-FR')}>{formaterDateDeListe(iso(s.creeLe), new Date(instant))}</td>
            <td>{libelleDuSujet(s.sujet)}</td>
            <td className="tronque" title={valeur}>{valeur}{s.fin !== null ? ` (jusqu’au ${s.fin.slice(8, 10)}/${s.fin.slice(5, 7)})` : ''}</td>
            <td><Voix s={s} /></td>
            <td><Statut s={s} /></td>
            <td>{s.auteurBloque ? <Pastille ton="panne">bloqué</Pastille> : <span className="secondaire">{s.auteurDuJour} ce jour-là</span>}</td>
            <td>
                <div className="boutons fin">
                    {s.statut === 'masquee' ? (
                        <Bouton variante="discret" compact disabled={!admin || s.auteurBloque} enAttente={enCours === s.id} onClick={() => { void gestes.retablir(s.id); }}>Rétablir</Bouton>
                    ) : (
                        <Bouton variante="tonal" compact disabled={!admin} enAttente={enCours === s.id} onClick={() => { void gestes.masquer(s.id); }}>Masquer</Bouton>
                    )}
                    <Bouton variante={s.auteurBloque ? 'discret' : 'destructif'} compact disabled={!admin} onClick={() => { void gestes.bloquer(s.id, !s.auteurBloque); }}>
                        {s.auteurBloque ? 'Débloquer' : 'Bloquer l’appareil'}
                    </Bouton>
                </div>
            </td>
        </tr>
    );
}

export function CarteDeLieu(props: Props) {
    const { lieu } = props;
    return (
        <section className="carte" aria-label={libelleDuLieu(lieu.domaine, lieu.cible)}>
            <h2>{libelleDuLieu(lieu.domaine, lieu.cible)}</h2>
            <div className="etats-du-lieu">
                {lieu.etats.map((etat) => <EtatDUnSujet key={etat.sujet.sujet} etat={etat} {...props} />)}
            </div>
            <Publication {...props} />
            {lieu.signalements.length === 0 ? null : (
                <div className="defilable">
                    <table className="tableau">
                        <thead>
                            <tr><th>Quand</th><th>Type</th><th>Valeur</th><th>Voix</th><th>État</th><th>Auteur</th><th><span className="visuellement-cache">Gestes</span></th></tr>
                        </thead>
                        <tbody>
                            {lieu.signalements.map((s) => <LigneDeSignalement key={s.id} s={s} {...props} />)}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
