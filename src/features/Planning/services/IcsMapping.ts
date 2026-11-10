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
import { creneauCompose, heureOuVide } from './PlanningApiMapping';
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
 * Le rang de la ligne qui porte le code de module, ou -1. Une ligne peut en nommer plusieurs, separes
 * par une virgule : le premier suffit a la reconnaitre. Partage avec le compte des seances restantes
 * (seancesRestantes.ts), qui y ancre l'identite d'un enseignement.
 */
export function rangDuCodeDeModule(lignes: readonly string[]): number {
    return lignes.findIndex((ligne) => CODE_MODULE.test(ligne.split(',')[0].trim()));
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
    const module = rangDuCodeDeModule(lignes);
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
 * Une ligne de description **a champ nomme** : `Matière : R5.03 Animation de réunion`.
 *
 * C'est la forme de PRONOTE Campus, mesuree le 2026-11-10 sur l'export d'abonnement de l'IUT de
 * Bordeaux : chaque ligne porte sa cle — `Matière`, `Type`, `Salle` ou `Salles`, `Enseignant` ou
 * `Enseignants`, `Mémo` —, la ou ADE sert des valeurs nues dans un ordre a deviner. Le `SUMMARY`, lui,
 * empile tout (« Matiere - Type - Enseignants - Memo ») : c'est le defaut « intitules d'un iCalendar
 * colle » du registre, constate chez Bordeaux Montaigne, meme produit.
 */
const CHAMP_NOMME = /^([^:]{2,24}?)\s+:\s+(.*)$/;

/** Les champs qu'une description nommee porte, lus par leur cle et non par leur rang. */
interface ChampsNommes {
    readonly matiere: string;
    readonly type: string;
    /** La cle telle que la source l'ecrit (`Salle`, `Salles`) et sa valeur. */
    readonly salle: { readonly cle: string; readonly valeur: string } | null;
    readonly enseignants: readonly string[];
    /** Le reste, cle comprise : on l'affiche sans savoir l'interpreter (`Mémo : DS R5.real.09`). */
    readonly autres: readonly string[];
}

/** Une valeur de PRONOTE sans ses doubles espaces : `203  BUT3B` s'affiche `203 BUT3B`. */
function resserrer(valeur: string): string {
    return valeur.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Les champs d'une description nommee, ou `null` si elle n'en est pas une.
 *
 * **Toutes** les lignes non vides doivent avoir une cle, et la matiere doit etre la : une description
 * ADE dont une ligne contiendrait un deux-points par hasard ne bascule pas. Hors de cette forme, rien ne
 * change — la projection d'ADE est celle que Bordeaux INP joue depuis 6-I.
 */
function champsNommes(description: string): ChampsNommes | null {
    const lignes = champs(description).filter((ligne) => ligne !== '');
    if (lignes.length === 0) return null;

    const paires: [string, string][] = [];
    for (const ligne of lignes) {
        const morceaux = CHAMP_NOMME.exec(ligne);
        if (morceaux === null) return null;
        paires.push([morceaux[1].trim(), morceaux[2].trim()]);
    }

    const valeur = (...cles: string[]): string => paires.find(([cle]) => cles.includes(cle))?.[1] ?? '';
    const matiere = valeur('Matière');
    if (matiere === '') return null;

    const salle = paires.find(([cle]) => cle === 'Salle' || cle === 'Salles');
    return {
        matiere,
        type: valeur('Type'),
        salle: salle === undefined ? null : { cle: salle[0], valeur: resserrer(salle[1]) },
        enseignants: valeur('Enseignant', 'Enseignants').split(',').map(resserrer).filter((nom) => nom !== ''),
        autres: paires
            .filter(([cle]) => !['Matière', 'Type', 'Salle', 'Salles', 'Enseignant', 'Enseignants'].includes(cle))
            .map(([cle, texte]) => `${cle} : ${resserrer(texte)}`),
    };
}

/**
 * Le type d'une description nommee, sans sa duree : `TD_2h` → `TD`, `Cours_2h` → `Cours`.
 *
 * La pastille et le compte des seances parlent d'un **type** ; la duree se lit deja sur le creneau, et
 * `TD_2h` et `TD_4h` sont le meme enseignement.
 */
function typeNomme(type: string): string {
    return type.split('_')[0].trim();
}

/**
 * La ligne de salle d'une description nommee : la valeur, precedee du mot de la source quand elle ne
 * nomme pas deja un lieu.
 *
 * `203 BUT3B` ne dit pas qu'il s'agit d'une salle, et la fiche reconnait une salle a son contenu
 * (CourseAnnotations.ts) — sans referentiel de lieux, comme a l'IUT, elle aurait pris l'icone d'un
 * groupe. `Salle 203 BUT3B` se lit et se reconnait ; `Amphi 2` se suffit.
 */
function ligneDeSalle(salle: { readonly cle: string; readonly valeur: string }): string {
    return /salle|amphi/i.test(salle.valeur) ? salle.valeur : `${salle.cle} ${salle.valeur}`;
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

    const description = lire('description');
    const nommes = champsNommes(description);

    // Une description a champs nommes (PRONOTE) dit elle-meme sa matiere et son type : le titre est la
    // matiere et non le `SUMMARY`, qui empile enseignants et memo. Sinon, la projection d'ADE, intacte.
    const matiere = nommes === null ? lire('summary') : nommes.matiere;
    const salle = nommes === null ? lire('location') : (nommes.salle === null ? '' : ligneDeSalle(nommes.salle));

    const debut = moment(dateDe(evenement, 'dtstart'));
    const fin = moment(dateDe(evenement, 'dtend'));
    const starttime = heureOuVide(debut);
    const endtime = heureOuVide(fin);

    const categorie = nommes === null ? typeDuCours(description) : typeNomme(nommes.type);
    const lignes = nommes === null
        ? lignesUtiles(description, salle, matiere, categorie)
        : [salle, ...nommes.enseignants, ...nommes.autres].filter((ligne) => ligne !== '');
    const couleur = couleurDeMatiere(matiere);

    return {
        id: lire('uid'),
        // Compose comme chez Celcat pour que l'invariant du contrat tienne — le champ est herite et
        // aucun ecran ne le lit (docs/features/planning.md).
        style: 'style="background-color:' + couleur + '"',
        color: couleur,
        schedule: creneauCompose(starttime, endtime) + (categorie === '' ? '' : ' ' + categorie),
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
 * Ne garde que les evenements d'une journee donnee.
 *
 * **Il ne servait a rien jusqu'au jalon 6-J**, et c'est ce qui explique qu'il n'existait pas : les
 * bornes `firstDate` / `lastDate` d'ADE sont inclusives et respectees, le serveur ne deborde pas
 * (mesure du 2026-08-15 : `firstDate=lastDate=2025-11-18` rend les cinq cours de ce mardi, et eux
 * seuls). Un **lien d'abonnement colle**, lui, ne prend aucune borne — c'est ce qui le rend universel,
 * puisque tous les produits n'acceptent pas de parametres de dates — et rend donc le calendrier
 * entier. Sans ce filtre, une vue « jour » afficherait l'annee.
 *
 * La comparaison porte sur `date.start`, deja normalise en ISO par la projection, et se fait au jour
 * **local** : un cours de 08:00 a Paris appartient a sa journee parisienne, pas a celle d'UTC.
 */
function duJour(evenements: PlanningEvent[], jour: moment.Moment): PlanningEvent[] {
    return evenements.filter((evenement) => moment(evenement.date.start ?? null).isSame(jour, 'day'));
}

/**
 * Une journee de cours.
 *
 * `jour` est **facultatif** : la branche ADE ne le passe pas, parce que son serveur a deja filtre et
 * qu'un second filtrage ne changerait rien tout en donnant l'impression qu'il sert. La branche
 * abonnement le passe, parce que la sienne ne filtre rien.
 */
export function projeterJourIcs(ics: unknown, groupe: CibleGroupe, jour?: moment.Moment): PlanningEvent[] {
    const evenements = lireCalendrier(ics, groupe);
    return assemblerJour(jour === undefined ? evenements : duJour(evenements, jour));
}

/**
 * Une semaine, decoupee en six jours du lundi au samedi par l'assemblage commun aux deux sources.
 *
 * Aucun filtre n'est necessaire ici, quelle que soit la source : `assemblerSemaine` range chaque
 * evenement dans la colonne de son jour ISO, et un evenement d'une autre semaine tombe simplement
 * dans une colonne qu'on n'affiche pas... **sauf s'il tombe le meme jour de la semaine**. Un
 * calendrier annuel non borne y mettrait donc les trente-cinq mardis de l'annee. Le filtrage sur la
 * plage est donc fait ici, en amont, et il est sans effet sur une reponse deja bornee.
 */
export function decouperSemaineIcs(ics: unknown, groupe: CibleGroupe, lundi: moment.Moment): PlanningWeekDay[] {
    const evenements = lireCalendrier(ics, groupe).filter((evenement) =>
        moment(evenement.date.start ?? null).isSame(lundi, 'isoWeek'),
    );
    return assemblerSemaine(evenements, lundi);
}

/** La plage annuelle de la synchronisation calendrier : la meme projection, a plat. */
export function projeterAnneeIcs(ics: unknown, groupe: CibleGroupe): PlanningEvent[] {
    return assemblerAnnee(lireCalendrier(ics, groupe));
}
