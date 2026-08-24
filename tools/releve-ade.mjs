/**
 * Releve le referentiel des groupes d'un serveur ADE, pour le publier dans le catalogue.
 *
 *   node tools/releve-ade.mjs --projet 1
 *   node tools/releve-ade.mjs --projet 1 --max 400 --semaines 2025-11-17:2025-11-23,2026-01-12:2026-01-18
 *   node tools/releve-ade.mjs --projet 1 --index 2467,2468,2469,4156   # sonder des index nommes
 *   node tools/releve-ade.mjs --projet 1 --ecoles 2467=ENSEIRB,2475=ENSMAC   # attribuer chaque index
 *
 * ADE n'expose aucun arbre de ressources anonyme : l'export prend des **index positionnels**, et
 * rien ne dit lequel correspond a quel groupe. Ce script fait le seul releve possible — il balaie les
 * index, lit les libelles **dans les evenements eux-memes**, et rend un rapport a relire.
 *
 * Pourquoi un script plutot qu'une passe entierement manuelle : un index est stable **a l'interieur
 * d'un projet**, et un projet ADE change a chaque rentree (mesure du 2026-08-15 : projectId=1 porte
 * 3156 evenements sur 2025-2026, projectId=2 en porte 54). Un referentiel recopie a la main serait
 * donc a refaire chaque annee, et faux en silence entre-temps.
 *
 * **Pourquoi plusieurs semaines, et pas une.** C'est la mesure qui l'a impose, et une seule semaine
 * aurait publie des doublons silencieux : sur la semaine du 17 novembre, les index 2, 157 et 169
 * rendent les 38 memes evenements — meme empreinte, aux UID pres. En janvier l'index 169 n'en rend
 * plus aucun, et en mars l'index 157 non plus : ce ne sont pas des doublons de l'index 2, ce sont des
 * sous-groupes d'option dont l'emploi du temps **coincidait** avec celui de leur promotion cette
 * semaine-la. Un releve mono-semaine aurait donc nomme « 1A » trois ressources differentes.
 *
 * **Pourquoi il ne nomme pas tout seul.** Un index qui ne voit qu'un libelle *est* ce libelle. Un
 * index qui en voit plusieurs est un noeud d'arbre, et son nom n'est pas deductible de ses
 * evenements : l'index 7 voit `2A`, `2A GR1`, `2A Tronc commun` et `Promo2A` parce qu'un etudiant de
 * 2A GR1 suit aussi les cours de toute sa promotion. Le script propose le libelle le plus frequent
 * et montre les inclusions ; trancher reste un **geste d'auteur**. Il enleve la corvee, pas le
 * jugement.
 *
 * **`--index` sonde des index nommes plutot que le balayage**, et il vient d'une decouverte du
 * 2026-08-22 : l'arbre de ressources d'ADE, lu **sous authentification** sur `myplanning.jsp`, donne
 * les vrais identifiants des ecoles et des promotions — mais tous ne portent pas d'evenements. Chez
 * ENSEIRB-MATMECA, `2469` (IIETE3) en rend zero quand `2467` (l'ecole) en rend des centaines : les
 * cours y sont accroches aux **etudiants**, pas aux promotions. Publier un noeud d'arbre sans l'avoir
 * sonde donnerait donc un groupe qui s'affiche, se choisit, et reste vide toute l'annee.
 *
 * **`--ecoles` attribue chaque index a une ecole, par mesure et non par supposition.** Le balayage
 * anonyme rend des index dont le libelle ne porte pas toujours le nom de l'ecole (`1A GR3`, `T2`,
 * `MAT-1A`) : les prefixer demanderait de deviner, et un prefixe devine publierait l'emploi du temps
 * d'une ecole sous le nom d'une autre. L'arbre authentifie, lui, donne des noeuds **nommes**
 * (`2467=ENSEIRB-MATMECA`) : il suffit alors de comparer les identifiants d'evenements pour savoir
 * lequel contient les cours d'un index. La part est affichee, parce qu'elle n'est pas toujours de
 * 100 % — un index peut porter des cours mutualises entre deux ecoles.
 *
 * Il n'ecrit ni dans la base ni dans un fichier du depot : il rend du texte a relire et a coller.
 *
 * Voir docs/phase-6/6-i-planning-universel.md et supabase/etablissements.sql.
 */

import ICAL from 'ical.js';

const CHEMIN = '/jsp/custom/modules/plannings/anonymous_cal.jsp';

/**
 * Trois semaines chargees, reparties sur l'annee universitaire.
 *
 * Novembre, janvier et mars : assez ecartees pour qu'un sous-groupe d'option cesse de coincider avec
 * sa promotion, et toutes trois hors vacances — une semaine vide ne distingue rien.
 */
const SEMAINES_PAR_DEFAUT = '2025-11-17:2025-11-23,2026-01-12:2026-01-18,2026-03-09:2026-03-15';

/**
 * Un code de module ADE : trois lettres, un chiffre, un tiret, cinq caracteres (`COG7-CILAN`,
 * `ESE7-INFS2`, `BIO7-MBCM4`).
 *
 * C'est **la seule ancre fiable** de la description. Les champs ne sont pas a position fixe : le bloc
 * de commentaire de tete peut tenir zero, une ou deux lignes (mesure du 2026-08-15 : un CM de 3A
 * porte « CHAPRON Axelle - IBM » puis « GROUPE A » avant son code), et un evenement sans code de
 * module n'a pas de type derivable du tout. Compter les lignes depuis le debut designerait donc le
 * commentaire une fois sur dix.
 */
const CODE_MODULE = /^[A-Z]{3}\d-[A-Z0-9]{5}$/;

/** L'horodatage que le serveur ajoute a chaque export. Il change a chaque requete : il se jette. */
const HORODATAGE = /^\(Export[eé] le\s*:/;

function options() {
    const argv = process.argv.slice(2);
    const valeur = (drapeau, defaut) => {
        const index = argv.indexOf(drapeau);
        if (index < 0) return defaut;
        const suivant = argv[index + 1];
        if (suivant === undefined || suivant.startsWith('--')) throw new Error(`${drapeau} attend une valeur`);
        return suivant;
    };

    const semaines = valeur('--semaines', SEMAINES_PAR_DEFAUT)
        .split(',')
        .map((paire) => paire.split(':'));
    if (semaines.some((paire) => paire.length !== 2)) {
        throw new Error('--semaines attend des paires debut:fin separees par des virgules');
    }

    const index = valeur('--index', null);
    const indices = index === null
        ? null
        : index.split(',').map((brut) => Number(brut.trim())).filter((nombre) => Number.isInteger(nombre));
    if (indices !== null && indices.length === 0) throw new Error('--index attend des nombres separes par des virgules');

    const ecoles = valeur('--ecoles', null);
    const nommes = ecoles === null
        ? []
        : ecoles.split(',').map((paire) => {
            const [index, ...nom] = paire.split('=');
            if (nom.length === 0) throw new Error('--ecoles attend des couples index=nom separes par des virgules');
            return { index: Number(index.trim()), nom: nom.join('=').trim() };
        });

    return {
        ecoles: nommes,
        domaine: valeur('--domaine', 'https://ade.bordeaux-inp.fr'),
        projet: valeur('--projet', '1'),
        max: Number(valeur('--max', '220')),
        indices,
        pause: Number(valeur('--pause', '200')),
        semaines,
        json: argv.includes('--json'),
    };
}

async function calendrier({ domaine, projet }, index, [debut, fin]) {
    const url = new URL(CHEMIN, domaine);
    url.search = new URLSearchParams({
        resources: String(index),
        projectId: projet,
        calType: 'ical',
        firstDate: debut,
        lastDate: fin,
    }).toString();

    const reponse = await fetch(url, { headers: { Accept: 'text/calendar' } });
    if (!reponse.ok) throw new Error(`index ${index} : statut ${reponse.status}`);
    return new ICAL.Component(ICAL.parse(await reponse.text())).getAllSubcomponents('vevent');
}

/**
 * Le premier libelle de groupe d'un evenement, ou `null`.
 *
 * La description suit la forme :
 *
 *     [commentaire…] <CODE-MODULE> <TYPE> <GROUPE…> [MATIERE] <ENSEIGNANT…> (Exporte le:…)
 *
 * Le code de module ancre le tout : le type le suit, et le premier groupe suit le type. Ce qui vient
 * apres n'est pas separable de facon fiable sur toutes les ecoles de l'etablissement, et le releve
 * n'en a pas besoin : identifier un index demande son **premier** groupe, pas sa liste complete.
 */
function premierGroupe(evenement) {
    const champs = String(evenement.getFirstPropertyValue('description') ?? '')
        .split('\n')
        .map((ligne) => ligne.trim());

    const module = champs.findIndex((ligne) => CODE_MODULE.test(ligne.split(',')[0].trim()));
    if (module < 0) return null;

    const groupe = champs[module + 2];
    if (groupe === undefined || groupe === '' || HORODATAGE.test(groupe)) return null;
    return groupe;
}

/** Ce qu'on retient d'un index : ses evenements par semaine, et la frequence de ses libelles. */
async function sonder(config, index) {
    const uids = new Set();
    const libelles = new Map();
    const parSemaine = [];

    for (const semaine of config.semaines) {
        const evenements = await calendrier(config, index, semaine);
        parSemaine.push(evenements.length);

        for (const evenement of evenements) {
            uids.add(String(evenement.getFirstPropertyValue('uid')));
            const groupe = premierGroupe(evenement);
            if (groupe !== null) libelles.set(groupe, (libelles.get(groupe) ?? 0) + 1);
        }
        await new Promise((resolu) => setTimeout(resolu, config.pause));
    }

    return { index, uids, libelles, parSemaine, total: [...uids].length };
}

/** Le libelle le plus frequent, celui que le rapport propose a l'auteur. */
function propose(libelles) {
    let nom = null;
    let meilleur = 0;
    for (const [libelle, nombre] of libelles) {
        if (nombre > meilleur) {
            nom = libelle;
            meilleur = nombre;
        }
    }
    return nom;
}

/**
 * L'ecole qui porte le plus grand nombre des cours d'un index, et la part que ca represente.
 *
 * Une part, et non un booleen : la mesure du 2026-08-24 montre des index franchement attribues
 * (14/14, 15/15, 0/78) et un cas partiel — l'index 61 n'a que 2 de ses 11 cours dans ENSEIRB. Cacher
 * ce chiffre ferait passer une mutualisation pour une appartenance.
 */
function ecoleDe(sonde, ecoles) {
    let meilleure = null;
    for (const ecole of ecoles) {
        const dedans = [...sonde.uids].filter((uid) => ecole.uids.has(uid)).length;
        if (dedans > 0 && (meilleure === null || dedans > meilleure.dedans)) {
            meilleure = { nom: ecole.nom, dedans };
        }
    }
    if (meilleure === null) return null;
    return { nom: meilleure.nom, part: Math.round((meilleure.dedans / sonde.total) * 100) };
}

/**
 * L'index dont cet index est un sous-ensemble strict, s'il y en a un. Le plus petit gagne.
 *
 * Un index **vide** n'a pas de parent : l'ensemble vide est inclus dans tous les autres, et sans ce
 * refus le rapport designerait au hasard le plus petit index porteur de cours — une inclusion qui a
 * l'air d'une mesure et n'en est pas. Le cas n'existe que depuis `--index`, qui garde les index
 * vides parce que c'est justement ce qu'on vient verifier.
 */
function parentDe(sonde, sondes) {
    if (sonde.total === 0) return null;
    let parent = null;
    for (const autre of sondes) {
        if (autre.index === sonde.index || autre.total <= sonde.total) continue;
        if ([...sonde.uids].every((uid) => autre.uids.has(uid))) {
            if (parent === null || autre.total < parent.total) parent = autre;
        }
    }
    return parent;
}

async function main() {
    const config = options();
    const sondes = [];

    // Les ecoles d'abord : leurs ensembles d'evenements servent a attribuer tous les autres index.
    const ecoles = [];
    for (const ecole of config.ecoles) {
        if (!config.json) process.stderr.write(`\r  ecole ${ecole.nom} (${ecole.index})`);
        ecoles.push({ ...ecole, ...(await sonder(config, ecole.index)) });
    }

    // Les index nommes sont gardes **meme vides** : c'est precisement ce qu'on vient verifier. Le
    // balayage, lui, ne retient que ce qui porte des cours — sinon le rapport ferait deux cents
    // lignes de silence.
    const aSonder = config.indices ?? Array.from({ length: config.max }, (_, rang) => rang + 1);
    for (const [rang, index] of aSonder.entries()) {
        if (!config.json) process.stderr.write(`\r  index ${index} (${rang + 1}/${aSonder.length})`);
        const sonde = await sonder(config, index);
        if (sonde.total > 0 || config.indices !== null) sondes.push(sonde);
    }
    if (!config.json) process.stderr.write(`\r${' '.repeat(30)}\r`);

    const lignes = sondes
        .map((sonde) => ({
            index: sonde.index,
            total: sonde.total,
            parSemaine: sonde.parSemaine,
            nom: propose(sonde.libelles),
            distincts: sonde.libelles.size,
            libelles: [...sonde.libelles.keys()],
            parent: parentDe(sonde, sondes)?.index ?? null,
            ecole: ecoleDe(sonde, ecoles),
        }))
        .sort((gauche, droite) => droite.total - gauche.total);

    if (config.json) {
        console.log(JSON.stringify(lignes, null, 2));
        return;
    }

    const balayes = config.indices === null ? `${config.max} index balayes` : `${config.indices.length} index sondes`;
    console.log(
        `Projet ${config.projet}, ${config.semaines.length} semaine(s), ${balayes} — ` +
            `${lignes.filter((ligne) => ligne.total > 0).length} portent des cours.\n`,
    );
    console.log('  index    total  par semaine        inclus dans   ecole (part)          libelle propose (nombre)');
    console.log('  ' + '-'.repeat(112));
    for (const ligne of lignes) {
        const ecole = ligne.ecole === null ? '—' : `${ligne.ecole.nom} (${ligne.ecole.part}%)`;
        console.log(
            `  ${String(ligne.index).padStart(5)}  ${String(ligne.total).padStart(7)}  ` +
                `${ligne.parSemaine.join('/').padEnd(18)} ${String(ligne.parent ?? '—').padStart(11)}   ` +
                `${ecole.padEnd(21)} ` +
                `${String(ligne.nom ?? '(aucun libelle lisible)').padEnd(34)} (${ligne.distincts})`,
        );
    }

    console.log('\nA relire index par index — un index « inclus dans » un autre est un sous-groupe, pas un doublon.');
    console.log('Les libelles complets d un index : --json.\n');
    console.log('Forme attendue par le catalogue (colonne edt, champ groupes) :\n');
    console.log(JSON.stringify([{ nom: '<a nommer>', ressource: '<index>' }]));
}

main().catch((erreur) => {
    console.error(`releve-ade : ${erreur.message}`);
    process.exit(1);
});
