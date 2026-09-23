/**
 * La configuration de la console.
 *
 * Les deux valeurs que la page embarque — l'URL du projet et la cle publiable — viennent du `.env`
 * de la RACINE du depot, le meme que l'application, ou de l'environnement (les variables du depot
 * GitHub, en integration continue). Elles sont exposees par `define`, une par une, sous des noms
 * explicites : jamais par `envPrefix: 'SUPABASE_'`, qui aurait aussi expose la cle de service et le
 * mot de passe de la base a quiconque lit le bundle.
 *
 * Une valeur absente fait ECHOUER la construction : une console deployee sans cle serait une page
 * blanche, et une page blanche se debogue plus mal qu'un build rouge.
 *
 * `base` est le chemin de GitHub Pages pour un depot de projet (`https://<org>.github.io/UKit/`).
 *
 * `server.fs.allow` remonte a la racine du depot : la console importe, par chemin relatif, les
 * modules purs partages avec l'application — la grammaire et l'ordre des annonces, le ciblage, les
 * tokens et les palettes du theme (jalon 7-F). Sans cette ligne, le serveur de developpement refuse
 * de servir un fichier hors de `console/`. La construction, elle, les suit sans rien demander.
 *
 * `tsconfig` designe celui de la console pour tout son programme, modules partages compris. Sans
 * lui, Vite prend pour chaque fichier le tsconfig le plus proche : pour `src/shared/`, celui de
 * l'application, qui etend `expo/tsconfig.base` — un paquet de la racine, que l'integration continue
 * n'installe pas pour la console. La construction passait sur un poste ou la racine est installee, et
 * echouait en integration continue.
 */

import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const RACINE_DU_DEPOT = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, RACINE_DU_DEPOT, '');
    const url = env.SUPABASE_URL || process.env.SUPABASE_URL || '';
    const clePubliable = env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (url === '' || clePubliable === '') {
        throw new Error('SUPABASE_URL et SUPABASE_ANON_KEY sont requis : dans le .env de la racine du depot, ou dans l environnement (console/README.md).');
    }

    return {
        base: '/UKit/',
        tsconfig: 'tsconfig.json',
        plugins: [react()],
        define: {
            __SUPABASE_URL__: JSON.stringify(url),
            __SUPABASE_ANON_KEY__: JSON.stringify(clePubliable),
        },
        server: { fs: { allow: [RACINE_DU_DEPOT] } },
        build: { outDir: 'dist', emptyOutDir: true },
    };
});
