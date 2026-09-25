/**
 * La coque : la navigation laterale, la barre du haut (le filtre par campus, le menu sous 800 px),
 * le contenu. Elle se montre des la verification de session, sans e-mail ni droits, pour qu'aucun
 * etat ne soit une page blanche (defaut 2 du jalon 7-E).
 *
 * Depuis 7-H, la section du compte porte l'Equipe — pour un admin seulement : la base ne laisse lire
 * toute la table qu'a lui — et le guide de la console ; et le role se lit a cote de l'adresse.
 */

import {
    Activity, Bell, BookOpen, Building2, Image, Inbox, KeyRound, LayoutDashboard, Megaphone, MessageSquare, School, ScrollText, Smile, Tag, UserCog, Users, type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { estAdmin, ROLES, type DroitsDeSession } from '../auth/droits';
import type { Session } from '../auth/session';
import { GUIDE_DE_LA_CONSOLE } from '../lib/liens';
import { RESSOURCES } from '../schema/tables';
import { NOM_DU_PROJET } from '../supabase';
import { FiltreCampus } from './FiltreCampus';
import { NavigationMobile } from './NavigationMobile';
import { Pastille } from './ui/Pastille';

const ICONES: Readonly<Record<string, LucideIcon>> = {
    '/': LayoutDashboard, '/sources': Activity, '/retours': Inbox, '/jetons': Bell, '/journal': ScrollText,
    '/annonces': Megaphone, '/messages': MessageSquare, '/testeurs': Users, '/visuels': Image, '/etablissements': School,
    '/salutations': Smile, '/batiments': Building2, '/version': Tag, '/compte': KeyRound, '/equipe': UserCog,
};

export interface Entree {
    readonly vers: string;
    readonly libelle: string;
}

export interface SectionDeNavigation {
    readonly titre: string;
    readonly entrees: readonly Entree[];
}

// Les retours se lisent, ils ne se publient pas : ils vont avec les sources et le journal.
export const NAVIGATION: readonly SectionDeNavigation[] = [
    {
        titre: 'Suivre',
        entrees: [
            { vers: '/', libelle: 'Tableau de bord' },
            { vers: '/sources', libelle: 'Sources' },
            ...RESSOURCES.filter((r) => r.section === 'suivre').map((r) => ({ vers: `/${r.chemin}`, libelle: r.titre })),
            { vers: '/journal', libelle: 'Journal' },
        ],
    },
    { titre: 'Publier', entrees: RESSOURCES.filter((r) => r.section === undefined || r.section === 'publier').map((r) => ({ vers: `/${r.chemin}`, libelle: r.titre })) },
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

export interface CoqueProps {
    readonly session: Session | null;
    readonly chemin: string;
    readonly children: ReactNode;
}

export function Coque({ session, chemin, children }: CoqueProps) {
    return (
        <div className="coque">
            <nav className="laterale" aria-label="Navigation">
                <div className="marque"><strong>UKit</strong><span>console</span></div>
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
                <div className="pied">{NOM_DU_PROJET}</div>
            </nav>
            <div className="colonne">
                <header className="barre">
                    <NavigationMobile chemin={chemin} droits={session?.droits} />
                    <div className="marque"><strong>UKit</strong><span>console</span></div>
                    <span className="espace" />
                    <FiltreCampus />
                </header>
                <main className="contenu">{children}</main>
            </div>
        </div>
    );
}
