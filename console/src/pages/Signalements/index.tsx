/**
 * La page Signalements (phase 8, lot 2 ; docs/phase-8/2-signalements.md) : ce que les etudiants signalent
 * sur les restaurants, les bibliotheques et les batiments, lieu par lieu, avec l'etat que l'application
 * en tire ; et les gestes de la moderation, ceux d'un admin — masquer une voix ou la retablir, bloquer
 * l'appareil qui l'a ecrite sans jamais voir sa cle, publier un etat officiel qui passe devant.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { SUJETS, type DomaineDeLieu } from '../../../../src/shared/communaute/vocabulaire';
import { peutEcrire } from '../../auth/droits';
import { useDroits } from '../../auth/session';
import { BandeauDeDroits } from '../../composants/BandeauDeDroits';
import { Chiffre, RangeeDeChiffres } from '../../composants/stats/Chiffres';
import { useConfirmation } from '../../composants/ui/Confirmation';
import { PlaceDEncart, type RetourDeGeste } from '../../composants/ui/Encart';
import { ErreurDeLecture } from '../../composants/ui/ErreurDeLecture';
import { EtatVide } from '../../composants/ui/EtatVide';
import { Segments } from '../../composants/ui/Segments';
import { Selecteur } from '../../composants/ui/Selecteur';
import { SqueletteBloc } from '../../composants/ui/Squelette';
import { messageDErreur } from '../../lib/erreurs';
import { cles } from '../../requetes/client';
import { naviguer, useRoute } from '../../routeur';
import { CarteDeLieu, type Gestes } from './CarteDeLieu';
import { bloquer, lireLaModeration, lireLesOfficiels, moderer, publierUnOfficiel, retirerUnOfficiel } from './gestes';
import { DOMAINES, libelleDuSujet } from './libelles';
import { compter, lieux, type Filtre, type StatutFiltre } from './moderation';

type Periode = 'jour' | 'semaine' | 'mois';

const PERIODES: readonly { valeur: Periode; libelle: string }[] = [
    { valeur: 'jour', libelle: 'Aujourd’hui' }, { valeur: 'semaine', libelle: '7 jours' }, { valeur: 'mois', libelle: '30 jours' },
];
const STATUTS: readonly { valeur: StatutFiltre; libelle: string }[] = [
    { valeur: 'tous', libelle: 'Tous' }, { valeur: 'active', libelle: 'Actifs' }, { valeur: 'non_verifie', libelle: 'Non vérifiés' }, { valeur: 'masquee', libelle: 'Masqués' },
];

/** Le debut d'une periode, a minuit local : l'equipe est a Paris, comme les jours de la base. */
function debutDe(periode: Periode, maintenant: Date): string {
    const d = new Date(maintenant);
    d.setHours(0, 0, 0, 0);
    if (periode === 'semaine') d.setDate(d.getDate() - 6);
    if (periode === 'mois') d.setDate(d.getDate() - 29);
    return d.toISOString();
}

function lireLeFiltre(params: URLSearchParams): { periode: Periode; filtre: Filtre } {
    const periode = PERIODES.find((p) => p.valeur === params.get('periode'))?.valeur ?? 'jour';
    const domaine = (Object.keys(DOMAINES) as DomaineDeLieu[]).find((d) => d === params.get('domaine')) ?? null;
    const sujet = SUJETS.find((s) => s.sujet === params.get('sujet') && (domaine === null || s.domaine === domaine))?.sujet ?? null;
    const statut = STATUTS.find((s) => s.valeur === params.get('statut'))?.valeur ?? 'tous';
    return { periode, filtre: { domaine, sujet, statut } };
}

/** La lecture, et les gestes qui l'invalident : chaque geste relit la page et le journal. */
function useModeration(setRetour: (r: RetourDeGeste | null) => void): { gestes: Gestes; enCours: string | null } {
    const client = useQueryClient();
    const [enCours, setEnCours] = useState<string | null>(null);
    const { demander, dialogue } = useConfirmation();
    const faire = async (cle: string, geste: () => Promise<string>) => {
        setEnCours(cle);
        setRetour(null);
        try {
            setRetour({ ton: 'ok', texte: await geste() });
        } catch (echec) {
            setRetour({ ton: 'erreur', texte: messageDErreur(echec) });
        } finally {
            setEnCours(null);
            await Promise.all([
                client.invalidateQueries({ queryKey: cles.table('signalements') }),
                client.invalidateQueries({ queryKey: cles.table('etats_officiels') }),
                client.invalidateQueries({ queryKey: cles.table('journal') }),
            ]);
        }
    };
    const gestes: Gestes = {
        dialogue,
        masquer: (id) => faire(id, async () => { await moderer(id, 'masquer'); return 'Masqué : l’application ne le compte plus.'; }),
        retablir: (id) => faire(id, async () => { await moderer(id, 'retablir'); return 'Rétabli.'; }),
        bloquer: async (id, bloque) => {
            if (bloque && !(await demander({
                titre: 'Bloquer cet appareil ?',
                texte: 'Ses voix encore valables sont masquées, sa réputation repart de zéro, et ce qu’il écrira sera refusé. Sa clé n’est jamais montrée : on le désigne par ce signalement.',
                confirmer: 'Bloquer', destructif: true,
            }))) return;
            await faire(id, async () => {
                const n = await bloquer(id, bloque);
                return bloque ? `Appareil bloqué, ${n} voix masquée${n > 1 ? 's' : ''}.` : 'Appareil débloqué : ses voix masquées le restent.';
            });
        },
        publier: (etat) => faire(`${etat.sujet}|${etat.cible}`, async () => { await publierUnOfficiel(etat); return 'État officiel publié : il passe devant celui des étudiants.'; }),
        retirer: async (id) => {
            if (!(await demander({ titre: 'Retirer cet état officiel ?', texte: 'L’application montre de nouveau ce que disent les étudiants.', confirmer: 'Retirer', destructif: true }))) return;
            await faire(id, async () => { await retirerUnOfficiel(id); return 'État officiel retiré.'; });
        },
    };
    return { gestes, enCours };
}

export function Signalements() {
    const { params } = useRoute();
    const { periode, filtre } = lireLeFiltre(params);
    const admin = peutEcrire(useDroits(), 'signalements');
    const [retour, setRetour] = useState<RetourDeGeste | null>(null);
    const depuis = debutDe(periode, new Date());
    const signalements = useQuery({ queryKey: [...cles.table('signalements'), 'moderation', depuis], queryFn: () => lireLaModeration(depuis) });
    const officiels = useQuery({ queryKey: [...cles.table('etats_officiels'), 'moderation', depuis], queryFn: () => lireLesOfficiels(depuis) });
    const { gestes, enCours } = useModeration(setRetour);

    // L'etat d'un lieu se dit a l'instant de la lecture : celui que l'application aurait montre alors.
    const instant = signalements.dataUpdatedAt;
    const { domaine, sujet, statut } = filtre;
    const calcules = useMemo(() => {
        if (signalements.data === undefined || officiels.data === undefined) return null;
        const f = { domaine, sujet, statut };
        return { lieux: lieux(signalements.data, officiels.data, f, instant), comptes: compter(signalements.data, f) };
    }, [signalements.data, officiels.data, domaine, sujet, statut, instant]);

    const poser = (cle: string, valeur: string | null) => {
        const suivants = new URLSearchParams(params);
        if (valeur === null) suivants.delete(cle); else suivants.set(cle, valeur);
        if (cle === 'domaine') suivants.delete('sujet');
        naviguer('/signalements', suivants, { remplacer: true });
    };
    const optionsDeSujet = [{ valeur: null, libelle: 'Tous les types' }, ...SUJETS
        .filter((s) => filtre.domaine === null || s.domaine === filtre.domaine)
        .map((s) => ({ valeur: s.sujet, libelle: filtre.domaine === null ? `${DOMAINES[s.domaine]} : ${libelleDuSujet(s.sujet).toLowerCase()}` : libelleDuSujet(s.sujet) }))];
    const erreur = signalements.error ?? officiels.error;

    return (
        <>
            <div className="entete-page">
                <div>
                    <h1>Signalements</h1>
                    <p className="sous-titre">
                        Ce que les étudiants signalent sur les restaurants, les bibliothèques et les bâtiments, lieu par lieu, avec l’état que
                        l’application en tire : ce qui s’est écrit pendant la période, et tout ce qui vaut encore. Masquer retire une voix de
                        l’application ; bloquer masque toutes celles d’un appareil et refuse les suivantes ; un état officiel passe devant ceux des
                        étudiants.
                    </p>
                </div>
            </div>
            <BandeauDeDroits table="signalements" />
            <PlaceDEncart retour={retour} />
            <div className="outils-liste">
                <Segments etiquette="Période" valeur={periode} options={PERIODES} onChange={(v) => poser('periode', v === 'jour' ? null : v)} />
                <Selecteur
                    etiquette="Lieu"
                    compact
                    valeur={filtre.domaine}
                    options={[{ valeur: null, libelle: 'Tous les lieux' }, ...(Object.keys(DOMAINES) as DomaineDeLieu[]).map((d) => ({ valeur: d, libelle: `${DOMAINES[d]}s` }))]}
                    onChange={(v) => poser('domaine', v)}
                />
                <Selecteur etiquette="Type" compact valeur={filtre.sujet} options={optionsDeSujet} onChange={(v) => poser('sujet', v)} />
                <Segments etiquette="État" valeur={filtre.statut} options={STATUTS} onChange={(v) => poser('statut', v === 'tous' ? null : v)} />
            </div>
            <RangeeDeChiffres etiquette="Les signalements de la période">
                <Chiffre libelle="Signalements" valeur={calcules === null ? undefined : String(calcules.comptes.signalements)} />
                <Chiffre libelle="Voix comptées" valeur={calcules === null ? undefined : String(calcules.comptes.voix)} />
                <Chiffre libelle="Non vérifiés" valeur={calcules === null ? undefined : String(calcules.comptes.nonVerifies)} />
                <Chiffre libelle="Masqués" valeur={calcules === null ? undefined : String(calcules.comptes.masques)} />
                <Chiffre libelle="Lieux" valeur={calcules === null ? undefined : String(calcules.comptes.lieux)} />
            </RangeeDeChiffres>
            {erreur !== null ? (
                <div className="carte"><ErreurDeLecture erreur={erreur} reessayer={() => { void signalements.refetch(); void officiels.refetch(); }} /></div>
            ) : calcules === null ? (
                <div className="carte"><SqueletteBloc hauteur={220} /></div>
            ) : calcules.lieux.length === 0 ? (
                <div className="carte"><EtatVide>Aucun signalement pour ces filtres.</EtatVide></div>
            ) : (
                <div className="pile-stats">
                    {calcules.lieux.map((lieu) => (
                        <CarteDeLieu key={`${lieu.domaine}|${lieu.cible}`} lieu={lieu} instant={instant} admin={admin} gestes={gestes} enCours={enCours} />
                    ))}
                </div>
            )}
            {gestes.dialogue}
        </>
    );
}
