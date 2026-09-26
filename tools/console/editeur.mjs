#!/usr/bin/env node
/**
 * Reparer un compte admin de la console depuis le poste du publieur : le creer, remplacer son mot de
 * passe, lui rendre le role d'admin — ou lui retirer tout droit.
 *
 *     CONSOLE_MOT_DE_PASSE='…' npm run console:editeur -- --email kylian.mltre@gmail.com
 *     CONSOLE_MOT_DE_PASSE='…' npm run console:editeur -- --email … --mot-de-passe    # remplace le mot de passe
 *     CONSOLE_MOT_DE_PASSE='…' npm run console:editeur -- --email … --sans-droits     # un compte qui ne peut rien ecrire
 *
 * Depuis le jalon 7-H, l'equipe se gere dans la console — page Equipe, fonction `editeurs` : inviter
 * un redacteur ou un lecteur, changer un role, revoquer. Ce script reste pour le jour ou plus aucun
 * admin ne peut se connecter : il ne connait que le role d'admin, et le pose explicitement — un admin
 * retrograde se repare ici. La base garde toujours au moins un admin : `--sans-droits` sur le dernier
 * est refuse (supabase/fonctions.sql).
 *
 * Le mot de passe vient de l'environnement, jamais d'un argument : un argument reste dans
 * l'historique du terminal. La cle `service_role` est requise (l'API d'administration), donc le
 * script ne tourne que sur le poste du publieur — comme la publication des Blueprints, et pour la
 * meme raison : c'est un acces de production. Ses ecritures sont journalisees au nom de
 * `service_role`. `--sans-droits` sert a verifier que les politiques refusent un compte authentifie
 * ordinaire (supabase/README.md).
 *
 * Voir docs/pilotage.md.
 */

import { config as chargerEnv } from 'dotenv';

// dotenv 17 annonce chaque chargement sur la sortie standard ; un outil de publication doit rester
// lisible dans un terminal comme dans un journal de CI.
chargerEnv({ quiet: true });

import { config, rest } from '../blueprints/base.mjs';

const LONGUEUR_MINIMALE = 12;

function lireArguments(argv) {
    const args = { email: null, motDePasse: false, sansDroits: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--email') {
            const valeur = argv[i + 1];
            if (valeur === undefined || valeur.startsWith('--')) throw new Error('--email attend une adresse');
            args.email = valeur.trim().toLowerCase();
            i++;
        } else if (arg === '--mot-de-passe') args.motDePasse = true;
        else if (arg === '--sans-droits') args.sansDroits = true;
        else throw new Error(`argument inconnu : ${arg}`);
    }
    if (args.email === null) throw new Error('--email <adresse> est requis');
    return args;
}

/** L'API d'administration de l'authentification, avec la cle de service. */
async function admin({ urlBase, cle }, chemin, options = {}) {
    const reponse = await fetch(`${urlBase}/auth/v1/admin/${chemin}`, {
        ...options,
        headers: { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    });
    const corps = await reponse.text();
    if (!reponse.ok) throw new Error(`${options.method ?? 'GET'} auth/admin/${chemin} : ${reponse.status} ${corps}`);
    return corps === '' ? null : JSON.parse(corps);
}

async function trouverCompte(base, email) {
    const page = await admin(base, 'users?page=1&per_page=1000');
    return (page?.users ?? []).find((utilisateur) => utilisateur.email?.toLowerCase() === email) ?? null;
}

async function main() {
    const args = lireArguments(process.argv.slice(2));
    const motDePasse = process.env.CONSOLE_MOT_DE_PASSE ?? '';
    if (motDePasse.length < LONGUEUR_MINIMALE) {
        throw new Error(`CONSOLE_MOT_DE_PASSE est requis, ${LONGUEUR_MINIMALE} caracteres au moins`);
    }
    const base = config();

    let compte = await trouverCompte(base, args.email);
    if (compte === null) {
        compte = await admin(base, 'users', {
            method: 'POST',
            body: JSON.stringify({ email: args.email, password: motDePasse, email_confirm: true }),
        });
        console.log(`compte cree : ${args.email}`);
    } else if (args.motDePasse) {
        await admin(base, `users/${compte.id}`, { method: 'PUT', body: JSON.stringify({ password: motDePasse }) });
        console.log(`mot de passe remplace : ${args.email}`);
    } else {
        console.log(`compte existant : ${args.email} (mot de passe inchange ; --mot-de-passe pour le remplacer)`);
    }

    if (args.sansDroits) {
        await rest(base, `editeurs?email=eq.${encodeURIComponent(args.email)}`, { method: 'DELETE' });
        console.log('droits : aucun (absent de la table editeurs)');
    } else {
        await rest(base, 'editeurs', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({ email: args.email, role: 'admin', etablissements: null }),
        });
        console.log('droits : admin (table editeurs, ecriture journalisee au nom de service_role)');
    }
}

main().catch((erreur) => {
    console.error(erreur instanceof Error ? erreur.message : String(erreur));
    process.exit(1);
});
