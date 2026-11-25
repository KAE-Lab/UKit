/**
 * Le rapport partenaire (7-G) : pour une annonce, ou toutes celles d'un partenaire, sur la periode
 * choisie, l'entonnoir par campus et par semaine, et la definition de chaque chiffre en bas. Il
 * s'exporte en CSV et s'imprime en PDF par la feuille d'impression du navigateur, sur une mise en page
 * dediee (`styles/statistiques.css`) : seul l'article du rapport part a l'impression, en theme clair.
 */

import { Download, Printer } from 'lucide-react';
import { useMemo } from 'react';

import { Chiffre, DetailDeTaux, RangeeDeChiffres } from '../../composants/stats/Chiffres';
import { Bouton } from '../../composants/ui/Bouton';
import { EtatVide } from '../../composants/ui/EtatVide';
import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { Segments } from '../../composants/ui/Segments';
import { Selecteur } from '../../composants/ui/Selecteur';
import { slug } from '../../lib/cle';
import { exporterCsv } from '../../lib/telechargement';
import { classement, tauxAffiche } from '../../stats/annonces';
import { formaterCompte } from '../../stats/formats';
import { libelleDePeriode } from '../../stats/periode';
import { csvDuRapport, DEFINITIONS, libelleDuCampus, rapport, type Rapport as DonneesDuRapport } from '../../stats/rapport';
import { useAnnoncesNommees } from './annonces';
import { poserParams, useLignes, type Choix, type Lignes } from './choix';
import { useNomDuCampus } from './libelles';
import { TableDEntonnoir } from './TableDEntonnoir';

type Sujet = { readonly type: 'annonce'; readonly id: string } | { readonly type: 'partenaire'; readonly nom: string } | null;

function sujetDe(params: URLSearchParams): Sujet {
    const id = params.get('annonce');
    if (id !== null && id !== '') return { type: 'annonce', id };
    const nom = params.get('partenaire');
    if (nom !== null && nom !== '') return { type: 'partenaire', nom };
    return null;
}

function Corps({ r, sujet, nomDuCampus, choix }: { readonly r: DonneesDuRapport; readonly sujet: string; readonly nomDuCampus: (code: string) => string; readonly choix: Choix }) {
    const total = r.totalAffiche;
    return (
        <article className="rapport" aria-label={`Rapport : ${sujet}`}>
            <header className="tete-de-rapport">
                <span className="secondaire">Rapport UKit</span>
                <h2>{sujet}</h2>
                <p className="secondaire">
                    {libelleDePeriode(r.periode)}
                    {choix.filtre.campus === null ? '' : `, ${nomDuCampus(choix.filtre.campus)} seulement`}
                    {choix.filtre.testeurs ? ', appareils testeurs inclus' : ''}
                </p>
            </header>
            <RangeeDeChiffres etiquette="L’entonnoir sur la période">
                <Chiffre libelle="Impressions" valeur={formaterCompte(total.impressions)} />
                <Chiffre libelle="Ouvertures" valeur={formaterCompte(total.ouvertures)} detail={<DetailDeTaux taux={tauxAffiche(total.ouvertures, total.impressions)} de="des impressions" denominateur="impressions" />} />
                <Chiffre libelle="Actions" valeur={formaterCompte(total.actions)} detail={<DetailDeTaux taux={tauxAffiche(total.actions, total.ouvertures)} de="des ouvertures" denominateur="ouvertures" />} />
            </RangeeDeChiffres>
            <section className="section-de-rapport">
                <h3>Par campus</h3>
                <TableDEntonnoir premiereColonne="Campus" lignes={r.parCampus.map((c) => ({ cle: c.cle, libelle: libelleDuCampus(c.cle, nomDuCampus), affiche: c.affiche }))} vide="Rien sur la période." />
            </section>
            <section className="section-de-rapport">
                <h3>Par semaine</h3>
                <TableDEntonnoir premiereColonne="Semaine" lignes={r.parSemaine.map((s) => ({ cle: s.cle, libelle: libelleDePeriode(s.semaine), affiche: s.affiche }))} vide="Rien sur la période." />
            </section>
            <section className="section-de-rapport definitions">
                <h3>Ce que disent les chiffres</h3>
                <dl>{DEFINITIONS.map((d) => <div key={d.terme}><dt>{d.terme}</dt><dd>{d.definition}</dd></div>)}</dl>
            </section>
        </article>
    );
}

/** Les annonces a proposer : celles vues sur la periode d'abord, puis les autres ; et les partenaires. */
function useSujets(lignes: Lignes | undefined) {
    const { annonces, titreDe, requete } = useAnnoncesNommees();
    const vues = useMemo(() => (lignes === undefined ? [] : classement(lignes.courantes).map((a) => a.cle)), [lignes]);
    const optionsDAnnonces = useMemo(() => {
        const ids = [...vues, ...annonces.map((a) => a.id).filter((id) => !vues.includes(id))];
        return ids.map((id) => ({ valeur: id as string | null, libelle: titreDe(id) }));
    }, [vues, annonces, titreDe]);
    const partenaires = useMemo(() => [...new Set(annonces.map((a) => a.partenaire).filter((p) => p !== ''))].sort((a, b) => a.localeCompare(b)), [annonces]);
    // Avant la liste des annonces, un rapport sortirait titre « Annonce retiree », ou vide pour un partenaire.
    return { annonces, titreDe, optionsDAnnonces, partenaires, charge: requete.data !== undefined };
}

function Outils({ choix, mode, annonce, partenaire, sujets, pret, exporter }: {
    readonly choix: Choix;
    readonly mode: 'annonce' | 'partenaire';
    readonly annonce: string | null;
    readonly partenaire: string | null;
    readonly sujets: ReturnType<typeof useSujets>;
    readonly pret: boolean;
    readonly exporter: () => void;
}) {
    const { optionsDAnnonces, partenaires } = sujets;
    const choisir = (cle: 'annonce' | 'partenaire', valeur: string | null) => poserParams(choix, (params) => {
        params.delete('annonce');
        params.delete('partenaire');
        params.delete('mode');
        if (valeur !== null) params.set(cle, valeur);
        else if (cle === 'partenaire') params.set('mode', 'partenaire');
    });
    const optionsDePartenaires = [{ valeur: null, libelle: partenaires.length === 0 ? 'Aucun partenaire' : 'Choisir un partenaire' }, ...partenaires.map((p) => ({ valeur: p as string | null, libelle: p }))];
    return (
        <div className="outils-de-rapport non-imprime">
            <Segments valeur={mode} options={[{ valeur: 'annonce', libelle: 'Une annonce' }, { valeur: 'partenaire', libelle: 'Un partenaire' }]} onChange={(v) => choisir(v, null)} etiquette="Le sujet du rapport" />
            {mode === 'annonce'
                ? <Selecteur valeur={annonce} options={[{ valeur: null, libelle: 'Choisir une annonce' }, ...optionsDAnnonces]} onChange={(v) => choisir('annonce', v)} etiquette="Annonce" />
                : <Selecteur valeur={partenaire} options={optionsDePartenaires} onChange={(v) => choisir('partenaire', v)} etiquette="Partenaire" desactive={partenaires.length === 0} />}
            <span className="espace" />
            <Bouton variante="tonal" compact icone={<Download className="icone" aria-hidden="true" />} disabled={!pret} onClick={exporter}>Exporter en CSV</Bouton>
            <Bouton variante="tonal" compact icone={<Printer className="icone" aria-hidden="true" />} disabled={!pret} onClick={() => window.print()}>Imprimer</Bouton>
        </div>
    );
}

export function Rapport({ choix }: { readonly choix: Choix }) {
    const { lignes, lecture } = useLignes(choix);
    const sujets = useSujets(lignes);
    const nomDuCampus = useNomDuCampus();
    const sujet = sujetDe(choix.params);
    const annonce = sujet?.type === 'annonce' ? sujet.id : null;
    const partenaire = sujet?.type === 'partenaire' ? sujet.nom : null;
    const mode = sujet?.type ?? (choix.params.get('mode') === 'partenaire' ? 'partenaire' : 'annonce');
    const { du, au } = choix.periode;
    const { annonces, charge } = sujets;
    const donnees = useMemo(() => {
        if (lignes === undefined || !charge || (annonce === null && partenaire === null)) return undefined;
        const ids = annonce !== null ? new Set([annonce]) : new Set(annonces.filter((a) => a.partenaire === partenaire).map((a) => a.id));
        return rapport(lignes.courantes, (cle) => ids.has(cle), { du, au });
    }, [lignes, charge, annonce, partenaire, annonces, du, au]);
    const titre = annonce !== null ? sujets.titreDe(annonce) : `Les annonces de ${partenaire ?? ''}`;
    const exporter = () => {
        if (donnees === undefined) return;
        const csv = csvDuRapport(donnees, { sujet: titre, nomDuCampus, testeurs: choix.filtre.testeurs });
        exporterCsv(`rapport-${slug(titre).slice(0, 40)}-${donnees.periode.du}-${donnees.periode.au}.csv`, csv);
    };
    const vide = mode === 'partenaire' && sujets.partenaires.length === 0 ? 'Aucune annonce ne porte encore de partenaire.' : 'Choisis le sujet du rapport.';
    return (
        <div className="pile-stats">
            <Outils choix={choix} mode={mode} annonce={annonce} partenaire={partenaire} sujets={sujets} pret={donnees !== undefined} exporter={exporter} />
            {lecture.enErreur ? <div className="carte"><ErreurDeLecture erreur={lecture.erreur} reessayer={lecture.relire} enCours={lecture.enCours} /></div> : null}
            {sujet === null ? <div className="carte"><EtatVide>{vide}</EtatVide></div> : null}
            {donnees === undefined ? null : <div className="carte"><Corps r={donnees} sujet={titre} nomDuCampus={nomDuCampus} choix={choix} /></div>}
        </div>
    );
}
