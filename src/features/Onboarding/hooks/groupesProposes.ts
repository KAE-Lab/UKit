/**
 * Les groupes que l'etape de l'accueil propose, selon l'annee, le semestre et le texte saisis.
 *
 * Sorti de `useWelcomeState` le 2026-11-10 pour se tester sans React Native, avec deux corrections
 * mesurees sur la liste reelle de Celcat (2 982 groupes) :
 *
 *   - **un nom qui dit son niveau est cru d'abord.** Les fragments ci-dessous sont des sous-chaines :
 *     `50` (Licence 3, automne) se trouve dans `31ST750U M1 Professionnalisation`, `10` (Licence 1)
 *     dans `M2 … S10`, si bien que des groupes de master paraissaient en licence ; et
 *     `L3 IMSAT S5 - GR1` ne portait aucun fragment, donc n'apparaissait qu'en « Autre ». Un niveau
 *     ecrit (`L1` a `M2`) decide de l'annee, un semestre ecrit (`S5`, `S10`) du semestre par sa
 *     parite ; les fragments ne servent qu'aux noms qui ne disent pas leur niveau ;
 *   - **une recherche sans annee cherche partout.** Taper le nom exact d'un groupe avant de choisir
 *     son annee affichait « Aucun groupe ne correspond a cette recherche » (constate au banc le
 *     2026-11-10) : la liste etait vide par construction tant que l'annee manquait.
 *
 * Voir docs/features/onboarding.md.
 */

import type { OptionListee } from './useWelcomeState';

/**
 * Les fragments d'identifiant de groupe par annee et par semestre.
 *
 * **C'est une convention de nommage de Celcat Bordeaux, et de rien d'autre.** Elle existe parce que ce
 * serveur publie plusieurs centaines de groupes et qu'il faut bien les reduire ; elle n'a aucun sens
 * ailleurs. Depuis le jalon 6-I, Bordeaux INP a lui aussi un emploi du temps, et ses treize groupes
 * s'appellent `ENSC 2A GR1` : aucune pastille ne les atteint, et l'etape restait vide sauf en
 * choisissant « AUTRE ». C'est pourquoi les pastilles ne s'affichent plus que pour la source qui les
 * justifie (`filtrageParAnnee`) — le probleme n'etait pas la table, c'etait de la croire generale.
 */
const FILTRE_SAISON: Record<string, Record<string, string[]>> = {
    autumn: {
        L1: ['10', 'MIASHS1'], L2: ['30', 'MIASHS3'], L3: ['50', 'MIASHS5'],
        M1: ['M1', '70'], M2: ['M2', '90'], AUTRE: [''],
    },
    spring: {
        L1: ['20', 'MIASHS2'], L2: ['40', 'MIASHS4'], L3: ['60', 'MIASHS6'],
        M1: ['M1', '80'], M2: ['M2', '000', '001', '002', '003', '004'], AUTRE: [''],
    },
};

const NIVEAU_ECRIT = /\b(L[123]|M[12])\b/;
const SEMESTRE_ECRIT = /\bS(\d{1,2})\b/;

function porteUnFragment(nom: string, annee: string, saison: string): boolean {
    return (FILTRE_SAISON[saison]?.[annee] ?? []).some((fragment) => nom.includes(fragment.toUpperCase()));
}

/** Le groupe appartient-il a cette annee et a ce semestre ? `nom` est en majuscules. */
function appartient(nom: string, annee: string, saison: string): boolean {
    if (annee === 'AUTRE') return true;
    const niveau = NIVEAU_ECRIT.exec(nom);
    if (niveau === null) return porteUnFragment(nom, annee, saison);
    if (niveau[1] !== annee) return false;

    // Seul un semestre **ecrit** decide du semestre. Sans lui, le groupe parait aux deux : les
    // fragments de chiffres l'auraient range, mais ils retiraient aussi des groupes de master que la
    // regle d'avant montrait aux deux semestres — mieux vaut un groupe de trop qu'un groupe cache.
    const semestre = SEMESTRE_ECRIT.exec(nom);
    return semestre === null || (Number(semestre[1]) % 2 === 1) === (saison === 'autumn');
}

/**
 * Les groupes a proposer.
 *
 * Deux regimes, et c'est la seule difference entre les sources a cette etape :
 *
 *   - **avec tri par annee** (Celcat) : rien tant qu'annee et semestre ne sont pas choisis, sauf une
 *     recherche, qui porte alors sur toute la liste. La liste complete serait illisible, et
 *     l'afficher inviterait a la parcourir ;
 *   - **sans** (referentiel iCalendar) : la liste entiere, reduite par le texte saisi. Treize entrees
 *     se lisent d'un coup d'oeil.
 */
export function groupesProposes(
    groupList: readonly string[],
    year: OptionListee | null,
    season: OptionListee | null,
    textFilter: string,
    parAnnee: boolean,
): string[] {
    const recherche = textFilter.trim().toUpperCase();
    const correspond = (groupe: string) => groupe.toUpperCase().includes(recherche);

    if (!parAnnee) return groupList.filter(correspond);
    if (year === null || season === null) return recherche === '' ? [] : groupList.filter(correspond);

    return groupList.filter((groupe) => correspond(groupe) && appartient(groupe.toUpperCase(), year.id, season.id));
}
