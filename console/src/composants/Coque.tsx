/**
 * La coque : la navigation laterale, la barre du haut (le filtre par campus, le menu sous 800 px),
 * le contenu. Elle se montre des la verification de session, sans e-mail ni droits, pour qu'aucun
 * etat ne soit une page blanche (defaut 2 du jalon 7-E).
 *
 * Depuis 7-H, la section du compte porte l'Equipe — pour un admin seulement : la base ne laisse lire
 * toute la table qu'a lui — et le guide de la console ; et le role se lit a cote de l'adresse.
 */

import {
    Activity, Bell, BookOpen, Bug, Building2, ChartLine, Flag, Image, Inbox, KeyRound, LayoutDashboard, Lightbulb, Megaphone, MessageSquare, School, ScrollText, Smile, Tag, UserCog, Users, type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { estAdmin, ROLES, type DroitsDeSession } from '../auth/droits';
import type { Session } from '../auth/session';
import { GUIDE_DE_LA_CONSOLE } from '../lib/liens';
import { RESSOURCES } from '../schema/tables';
import logoUKit from '../../../docs/identite/logo-ukit.svg';
import type { Domaine } from '../lib/theme';
import { NOM_DU_PROJET } from '../supabase';
import { BasculeDeTheme } from './BasculeDeTheme';
import { FiltreCampus } from './FiltreCampus';
import { NavigationMobile } from './NavigationMobile';
import { Pastille } from './ui/Pastille';

const ICONES: Readonly<Record<string, LucideIcon>> = {
    '/': LayoutDashboard, '/statistiques': ChartLine, '/sources': Activity, '/retours': Inbox, '/problemes': Bug, '/idees': Lightbulb, '/jetons': Bell, '/signalements': Flag, '/journal': ScrollText,
    '/annonces': Megaphone, '/messages': MessageSquare, '/testeurs': Users, '/visuels': Image, '/etablissements': School,
    '/salutations': Smile, '/batiments': Building2, '/version': Tag, '/compte': KeyRound, '/equipe': UserCog,
};

export interface Entree {
    readonly vers: string;
    readonly libelle: string;
}

export interface SectionDeNavigation {
    readonly titre: string;
    readonly domaine: Domaine;
    readonly entrees: readonly Entree[];
}

// Ce que les etudiants ecrivent, signalent et soutiennent a sa section, « Communaute » (phase 8, lot 4) :
// les retours, les problemes connus, les idees et les signalements se moderent ensemble, a part de ce qui
// se suit — la mesure, les sources, le journal — et de ce qui se publie.
export const NAVIGATION: readonly SectionDeNavigation[] = [
    {
        titre: 'Suivre',
        domaine: 'suivre',
        entrees: [
            { vers: '/', libelle: 'Tableau de bord' },
            { vers: '/statistiques', libelle: 'Statistiques' },
            { vers: '/sources', libelle: 'Sources' },
            ...RESSOURCES.filter((r) => r.section === 'suivre').map((r) => ({ vers: `/${r.chemin}`, libelle: r.titre })),
            { vers: '/journal', libelle: 'Journal' },
        ],
    },
    {
        titre: 'Communauté',
        domaine: 'suivre',
        entrees: [
            ...RESSOURCES.filter((r) => r.section === 'communaute').map((r) => ({ vers: `/${r.chemin}`, libelle: r.titre })),
            { vers: '/signalements', libelle: 'Signalements' },
        ],
    },
    { titre: 'Publier', domaine: 'publier', entrees: RESSOURCES.filter((r) => r.section === undefined || r.section === 'publier').map((r) => ({ vers: `/${r.chemin}`, libelle: r.titre })) },
];

/** Les entrees de la section du compte : l'equipe pour un admin, puis le guide, ouvert hors de la console. */
export function entreesDuCompte(droits: DroitsDeSession): readonly Entree[] {
    return estAdmin(droits) ? [{ vers: '/equipe', libelle: 'Équipe' }] : [];
}

/** Le role, a cote de l'adresse : rien pour un admin, qui peut tout ; le role sinon ; « sans droits » hors de l'equipe. */
function PastilleDuRole({ droits }: { readonly droits: DroitsDeSession }) {
    if (droits === undefined || droits?.role === 'admin') return null;
    if (droits === null) return <Pastille ton="panne">sans droits</Pastille>;
    return <Pastille>{ROLES.find((r) => r.valeur === droits.role)?.libelle.toLowerCase() ?? droits.role}</Pastille>;
}

export function iconeDe(vers: string): LucideIcon | undefined {
    return ICONES[vers];
}

/** La page active : le chemin, ou son premier segment (`/annonces/<cle>` allume « Annonces »). */
export function estActif(vers: string, chemin: string): boolean {
    return vers === '/' ? chemin === '/' : chemin === vers || chemin.startsWith(`${vers}/`);
}

function Lien({ vers, chemin, children }: { readonly vers: string; readonly chemin: string; readonly children: ReactNode }) {
    const Icone = iconeDe(vers);
    const actif = estActif(vers, chemin);
    return (
        <a href={`#${vers}`} className={`lien-nav ${actif ? 'actif' : ''}`} aria-current={actif ? 'page' : undefined}>
            {Icone === undefined ? null : <Icone className="icone" aria-hidden="true" />}
            {children}
        </a>
    );
}

/** Le domaine de la page : celui de la section qui la porte ; le compte et l'equipe ont le leur. */
export function domaineDe(chemin: string): Domaine {
    if (estActif('/compte', chemin) || estActif('/equipe', chemin)) return 'compte';
    const section = NAVIGATION.find((s) => s.entrees.some((e) => estActif(e.vers, chemin)));
    return section?.domaine ?? 'suivre';
}

/** La barre prend le fond des que la page defile, pour que le contenu passe dessous sans s'y meler. */
function useDefilement(): boolean {
    const [defile, setDefile] = useState(false);
    useEffect(() => {
        const suivre = () => setDefile(window.scrollY > 4);
        suivre();
        window.addEventListener('scroll', suivre, { passive: true });
        return () => window.removeEventListener('scroll', suivre);
    }, []);
    return defile;
}

function Marque() {
    return <div className="marque"><img src={logoUKit} alt="UKit" /><span>console</span></div>;
}

export interface CoqueProps {
    readonly session: Session | null;
    readonly chemin: string;
    readonly children: ReactNode;
}

export function Coque({ session, chemin, children }: CoqueProps) {
    const defile = useDefilement();
    return (
        <div className="coque" data-domaine={domaineDe(chemin)}>
            <nav className="laterale" aria-label="Navigation">
                <Marque />
                {NAVIGATION.map((section) => (
                    <div key={section.titre}>
                        <div className="section">{section.titre}</div>
                        {section.entrees.map((entree) => <Lien key={entree.vers} vers={entree.vers} chemin={chemin}>{entree.libelle}</Lien>)}
                    </div>
                ))}
                <div className="section">Compte</div>
                {entreesDuCompte(session?.droits).map((entree) => <Lien key={entree.vers} vers={entree.vers} chemin={chemin}>{entree.libelle}</Lien>)}
                <a href={GUIDE_DE_LA_CONSOLE} className="lien-nav" target="_blank" rel="noreferrer"><BookOpen className="icone" aria-hidden="true" />Guide</a>
                <Lien vers="/compte" chemin={chemin}>
                    <span className="compte" title={session?.email}>{session === null ? 'Vérification…' : session.email}</span>
                    <PastilleDuRole droits={session?.droits} />
                </Lien>
                <div className="pied">
                    <BasculeDeTheme />
                    <div className="projet">{NOM_DU_PROJET}</div>
                </div>
            </nav>
            <div className="colonne">
                <header className="barre" data-defile={defile ? 'oui' : 'non'}>
                    <NavigationMobile chemin={chemin} droits={session?.droits} />
                    <Marque />
                    <span className="espace" />
                    <FiltreCampus />
                </header>
                <main className="contenu">{children}</main>
            </div>
        </div>
    );
}
