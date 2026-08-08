/**
 * Migre le contenu de `ukit-data` vers la base, une fois.
 *
 *   npm run content:import
 *
 * Le depot `KAE-Lab/ukit-data` servi par jsDelivr etait le point de publication de UKit : les
 * annonces de vie etudiante, et les visuels que referencent aussi les batiments de
 * `assets/locations.json`. Le jalon 6-B le remplace par la base ; ce script fait le demenagement.
 *
 * Il est garde apres son unique execution, et ce n'est pas du sentimentalisme : c'est la seule trace
 * relisible de **d'ou vient** le contenu qui est en base, et la seule facon de refaire le geste si le
 * projet devait etre recree.
 *
 * `ukit-data` n'est pas supprime pour autant : il reste la source des visuels referencees par les
 * versions de l'application deja installees, qui ne se mettent pas a jour toutes seules. Il cesse
 * simplement d'etre ecrit.
 *
 * La cle utilisee est `service_role`, lue de l'environnement. Elle ne s'ecrit dans aucun fichier
 * versionne : qui la detient peut ecrire ce que tous les appareils liront.
 *
 * Voir docs/backend.md et docs/phase-6/6-b-supabase.md.
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CDN = 'https://cdn.jsdelivr.net/gh/KAE-Lab/ukit-data@main';

const URL_BASE = process.env.SUPABASE_URL;
const CLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Les visuels a demenager, et leur destination dans le bucket `media`.
 *
 * Ranges par usage plutot qu'a plat : le bucket portera un jour les visuels de plusieurs
 * etablissements, et un dossier plat se trie mal une fois qu'il compte cinquante fichiers.
 */
const VISUELS = [
    { source: 'images/ukit.png', cible: 'annonces/ukit.png', type: 'image/png' },
    { source: 'images/campulsations2025.jpg', cible: 'annonces/campulsations2025.jpg', type: 'image/jpeg' },
    { source: 'images/cremi.jpg', cible: 'batiments/cremi.jpg', type: 'image/jpeg' },
];

/** Le campus par defaut, tel que l'application le suppose deja (CampusApiService.extractBuildingsFromRooms). */
const CAMPUS_PAR_DEFAUT = 'Talence';

function entetes(extra = {}) {
    return { apikey: CLE, Authorization: `Bearer ${CLE}`, ...extra };
}

async function rest(chemin, options = {}) {
    const reponse = await fetch(`${URL_BASE}/rest/v1/${chemin}`, {
        ...options,
        headers: entetes({ 'Content-Type': 'application/json', ...(options.headers ?? {}) }),
    });
    const corps = await reponse.text();
    if (!reponse.ok) {
        throw new Error(`${options.method ?? 'GET'} ${chemin} : ${reponse.status} ${corps}`);
    }
    return corps === '' ? null : JSON.parse(corps);
}

/** L'URL publique d'un objet du bucket `media`, telle qu'elle sera stockee dans `image_url`. */
function urlPublique(cible) {
    return `${URL_BASE}/storage/v1/object/public/media/${cible}`;
}

async function televerserVisuels() {
    for (const visuel of VISUELS) {
        const source = await fetch(`${CDN}/${visuel.source}`);
        if (!source.ok) {
            throw new Error(`visuel introuvable sur le CDN : ${visuel.source} (${source.status})`);
        }
        const octets = Buffer.from(await source.arrayBuffer());

        // `x-upsert` rend le script rejouable sur les visuels sans avoir a vider le bucket d'abord.
        const depot = await fetch(`${URL_BASE}/storage/v1/object/media/${visuel.cible}`, {
            method: 'POST',
            headers: entetes({ 'Content-Type': visuel.type, 'x-upsert': 'true' }),
            body: octets,
        });
        if (!depot.ok) {
            throw new Error(`televersement de ${visuel.cible} : ${depot.status} ${await depot.text()}`);
        }
        console.log(`  media/${visuel.cible} (${octets.length} octets)`);
    }
}

/**
 * Les annonces du fichier, projetees sur les colonnes de la table.
 *
 * L'identifiant du fichier (`"01"`, `"02"`) est **abandonne** : il ne portait rien, et la table
 * genere des UUID. `publiee_le` est fabrique de facon a conserver l'ordre d'affichage actuel — la
 * lecture trie par date de publication decroissante, et l'ordre d'un fichier JSON n'aurait rien pour
 * le remplacer.
 */
function projeterAnnonces(fichier) {
    const total = fichier.annonces.length;
    return fichier.annonces.map((annonce, index) => ({
        titre: annonce.title,
        emetteur: annonce.issuer_name,
        accroche: annonce.info_label || null,
        description: annonce.long_desc || null,
        image_url: reecrireVisuel(annonce.image_url),
        cta_texte: annonce.cta_text || null,
        cta_lien: annonce.cta_link || null,
        publiee_le: new Date(Date.now() - (index * 60_000)).toISOString(),
        expire_le: annonce.expires_at || null,
        active: annonce.is_active !== false,
    }));
}

/** Une URL jsDelivr connue devient son equivalent dans Storage ; toute autre est laissee telle quelle. */
function reecrireVisuel(url) {
    if (!url) return null;
    const visuel = VISUELS.find((candidat) => url.endsWith(candidat.source));
    return visuel ? urlPublique(visuel.cible) : url;
}

/**
 * Les 73 lieux du fichier embarque, projetes sur `batiments`.
 *
 * `nom` vaut le code : c'est deja ce que l'application affiche, les noms lisibles venant de Celcat a
 * l'execution. Ecrire autre chose ici inventerait une donnee que personne n'a.
 *
 * Le fichier embarque **reste** le socle hors ligne : cette table en est la surcouche, branchee au
 * jalon 6-D.
 */
function projeterBatiments(locations) {
    return Object.entries(locations).map(([code, lieu]) => ({
        code,
        nom: code,
        campus: lieu.campus ?? CAMPUS_PAR_DEFAUT,
        latitude: lieu.lat ?? null,
        longitude: lieu.lng ?? null,
        acces_libre: lieu.freeAccess === true,
        horaires: lieu.schedule ?? null,
        image_url: reecrireVisuel(lieu.image),
    }));
}

async function main() {
    if (!URL_BASE || !CLE) {
        throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (voir .env.example)');
    }

    const force = process.argv.includes('--force');
    const existantes = await rest('annonces?select=id&limit=1');
    if (existantes.length > 0 && !force) {
        // « Jouable une fois » doit etre vrai, pas seulement recommande : rejouer sans le vouloir
        // dupliquerait les annonces, et rien a l'ecran ne dirait pourquoi.
        throw new Error('la table annonces n est pas vide — relancer avec --force si c est voulu');
    }

    console.log('Visuels vers le bucket media :');
    await televerserVisuels();

    const fichier = await (await fetch(`${CDN}/annonces.json`)).json();
    const annonces = projeterAnnonces(fichier);
    await rest('annonces', { method: 'POST', body: JSON.stringify(annonces) });
    console.log(`\n${annonces.length} annonce(s) inseree(s)`);

    const locations = JSON.parse(readFileSync(join(ROOT, 'assets/locations.json'), 'utf8'));
    const batiments = projeterBatiments(locations);
    await rest('batiments', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(batiments),
    });
    console.log(`${batiments.length} batiment(s) inseres ou mis a jour`);
}

main().catch((error) => {
    console.error(`\nEchec de l import : ${error.message}`);
    process.exit(1);
});
