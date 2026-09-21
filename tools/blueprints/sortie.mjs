/**
 * Le socle sorti : ce que le dernier binaire publie embarque, et ce que le manifeste doit lui laisser.
 *
 * Le registre de l'appareil n'adopte un document distant que s'il **bat** la version embarquee. Un
 * manifeste qui annonce les versions memes du socle n'apporte donc rien a un binaire a jour — et,
 * jusqu'a @aetherius/react-native 0.5.10, il lui coutait le telechargement du socle entier a chaque
 * rafraichissement, pour tout rejeter : 2,2 Go par jour sur le parc, mesures le 2026-09-21 dans les
 * journaux du projet. Le manifeste n'annonce donc que ce qui corrige le socle sorti ; le reste, la
 * sortie le porte deja.
 *
 * La partie qui decide est pure et testee ; la lecture du tag passe par git et ne l'est pas.
 *
 * Voir docs/blueprints.md, « Ce que le manifeste annonce ».
 */

import { execFileSync } from 'node:child_process';

const TAG_DE_SORTIE = /^v(\d+(?:\.\d+)*)$/;

/** Compare deux versions numeriques pointees, comme le registre de l'appareil : -1, 0 ou 1. */
export function comparerVersions(gauche, droite) {
    const a = String(gauche).split('.').map(Number);
    const b = String(droite).split('.').map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
        const ecart = (a[i] ?? 0) - (b[i] ?? 0);
        if (ecart !== 0) return ecart < 0 ? -1 : 1;
    }
    return 0;
}

/** Le tag de sortie le plus recent parmi des noms de refs ; `null` si aucun n'a la forme `vX.Y.Z`. */
export function tagLePlusRecent(noms) {
    const sorties = noms.map((nom) => nom.trim()).filter((nom) => TAG_DE_SORTIE.test(nom));
    if (sorties.length === 0) return null;
    return sorties.sort((a, b) => comparerVersions(b.slice(1), a.slice(1)))[0];
}

/** Les versions qu'un socle embarque, lues dans le texte de son `versions.json` : nom → version. */
export function versionsDuSocle(texte) {
    const declarations = JSON.parse(texte);
    return Object.fromEntries(
        Object.entries(declarations).map(([nom, declare]) => [nom, String(declare.version)]),
    );
}

/**
 * Une entree a-t-elle sa place dans le manifeste, face au socle sorti ?
 *
 * Hors socle, toujours : il n'y a rien a battre, et le manifeste est le seul chemin par lequel
 * l'entree existe sur l'appareil. Embarquee, seulement si sa version depasse celle de la sortie.
 */
export function batLeSocle(entree, socleSorti) {
    const embarquee = socleSorti[entree.nom];
    return embarquee === undefined || comparerVersions(entree.version, embarquee) > 0;
}

/**
 * Le socle du tag demande, ou du plus recent, lu dans le depot courant.
 *
 * `git fetch --tags` d'abord : le tag d'une sortie est pose par le workflow de release, pas par le
 * poste, et publier contre un socle perime annoncerait aux binaires a jour ce qu'ils embarquent deja.
 * Le chemin passe par `refs/tags/` parce qu'une branche porte le meme nom que le tag (`v6.2.2`).
 */
export function lireSocleSorti(tag = null) {
    const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
    git('fetch', '--tags', '--quiet', 'origin');
    const choisi = tag ?? tagLePlusRecent(git('tag', '-l', 'v*').split('\n'));
    if (choisi === null) {
        throw new Error('aucun tag de sortie vX.Y.Z : le socle sorti est inconnu (voir --socle)');
    }
    return { tag: choisi, versions: versionsDuSocle(git('show', `refs/tags/${choisi}:blueprints/versions.json`)) };
}
