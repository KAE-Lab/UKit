/**
 * Les acces a la base, cote publication.
 *
 * La cle utilisee est `service_role`, lue de l'environnement : qui la detient peut publier un
 * Blueprint que tous les appareils joueront. Elle ne s'ecrit dans aucun fichier versionne, et l'acces
 * au projet se traite comme un acces de production — parce que c'en est un.
 *
 * Meme forme que tools/import-ukit-data.mjs : `fetch` contre PostgREST et Storage, sans ajouter
 * `@supabase/supabase-js` aux dependances de l'outillage.
 *
 * Voir docs/backend.md.
 */

const BUCKET = 'blueprints';

export function config() {
    const urlBase = process.env.SUPABASE_URL;
    const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!urlBase || !cle) {
        throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (voir .env.example)');
    }
    return { urlBase, cle };
}

function entetes(cle, extra = {}) {
    return { apikey: cle, Authorization: `Bearer ${cle}`, ...extra };
}

export async function rest({ urlBase, cle }, chemin, options = {}) {
    const reponse = await fetch(`${urlBase}/rest/v1/${chemin}`, {
        ...options,
        headers: entetes(cle, { 'Content-Type': 'application/json', ...(options.headers ?? {}) }),
    });
    const corps = await reponse.text();
    if (!reponse.ok) {
        throw new Error(`${options.method ?? 'GET'} ${chemin} : ${reponse.status} ${corps}`);
    }
    return corps === '' ? null : JSON.parse(corps);
}

/** Depose un objet dans le bucket. `x-upsert` rend le script rejouable sans vider le bucket d'abord. */
export async function televerser({ urlBase, cle }, objet, texte) {
    const reponse = await fetch(`${urlBase}/storage/v1/object/${BUCKET}/${objet}`, {
        method: 'POST',
        headers: entetes(cle, { 'Content-Type': 'application/json', 'x-upsert': 'true' }),
        body: texte,
    });
    if (!reponse.ok) {
        throw new Error(`televersement de ${objet} : ${reponse.status} ${await reponse.text()}`);
    }
}

/**
 * Le texte d'un objet public, ou `null` s'il n'existe pas.
 *
 * Le parametre d'unicite n'est pas de la superstition : le bucket est servi par un CDN, et lire un
 * manifeste perime ici ferait croire au script qu'il n'a rien a republier — c'est-a-dire un
 * interrupteur d'arret qui n'arrete rien.
 */
export async function lirePublic({ urlBase }, objet) {
    const reponse = await fetch(`${urlBase}/storage/v1/object/public/${BUCKET}/${objet}?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
    });
    if (reponse.status === 404 || reponse.status === 400) return null;
    if (!reponse.ok) {
        throw new Error(`lecture de ${objet} : ${reponse.status} ${await reponse.text()}`);
    }
    return reponse.text();
}
