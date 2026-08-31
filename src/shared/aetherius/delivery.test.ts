/**
 * La livraison : le socle, la surcouche, et les gardes qui decident entre les deux.
 *
 * Jouable hors appareil parce que le registre ne depend d'aucune plateforme — un alias de
 * `vitest.config.ts` le resout vers le sous-module qui le porte, la racine du paquet montant une
 * WebView. Le magasin de cache est `memoryCache()`, le reseau un `globalThis.fetch` simule.
 *
 * Ces tests sont la seule facon raisonnable de verifier les neuf gardes du plan de test de
 * docs/phase-6/6-c-livraison.md : les jouer sur un appareil demanderait de publier neuf manifestes
 * volontairement casses en production. L'appareil garde ce qu'il est seul a pouvoir dire — que la
 * correction arrive et se joue.
 *
 *     npm test
 */

import { BlueprintRegistry, memoryCache, sha256Hex } from '@aetherius/react-native';
import { readFile, readdir } from 'node:fs/promises';
import { afterEach, expect, test } from 'vitest';

import {
    ALLOWED_SECRETS,
    BLUEPRINT,
    BUNDLED,
    REMOTE_NAME_PREFIX,
    type BlueprintName,
} from '../../../blueprints';
import { createRegistry, manifestUrl } from './delivery';

const BASE = 'https://exemple.supabase.co';
const NOM = BLUEPRINT.CAMPUS_ANNONCES;
const FICHIER = 'ukit-campus-annonces.blueprint.json';
const NOMS = Object.values(BLUEPRINT) as BlueprintName[];

/** La table est figee par le typage, pas au runtime : quelques tests la detournent puis la rendent. */
type TableMutable = Record<string, { version: string; document: unknown }>;
const INTACT: TableMutable = { ...(BUNDLED as unknown as TableMutable) };
const VRAI_FETCH = globalThis.fetch;

afterEach(() => {
    Object.assign(BUNDLED as unknown as TableMutable, INTACT);
    globalThis.fetch = VRAI_FETCH;
});

/** Un serveur de fichiers minimal, indexe par chemin : tout le reste repond 404. */
function servir(fichiers: Readonly<Record<string, string>>): void {
    globalThis.fetch = ((url: string) => {
        const texte = fichiers[new URL(url).pathname];
        return Promise.resolve(
            texte === undefined ? new Response('', { status: 404 }) : new Response(texte, { status: 200 }),
        );
    }) as unknown as typeof fetch;
}

function chemin(nom: string): string {
    return `/storage/v1/object/public/blueprints/${nom}`;
}

/** Le document embarque, eventuellement retouche : le corpus de reference de ces tests. */
function document(patch: Record<string, unknown> = {}): string {
    return JSON.stringify({ ...(BUNDLED[NOM].document as Record<string, unknown>), ...patch });
}

function manifeste(entree: Record<string, unknown> | null, racine: Record<string, unknown> = {}): string {
    return JSON.stringify({
        manifest: '1',
        generated_at: '2026-08-08T12:00:00.000Z',
        disabled: false,
        blueprints: entree === null ? {} : { [NOM]: entree },
        ...racine,
    });
}

function entree(texte: string, version: string, extra: Record<string, unknown> = {}) {
    return { version, url: FICHIER, sha256: sha256Hex(texte), disabled: false, ...extra };
}

function registre(options: { cache?: ReturnType<typeof memoryCache>; remote?: boolean } = {}) {
    return createRegistry({
        cache: options.cache ?? memoryCache(),
        baseUrl: BASE,
        ...(options.remote !== undefined ? { remote: options.remote } : {}),
    });
}

/** Publie *texte* en *version*, rafraichit, et rend le rapport et le registre. */
async function publier(texte: string, version: string, extra: Record<string, unknown> = {}, racine = {}) {
    servir({
        [chemin('manifest.json')]: manifeste(entree(texte, version, extra), racine),
        [chemin(FICHIER)]: texte,
    });
    const registry = registre();
    return { registry, report: await registry.refresh() };
}

// ---------------------------------------------------------------------------------------------
// Le socle : ce que le jalon 6-A avait etabli et que 6-C doit continuer d'honorer avec deux sources.
// ---------------------------------------------------------------------------------------------

test('les six Blueprints du socle resolvent et sont valides', async () => {
    const registry = registre();

    for (const nom of NOMS) {
        const resolved = await registry.resolve(nom);

        expect(resolved.name).toBe(nom);
        expect(resolved.origin).toBe('bundled');
        expect(resolved.version).toBe(BUNDLED[nom].version);
        expect(resolved.blueprint.name).toBe(nom);
    }
});

test('la resolution ne touche jamais au reseau', async () => {
    globalThis.fetch = (() => {
        throw new Error('la resolution a appele le reseau');
    }) as unknown as typeof fetch;

    // Un run n'attend pas un CDN pour savoir quoi jouer. La regle est la raison d'etre du decoupage
    // entre `resolve()` et `refresh()`.
    const registry = registre();
    await Promise.all(NOMS.map((nom) => registry.resolve(nom)));
});

test('un document embarque invalide echoue a la resolution', async () => {
    (BUNDLED as unknown as TableMutable)[NOM] = {
        version: '99',
        document: { aetherius: '1.0', name: NOM, act: 'vector' },
    };

    await expect(registre().resolve(NOM)).rejects.toThrow();
});

test('aucun Blueprint embarque ne declare un secret hors du perimetre de l application', async () => {
    const registry = registre();

    for (const nom of NOMS) {
        const { blueprint } = await registry.resolve(nom);
        for (const secret of blueprint.secrets ?? []) {
            expect(
                (ALLOWED_SECRETS as readonly string[]).includes(secret),
                `${nom} declare un secret hors perimetre : ${secret}`,
            ).toBe(true);
        }
    }
});

test('les annonces embarquent la version corrigee au jalon 6-A', async () => {
    const { blueprint, version } = await registre().resolve(NOM);

    // La version decide de tout : le distant ne gagne que s'il est strictement superieur.
    expect(version).toBe('2');
    expect(blueprint.steps.some((step) => step.action === 'assert')).toBe(true);
});

// ---------------------------------------------------------------------------------------------
// L'URL du manifeste.
// ---------------------------------------------------------------------------------------------

test('l URL du manifeste derive de celle de la base', () => {
    expect(manifestUrl(BASE)).toBe(`${BASE}/storage/v1/object/public/blueprints/manifest.json`);
    expect(manifestUrl(`${BASE}/`)).toBe(manifestUrl(BASE));
});

test('une application sans base n a pas d URL de manifeste, et le dit', async () => {
    expect(manifestUrl(null)).toBeUndefined();
    expect(manifestUrl('')).toBeUndefined();

    const report = await createRegistry({ cache: memoryCache(), baseUrl: null }).refresh();
    // Une base absente n'est pas une panne de transport : le diagnostic doit distinguer les deux.
    expect(report.ok).toBe(false);
    expect(report.reason).toContain('no manifest URL');
});

// ---------------------------------------------------------------------------------------------
// Le chemin nominal.
// ---------------------------------------------------------------------------------------------

test('une correction plus recente prend la main sur le socle', async () => {
    const texte = document({ description: 'la correction publiee' });
    const { registry, report } = await publier(texte, '3');

    expect(report.ok).toBe(true);
    expect(report.entries).toContainEqual({ name: NOM, outcome: 'updated', version: '3' });

    const resolved = await registry.resolve(NOM);
    expect(resolved.origin).toBe('remote');
    expect(resolved.version).toBe('3');
    expect(resolved.blueprint.description).toBe('la correction publiee');
});

test('un manifeste inchange ne retelecharge rien', async () => {
    const cache = memoryCache();
    const texte = document({ description: 'stable' });
    servir({ [chemin('manifest.json')]: manifeste(entree(texte, '3')), [chemin(FICHIER)]: texte });

    await registre({ cache }).refresh();
    const report = await registre({ cache }).refresh();

    expect(report.entries).toContainEqual({ name: NOM, outcome: 'kept', version: '3' });
});

// ---------------------------------------------------------------------------------------------
// Les gardes. Chacune doit **conserver l'embarque** et le dire.
// ---------------------------------------------------------------------------------------------

test('une empreinte fausse fait refuser l entree', async () => {
    const texte = document({ description: 'corrompue' });
    servir({
        [chemin('manifest.json')]: manifeste({ version: '3', url: FICHIER, sha256: 'a'.repeat(64) }),
        [chemin(FICHIER)]: texte,
    });
    const registry = registre();
    const report = await registry.refresh();

    expect(report.entries[0].outcome).toBe('rejected');
    expect(report.entries[0].reason).toContain('integrity');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('un fichier modifie apres la publication du manifeste est refuse', async () => {
    // L'empreinte est celle du fichier publie ; le bucket en sert un autre. C'est exactement ce
    // qu'un intermediaire compromis ferait, et c'est la sonde qui le prouve.
    const publie = document({ description: 'relu en revue' });
    const servi = document({ description: 'substitue apres coup' });
    servir({
        [chemin('manifest.json')]: manifeste(entree(publie, '3')),
        [chemin(FICHIER)]: servi,
    });
    const registry = registre();

    expect((await registry.refresh()).entries[0].outcome).toBe('rejected');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('une version qui ne bat pas l embarquee est ignoree', async () => {
    const { registry, report } = await publier(document({ description: 'trop vieille' }), '2');

    expect(report.entries[0].outcome).toBe('ignored');
    expect(report.entries[0].reason).toContain('not newer');
    expect((await registry.resolve(NOM)).version).toBe('2');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('un min_engine trop eleve est ignore, sans erreur visible', async () => {
    const texte = document({ description: 'pour un moteur futur' });
    const { registry, report } = await publier(texte, '3', { min_engine: '99.0.0' });

    expect(report.ok).toBe(true);
    expect(report.entries[0].outcome).toBe('ignored');
    expect(report.entries[0].reason).toContain('needs engine');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('un manifeste malforme est refuse en entier, et rien n est remplace', async () => {
    const cache = memoryCache();
    const texte = document({ description: 'deja livree' });
    servir({ [chemin('manifest.json')]: manifeste(entree(texte, '3')), [chemin(FICHIER)]: texte });
    await registre({ cache }).refresh();

    servir({
        [chemin('manifest.json')]: JSON.stringify({
            manifest: '1',
            blueprints: { [NOM]: { version: '4', url: FICHIER, sha256: 'b'.repeat(64), inconnu: true } },
        }),
        [chemin(FICHIER)]: texte,
    });
    const registry = registre({ cache });
    const report = await registry.refresh();

    expect(report.ok).toBe(false);
    expect(report.entries).toHaveLength(0);
    // L'interpretation la plus sure d'un manifeste illisible est de ne rien toucher.
    expect((await registry.resolve(NOM)).version).toBe('3');
});

test('un Blueprint distant qui reclame un secret hors perimetre est refuse avant le cache', async () => {
    const texte = document({ secrets: ['portail_pass', 'trousseau_entier'] });
    const { registry, report } = await publier(texte, '3');

    expect(report.entries[0].outcome).toBe('rejected');
    expect(report.entries[0].reason).toContain('trousseau_entier');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('un Blueprint distant invalide au schema est refuse avant le cache', async () => {
    const texte = JSON.stringify({ aetherius: '1.0', name: NOM, act: 'vector' });
    const { registry, report } = await publier(texte, '3');

    expect(report.entries[0].outcome).toBe('rejected');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('un document publie sous un nom qui n est pas le sien est refuse', async () => {
    const texte = document({ name: BLUEPRINT.CELCAT_SEMAINE });
    const { report } = await publier(texte, '3');

    expect(report.entries[0].outcome).toBe('rejected');
    expect(report.entries[0].reason).toContain('is named');
});

test('un bucket injoignable laisse l application sur son socle', async () => {
    servir({});
    const registry = registre();
    const report = await registry.refresh();

    expect(report.ok).toBe(false);
    expect(report.reason).toContain('404');
    expect(report.entries).toHaveLength(0);
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('un cache local corrompu est purge, sans plantage', async () => {
    const cache = memoryCache();
    await cache.setItem('aetherius/blueprints@1', '{ ceci n est pas du JSON');

    const registry = registre({ cache });
    const resolved = await registry.resolve(NOM);

    // Un document illisible fait perdre la surcouche entiere et retombe sur le socle : c'est le sens
    // du repli, et c'est preferable a un index qui pourrait se contredire.
    expect(resolved.origin).toBe('bundled');
    expect(await registry.list()).toHaveLength(NOMS.length);
});

// ---------------------------------------------------------------------------------------------
// Les trois interrupteurs d'arret.
// ---------------------------------------------------------------------------------------------

test('une entree desactivee par le publieur rend la main au socle', async () => {
    const texte = document({ description: 'a retirer' });
    const { registry, report } = await publier(texte, '3', { disabled: true });

    expect(report.entries[0].outcome).toBe('ignored');
    expect(report.entries[0].reason).toContain('disabled');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('l arret global ramene tout au socle', async () => {
    const texte = document({ description: 'a retirer' });
    const { registry, report } = await publier(texte, '3', {}, { disabled: true });

    expect(report.entries[0].outcome).toBe('ignored');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('une entree disparue du manifeste ramene son Blueprint au socle', async () => {
    const cache = memoryCache();
    const texte = document({ description: 'livree puis retiree' });
    servir({ [chemin('manifest.json')]: manifeste(entree(texte, '3')), [chemin(FICHIER)]: texte });
    await registre({ cache }).refresh();

    servir({ [chemin('manifest.json')]: manifeste(null) });
    const registry = registre({ cache });
    const report = await registry.refresh();

    expect(report.entries[0].outcome).toBe('ignored');
    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('revert purge la surcouche tout de suite, sans reseau', async () => {
    const texte = document({ description: 'a annuler' });
    const { registry } = await publier(texte, '3');
    expect((await registry.resolve(NOM)).origin).toBe('remote');

    globalThis.fetch = (() => {
        throw new Error('revert a appele le reseau');
    }) as unknown as typeof fetch;
    await registry.revert();

    expect((await registry.resolve(NOM)).origin).toBe('bundled');
});

test('remote false ignore durablement la surcouche, sans la detruire', async () => {
    const cache = memoryCache();
    const texte = document({ description: 'en cache mais ignoree' });
    servir({ [chemin('manifest.json')]: manifeste(entree(texte, '3')), [chemin(FICHIER)]: texte });
    await registre({ cache }).refresh();

    const coupe = registre({ cache, remote: false });
    const report = await coupe.refresh();

    expect(report.ok).toBe(false);
    expect(report.reason).toContain('switched off');
    expect((await coupe.resolve(NOM)).origin).toBe('bundled');
    // Sans la detruire : le meme cache, relu par un registre ordinaire, rend la surcouche.
    expect((await registre({ cache }).resolve(NOM)).origin).toBe('remote');
});

// ---------------------------------------------------------------------------------------------
// La porte du jalon 6-G : ce qu'un manifeste a le droit d'**ajouter**.
//
// Le paquet porte le mecanisme (jalon 3-H d'Aetherius) ; ce que ces cas verifient, c'est **notre
// cadrage** — le prefixe reserve, le perimetre de secrets, et le fait qu'aucun des deux ne s'elargit
// par inadvertance. Un portail publie sous un nom que personne n'a relu est la seule chose que
// l'application accepte sans l'avoir embarquee : la borne est donc la garde, et une garde qui ne se
// teste pas n'en est pas une.
// ---------------------------------------------------------------------------------------------

const PORTAIL = 'ukit.portail.essai.dossier';

/** Un document de portail valide, sous un nom **absent** du socle. */
function documentDePortail(nom: string, patch: Record<string, unknown> = {}): string {
    const modele = BUNDLED[BLUEPRINT.PORTAIL_BORDEAUX_DOSSIER].document as Record<string, unknown>;
    return JSON.stringify({ ...modele, name: nom, ...patch });
}

/** Publie *texte* sous *nom*, a un chemin quelconque, et rend le rapport et le registre. */
async function publierSousLeNom(
    nom: string,
    texte: string,
    extra: Record<string, unknown> = {},
    options: { cache?: ReturnType<typeof memoryCache> } = {},
) {
    const url = `portails/${nom.replace(/\./g, '-')}.blueprint.json`;
    servir({
        [chemin('manifest.json')]: JSON.stringify({
            manifest: '1',
            generated_at: '2026-08-10T12:00:00.000Z',
            disabled: false,
            blueprints: { [nom]: { version: '1', url, sha256: sha256Hex(texte), disabled: false, ...extra } },
        }),
        [chemin(url)]: texte,
    });
    const registry = registre(options);
    return { registry, report: await registry.refresh() };
}

test('le prefixe reserve et le perimetre de secrets sont ceux que le jalon a decides', () => {
    // Le verrou de la surface : elargir l'un ou l'autre doit demander de toucher ce test, donc de le
    // decider. `ukit.` rendrait toutes les sources de l'application remplacables a distance.
    expect(REMOTE_NAME_PREFIX).toBe('ukit.portail.');
    expect([...ALLOWED_SECRETS]).toEqual(['portail_user', 'portail_pass']);
});

test('un portail publie sous le prefixe reserve est ajoute, alors qu il n est pas embarque', async () => {
    expect(BUNDLED[PORTAIL as BlueprintName]).toBeUndefined();

    const texte = documentDePortail(PORTAIL);
    const { registry, report } = await publierSousLeNom(PORTAIL, texte);

    expect(report.entries[0].outcome).toBe('updated');
    const resolved = await registry.resolve(PORTAIL);
    expect(resolved.origin).toBe('remote');
    expect(resolved.blueprint.name).toBe(PORTAIL);
    // Et il apparait dans le diagnostic, apres le socle : c'est la qu'on va le chercher quand une
    // publication « n'arrive pas ».
    const noms = (await registry.list()).map((ligne) => ligne.name);
    expect(noms).toContain(PORTAIL);
});

test('un nom hors prefixe est ignore, avec sa raison', async () => {
    const nom = 'ukit.essai.hors-prefixe';
    const { registry, report } = await publierSousLeNom(nom, documentDePortail(nom));

    // `ignored` et non `rejected` : le manifeste ne demandait rien que l'application connaisse.
    expect(report.entries[0].outcome).toBe('ignored');
    expect(report.entries[0].reason).toBeDefined();
    await expect(registry.resolve(nom as BlueprintName)).rejects.toThrow();
});

test('un portail ajoute ne peut pas reclamer un secret hors perimetre', async () => {
    const texte = documentDePortail(PORTAIL, { secrets: ['portail_user', 'trousseau_entier'] });
    const { registry, report } = await publierSousLeNom(PORTAIL, texte);

    expect(report.entries[0].outcome).toBe('rejected');
    expect(report.entries[0].reason).toContain('trousseau_entier');
    // Refuse **avant** le cache : rien a purger, rien a jouer.
    await expect(registry.resolve(PORTAIL)).rejects.toThrow();
});

test('un portail ajoute dont l empreinte ment est refuse', async () => {
    const texte = documentDePortail(PORTAIL);
    const { registry, report } = await publierSousLeNom(PORTAIL, texte, { sha256: 'a'.repeat(64) });

    expect(report.entries[0].outcome).toBe('rejected');
    await expect(registry.resolve(PORTAIL)).rejects.toThrow();
});

test('un portail ecrit pour un moteur plus recent est ignore en silence', async () => {
    // C'est ce qui permet d'ecrire un portail sans se demander qui l'executera : les applications
    // anciennes ne le voient simplement pas.
    const texte = documentDePortail(PORTAIL);
    const { registry, report } = await publierSousLeNom(PORTAIL, texte, { min_engine: '999' });

    expect(report.entries[0].outcome).toBe('ignored');
    await expect(registry.resolve(PORTAIL)).rejects.toThrow();
});

test('un portail invalide au schema est refuse avant le cache', async () => {
    const texte = JSON.stringify({ aetherius: '1.0', name: PORTAIL, act: 'continuum' });
    const { registry, report } = await publierSousLeNom(PORTAIL, texte);

    expect(report.entries[0].outcome).toBe('rejected');
    await expect(registry.resolve(PORTAIL)).rejects.toThrow();
});

test('retirer la capacite desinstalle ce qui etait entre par la, sans reseau', async () => {
    const cache = memoryCache();
    const texte = documentDePortail(PORTAIL);
    await publierSousLeNom(PORTAIL, texte, {}, { cache });

    // Un interrupteur d'arret qui laisse en place ce qu'il a laisse entrer n'en est pas un.
    const sansPorte = new BlueprintRegistry({ bundled: BUNDLED, allowedSecrets: ALLOWED_SECRETS, cache });
    globalThis.fetch = (() => {
        throw new Error('la purge a appele le reseau');
    }) as unknown as typeof fetch;

    await expect(sansPorte.resolve(PORTAIL)).rejects.toThrow();
    expect((await sansPorte.list()).map((ligne) => ligne.name)).not.toContain(PORTAIL);
});

test('un nom du socle couvert par le prefixe garde la regle de la mise a jour', async () => {
    // `ukit.portail.bordeaux.dossier` est **a la fois** embarque et sous le prefixe : le prefixe
    // ajoute des noms, il n assouplit rien pour ceux qui existent. Une version qui ne bat pas le
    // socle reste ignoree.
    const nom = BLUEPRINT.PORTAIL_BORDEAUX_DOSSIER;
    const texte = documentDePortail(nom, { description: 'une version qui ne bat pas le socle' });
    const { registry, report } = await publierSousLeNom(nom, texte);

    expect(report.entries[0].outcome).toBe('ignored');
    expect((await registry.resolve(nom)).origin).toBe('bundled');
});

test('le prefixe du script de publication est celui du binaire', async () => {
    // `tools/blueprints/socle.mjs` recopie le prefixe : il est en Node pur et ne sait pas lire un
    // fichier TypeScript. Une divergence publierait des fichiers que l'appareil ignorerait ensuite en
    // silence — le genre de panne qu'on cherche une soiree.
    // Un chemin relatif a la racine du depot, ou vitest est lance : `import.meta.url` donnerait une
    // `URL` du `lib` DOM, structurellement incompatible avec celle que `node:fs` attend.
    const source = await readFile('tools/blueprints/socle.mjs', 'utf8');
    expect(source).toContain(`const PREFIXE_RESERVE = '${REMOTE_NAME_PREFIX}';`);
});

test('aucun Blueprint ne s appuie sur un selecteur propre a un seul moteur', async () => {
    // La leçon la plus chere du jalon 6-G, et elle ne se voyait qu'au bout d'un parcours
    // d'authentification sur un vrai telephone. Le portail de Bordeaux INP a d'abord ete ecrit avec
    // `:text-is()` et `:nth-match()` : ces pseudo-classes appartiennent a **Playwright**, donc au
    // moteur Python qui sert a mettre au point un fichier depuis un poste. Le moteur embarque, lui,
    // resout par `document.querySelectorAll`, qui les rejette comme CSS invalide — le run passait le
    // CAS puis mourait a l'extraction, et le message n'avait aucun rapport avec la cause.
    //
    // **XPath est le seul langage de selection que les deux moteurs partagent** au-dela du CSS
    // standard. Ce test refuse les autres avant qu'ils n'atteignent un appareil.
    const PSEUDOS_PLAYWRIGHT = [':text-is(', ':text-matches(', ':nth-match(', ':has-text(', ':visible', ':light('];

    const dossier = 'blueprints';
    const fichiers = [
        ...(await readdir(dossier)).map((nom) => `${dossier}/${nom}`),
        ...(await readdir(`${dossier}/portails`)).map((nom) => `${dossier}/portails/${nom}`),
    ].filter((chemin) => chemin.endsWith('.blueprint.json'));

    expect(fichiers.length).toBeGreaterThan(0);

    for (const chemin of fichiers) {
        const document = JSON.parse(await readFile(chemin, 'utf8')) as { steps?: unknown[] };
        // On cherche dans les **selecteurs**, pas dans le fichier entier : une `description` a le
        // droit de nommer ces pseudo-classes, et celle du portail de l'INP le fait justement pour
        // expliquer pourquoi elles n'y sont plus.
        for (const selecteur of selecteursDe(document)) {
            for (const pseudo of PSEUDOS_PLAYWRIGHT) {
                expect(
                    selecteur.includes(pseudo),
                    `${chemin} : le selecteur ${JSON.stringify(selecteur)} utilise ${pseudo}, que le moteur embarque ne sait pas lire`,
                ).toBe(false);
            }
        }
    }
});

/** Tous les `selector` d'un document, quelle que soit leur profondeur. */
function selecteursDe(noeud: unknown): string[] {
    if (Array.isArray(noeud)) return noeud.flatMap(selecteursDe);
    if (noeud === null || typeof noeud !== 'object') return [];

    const trouves: string[] = [];
    for (const [cle, valeur] of Object.entries(noeud as Record<string, unknown>)) {
        if (cle === 'selector' && typeof valeur === 'string') trouves.push(valeur);
        else trouves.push(...selecteursDe(valeur));
    }
    return trouves;
}
