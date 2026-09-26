/**
 * Le vocabulaire ferme de la mesure (jalon 7-D) : ce que l'application compte, et rien d'autre.
 *
 * Chaque evenement porte sa granularite — l'heure pour ce qui dit un rythme d'usage, le jour pour ce
 * qui touche un contenu precis — et le validateur de sa cle. Une cle hors forme n'est pas comptee :
 * c'est la garantie, cote appareil, qu'aucun texte saisi ni identifiant de personne ne se glisse dans
 * un compteur. La base porte la meme liste dans `evenements_connus`, et migration.test.ts verifie que
 * les deux s'accordent.
 *
 * Ajouter un evenement, c'est quatre gestes dans le meme commit (docs/mesure.md) : l'entree ici, la
 * migration qui l'insere, le test vert, et la ligne du vocabulaire avec son lecteur — un evenement
 * sans lecteur ne s'ajoute pas.
 *
 * Pur, sans plateforme : jouable sous vitest.
 */

export type Granularite = 'heure' | 'jour';

export interface DescriptionDEvenement {
    readonly granularite: Granularite;
    /** La cle est-elle de la forme attendue ? La chaine vide est la seule cle des evenements sans cle. */
    readonly cle: (cle: string) => boolean;
}

/** La longueur maximale d'une cle : celle du `check` de la base. */
export const CLE_MAX = 64;

/** Les cles d'`onglet.vu`, dans l'ordre de la barre. */
export const CLES_ONGLET = ['planning', 'campus', 'scolarite', 'reglages'] as const;
export type CleOnglet = (typeof CLES_ONGLET)[number];

const sansCle = (cle: string): boolean => cle === '';
const parmi = (valeurs: readonly string[]) => (cle: string): boolean => valeurs.includes(cle);

/**
 * Un identifiant de contenu — l'`id` d'une annonce, un code Croustillant, un identifiant Affluences,
 * un code de batiment : des lettres, des chiffres et quatre signes de ponctuation. Tout ce qui
 * ressemble a un texte saisi est refuse par la forme.
 */
const IDENTIFIANT = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;
const identifiant = (cle: string): boolean => IDENTIFIANT.test(cle);

/**
 * `<hote>:<famille>` : l'hote tel que le disjoncteur le nomme — minuscules, port compris, ou le nom du
 * Blueprint quand aucune adresse n'est litterale — et la famille d'echec du moteur, en dernier.
 */
const SOURCE_ECHEC = /^[a-z0-9._:-]+:[a-z]+$/;
const sourceEchec = (cle: string): boolean => SOURCE_ECHEC.test(cle);

export const EVENEMENTS = {
    'session':               { granularite: 'heure', cle: sansCle },
    'onglet.vu':             { granularite: 'heure', cle: parmi(CLES_ONGLET) },
    'annonce.impression':    { granularite: 'jour',  cle: identifiant },
    'annonce.ouverture':     { granularite: 'jour',  cle: identifiant },
    'annonce.action':        { granularite: 'jour',  cle: identifiant },
    'resto.ouverture':       { granularite: 'jour',  cle: identifiant },
    'bu.ouverture':          { granularite: 'jour',  cle: identifiant },
    'salles.ouverture':      { granularite: 'jour',  cle: identifiant },
    'planning.jour':         { granularite: 'jour',  cle: sansCle },
    'planning.semaine':      { granularite: 'jour',  cle: sansCle },
    'scolarite.connexion':   { granularite: 'jour',  cle: parmi(['ok', 'echec']) },
    'source.echec':          { granularite: 'heure', cle: sourceEchec },
    'reglage.theme':         { granularite: 'jour',  cle: parmi(['light', 'dark']) },
    'reglage.langue':        { granularite: 'jour',  cle: parmi(['fr', 'en', 'es']) },
    'reglage.synchro':       { granularite: 'jour',  cle: parmi(['on', 'off']) },
    'reglage.notifications': { granularite: 'jour',  cle: parmi(['rappels:on', 'rappels:off', 'messages:on', 'messages:off']) },
} as const satisfies Record<string, DescriptionDEvenement>;

export type Evenement = keyof typeof EVENEMENTS;

export function estUnEvenement(valeur: unknown): valeur is Evenement {
    return typeof valeur === 'string' && Object.prototype.hasOwnProperty.call(EVENEMENTS, valeur);
}

/** La cle est-elle acceptable pour cet evenement ? La longueur d'abord, la forme ensuite. */
export function cleValide(evenement: Evenement, cle: string): boolean {
    return cle.length <= CLE_MAX && EVENEMENTS[evenement].cle(cle);
}

/** Les routes du navigateur d'onglets (MainTabNavigator), et la cle d'`onglet.vu` de chacune. */
export const ONGLETS: Readonly<Record<string, CleOnglet>> = {
    PlanningTab: 'planning',
    CampusTab: 'campus',
    ScolariteTab: 'scolarite',
    SettingsTab: 'reglages',
};
