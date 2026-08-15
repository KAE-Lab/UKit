/**
 * La traduction d'un export iCalendar vers le contrat de l'emploi du temps.
 *
 * Meme role que `PlanningApiMapping` pour Celcat, et meme discipline : ce module ne doit **rien**
 * importer de plateforme, ni le socle Aetherius, ni `Translator`. Ce qui est risque ici — la forme
 * d'une description libre, l'heure d'un fuseau, une salle multiple — le devient (IcsMapping.test.ts).
 *
 * Le depliage des lignes, l'echappement RFC 5545 et la lecture des dates viennent de `ical.js` : on
 * ne reecrit pas la RFC 5545, c'est un nid a defauts et une bibliotheque standard l'a deja fait.
 * Ce qui reste ici est ce qu'aucune bibliotheque ne peut faire — projeter **cette** source sur
 * **notre** contrat.
 *
 * Cinq mesures du 2026-08-15 sur `ade.bordeaux-inp.fr`, faites sur les cinq ecoles de Bordeaux INP,
 * expliquent chaque choix de ce fichier. Elles sont citees a l'endroit qui les utilise.
 *
 * Voir docs/features/planning.md et docs/phase-6/6-i-planning-universel.md.
 */

import ICAL from 'ical.js';
import moment from 'moment';

import { assemblerAnnee, assemblerJour, assemblerSemaine } from './PlanningAssembly';
import type { CibleGroupe, PlanningEvent, PlanningWeekDay } from './PlanningAssembly';

/**
 * Un code de module ADE : trois lettres, un chiffre, un tiret, cinq caracteres (`COG7-CILAN`,
 * `ESE7-INFS2`, `BIO7-MBCM4`).
 *
 * **C'est la seule ancre fiable de la description**, et c'est la mesure la plus utile du jalon. Les
 * champs ne sont pas a position fixe : le bloc de commentaire de tete peut tenir zero, une ou deux
 * lignes — un CM de 3A porte « CHAPRON Axelle - IBM » puis « GROUPE A » avant son code — donc
 * compter les lignes depuis le debut designerait le commentaire une fois sur dix. Le **type** du
 * cours est la ligne qui suit immediatement ce code, et rien d'autre ne le designe.
 */
const CODE_MODULE = /^[A-Z]{3}\d-[A-Z0-9]{5}$/;

/**
 * L'horodatage que le serveur ajoute a chaque export : `(Exporté le:15/08/2026 17:36)`.
 *
 * Il **change a chaque requete**, et le laisser passer aurait deux consequences : une horloge
 * s'afficherait dans la description d'un cours, et aucune paire de lectures ne serait jamais egale —
 * la parite serait rouge par construction et le cache invalide en permanence.
 */
const HORODATAGE = /^\(Export[eé] le\s*:/;

/** Les huit teintes de `theme.courses` reservees aux sources qui ne donnent pas de couleur. */
const PALETTE = 8;

/**
 * La date JavaScript d'une propriete `DTSTART` / `DTEND`, ou `null`.
 *
 * `getFirstPropertyValue` rend une union de tous les types de valeur de la RFC 5545 — une propriete
 * absente ou mal typee peut rendre une chaine. Le garde vaut mieux qu'une assertion : un evenement
 * ampute doit produire une date invalide, exactement comme la fin nulle d'un evenement Celcat, et
 * non faire lever la projection de toute la journee.
 */
function dateDe(evenement: ICAL.Component, nom: string): Date | null {
    const valeur = evenement.getFirstPropertyValue(nom);
    return valeur !== null && typeof valeur === 'object' && 'toJSDate' in valeur ? valeur.toJSDate() : null;
}

/**
 * La couleur d'un cours, derivee de sa matiere.
 *
 * Un export iCalendar ne porte **aucune** couleur, la ou Celcat en donne une par cours. Trois
 * reponses etaient possibles et celle-ci est la seule qui ne cree pas deux apparences pour un meme
 * ecran : une empreinte stable de la matiere choisit l'une des huit teintes que le theme utilise
 * deja pour Celcat. Meme cours, meme couleur toute l'annee ; meme vocabulaire visuel d'un
 * etablissement a l'autre ; et pas un pixel de change pour Bordeaux.
 *
 * L'empreinte est un FNV-1a 32 bits, choisi pour tenir en cinq lignes et rendre le meme resultat
 * partout — un `hashCode` a base de decalages signes ne se comporte pas pareil selon le moteur.
 */
export function couleurDeMatiere(matiere: string): string {
    let empreinte = 0x811c9dc5;
    for (let index = 0; index < matiere.length; index += 1) {
        empreinte ^= matiere.charCodeAt(index);
        empreinte = Math.imul(empreinte, 0x01000193) >>> 0;
    }
    return `palette-${(empreinte % PALETTE) + 1}`;
}

/**
 * Les champs d'une description, dans l'ordre ou le serveur les sert, horodatage retire.
 *
 * Le decoupage se fait sur `\n` **sans jeter les champs vides** : ce sont eux qui portent les slots
 * absents (« pas de commentaire », « pas de code de module »), et les compresser detruirait la seule
 * structure exploitable.
 */
function champs(description: string): string[] {
    return description
        .split('\n')
        .map((ligne) => ligne.trim())
        .filter((ligne) => !HORODATAGE.test(ligne));
}

/**
 * Le type du cours — `CM`, `TD`, `TP`, `CI`, `DS`, `TDM`, `Examen` — ou une chaine vide.
 *
 * La chaine vide est un resultat, pas un echec : certains evenements n'ont pas de code de module, et
 * donc pas de type derivable (mesure du 2026-08-15 : c'est le cas des soutenances et des examens de
 * quelques ecoles). Inventer une categorie serait pire que de ne rien afficher, et l'ecran sait
 * masquer une pastille vide.
 */
export function typeDuCours(description: string): string {
    const lignes = champs(description);
    const module = lignes.findIndex((ligne) => CODE_MODULE.test(ligne.split(',')[0].trim()));
    if (module < 0) return '';

    return lignes[module + 1] ?? '';
}

/**
 * Les lignes utiles d'une description, salle en tete.
 *
 * La salle vient de `LOCATION`, un champ **separe** de la description dans un iCalendar, alors que
 * Celcat la noyait dans son texte libre. La remettre en tete est ce qui permet a la fiche de cours de
 * la retrouver — le rang de la premiere ligne susceptible de porter une salle est une donnee de
 * catalogue depuis ce jalon (`FormatSalles.depuis`), justement parce qu'il n'est pas le meme selon
 * la source.
 *
 * `LOCATION` peut porter **plusieurs salles**, separees par une virgule echappee RFC 5545 —
 * `E103 - FabLaB\,CD-O108` — que `ical.js` a deja deshabillee. Elle descend telle quelle : c'est la
 * reconnaissance de salle qui sait la decouper, et elle est propre a l'etablissement.
 */
function lignesUtiles(description: string, salle: string, matiere: string, categorie: string): string[] {
    // La matiere et le type sont ecartes parce que l'ecran les affiche **deja** : la premiere en
    // titre, le second en pastille a cote. Les laisser passer les affichait deux fois — constate sur
    // appareil le 2026-08-15, un `TD` en pastille et un `TD` en ligne de description. C'est la meme
    // regle que chez Celcat, dont la projection ecarte les lignes qui repetent la categorie ou le
    // sujet (PlanningApiMapping.ts).
    const lignes = champs(description).filter(
        (ligne) => ligne !== '' && ligne !== matiere && ligne !== categorie,
    );
    return salle === '' ? lignes : [salle, ...lignes];
}

/**
 * Le sous-groupe a filtrer, quand le cours en designe un plus precis que le groupe demande.
 *
 * Meme intention que chez Celcat, et meme resultat a l'ecran : un etudiant de `2A GR1` voit dans son
 * planning les cours de toute sa promotion, et ceux de son groupe de langue — `2A GR1 Anglais
 * TOEIC`. Ce qui distingue les seconds est ce qui suit le nom du groupe, et c'est ce que
 * l'application propose ensuite comme filtre.
 *
 * La recherche porte sur les lignes de description et non sur un champ nomme, parce qu'aucun champ
 * ne nomme le groupe : ce qui est fiable, c'est le nom **qu'on a demande**.
 */
function sousGroupe(lignes: string[], groupe: CibleGroupe): string | null {
    if (Array.isArray(groupe)) return null;

    for (const ligne of lignes) {
        if (ligne === groupe || !ligne.startsWith(groupe)) continue;
        const reste = ligne.slice(groupe.length).replace('-', '').trim();
        if (reste !== '') return reste;
    }
    return null;
}

/**
 * Projette un evenement iCalendar sur le contrat applicatif.
 *
 * Les dates sont lues telles que la source les donne. **Elles sont en UTC honnete** : mesure du
 * 2026-08-15, un meme creneau hebdomadaire est servi `07:30Z` en septembre et `08:30Z` en novembre,
 * soit 09:30 a Paris les deux fois. L'heure d'ete est donc geree par le serveur, il n'y a pas de
 * `VTIMEZONE` a interpreter, et un affichage en heure locale suffit.
 */
export function projeterEvenement(evenement: ICAL.Component, groupe: CibleGroupe): PlanningEvent {
    const lire = (nom: string): string => String(evenement.getFirstPropertyValue(nom) ?? '');

    const matiere = lire('summary');
    const salle = lire('location');
    const description = lire('description');

    const debut = moment(dateDe(evenement, 'dtstart'));
    const fin = moment(dateDe(evenement, 'dtend'));
    const starttime = debut.format('HH:mm');
    const endtime = fin.format('HH:mm');

    const categorie = typeDuCours(description);
    const lignes = lignesUtiles(description, salle, matiere, categorie);
    const couleur = couleurDeMatiere(matiere);

    return {
        id: lire('uid'),
        // Compose comme chez Celcat pour que l'invariant du contrat tienne — le champ est herite et
        // aucun ecran ne le lit (docs/features/planning.md).
        style: 'style="background-color:' + couleur + '"',
        color: couleur,
        schedule: starttime + '-' + endtime + (categorie === '' ? '' : ' ' + categorie),
        starttime,
        endtime,
        date: { start: debut.toISOString(), end: fin.toISOString() },
        subject: matiere,
        description: lignes.join('\n'),
        category: categorie,
        // Verbatim, comme chez Celcat, y compris la liste du planning agrege.
        group: groupe as string,
        toFilter: sousGroupe(lignes, groupe),
    };
}

/**
 * Les evenements d'un corps iCalendar, projetes mais pas encore ranges.
 *
 * Un corps illisible rend une **liste vide** plutot qu'une exception : le Blueprint a deja affirme la
 * presence de `BEGIN:VCALENDAR`, donc ce qui arrive ici est un calendrier ; et une source qui
 * changerait de forme au point de casser l'analyse doit produire un planning vide, pas un ecran
 * blanc. Un calendrier sans aucun evenement est un resultat legitime — une semaine sans cours.
 */
export function lireCalendrier(ics: unknown, groupe: CibleGroupe): PlanningEvent[] {
    if (typeof ics !== 'string' || ics === '') return [];

    try {
        const calendrier = new ICAL.Component(ICAL.parse(ics));
        return calendrier.getAllSubcomponents('vevent').map((evenement) => projeterEvenement(evenement, groupe));
    } catch (erreur) {
        console.warn(`[ics] calendrier illisible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        return [];
    }
}

/**
 * Une journee de cours.
 *
 * Le refiltrage sur la date exacte n'a pas lieu d'etre ici, contrairement a Celcat : les bornes
 * `firstDate` / `lastDate` d'ADE sont **inclusives et respectees**, le serveur ne deborde pas
 * (mesure du 2026-08-15 : `firstDate=lastDate=2025-11-18` rend les cinq cours de ce mardi, et eux
 * seuls).
 */
export function projeterJourIcs(ics: unknown, groupe: CibleGroupe): PlanningEvent[] {
    return assemblerJour(lireCalendrier(ics, groupe));
}

/** Une semaine, decoupee en six jours du lundi au samedi par l'assemblage commun aux deux sources. */
export function decouperSemaineIcs(ics: unknown, groupe: CibleGroupe, lundi: moment.Moment): PlanningWeekDay[] {
    return assemblerSemaine(lireCalendrier(ics, groupe), lundi);
}

/** La plage annuelle de la synchronisation calendrier : la meme projection, a plat. */
export function projeterAnneeIcs(ics: unknown, groupe: CibleGroupe): PlanningEvent[] {
    return assemblerAnnee(lireCalendrier(ics, groupe));
}
